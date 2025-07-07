// ==================== API KEYS - EDIT THESE ====================
const API_KEYS = {
    openrouter: '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', // Your OpenRouter API key
    gemini: 'AIzaSyCo-ljVWS2jCZ2fz5iNrBfPP8CbaNa-cjQ', // Add your Gemini API key here
    cohere: [
        'jO7uJkW4yNbN3vIHkBTgbgFAkst2bF8oUYmRcgBm', // Add your Cohere API key 1
        'jO7uJkW4yNbN3vIHkBTgbgFAkst2bF8oUYmRcgBm', // Add your Cohere API key 2 (optional)
        'klohTv7PeqIRAYcfHn1hBNbJJDq3vTYVKbtRlNnR'  // Add your Cohere API key 3 (optional)
    ]
};

// Available free models on OpenRouter for Advanced Mode
const ADVANCED_MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'mistralai/mistral-small-3.2-24b-instruct:free',
    'deepseek/deepseek-r1-0528:free',
    'qwen/qwen3-14b:free',
    'meta-llama/llama-4-maverick:free',
    'deepseek/deepseek-r1:free',
];

const COHERE_MODEL = 'command-r-plus'; // Example Cohere model
// ================================================================

// DOM Elements
const submitButton = document.getElementById('submit-button');
const promptInput = document.getElementById('prompt-input');
const toneSelect = document.getElementById('tone-select');
const modeSelect = document.getElementById('mode-select'); // Changed from modeSwitch
const cohereKeySelector = document.getElementById('cohere-key-selector');
const cohereKeySelect = document.getElementById('cohere-key-select');
const messagesContainer = document.getElementById('messages');
const loadingIndicator = document.getElementById('loading-indicator');
const loadingText = document.getElementById('loading-text');


// Auto-resize textarea
promptInput.addEventListener('input', function () {
  this.style.height = 'auto';
  const newHeight = Math.min(this.scrollHeight, 180);
  this.style.height = newHeight + 'px';
  submitButton.style.height = Math.max(70, newHeight) + 'px';
});

// Submit on Enter (but not Shift+Enter)
promptInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitButton.click();
  }
});

// Toggle Cohere Key Selector visibility based on Mode selection
modeSelect.addEventListener('change', function() {
    if (this.value === 'cohere') {
        cohereKeySelector.style.display = 'flex';
    } else {
        cohereKeySelector.style.display = 'none';
    }
});

/**
 * Validate that at least one API key for the selected mode is provided
 */
function validateApiKeys(mode, cohereKeyIndex = 0) {
    switch (mode) {
        case 'advanced':
            return API_KEYS.openrouter.trim() && !API_KEYS.openrouter.includes('YOUR_');
        case 'gemini':
            return API_KEYS.gemini.trim() && !API_KEYS.gemini.includes('YOUR_');
        case 'cohere':
            return API_KEYS.cohere[cohereKeyIndex] && API_KEYS.cohere[cohereKeyIndex].trim() && !API_KEYS.cohere[cohereKeyIndex].includes('YOUR_');
        default:
            return false;
    }
}

/**
 * Helper function to escape HTML entities for display within <pre><code>
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Add message to chat, enforcing the 'bcas-ai' persona for the assistant
 */
let messageCount = 0;
function addMessage(content, isUser = false, provider = null) {
  const messageDiv = document.createElement('div');
  const persona = 'bcas-ai'; // Enforce persona

  messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
  messageDiv.style.setProperty('--delay', `${messageCount * 0.05}s`);
  messageCount++;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  if (isUser) {
    contentDiv.textContent = content;
  } else {
    let htmlContent = `<h3>${persona}</h3><div class="api-response">`;

    // Regex to find markdown code blocks (e.g., ```language\ncode\n```)
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)\n```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before the code block, converting newlines to <br>
      const textBefore = content.substring(lastIndex, match.index);
      htmlContent += textBefore.replace(/\n/g, '<br>');

      // Add the code block, escaping HTML entities within the code
      const code = escapeHtml(match[1]);
      htmlContent += `<pre><code>${code}</code></pre>`;

      lastIndex = codeBlockRegex.lastIndex;
    }

    // Add any remaining text after the last code block, converting newlines to <br>
    const remainingText = content.substring(lastIndex);
    htmlContent += remainingText.replace(/\n/g, '<br>');

    htmlContent += `</div>`; // Close api-response div
    contentDiv.innerHTML = htmlContent;

    // Add Copy Code button if there's content to copy
    const apiResponseDiv = contentDiv.querySelector('.api-response');
    if (apiResponseDiv && content.trim() !== '') { // Ensure apiResponseDiv exists and there's content
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-button';
        copyButton.textContent = 'Copy Code';
        apiResponseDiv.appendChild(copyButton);

        copyButton.addEventListener('click', () => {
            const codeBlocks = apiResponseDiv.querySelectorAll('pre code');
            let textToCopy = '';

            if (codeBlocks.length > 0) {
                // If there are code blocks, copy only their content
                codeBlocks.forEach((codeBlock, index) => {
                    textToCopy += codeBlock.textContent; // textContent automatically unescapes HTML entities
                    if (index < codeBlocks.length - 1) {
                        textToCopy += '\n\n'; // Add separator between multiple code blocks
                    }
                });
            } else {
                // If no code blocks, copy the entire text content of the response div.
                // Temporarily hide the button to prevent its text from being copied.
                copyButton.style.display = 'none';
                textToCopy = apiResponseDiv.textContent.trim();
                copyButton.style.display = ''; // Show it back
            }

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                // Fallback for older browsers or security restrictions
                alert('Failed to copy text. Please copy manually: \n' + textToCopy);
            });
        });
    }
  }

  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Call OpenRouter API with specific model
 */
async function callOpenRouterModel(prompt, tone, model) {
  if (!validateApiKeys('advanced')) {
    throw new Error('OpenRouter API key is not configured.');
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.openrouter}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'bcas-ai' // Updated title for API referral
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: `Please respond in a ${tone} tone: ${prompt}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: 'Non-JSON error response or network issue' }
      }));
      throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
      throw new Error(`API response did not contain expected content.`);
    }

    return {
      response: data.choices[0].message.content.trim(),
      model: model
    };
  } catch (error) {
    console.error(`Model ${model} failed:`, error);
    throw new Error('A data stream failed.');
  }
}

/**
 * Call Gemini API directly
 */
async function callGeminiAPI(prompt, tone) {
  if (!validateApiKeys('gemini')) {
    throw new Error('Gemini API key is not configured.');
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEYS.gemini}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `Please respond in a ${tone} tone: ${prompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Non-JSON error response or network issue' } }));
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content?.parts[0]?.text) {
      throw new Error(`Gemini API response did not contain expected content.`);
    }

    return {
      response: data.candidates[0].content.parts[0].text.trim(),
      model: 'google/gemini-pro'
    };
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw new Error('Failed to get response from Gemini API.');
  }
}

/**
 * Call Cohere API directly
 */
async function callCohereAPI(prompt, tone, cohereKey) {
  if (!cohereKey) {
    throw new Error('Cohere API key is not selected or configured.');
  }

  try {
    const response = await fetch('https://api.cohere.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cohereKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: COHERE_MODEL,
        message: prompt,
        temperature: 0.7,
        // Cohere doesn't have a direct "tone" parameter like others,
        // so we'll incorporate it into the prompt or use a system prompt if available.
        // For simplicity, we'll include it in the message.
        chat_history: [
            { "role": "USER", "message": `Please respond in a ${tone} tone.` }
        ],
        // Set a preamble to reinforce tone if model supports it
        preamble: `You are a helpful AI assistant. Always respond in a ${tone} tone.`
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Non-JSON error response or network issue' }));
        throw new Error(`Cohere API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.text) {
      throw new Error('Cohere API response did not contain expected content (text).');
    }

    return {
      response: data.text.trim(),
      model: COHERE_MODEL
    };
  } catch (error) {
    console.error('Cohere API call failed:', error);
    throw new Error('Failed to get response from Cohere API.');
  }
}


// Event Listener for the main submit button
submitButton.addEventListener('click', async () => {
  const prompt = promptInput.value.trim();
  const tone = toneSelect.value;
  const selectedMode = modeSelect.value;
  const selectedCohereKeyIndex = cohereKeySelect.value;

  if (!prompt) {
    alert('Please enter a prompt!');
    return;
  }

  // Clear input and disable button
  promptInput.value = '';
  promptInput.style.height = 'auto'; // Reset height
  submitButton.style.height = '70px'; // Reset button height
  submitButton.disabled = true;
  loadingIndicator.style.display = 'flex'; // Show loading indicator

  addMessage(prompt, true); // Add user's message to chat

  try {
    let finalResponse = '';
    let modelUsed = '';

    if (selectedMode === 'advanced') {
      loadingText.textContent = 'Processing with OpenRouter (Advanced Mode)...';
      // Try models in order, or implement more sophisticated fallback/selection
      for (const model of ADVANCED_MODELS) {
        try {
          const result = await callOpenRouterModel(prompt, tone, model);
          if (result) {
            finalResponse = result.response;
            modelUsed = result.model;
            break; // Break if a model succeeds
          }
        } catch (error) {
          console.warn(`Attempt with model ${model} failed:`, error.message);
          // Continue to next model if current one fails
        }
      }
      if (!finalResponse) {
        finalResponse = 'I am sorry, but all advanced models failed to generate a response. Please check your OpenRouter API key or try again later.';
      }
    } else if (selectedMode === 'gemini') {
      loadingText.textContent = 'Processing with Google Gemini...';
      try {
        const result = await callGeminiAPI(prompt, tone);
        if (result) {
          finalResponse = result.response;
        }
      } catch (error) {
        console.error('Gemini API call failed:', error);
        finalResponse = `I am sorry, but I encountered an error communicating with Gemini. ${error.message}`;
      }
    } else if (selectedMode === 'cohere') {
        loadingText.textContent = 'Processing with Cohere...';
        try {
            const cohereKey = API_KEYS.cohere[selectedCohereKeyIndex];
            const result = await callCohereAPI(prompt, tone, cohereKey);
            if (result) {
                finalResponse = result.response;
            }
        } catch (error) {
            console.error('Cohere API call failed:', error);
            finalResponse = `I am sorry, but I encountered an error communicating with Cohere. ${error.message}`;
        }
    }

    if(finalResponse) {
        addMessage(finalResponse, false);
    } else {
        addMessage('I am sorry, but I was unable to generate a response. Please try again or check your API keys.', false);
    }

  } catch (error) {
    console.error('Unexpected error during processing:', error);
    addMessage(`An unexpected system error occurred: ${error.message}. Please try again.`, false);
  } finally {
    loadingIndicator.style.display = 'none'; // Hide loading indicator
    submitButton.disabled = false;
  }
});