/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — AI Intelligence Briefing Endpoint
 *  POST /api/ai/briefing
 *  Generates structured threat briefings via Gemini
 * ═══════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isRateLimited } from '@/lib/password-auth';
import { getClientIp } from '@/lib/ssrf-guard';
import {
  createGeminiClient,
  rotateApiKey,
  generateBriefing,
  generateBriefingOpenAI,
  openAiModel,
  type IntelligenceContext,
} from '@/lib/ai-engine';

export const dynamic = 'force-dynamic';

/* ─────────────────────────────────────────────────────────────
   Rate Limiter — 5 requests per minute per IP
   ───────────────────────────────────────────────────────────── */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetIn: entry.resetAt - now };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 120_000);

/* ─────────────────────────────────────────────────────────────
   Environment Key Collection
   ───────────────────────────────────────────────────────────── */

function getEnvApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) {
      keys.push(key.trim());
    }
  }
  return keys;
}

/* ─────────────────────────────────────────────────────────────
   Request / Response types
   ───────────────────────────────────────────────────────────── */

interface BriefingRequestBody {
  context: IntelligenceContext;
}

interface BriefingResponse {
  briefing: string;
  model: string;
  generatedAt: string;
}

interface ErrorResponse {
  error: string;
  code: string;
  retryAfter?: number;
}

/* ─────────────────────────────────────────────────────────────
   POST Handler
   ───────────────────────────────────────────────────────────── */

export async function POST(
  request: NextRequest
): Promise<NextResponse<BriefingResponse | ErrorResponse>> {
  /* Through the shared helper. Reading x-forwarded-for[0] here meant reading
     the one entry in the chain the caller writes: a fresh header bought a
     fresh bucket, so the five-a-minute limit below did not bind at all and
     the server's Gemini quota was spendable without limit. */
  const ip = getClientIp(request);

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Maximum 5 requests per minute.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil(rateCheck.resetIn / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // Whose key pays — the same resolution as /api/ai/analyze: a
  // caller-provided Gemini key wins with no account; the site's keys
  // (environment Gemini, or the included OpenAI key) need a signed-in
  // user inside a per-user hourly cap.
  const userKey = request.headers.get('x-gemini-key')?.trim();
  let geminiKey: string | null = null;
  let openAi: { key: string; model: string } | null = null;

  if (userKey && userKey.length > 0) {
    geminiKey = userKey;
  } else {
    const session = await auth().catch(() => null);
    const userId = session?.user?.id ?? null;
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Sign in to use WorldEye AI, or provide your own Gemini key in the x-gemini-key header.',
          code: 'SIGN_IN_REQUIRED',
        },
        { status: 401 }
      );
    }
    if (isRateLimited(`ai:site:briefing:${userId}`, 10, 3_600_000)) {
      return NextResponse.json(
        {
          error: 'You have used the included WorldEye AI a lot this hour. Give it a little while, or provide your own Gemini key.',
          code: 'RATE_LIMITED',
        },
        { status: 429, headers: { 'Retry-After': '600' } }
      );
    }
    const envKeys = getEnvApiKeys();
    const siteOpenAiKey = process.env.OPENAI_API_KEY?.trim();
    if (envKeys.length > 0) {
      geminiKey = rotateApiKey(envKeys);
    } else if (siteOpenAiKey) {
      openAi = { key: siteOpenAiKey, model: openAiModel() };
    } else {
      return NextResponse.json(
        {
          error:
            'AI isn\'t configured on this deployment. Set GEMINI_API_KEY_1 or OPENAI_API_KEY in the environment, or provide a key via the x-gemini-key header.',
          code: 'NO_API_KEY',
        },
        { status: 503 }
      );
    }
  }

  let body: BriefingRequestBody;
  try {
    body = (await request.json()) as BriefingRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  if (!body.context) {
    return NextResponse.json(
      { error: 'Intelligence context is required.', code: 'MISSING_CONTEXT' },
      { status: 400 }
    );
  }

  try {
    if (openAi) {
      const briefing = await generateBriefingOpenAI(openAi.key, openAi.model, body.context);
      return NextResponse.json(
        {
          briefing,
          model: openAi.model,
          generatedAt: new Date().toISOString(),
        },
        {
          headers: {
            'X-RateLimit-Remaining': String(rateCheck.remaining),
          },
        }
      );
    }
    const client = createGeminiClient(geminiKey!);
    const briefing = await generateBriefing(client, body.context);

    return NextResponse.json(
      {
        briefing,
        model: 'gemini-2.0-flash',
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown Gemini API error';

    if (message.startsWith('OPENAI_401') || message.startsWith('OPENAI_403')) {
      return NextResponse.json(
        { error: 'The site\'s OpenAI key was rejected. Please let us know.', code: 'INVALID_KEY' },
        { status: 401 }
      );
    }

    if (message.startsWith('OPENAI_429')) {
      return NextResponse.json(
        {
          error: 'The site\'s OpenAI quota is exhausted for now. Try again later or provide your own key.',
          code: 'QUOTA_EXHAUSTED',
        },
        { status: 429 }
      );
    }

    if (message.startsWith('OPENAI_')) {
      console.error('[OSIRIS AI] Briefing error:', message);
      return NextResponse.json(
        { error: 'Briefing generation failed. Please try again.', code: 'BRIEFING_FAILED' },
        { status: 500 }
      );
    }

    if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
      return NextResponse.json(
        { error: 'Invalid Gemini API key. Please check your configuration.', code: 'INVALID_KEY' },
        { status: 401 }
      );
    }

    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
      return NextResponse.json(
        {
          error: 'Gemini API quota exhausted. Try again later or provide your own API key.',
          code: 'QUOTA_EXHAUSTED',
        },
        { status: 429 }
      );
    }

    if (message.includes('SAFETY')) {
      return NextResponse.json(
        {
          error: 'Response blocked by Gemini safety filters. Try again.',
          code: 'SAFETY_BLOCKED',
        },
        { status: 422 }
      );
    }

    console.error('[OSIRIS AI] Briefing error:', message);
    return NextResponse.json(
      { error: 'Briefing generation failed. Please try again.', code: 'BRIEFING_FAILED' },
      { status: 500 }
    );
  }
}
