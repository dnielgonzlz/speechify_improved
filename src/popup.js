// DOM elements
const voiceSelect = document.getElementById('voice-select');
const rateSlider = document.getElementById('rate-slider');
const rateValue = document.getElementById('rate-value');
const pitchSlider = document.getElementById('pitch-slider');
const pitchValue = document.getElementById('pitch-value');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const statusMessage = document.getElementById('status-message');

// Global state
let isPlaying = false;
let isPaused = false;
let currentTabId = null;
let voices = [];

// Initialize the popup
document.addEventListener('DOMContentLoaded', initPopup);

// Initialize popup data and event listeners
async function initPopup() {
  // Get the active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tabs[0].id;
  
  // Load available voices
  loadVoices();
  
  // Load saved settings
  loadSettings();
  
  // Get current state from the content script
  chrome.tabs.sendMessage(currentTabId, { action: 'getState' }, (response) => {
    if (response) {
      updateUIState(response);
    }
  });
  
  // Add event listeners
  voiceSelect.addEventListener('change', onVoiceChange);
  rateSlider.addEventListener('input', onRateChange);
  pitchSlider.addEventListener('input', onPitchChange);
  playBtn.addEventListener('click', onPlayClick);
  pauseBtn.addEventListener('click', onPauseClick);
  stopBtn.addEventListener('click', onStopClick);
}

// Load available voices for speech synthesis
function loadVoices() {
  // Get system voices
  const synth = window.speechSynthesis;
  voices = synth.getVoices();
  
  // If no voices available yet, wait for them to load
  if (voices.length === 0) {
    synth.addEventListener('voiceschanged', () => {
      voices = synth.getVoices();
      populateVoiceSelect(voices);
    });
  } else {
    populateVoiceSelect(voices);
  }
}

// Populate the voice select dropdown
function populateVoiceSelect(voiceList) {
  // Clear existing options
  voiceSelect.innerHTML = '';
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.textContent = 'Default Voice';
  defaultOption.value = '';
  voiceSelect.appendChild(defaultOption);
  
  // Add each voice as an option
  voiceList.forEach(voice => {
    const option = document.createElement('option');
    option.textContent = `${voice.name} (${voice.lang})`;
    option.value = voice.name;
    
    // Mark default voice
    if (voice.default) {
      option.textContent += ' - Default';
    }
    
    voiceSelect.appendChild(option);
  });
  
  // Load saved voice preference
  chrome.storage.sync.get('voiceName', (data) => {
    if (data.voiceName) {
      voiceSelect.value = data.voiceName;
    }
  });
}

// Load saved settings from storage
function loadSettings() {
  chrome.storage.sync.get(['voiceName', 'speechRate', 'speechPitch'], (data) => {
    // Set rate
    if (data.speechRate) {
      rateSlider.value = data.speechRate;
      rateValue.textContent = `${data.speechRate}x`;
    }
    
    // Set pitch
    if (data.speechPitch) {
      pitchSlider.value = data.speechPitch;
      updatePitchLabel(data.speechPitch);
    }
    
    // Voice is handled in populateVoiceSelect
  });
}

// Update UI based on the current state
function updateUIState(state) {
  isPlaying = state.isPlaying;
  
  // Update buttons
  if (isPlaying) {
    playBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    statusMessage.textContent = 'Reading text aloud...';
  } else {
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    statusMessage.textContent = 'Select text on any webpage and click Play to start reading.';
  }
  
  // Update rate and pitch if different
  if (state.speechRate && state.speechRate !== parseFloat(rateSlider.value)) {
    rateSlider.value = state.speechRate;
    rateValue.textContent = `${state.speechRate}x`;
  }
  
  if (state.speechPitch && state.speechPitch !== parseFloat(pitchSlider.value)) {
    pitchSlider.value = state.speechPitch;
    updatePitchLabel(state.speechPitch);
  }
  
  // Update voice selection if different
  if (state.selectedVoice && voiceSelect.value !== state.selectedVoice) {
    voiceSelect.value = state.selectedVoice;
  }
}

// Handle voice change
function onVoiceChange() {
  const selectedVoice = voiceSelect.value;
  
  // Save to storage
  chrome.storage.sync.set({ voiceName: selectedVoice });
  
  // Send to content script
  chrome.tabs.sendMessage(currentTabId, {
    action: 'setVoice',
    voiceName: selectedVoice
  });
}

// Handle rate change
function onRateChange() {
  const rate = parseFloat(rateSlider.value);
  rateValue.textContent = `${rate}x`;
  
  // Save to storage
  chrome.storage.sync.set({ speechRate: rate });
  
  // Send to content script
  chrome.tabs.sendMessage(currentTabId, {
    action: 'setRate',
    rate: rate
  });
}

// Handle pitch change
function onPitchChange() {
  const pitch = parseFloat(pitchSlider.value);
  updatePitchLabel(pitch);
  
  // Save to storage
  chrome.storage.sync.set({ speechPitch: pitch });
  
  // Send to content script
  chrome.tabs.sendMessage(currentTabId, {
    action: 'setPitch',
    pitch: pitch
  });
}

// Update pitch label based on value
function updatePitchLabel(pitch) {
  if (pitch < 0.8) {
    pitchValue.textContent = 'Low';
  } else if (pitch > 1.2) {
    pitchValue.textContent = 'High';
  } else {
    pitchValue.textContent = 'Normal';
  }
}

// Handle play button click
function onPlayClick() {
  chrome.tabs.sendMessage(currentTabId, { action: 'start' }, (response) => {
    if (response && response.success) {
      isPlaying = true;
      playBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      statusMessage.textContent = 'Reading text aloud...';
    }
  });
}

// Handle pause button click
function onPauseClick() {
  if (isPlaying) {
    chrome.tabs.sendMessage(currentTabId, { action: 'pause' }, (response) => {
      if (response && response.success) {
        isPlaying = false;
        playBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = false;
        statusMessage.textContent = 'Paused. Click Play to resume.';
      }
    });
  } else {
    chrome.tabs.sendMessage(currentTabId, { action: 'resume' }, (response) => {
      if (response && response.success) {
        isPlaying = true;
        playBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        statusMessage.textContent = 'Reading text aloud...';
      }
    });
  }
}

// Handle stop button click
function onStopClick() {
  chrome.tabs.sendMessage(currentTabId, { action: 'stop' }, (response) => {
    if (response && response.success) {
      isPlaying = false;
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      statusMessage.textContent = 'Select text on any webpage and click Play to start reading.';
    }
  });
}
