const Button = document.getElementById('refine-search-button');
const queryInput = document.getElementById('search-query');
const output = document.getElementById('refined-query-output');
const popup = document.getElementById('popup');
const popupFrame = document.getElementById('popup-frame');
const closePopupBtn = document.getElementById('close-popup');
const cursor = document.querySelector('.cursor');

Button.addEventListener('click', () => {
  const query = queryInput.value.trim();

  if (!query) {
    output.textContent = "Please enter a search term.";
    return;
  }

  output.textContent = `Showing results for: "${query}"`;

  openWikiPopup(query);
});

// Open popup with Wikipedia results
function openWikiPopup(query) {
  const wikipediaUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
  popupFrame.src = wikipediaUrl;
  popup.classList.add('active');
}

// Close popup
closePopupBtn.addEventListener('click', () => {
  popup.classList.remove('active');
  popupFrame.src = '';
});

// Close popup on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && popup.classList.contains('active')) {
    popup.classList.remove('active');
    popupFrame.src = '';
  }
});

// Custom cursor movement
document.addEventListener('mousemove', e => {
  cursor.style.top = `${e.clientY}px`;
  cursor.style.left = `${e.clientX}px`;
});
