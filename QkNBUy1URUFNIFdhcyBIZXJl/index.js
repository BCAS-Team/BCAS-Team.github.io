// Get references to HTML elements for the main site
const Button = document.getElementById('refine-search-button');
const queryInput = document.getElementById('search-query');
const output = document.getElementById('refined-query-output');
const popup = document.getElementById('popup');
const closePopupBtn = document.getElementById('close-popup');
const cursor = document.querySelector('.cursor');
const popupResultsContainer = document.getElementById('popup-results-container');
const searchLoadingIndicator = document.getElementById('search-loading-indicator');

// Define paths to all JSON files
// IMPORTANT: These paths are relative to your main page (main.html)
// and assume the directory structure as provided in your `dir` commands.
// The 'linkPath' is now the relative path to the root HTML file of each wiki.
const JSON_FILES = [
  { path: '../BCAS-Wiki/Hackers Wiki/concepts.json/concepts.json', wikiName: 'Hackers Wiki (Concepts)', linkPath: '../BCAS-Wiki/Hackers Wiki/index.html' },
  { path: '../BCAS-Wiki/Hackers Wiki/resources.json', wikiName: 'Hackers Wiki (Resources)', linkPath: '../BCAS-Wiki/Hackers Wiki/index.html' },
  { path: '../BCAS-Wiki/Hackers Wiki/tools.json', wikiName: 'Hackers Wiki (Tools)', linkPath: '../BCAS-Wiki/Hackers Wiki/index.html' },
  { path: '../BCAS-Wiki/Hackers Wiki/tutorials.json', wikiName: 'Hackers Wiki (Tutorials)', linkPath: '../BCAS-Wiki/Hackers Wiki/index.html' },
  { path: '../BCAS-Wiki/Scripting Wiki/bash.json', wikiName: 'Scripting Wiki (Bash)', linkPath: '../BCAS-Wiki/Scripting Wiki/index.html' },
  { path: '../BCAS-Wiki/Scripting Wiki/batch.json', wikiName: 'Scripting Wiki (Batch)', linkPath: '../BCAS-Wiki/Scripting Wiki/index.html' },
  { path: '../BCAS-Wiki/Scripting Wiki/MSdos.json', wikiName: 'Scripting Wiki (MS-DOS)', linkPath: '../BCAS-Wiki/Scripting Wiki/index.html' },
  { path: '../BCAS-Wiki/Scripting Wiki/PowerShell.json', wikiName: 'Scripting Wiki (PowerShell)', linkPath: '../BCAS-Wiki/Scripting Wiki/index.html' },
  { path: '../BCAS-Wiki/Scripting Wiki/python.json', wikiName: 'Scripting Wiki (Python)', linkPath: '../BCAS-Wiki/Scripting Wiki/index.html' },
  { path: '../BCAS-Wiki/Scripting Wiki/VBS.json', wikiName: 'Scripting Wiki (VBS)', linkPath: '../BCAS-Wiki/Scripting Wiki/index.html' },
];

let allWikiData = []; // Cache for loaded JSON data

// --- Error Handling Utilities ---
/**
 * Redirects the user to the generic error page.
 * Uses replace() to prevent the user from easily navigating back to the broken state.
 * @param {string} errorReason - A message describing the reason for the error.
 */
function redirectToErrorPage(errorReason = 'An unexpected error occurred.') {
  console.error("Redirecting to error page due to:", errorReason);
  // Ensure we are not already on the error page to prevent infinite redirects
  if (!window.location.pathname.includes('/error/index.html')) {
    window.location.replace("error/index.html");
  }
}

// --- Global Uncaught JavaScript Error Handler ---
// This catches any uncaught runtime errors across the page.
window.onerror = function(message, source, lineno, colno, error) {
  // If we are already on the error page, don't try to redirect again.
  if (window.location.pathname.includes('/error/index.html')) {
    console.warn("Error occurred on error page itself, suppressing further redirect.");
    return true; // Suppress default browser error handling
  }
  redirectToErrorPage(`JavaScript Error: ${message} at ${source}:${lineno}`);
  return true; // Suppress default browser error handling (prevents browser's default error message)
};


// --- Search Functionality ---
/**
 * Recursively extracts all string values from an object or array.
 * Useful for creating a searchable text block from diverse JSON structures.
 * @param {any} data - The JSON data to process.
 * @returns {string} A concatenated string of all string values.
 */
function extractSearchableText(data) {
  if (typeof data === 'string') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => extractSearchableText(item)).join(' ');
  }
  if (typeof data === 'object' && data !== null) {
    return Object.values(data).map(item => extractSearchableText(item)).join(' ');
  }
  return '';
}

/**
 * Fetches and processes all local JSON wiki files, then performs a search.
 * Caches the data after the first fetch.
 * @param {string} query - The search query.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of search results.
 */
async function fetchAndSearchLocalWikis(query) {
  // If data is not cached, fetch all JSON files
  if (allWikiData.length === 0) {
    searchLoadingIndicator.classList.add('active'); // Show loading indicator
    try {
      const fetchPromises = JSON_FILES.map(async (fileInfo) => {
        const response = await fetch(fileInfo.path);
        // If fetch response is not ok (e.g., 404, 500), redirect to error page
        if (!response.ok) {
          redirectToErrorPage(`Failed to load wiki data: ${fileInfo.path} - Status: ${response.status}`);
          return null; // Ensure null is returned to prevent further processing for this file
        }
        const data = await response.json();
        return {
          wikiName: fileInfo.wikiName,
          linkPath: fileInfo.linkPath, // Pass the link path to the result object
          data: data // The parsed JSON content
        };
      });

      // Wait for all fetches to complete
      const fetchedResults = await Promise.all(fetchPromises);
      // Filter out any null results from failed fetches (those that redirected to error page)
      allWikiData = fetchedResults.filter(result => result !== null);

    } catch (error) {
      // Catch any network errors or other errors during fetch process
      redirectToErrorPage(`Network or parsing error during wiki data fetch: ${error.message}`);
      return []; // Return empty array on error
    } finally {
      searchLoadingIndicator.classList.remove('active'); // Hide loading indicator
    }
  }

  // Perform search on cached data
  const lowerCaseQuery = query.toLowerCase();
  const results = [];

  allWikiData.forEach(wiki => {
    // Assuming each wiki's data is an array of items, or a single object.
    const itemsToSearch = Array.isArray(wiki.data) ? wiki.data : [wiki.data];

    itemsToSearch.forEach(item => {
      // Extract all searchable text from the current item
      const itemText = extractSearchableText(item).toLowerCase();

      if (itemText.includes(lowerCaseQuery)) {
        // Construct a title for the search result.
        // Try to find common title fields like 'name', 'title', 'command'.
        // If not found, use a title based on the query and wiki name, or a generic snippet.
        let itemTitle = item.name || item.title || item.command;
        if (!itemTitle) {
            // If no specific title field, try to derive one from snippet or query
            if (itemText.length > 0) {
                // Take a small portion of the snippet or the query itself
                itemTitle = `Search for "${query}" (in ${wiki.wikiName})`;
                if (itemText.length > 20) { // If snippet is long enough, use part of it
                    const queryIndex = itemText.indexOf(lowerCaseQuery);
                    if (queryIndex !== -1) {
                        const start = Math.max(0, queryIndex - 10); // Get a bit before the query
                        const end = Math.min(itemText.length, queryIndex + query.length + 40); // Get query + some after
                        itemTitle = itemText.substring(start, end).replace(/\n/g, ' ').trim();
                        // Add ellipsis only if content was actually truncated
                        if (end < itemText.length || start > 0) {
                            itemTitle = (start > 0 ? '...' : '') + itemTitle + (end < itemText.length ? '...' : '');
                        }
                    } else {
                        itemTitle = itemText.substring(0, 50).replace(/\n/g, ' ').trim() + '...';
                    }
                }
            } else {
                itemTitle = `Entry in ${wiki.wikiName}`; // Fallback for completely empty entries
            }
        }
        // Truncate description for snippet, or use first N characters of the itemText
        const snippet = item.description || item.definition || item.usage || itemText.substring(0, 150) + (itemText.length > 150 ? '...' : '');

        // Use the 'linkPath' directly for the link
        const link = wiki.linkPath; 

        results.push({
          wikiName: wiki.wikiName,
          title: itemTitle,
          snippet: snippet,
          link: link
        });
      }
    });
  });

  return results;
}

/**
 * Displays search results in the popup.
 * @param {Array<Object>} results - An array of search result objects.
 */
function displaySearchResults(results) {
  popupResultsContainer.innerHTML = ''; // Clear previous results

  if (results.length === 0) {
    popupResultsContainer.innerHTML = '<p class="no-results">No results found in our wikis.</p>';
  } else {
    results.forEach(result => {
      const resultItem = document.createElement('div');
      resultItem.classList.add('search-result-item');
      resultItem.innerHTML = `
        <h4>${result.title} (${result.wikiName})</h4>
        <p>${result.snippet}</p>
        <a href="${result.link}" target="_blank" rel="noopener noreferrer">Go to Wiki Page</a>
      `;
      popupResultsContainer.appendChild(resultItem);
    });
  }
  popup.classList.add('active'); // Show the popup
}

// Event listener for the "Search Now" button
Button.addEventListener('click', async () => {
  const query = queryInput.value.trim(); // Get and trim the search query

  if (!query) {
    // Display an error message if the query is empty
    output.textContent = "Please enter a search term.";
    return;
  }

  output.textContent = `Searching our wikis for: "${query}"...`;
  popupResultsContainer.innerHTML = ''; // Clear previous results
  searchLoadingIndicator.classList.add('active'); // Show loading indicator
  popup.classList.add('active'); // Show popup immediately with loading indicator

  try {
    const results = await fetchAndSearchLocalWikis(query);
    displaySearchResults(results);
  } catch (error) {
    console.error("Search failed:", error);
    popupResultsContainer.innerHTML = '<p class="no-results">An error occurred during search. Please try again.</p>';
  } finally {
    searchLoadingIndicator.classList.remove('active'); // Hide loading indicator
  }
});


// Close popup
closePopupBtn.addEventListener('click', () => {
  popup.classList.remove('active'); // Hide the popup
  popupResultsContainer.innerHTML = ''; // Clear the results when closing
});

// Close popup on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && popup.classList.contains('active')) {
    popup.classList.remove('active'); // Hide the popup
    popupResultsContainer.innerHTML = ''; // Clear the results when closing
  }
});

// Custom cursor movement
document.addEventListener('mousemove', e => {
  cursor.style.top = `${e.clientY}px`;
  cursor.style.left = `${e.clientX}px`;
});
