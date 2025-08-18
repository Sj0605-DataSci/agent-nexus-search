// Info: Currently Hardcoded ID+Backend for test env
const CLIENT_ID = "77hcnh58oyowdg"; // public
const BACKEND = "http://localhost:3000/api/linkedin/token";
// const BACKEND =
// "https://staging-apis.discoverminds.ai/api/profiles/linkedin/token";

const SCOPES = ["openid", "profile", "email"];
const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";

export async function dumpLinkedInCookies() {
  const domains = [
    ".linkedin.com",
    "www.linkedin.com",
    "linkedin.com",
    "api.linkedin.com",
    ".www.linkedin.com",
    "lnkd.in",
    ".lnkd.in",
  ];

  const cookiePromises = domains.map((domain) =>
    chrome.cookies
      .getAll({ domain })
      .then((cookies) => ({ domain, cookies }))
      .catch((err) => ({ domain, error: err.message, cookies: [] }))
  );

  const results = await Promise.all(cookiePromises);

  let allCookies = [];
  const cookieMap = new Map(); // Use a map to track unique cookies by name+path

  for (const result of results) {
    for (const cookie of result.cookies) {
      const key = `${cookie.name}|${cookie.path}|${cookie.domain}`;
      cookieMap.set(key, cookie);
    }
  }

  allCookies = Array.from(cookieMap.values());

  return allCookies;
}

export async function retrieveAndStoreJSessionId() {
  try {
    console.log("Attempting to retrieve JSESSIONID...");
    const cookies = await dumpLinkedInCookies();

    // Find the JSESSIONID cookie
    const jsessionCookie = cookies.find(
      (cookie) => cookie.name === "JSESSIONID"
    );

    if (jsessionCookie) {
      console.log("JSESSIONID found:", jsessionCookie.value);
      // Store it in local storage
      await chrome.storage.local.set({
        JSESSIONID_TOKEN: jsessionCookie.value,
      });
      return jsessionCookie.value;
    } else {
      console.log("JSESSIONID not found in cookies");
      return null;
    }
  } catch (error) {
    console.error("Error retrieving JSESSIONID:", error);
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
  }).then((r) =>
    r.ok
      ? r.json()
      : r.text().then((t) => {
          throw new Error(t);
        })
  );

  // LinkedIn's standard OAuth flow doesn't return id_token by default
  // Instead, we'll use the access_token and fetch the profile separately
  let profile = {};

  try {
    // Fetch user profile using the access token
    const profileResponse = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenRes.access_token}`,
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

export async function fetchConnections({ start = 0, count = 50 } = {}) {
  const { access_token } = await chrome.storage.local.get(["access_token"]);
  if (!access_token) throw new Error("Not signed in");

  const url = new URL("https://api.linkedin.com/v2/relationships/connections");
  url.searchParams.set("q", "viewer");
  url.searchParams.set("start", start);
  url.searchParams.set("count", count);

  const r = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!r.ok) throw new Error("Connections fetch failed: " + r.status);
  return r.json(); // { paging:{start,count,total}, elements:[…] }
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
    linkedInSignIn()
      .then(async (signInResult) => {
        try {
          console.log("signInResult--->", signInResult?.profile);
          await chrome.storage.local.set({ profile: signInResult?.profile });

          // Try to get JSESSIONID immediately if not already retrieved
          const jsessionId = await retrieveAndStoreJSessionId();

          sendResponse({
            ok: true,
            tokens: signInResult,
            profile: signInResult?.profile,
            jsessionId: jsessionId,
          });
        } catch (err) {
          sendResponse({ ok: false, error: err.message });
        }
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }));
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
});
