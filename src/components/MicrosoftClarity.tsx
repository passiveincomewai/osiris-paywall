import Script from "next/script";

/** Microsoft Clarity — session analytics for worldeye.app. Project ID
 *  supplied by Jameson 2026-11-07 (Clarity project "zaa22s01mv"). The
 *  loader below is Clarity's standard install snippet, verbatim except
 *  that the project ID is interpolated from the constant — same pattern
 *  as MetaPixel.tsx. Mounted once, site-wide, from RootShell. */
export const CLARITY_PROJECT_ID = "zaa22s01mv";

export default function MicrosoftClarity() {
  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_PROJECT_ID}");`}
    </Script>
  );
}
