// ==================== API KEYS - EDIT THESE ====================
const API_KEYS = {
    openrouter: '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', // Your OpenRouter API ke
};

// Available free models on OpenRouter
const MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'mistralai/mistral-small-3.2-24b-instruct:free',
    'deepseek/deepseek-r1-0528:free',
    'qwen/qwen3-14b:free',
    'meta-llama/llama-4-maverick:free',
    'deepseek/deepseek-r1:free',
];
// ================================================================

// DOM Elements
const submitButton = document.getElementById('submit-button');
const promptInput = document.getElementById('prompt-input');
const toneSelect = document.getElementById('tone-select');
const messagesContainer = document.getElementById('messages');
const loadingIndicator = document.getElementById('loading-indicator');

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

/**
 * Validate that OpenRouter API key is provided
 */
function validateApiKeys() {
  return API_KEYS.openrouter.trim() && !API_KEYS.openrouter.includes('YOUR_');
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
    // For assistant messages, always use the defined persona.
    // The provider argument is ignored for the final display name.
    let htmlContent = `<h3>${persona}</h3>`;
    
    // Convert newlines to <br> for proper HTML rendering
    content = content.replace(/\n/g, '<br>');
    htmlContent += `<div class="api-response">${content}</div>`;
    contentDiv.innerHTML = htmlContent;
  }

  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Call OpenRouter API with specific model
 */
async function callOpenRouterModel(prompt, tone, model) {
  if (!validateApiKeys()) return null;

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
      // Throw an error but avoid mentioning the model name in the message itself
      throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
      throw new Error(`API response did not contain expected content.`);
    }

    return {
      response: data.choices[0].message.content.trim(),
      model: model // Keep model for internal logic like synthesis selection
    };
  } catch (error) {
    // Log detailed error for debugging but throw a generic one to hide model details
    console.error(`Model ${model} failed:`, error);
    throw new Error('A data stream failed.');
  }
}

/**
 * Select a primary model for synthesis (internal logic, not shown to user)
 */
function selectPrimaryModel(successfulResponses) {
  const priorityModels = [
    'google/gemini-2.0-flash-exp:free',
    'deepseek/deepseek-r1:free',
    'deepseek/deepseek-r1-0528:free'
  ];
  
  for (const priorityModel of priorityModels) {
    const found = successfulResponses.find(r => r.model === priorityModel);
    if (found) return found;
  }
  
  return successfulResponses[0]; // Fallback to first successful response
}

// Event listener for the submit button click
submitButton.addEventListener('click', async () => {
  const prompt = promptInput.value.trim();
  const tone = toneSelect.value;

  if (!prompt) return;

  if (!validateApiKeys()) {
    addMessage(
      'An API key is required for me to function. Please configure the key in the `script.js` file.',
      false
    );
    return;
  }

  addMessage(prompt, true);
  promptInput.value = '';
  promptInput.style.height = 'auto';
  submitButton.style.height = '70px';

  loadingIndicator.style.display = 'flex';
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  submitButton.disabled = true;

  let errorCount = 0;
  try {
    const individualResponses = [];
    const apiPromises = MODELS.slice(0, 5).map(model =>
      callOpenRouterModel(prompt, tone, model)
        .then(result => result && individualResponses.push(result))
        .catch(() => {
            errorCount++; // Increment generic error counter
        })
    );

    await Promise.allSettled(apiPromises);

    const successfulResponses = individualResponses.filter(r => r !== null);

    let finalResponse = null;

    if (successfulResponses.length > 1) {
      const primaryModel = selectPrimaryModel(successfulResponses);
      const combinedText = successfulResponses
        .map((res, index) => `Response from stream ${index + 1}:\n${res.response}`)
        .join('\n\n---\n\n');

      const superPrompt = `I have received multiple data streams for the prompt: "${prompt}". Your task is to synthesize these into a single, comprehensive, and coherent response. Maintain a ${tone} tone. Focus on integrating the best insights, resolving any contradictions, and presenting the information clearly. Do not simply list the responses. Create a new, unified answer based on the following content:\n\n${combinedText}`;

      try {
        // Attempt to get a synthesized response
        const synthesisData = await callOpenRouterModel(superPrompt, tone, primaryModel.model);
        if (synthesisData) {
            finalResponse = synthesisData.response;
        } else {
            // Fallback to the best single response if synthesis returns nothing
            finalResponse = primaryModel.response;
        }
      } catch (e) {
        // Fallback to the best single response if synthesis itself errors out
        finalResponse = primaryModel.response;
        errorCount++;
      }
    } else if (successfulResponses.length === 1) {
      // Use the single successful response
      finalResponse = successfulResponses[0].response;
    }

    // Display the final message from "bcas-ai"
    if(finalResponse) {
        addMessage(finalResponse, false);
    } else {
        addMessage('I am sorry, but I was unable to generate a response. Please try again.', false);
    }
    
    // Optionally, notify the user about processing issues without revealing details
    if (errorCount > 0) {
      console.log(`${errorCount} data stream(s) failed during processing.`);
    }

  } catch (error) {
    console.error('Unexpected error during processing:', error);
    addMessage(`An unexpected system error occurred. Please try again.`, false);
  } finally {
    loadingIndicator.style.display = 'none';
    submitButton.disabled = false;
  }
});
