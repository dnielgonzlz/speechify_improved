// PDF Support for Speechify Copy
// This file provides additional functionality for handling PDFs in Chrome

/**
 * Check if the current page is a PDF file
 * @returns {boolean} True if the page is a PDF
 */
function isPdfPage() {
  return (
    window.location.pathname.toLowerCase().endsWith('.pdf') ||
    document.querySelector('embed[type="application/pdf"]') !== null ||
    document.querySelector('object[type="application/pdf"]') !== null ||
    document.querySelector('iframe[src*=".pdf"]') !== null
  );
}

/**
 * Extract text from a PDF document
 * This uses Chrome's built-in PDF viewer's content
 * @returns {string} Extracted text
 */
function extractPdfText() {
  let text = '';
  
  // Try to get text from Chrome's PDF Viewer
  const textLayers = document.querySelectorAll('.textLayer');
  if (textLayers && textLayers.length > 0) {
    textLayers.forEach(layer => {
      // Get all text spans
      const spans = layer.querySelectorAll('span');
      if (spans && spans.length > 0) {
        spans.forEach(span => {
          text += span.textContent + ' ';
        });
        text += '\n\n';  // Add paragraph breaks between text layers
      }
    });
  }
  
  // If no text is found, try to get from the page content
  if (text.trim() === '') {
    text = document.body.innerText;
  }
  
  return text;
}

/**
 * Get PDF page count
 * @returns {number} Number of pages or -1 if unable to determine
 */
function getPdfPageCount() {
  // Try to find the page counter element
  const pageCounter = document.querySelector('.pageNumber');
  if (pageCounter) {
    const text = pageCounter.textContent;
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    if (match && match[2]) {
      return parseInt(match[2], 10);
    }
  }
  
  // Try to count the page divs
  const pages = document.querySelectorAll('.page');
  if (pages && pages.length > 0) {
    return pages.length;
  }
  
  return -1;
}

/**
 * Highlight text in a PDF document
 * @param {number} pageNumber - Page number (1-based)
 * @param {string} text - Text to highlight
 * @param {DOMRect} rect - Position of the text
 */
function highlightPdfText(pageNumber, text, rect) {
  // Find the page
  const page = document.querySelector(`.page[data-page-number="${pageNumber}"]`);
  if (!page) return;
  
  // Create highlight element
  const highlight = document.createElement('div');
  highlight.className = 'speechify-pdf-highlight';
  highlight.style.position = 'absolute';
  highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
  highlight.style.left = `${rect.left}px`;
  highlight.style.top = `${rect.top}px`;
  highlight.style.width = `${rect.width}px`;
  highlight.style.height = `${rect.height}px`;
  highlight.style.pointerEvents = 'none';
  highlight.style.zIndex = '100';
  
  // Add highlight to the page
  page.appendChild(highlight);
  
  // Return the highlight element so it can be removed later
  return highlight;
}

/**
 * Scroll to a specific page in a PDF
 * @param {number} pageNumber - Page number to scroll to (1-based)
 */
function scrollToPdfPage(pageNumber) {
  const page = document.querySelector(`.page[data-page-number="${pageNumber}"]`);
  if (page) {
    page.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Export functions
export {
  isPdfPage,
  extractPdfText,
  getPdfPageCount,
  highlightPdfText,
  scrollToPdfPage
};
