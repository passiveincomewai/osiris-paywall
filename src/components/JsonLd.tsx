// Renders a JSON-LD structured-data script tag. Use on SEO pages to add
// schema.org types (AboutPage, WebPage, FAQPage, BlogPosting, ...) that the
// site-wide WebApplication block in layout.tsx doesn't cover.
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
