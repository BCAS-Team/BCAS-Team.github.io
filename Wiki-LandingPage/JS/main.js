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
const requiredElements = { Button, queryInput, output, popup, closePopupBtn, popupResultsContainer };
const missingElements = Object.entries(requiredElements).filter(([name, el]) => !el).map(([name]) => name);
if (missingElements.length > 0) {
  console.warn(`Missing required DOM elements: ${missingElements.join(', ')}`);
}

// CORRECTED PATHS matching your exact directory structure
const JSON_FILES = [
  // Computer Law Wiki
  { path: '../BCAS-Wiki 2.0/Computer Law Wiki/JSON/caselaw.json', wikiName: 'Computer Law Wiki (Case Law)', linkPath: '../BCAS-Wiki 2.0/Computer Law Wiki/index.html' },
  { path: '../BCAS-Wiki 2.0/Computer Law Wiki/JSON/legalconcepts.json', wikiName: 'Computer Law Wiki (Concepts)', linkPath: '../BCAS-Wiki 2.0/Computer Law Wiki/index.html' },
  { path: '../BCAS-Wiki 2.0/Computer Law Wiki/JSON/legalresources.json', wikiName: 'Computer Law Wiki (Resources)', linkPath: '../BCAS-Wiki 2.0/Computer Law Wiki/index.html' },
  { path: '../BCAS-Wiki 2.0/Computer Law Wiki/JSON/statutes.json', wikiName: 'Computer Law Wiki (Statutes)', linkPath: '../BCAS-Wiki 2.0/Computer Law Wiki/index.html' },
  
  // Hackers Wiki
  { path: '../BCAS-Wiki 2.0/Hackers Wiki/JSON/concepts.json', wikiName: 'Hackers Wiki (Concepts)', linkPath: '../BCAS-Wiki 2.0/Hackers Wiki/index.html' },
  { path: '../BCAS-Wiki 2.0/Hackers Wiki/JSON/resources.json', wikiName: 'Hackers Wiki (Resources)', linkPath: '../BCAS-Wiki 2.0/Hackers Wiki/index.html' },
  { path: '../BCAS-Wiki 2.0/Hackers Wiki/JSON/tools.json', wikiName: 'Hackers Wiki (Tools)', linkPath: '../BCAS-Wiki 2.0/Hackers Wiki/index.html' },
  { path: '../BCAS-Wiki 2.0/Hackers Wiki/JSON/tutorials.json', wikiName: 'Hackers Wiki (Tutorials)', linkPath: '../BCAS-Wiki 2.0/Hackers Wiki/index.html' },
  
  // Scripting Wiki
  { path: '../BCAS-Wiki 2.0/Scripting Wiki/JSON/bash.json', wikiName: 'Scripting Wiki (Bash)', linkPath: '../BCAS-Wiki 2.0/Scripting Wiki/index.html' },
  { path: '../BCAS-Wiki 2.0/Scripting Wiki/JSON/batch.json', wikiName: 'Scripting Wiki (Batch)', linkPath: '../BCAS-Wiki 2.0/Scripting Wiki/index.html' },
  { path: '../BCAS-Wiki 2.0/Scripting Wiki/JSON/MSdos.json', wikiName: 'Scripting Wiki (MS-DOS)', linkPath: '../BCAS-Wiki 2.0/Scripting Wiki/index.html' },
  { path: '../BCAS-Wiki 2.0/Scripting Wiki/JSON/PowerShell.json', wikiName: 'Scripting Wiki (PowerShell)', linkPath: '../BCAS-Wiki 2.0/Scripting Wiki/index.html' },
  { path: '../BCAS-Wiki 2.0/Scripting Wiki/JSON/python.json', wikiName: 'Scripting Wiki (Python)', linkPath: '../BCAS-Wiki 2.0/Scripting Wiki/index.html' },
  { path: '../BCAS-Wiki 2.0/Scripting Wiki/JSON/VBS.json', wikiName: 'Scripting Wiki (VBS)', linkPath: '../BCAS-Wiki 2.0/Scripting Wiki/index.html' },
  
  // The Hardware Wiki
  { path: '../BCAS-Wiki 2.0/The Hardware Wiki/JSON/opticalmedia.json', wikiName: 'The Hardware Wiki (Optical Media)', linkPath: '../BCAS-Wiki 2.0/The Hardware Wiki/index.html' }
];

// Targeted search fields (avoids scanning metadata/IDs)
const SEARCHABLE_FIELDS = [
  'name', 'title', 'id', 'short_name', 'full_name', 
  'description', 'usage', 'notes', 'summary', 'content', 'definition', 'examples', 'text'
];

let allWikiData = [];
let isLoading = false;

// --- Utilities ---
function logError(msg) {
  console.error("Wiki Search Error:", msg);
  if (output) output.textContent = "Search encountered an issue. Some results may be unavailable.";
}

function slugify(text) {
  return text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+|-+$/g, '');
}

function generateSectionId(item) {
  const raw = item.id || item.slug || item.name || item.title || item.short_name || item.full_name || 'section';
  return `wiki-${slugify(raw)}`;
}

function generateSnippet(text, query, maxLength = 120) {
  if (!text) return 'No description available.';
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(query.toLowerCase());
  if (index === -1) return text.substring(0, maxLength).replace(/\s+/g, ' ').trim() + (text.length > maxLength ? '...' : '');
  
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + maxLength - 30);
  let snippet = text.substring(start, end).replace(/\s+/g, ' ').trim();
  return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Fix trailing spaces in JSON keys (e.g., "name ": "value" -> "name": "value")
function normalizeData(data) {
  if (Array.isArray(data)) return data.map(normalizeData);
  if (data && typeof data === 'object') {
    const obj = {};
    for (const [k, v] of Object.entries(data)) {
      obj[k.trim()] = normalizeData(v);
    }
    return obj;
  }
  return data;
}

// Flatten deeply nested JSON into searchable cards
function flattenToSearchableCards(data, cards = []) {
  if (!data || typeof data !== 'object') return cards;
  if (Array.isArray(data)) {
    data.forEach(d => flattenToSearchableCards(d, cards));
    return cards;
  }

  const keys = Object.keys(data);
  const hasSearchableKey = keys.some(k => SEARCHABLE_FIELDS.includes(k.toLowerCase()));
  
  if (hasSearchableKey) {
    cards.push(data);
  } else {
    Object.values(data).forEach(val => flattenToSearchableCards(val, cards));
  }
  return cards;
}

// --- Core Logic ---
async function fetchSingleWiki(fileInfo) {
  try {
    const res = await fetch(fileInfo.path);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const raw = await res.json();
    return { wikiName: fileInfo.wikiName, linkPath: fileInfo.linkPath, data: normalizeData(raw) };
  } catch (err) {
    console.warn(`⚠️ Failed to load ${fileInfo.wikiName}:`, err.message);
    return null;
  }
}

async function fetchAndSearchLocalWikis(query) {
  if (isLoading) return [];
  
  if (allWikiData.length === 0) {
    isLoading = true;
    if (searchLoadingIndicator) searchLoadingIndicator.classList.add('active');
    try {
      const results = await Promise.all(JSON_FILES.map(f => fetchSingleWiki(f)));
      allWikiData = results.filter(Boolean);
      if (allWikiData.length === 0) logError("No wiki JSON files could be loaded.");
    } finally {
      isLoading = false;
      if (searchLoadingIndicator) searchLoadingIndicator.classList.remove('active');
    }
  }

  const lowerQuery = query.toLowerCase();
  const results = [];

  allWikiData.forEach(wiki => {
    const cards = flattenToSearchableCards(wiki.data);
    
    cards.forEach(item => {
      let bestMatchText = '';
      let matched = false;

      // Targeted Field Search
      for (const field of SEARCHABLE_FIELDS) {
        if (item[field] !== undefined && item[field] !== null) {
          const val = Array.isArray(item[field]) ? item[field].join(' ') : String(item[field]);
          if (val.toLowerCase().includes(lowerQuery)) {
            matched = true;
            bestMatchText = val;
            break;
          }
        }
      }

      if (matched) {
        const title = item.name || item.title || item.full_name || item.short_name || item.id || 'Untitled Section';
        results.push({
          wikiName: wiki.wikiName,
          title: title.length > 80 ? title.substring(0, 77) + '...' : title,
          snippet: generateSnippet(bestMatchText, query),
          link: wiki.linkPath,
          sectionId: generateSectionId(item)
        });
      }
    });
  });

  return results;
}

function displaySearchResults(results) {
  if (!popupResultsContainer) return;
  popupResultsContainer.innerHTML = '';

  if (results.length === 0) {
    popupResultsContainer.innerHTML = '<p class="no-results">No results found in our wikis.</p>';
  } else {
    results.forEach(res => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        <div class="result-header">
          <h4 class="result-title">${escapeHtml(res.title)}</h4>
          <span class="result-wiki-badge">${escapeHtml(res.wikiName)}</span>
        </div>
        <p class="result-snippet">${escapeHtml(res.snippet)}</p>
        <a href="${escapeHtml(res.link)}#${escapeHtml(res.sectionId)}" 
           class="result-link" target="_blank" rel="noopener noreferrer">
          Jump to Section →
        </a>
      `;
      popupResultsContainer.appendChild(item);
    });
  }
  if (popup) popup.classList.add('active');
}

// --- Event Listeners ---
if (Button && queryInput) {
  Button.addEventListener('click', async () => {
    const q = queryInput.value?.trim();
    if (!q) return (output && (output.textContent = "Please enter a search term."));
    if (output) output.textContent = `Searching wikis for: "${q}"...`;
    if (popupResultsContainer) popupResultsContainer.innerHTML = '';
    if (popup) popup.classList.add('active');
    
    try {
      const res = await fetchAndSearchLocalWikis(q);
      displaySearchResults(res);
      if (output) output.textContent = `Found ${res.length} result(s).`;
    } catch (err) {
      console.error(err);
      if (popupResultsContainer) popupResultsContainer.innerHTML = '<p class="no-results">Search error. Please try again.</p>';
    }
  });
}

if (closePopupBtn && popup) {
  closePopupBtn.addEventListener('click', () => {
    popup.classList.remove('active');
    if (popupResultsContainer) popupResultsContainer.innerHTML = '';
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && popup?.classList.contains('active')) {
    popup.classList.remove('active');
    if (popupResultsContainer) popupResultsContainer.innerHTML = '';
  }
});

if (cursor) {
  document.addEventListener('mousemove', e => {
    cursor.style.top = `${e.clientY}px`;
    cursor.style.left = `${e.clientX}px`;
  });
}