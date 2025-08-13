import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect("/user-auth");
  return null;
}
