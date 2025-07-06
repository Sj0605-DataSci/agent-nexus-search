
document.addEventListener("DOMContentLoaded", () => {
  const testBtn = document.getElementById("testNotification");
  const optionsBtn = document.getElementById("openOptions");
  const statusText = document.getElementById("statusText");

  // Update status
  chrome.storage.local.get(["installDate", "isFirstTime"], (result) => {
    if (result.installDate) {
      const installDate = new Date(result.installDate);
      statusText.textContent = `Installed on ${installDate.toLocaleDateString()}`;
    }
  });

  // Test notification button
  testBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "showInstallNotification",
        });
        window.close();
      }
    });
  });

  // Options button (placeholder)
  optionsBtn.addEventListener("click", () => {
    // You can add options page functionality here
    alert("Options coming soon!");
  });
});
