import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  session: null as { user?: { id?: string } } | null,
  event: null as { userId: string; imageJpeg: string | null } | null,
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => mocks.session) }));
vi.mock("@/lib/db", () => ({
  db: { alertEvent: { findUnique: vi.fn(async () => mocks.event) } },
}));

import { GET } from "./route";
import { signEventImageToken } from "@/lib/camera-alerts/image-token";

const JPEG_B64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString("base64");
const req = (qs = "") =>
  new Request(`http://localhost/api/camera-alerts/events/evt-1/image${qs}`) as Parameters<typeof GET>[0];
const call = (qs = "") => GET(req(qs), { params: Promise.resolve({ id: "evt-1" }) });

describe("GET /api/camera-alerts/events/[id]/image", () => {
  const saved = process.env.AUTH_SECRET;
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret";
    mocks.session = null;
    mocks.event = { userId: "user-1", imageJpeg: JPEG_B64 };
    vi.clearAllMocks();
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = saved;
  });

  it("404s for strangers: no token, no session", async () => {
    expect((await call()).status).toBe(404);
    expect((await call("?t=forged")).status).toBe(404);
  });

  it("serves the JPEG to the email's signed token", async () => {
    const token = signEventImageToken("evt-1");
    const res = await call(`?t=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.equals(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
  });

  it("serves the JPEG to the owning member's session — and not to another member", async () => {
    mocks.session = { user: { id: "user-1" } };
    expect((await call()).status).toBe(200);
    mocks.session = { user: { id: "user-2" } };
    expect((await call()).status).toBe(404);
  });

  it("404s when the event has no stored image", async () => {
    mocks.event = { userId: "user-1", imageJpeg: null };
    mocks.session = { user: { id: "user-1" } };
    expect((await call()).status).toBe(404);
  });
});
