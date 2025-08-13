import { NextResponse } from "next/server";
import { createClient } from "@/integrations/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const next = searchParams.get("next") ?? "/";

  // Handle OAuth provider errors first
  if (error) {
    return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?error=no_code`);
  }

  try {
    const supabase = createClient();
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError) {
      console.error("Auth Error:", authError.message);
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent(authError.message)}`
      );
    }

    return NextResponse.redirect(`${origin}${next}`);
  } catch (err: any) {
    console.error("Error exchanging code:", err.message);
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent("server_error")}`
    );
  }
}
