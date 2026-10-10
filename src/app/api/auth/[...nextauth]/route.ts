import { handlers } from "@/auth";

// The Prisma adapter needs the Node.js runtime (no edge DB driver configured).
export const runtime = "nodejs";

export const { GET, POST } = handlers;
