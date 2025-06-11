// Get references to Age Gate elements on this dedicated page
const ageGateContainer = document.getElementById('age-gate-container');
const confirmAgeBtn = document.getElementById('confirm-age-btn');
const declineAgeBtn = document.getElementById('decline-age-btn');
const captchaDisplay = document.getElementById('captcha-display');
const captchaInput = document.getElementById('captcha-input');
const refreshCaptchaBtn = document.getElementById('refresh-captcha-btn');
const captchaMessage = document.getElementById('captcha-message');

let currentCaptchaText = ''; // Stores the current CAPTCHA text

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


// --- Cookie Functions ---
/**
 * Sets a cookie with the given name, value, and expiration days.
 * @param {string} name - The name of the cookie.
 * @param {string} value - The value to store in the cookie.
 * @param {number} days - The number of days until the cookie expires.
 */
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "expires=" + d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

// --- CAPTCHA Logic ---
/**
 * Generates a random CAPTCHA string.
 * @param {number} length - The desired length of the CAPTCHA string.
 * @returns {string} The generated CAPTCHA string.
 */
function generateCaptcha(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Displays a new CAPTCHA challenge.
 */
function displayCaptcha() {
  currentCaptchaText = generateCaptcha();
  captchaDisplay.textContent = currentCaptchaText;
  captchaInput.value = ''; // Clear input field
  captchaMessage.textContent = ''; // Clear any previous messages
}

/**
 * Checks if the entered CAPTCHA matches the displayed one.
 * @returns {boolean} True if CAPTCHA matches, false otherwise.
 */
function validateCaptcha() {
  if (captchaInput.value === currentCaptchaText) {
    captchaMessage.textContent = '';
    return true;
  } else {
    captchaMessage.textContent = 'Incorrect CAPTCHA. Please try again.';
    displayCaptcha(); // Generate new CAPTCHA on failure
    return false;
  }
}

// --- Event Listeners ---
// Event listener for the "YES, I AM 18+" button
confirmAgeBtn.addEventListener('click', () => {
  if (validateCaptcha()) {
    // If CAPTCHA is valid, set the age verification cookie
    setCookie('ageVerified', 'true', 30); // Remember for 30 days
    // Redirect to the main page (main.html)
    window.location.href = "main.html"; 
  }
});

// Event listener for the "NO, REDIRECT ME" button
declineAgeBtn.addEventListener('click', () => {
  // Redirect to the explanation page if age is declined
  window.location.href = "18plus_explanation.html"; 
});

// Event listener to refresh CAPTCHA
refreshCaptchaBtn.addEventListener('click', displayCaptcha);

// --- Initial Setup ---
// Display CAPTCHA when the page loads
document.addEventListener('DOMContentLoaded', displayCaptcha);
