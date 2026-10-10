import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DashboardClient from "./DashboardClient";

export const metadata = { title: "Affiliate Command Deck — WorldEye" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/dashboard");
  return <DashboardClient />;
}
