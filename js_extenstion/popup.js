// Element references
const loginSection = document.getElementById("loginSection");
const profileContainer = document.getElementById("profileContainer");
const profileName = document.getElementById("profileName");
const profileImage = document.getElementById("profileImage");
const spinner = document.getElementById("spinner");
const signInBtn = document.getElementById("signinBtn");
const syncButton = document.getElementById("syncButton");
const signOutBtn = document.getElementById('signOutBtn');
const reconnectButton = document.createElement('button');
reconnectButton.id = 'reconnectButton';
reconnectButton.className = 'primary-button';
reconnectButton.textContent = 'Reconnect';

const disconnectedBadge = document.createElement('div');
disconnectedBadge.id = 'disconnectedBadge';
disconnectedBadge.className = 'status-badge';
disconnectedBadge.textContent = 'Disconnected';

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
  // Try to get from storage first
  const stored = await chrome.storage.local.get(JSESSION_STORAGE_KEY);
  console.log("stored", stored);
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
async function signOutBtnClick(event) {
  const button = event.currentTarget;
  if (!button) return;
  
  button.disabled = true;
  
  try {
    const { voyagerProfile } = await chrome.storage.local.get('voyagerProfile');
    showDisconnectedState(voyagerProfile);
  } catch (err) {
    console.error('Sign out failed:', err);
    button.disabled = false;
  }
}

async function initialize() {
  // Show loading state
  const profileContainer = document.getElementById("profileContainer");
  const profileName = document.getElementById("profileName");
  const profileImage = document.getElementById("profileImage");

  if (profileContainer && profileName && profileImage) {
    profileName.textContent = "Loading profile...";
    profileImage.src = "";
    profileContainer.classList.remove("hidden");
    document.getElementById("loginSection").hidden = true;
  }

  const stored = await chrome.storage.local.get([
    "profile",
    "tokens",
    "JSESSIONID_TOKEN",
    "voyagerProfile",
  ]);

  // If voyagerProfile exists, show it immediately
  if (stored.voyagerProfile) {
    const loginSection = document.getElementById("loginSection");
    const profileContainer = document.getElementById("profileContainer");

    if (loginSection && profileContainer) {
      showProfile(stored.voyagerProfile);
      loginSection.hidden = true;
      profileContainer.classList.remove("hidden");
      return;
    }
  }

  // If JSESSIONID exists (even if just "ajax:"), try to fetch profile
  if (stored.JSESSIONID_TOKEN && stored.JSESSIONID_TOKEN.includes("ajax:")) {
    try {
      const voyagerProfile = await chrome.runtime.sendMessage({
        type: "linkedin-get-voyager-profile",
      });
      if (voyagerProfile?.ok && voyagerProfile.profile) {
        showProfile(voyagerProfile.profile);
        loginSection.hidden = true;
        profileSection.hidden = false;
        return;
      }
    } catch (error) {
      console.error("Voyager profile fetch failed:", error);
    }
  }

  // Fallback to standard profile if available
  if (stored.profile) {
    showProfile(stored.profile);
    loginSection.hidden = true;
    profileSection.hidden = false;
  } else {
    loginSection.hidden = false;
    profileSection.hidden = true;
  }

  // Bind sync button
  const syncButton = document.getElementById("linkedinGetDataApiBtn");
  console.log("syncButton 123", syncButton);
  if (syncButton) {
    syncButton.addEventListener("click", linkedinGetDataApiBtnClick);
  }
}

// Update last sync time display
function updateSyncTimes(lastSync) {
  if (!lastSync) return;
  
  const lastSyncTime = document.getElementById('lastSyncTime');
  const nextSyncTime = document.getElementById('nextSyncTime');
  
  if (lastSyncTime && nextSyncTime) {
    const options = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    const lastSyncDate = new Date(lastSync);
    const nextSyncDate = new Date(lastSyncDate.getTime() + 60 * 60 * 1000);
    
    lastSyncTime.textContent = `Last sync: ${lastSyncDate.toLocaleString(undefined, options)}`;
    nextSyncTime.textContent = `Next sync: ${nextSyncDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })}`;
  }
}

// Load and display last sync time
async function loadLastSyncTime() {
  const { lastSyncTime } = await chrome.storage.local.get(["lastSyncTime"]);
  updateSyncTimes(lastSyncTime);
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

function signinBtnClick() {
  if (signInBtn.disabled) return;

  signInBtn.disabled = true;
  signInBtn.innerHTML = '<span class="spinner"></span> Checking...';

  try {
    spinner.hidden = false;
    chrome.runtime.sendMessage({ type: "linkedin-signin" }, (res) => {
      signInBtn.disabled = false;
      spinner.hidden = true;

      if (res?.ok && res.profile) {
        loginSection.hidden = true;
        profileSection.hidden = false;
        showProfile(res.profile);
        updateConnectionCount();
      } else {
        const errorMsg = document.createElement("div");
        errorMsg.textContent =
          res?.error || "Sign in failed. Please try again.";
        errorMsg.style.color = "#EF4444";
        errorMsg.style.marginTop = "8px";
        errorMsg.style.fontSize = "12px";

        // Clear any existing error messages
        const existingError = signInBtn.nextElementSibling;
        if (existingError && existingError.style.color === "#EF4444") {
          signInBtn.parentNode.removeChild(existingError);
        }

        signInBtn.parentNode.insertBefore(errorMsg, signInBtn.nextSibling);

        setTimeout(() => {
          if (errorMsg.parentNode) {
            errorMsg.parentNode.removeChild(errorMsg);
          }
        }, 5000);
      }
    });
  } catch (error) {
    console.error("Error during sign-in:", error);
    signInBtn.disabled = false;
    spinner.hidden = true;
  }
}

function displayConnectionCount(count) {
  const countElement = document.getElementById("connectionCount");
  if (countElement && count !== null) {
    countElement.textContent = `Total Connections: ${count}`;
  }
}

function updateConnectionCount(count) {
  const countElement = document.getElementById("connectionCount");
  if (countElement) {
    countElement.textContent = `Total Connections: ${count}`;
  }
}

// Main function to fetch and sync connections
async function fetchConnections() {
  const button = document.getElementById("syncButton");
  const statusBadge = document.getElementById("statusBadge");
  if (!button || !statusBadge) return;

  // Disable button and show loading state
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Syncing...";
  statusBadge.textContent = "Syncing";
  statusBadge.classList.remove("active");
  statusBadge.classList.add("syncing");

  try {
    // Step 1: Get JSESSIONID
    const csrfToken = await getJSessionId();
    if (!csrfToken) throw new Error("Not authenticated with LinkedIn");

    // Get profile URL from stored data
    const stored = await chrome.storage.local.get(["voyagerProfile"]);
    const profileUrl = stored.voyagerProfile?.included?.[0]?.publicIdentifier
      ? `https://www.linkedin.com/in/${stored.voyagerProfile.included[0].publicIdentifier}/`
      : "https://www.linkedin.com/";

    const url =
      "https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16&count=40&q=search&sortType=RECENTLY_ADDED";

    // Step 2: Fetch connections
    const connectionsResponse = await fetch(url, {
      headers: {
        accept: "application/vnd.linkedin.normalized+json+2.1",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "csrf-token": csrfToken,
        priority: "u=1, i",
        referer: profileUrl,
        "sec-ch-prefers-color-scheme": "dark",
        "sec-ch-ua":
          '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "macOS",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        "x-li-deco-include-micro-schema": "true",
        "x-li-lang": "en_US",
        "x-li-page-instance":
          "urn:li:page:d_flagship3_people_connections;Y0koRBnZRyGWq8ekGOZJ+g==",
        "x-li-track":
          '{"clientVersion":"1.13.38585","mpVersion":"1.13.38585","osName":"web","timezoneOffset":5.5,"timezone":"Asia/Calcutta","deviceFormFactor":"DESKTOP","mpName":"voyager-web","displayDensity":2,"displayWidth":3420,"displayHeight":2224}',
        "x-restli-protocol-version": "2.0.0",
      },
      credentials: "include",
    });

    if (!connectionsResponse.ok) {
      throw new Error(
        `Failed to fetch connections: ${connectionsResponse.status} ${connectionsResponse.statusText}`
      );
    }

    // Update UI for processing state
    button.textContent = "Processing...";
    statusBadge.textContent = "Processing";
    statusBadge.classList.remove("syncing");
    statusBadge.classList.add("processing");

    // Process connections
    const data = await connectionsResponse.json();
    const connections = transformConnections(data);
    const totalConnections =
      extractTotalResultCount(data) ?? (await getStoredConnectionCount());

    // Save everything to storage
    await chrome.storage.local.set({
      LINKEDIN_CONNECTIONS: connections,
      lastSyncTime: new Date().toISOString(),
      ...(totalConnections && { CONNECTION_TOTAL_COUNT: totalConnections }),
    });

    // Update UI
    displayConnectionCount(totalConnections);
    updateSyncTimes(new Date().toISOString());

    // Show success feedback
    statusBadge.textContent = "Active";
    statusBadge.classList.remove("processing");
    statusBadge.classList.add("active");
    button.textContent = "Synced";
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  } catch (err) {
    console.error("Error syncing connections:", err);
    statusBadge.textContent = "Error";
    statusBadge.classList.remove("syncing", "processing", "active");
    statusBadge.classList.add("error");
    button.textContent = "Sync Failed";
  } finally {
    button.disabled = false;
    setTimeout(() => {
      button.textContent = originalText;
      statusBadge.textContent = "Active";
      statusBadge.classList.remove("syncing", "processing", "error");
      statusBadge.classList.add("active");
    }, 3000);
  }
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

async function syncConnections() {
  const syncButton = document.getElementById("syncNow");
  if (!syncButton) return;

  const originalText = syncButton.textContent;
  syncButton.textContent = "Syncing...";
  syncButton.disabled = true;

  try {
    const result = await chrome.runtime.sendMessage({
      type: "linkedin-sync-connections",
    });

    if (result?.ok) {
      updateConnectionCount(result.connections.included.length);
      document.querySelector(
        ".text-xs.text-muted-foreground"
      ).textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
    } else {
      throw new Error(result?.error || "Unknown sync error");
    }
  } catch (error) {
    console.error("Sync failed:", error);
    alert(`Sync failed: ${error.message}`);
  } finally {
    syncButton.textContent = originalText;
    syncButton.disabled = false;
  }
}

async function linkedinGetDataApiBtnClick() {
  // Initialize elements safely
  const elements = {
    section: document.getElementById("connectionsSection"),
    list: document.getElementById("connectionsList"),
    count: document.getElementById("connectionCount"),
  };

  // Create missing elements
  if (!elements.list && elements.section) {
    elements.list = document.createElement("div");
    elements.list.id = "connectionsList";
    elements.section.appendChild(elements.list);
  }

  if (!elements.count && elements.section) {
    elements.count = document.createElement("div");
    elements.count.id = "connectionCount";
    elements.count.className = "text-center text-sm text-muted-foreground";
    elements.section.appendChild(elements.count);
  }

  if (!elements.list || !elements.count) {
    console.error("Could not initialize required elements");
    return;
  }

  const button = document.getElementById("linkedinGetDataApiBtn");
  if (!button) return;

  button.disabled = true;
  const originalText = button.innerHTML;
  button.innerHTML = '<span class="button-icon">⏳</span> Syncing...';

  try {
    const result = await chrome.runtime.sendMessage({
      type: "linkedin-sync-connections",
    });

    if (result?.ok) {
      updateConnectionCount(result.connections.included.length);
    }
  } catch (error) {
    console.error("Sync failed:", error);
  } finally {
    button.disabled = false;
    button.innerHTML = originalText;
  }
}

function showProfile(profile) {
  const profileContainer = document.getElementById("profileContainer");
  const profileImage = document.getElementById("profileImage");
  const profileName = document.getElementById("profileName");

  if (!profileContainer || !profileImage || !profileName) {
    console.error("Profile elements not found");
    return;
  }

  // Extract profile info from Voyager response
  const miniProfile = profile?.included?.[0];
  const fullName = miniProfile
    ? `${miniProfile.firstName} ${miniProfile.lastName}`
    : "Unknown";

  // Update profile display
  profileImage.src = miniProfile?.picture || "";
  profileName.textContent = fullName;

  // Show profile container
  profileContainer.classList.remove("hidden");
  document.getElementById("loginSection").hidden = true;
}

function showDisconnectedState(profile) {
  const miniProfile = profile?.included?.[0];
  const profileContainer = document.getElementById('profileContainer');

  if (!profileContainer) return;

  // Clear previous content and apply a class for styling
  profileContainer.innerHTML = '';
  profileContainer.className = 'disconnected-container'; // Add a specific class

  const profileImage = document.createElement('img');
  profileImage.src = miniProfile?.picture || '';
  profileImage.alt = `${miniProfile?.firstName || ''} ${miniProfile?.lastName || ''}`;
  profileImage.className = 'size-20 rounded-full';

  const profileName = document.createElement('h3');
  profileName.className = 'text-center text-2xl font-medium';
  profileName.textContent = `${miniProfile?.firstName || ''} ${miniProfile?.lastName || ''}`;

  const reconnectButton = document.createElement('button');
  reconnectButton.id = 'reconnectButton';
  reconnectButton.className = 'primary-button-green';
  reconnectButton.textContent = 'Connect this account';

  const differentAccountLink = document.createElement('a');
  differentAccountLink.href = 'https://linkedin.com';
  differentAccountLink.target = '_blank';
  differentAccountLink.rel = 'noreferrer';
  differentAccountLink.className = 'text-button';
  differentAccountLink.innerHTML = `Or log in to a different account <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 7h10v10M7 17 17 7'/%3E%3C/svg%3E" alt="Arrow up right" style="display: inline-block; vertical-align: middle; margin-left: 4px;">`;

  profileContainer.append(profileImage, profileName, reconnectButton, differentAccountLink);

  profileContainer.classList.remove('hidden');
  document.getElementById('loginSection').hidden = true;

  // Add event listener for reconnect
  reconnectButton.addEventListener('click', () => {
    // Instead of hiding, let's trigger the sign-in flow again
    signinBtnClick();
  });
}

function initializeEventHandlers() {
  document
    .getElementById("signinBtn")
    ?.addEventListener("click", signinBtnClick);
  document
    .getElementById("syncButton")
    ?.addEventListener("click", fetchConnections);
  document
    .getElementById("disconnectButton")
    ?.addEventListener("click", signOutBtnClick);
}

initializeEventHandlers();
initialize();
