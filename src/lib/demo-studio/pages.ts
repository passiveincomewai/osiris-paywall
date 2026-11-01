// AI Demo Studio — placement registry.
//
// The pages and slots where an admin may place an approved demo video
// ("Add to Website"). Each slot is rendered by <DemoVideoSlot page slot/>
// on the real page; a slot with no active placement renders nothing, so
// registering a slot here never changes a page on its own. Placements
// are created per-video in the admin Demo Studio and are the ONLY way a
// demo video reaches a public page.

export interface DemoSlotDef {
  page: string;
  pageLabel: string;
  slot: string;
  slotLabel: string;
}

export const DEMO_SLOTS: DemoSlotDef[] = [
  { page: "features", pageLabel: "Features", slot: "demo", slotLabel: "Product demonstration (under the hero)" },
  { page: "live-webcams", pageLabel: "Live Webcams", slot: "tutorial", slotLabel: "How live cameras work (tutorial)" },
  { page: "live-flight-tracker", pageLabel: "Live Flight Tracker", slot: "demo", slotLabel: "Aircraft tracking demonstration" },
  { page: "pricing", pageLabel: "Pricing", slot: "overview", slotLabel: "Premium feature overview" },
  { page: "enterprise", pageLabel: "Enterprise", slot: "demo", slotLabel: "Business application demonstration" },
  { page: "affiliates", pageLabel: "Affiliates", slot: "studio-demo", slotLabel: "Marketing Studio demonstration" },
];

export function isValidSlot(page: string, slot: string): boolean {
  return DEMO_SLOTS.some((s) => s.page === page && s.slot === slot);
}
