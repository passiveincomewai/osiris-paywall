import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LibraryClient from "./LibraryClient";

export const metadata = { title: "Template Library — Marketing Studio" };

export default async function StudioLibraryPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/library");
  return <LibraryClient />;
}
