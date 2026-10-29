import { SWG_BASIC_INIT, SWG_BASIC_SRC } from "@/lib/news";

// Google News "Subscribe with Google" (SWG Basic) for WorldEye News
// articles. Rendered ONLY by the blog article template for posts
// flagged `news: true` (the same gate as the NewsArticle JSON-LD in
// lib/news) — every current and future flagged article gets it
// automatically, and nothing else on the site loads it. Google's
// snippet is two tags: the async loader and the inline init that
// queues on self.SWG_BASIC until the loader arrives. Plain <script>
// tags, matching the JsonLd component's pattern; the site CSP's
// default-src already allows https: script origins and inline
// scripts, so no CSP exception is needed.
export default function SwgBasic() {
  return (
    <>
      <script async type="application/javascript" src={SWG_BASIC_SRC} />
      <script dangerouslySetInnerHTML={{ __html: SWG_BASIC_INIT }} />
    </>
  );
}
