import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import { POSTS, getPost } from "../posts";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — WorldEye Blog`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
    },
  };
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const idx = POSTS.findIndex((p) => p.slug === slug);
  const prev = idx > 0 ? POSTS[idx - 1] : null;
  const next = idx < POSTS.length - 1 ? POSTS[idx + 1] : null;

  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100">
      <article className="max-w-3xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/blog" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to blog
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE BLOG</span>
        </div>

        {/* Header */}
        <div className="flex flex-wrap gap-2 mb-5">
          {post.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/25"
            >
              {t}
            </span>
          ))}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">{post.title}</h1>
        <div className="flex items-center gap-2 text-sm text-white/40 mt-5">
          <CalendarDays className="w-4 h-4" />
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span className="text-white/20">·</span>
          <span>WorldEye Team</span>
        </div>

        {/* Body */}
        <div className="mt-10 space-y-10">
          {post.sections.map((s, i) => (
            <section key={i}>
              {s.heading && (
                <h2 className="text-2xl font-bold tracking-tight mb-4">
                  <span className="text-[#D4AF37]">▸</span> {s.heading}
                </h2>
              )}
              <div className="space-y-4">
                {s.body.map((para, j) => (
                  <p key={j} className="text-white/65 leading-relaxed text-[17px]">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA card */}
        <div className="mt-16 rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-10 text-center">
          <h2 className="text-2xl font-bold">Try it live on the map.</h2>
          <p className="text-white/55 mt-3 max-w-md mx-auto">
            Everything in this guide runs on WorldEye — the free 3D globe with
            flights, cameras, satellites, and natural hazards. No signup.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-7 py-3.5 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition text-center"
            >
              Open the free map
            </Link>
            <Link
              href="/pricing"
              className="px-7 py-3.5 rounded-2xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition text-center"
            >
              Explore Pro
            </Link>
          </div>
        </div>

        {/* Prev / next */}
        <nav className="mt-12 grid sm:grid-cols-2 gap-4">
          {prev ? (
            <Link
              href={`/blog/${prev.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.02] hover:border-[#D4AF37]/40 transition p-5 group"
            >
              <span className="text-[11px] font-bold tracking-[0.2em] text-white/35">← PREVIOUS</span>
              <p className="font-semibold mt-2 group-hover:text-[#D4AF37] transition">{prev.title}</p>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/blog/${next.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.02] hover:border-[#D4AF37]/40 transition p-5 group text-right"
            >
              <span className="text-[11px] font-bold tracking-[0.2em] text-white/35">NEXT →</span>
              <p className="font-semibold mt-2 group-hover:text-[#D4AF37] transition">{next.title}</p>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
      <SiteFooter />
    </main>
  );
}
