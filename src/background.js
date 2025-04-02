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

// Add context menu for text selection
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'readSelectedText',
    title: 'Read with Speechify Copy',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'readSelectedText') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'start',
      text: info.selectionText
    });
  }
});
