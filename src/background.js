// Listen for installation event
chrome.runtime.onInstalled.addListener(() => {
  console.log('Speechify Copy extension installed');
  
  // Initialize default settings
  chrome.storage.sync.set({
    voiceName: null,
    speechRate: 1.0,
    speechPitch: 1.0,
    autoplay: false
  });

  // Create context menu item
  chrome.contextMenus.create({
    id: 'read-selection',
    title: 'Read this', 
    contexts: ['selection']
  });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVoices') {
    // Get all available voices
    const voices = window.speechSynthesis.getVoices();
    sendResponse({ voices: voices.map(voice => ({
      name: voice.name,
      lang: voice.lang,
      default: voice.default
    }))});
  }
  
  // Always return true for async response
  return true;
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'read-selection' && info.selectionText) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'readSelectedText',
        selectedText: info.selectionText
      });
    });
  }
});
