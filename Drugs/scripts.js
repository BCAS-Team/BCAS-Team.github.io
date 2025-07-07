const drugsContainer = document.getElementById("drugs-container");
const searchInput = document.getElementById("search-input");
const typeFilter = document.getElementById("type-filter");
const modal = document.getElementById("modal");
const modalContent = document.querySelector(".modal-content");

let allDrugs = [];

async function loadDrugs() {
  try {
    const response = await fetch("Main.json");
    const data = await response.json();

    // Remove duplicates by drug name (case insensitive)
    const uniqueDrugsMap = new Map();
    data.drugs.forEach(drug => {
      const key = drug.name.toLowerCase();
      if (!uniqueDrugsMap.has(key)) uniqueDrugsMap.set(key, drug);
    });
    allDrugs = Array.from(uniqueDrugsMap.values());

    populateTypeFilter(allDrugs);
    renderDrugCards(allDrugs);
  } catch (error) {
    console.error("Error loading JSON:", error);
    drugsContainer.innerHTML = "<p>Error loading drug data.</p>";
  }
}

function populateTypeFilter(drugs) {
  // Get unique drug types from all drugs
  const typesSet = new Set();
  drugs.forEach(drug => {
    drug.type.forEach(t => typesSet.add(t));
  });

  // Clear existing options except default
  typeFilter.innerHTML = `<option value="">All Types</option>`;

  // Add types as options
  Array.from(typesSet).sort().forEach(type => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    typeFilter.appendChild(option);
  });
}

function renderDrugCards(drugs) {
  drugsContainer.innerHTML = "";
  if (drugs.length === 0) {
    drugsContainer.innerHTML = "<p>No drugs found.</p>";
    return;
  }

  drugs.forEach(drug => {
    const card = document.createElement("div");
    card.className = "drug-card";

    card.innerHTML = `
      <h3>${drug.name}</h3>
      <p><strong>Type:</strong> ${drug.type.join(", ")}</p>
      <p><strong>Aliases:</strong> ${drug.aliases.join(", ")}</p>
      <p>${drug.description.general}</p>
    `;

    card.addEventListener("click", () => showModal(drug));
    drugsContainer.appendChild(card);
  });
}

function showModal(drug) {
  modalContent.innerHTML = `
    <span class="close-btn" role="button" aria-label="Close modal">&times;</span>
    <h2 id="modal-title">${drug.name}</h2>
    <p><strong>Type:</strong> ${drug.type.join(", ")}</p>
    <p><strong>Aliases:</strong> ${drug.aliases.join(", ")}</p>
    <h3>Description</h3>
    <p>${drug.description.general}</p>
    <p><em>Medical uses:</em> ${drug.description.medical_uses}</p>
    <h4>Effects</h4>
    <p><strong>Short-term:</strong> ${drug.description.effects.short_term}</p>
    <p><strong>Long-term:</strong> ${drug.description.effects.long_term}</p>
    <p><strong>Risks:</strong> ${drug.description.risks}</p>
    <h4>Dosage</h4>
    <p><strong>Typical Recreational:</strong> ${drug.dosage.typical_recreational}</p>
    <p><strong>Medical:</strong> ${drug.dosage.medical}</p>
    <h4>Interactions</h4>
    <ul>
      ${
        drug.interactions.length
          ? drug.interactions.map(i => `<li>${i}</li>`).join("")
          : "<li>None reported</li>"
      }
    </ul>
    <h4>Legal Status</h4>
    <p>USA: ${drug.description.legal_status.USA}</p>
    <p>UK: ${drug.description.legal_status.UK}</p>
    <h4>Sources</h4>
    <ul>
      ${drug.sources
        .map(
          s =>
            `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a></li>`
        )
        .join("")}
    </ul>
  `;

  const closeBtn = modalContent.querySelector(".close-btn");
  closeBtn.addEventListener("click", closeModal);

  modal.classList.remove("hidden");
  modal.focus();
}

function closeModal() {
  modal.classList.add("hidden");
  modalContent.innerHTML = "";
}

function filterDrugs() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedType = typeFilter.value;

  const filtered = allDrugs.filter(drug => {
    // Filter by type if selected
    if (selectedType && !drug.type.includes(selectedType)) return false;

    // Filter by search query
    if (!query) return true;

    if (drug.name.toLowerCase().includes(query)) return true;
    if (drug.aliases.some(alias => alias.toLowerCase().includes(query))) return true;
    if (drug.type.some(t => t.toLowerCase().includes(query))) return true;
    if (drug.description.general.toLowerCase().includes(query)) return true;

    return false;
  });

  renderDrugCards(filtered);
}

modal.addEventListener("click", e => {
  if (e.target === modal) closeModal();
});

searchInput.addEventListener("input", filterDrugs);
typeFilter.addEventListener("change", filterDrugs);

loadDrugs();
