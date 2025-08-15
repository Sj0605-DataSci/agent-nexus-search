// // app/auth/callback/route.ts
// import { NextResponse } from "next/server";
// import { createClient } from "@/integrations/supabase/server";

// export const revalidate = 0;
// export const dynamic = "force-dynamic";

// function redirectTo(origin: string, path: string, params: Record<string, string> = {}) {
//   const url = new URL(`${origin}${path}`);
//   for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
//   return NextResponse.redirect(url, { status: 303 });
// }

// export async function GET(request: Request) {
//   const url = new URL(request.url);
//   const { searchParams, origin } = url;

//   const providerError = searchParams.get("error");
//   const providerErrorDesc = searchParams.get("error_description") ?? "";
//   const code = searchParams.get("code");
//   const rawNext = searchParams.get("next") ?? "/";

//   // avoid open redirects
//   const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

//   if (providerError) {
//     return redirectTo(origin, "/auth/error", {
//       error: providerError,
//       ...(providerErrorDesc ? { error_description: providerErrorDesc } : {}),
//     });
//   }

//   if (!code) {
//     // No code => not our flow
//     return redirectTo(origin, "/auth/error", { error: "no_code" });
//   }

//   try {
//     const supabase = createClient();

//     // 1) Exchange code (IMPORTANT: pass an object)
//     const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession({ code });
//     if (exchangeErr) {
//       console.error("[Auth] exchangeCodeForSession failed:", exchangeErr);
//       return redirectTo(origin, "/auth/error", {
//         error: "exchange_failed",
//         error_description: exchangeErr.message,
//       });
//     }

//     // 2) Get session and Google provider token
//     const { data: sessionData } = await supabase.auth.getSession();
//     const providerToken = sessionData?.session?.provider_token;
//     if (!providerToken) {
//       await supabase.auth.signOut();
//       return redirectTo(origin, "/auth/error", { error: "no_provider_token" });
//     }

//     // 3) (Optional) Validate phone via People API
//     const peopleRes = await fetch(
//       "https://people.googleapis.com/v1/people/me?personFields=phoneNumbers",
//       { headers: { Authorization: `Bearer ${providerToken}` } }
//     );

//     if (peopleRes.status === 401) {
//       await supabase.auth.signOut();
//       return redirectTo(origin, "/auth/error", { error: "provider_token_invalid" });
//     }
//     if (peopleRes.status === 403) {
//       await supabase.auth.signOut();
//       return redirectTo(origin, "/auth/error", { error: "insufficient_scopes" });
//     }
//     if (!peopleRes.ok) {
//       console.error("[Auth] People API error:", peopleRes.status, await peopleRes.text());
//       await supabase.auth.signOut();
//       return redirectTo(origin, "/auth/error", { error: "profile_fetch_failed" });
//     }

//     const people = await peopleRes.json();
//     const hasPhone =
//       Array.isArray(people?.phoneNumbers) &&
//       people.phoneNumbers.some((p: any) => p?.value && String(p.value).trim().length > 0);

//     if (!hasPhone) {
//       await supabase.auth.signOut();
//       return redirectTo(origin, "/auth/error", { error: "missing_phone" });
//     }

//     // 4) Success → go to app
//     return NextResponse.redirect(`${origin}/chat/new`, { status: 303 });
//   } catch (e: any) {
//     console.error("[Auth] unexpected server error:", e?.message);
//     return redirectTo(origin, "/auth/error", { error: "server_error" });
//   }
// }
// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/integrations/supabase/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

function redirectTo(origin: string, path: string, params: Record<string, string> = {}) {
  const url = new URL(`${origin}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { origin, searchParams } = url;

  const providerError = searchParams.get("error");
  const providerErrorDesc = searchParams.get("error_description") ?? "";
  const code = searchParams.get("code");

  if (providerError) {
    return redirectTo(origin, "/auth/error", {
      error: providerError,
      ...(providerErrorDesc ? { error_description: providerErrorDesc } : {}),
    });
  }

  if (!code) {
    return redirectTo(origin, "/auth/error", { error: "no_code" });
  }

  try {
    const supabase = createClient();

    const { error: exErr } = await supabase.auth.exchangeCodeForSession({ code });
    if (exErr) {
      console.error("[Auth] exchangeCodeForSession failed:", exErr);
      return redirectTo(origin, "/auth/error", {
        error: "exchange_failed",
        error_description: exErr.message,
      });
    }

    // Optional: Google People API validation using session.provider_token
    const { data: sess } = await supabase.auth.getSession();
    const providerToken = sess?.session?.provider_token;
    // ... (your checks)
    return NextResponse.redirect(`${origin}/chat/new`, { status: 303 });
  } catch (e: any) {
    console.error("[Auth] callback error:", e?.message);
    return redirectTo(origin, "/auth/error", { error: "server_error" });
  }
}
