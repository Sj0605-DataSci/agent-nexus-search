// Info: Currently Hardcoded ID+Backend for test env
const CLIENT_ID = "77hcnh58oyowdg"; // public
// const BACKEND = "http://localhost:3000/api/linkedin/token";
const BACKEND =
  "https://staging-apis.discoverminds.ai/api/profiles/linkedin/token";

const SCOPES = ["openid", "profile", "email"];
const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
let _jsessionCache = null;
const JSESSION_STORAGE_KEY = "JSESSIONID_TOKEN";

export async function dumpLinkedInCookies() {
  console.log("[DEBUG] Dumping LinkedIn cookies...");
  const domains = [
    ".linkedin.com",
    "www.linkedin.com",
    "linkedin.com",
    "api.linkedin.com",
    ".www.linkedin.com",
    "lnkd.in",
    ".lnkd.in",
  ];

  console.log("[DEBUG] Checking domains:", domains);
  const cookiePromises = domains.map((domain) =>
    chrome.cookies
      .getAll({ domain })
      .then((cookies) => {
        console.log("[DEBUG] Found", cookies.length, "cookies for", domain);
        return { domain, cookies };
      })
      .catch((err) => {
        console.log("[DEBUG] Error getting cookies for", domain, err.message);
        return { domain, error: err.message, cookies: [] };
      })
  );

  const results = await Promise.all(cookiePromises);
  console.log("[DEBUG] Cookie collection complete");

  let allCookies = [];
  const cookieMap = new Map();

  for (const result of results) {
    for (const cookie of result.cookies) {
      const key = `${cookie.name}|${cookie.path}|${cookie.domain}`;
      cookieMap.set(key, cookie);
    }
  }

  allCookies = Array.from(cookieMap.values());
  console.log("[DEBUG] Total unique cookies found:", allCookies.length);
  return allCookies;
}

export async function retrieveAndStoreJSessionId() {
  try {
    console.log("[DEBUG] Starting JSESSIONID retrieval...");
    const cookies = await dumpLinkedInCookies();
    console.log("[DEBUG] Found", cookies.length, "LinkedIn cookies");

    const jsessionCookie = cookies.find(
      (cookie) => cookie.name === "JSESSIONID"
    );

    if (jsessionCookie) {
      console.log("[DEBUG] Found JSESSIONID:", {
        domain: jsessionCookie.domain,
        path: jsessionCookie.path,
        secure: jsessionCookie.secure,
      });
      await chrome.storage.local.set({
        JSESSIONID_TOKEN: jsessionCookie.value,
      });
      return jsessionCookie.value;
    } else {
      console.log("[DEBUG] No JSESSIONID found in cookies");
      return null;
    }
  } catch (error) {
    console.error("[ERROR] Retrieving JSESSIONID:", error);
    return null;
  }
}

export async function checkAndRetrieveJSessionId() {
  // First check if we already have it stored
  const stored = await chrome.storage.local.get(["JSESSIONID_TOKEN"]);

  if (stored && stored.JSESSIONID_TOKEN) {
    console.log("Using stored JSESSIONID token");
    return stored.JSESSIONID_TOKEN;
  }

  // If not stored, try to retrieve it
  console.log("No stored JSESSIONID found, attempting to retrieve...");
  return await retrieveAndStoreJSessionId();
}

export async function linkedInSignIn() {
  const state = crypto.randomUUID();
  // Use the exact redirect URI that's registered in LinkedIn Developer Console
  const redirectUri =
    "https://ohhahepljehjfliiiacafdmgnfodklbd.chromiumapp.org/oauth-callback.html";
  /* 1. build LinkedIn auth URL */
  const auth = new URL(AUTH_URL);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("client_id", CLIENT_ID);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("scope", SCOPES.join(" "));
  auth.searchParams.set("state", state);

  const redirectURL = await chrome.identity.launchWebAuthFlow({
    url: auth.toString(),
    interactive: true,
  });

  const url = new URL(redirectURL);

  if (url.searchParams.get("error") === "access_denied") {
    throw new Error("You cancelled the permission dialog.");
  }

  if (url.searchParams.get("state") !== state) {
    throw new Error("State mismatch – possible CSRF.");
  }

  const code = url.searchParams.get("code");
  const tokenRes = await fetch(`${BACKEND}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirectUri }),
  }).then(async (r) => {
    if (r.ok) {
      const data = await r.json();
      // Store the token response data locally
      await chrome.storage.local.set({
        authData: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      });
      console.log("Auth data stored successfully");
      return data;
    } else {
      const errorText = await r.text();
      console.error("Auth error:", errorText);
      throw new Error(errorText);
    }
  });

  // LinkedIn's standard OAuth flow doesn't return id_token by default
  // Instead, we'll use the access_token and fetch the profile separately
  let profile = {};
  console.log("tokenRes?.data?.access_token", tokenRes?.data?.access_token);
  try {
    // Fetch user profile using the access token
    const profileResponse = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenRes?.data?.access_token}`,
          Accept: "application/json",
        },
      }
    );

    if (profileResponse.ok) {
      profile = await profileResponse.json();
      console.log("Profile fetched successfully:", profile);

      // After successful login, try to retrieve and store JSESSIONID
      // We need to open LinkedIn in a tab to get the cookies
      const tab = await chrome.tabs.create({
        url: "https://www.linkedin.com/",
        active: false,
      });

      // Wait a moment for the page to load and cookies to be set
      setTimeout(async () => {
        await retrieveAndStoreJSessionId();
        // Close the tab after retrieving cookies
        chrome.tabs.remove(tab.id);
      }, 5000);
    } else {
      console.error("Failed to fetch profile:", await profileResponse.text());
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
  }

  const stored = { ...tokenRes, profile };
  await chrome.storage.local.set({ profile });

  return stored;
}

async function logAllLinkedInCookies() {
  try {
    const cookies = await chrome.cookies.getAll({
      domain: ".linkedin.com",
    });

    console.group("LinkedIn Cookies:");
    cookies.forEach((cookie) => {
      console.log(`Name: ${cookie.name}`);
      console.log(`Value: ${cookie.value}`);
      console.log(`Domain: ${cookie.domain}`);
      console.log(`Path: ${cookie.path}`);
      console.log(`Secure: ${cookie.secure}`);
      console.log(`HttpOnly: ${cookie.httpOnly}`);
      console.log(
        `Expires: ${
          cookie.expirationDate
            ? new Date(cookie.expirationDate * 1000)
            : "Session"
        }`
      );
      console.log("---");
    });
    console.groupEnd();

    return cookies;
  } catch (error) {
    console.error("Error fetching LinkedIn cookies:", error);
    return [];
  }
}

export async function fetchConnections() {
  try {
    const jsessionId = await getJSessionId();
    if (!jsessionId) {
      console.error("No JSESSIONID available for connections sync");
      throw new Error("No JSESSIONID available");
    }

    console.log("Fetching LinkedIn connections with JSESSIONID");
    const response = await fetch(
      "https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16&count=40&q=search&sortType=RECENTLY_ADDED",
      {
        headers: {
          accept: "application/vnd.linkedin.normalized+json+2.1",
          "csrf-token": jsessionId,
          "x-restli-protocol-version": "2.0.0",
          "x-li-lang": "en_US",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      console.error(
        "Connections API failed:",
        response.status,
        await response.text()
      );
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const connections = await response.json();
    console.log(
      "Successfully fetched connections:",
      connections.included?.length
    );
    await chrome.storage.local.set({
      connections,
      lastSyncTime: new Date().toISOString(),
    });
    return { ok: true, connections };
  } catch (error) {
    console.error("Failed to fetch connections:", error);
    throw error;
  }
}

export async function fetchFullProfile() {
  const { access_token } = await chrome.storage.local.get(["access_token"]);
  if (!access_token) throw new Error("Not signed in");

  const headers = { Authorization: `Bearer ${access_token}` };

  const [me, emailRes] = await Promise.all([
    fetch("https://api.linkedin.com/v2/me", { headers }).then((r) => r.json()),
    fetch(
      "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
      { headers }
    ).then((r) => r.json()),
  ]);

  const email = emailRes.elements?.[0]?.["handle~"]?.emailAddress ?? null;
  console.log(me, emailRes);
  return {
    id: me.id,
    firstName: me.localizedFirstName,
    lastName: me.localizedLastName,
    email,
    profilePictureUrn: me.profilePicture?.["displayImage"],
    fullResponse: me,
  };
}

export async function linkedInSignOut() {
  try {
    // Clear all local storage
    await chrome.storage.local.clear();

    // Clear session storage
    await chrome.storage.session.clear();

    // Clear any cached data
    if (window.caches) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }

    // Clear cookies for LinkedIn domains
    const domains = [
      ".linkedin.com",
      "www.linkedin.com",
      "linkedin.com",
      "api.linkedin.com",
    ];

    for (const domain of domains) {
      try {
        const cookies = await chrome.cookies.getAll({ domain });
        await Promise.all(
          cookies.map((cookie) =>
            chrome.cookies.remove({
              url: `http${cookie.secure ? "s" : ""}://${cookie.domain}${
                cookie.path
              }`,
              name: cookie.name,
              storeId: cookie.storeId,
            })
          )
        );
      } catch (error) {
        console.error(`Error clearing cookies for ${domain}:`, error);
      }
    }

    // Open LinkedIn logout page in a new tab
    chrome.tabs.create({
      url: "https://www.linkedin.com/m/logout/",
      active: false,
    });

    return { success: true };
  } catch (error) {
    console.error("Error during sign out:", error);
    return { success: false, error: error.message };
  }
}

const contentScriptTabs = new Set();

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // Handle sign out request
  if (message.type === "linkedin-signout") {
    try {
      const result = await linkedInSignOut();
      sendResponse(result);
    } catch (error) {
      console.error("Error during sign out:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep the message channel open for the async response
  }

  // Handle content script ready notification
  if (message.type === "linkedin-content-script-ready" && sender.tab) {
    console.log("Content script ready in tab:", sender.tab.id, sender.tab.url);
    contentScriptTabs.add(sender.tab.id);
    return true;
  }
  if (message?.type === "linkedin-signin") {
    (async () => {
      try {
        const signInResult = await linkedInSignIn();
        const jsessionId = await retrieveAndStoreJSessionId();
        let voyagerProfile = null;

        if (jsessionId) {
          try {
            voyagerProfile = await fetchVoyagerProfile(jsessionId);
            await chrome.storage.local.set({ voyagerProfile });
          } catch (profileError) {
            console.error('Error fetching Voyager profile:', profileError);
          }
        }

        chrome.runtime.sendMessage({
          type: 'linkedin-signin-response',
          ok: true,
          tokens: signInResult,
          profile: signInResult?.profile,
          jsessionId,
          voyagerProfile
        });
      } catch (err) {
        console.error('Sign-in error:', err);
        chrome.runtime.sendMessage({
          type: 'linkedin-signin-response',
          ok: false,
          error: err.message || 'Sign-in failed'
        });
      }
    })();
    
    return true;
  }

  if (message?.type === "linkedin-signout") {
    linkedInSignOut()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (message?.type === "linkedin-localstorage-dump") {
    chrome.storage.local.set({ ls_dump: message.payload });
    sendResponse({ ok: true, data: message.payload });
    return true;
  }

  if (message?.type === "linkedin-get-all-data") {
    (async () => {
      try {
        const cookies = await dumpLinkedInCookies();

        const storageData = await chrome.storage.local.get(null);

        sendResponse({
          ok: true,
          cookies: cookies,
          localStorage: storageData,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  }
  if (message?.type === "linkedin-dump-cookies") {
    dumpLinkedInCookies()
      .then((c) => sendResponse({ ok: true, cookies: c }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (message?.type === "linkedin-get-jsessionid") {
    checkAndRetrieveJSessionId()
      .then((jsessionId) => sendResponse({ ok: true, jsessionId }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (message?.type === "linkedin-api-request") {
    executeLinkedInApiRequest(message.cookies)
      .then((response) => sendResponse({ ok: true, data: response }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));

    return true; // Keep the message channel open for async response
  }
  if (message?.type === "linkedin-get-voyager-profile") {
    fetchVoyagerProfile()
      .then((profile) => sendResponse({ ok: true, profile }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "linkedin-sync-connections") {
    (async () => {
      try {
        const result = await fetchConnections();
        sendResponse(result);
      } catch (error) {
        console.error("Sync connections failed:", error);
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true; // Keep message channel open
  }
});

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

export async function fetchVoyagerProfile(jsessionId) {
  const response = await fetch("https://www.linkedin.com/voyager/api/me", {
    headers: {
      "csrf-token": jsessionId,
      accept: "application/vnd.linkedin.normalized+json+2.1",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Voyager API failed with status ${response.status}`);
  }

  return await response.json();
}
