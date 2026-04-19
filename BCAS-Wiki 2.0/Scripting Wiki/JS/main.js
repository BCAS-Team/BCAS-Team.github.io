// ===================
// BCAS Content Loader
// ===================

// Get references to key DOM elements with null checks
const content = document.getElementById('content');
const searchInput = document.getElementById('search');
const hamburgerBtn = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');

// Validate required DOM elements early
if (!content || !searchInput) {
  console.error('Required DOM elements (content, search) not found. Please check your HTML.');
}

// Store all loaded resources in a single array
let bcasData = {
  resources: []
};

// Default category to show on load or when search is cleared
let currentCategory = 'python';

// List of JSON files to fetch (ensure paths are correct relative to your HTML)
const jsonFiles = [
  '/BCAS-Wiki 2.0/Scripting Wiki/JSON/python.json',
  '/BCAS-Wiki 2.0/Scripting Wiki/JSON/bash.json',
  '/BCAS-Wiki 2.0/Scripting Wiki/JSON/MSdos.json',
  '/BCAS-Wiki 2.0/Scripting Wiki/JSON/VBS.json',
  '/BCAS-Wiki 2.0/Scripting Wiki/JSON/batch.json',
  '/BCAS-Wiki 2.0/Scripting Wiki/JSON/PowerShell.json'
];

// --- Utility Functions ---

/**
 * Safely extracts resources from fetched JSON with flexible structure support
 * @param {Object|Array} jsonData - Parsed JSON object or array
 * @param {string} sourceFile - Source filename for identification
 * @returns {Array} Array of resource objects with _sourceFile property
 */
function extractResources(jsonData, sourceFile) {
  let resources = [];

  if (!jsonData) {
    console.warn(`JSON data for '${sourceFile}.json' is empty or null.`);
    return [];
  }

  // Try nested structures under 'guide' key first
  if (jsonData.guide) {
    const guide = jsonData.guide;
    if (Array.isArray(guide.resources)) resources = guide.resources;
    else if (Array.isArray(guide.tools)) resources = guide.tools;
    else if (Array.isArray(guide.tutorials)) resources = guide.tutorials;
    else if (Array.isArray(guide.concepts)) resources = guide.concepts;
  }
  
  // Fallback to top-level arrays
  if (resources.length === 0) {
    if (Array.isArray(jsonData.tools)) resources = jsonData.tools;
    else if (Array.isArray(jsonData.tutorials)) resources = jsonData.tutorials;
    else if (Array.isArray(jsonData.resources)) resources = jsonData.resources;
    else if (Array.isArray(jsonData.concepts)) resources = jsonData.concepts;
    else if (Array.isArray(jsonData)) resources = jsonData;
  }

  if (resources.length === 0) {
    console.warn(`No recognized resource array found in '${sourceFile}.json'`);
    return [];
  }

  // Add source identifier to each resource for filtering
  return resources.map(item => ({ 
    ...item, 
    _sourceFile: sourceFile 
  }));
}

/**
 * Attaches click listeners to category buttons (excluding legal/utility buttons)
 */
function attachCategoryButtonListeners() {
  document.querySelectorAll('.category-btn').forEach(btn => {
    if (btn.classList.contains('legal')) return;
    
    // Remove existing listener to prevent duplicates
    btn.removeEventListener('click', handleCategoryButtonClick);
    btn.addEventListener('click', handleCategoryButtonClick);
  });
}

/**
 * Handles category button clicks - updates active state and re-renders list
 * @param {Event} event - Click event object
 */
function handleCategoryButtonClick(event) {
  const btn = event.currentTarget;
  const category = btn.getAttribute('data-category');
  
  if (!category) {
    console.warn('Button clicked without data-category attribute');
    return;
  }

  // Update active button styling
  document.querySelectorAll('.category-btn').forEach(b => {
    if (!b.classList.contains('legal')) {
      b.classList.remove('active');
    }
  });
  btn.classList.add('active');
  
  // Update state and re-render
  currentCategory = category;
  searchInput.value = ''; // Clear search when switching categories
  renderList(category);
  
  // Close sidebar on mobile after selection
  if (window.innerWidth <= 768) {
    sidebar?.classList.remove('active');
  }
}

// --- Main Data Loading and Rendering Logic ---

/**
 * Asynchronously loads all JSON files and initializes the app
 */
async function loadAllData() {
  try {
    const promises = jsonFiles.map(file => {
      const sourceFileName = file.split('/').pop().replace('.json', '');
      
      return fetch(file)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} for ${file}`);
          }
          return res.json();
        })
        .then(data => extractResources(data, sourceFileName))
        .catch(err => {
          console.error(`Failed to load ${file}:`, err);
          return []; // Continue loading other files even if one fails
        });
    });

    const allResourcesArrays = await Promise.all(promises);
    // Flatten and filter valid resources (must have a name)
    bcasData.resources = allResourcesArrays.flat().filter(item => item?.name);
    
    // Initialize UI after data loads
    attachCategoryButtonListeners();
    renderList(currentCategory);

  } catch (err) {
    console.error('Failed to load JSON data:', err);
    if (content) {
      content.innerHTML = `<p style="color:red; text-align:center; padding:20px;">
        Error loading content. Please check your connection or try again later.
      </p>`;
    }
  }
}

/**
 * Renders filtered resource list to the content area
 * @param {string} category - Category to filter by (when not searching)
 * @param {string} [searchTerm=''] - Optional search term for global search
 */
function renderList(category, searchTerm = '') {
  const searchLower = searchTerm.toLowerCase().trim();
  let displayedList = [];

  if (searchLower) {
    // Global search across ALL resources when searchTerm provided
    displayedList = bcasData.resources.filter(item => {
      const searchableText = [
        item.name,
        item.description,
        item.category,
        item.usage,
        item.notes,
        ...(Array.isArray(item.examples) ? item.examples : []),
        ...(Array.isArray(item.steps) ? item.steps : [])
      ]
      .filter(text => text && typeof text === 'string')
      .join(' ')
      .toLowerCase();
      
      return searchableText.includes(searchLower);
    });
  } else {
    // Category filter when no search term
    const categoryLower = category.toLowerCase();
    displayedList = bcasData.resources.filter(item => 
      item._sourceFile?.toLowerCase() === categoryLower
    );
  }

  // Sort alphabetically (case-insensitive)
  displayedList.sort((a, b) => 
    (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
  );

  // Generate HTML for each resource item
  const html = displayedList.map(item => {
    const renderListItems = (arr, label, isOrdered = false) => {
      if (!Array.isArray(arr) || arr.length === 0) return '';
      const tag = isOrdered ? 'ol' : 'ul';
      const items = arr.map(text => `<li><code>${text}</code></li>`).join('');
      return `<p><strong>${label}:</strong></p><${tag}>${items}</${tag}>`;
    };

    const renderLinks = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return '';
      const links = arr.map(link => 
        `<a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a>`
      ).join(', ');
      return `<p><strong>Links:</strong> ${links}</p>`;
    };

    const formatSource = (source) => {
      if (!source) return '';
      return source.charAt(0).toUpperCase() + source.slice(1);
    };

    return `
      <div class="item">
        <h2>${item.name || 'Untitled Entry'}</h2>
        <div class="details">
          ${item._sourceFile ? `<p><strong>Source:</strong> ${formatSource(item._sourceFile)}</p>` : ''}
          ${item.category ? `<p><strong>Subcategory:</strong> ${item.category}</p>` : ''}
          ${item.description ? `<p><strong>Description:</strong> ${item.description}</p>` : ''}
          ${item.usage ? `<p><strong>Usage:</strong> <code>${item.usage}</code></p>` : ''}
          ${Array.isArray(item.steps) ? `<p><strong>Steps:</strong></p><ol>${item.steps.map(s => `<li>${s}</li>`).join('')}</ol>` : ''}
          ${renderListItems(item.examples, 'Examples')}
          ${item.notes ? `<p><strong>Notes:</strong> ${item.notes}</p>` : ''}
          ${renderLinks(item.links)}
          ${item.link ? `<p><strong>Link:</strong> <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.link}</a></p>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Update content area with results or empty state
  if (content) {
    content.innerHTML = html || 
      `<p class="no-entries">No entries found${searchLower ? ` for "${searchTerm}"` : ''} in this section.</p>`;
  }

  // Attach toggle functionality to item headings (FIXED VERSION)
  // Using setTimeout to ensure DOM elements are fully rendered
  setTimeout(() => {
    document.querySelectorAll('.item h2').forEach(h2 => {
      h2.style.cursor = 'pointer';
      h2.title = 'Click to expand/collapse';
      
      h2.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const details = h2.nextElementSibling;
        if (!details || !details.classList.contains('details')) return;
        
        // Toggle visibility using CSS class (most reliable method)
        details.classList.toggle('collapsed');
        h2.classList.toggle('expanded');
      });
    });
  }, 0);
}

// --- Event Listeners and Initialization ---

// Hamburger menu toggle (mobile)
if (hamburgerBtn && sidebar) {
  hamburgerBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });
}

// Search input handler - unified logic for typing AND clearing
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const value = searchInput.value.trim();
    
    if (value) {
      // Active search: search all resources, deactivate category buttons
      document.querySelectorAll('.category-btn').forEach(b => {
        if (!b.classList.contains('legal')) {
          b.classList.remove('active');
        }
      });
      renderList(currentCategory, value);
    } else {
      // Search cleared: revert to category filtering
      renderList(currentCategory);
      // Re-activate the current category button
      const activeBtn = document.querySelector(`.category-btn[data-category="${currentCategory}"]`);
      if (activeBtn && !activeBtn.classList.contains('legal')) {
        activeBtn.classList.add('active');
      }
    }
  });
}

// Initialize after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
});