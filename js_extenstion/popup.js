const signInBtn = document.getElementById("signinBtn");
const signOutBtn = document.getElementById("signOutBtn");
const spinner = document.getElementById("spinner");
const loginSection = document?.getElementById("loginSection");
const profileSection = document.getElementById("profileSection");
const profileInfo = document.getElementById("profileInfo");
const logCookies = document.getElementById("logCookies");
const resultsContainer = document.getElementById("resultsContainer");
const connectionsCount = document.getElementById("connectionsCount");
const messagesCount = document.getElementById("messagesCount");
const viewsCount = document.getElementById("viewsCount");
const linkedinGetDataApiBtn = document.getElementById("linkedinGetDataApiBtn");
const linkedinGetDataApiBtnConnections = document.getElementById(
  "linkedinGetDataApiBtnConnections"
);
const settingsBtn = document.getElementById("settingsBtn");

const JSESSION_STORAGE_KEY = "JSESSIONID_TOKEN";
let _jsessionCache = null;

function buildProfileImageUrl(profilePicture) {
  const vec = profilePicture?.displayImageReference?.vectorImage;
  if (!vec || !vec.artifacts?.length) return null;

  const { rootUrl, artifacts } = vec;
  const biggest = artifacts[artifacts.length - 1];
  return rootUrl + biggest.fileIdentifyingUrlPathSegment;
}

function transformConnections(payload) {
  return (payload?.elements || [])
    .map((el) => {
      const p = el.connectedMemberResolutionResult;
      if (!p) return null;

      return {
        firstName: p.firstName || "",
        lastName: p.lastName || "",
        headline: p.headline || "",
        profileUrl: `https://www.linkedin.com/in/${p.publicIdentifier || ""}`,
        profileImg: buildProfileImageUrl(p.profilePicture),
      };
    })
    .filter(Boolean);
}

function saveJsonFile(obj, filename = "connections.json") {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  if (chrome?.downloads?.download) {
    chrome.downloads.download({ url, filename, saveAs: true }, () =>
      URL.revokeObjectURL(url)
    );
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function extractTotalResultCount(apiResponse) {
  return apiResponse?.metadata?.totalResultCount ?? null;
}

function getCookieValue(cookies, name) {
  if (!Array.isArray(cookies)) return null;

  const raw = cookies.find((c) => c?.name === name)?.value;
  if (typeof raw !== "string") return null;

  return raw.replace(/^"|"$/g, "");
}

function setJSessionId(source) {
  let cleaned;

  if (Array.isArray(source)) {
    cleaned = getCookieValue(source, "JSESSIONID");
  } else if (typeof source === "string") {
    cleaned = source.replace(/^"|"$/g, "");
  }

  if (!cleaned) return false;

  chrome.storage.local.set({ [JSESSION_STORAGE_KEY]: cleaned });

  return true;
}

function stripOuterQuotes(str) {
  return typeof str === "string" ? str.replace(/^"|"$/g, "") : str;
}

async function getJSessionId() {
  if (_jsessionCache) return stripOuterQuotes(_jsessionCache);
  console.log("stored", stored);
  // Try to get from storage first
  const stored = await chrome.storage.local.get(JSESSION_STORAGE_KEY);
  _jsessionCache = stored[JSESSION_STORAGE_KEY] ?? null;

  // If not found in storage, try to retrieve it automatically
  if (!_jsessionCache) {
    console.log(
      "No JSESSIONID found in storage, attempting to retrieve automatically..."
    );
    try {
      // Ask background script to retrieve JSESSIONID
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "linkedin-get-jsessionid" },
          resolve
        );
      });

      if (response?.ok && response.jsessionId) {
        _jsessionCache = response.jsessionId;
        console.log("Successfully retrieved JSESSIONID automatically");
      } else {
        console.log(
          "Failed to retrieve JSESSIONID automatically",
          response?.error || "Unknown error"
        );
      }
    } catch (error) {
      console.error("Error retrieving JSESSIONID:", error);
    }
  }

  return stripOuterQuotes(_jsessionCache);
}

// logCookies.addEventListener("click", () => {
//   chrome.runtime.sendMessage({ type: "linkedin-get-all-data" }, async (res) => {
//     if (res?.ok && Array.isArray(res.cookies)) {
//       setJSessionId(res.cookies);
//       console.log("Saved JSESSIONID:", await getJSessionId());
//     } else {
//       console.error(res?.error || "Failed to read cookies");
//     }
//   });
// });
// Add CSS for loading animation
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .signout-loading {
    position: relative;
    pointer-events: none;
    opacity: 0.8;
  }
  .signout-loading::after {
    content: '';
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-right: 8px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 1s linear infinite;
    vertical-align: middle;
  }
`;
document.head.appendChild(style);

// Handle sign out
signOutBtn.addEventListener("click", async () => {
  try {
    // Show loading state
    signOutBtn.disabled = true;
    signOutBtn.classList.add("signout-loading");
    signOutBtn.innerHTML = "Signing out...";

    // Add overlay to prevent interactions during sign out
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.right = "0";
    overlay.style.bottom = "0";
    overlay.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.zIndex = "1000";

    // Add loading spinner to overlay
    const spinner = document.createElement("div");
    spinner.style.border = "4px solid #f3f3f3";
    spinner.style.borderTop = "4px solid #4F46E5";
    spinner.style.borderRadius = "50%";
    spinner.style.width = "40px";
    spinner.style.height = "40px";
    spinner.style.animation = "spin 1s linear infinite";
    overlay.appendChild(spinner);

    document.body.appendChild(overlay);

    // Clear local storage and session data
    await chrome.storage.local.remove([JSESSION_STORAGE_KEY]);
    _jsessionCache = null;

    // Send message to background script to handle sign out
    chrome.runtime.sendMessage({ type: "linkedin-signout" }, (response) => {
      // Fade out the overlay
      overlay.style.transition = "opacity 0.3s ease";
      overlay.style.opacity = "0";

      // Remove overlay after animation
      setTimeout(() => {
        document.body.removeChild(overlay);

        // Update UI
        loginSection.style.display = "block";
        profileSection.style.display = "none";
        resultsContainer.style.display = "none";

        // Reset displayed data with fade-in effect
        if (profileInfo) {
          profileInfo.style.opacity = "0";
          setTimeout(() => {
            profileInfo.innerHTML = "";
            profileInfo.style.opacity = "1";
          }, 300);
        }

        if (connectionsCount) {
          connectionsCount.style.transition = "opacity 0.3s ease";
          connectionsCount.style.opacity = "0";
          setTimeout(() => {
            connectionsCount.textContent = "0";
            connectionsCount.style.opacity = "1";
          }, 300);
        }

        // Reset button states with animation
        signOutBtn.classList.remove("signout-loading");
        signOutBtn.style.transition = "all 0.3s ease";
        signOutBtn.style.opacity = "0";

        setTimeout(() => {
          signOutBtn.disabled = false;
          signOutBtn.textContent = "Sign out";
          signOutBtn.style.opacity = "1";
        }, 300);

        // Show success message with animation
        if (response && response.success) {
          console.log("Successfully signed out");
          const successMsg = document.createElement("div");
          successMsg.textContent = "Successfully signed out";
          successMsg.style.position = "fixed";
          successMsg.style.bottom = "20px";
          successMsg.style.left = "50%";
          successMsg.style.transform = "translateX(-50%)";
          successMsg.style.backgroundColor = "#10B981";
          successMsg.style.color = "white";
          successMsg.style.padding = "8px 16px";
          successMsg.style.borderRadius = "4px";
          successMsg.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
          successMsg.style.zIndex = "1001";
          successMsg.style.opacity = "0";
          successMsg.style.transition = "opacity 0.3s ease";

          document.body.appendChild(successMsg);

          // Trigger reflow
          void successMsg.offsetWidth;

          // Fade in
          successMsg.style.opacity = "1";

          // Remove after delay
          setTimeout(() => {
            successMsg.style.opacity = "0";
            setTimeout(() => {
              document.body.removeChild(successMsg);
            }, 300);
          }, 2000);
        } else {
          console.error(
            "Error during sign out:",
            response?.error || "Unknown error"
          );
        }
      }, 300);
    });
  } catch (error) {
    console.error("Error during sign out:", error);

    // Remove overlay if it exists
    const overlay = document.querySelector('div[style*="position: fixed"]');
    if (overlay) {
      document.body.removeChild(overlay);
    }

    // Reset button state
    if (signOutBtn) {
      signOutBtn.classList.remove("signout-loading");
      signOutBtn.disabled = false;
      signOutBtn.textContent = "Sign out";

      // Show error message
      const errorMsg = document.createElement("div");
      errorMsg.textContent = "Error signing out. Please try again.";
      errorMsg.style.position = "fixed";
      errorMsg.style.bottom = "20px";
      errorMsg.style.left = "50%";
      errorMsg.style.transform = "translateX(-50%)";
      errorMsg.style.backgroundColor = "#EF4444";
      errorMsg.style.color = "white";
      errorMsg.style.padding = "8px 16px";
      errorMsg.style.borderRadius = "4px";
      errorMsg.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
      errorMsg.style.zIndex = "1001";

      document.body.appendChild(errorMsg);

      // Remove after delay
      setTimeout(() => {
        errorMsg.style.opacity = "0";
        errorMsg.style.transition = "opacity 0.3s ease";
        setTimeout(() => {
          document.body.removeChild(errorMsg);
        }, 300);
      }, 3000);
    }
  }
});

function showProfile(profile) {
  if (!profile || typeof profile !== "object") {
    profileInfo.textContent = "Profile unavailable";
    return;
  }

  // Handle both OpenID Connect format and LinkedIn API format
  const {
    profilePictureUrn = "",
    given_name = profile.name?.split(" ")[0] || "",
    family_name = profile.name?.split(" ").slice(1).join(" ") || "",
    email = profile.email || "",
    name = "",
    picture = "",
  } = profile;

  // Use the best available image source
  const imgSrc = picture || profilePictureUrn || "";
  const firstName = given_name || name?.split(" ")[0] || "";
  const lastName = family_name || name?.split(" ").slice(1).join(" ") || "";

  // Create the profile HTML without inline event handlers
  const profileHtml = `
    <div style="display: flex; align-items: center; gap: 12px; padding: 8px;">
      <img 
        id="profileImage"
        src="${imgSrc}" 
        alt="${firstName} ${lastName}'s profile picture" 
        width="48" 
        height="48" 
        style="border-radius: 50%; object-fit: cover;" 
        data-fallback-src="https://static.licdn.com/sc/h/1c5u578iilxfi4m4dvc4q810q"
      />
      <div>
        <div style="font-weight: 600; font-size: 15px;">${firstName} ${lastName}</div>
        <div style="font-size: 13px; color: #666;">${email}</div>
      </div>
    </div>
  `;

  // Set the HTML
  profileInfo.innerHTML = profileHtml;

  // Add error handler for the image
  const profileImage = profileInfo.querySelector("#profileImage");
  if (profileImage) {
    profileImage.onerror = function () {
      this.src = this.getAttribute("data-fallback-src");
    };
  }
}

// Update last sync time display
function updateLastSyncTime() {
  const lastSyncElement = document.getElementById("lastSync");
  if (!lastSyncElement) return;

  const now = new Date();
  const timeString = now.toLocaleTimeString();
  const dateString = now.toLocaleDateString();
  lastSyncElement.textContent = `Last synced: ${dateString} at ${timeString}`;

  // Store the last sync time
  chrome.storage.local.set({ lastSyncTime: now.toISOString() });
}

// Load and display last sync time
async function loadLastSyncTime() {
  const result = await chrome.storage.local.get(["lastSyncTime"]);
  const lastSyncElement = document.getElementById("lastSync");

  if (result.lastSyncTime) {
    const lastSync = new Date(result.lastSyncTime);
    const timeString = lastSync.toLocaleTimeString();
    const dateString = lastSync.toLocaleDateString();
    lastSyncElement.textContent = `Last synced: ${dateString} at ${timeString}`;
  } else {
    lastSyncElement.textContent = "Last synced: Never";
  }
}

// Auto-sync connections if needed
async function autoSyncIfNeeded() {
  try {
    const { lastSyncTime, LINKEDIN_CONNECTIONS } =
      await chrome.storage.local.get(["lastSyncTime", "LINKEDIN_CONNECTIONS"]);
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const shouldSync = !lastSyncTime || new Date(lastSyncTime) < oneHourAgo;
    const hasNoConnections =
      !LINKEDIN_CONNECTIONS || LINKEDIN_CONNECTIONS.length === 0;

    if (shouldSync || hasNoConnections) {
      console.log("Auto-syncing connections...");
      // Update connection count first
      const count = await updateConnectionCount();
      if (count !== null) {
        displayConnectionCount(count);
      }
      // Then fetch connections
      await fetchConnections();
    } else {
      // Still update the connection count if it's not available
      const { CONNECTION_TOTAL_COUNT } = await chrome.storage.local.get(
        "CONNECTION_TOTAL_COUNT"
      );
      if (!CONNECTION_TOTAL_COUNT) {
        updateConnectionCount().catch(console.error);
      }
    }
  } catch (error) {
    console.error("Error during auto-sync:", error);
  }
}

async function initialize() {
  const stored = await chrome.storage.local.get(["profile", "tokens"]);
  console.log("stored====", stored);

  // Check for JSESSIONID and retrieve it if needed
  const jsessionId = await getJSessionId();
  console.log("JSESSIONID status:", jsessionId ? "Found" : "Not found");

  if (stored && (stored.profile || stored.tokens?.profile)) {
    loginSection.hidden = true;
    profileSection.hidden = false;
    // Handle both direct profile storage and nested tokens.profile
    const profile = stored.profile || stored.tokens?.profile || {};
    showProfile(profile);

    // Load saved connections if they exist
    const { LINKEDIN_CONNECTIONS } = await chrome.storage.local.get(
      "LINKEDIN_CONNECTIONS"
    );
    if (LINKEDIN_CONNECTIONS) {
      displayConnections(LINKEDIN_CONNECTIONS);
    }

    // Load and display connection count
    const count = await getStoredConnectionCount();
    if (count !== null) {
      displayConnectionCount(count);
    } else if (jsessionId) {
      // If no count is cached but we have a session, try to fetch it
      updateConnectionCount().catch(console.error);
    }

    // Load last sync time
    await loadLastSyncTime();

    // Auto-sync if last sync was more than 1 hour ago
    const { lastSyncTime } = await chrome.storage.local.get("lastSyncTime");
    if (!lastSyncTime || new Date() - new Date(lastSyncTime) > 60 * 60 * 1000) {
      // Small delay to let the UI render first
      setTimeout(fetchConnections, 500);
    }

    // If we have a profile but no JSESSIONID, try to retrieve it automatically
    if (!jsessionId) {
      console.log("Profile found but no JSESSIONID, attempting to retrieve...");
      chrome.runtime.sendMessage(
        { type: "linkedin-get-jsessionid" },
        async (res) => {
          if (res?.ok && res.jsessionId) {
            console.log("Successfully retrieved JSESSIONID");
            // After getting JSESSIONID, we can try to update the connection count
            updateConnectionCount().catch(console.error);
          } else {
            console.log("Could not retrieve JSESSIONID automatically");
          }
        }
      );
    }
  } else {
    loginSection.hidden = false;
    profileSection.hidden = true;
  }
}

// Function to check if user data exists in local storage
async function checkExistingUserData() {
  try {
    const result = await chrome.storage.local.get(["profile", "access_token"]);
    return result.profile && result.access_token;
  } catch (error) {
    console.error("Error checking existing user data:", error);
    return false;
  }
}

// Function to show sign-in popup
function showSignInPopup() {
  chrome.runtime.sendMessage({ type: "linkedin-signin" }, (response) => {
    signInBtn.disabled = false;
    if (response?.error) {
      console.error("Sign in error:", response.error);
    }
  });
}

// Function to update UI with existing user data
async function updateUIWithExistingData() {
  try {
    const { profile } = await chrome.storage.local.get("profile");
    if (profile) {
      showProfile(profile);
      loginSection.style.display = "none";
      profileSection.style.display = "block";
      // Trigger connection sync if needed
      updateConnectionCount();
    }
  } catch (error) {
    console.error("Error updating UI with existing data:", error);
  }
}

signInBtn.addEventListener("click", async () => {
  if (signInBtn.disabled) return; // Prevent multiple clicks

  signInBtn.disabled = true;
  signInBtn.innerHTML = '<span class="spinner"></span> Checking...';

  try {
    const hasExistingData = await checkExistingUserData();

    if (hasExistingData) {
      // If data exists, update UI and fetch fresh data
      await updateUIWithExistingData();
      signInBtn.disabled = false;
      signInBtn.textContent = "Sign in with LinkedIn";
      spinner.hidden = true;
    } else {
      // No existing data, show sign-in popup
      spinner.hidden = false;
      chrome.runtime.sendMessage({ type: "linkedin-signin" }, (res) => {
        signInBtn.disabled = false;
        spinner.hidden = true;

        if (res?.ok && res.profile) {
          loginSection.hidden = true;
          profileSection.hidden = false;
          showProfile(res.tokens?.profile || res.profile);

          // Update connection count after successful sign-in
          updateConnectionCount();
        } else if (res?.error) {
          console.error("Sign in error:", res.error);
          // Show error message to user
          const errorMsg = document.createElement("div");
          errorMsg.textContent = "Sign in failed. Please try again.";
          errorMsg.style.color = "#EF4444";
          errorMsg.style.marginTop = "8px";
          errorMsg.style.fontSize = "12px";
          signInBtn.parentNode.insertBefore(errorMsg, signInBtn.nextSibling);

          // Remove error message after delay
          setTimeout(() => {
            if (errorMsg.parentNode) {
              errorMsg.parentNode.removeChild(errorMsg);
            }
          }, 3000);
        }
      });
    }
  } catch (error) {
    console.error("Error during sign-in check:", error);
    signInBtn.disabled = false;
    signInBtn.textContent = "Sign in with LinkedIn";
    spinner.hidden = true;

    // Show error message to user
    const errorMsg = document.createElement("div");
    errorMsg.textContent = "Error checking account. Please try again.";
    errorMsg.style.color = "#EF4444";
    errorMsg.style.marginTop = "8px";
    errorMsg.style.fontSize = "12px";
    signInBtn.parentNode.insertBefore(errorMsg, signInBtn.nextSibling);

    // Remove error message after delay
    setTimeout(() => {
      if (errorMsg.parentNode) {
        errorMsg.parentNode.removeChild(errorMsg);
      }
    }, 3000);
  }
});

function displayConnections(connections) {
  const connectionsList = document.getElementById("connectionsList");
  if (!connectionsList) return;

  if (!connections || connections.length === 0) {
    connectionsList.innerHTML =
      '<div class="no-connections">No connections found</div>';
    return;
  }

  connectionsList.innerHTML = connections
    .map(
      (conn) => `
    <a href="${conn.profileUrl}" target="_blank" class="connection-item">
      <img 
        src="${
          conn.profileImg ||
          "https://static.licdn.com/sc/h/1c5u578iilxfi4m4dvc4q810q"
        }" 
        alt="${conn.firstName} ${conn.lastName}" 
        class="connection-avatar"
        onerror="this.src='https://static.licdn.com/sc/h/1c5u578iilxfi4m4dvc4q810q'"
      >
      <div class="connection-details">
        <div class="connection-name">${conn.firstName} ${conn.lastName}</div>
        <div class="connection-headline">${conn.headline || ""}</div>
      </div>
    </a>
  `
    )
    .join("");
}

function displayConnectionCount(count) {
  const countElement = document.getElementById("connectionCount");
  if (countElement && count !== null) {
    countElement.textContent = `Total Connections: ${count}`;
  }
}

linkedinGetDataApiBtn.addEventListener(
  "click", // Main function to fetch and sync connections
  async function fetchConnections() {
    const button = document.getElementById("linkedinGetDataApiBtn");
    const connectionsList = document.getElementById("connectionsList");
    const connectionCount = document.getElementById("connectionCount");

    if (!button || !connectionsList || !connectionCount) return;

    // Disable button and show loading state
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="button-icon">⏳</span> Syncing...';

    // Show loading state in connections list
    connectionsList.innerHTML = `
    <div class="loading" style="padding: 16px; text-align: center; color: #666;">
      <div class="loader" style="margin: 0 auto 8px;"></div>
      <p>Fetching your connections...</p>
    </div>`;

    try {
      // Step 1: Get JSESSIONID
      const csrfToken = await getJSessionId();
      if (!csrfToken) throw new Error("Not authenticated with LinkedIn");

      // Step 2: Fetch connections in parallel with connection count
      const [connectionsResponse] = await Promise.all([
        // Fetch connections
        fetch(
          "https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16&count=40&q=search&sortType=RECENTLY_ADDED",
          {
            headers: {
              "csrf-token": csrfToken,
              "x-li-track":
                '{"clientVersion":"1.13.36912","mpVersion":"1.13.36912","osName":"web","timezoneOffset":5.5,"timezone":"Asia/Calcutta","deviceFormFactor":"DESKTOP","mpName":"voyager-web","displayDensity":2,"displayWidth":3024,"displayHeight":1964}',
            },
          }
        ),
        // Update connection count
        updateConnectionCount(),
      ]);

      if (!connectionsResponse.ok) {
        throw new Error(
          `Failed to fetch connections: ${connectionsResponse.status} ${connectionsResponse.statusText}`
        );
      }

      // Process connections
      const data = await connectionsResponse.json();
      const connections = transformConnections(data);

      // Get the latest connection count
      const totalConnections = await getStoredConnectionCount();

      // Save everything to storage
      await chrome.storage.local.set({
        LINKEDIN_CONNECTIONS: connections,
        lastSyncTime: new Date().toISOString(),
        ...(totalConnections && { CONNECTION_TOTAL_COUNT: totalConnections }),
      });

      // Update UI
      displayConnections(connections);
      updateLastSyncTime();

      if (totalConnections) {
        displayConnectionCount(totalConnections);
      }

      // Save to file (silently in the background)
      try {
        saveJsonFile(connections, "linkedin-connections.json");
      } catch (e) {
        console.error("Error saving to file:", e);
      }

      // Show success feedback
      button.innerHTML = '<span class="button-icon">✅</span> Synced';
      setTimeout(() => {
        button.innerHTML = originalText;
      }, 2000);
    } catch (err) {
      console.error("Error syncing connections:", err);

      // Show error in UI
      connectionsList.innerHTML = `
      <div class="error" style="padding: 16px; text-align: center; color: #d32f2f;">
        <p style="margin: 0 0 12px;">❌ ${
          err.message || "Failed to sync connections"
        }</p>
        <button onclick="fetchConnections()" class="retry-button" style="margin-top: 8px;">
          <span class="button-icon">🔄</span> Try Again
        </button>
      </div>`;

      // Update button to show error
      button.innerHTML = '<span class="button-icon">❌</span> Sync Failed';
      setTimeout(() => {
        button.innerHTML = originalText;
      }, 2000);
    } finally {
      button.disabled = false;
    }
  }
);

// This function is called during connection sync to update the connection count
async function updateConnectionCount() {
  const connectionCount = document.getElementById("connectionCount");
  if (!connectionCount) return;

  try {
    const csrfToken = await getJSessionId();
    if (!csrfToken) throw new Error("No JSESSIONID token saved yet");

    const response = await fetch(
      "https://www.linkedin.com/voyager/api/search/dash/clusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-1&count=0&origin=Communities&q=all&query=(queryParameters:(resultType:List(CONNECTIONS)),flagshipSearchIntent:MYNETWORK_CURATION_HUB)&start=0",
      {
        headers: {
          "csrf-token": csrfToken || "",
          "x-li-track":
            '{"clientVersion":"1.13.36912","mpVersion":"1.13.36912","osName":"web","timezoneOffset":5.5,"timezone":"Asia/Calcutta","deviceFormFactor":"DESKTOP","mpName":"voyager-web","displayDensity":2,"displayWidth":3024,"displayHeight":1964}',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const total = data?.metadata?.totalResultCount ?? null;

    if (total !== null) {
      // Save and display the connection count
      await chrome.storage.local.set({
        CONNECTION_TOTAL_COUNT: total,
        lastConnectionCountUpdate: new Date().toISOString(),
      });
      displayConnectionCount(total);
      return total;
    }
  } catch (error) {
    console.error("Error fetching connection count:", error);
    // Don't show error in UI, we'll just use the last known count
  }
  return null;
}

// Helper to get the connection count from storage
async function getStoredConnectionCount() {
  const result = await chrome.storage.local.get([
    "CONNECTION_TOTAL_COUNT",
    "lastConnectionCountUpdate",
  ]);
  if (result.CONNECTION_TOTAL_COUNT) {
    // If we have a stored count that's less than 24 hours old, use it
    const lastUpdate = result.lastConnectionCountUpdate
      ? new Date(result.lastConnectionCountUpdate)
      : null;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (!lastUpdate || lastUpdate > oneDayAgo) {
      return result.CONNECTION_TOTAL_COUNT;
    }
  }
  return null;
}
initialize();
