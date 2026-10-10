import { redirect } from "next/navigation";
import { auth } from "@/auth";
import MissionsClient from "./MissionsClient";

export const metadata = { title: "Missions — WorldEye Affiliates" };

export default async function MissionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/missions");
  return <MissionsClient />;
}
