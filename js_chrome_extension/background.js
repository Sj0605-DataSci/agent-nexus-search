// Background script for Happenstance extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Show the installation notification
    showInstallNotification();
  }
});

function showInstallNotification() {
  // Create a notification or inject content into the current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "showInstallNotification",
      });
    }
  });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extensionInstalled") {
    console.log("Happenstance extension installed successfully");
    sendResponse({ status: "acknowledged" });
  }
});

// Set up initial storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    installDate: new Date().toISOString(),
    isFirstTime: true,
  });
});
