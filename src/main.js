import './style.css';
import javascriptLogo from './javascript.svg';
import viteLogo from '/vite.svg';

// This file is mainly for the development environment when testing outside the extension

document.querySelector('#app').innerHTML = `
  <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
    <div style="display: flex; align-items: center; margin-bottom: 20px;">
      <img src="${viteLogo}" class="logo" alt="Vite logo" style="height: 64px; margin-right: 20px;" />
      <h1 style="font-size: 28px; margin: 0;">Speechify Copy - Chrome Extension</h1>
    </div>
    
    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h2>Test Environment</h2>
      <p>This is a development environment for testing the Speechify Copy extension functionality. In a real-world scenario, this extension would be loaded into Chrome.</p>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h3>Sample Text for Testing</h3>
      <div id="sample-text" style="line-height: 1.6; background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
        <p>"I'm going to be King of the Pirates!"</p>
        <p>"I don't want to conquer anything. I just think the guy with the most freedom in this whole ocean... that's the Pirate King!"</p>
        <p>"If you don't take risks, you can't create a future!"</p>
      </div>
    </div>
    
    <div style="display: flex; justify-content: center; margin-bottom: 20px;">
      <button id="test-read-btn" style="background-color: #4285f4; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: 500;">
        Test Read Aloud
      </button>
    </div>
    
    <div style="font-size: 14px; color: #666; text-align: center;">
      This is a development version of the Speechify Copy extension. To use the extension in Chrome, build the project and load it as an unpacked extension.
    </div>
  </div>
`;

// Add event listener for the test button
document.getElementById('test-read-btn').addEventListener('click', () => {
  const textContainer = document.getElementById('sample-text');
  const fullText = textContainer.textContent;
  
  // Process text into individual word spans
  const words = fullText.split(/(\s+)/).filter(word => word.trim().length > 0);
  textContainer.innerHTML = words.map(word => 
    `<span class="word">${word}</span>`
  ).join('');

  const utterance = new SpeechSynthesisUtterance(fullText);
  let currentWord = null;

  utterance.addEventListener('boundary', (e) => {
    if (currentWord) currentWord.classList.remove('active');
    
    const charIndex = e.charIndex;
    const wordElements = Array.from(textContainer.querySelectorAll('.word'));
    
    // Find current word element by accumulating text lengths
    let position = 0;
    currentWord = wordElements.find(word => {
      position += word.textContent.length;
      return position > charIndex;
    });

    if (currentWord) {
      currentWord.classList.add('active');
      currentWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  utterance.addEventListener('end', () => {
    if (currentWord) currentWord.classList.remove('active');
  });

  window.speechSynthesis.speak(utterance);
});
