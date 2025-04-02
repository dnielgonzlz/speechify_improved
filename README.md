# Speechify Copy

A Chrome extension that reads web content aloud and highlights words as they're being read.

## Features

- Text-to-speech functionality similar to Speechify
- Word highlighting as text is being read
- Works with websites and PDFs
- Customizable voice, speed, and pitch
- Simple control panel for playback

## Installation

### Development Mode

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/speechify_copy.git
   cd speechify_copy
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the extension:
   ```
   npm run build:extension
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder from this project

### Usage

1. Navigate to any webpage or PDF document
2. Select the text you want to read
3. Click the play button that appears near the selection, or:
4. Right-click on the selected text and choose "Read with Speechify Copy"
5. Use the control panel to pause, stop, or adjust the reading speed

## Customization

You can customize the extension through the popup:
- Choose from available voices
- Adjust reading speed (0.5x to 2x)
- Adjust pitch

## Development

- `npm run dev`: Start the development server for testing
- `npm run build`: Build the app for web
- `npm run build:extension`: Build the Chrome extension
- `npm run preview`: Preview the built app

## Implementation Details

This extension uses:
- Web Speech API for text-to-speech functionality
- HTML/CSS/JavaScript for the UI
- Chrome Extension API for browser integration
- MutationObserver for handling dynamic content
- Vite for building the extension

## License

MIT
