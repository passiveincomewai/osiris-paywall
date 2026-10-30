import { NextResponse } from "next/server";
import { POSTS } from "@/app/(en)/blog/posts";
import { getFreshNewsPosts } from "@/lib/news";

export const runtime = "nodejs";

/**
 * happening_now popup feed: the newest WorldEye News story still
 * inside its real 48-hour window (the same lib/news freshness rule
 * /news itself renders by), or null when no story is live. The popup
 * only ever repeats a headline the site itself is currently
 * publishing as news — no story in the window, no popup.
 */
export async function GET() {
  const fresh = getFreshNewsPosts(POSTS, new Date());
  const top = fresh[0];
  return NextResponse.json(
    {
      story: top
        ? { title: top.title, slug: top.slug, url: `/blog/${top.slug}` }
        : null,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    },
  );
}
