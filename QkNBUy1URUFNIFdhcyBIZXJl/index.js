// Get references to HTML elements for the main site
const Button = document.getElementById('refine-search-button');
const queryInput = document.getElementById('search-query');
const output = document.getElementById('refined-query-output');
const popup = document.getElementById('popup');
const closePopupBtn = document.getElementById('close-popup');
const cursor = document.querySelector('.cursor');
const popupResultsContainer = document.getElementById('popup-results-container');
const searchLoadingIndicator = document.getElementById('search-loading-indicator');

// Check if required elements exist
const requiredElements = {
  Button,
  queryInput,
  output,
  popup,
  closePopupBtn,
  popupResultsContainer
};

const missingElements = Object.entries(requiredElements)
  .filter(([name, element]) => !element)
  .map(([name]) => name);

if (missingElements.length > 0) {
  console.warn(`Missing required DOM elements: ${missingElements.join(', ')}`);
}

// Define paths to all JSON files
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
let isLoading = false; // Prevent multiple simultaneous loads

// --- Error Handling Utilities ---
/**
 * Logs error without redirecting, allows graceful degradation
 * @param {string} errorMessage - A message describing the error
 */
function logError(errorMessage) {
  console.error("Wiki Search Error:", errorMessage);
  
  // Optionally show user-friendly error in output if element exists
  if (output) {
    output.textContent = "Search encountered an issue. Some results may be unavailable.";
  }
}

// --- Improved Global Error Handler ---
window.onerror = function(message, source, lineno, colno, error) {
  // Only redirect for critical errors, not for search functionality issues
  const isCriticalError = message.includes('Script error') || 
                         message.includes('ReferenceError') ||
                         message.includes('TypeError: Cannot read');
  
  if (!isCriticalError) {
    logError(`JavaScript Error: ${message} at ${source}:${lineno}`);
    return true; // Suppress default browser error handling
  }
  
  // For critical errors, only redirect if not already on error page
  if (!window.location.pathname.includes('/error/index.html')) {
    console.error("Critical error, redirecting:", message);
    window.location.replace("error/index.html");
  }
  return true;
};

// --- Search Functionality ---
/**
 * Recursively extracts all string values from an object or array.
 * @param {any} data - The JSON data to process.
 * @returns {string} A concatenated string of all string values.
 */
function extractSearchableText(data) {
  try {
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
  } catch (error) {
    logError(`Error extracting searchable text: ${error.message}`);
    return '';
  }
}

/**
 * Fetches a single JSON file with error handling
 * @param {Object} fileInfo - File information object
 * @returns {Promise<Object|null>} Wiki data or null if failed
 */
async function fetchSingleWiki(fileInfo) {
  try {
    const response = await fetch(fileInfo.path);
    
    if (!response.ok) {
      console.warn(`Failed to load ${fileInfo.wikiName}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    return {
      wikiName: fileInfo.wikiName,
      linkPath: fileInfo.linkPath,
      data: data
    };
  } catch (error) {
    console.warn(`Error fetching ${fileInfo.wikiName}:`, error.message);
    return null;
  }
}

/**
 * Fetches and processes all local JSON wiki files, then performs a search.
 * @param {string} query - The search query.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of search results.
 */
async function fetchAndSearchLocalWikis(query) {
  // Prevent multiple simultaneous loads
  if (isLoading) {
    console.log("Search already in progress, please wait...");
    return [];
  }

  // If data is not cached, fetch all JSON files
  if (allWikiData.length === 0) {
    isLoading = true;
    
    if (searchLoadingIndicator) {
      searchLoadingIndicator.classList.add('active');
    }
    
    try {
      // Fetch all files with individual error handling
      const fetchPromises = JSON_FILES.map(fileInfo => fetchSingleWiki(fileInfo));
      const fetchedResults = await Promise.all(fetchPromises);
      
      // Filter out failed fetches and log success rate
      allWikiData = fetchedResults.filter(result => result !== null);
      
      const successCount = allWikiData.length;
      const totalCount = JSON_FILES.length;
      
      if (successCount === 0) {
        logError("No wiki files could be loaded");
        return [];
      } else if (successCount < totalCount) {
        console.warn(`Loaded ${successCount}/${totalCount} wiki files successfully`);
      } else {
        console.log(`Successfully loaded all ${successCount} wiki files`);
      }
      
    } catch (error) {
      logError(`Unexpected error during wiki data fetch: ${error.message}`);
      return [];
    } finally {
      isLoading = false;
      if (searchLoadingIndicator) {
        searchLoadingIndicator.classList.remove('active');
      }
    }
  }

  // Perform search on cached data
  if (allWikiData.length === 0) {
    return [];
  }

  const lowerCaseQuery = query.toLowerCase();
  const results = [];

  try {
    allWikiData.forEach(wiki => {
      if (!wiki || !wiki.data) return;
      
      const itemsToSearch = Array.isArray(wiki.data) ? wiki.data : [wiki.data];

      itemsToSearch.forEach(item => {
        if (!item) return;
        
        try {
          const itemText = extractSearchableText(item).toLowerCase();
          const originalText = extractSearchableText(item); // Keep original case for display

          if (itemText.includes(lowerCaseQuery)) {
            let itemTitle = item.name || item.title || item.command;
            let snippet = '';
            
            // Create a smart snippet that shows context around the search term
            const createContextSnippet = (text, searchTerm, maxLength = 120) => {
              const lowerText = text.toLowerCase();
              const searchIndex = lowerText.indexOf(searchTerm.toLowerCase());
              
              if (searchIndex === -1) {
                // Fallback if search term not found in this specific text
                return text.substring(0, maxLength).replace(/\s+/g, ' ').trim() + 
                       (text.length > maxLength ? '...' : '');
              }
              
              // Calculate optimal start position (try to center the search term)
              const contextBefore = 30;
              const contextAfter = maxLength - searchTerm.length - contextBefore;
              const start = Math.max(0, searchIndex - contextBefore);
              const end = Math.min(text.length, searchIndex + searchTerm.length + contextAfter);
              
              let snippet = text.substring(start, end).replace(/\s+/g, ' ').trim();
              
              // Add ellipsis if we truncated
              if (start > 0) snippet = '...' + snippet;
              if (end < text.length) snippet = snippet + '...';
              
              return snippet;
            };
            
            // Get the best snippet from available fields
            const snippetSources = [
              item.description,
              item.definition, 
              item.usage,
              item.summary,
              item.explanation,
              originalText
            ].filter(Boolean);
            
            // Find the snippet source that contains our search term
            let bestSnippet = '';
            for (const source of snippetSources) {
              if (source.toLowerCase().includes(lowerCaseQuery)) {
                bestSnippet = createContextSnippet(source, query);
                break;
              }
            }
            
            // If no source contained the search term, use the first available
            if (!bestSnippet && snippetSources.length > 0) {
              bestSnippet = createContextSnippet(snippetSources[0], query);
            }
            
            snippet = bestSnippet || 'No description available';
            
            // If no title found, try to extract one intelligently
            if (!itemTitle) {
              // Try to find a meaningful title from the beginning of the content
              const firstSentence = originalText.split(/[.!?]/)[0];
              if (firstSentence && firstSentence.length > 5 && firstSentence.length < 60) {
                itemTitle = firstSentence.trim();
              } else {
                // Create a contextual title around the search term
                itemTitle = createContextSnippet(originalText, query, 50);
              }
              
              // Fallback if still no good title
              if (!itemTitle || itemTitle.length < 3) {
                itemTitle = `${query} match`;
              }
            }
            
            // Clean up title (remove excessive whitespace, newlines)
            itemTitle = itemTitle.replace(/\s+/g, ' ').trim();
            
            // Ensure title isn't too long
            if (itemTitle.length > 80) {
              itemTitle = itemTitle.substring(0, 77).trim() + '...';
            }

            results.push({
              wikiName: wiki.wikiName,
              title: itemTitle,
              snippet: snippet,
              link: wiki.linkPath
            });
          }
        } catch (itemError) {
          console.warn(`Error processing search item in ${wiki.wikiName}:`, itemError.message);
        }
      });
    });
  } catch (searchError) {
    logError(`Error during search execution: ${searchError.message}`);
  }

  return results;
}

/**
 * Displays search results in the popup.
 * @param {Array<Object>} results - An array of search result objects.
 */
function displaySearchResults(results) {
  if (!popupResultsContainer) {
    console.warn("Cannot display results: popup results container not found");
    return;
  }

  popupResultsContainer.innerHTML = '';

  if (results.length === 0) {
    popupResultsContainer.innerHTML = '<p class="no-results">No results found in our wikis.</p>';
  } else {
    results.forEach(result => {
      try {
        const resultItem = document.createElement('div');
        resultItem.classList.add('search-result-item');
        
        // Escape HTML to prevent XSS
        const escapeHtml = (text) => {
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        };
        
        resultItem.innerHTML = `
          <div class="result-header">
            <h4 class="result-title">${escapeHtml(result.title)}</h4>
            <span class="result-wiki-badge">${escapeHtml(result.wikiName)}</span>
          </div>
          <p class="result-snippet">${escapeHtml(result.snippet)}</p>
          <a href="${escapeHtml(result.link)}" class="result-link" target="_blank" rel="noopener noreferrer">
            <span>Open Wiki →</span>
          </a>
        `;
        popupResultsContainer.appendChild(resultItem);
      } catch (error) {
        console.warn("Error creating result item:", error);
      }
    });
  }
  
  if (popup) {
    popup.classList.add('active');
  }
}

// Event listener for the "Search Now" button
if (Button && queryInput) {
  Button.addEventListener('click', async () => {
    const query = queryInput.value?.trim();

    if (!query) {
      if (output) {
        output.textContent = "Please enter a search term.";
      }
      return;
    }

    if (output) {
      output.textContent = `Searching our wikis for: "${query}"...`;
    }
    
    if (popupResultsContainer) {
      popupResultsContainer.innerHTML = '';
    }
    
    if (searchLoadingIndicator) {
      searchLoadingIndicator.classList.add('active');
    }
    
    if (popup) {
      popup.classList.add('active');
    }

    try {
      const results = await fetchAndSearchLocalWikis(query);
      displaySearchResults(results);
      
      if (output) {
        output.textContent = `Found ${results.length} result(s) for: "${query}"`;
      }
    } catch (error) {
      logError(`Search failed: ${error.message}`);
      
      if (popupResultsContainer) {
        popupResultsContainer.innerHTML = '<p class="no-results">An error occurred during search. Please try again.</p>';
      }
    } finally {
      if (searchLoadingIndicator) {
        searchLoadingIndicator.classList.remove('active');
      }
    }
  });
} else {
  console.warn("Search button or query input not found - search functionality disabled");
}

// Close popup event listeners
if (closePopupBtn && popup) {
  closePopupBtn.addEventListener('click', () => {
    popup.classList.remove('active');
    if (popupResultsContainer) {
      popupResultsContainer.innerHTML = '';
    }
  });
}

// Close popup on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && popup && popup.classList.contains('active')) {
    popup.classList.remove('active');
    if (popupResultsContainer) {
      popupResultsContainer.innerHTML = '';
    }
  }
});

// Custom cursor movement (only if cursor element exists)
if (cursor) {
  document.addEventListener('mousemove', e => {
    cursor.style.top = `${e.clientY}px`;
    cursor.style.left = `${e.clientX}px`;
  });
}
