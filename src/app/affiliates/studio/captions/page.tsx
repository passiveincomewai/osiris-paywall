import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CaptionsClient from "./CaptionsClient";

export const metadata = { title: "Caption Generator — Marketing Studio" };

export default async function StudioCaptionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/captions");
  return <CaptionsClient />;
}
