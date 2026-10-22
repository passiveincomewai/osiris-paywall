import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import { db } from "@/lib/db";
import ContactInbox, { type ContactMessageView } from "./ContactInbox";
import AdminNav from "../AdminNav";

export const metadata = { title: "Contact Inbox — Admin" };
export const dynamic = "force-dynamic";

const PAGE_LIMIT = 200;

export default async function ContactAdminPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) redirect("/admin/login");
  if (!adminEmails().includes(email)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#050810" }}>
        <div className="max-w-md text-center rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white">Admin access only</h1>
          <p className="text-sm text-white/50 mt-3 leading-relaxed">
            Signed in as <span className="text-white/80 font-mono">{email}</span>, which is not an admin.
          </p>
          <Link href="/" className="inline-block mt-6 text-sm text-cyan-300 hover:underline">← Back to site</Link>
        </div>
      </div>
    );
  }

  const [rows, total, unread] = await Promise.all([
    db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: PAGE_LIMIT }),
    db.contactMessage.count(),
    db.contactMessage.count({ where: { status: "unread" } }),
  ]);

  const initial: ContactMessageView[] = rows.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    topic: m.topic,
    message: m.message,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt ? m.readAt.toISOString() : null,
  }));

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white">Contact inbox</h1>
            <p className="text-sm text-white/45 mt-1 max-w-xl leading-relaxed">
              Messages sent from the /contact form, newest first. {total} total
              {unread > 0 ? <>, <span className="text-amber-300">{unread} unread</span></> : ", none unread"}.
              {total > PAGE_LIMIT ? ` Showing the newest ${PAGE_LIMIT}.` : ""} Replying happens
              from your own inbox — the Reply button opens a mailto to the sender.
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link href="/contact" className="inline-flex items-center px-4 py-2.5 rounded-lg border border-white/15 text-white/70 hover:text-white">View form</Link>
          </div>
        </div>

        <div className="mb-8">
          <AdminNav active="contact" />
        </div>

        <ContactInbox initial={initial} />
      </div>
    </div>
  );
}
