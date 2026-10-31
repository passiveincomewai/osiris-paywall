import Link from "next/link";
import { POSTS } from "@/app/(en)/blog/posts";
import { getNewsPosts } from "@/lib/news";

/**
 * Homepage "Latest stories" module (site-audit Wave 2, R33): the
 * homepage linked /blog once and /news not at all, and carried no
 * path from the globe into the newsroom. This server-rendered
 * section lists the three newest WorldEye News stories — the same
 * news-flagged set /news itself lists (lib/news getNewsPosts over
 * the blog's POSTS) — with a header link into /news. Dates and
 * excerpts come from the posts' own fields; nothing is invented,
 * and when no story is flagged the section renders nothing.
 */
export default function LatestStories() {
  const stories = getNewsPosts(POSTS).slice(0, 3);
  if (stories.length === 0) return null;
  return (
    <section className="relative border-t border-white/10 bg-[#05070d] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7dd3fc]">
              WorldEye News
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Latest stories
            </h2>
          </div>
          <Link
            href="/news"
            className="text-sm font-medium text-[#7dd3fc] hover:underline"
          >
            All stories →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {stories.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-white/25"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                {new Date(`${post.date}T12:00:00Z`).toLocaleDateString(
                  "en-US",
                  { month: "long", day: "numeric", year: "numeric" },
                )}
              </p>
              <h3 className="mt-3 font-semibold leading-snug text-white/90 group-hover:underline">
                {post.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/50">
                {post.excerpt}
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-[#7dd3fc]">
                Read the story →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
