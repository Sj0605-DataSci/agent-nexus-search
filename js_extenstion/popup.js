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

  const stored = await chrome.storage.local.get(JSESSION_STORAGE_KEY);
  _jsessionCache = stored[JSESSION_STORAGE_KEY] ?? null;
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
signOutBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "linkedin-signout" }, async (res) => {});
});

function showProfile(profile) {
  if (!profile || typeof profile !== "object") {
    profileInfo.textContent = "Profile unavailable";
    return;
  }

  const {
    profilePictureUrn = "",
    given_name = "",
    family_name = "",
    email = "",
  } = profile;

  profileInfo.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; padding: 8px;">
      <img 
        src="${profilePictureUrn}" 
        alt="${given_name} ${family_name}'s profile picture" 
        width="48" 
        height="48" 
        style="border-radius: 50%; object-fit: cover;" 
      />
      <div>
        <div style="font-weight: 600; font-size: 15px;">${given_name} ${family_name}</div>
        <div style="font-size: 13px; color: #666;">${email}</div>
      </div>
    </div>
  `;
}

async function initialize() {
  const stored = await chrome.storage.local.get(["profile"]);
  console.log("stored====", stored);
  if (stored && stored.tokens?.profile) {
    loginSection.hidden = true;
    profileSection.hidden = false;
    showProfile(stored.tokens?.profile || {});
  } else {
    loginSection.hidden = false;
    profileSection.hidden = true;
  }
}

signInBtn.addEventListener("click", () => {
  signInBtn.disabled = true;
  spinner.hidden = false;
  chrome.runtime.sendMessage({ type: "linkedin-signin" }, (res) => {
    signInBtn.disabled = false;
    spinner.hidden = true;
    if (res && res.ok && res.profile) {
      loginSection.hidden = true;
      profileSection.hidden = false;
      showProfile(res?.tokens?.profile || {});
    } else {
      alert("Sign-in failed: " + (res?.error || "Unknown error"));
    }
  });
});

signInBtn.addEventListener("click", () => {
  signInBtn.disabled = true;
  spinner.hidden = false;
  chrome.runtime.sendMessage({ type: "linkedin-signin" }, (res) => {
    signInBtn.disabled = false;
    spinner.hidden = true;
    if (res && res.ok && res.profile) {
      loginSection.hidden = true;
      profileSection.hidden = false;
      showProfile(res?.tokens?.profile || {});
    } else {
      alert("Sign-in failed: " + (res?.error || "Unknown error"));
    }
  });
});

linkedinGetDataApiBtn.addEventListener("click", async () => {
  linkedinGetDataApiBtn.disabled = true;

  try {
    const csrfToken = await getJSessionId();
    if (!csrfToken) throw new Error("No JSESSIONID token saved yet");

    const response = await fetch(
      "https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16&count=40&q=search&sortType=RECENTLY_ADDED",
      {
        headers: {
          "csrf-token": csrfToken,
          "x-li-track":
            '{"clientVersion":"1.13.36912","mpVersion":"1.13.36912","osName":"web","timezoneOffset":5.5,"timezone":"Asia/Calcutta","deviceFormFactor":"DESKTOP","mpName":"voyager-web","displayDensity":2,"displayWidth":3024,"displayHeight":1964}',
        },
      }
    );

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();
    const slim = transformConnections(data);

    chrome.storage.local.set({ LINKEDIN_CONNECTIONS: slim });
    saveJsonFile(slim, "linkedin-connections.json");
  } catch (err) {
    console.error(err);
  } finally {
    linkedinGetDataApiBtn.disabled = false;
  }
});

linkedinGetDataApiBtnConnections.addEventListener("click", async () => {
  linkedinGetDataApiBtnConnections.disabled = true;

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
    console.log("total--->", total);
    if (total !== null) {
      chrome.storage.local.set({ CONNECTION_TOTAL_COUNT: total });

      saveJsonFile({ totalResultCount: total }, "connections-count.json");
    }
  } catch (error) {
    console.log("error", error);
  } finally {
    linkedinGetDataApiBtnConnections.disabled = false;
  }
});
initialize();
