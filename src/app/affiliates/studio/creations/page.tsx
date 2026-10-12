import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CreationsClient from "./CreationsClient";

export const metadata = { title: "My Creations — Marketing Studio" };

export default async function StudioCreationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/creations");
  return <CreationsClient />;
}
