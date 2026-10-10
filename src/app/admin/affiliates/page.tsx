import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import AdminClient from "./AdminClient";

export const metadata = { title: "Affiliate Admin — WorldEye" };

export default async function AdminAffiliatesPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !adminEmails().includes(email)) {
    redirect("/api/auth/signin?callbackUrl=/admin/affiliates");
  }
  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase">WorldEye Ops</div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Affiliate Command</h1>
          </div>
          <a href="/" className="text-sm text-slate-400 hover:text-white">← Site</a>
        </div>
        <AdminClient />
      </div>
    </div>
  );
}
