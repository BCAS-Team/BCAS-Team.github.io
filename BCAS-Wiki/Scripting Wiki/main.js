// ===================
// BCAS Content Loader
// ===================

// Get references to key DOM elements
const content = document.getElementById('content');
const searchInput = document.getElementById('search');
const hamburgerBtn = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');

// Store all loaded resources in a single array
let bcasData = {
  resources: []
};
// Default category (source file) to show when the page loads or search is cleared.
// This is now set to 'python' to match the first active button in the HTML.
let currentCategory = 'python';

// List of JSON files to fetch. Ensure these paths are correct relative to your HTML file.
const jsonFiles = [
  'python.json',
  'bash.json',
  'MSdos.json',
  'VBS.json',
  'batch.json',
  'PowerShell.json'
];

// --- Utility Functions ---

/**
 * Safely extracts resources from a fetched JSON object.
 * It tries multiple common JSON structures to be more robust.
 * Assumes the JSON might follow:
 * 1. {"guide": {"resources": [...]}}
 * 2. {"guide": {"tools": [...]}}
 * 3. {"guide": {"tutorials": [...]}
 * 4. {"guide": {"concepts": [...]}
 * 5. Directly an array [...] (e.g., {"name": "item", ...} in an array)
 * 6. Or other direct top-level arrays like {"tools": [...]} at the root.
 * Adds a '_sourceFile' property to each resource for identification.
 * @param {Object|Array} jsonData - The parsed JSON object or array.
 * @param {string} sourceFile - The name of the JSON file it came from (e.g., 'batch', 'python').
 * @returns {Array} An array of resource objects.
 */
function extractResources(jsonData, sourceFile) {
  let resources = [];

  if (jsonData) {
    // Priority 1: Check for the 'guide' object with specific sub-keys
    if (jsonData.guide) {
      if (Array.isArray(jsonData.guide.resources)) {
        resources = jsonData.guide.resources;
      } else if (Array.isArray(jsonData.guide.tools)) {
        resources = jsonData.guide.tools;
      } else if (Array.isArray(jsonData.guide.tutorials)) {
        resources = jsonData.guide.tutorials;
      } else if (Array.isArray(jsonData.guide.concepts)) {
        resources = jsonData.guide.concepts;
      }
    }
    // Priority 2: Check for top-level arrays directly (less common for your files, but good fallback)
    else if (Array.isArray(jsonData.tools)) {
      resources = jsonData.tools;
    } else if (Array.isArray(jsonData.tutorials)) {
      resources = jsonData.tutorials;
    } else if (Array.isArray(jsonData.resources)) {
      resources = jsonData.resources;
    } else if (Array.isArray(jsonData.concepts)) {
      resources = jsonData.concepts;
    }
    // Priority 3: If the JSON root itself is an array of items
    else if (Array.isArray(jsonData)) {
      resources = jsonData;
    } else {
      // Log a warning if the file doesn't conform to any of the expected structures
      console.warn(`JSON file '${sourceFile}.json' does not have a recognized structure.`, jsonData);
    }
  } else {
    console.warn(`JSON data for '${sourceFile}.json' is empty or null.`, jsonData);
  }

  // Map over the found resources to add the source file information
  // The _sourceFile will be used for filtering by button clicks.
  return resources.map(item => ({ ...item, _sourceFile: sourceFile }));
}

/**
 * Attaches click event listeners to all category buttons defined in the HTML.
 * This is called once after the HTML is loaded.
 */
function attachCategoryButtonListeners() {
  document.querySelectorAll('.category-btn').forEach(btn => {
    // Ensure the legal button doesn't get a category listener if it's just a link
    if (!btn.classList.contains('legal')) {
      // Remove existing listeners first to prevent duplicates (important if this function was called multiple times)
      btn.removeEventListener('click', handleCategoryButtonClick);
      // Add the new listener
      btn.addEventListener('click', handleCategoryButtonClick);
    }
  });
}

/**
 * Handles the click event for category filter buttons.
 * Updates the active category and re-renders the list.
 * @param {Event} event - The click event object.
 */
function handleCategoryButtonClick(event) {
  // Debug log: Confirm the data-category attribute of the clicked button
  console.log(`Category button clicked. data-category: ${event.currentTarget.getAttribute('data-category')}`);

  // Remove 'active' class from all category buttons
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
  // Add 'active' class to the clicked button
  event.currentTarget.classList.add('active');
  // Update the currentCategory based on the clicked button's data-category attribute.
  // This data-category now directly maps to the _sourceFile.
  currentCategory = event.currentTarget.getAttribute('data-category');

  // Debug log: Confirm the currentCategory after setting it
  console.log(`Category button clicked. currentCategory: ${currentCategory}`);

  searchInput.value = ''; // Clear any active search filter when a category is selected
  renderList(currentCategory); // Re-render the list based on the new category
  // On mobile, close the sidebar after a category is selected
  if (window.innerWidth <= 768) { // Adjust breakpoint as needed for your CSS
    sidebar.classList.remove('active');
  }
}

// --- Main Data Loading and Rendering Logic ---

/**
 * Asynchronously loads data from all specified JSON files,
 * processes it, and renders the initial list.
 */
async function loadAllData() {
  try {
    // Create an array of Promises, each fetching and processing a JSON file
    const promises = jsonFiles.map(file => {
      const sourceFileName = file.replace('.json', ''); // Get the base name for logging and _sourceFile
      console.log(`Processing file: ${sourceFileName}.json`); // Debug log

      return fetch(file)
        .then(res => {
          // Check if the network response was successful
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status} for ${file}`);
          }
          return res.json(); // Parse the JSON response
        })
        // Extract resources and add source info (e.g., 'batch', 'python')
        .then(data => {
          const extracted = extractResources(data, sourceFileName);
          console.log(`Extracted resources for ${sourceFileName}:`, extracted); // Debug log
          return extracted;
        });
    });

    // Wait for all fetch promises to resolve
    const allResourcesArrays = await Promise.all(promises);

    // Flatten the array of arrays (each file's resources) into a single master array
    bcasData.resources = allResourcesArrays.flat();
    console.log("Loaded bcasData.resources (all combined):", bcasData.resources); // Final debug log

    // Attach event listeners to the static category buttons in the HTML
    attachCategoryButtonListeners();

    // Perform the initial rendering of the list (defaults to 'python' scripts)
    renderList(currentCategory);

  } catch (err) {
    // Display an error message if data loading fails
    content.innerHTML = `<p style="color:red; text-align: center; padding: 20px;">
                         Error loading data: ${err.message}. Please check your browser's console for more details.
                         </p>`;
    console.error("Failed to load JSON data:", err);
  }
}

/**
 * Renders the list of resources in the main content area.
 * Filters based on the selected source file category and/or a search term.
 * @param {string} category - The active category for filtering (e.g., 'python', 'batch').
 * @param {string} [filter=''] - Optional search term to filter results.
 */
function renderList(category, filter = '') {
  const filterLower = filter.toLowerCase();
  let displayedList = [];

  if (filter) {
    // If a search filter is provided, search across ALL loaded resources.
    // The category selection is ignored during an active search.
    displayedList = bcasData.resources.filter(item => {
      // Create a single string containing all searchable text from the item
      const searchableText = [
        item.name,
        item.description,
        item.category, // Include the internal category in search
        item.usage,
        item.notes,
        ...(item.examples || []), // Spread elements from 'examples' array if it exists
        ...(item.steps || [])     // Spread elements from 'steps' array if it exists
      ].filter(Boolean) // Remove any null, undefined, or empty string values
       .join(' ')      // Join all parts into one string
       .toLowerCase(); // Convert to lowercase for case-insensitive searching

      return searchableText.includes(filterLower); // Check if the filter term is present
    });
  } else {
    // If no search filter is active, filter by the selected source file category.
    // 'category' here refers to the data-category attribute from the HTML button,
    // which corresponds to the _sourceFile property of the resource items.
    displayedList = bcasData.resources.filter(item =>
      item._sourceFile && item._sourceFile.toLowerCase() === category.toLowerCase()
    );
    // Debug log: Show what was filtered after a category selection (non-search)
    console.log(`renderList (non-search) called. Category: ${category}`);
    console.log(`Displayed list after category filter:`, displayedList);
  }

  // Sort the final list alphabetically by the 'name' property for consistent display
  displayedList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Generate the HTML string for the displayed list
  const html = displayedList.map(item => {
    // Helper function to render list items (e.g., examples, steps) if they exist
    const renderArrayAsList = (arr, title) => arr && arr.length > 0 ?
      `<p><strong>${title}:</strong></p><ul>${arr.map(text => `<li><code>${text}</code></li>`).join('')}</ul>` : '';

    // Helper function to render links if they exist
    const renderLinks = (arr) => arr && arr.length > 0 ?
      `<p><strong>Links:</strong> ${arr.map(link => `<a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a>`).join(', ')}</p>` : '';

    return `
      <div class="item">
        <h2>${item.name || 'Untitled Entry'}</h2>
        <div class="details">
          ${item._sourceFile ? `<p><strong>Source:</strong> ${item._sourceFile.charAt(0).toUpperCase() + item._sourceFile.slice(1)}</p>` : ''}
          ${item.category ? `<p><strong>Subcategory:</strong> ${item.category}</p>` : ''}
          ${item.description ? `<p><strong>Description:</strong> ${item.description}</p>` : ''}
          ${item.usage ? `<p><strong>Usage:</strong> <code>${item.usage}</code></p>` : ''}
          ${item.steps ? `<p><strong>Steps:</strong></p><ol>${item.steps.map(step => `<li>${step}</li>`).join('')}</ol>` : ''}
          ${renderArrayAsList(item.examples, 'Examples')}
          ${item.notes ? `<p><strong>Notes:</strong> ${item.notes}</p>` : ''}
          ${renderLinks(item.links)}
          ${item.link ? `<p><strong>Link:</strong> <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.link}</a></p>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Update the content area with the generated HTML or a "No entries found" message
  content.innerHTML = html || `<p class="no-entries">No entries found${filter ? ` for "${filter}"` : ''} in this section.</p>`;

  // Attach click listeners to the heading of each item to toggle its details visibility
  document.querySelectorAll('.item h2').forEach(h2 => {
    h2.addEventListener('click', () => {
      const details = h2.nextElementSibling; // The 'details' div is the next sibling
      details.style.display = details.style.display === 'block' ? 'none' : 'block'; // Toggle display
    });
  });
}

// --- Event Listeners and Initial Call ---

// Event listener for the hamburger menu button (for mobile responsiveness)
hamburgerBtn.addEventListener('click', () => {
  sidebar.classList.toggle('active'); // Toggle 'active' class to show/hide sidebar
});

// Event listener for the search input field
searchInput.addEventListener('input', () => {
  // When typing in the search box, perform a search across ALL data.
  // The selected category button's active state will be removed.
  renderList('all', searchInput.value); // Use 'all' as category for global search

  // Remove the 'active' state from all category buttons when a search is active.
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
});

// Event listener for when the search input is cleared (e.g., by clicking the 'x' button in some browsers)
searchInput.addEventListener('search', () => {
  if (searchInput.value === '') {
    // If the search input is cleared, revert to rendering based on the currentCategory.
    renderList(currentCategory);
    // Re-activate the button corresponding to the currentCategory.
    const activeBtn = document.querySelector(`.category-btn[data-category="${currentCategory}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }
});

// Call the function to load all data when the script first runs
loadAllData();
