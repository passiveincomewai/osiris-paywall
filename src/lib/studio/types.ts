export type StudioFormat = "png" | "jpeg" | "webp";
export interface EditableField { key: string; label: string; type: "text" | "textarea" | "color" | "toggle"; maxLen?: number; default?: string | boolean; required?: boolean }
export type TemplateLayer =
  | { type: "qr"; x: number; y: number; size: number; pad?: number; bg?: string; fg?: string; logo?: boolean }
  | { type: "logo"; x: number; y: number; width: number }
  | { type: "coupon"; x: number; y: number; width: number; height: number };
export interface StudioContext { profileId: string; userId: string; code: string; link: string; couponCode: string | null; discountPct: number | null; displayName: string; rankKey: string; rankName: string; xp: number; commissionPct: number }
export const TEMPLATE_CATEGORIES = ["feed","story","reel","tiktok","short","carousel","banner","discount","feature","email","thumbnail"] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
