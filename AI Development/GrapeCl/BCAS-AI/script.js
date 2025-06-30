// ==================== API KEYS - EDIT THESE ====================
const API_KEYS = {
    gemini: 'AIzaSyCxicCo2gfwrKuqYEEcRJUWsii1E6IqFzg', // Your Google Gemini API key
    cohere: [
      'klohTv7PeqIRAYcfHn1hBNbJJDq3vTYVKbtRlNnR',
      'jO7uJkW4yNbN3vIHkBTgbgFAkst2bF8oUYmRcgBm',
      'klohTv7PeqIRAYcfHn1hBNbJJDq3vTYVKbtRlNnR'
    ], // Your 3 Cohere API keys
    // Hugging Face key removed as per request
};
// ================================================================

// Cohere key rotation
let currentCohereKeyIndex = 0;

// DOM Elements
const submitButton = document.getElementById('submit-button');
const promptInput = document.getElementById('prompt-input');
const toneSelect = document.getElementById('tone-select');
const messagesContainer = document.getElementById('messages');
const loadingIndicator = document.getElementById('loading-indicator');

// Auto-resize textarea
promptInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 150) + 'px'; // Max height updated
});

// Submit on Enter (but not Shift+Enter)
promptInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitButton.click();
  }
});

/**
 * Validate that at least one API key is provided
 */
function validateApiKeys() {
  const hasCohere = API_KEYS.cohere.some(
    (key) => key.trim() && key !== 'YOUR_COHERE_API_KEY_1'
  ); // Check for placeholder
  const hasGemini =
    API_KEYS.gemini.trim() && API_KEYS.gemini !== 'YOUR_GEMINI_API_KEY'; // Check for placeholder
  return hasGemini || hasCohere;
}

/**
 * Get next Cohere API key (rotating)
 */
function getNextCohereKey() {
  const availableKeys = API_KEYS.cohere.filter(
    (key) => key.trim() && key !== 'YOUR_COHERE_API_KEY_1'
  );
  if (availableKeys.length === 0) return null;

  const key = availableKeys[currentCohereKeyIndex % availableKeys.length];
  currentCohereKeyIndex++;
  return key;
}

/**
 * Add message to chat
 */
let messageCount = 0; // To help with staggered animation
function addMessage(content, isUser = false, provider = null) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
  messageDiv.style.setProperty('--delay', `${messageCount * 0.05}s`); // Stagger animation
  messageCount++;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  if (isUser) {
    contentDiv.textContent = content;
  } else {
    if (provider) {
      contentDiv.innerHTML = `<h3>${provider}</h3><div class="api-response">${content.replace(
        /\n/g,
        '<br>'
      )}</div>`;
    } else {
      contentDiv.innerHTML = content;
    }
  }

  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Call Google Gemini API directly
 */
async function callGemini(prompt, tone) {
  if (!API_KEYS.gemini || API_KEYS.gemini === 'YOUR_GEMINI_API_KEY') return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEYS.gemini}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Please respond in a ${tone} tone: ${prompt}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: { message: 'Non-JSON error response or network issue' } }));
      throw new Error(
        `Gemini API error: ${response.status} - ${errorData.error.message || 'Unknown error'}`
      );
    }

    const data = await response.json();
    if (
      !data.candidates ||
      data.candidates.length === 0 ||
      !data.candidates[0].content ||
      !data.candidates[0].content.parts ||
      data.candidates[0].content.parts.length === 0
    ) {
      throw new Error('Gemini API response did not contain expected content.');
    }
    return {
      provider: 'Google Gemini',
      response: data.candidates[0].content.parts[0].text,
    };
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

/**
 * Call Cohere API directly
 */
async function callCohere(prompt, tone) {
  const cohereKey = getNextCohereKey();
  if (!cohereKey || cohereKey === 'YOUR_COHERE_API_KEY_1') return null;

  try {
    const response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cohereKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command',
        prompt: `Please respond in a ${tone} tone: ${prompt}`,
        max_tokens: 1000,
        temperature: 0.7,
        k: 0,
        stop_sequences: [],
        return_likelihoods: 'NONE',
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: 'Non-JSON error response or network issue' }));
      throw new Error(`Cohere API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.generations || data.generations.length === 0 || !data.generations[0].text) {
      throw new Error('Cohere API response did not contain expected content.');
    }
    return {
      provider: 'Cohere Command',
      response: data.generations[0].text.trim(),
    };
  } catch (error) {
    console.error('Cohere API call failed:', error);
    throw error;
  }
}

// Event listener for the submit button click
submitButton.addEventListener('click', async () => {
  const prompt = promptInput.value.trim();
  const tone = toneSelect.value;

  // Basic validation
  if (!prompt) {
    return;
  }

  // Validate API keys
  if (!validateApiKeys()) {
    addMessage(
      'Please add at least one valid API key to the code before using the assistant. Check the API_KEYS object in index.html.',
      false
    );
    return;
  }

  // Add user message
  addMessage(prompt, true);

  // Clear input
  promptInput.value = '';
  promptInput.style.height = 'auto';

  // Show loading
  loadingIndicator.style.display = 'flex'; // Show the loader
  messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom to show loader
  submitButton.disabled = true;

  try {
    const individualResponses = [];
    const errors = [];

    // Call available APIs in parallel
    const apiPromises = [];

    const hasGemini = API_KEYS.gemini.trim() && API_KEYS.gemini !== 'YOUR_GEMINI_API_KEY';
    if (hasGemini) {
      apiPromises.push(
        callGemini(prompt, tone)
          .then((result) => result && individualResponses.push(result))
          .catch((error) => errors.push(`Google Gemini: ${error.message}`))
      );
    }

    const hasCohereKeys = API_KEYS.cohere.some(
      (key) => key.trim() && key !== 'YOUR_COHERE_API_KEY_1'
    );
    if (hasCohereKeys) {
      apiPromises.push(
        callCohere(prompt, tone)
          .then((result) => result && individualResponses.push(result))
          .catch((error) => errors.push(`Cohere: ${error.message}`))
      );
    }

    // Wait for all initial API calls to complete
    await Promise.allSettled(apiPromises); // Use Promise.allSettled to ensure all promises resolve/reject

    // Filter out successful responses
    const successfulResponses = individualResponses.filter((r) => r !== null);

    let superResponseContent = '';

    // If there are multiple successful responses, combine them with Gemini
    // Or if only Gemini succeeded, treat its response as the primary
    if (successfulResponses.length > 0 && hasGemini) {
      const combinedText = successfulResponses
        .map((res) => `${res.provider}: ${res.response}`)
        .join('\n\n');

      const superPrompt = `I received multiple responses to the prompt "${prompt}". Please synthesize and combine the following information into a comprehensive and coherent "super response", maintaining a ${tone} tone:\n\n${combinedText}`;

      try {
        const geminiSuperResponse = await callGemini(superPrompt, tone);
        if (geminiSuperResponse) {
          superResponseContent = geminiSuperResponse.response;
          addMessage(superResponseContent, false, 'BCAS-AI');
        } else {
          errors.push(
            'Gemini failed to generate a super response (possibly due to empty response or API issue).'
          );
        }
      } catch (superResponseError) {
        errors.push(`Gemini Super Response: ${superResponseError.message}`);
      }
    } else if (successfulResponses.length === 1 && !hasGemini) {
      errors.push(
        'Cannot generate a "BCAS-AI" response because Gemini API did not provide a response or is not configured.'
      );
    } else if (successfulResponses.length === 0) {
      errors.push('No APIs returned a successful response, so no "BCAS-AI" response can be formed.');
    }

    // Show any errors
    if (errors.length > 0) {
      const errorHtml = `
          <div class="api-errors">
            <h4>Some API calls failed or could not generate a Super Response:</h4>
            <ul>
              ${errors.map((error) => `<li>${error}</li>`).join('')}
            </ul>
          </div>
        `;
      addMessage(errorHtml, false);
    }
  } catch (error) {
    console.error('Unexpected error during processing:', error);
    addMessage(`An unexpected error occurred: ${error.message}`, false);
  } finally {
    loadingIndicator.style.display = 'none'; // Hide the loader
    submitButton.disabled = false;
  }
});
