export const dynamic = "force-static";
export const revalidate = false;

import { redirect } from "next/navigation";

export default function ResetPasswordPage() {
  redirect("/user-auth");
  return null;
}
