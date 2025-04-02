// Global variables
let speechSynthesis;
let utterance;
let isPlaying = false;
let currentWordIndex = 0;
let words = [];
let paragraphs = [];
let wordsWithPositions = [];
let highlightOverlay;
let highlightElement;
let controlBar;
let selectedVoice = null;
let speechRate = 1.0;
let speechPitch = 1.0;

// Initialize the extension
function init() {
  // Create highlight overlay
  createHighlightOverlay();
  
  // Create control bar
  createControlBar();
  
  // Add event listeners
  document.addEventListener('mouseup', handleTextSelection);
  
  // Get available voices
  speechSynthesis = window.speechSynthesis;
  loadVoices();
  
  // Some browsers need a timeout to properly load voices
  setTimeout(loadVoices, 1000);
  
  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getState') {
      sendResponse({
        isPlaying,
        speechRate,
        speechPitch,
        selectedVoice: selectedVoice ? selectedVoice.name : null
      });
    } else if (request.action === 'start') {
      // Get text: use selection if available, otherwise extract from page
      const selectedText = getSelectedText();
      console.log("[Speechify Debug] Selected Text:", JSON.stringify(selectedText)); // Log selected text
      
      let extractedText = '';
      if (selectedText.length === 0) {
          extractedText = extractPageText();
          console.log("[Speechify Debug] Extracted Page Text:", JSON.stringify(extractedText)); // Log extracted text if used
      }
      
      const textToSpeak = selectedText.length > 0 ? selectedText : extractedText;
      console.log("[Speechify Debug] Text Sent to startSpeech:", JSON.stringify(textToSpeak)); // Log final text before speech
      
      if (textToSpeak) {
        startSpeech(textToSpeak);
        sendResponse({ success: true });
      } else {
        // Handle case where no text is found
        console.warn("Speechify: No text selected or found on the page.");
        sendResponse({ success: false, message: "No text found to read." });
      }
    } else if (request.action === 'stop') {
      stopSpeech();
      sendResponse({ success: true });
    } else if (request.action === 'pause') {
      pauseSpeech();
      sendResponse({ success: true });
    } else if (request.action === 'resume') {
      resumeSpeech();
      sendResponse({ success: true });
    } else if (request.action === 'setVoice') {
      setVoice(request.voiceName);
      sendResponse({ success: true });
    } else if (request.action === 'setRate') {
      setSpeechRate(request.rate);
      sendResponse({ success: true });
    } else if (request.action === 'setPitch') {
      setSpeechPitch(request.pitch);
      sendResponse({ success: true });
    } else if (request.action === 'readSelectedText' && request.selectedText) {
      if (isPlaying) stopSpeech();
      speakParagraphs([request.selectedText]);
    }
    return true;
  });
}

// Load available voices for speech synthesis
function loadVoices() {
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0 && !selectedVoice) {
    // Default to the first English voice, or the first voice if no English voice is found
    selectedVoice = voices.find(voice => voice.lang.includes('en')) || voices[0];
  }
}

// Create the highlight overlay that will display on top of the page
function createHighlightOverlay() {
  // Create container for highlighted text
  highlightOverlay = document.createElement('div');
  highlightOverlay.className = 'speechify-highlight-overlay';
  highlightOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 99999;
    display: none;
  `;
  
  // Create the highlight element
  highlightElement = document.createElement('div');
  highlightElement.className = 'speechify-highlight';
  highlightElement.style.cssText = `
    position: absolute;
    background-color: rgba(255, 215, 0, 0.4);
    border-radius: 3px;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
    transition: all 0.1s ease-in-out;
  `;
  
  highlightOverlay.appendChild(highlightElement);
  document.body.appendChild(highlightOverlay);
}

// Create the control bar for playback controls
function createControlBar() {
  controlBar = document.createElement('div');
  controlBar.className = 'speechify-control-bar';
  controlBar.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #fff;
    border-radius: 30px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 10px 20px;
    display: flex;
    align-items: center;
    z-index: 100000;
    display: none;
  `;
  
  // Create play/pause button
  const playPauseBtn = document.createElement('button');
  playPauseBtn.className = 'speechify-play-pause-btn';
  playPauseBtn.innerHTML = '▶️';
  playPauseBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    margin-right: 10px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  playPauseBtn.addEventListener('click', togglePlayPause);
  
  // Create stop button
  const stopBtn = document.createElement('button');
  stopBtn.className = 'speechify-stop-btn';
  stopBtn.innerHTML = '⏹️';
  stopBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    margin-right: 10px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  stopBtn.addEventListener('click', stopSpeech);
  
  // Create speed control
  const speedControl = document.createElement('select');
  speedControl.className = 'speechify-speed-control';
  speedControl.style.cssText = `
    margin: 0 10px;
    padding: 5px;
    border-radius: 3px;
    border: 1px solid #ccc;
  `;
  
  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  speeds.forEach(speed => {
    const option = document.createElement('option');
    option.value = speed;
    option.text = `${speed}x`;
    if (speed === 1.0) option.selected = true;
    speedControl.appendChild(option);
  });
  
  speedControl.addEventListener('change', e => {
    setSpeechRate(parseFloat(e.target.value));
  });
  
  // Add elements to control bar
  controlBar.appendChild(playPauseBtn);
  controlBar.appendChild(stopBtn);
  controlBar.appendChild(speedControl);
  
  // Add control bar to the document
  document.body.appendChild(controlBar);
}

// Get selected text from the page
function getSelectedText() {
  const selection = window.getSelection();
  return selection.toString().trim();
}

// Handle text selection
function handleTextSelection() {
  const selectedText = getSelectedText();
  if (selectedText.length > 0) {
    // Show play button near the selection
    showPlayButton();
  }
}

// Show play button near text selection
function showPlayButton() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Create or update play button
  let playButton = document.querySelector('.speechify-play-selection');
  if (!playButton) {
    playButton = document.createElement('button');
    playButton.className = 'speechify-play-selection';
    playButton.innerHTML = '▶️';
    playButton.style.cssText = `
      position: absolute;
      background: #4285f4;
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 100000;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      font-size: 18px;
    `;
    playButton.addEventListener('click', () => {
      const text = getSelectedText();
      if (text) {
        startSpeech(text);
      }
      playButton.remove();
    });
    
    document.body.appendChild(playButton);
  }
  
  // Position the button near the selection
  playButton.style.top = `${window.scrollY + rect.bottom + 10}px`;
  playButton.style.left = `${window.scrollX + rect.left + rect.width / 2 - 18}px`;
  
  // Remove button when clicking elsewhere
  const removeButton = (e) => {
    if (!playButton.contains(e.target)) {
      playButton.remove();
      document.removeEventListener('mousedown', removeButton);
    }
  };
  
  document.addEventListener('mousedown', removeButton);
}

// Start text-to-speech
function startSpeech(text) {
  console.log("[Speechify Debug] Text Received by startSpeech:", JSON.stringify(text)); // Log text received by startSpeech
  // Stop any ongoing speech
  stopSpeech();
  
  // Process text into words and get their positions
  processText(text);
  
  // If no words, exit
  if (words.length === 0) return;
  
  // Make sure highlight overlay is visible before starting
  highlightOverlay.style.display = 'block';
  
  // Create new utterance
  utterance = new SpeechSynthesisUtterance(text);
  
  // Set voice
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  
  // Set rate and pitch
  utterance.rate = speechRate;
  utterance.pitch = speechPitch;
  
  // Set up word boundaries event
  utterance.onboundary = handleWordBoundary;
  
  // Set up end event
  utterance.onend = handleSpeechEnd;
  
  // Start speaking
  speechSynthesis.speak(utterance);
  isPlaying = true;
  
  // Update UI
  updateControlBar();
  highlightOverlay.style.display = 'block';
  controlBar.style.display = 'flex';
  
  // Update play/pause button
  const playPauseBtn = document.querySelector('.speechify-play-pause-btn');
  if (playPauseBtn) {
    playPauseBtn.innerHTML = '⏸️';
  }
  
  // Highlight the first word immediately
  currentWordIndex = 0;
  highlightCurrentWord();
}

// Process text to get words and their positions
function processText(text) {
  // Split text into words
  words = text.split(/\s+/).filter(word => word.trim() !== '');
  currentWordIndex = 0;
  
  // Get the positions of words in the document to highlight them
  // This is a simplified version that works for normal text on a page
  // For more complex pages, additional processing may be needed
  
  // First, try to find the text in the visible part of the page
  const textNodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip script and style nodes
        if (node.parentElement.tagName === 'SCRIPT' || 
            node.parentElement.tagName === 'STYLE' ||
            node.parentElement.tagName === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        
        const nodeText = node.textContent.trim();
        // Accept only non-empty text nodes
        return nodeText.length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  let currentNode;
  while (currentNode = walker.nextNode()) {
    textNodes.push(currentNode);
  }
  
  // Now map words to their positions in the document
  wordsWithPositions = [];
  let wordIndex = 0;
  
  for (const node of textNodes) {
    const nodeText = node.textContent;
    const nodeWords = nodeText.split(/\s+/).filter(w => w.trim() !== '');
    
    for (let i = 0; i < nodeWords.length; i++) {
      const word = nodeWords[i];
      
      // Check if this word matches our current word
      if (wordIndex < words.length && word.includes(words[wordIndex].replace(/[.,!?;:]/g, ''))) {
        // Create a range for this word
        const range = document.createRange();
        
        // Set start of range
        let currentWordStart = nodeText.indexOf(word);
        if (currentWordStart >= 0) {
          range.setStart(node, currentWordStart);
          range.setEnd(node, currentWordStart + word.length);
          
          // Get position
          const rect = range.getBoundingClientRect();
          
          wordsWithPositions.push({
            word: words[wordIndex],
            index: wordIndex,
            rect: {
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width,
              height: rect.height
            }
          });
          
          wordIndex++;
        }
      }
    }
  }
}

// Handle word boundary event from speech synthesis
function handleWordBoundary(event) {
  // Get the word that's being spoken
  const wordPosition = event.charIndex;
  const wordLength = event.charLength || 0;
  
  // Find which word is currently being spoken
  let word = '';
  let accumulatedLength = 0;
  
  for (let i = 0; i < words.length; i++) {
    // Account for spaces between words
    if (i > 0) accumulatedLength += 1;
    
    const currentWord = words[i];
    const wordEnd = accumulatedLength + currentWord.length;
    
    if (wordPosition >= accumulatedLength && wordPosition < wordEnd) {
      word = currentWord;
      currentWordIndex = i;
      break;
    }
    
    accumulatedLength += currentWord.length;
  }
  
  // Log for debugging
  console.log(`Speaking word: ${word} at index ${currentWordIndex}`);
  
  // Highlight the current word
  highlightCurrentWord();
}

// Highlight the current word
function highlightCurrentWord() {
  // Find the position of the current word
  const wordInfo = wordsWithPositions.find(w => w.index === currentWordIndex);
  
  if (wordInfo) {
    // Make sure the highlight overlay is visible
    highlightOverlay.style.display = 'block';
    
    // Position the highlight element
    highlightElement.style.top = `${wordInfo.rect.top}px`;
    highlightElement.style.left = `${wordInfo.rect.left}px`;
    highlightElement.style.width = `${wordInfo.rect.width}px`;
    highlightElement.style.height = `${wordInfo.rect.height}px`;
    highlightElement.style.opacity = '1';
    
    // Scroll the word into view if needed
    const windowHeight = window.innerHeight;
    const windowScrollY = window.scrollY;
    
    // If word is above or below the visible area
    if (wordInfo.rect.top < windowScrollY || 
        wordInfo.rect.top + wordInfo.rect.height > windowScrollY + windowHeight) {
      window.scrollTo({
        top: wordInfo.rect.top - (windowHeight / 2),
        behavior: 'smooth'
      });
    }
  }
}

// Handle speech end
function handleSpeechEnd() {
  isPlaying = false;
  updateControlBar();
  
  // Hide the overlay and control bar after a delay
  setTimeout(() => {
    if (!isPlaying) {
      highlightOverlay.style.display = 'none';
      controlBar.style.display = 'none';
    }
  }, 2000);
}

// Toggle play/pause speech
function togglePlayPause() {
  if (isPlaying) {
    pauseSpeech();
  } else {
    resumeSpeech();
  }
}

// Pause speech
function pauseSpeech() {
  if (isPlaying) {
    speechSynthesis.pause();
    isPlaying = false;
    
    // Update play/pause button
    const playPauseBtn = document.querySelector('.speechify-play-pause-btn');
    if (playPauseBtn) {
      playPauseBtn.innerHTML = '▶️';
    }
  }
}

// Resume speech
function resumeSpeech() {
  if (!isPlaying && utterance) {
    speechSynthesis.resume();
    isPlaying = true;
    
    // Update play/pause button
    const playPauseBtn = document.querySelector('.speechify-play-pause-btn');
    if (playPauseBtn) {
      playPauseBtn.innerHTML = '⏸️';
    }
    
    // Show the overlay and control bar
    highlightOverlay.style.display = 'block';
    controlBar.style.display = 'flex';
  }
}

// Stop speech
function stopSpeech() {
  speechSynthesis.cancel();
  isPlaying = false;
  
  // Reset UI
  highlightOverlay.style.display = 'none';
  
  // Update play/pause button
  const playPauseBtn = document.querySelector('.speechify-play-pause-btn');
  if (playPauseBtn) {
    playPauseBtn.innerHTML = '▶️';
  }
}

// Set voice for speech synthesis
function setVoice(voiceName) {
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => v.name === voiceName);
  if (voice) {
    selectedVoice = voice;
  }
}

// Set speech rate
function setSpeechRate(rate) {
  speechRate = parseFloat(rate);
  if (utterance) {
    utterance.rate = speechRate;
    
    // If we're currently speaking, restart with the new rate
    if (isPlaying) {
      const currentText = utterance.text;
      stopSpeech();
      startSpeech(currentText);
    }
  }
  
  // Update the speed control in the UI
  const speedControl = document.querySelector('.speechify-speed-control');
  if (speedControl) {
    speedControl.value = speechRate;
  }
}

// Set speech pitch
function setSpeechPitch(pitch) {
  speechPitch = parseFloat(pitch);
  if (utterance) {
    utterance.pitch = speechPitch;
  }
}

// Update control bar UI based on current state
function updateControlBar() {
  const playPauseBtn = document.querySelector('.speechify-play-pause-btn');
  if (playPauseBtn) {
    playPauseBtn.innerHTML = isPlaying ? '⏸️' : '▶️';
  }
}

// Extract readable text content from the page body
function extractPageText() {
  console.log("[Speechify Debug] Starting extractPageText..."); // Log start of function
  let rawText = '';
  const mainContent = document.querySelector('main, article, [role="main"], #main, #content, .main, .content');
  const targetElement = mainContent || document.body;
  const blockElements = ['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'ARTICLE', 'SECTION', 'BLOCKQUOTE', 'TD', 'BR', 'HR', 'PRE'];

  const walker = document.createTreeWalker(
    targetElement,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const style = window.getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
          const tagName = node.tagName.toUpperCase();
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'NAV', 'FOOTER'].includes(tagName)) return NodeFilter.FILTER_REJECT;
          if (blockElements.includes(tagName)) return NodeFilter.FILTER_ACCEPT; // Accept block elements
          return NodeFilter.FILTER_SKIP; // Skip inline elements but check children
        } else if (node.nodeType === Node.TEXT_NODE) {
          const parentTagName = node.parentElement?.tagName?.toUpperCase();
          if (parentTagName && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parentTagName)) return NodeFilter.FILTER_REJECT;
          // Accept text nodes that contain non-whitespace characters
          return /\S/.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );

  let currentNode;
  while (currentNode = walker.nextNode()) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      // Append text content directly, preserving internal spacing for now
      rawText += currentNode.textContent;
    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      // Add a marker for block elements
       const tagName = currentNode.tagName.toUpperCase();
       if (blockElements.includes(tagName)) {
          // Add marker only if rawText doesn't already end with it or whitespace
          if (!/\s*\|\|BR\|\|\s*$/.test(rawText)) {
             rawText += ' ||BR|| ';
          }
       }
    }
  }
  console.log("[Speechify Debug] Raw Text Collected:", JSON.stringify(rawText)); // Log raw text after loop

  // Post-processing cleanup
  // 1. Replace the marker (and surrounding space) with a single newline
  let processedText = rawText.replace(/\s*\|\|BR\|\|\s*/g, '\n');
  console.log("[Speechify Debug] After Marker Replace:", JSON.stringify(processedText)); // Log after step 1
  // 2. Normalize multiple spaces/tabs (but not newlines) into single spaces
  processedText = processedText.replace(/[ \t]{2,}/g, ' ');
  console.log("[Speechify Debug] After Space/Tab Normalize:", JSON.stringify(processedText)); // Log after step 2
  // 3. Collapse multiple consecutive newlines into a single newline
  processedText = processedText.replace(/\n{2,}/g, '\n');
  console.log("[Speechify Debug] After Newline Collapse:", JSON.stringify(processedText)); // Log after step 3
  // 4. Remove spaces directly before or after a newline
  processedText = processedText.replace(/ *\n */g, '\n');
  console.log("[Speechify Debug] After Newline Space Trim:", JSON.stringify(processedText)); // Log after step 4

  // Return the cleaned text, trimmed
  const finalText = processedText.trim();
  console.log("[Speechify Debug] Final Extracted Text (Trimmed):", JSON.stringify(finalText)); // Log final result
  return finalText;
}

// Modify speakParagraphs to handle direct text input
function speakParagraphs(texts) {
  const sentences = texts.flatMap(text => 
    text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  );
  // ... rest of existing speakParagraphs logic ...
}

// Initialize the extension when the content script loads
init();
