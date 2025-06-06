// Import Tauri invoke if available
let invoke;
try {
  const tauri = window.__TAURI__;
  if (tauri) {
    invoke = tauri.tauri.invoke;
  }
} catch (e) {
  console.log("Not running in Tauri environment");
}

// Global variables
let client;
let isInitialized = false;

// Initialize the application
function initializeApp() {
  // Use the existing global client from globals.js if it exists
  // Otherwise create a new client
  if (window.client) {
    client = window.client;
  } else {
    // Create client instance with default values
    client = new Client('ws', window.location.hostname);
    
    // Make client accessible globally for existing code
    window.client = client;
    
    // Try to recover session
    client.recoverSession();
  }
  
  // Set initialization flag
  isInitialized = true;
}

// Wait for DOM content to be loaded
window.addEventListener("DOMContentLoaded", () => {
  // Initialize the application
  initializeApp();
  
  // Set up any form elements
  const greetForm = document.querySelector("#greet-form");
  if (greetForm) {
    const greetInputEl = document.querySelector("#greet-input");
    const greetMsgEl = document.querySelector("#greet-msg");
    
    greetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (invoke) {
        greetMsgEl.textContent = await invoke("greet", { name: greetInputEl.value });
      }
    });
  }
});
