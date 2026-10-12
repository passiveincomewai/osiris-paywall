import { redirect } from "next/navigation";
import { auth } from "@/auth";
import QuickEditClient from "./QuickEditClient";

export const metadata = { title: "Create — Marketing Studio" };

export default async function StudioCreatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  const { slug } = await params;
  if (!session?.user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/affiliates/studio/create/${slug}`)}`);
  }
  return <QuickEditClient slug={slug} />;
}
