// ===================
// BCAS Content Loader
// ===================
const content = document.getElementById('content');
const searchInput = document.getElementById('search');
const categoryButtons = document.querySelectorAll('.category-btn');

let bcasData = {
  tools: [],
  tutorials: [],
  resources: [],
  concepts: []
};
let currentCategory = 'tools';

// Fetch all category data
Promise.all([
  fetch('tools.json').then(res => res.json()),
  fetch('tutorials.json').then(res => res.json()),
  fetch('resources.json').then(res => res.json()),
  fetch('concepts.json').then(res => res.json())
])
  .then(([tools, tutorials, resources, concepts]) => {
    bcasData.tools = tools.guide?.tools || tools.tools || [];
    bcasData.tutorials = tutorials.guide?.tutorials || tutorials.tutorials || [];
    bcasData.resources = resources.guide?.resources || resources.resources || [];
    bcasData.concepts = concepts.guide?.concepts || concepts.concepts || [];
    renderList(currentCategory);
  })
  .catch(err => {
    content.innerHTML = `<p style="color:red;">Error loading data: ${err.message}</p>`;
  });

// Render the list based on category and filter
function renderList(category, filter = '') {
  const filterLower = filter.toLowerCase();
  let combinedList = [];

  if (filter) {
    for (const cat in bcasData) {
      combinedList.push(
        ...bcasData[cat].filter(item => {
          const text = `${item.name} ${item.description || ''} ${item.category || ''}`.toLowerCase();
          return text.includes(filterLower);
        }).map(item => ({ ...item, _category: cat }))
      );
    }
  } else {
    combinedList = bcasData[category] || [];
  }

  const html = combinedList.map(item => {
    return `<div class="item">
      <h2>${item.name}</h2>
      <div class="details">
        ${item._category ? `<p><strong>Category:</strong> ${item._category}</p>` : ''}
        ${item.category ? `<p><strong>Subcategory:</strong> ${item.category}</p>` : ''}
        ${item.description ? `<p><strong>Description:</strong> ${item.description}</p>` : ''}
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
    currentCategory = btn.getAttribute('data-category');
    searchInput.value = '';
    renderList(currentCategory);
  });
});

// Handle search input
searchInput.addEventListener('input', () => {
  renderList(currentCategory, searchInput.value);
});

