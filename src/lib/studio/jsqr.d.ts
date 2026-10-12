// Minimal declaration for jsqr (used loosely: we only read `.data`).
// The render pipeline decodes QR pixels via sharp raw output and asserts
// the decoded text matches the referral link exactly.
declare module "jsqr" {
  export interface JsQrResult {
    data: string;
  }
  const jsQR: (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: {
      inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst";
    },
  ) => JsQrResult | null;
  export default jsQR;
}
