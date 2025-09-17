export const dynamic = "force-static";
export const revalidate = false;

import { redirect } from "next/navigation";

export default function ResetPasswordPage({ searchParams }: { searchParams: Record<string, string> }) {
  const queryString = new URLSearchParams(searchParams).toString();
  const redirectUrl = queryString ? `/update-password?${queryString}` : '/update-password';
  redirect(redirectUrl);
  return null;
}
