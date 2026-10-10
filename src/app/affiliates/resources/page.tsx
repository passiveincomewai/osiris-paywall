import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ResourcesClient from "./ResourcesClient";

export const metadata = {
  title: "Marketing Resources — WorldEye Affiliates",
  description: "Banners, captions, video scripts, email templates, and QR codes to promote WorldEye.",
};

export default async function ResourcesPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/resources");
  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Resource Center</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Marketing Resources</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Everything you need to promote WorldEye. Use truthful claims only — and always disclose your affiliate
          relationship with <span className="font-mono text-cyan-300">#ad</span> wherever you post your link.
        </p>
      </div>
      <ResourcesClient />
    </div>
  );
}
