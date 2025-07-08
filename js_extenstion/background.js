const CLIENT_ID = "77hcnh58oyowdg"; // public

const BACKEND = "http://localhost:3000"; // ← dev
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

export async function linkedInSignIn() {
  const state = crypto.randomUUID();
  const redirectUri = chrome.identity.getRedirectURL();

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
  const tokenRes = await fetch(`${BACKEND}/linkedin/oauth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  }).then((r) =>
    r.ok
      ? r.json()
      : r.text().then((t) => {
          throw new Error(t);
        })
  );

  const payload = JSON.parse(
    atob(tokenRes.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
  );

  const stored = { ...tokenRes, profile: payload };
  await chrome.storage.local.set(stored?.profile);

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
  await chrome.storage.local.clear();

  chrome.tabs.create({
    url: "https://www.linkedin.com/m/logout/",
    active: false,
  });
}

const contentScriptTabs = new Set();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
          sendResponse({
            ok: true,
            tokens: signInResult,
            profile: signInResult?.profile,
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
  if (request.type === "linkedin-api-request") {
    executeLinkedInApiRequest(request.cookies)
      .then((response) => sendResponse({ ok: true, data: response }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));

    return true; // Keep the message channel open for async response
  }
});
