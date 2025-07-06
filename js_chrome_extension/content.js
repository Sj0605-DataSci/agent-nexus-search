// Content script for showing the installation notification
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showInstallNotification") {
    showInstallationPopup();
    sendResponse({ status: "notification shown" });
  }
});

function showInstallationPopup() {
  // Check if notification already exists
  if (document.getElementById("discover-minds-notification")) {
    return;
  }

  // Create the notification popup
  const notification = document.createElement("div");
  notification.id = "discover-minds-notification";
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      background: #2d2d2d;
      color: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      animation: slideIn 0.3s ease-out;
    ">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="
          width: 32px;
          height: 32px;
          background: #22c55e;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          🍀
        </div>
        <div style="flex: 1;">
          <h3 style="
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 600;
            color: white;
          ">
            Discover Minds has been added to Chrome
          </h3>
          <p style="
            margin: 0;
            color: #a1a1a1;
            font-size: 14px;
          ">
            Manage your extensions by clicking Extensions in the Window menu.
          </p>
        </div>
        <button id="discover-minds-close" style="
          background: none;
          border: none;
          color: #a1a1a1;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          flex-shrink: 0;
        " onmouseover="this.style.background='#404040'" onmouseout="this.style.background='none'">
          ×
        </button>
      </div>
    </div>
  `;

  // Add CSS animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Add to page
  document.body.appendChild(notification);

  // Add close functionality
  const closeBtn = document.getElementById("discover-minds-close");
  closeBtn.addEventListener("click", () => {
    const notificationEl = document.getElementById("discover-minds-notification");
    if (notificationEl) {
      notificationEl.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => {
        notificationEl.remove();
      }, 300);
    }
  });

  // Auto-close after 5 seconds
  setTimeout(() => {
    const notificationEl = document.getElementById("discover-minds-notification");
    if (notificationEl) {
      notificationEl.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => {
        notificationEl.remove();
      }, 300);
    }
  }, 5000);

  // Notify background script
  chrome.runtime.sendMessage({ action: "extensionInstalled" });
}
