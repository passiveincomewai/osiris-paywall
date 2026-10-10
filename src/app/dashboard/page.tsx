import { redirect } from "next/navigation";

// The map now lives at `/`. Keep the old URL working.
export default function DashboardRedirect() {
  redirect("/");
}
