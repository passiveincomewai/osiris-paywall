/**
 * The /powder-pass FAQ set — shared by the client (the accordion)
 * and the server page (the FAQPage JSON-LD) so the structured data
 * can never drift from what the page shows. Copy discipline matches
 * the rest of the page: modelled snow labelled modelled, road
 * coverage stated per state, VIP-includes / Pro-doesn't stated
 * exactly as lib/ski/access resolves it.
 */
export const POWDER_FAQS: { q: string; a: string }[] = [
  {
    q: "How much is Powder Pass, and is there a free trial?",
    a: "Powder Pass is $4.99/month after a 10-day free trial. Nothing is charged during the trial — checkout reads the same: 10 days free, then billed monthly, cancel anytime.",
  },
  {
    q: "I already have WorldEye Pro — do I need this too?",
    a: "Weekly and Monthly Pro do not include Powder Pass. VIP Pro annual does: if you hold it, you already have full ski access at no extra cost, and there is nothing more to buy.",
  },
  {
    q: "What stays free without Powder Pass?",
    a: "The resort pages, the live slope and access-road cameras, the drive-up route tool, Resort Compare and the directory's pass and beginner-friendly filters stay free for everyone. Powder Pass is the member layer on top of them.",
  },
  {
    q: "Is the snowfall measured in real time?",
    a: "No — snowfall figures are modelled from forecast and report data, and they are labelled modelled wherever they appear (the dawn-patrol email says so itself). The snow-stake cameras are the resorts' and operators' own labelled cameras, so you can watch the modelled numbers against the real stake.",
  },
  {
    q: "Which states have live road conditions?",
    a: "Washington, Oregon, California and Montana report live state DOT conditions today. Idaho is work zones only, and every Idaho report is labelled that way. Utah is waiting on UDOT approval and Arizona is not live yet — neither is claimed as covered until it is.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel in a couple of clicks from your account — no emails, no phone calls — and you keep access until the end of the period you paid for.",
  },
];
