// ===================
// BCAS Content Loader
// ===================
const content = document.getElementById('content');
const searchInput = document.getElementById('search');
const categoryButtons = document.querySelectorAll('.category-btn');

let bcasData = {
  statutes: [],
  caselaw: [],
  legalconcepts: [],
  legalresources: []
};
let currentCategory = 'statutes'; // Default category

// Fetch all category data
Promise.all([
  fetch('statutes.json').then(res => res.json()),
  fetch('caselaw.json').then(res => res.json()),
  fetch('legalconcepts.json').then(res => res.json()),
  fetch('legalresources.json').then(res => res.json())
])
  .then(([statutes, caselaw, legalconcepts, legalresources]) => {
    bcasData.statutes = statutes.guide?.statutes || statutes.statutes || [];
    bcasData.caselaw = caselaw.guide?.caselaw || caselaw.caselaw || [];
    bcasData.legalconcepts = legalconcepts.guide?.legalconcepts || legalconcepts.legalconcepts || [];
    bcasData.legalresources = legalresources.guide?.legalresources || legalresources.legalresources || [];
    renderList(currentCategory);
  })
  .catch(err => {
    content.innerHTML = `<p style="color:red;">Error loading data: ${err.message}</p>`;
  });

// Render the list based on category and filter
function renderList(category, filter = '') {
  const filterLower = filter.toLowerCase();
  let combinedList = [];

  // Assuming data structure within JSON files will be similar
  if (bcasData[category]) {
    combinedList = bcasData[category].filter(item =>
      item.name.toLowerCase().includes(filterLower) ||
      (item.description && item.description.toLowerCase().includes(filterLower)) ||
      (item.definitions && item.definitions.some(def => def.toLowerCase().includes(filterLower)))
    );
  }

  const html = combinedList.map(item => {
    // This rendering logic assumes a flexible structure for items,
    // which can be adapted based on the specific fields in new legal JSON files.
    // For a Computer Law Wiki, you might want to display fields like 'citation', 'jurisdiction', 'summary', etc.
    return `
      <div class="item">
        <h2>${item.name}</h2>
        <div class="details">
          ${item.category ? `<p><strong>Category:</strong> ${item.category}</p>` : ''}
          ${item.description ? `<p><strong>Description:</strong> ${item.description}</p>` : ''}
          ${item.definitions ? `<p><strong>Definitions:</strong></p><ul>${item.definitions.map(def => `<li>${def}</li>`).join('')}</ul>` : ''}
          ${item.usage ? `<p><strong>Usage:</strong> <code>${item.usage}</code></p>` : ''}
          ${item.steps ? `<p><strong>Steps:</strong></p><ol>${item.steps.map(step => `<li>${step}</li>`).join('')}</ol>` : ''}
          ${item.examples ? `<p><strong>Examples:</strong></p><ul>${item.examples.map(ex => `<li><code>${ex}</code></li>`).join('')}</ul>` : ''}
          ${item.notes ? `<p><strong>Notes:</strong> ${item.notes}</p>` : ''}
          ${item.links ? `<p><strong>Links:</strong> ${item.links.map(link => `<a href="${link}" target="_blank">${link}</a>`).join(', ')}</p>` : ''}
          ${item.link ? `<p><strong>Link:</strong> <a href="${item.link}" target="_blank">${item.link}</a></p>` : ''}
        </div>
      </div>`;
  }).join('');

  content.innerHTML = html || `<p>No entries found${filter ? ` for "${filter}"` : ''}.</p>`;

  document.querySelectorAll('.item h2').forEach(h2 => {
    h2.addEventListener('click', () => {
      const details = h2.nextElementSibling;
      details.style.display = details.style.display === 'block' ? 'none' : 'block';
    });
  });
}

// Handle category switching
categoryButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    categoryButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category;
    renderList(currentCategory, searchInput.value);
  });
});

// Handle search input
searchInput.addEventListener('input', () => {
  renderList(currentCategory, searchInput.value);
});

// Handle hamburger menu for mobile
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');

hamburger.addEventListener('click', () => {
  sidebar.classList.toggle('active');
  hamburger.classList.toggle('active');
});

// Initial render
renderList(currentCategory);