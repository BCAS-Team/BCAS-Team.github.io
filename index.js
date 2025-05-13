// ===== Refined Search (Revised without AI) =====
document.querySelector('#refine-search-button').addEventListener('click', () => {
  const query = document.querySelector('#search-query').value.trim(); // Corrected the query selector
  const output = document.querySelector('#refined-query-output');

  if (!query) {
    output.textContent = "Please enter a search term.";
    return;
  }

  // Local search logic or static response (you can replace this with any desired functionality)
  const refined = `Refined search for: "${query}" — Search results could be displayed here from Google, Tor, or Gemini-based resources.`;
  output.textContent = refined;
});

// ===== Custom Cursor =====
const cursor = document.createElement('div');
cursor.classList.add('cursor');
document.body.appendChild(cursor);

document.addEventListener('mousemove', (e) => {
  cursor.style.top = `${e.clientY}px`;
  cursor.style.left = `${e.clientX}px`;
});
