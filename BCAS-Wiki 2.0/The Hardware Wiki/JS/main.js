// =========================================
// OPTICAL MEDIA WIKI - ULTIMATE ENGINE v3.0
// =========================================
const content = document.getElementById('content');
const searchInput = document.getElementById('search');
const categoryButtons = document.querySelectorAll('.category-btn');
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');

let wikiData = {};
let searchableIndex = [];
let currentCategory = 'all';

// Friendly Category Name Mapper
const CATEGORY_LABELS = {
    'global_history': 'History',
    'shared_physical_specifications': 'Physical Specifications',
    'laser_physics': 'Laser Physics',
    'signal_encoding': 'Signal Encoding',
    'manufacturing_process': 'Manufacturing',
    'cd_formats': 'CD Formats',
    'comparative_index': 'Comparative Index',
    'reference_images_and_diagrams': 'Diagrams & Images',
    'global_history_expanded': 'History Expanded',
    'mathematical_appendices': 'Mathematics',
    'dye_chemistry_expanded': 'Dye Chemistry',
    'manufacturing_process_expanded': 'Manufacturing Expanded',
    'firmware_and_driver_compatibility': 'Firmware & Drivers',
    'legal_and_regulatory_framework': 'Legal & Regulatory',
    'market_data_and_adoption_statistics': 'Market Data',
    'troubleshooting_and_diagnostics_expanded': 'Troubleshooting',
    'glossary_of_terms': 'Glossary',
    'timeline_of_innovations': 'Timeline',
    'comparative_format_analysis': 'Format Comparisons',
    'additional_cd_format_variants': 'Additional Formats',
    'regional_variant_details': 'Regional Variants',
    'software_metadata_ecosystem': 'Software Ecosystem',
    'preservation_and_archival_protocols_detailed': 'Preservation & Archival',
    'reference_images_and_diagrams_expanded': 'Diagrams Expanded',
    'appendix_a_efm_lookup_table_sample': 'Appendix A: EFM Table',
    'appendix_b_circ_generator_polynomials': 'Appendix B: CIRC Polynomials',
    'appendix_c_atip_data_structure': 'Appendix C: ATIP Data',
    'appendix_d_multi_session_format_details': 'Appendix D: Multi-Session'
};

// Hamburger Toggle
hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));

// Category Filtering
categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        categoryButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.getAttribute('data-category');
        renderList();
        if (window.innerWidth <= 768) sidebar.classList.remove('open');
    });
});

/* ==================== FLOATING MODAL ==================== */
const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-image');
const modalClose = document.getElementById('modal-close');
modalClose.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
});

function openImage(url) {
    modalImg.src = url;
    modal.style.display = 'flex';
}

/* ==================== FETCH & INDEX ==================== */
fetch('/BCAS-Wiki 2.0/The Hardware Wiki/JSON/opticalmedia.json')
    .then(res => res.json())
    .then(data => {
        wikiData = data;
        buildSearchIndex(data);
        renderList();
    })
    .catch(err => {
        content.innerHTML = `<div class="error"><b>Error loading database:</b><br>${err.message}<br><small>Ensure opticalmedia.json is in /JSON/</small></div>`;
    });

function buildSearchIndex(data) {
    searchableIndex = [];
    for (const [sectionKey, section] of Object.entries(data)) {
        if (sectionKey === '_meta') continue;
        
        if (Array.isArray(section)) {
            section.forEach((entry, i) => {
                const id = entry.id || `entry-${i}`;
                const blob = JSON.stringify(entry).toLowerCase();
                const searchName = (entry.full_name || entry.short_name || id || '').toLowerCase();
                searchableIndex.push({ id, category: sectionKey, details: entry, searchBlob: blob + ' ' + searchName });
            });
        } else if (typeof section === 'object') {
            Object.entries(section).forEach(([id, entry]) => {
                if (id === '_description') return;
                const blob = JSON.stringify(entry).toLowerCase();
                const searchName = id.replace(/_/g, ' ').toLowerCase();
                searchableIndex.push({ id, category: sectionKey, details: entry, searchBlob: blob + ' ' + searchName });
            });
        }
    }
}

function resolveSources(sourceIds) {
    if (!Array.isArray(sourceIds) || !wikiData._meta?.sources) return '';
    return sourceIds.map(id => {
        const src = wikiData._meta.sources[id];
        if (!src) return `<span class="source-tag">${id}</span>`;
        const label = src.label.split('—')[0].trim();
        return `<a href="${src.url}" target="_blank" class="source-link">${id} — ${label}</a>`;
    }).join('');
}

/* ==================== RECURSIVE RENDERER ==================== */
function renderTechnicalDetails(data) {
    if (!data || typeof data !== 'object') return `<p>${String(data)}</p>`;
    let html = '<dl>';
    for (const [key, value] of Object.entries(data)) {
        if (key === 'sources') continue;
        const niceKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        html += `<dt>${niceKey}</dt><dd>`;

        if (typeof value === 'string') {
            if (value.startsWith('http')) {
                html += `<a href="${value}" target="_blank" class="source-link">${value}</a>`;
                if (/structure|diagram|image|figure|micrograph|reference/i.test(key)) {
                    html += `<button class="img-btn" data-url="${value}">(IMG)</button>`;
                }
            } else {
                html += value;
            }
        } 
        else if (typeof value === 'number') html += value;
        else if (Array.isArray(value)) {
            html += '<ul>';
            value.forEach(item => html += `<li class="array-item">${typeof item === 'object' ? renderTechnicalDetails(item) : String(item)}</li>`);
            html += '</ul>';
        } 
        else if (typeof value === 'object') {
            html += renderTechnicalDetails(value);
        }
        html += '</dd>';
    }
    html += '</dl>';
    return html;
}

/* ==================== RENDER LIST ==================== */
function renderList() {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = searchableIndex.filter(item => {
        const matchSearch = !query || item.searchBlob.includes(query);
        const matchCat = currentCategory === 'all' || item.category === currentCategory;
        return matchSearch && matchCat;
    });

    if (filtered.length === 0) {
        content.innerHTML = `<div class="empty-state">No matching entries found.</div>`;
        return;
    }

    let html = '';
    filtered.forEach(item => {
        const d = item.details || {};
        const title = d.full_name || d.short_name || d.name || item.id.replace(/_/g, ' ');
        const desc = d.description || (d.history_and_origins && d.history_and_origins.origin_summary) || d._description || '';
        
        let specsHTML = '';
        if (d.year_introduced) specsHTML += `<div class="spec"><span>Year</span><strong>${d.year_introduced}</strong></div>`;
        if (d.capacity_mb || (d.capacity && d.capacity.standard_mb)) specsHTML += `<div class="spec"><span>Capacity</span><strong>${d.capacity_mb || d.capacity.standard_mb} MB</strong></div>`;
        if (d.laser_wavelength_nm) specsHTML += `<div class="spec"><span>Laser</span><strong>${d.laser_wavelength_nm} nm</strong></div>`;
        if (d.colour_book) specsHTML += `<div class="spec"><span>Standard</span><strong>${d.colour_book}</strong></div>`;

        html += `
           <div class="item" data-id="${item.id}">
             <small class="category-label">${CATEGORY_LABELS[item.category] || item.category.replace(/_/g, ' ').toUpperCase()}</small>
             <h2 class="expand-trigger">${title}</h2>
            
             <div class="details">
              ${desc ? `<p class="description">${desc}</p>` : ''}
              ${specsHTML ? `<div class="specs-grid">${specsHTML}</div>` : ''}
              
              ${Array.isArray(d.sources) ? `
                 <div class="sources-section">
                   <h4>Technical References</h4>
                   <div>${resolveSources(d.sources)}</div>
                 </div>` : ''}

               <div class="tech-details">
                 <summary style="cursor:pointer;font-weight:bold;margin-bottom:0.8em;">Full Technical Details</summary>
                ${renderTechnicalDetails(d)}
               </div>
             </div>
           </div>`;
    });
    content.innerHTML = html;

    // Expand/collapse
    document.querySelectorAll('.expand-trigger').forEach(h2 => {
        h2.addEventListener('click', () => {
            const details = h2.parentElement.querySelector('.details');
            if (details) details.style.display = details.style.display === 'block' ? 'none' : 'block';
        });
    });

    // Image buttons → open floating modal
    document.querySelectorAll('.img-btn').forEach(btn => {
        btn.addEventListener('click', () => openImage(btn.getAttribute('data-url')));
    });
}

searchInput.addEventListener('input', renderList);
console.log('%cOptical Media Wiki v3.0 — Ultimate Combined Edition Loaded!', 'color:#0af;font-weight:bold;font-size:14px;');