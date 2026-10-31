"use client";

/**
 * Fraud Radar Phase 7 — AI Investigator surface (Payload P7-C,
 * PHASE7 §5.1). A signed-in chat over the P7-B API: the persisted
 * conversation is the source of truth (history renders from the
 * stored message rows, so answers and their citations survive a
 * reload), and a live turn is followed over the SSE events
 * endpoint — replay after the seq cursor, then live append —
 * exactly the §4.2 contract. When the stream ends the client
 * re-reads the persisted conversation, so stream and history can
 * never disagree.
 *
 * Copy discipline: every standing text on this surface comes
 * from guardrails.ts via the `copy` prop assembled by the server
 * page (this module imports no server data layer — the citation
 * types are type-only). The investigator is a research assistant
 * over public records; it does not determine wrongdoing, and an
 * answer whose figures could not be verified is shown as the
 * labelled code-rendered results table the engine persisted —
 * never dressed up as prose.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  CitationEnvelope,
  ToolResult,
} from "@/lib/fraud-radar/investigator/citations";

// ---------------------------------------------------------------------------
// Wire shapes (the P7-B API serialisation — route-helpers.ts).
// ---------------------------------------------------------------------------

export interface WireConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface WireMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: ToolResult[] | null;
  model: string | null;
  promptVersion: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  validatorVerdict: string | null;
  status: string;
  errorCode: string | null;
  createdAt: string;
}

export interface WireUsage {
  tier: string;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
}

/** Standing copy, sourced from guardrails.ts by the server page. */
export interface InvestigatorCopy {
  researchLeadsNote: string;
  notConfiguredText: string;
  fallbackNotice: string;
  caveatText: Readonly<Record<string, string>>;
}

const API = "/api/fraud-radar/investigator";

export const STARTER_QUESTIONS: readonly { engine: string; question: string }[] = [
  {
    engine: "Healthcare",
    question: "Show the published Medicaid profile for a provider I name by NPI.",
  },
  {
    engine: "Care programs",
    question: "What do the published Medicare records show for a provider I name by NPI?",
  },
  {
    engine: "Grants",
    question: "Show the published grant record for a recipient I name by UEI, including its single-audit block.",
  },
  {
    engine: "Research signals",
    question: "Which research signals are published for an entity I name, with their provenance?",
  },
  {
    engine: "Sources",
    question: "How current is the published data, and which source versions does it come from?",
  },
];

// ---------------------------------------------------------------------------
// Citations: dataset + version + grain key (§2.3), linking to the
// entity's public profile page where one exists.
// ---------------------------------------------------------------------------

export function citationLabel(envelope: CitationEnvelope): string {
  return `${envelope.dataset}@${envelope.datasetVersion} · ${envelope.grainKey}`;
}

export function citationHref(envelope: CitationEnvelope): string | null {
  const [kind, value] = envelope.grainKey.split(/:(.+)/).filter((s) => s !== "");
  if (!value) return null;
  if (kind === "NPI" && envelope.dataset === "medicaid-provider-aggregates") {
    return `/fraud-radar/healthcare/providers/${value}`;
  }
  if (kind === "NPI" && envelope.dataset === "care-program-aggregates") {
    return `/fraud-radar/care/medicare/${value}`;
  }
  if (kind === "UEI" && envelope.dataset === "grants-aggregates") {
    return `/fraud-radar/grants/recipients/${value}`;
  }
  if (envelope.dataset === "research-signals") return "/fraud-radar/signals";
  return null;
}

export function CitationChips({
  results,
  caveatText,
}: {
  results: ToolResult[];
  caveatText: Readonly<Record<string, string>>;
}) {
  if (results.length === 0) return null;
  const caveats = [...new Set(results.flatMap((r) => r.envelope.caveats))];
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">
        Sources cited in this answer
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {results.map((r, i) => {
          const href = citationHref(r.envelope);
          const label = citationLabel(r.envelope);
          const chip = (
            <span className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-cyan-200">
              {label}
              {r.envelope.truncated ? " · top results shown" : ""}
            </span>
          );
          return (
            <li key={`${label}-${i}`}>
              {href ? (
                <Link href={href} className="hover:opacity-80">
                  {chip}
                </Link>
              ) : (
                chip
              )}
            </li>
          );
        })}
      </ul>
      {caveats.length > 0 && (
        <ul className="mt-2 space-y-1">
          {caveats.map((code) => (
            <li key={code} className="text-xs text-white/50 leading-relaxed">
              {caveatText[code] ?? code}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One persisted message. Assistant answers render from the stored
// row: content, the citation record, the validator verdict (the
// fallback state is labelled as the code-rendered results table
// it is), and the honest error state for a failed turn.
// ---------------------------------------------------------------------------

const ERROR_TEXT: Readonly<Record<string, string>> = {
  PROVIDER_UNAVAILABLE:
    "The investigator service is unavailable right now. No answer was composed for this turn, and the turn was not charged. Please try again later.",
  QUOTA_EXHAUSTED:
    "The investigator service's provider quota is exhausted right now. This turn was not charged. Please try again later.",
  SAFETY_BLOCKED:
    "The model declined to compose an answer to this turn. This turn was not charged. Try rephrasing the question around the published records you want to see.",
  INVALID_KEY:
    "The investigator service is unavailable right now. No answer was composed for this turn, and the turn was not charged.",
  AI_NOT_CONFIGURED:
    "The investigator service is unavailable right now. No answer was composed for this turn, and the turn was not charged.",
  DEADLINE:
    "This turn ran past its time limit before a verified answer could be composed, and the turn was not charged.",
};

export function MessageView({
  message,
  copy,
}: {
  message: WireMessage;
  copy: InvestigatorCopy;
}) {
  if (message.role === "user") {
    return (
      <article className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
        <p className="text-xs font-semibold tracking-wide text-cyan-300 uppercase">You</p>
        <p className="mt-2 text-sm whitespace-pre-wrap text-white/90 leading-relaxed">
          {message.content}
        </p>
      </article>
    );
  }
  const isFallback = message.validatorVerdict === "fallback";
  const isError = message.status === "error";
  const fallbackLabel = `${copy.fallbackNotice.charAt(0).toUpperCase()}${copy.fallbackNotice.slice(1)}.`;
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">
        Investigator
        {message.status === "running" ? " · working…" : ""}
      </p>
      {isFallback && (
        <p className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100/90 leading-relaxed">
          <strong className="font-semibold">Code-rendered results — not an assistant answer.</strong>{" "}
          {fallbackLabel}
        </p>
      )}
      {isError ? (
        <p className="mt-2 text-sm text-white/70 leading-relaxed">
          {ERROR_TEXT[message.errorCode ?? ""] ??
            "This turn could not be completed. No answer was composed, and the turn was not charged."}
        </p>
      ) : (
        <div className="mt-2 text-sm whitespace-pre-wrap text-white/85 leading-relaxed">
          {message.content}
        </div>
      )}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <CitationChips results={message.toolCalls} caveatText={copy.caveatText} />
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Usage: ops used / allowance from the API (§4.4 — the ledger is
// the source of truth; this renders its numbers, nothing else).
// ---------------------------------------------------------------------------

export function UsageDisplay({ usage }: { usage: WireUsage }) {
  const text = `Investigator usage: ${usage.used} of ${usage.limit} research operations used this month (${usage.tier} tier). Your allowance resets on ${usage.resetAt.slice(0, 10)}.`;
  return <p className="text-xs text-white/50 leading-relaxed">{text}</p>;
}

// ---------------------------------------------------------------------------
// The interactive surface.
// ---------------------------------------------------------------------------

type LoadState = "loading" | "ready" | "signed-out" | "unavailable" | "error";

export default function InvestigatorClient({ copy }: { copy: InvestigatorCopy }) {
  const [state, setState] = useState<LoadState>("loading");
  const [conversations, setConversations] = useState<WireConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WireMessage[]>([]);
  const [usage, setUsage] = useState<WireUsage | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const refreshUsage = useCallback(async () => {
    const res = await fetch(`${API}/usage`).catch(() => null);
    if (res && res.ok) setUsage((await res.json()) as WireUsage);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const res = await fetch(`${API}/conversations/${id}`).catch(() => null);
    if (res && res.ok) {
      const data = (await res.json()) as { messages: WireMessage[] };
      setMessages(data.messages);
    }
  }, []);

  const refreshList = useCallback(async (): Promise<WireConversation[] | null> => {
    const res = await fetch(`${API}/conversations`).catch(() => null);
    if (!res) {
      setState("error");
      return null;
    }
    if (res.status === 401) {
      setState("signed-out");
      return null;
    }
    if (!res.ok) {
      setState("error");
      return null;
    }
    const data = (await res.json()) as { conversations: WireConversation[] };
    setConversations(data.conversations);
    setState("ready");
    return data.conversations;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await refreshList();
      if (cancelled || !list) return;
      await refreshUsage();
      if (list.length > 0) {
        setActiveId(list[0].id);
        await loadConversation(list[0].id);
      }
    })();
    return () => {
      cancelled = true;
      sourceRef.current?.close();
    };
  }, [refreshList, refreshUsage, loadConversation]);

  const selectConversation = async (id: string) => {
    sourceRef.current?.close();
    setLiveText("");
    setNotice(null);
    setActiveId(id);
    await loadConversation(id);
  };

  const newConversation = async () => {
    const res = await fetch(`${API}/conversations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => null);
    if (!res || !res.ok) return;
    const data = (await res.json()) as { conversation: WireConversation };
    await refreshList();
    setActiveId(data.conversation.id);
    setMessages([]);
    setNotice(null);
  };

  const deleteConversation = async (id: string) => {
    await fetch(`${API}/conversations/${id}`, { method: "DELETE" }).catch(() => null);
    const list = await refreshList();
    if (id === activeId) {
      if (list && list.length > 0) {
        setActiveId(list[0].id);
        await loadConversation(list[0].id);
      } else {
        setActiveId(null);
        setMessages([]);
      }
    }
  };

  const followTurn = (conversationId: string, turnId: string) => {
    sourceRef.current?.close();
    const source = new EventSource(
      `${API}/conversations/${conversationId}/turns/${turnId}/events`,
    );
    sourceRef.current = source;
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { t: string; text?: string };
        if (data.t === "text_delta" && typeof data.text === "string") {
          setLiveText((prev) => prev + data.text);
        }
        if (data.t === "turn_done" || data.t === "turn_error") {
          source.close();
          setSending(false);
          setLiveText("");
          void loadConversation(conversationId);
          void refreshUsage();
          void refreshList();
        }
      } catch {
        /* a malformed event is ignored; the persisted turn is the truth */
      }
    };
    source.onerror = () => {
      // The follow window closed or the stream dropped: fall back
      // to the persisted conversation (the replay contract's
      // polling equivalent).
      source.close();
      setSending(false);
      setLiveText("");
      void loadConversation(conversationId);
    };
  };

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setNotice(null);
    let conversationId = activeId;
    if (!conversationId) {
      const res = await fetch(`${API}/conversations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: content.slice(0, 120) }),
      }).catch(() => null);
      if (!res || !res.ok) {
        setNotice("Could not start a conversation. Please try again.");
        return;
      }
      const data = (await res.json()) as { conversation: WireConversation };
      conversationId = data.conversation.id;
      setActiveId(conversationId);
      await refreshList();
    }
    setSending(true);
    const res = await fetch(`${API}/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(() => null);
    if (!res) {
      setSending(false);
      setNotice("The turn could not be started. Please try again.");
      return;
    }
    if (res.status === 503) {
      // The honest unavailable state (§4.5): the engine reports
      // model-down; no fake answer is offered in its place.
      setSending(false);
      setState("unavailable");
      return;
    }
    if (res.status === 429) {
      setSending(false);
      const data = (await res.json().catch(() => null)) as { resetAt?: string } | null;
      setNotice(
        data?.resetAt
          ? `Your monthly investigator quota is used up. It resets on ${data.resetAt.slice(0, 10)}.`
          : "Your monthly investigator quota is used up.",
      );
      await loadConversation(conversationId);
      return;
    }
    if (!res.ok) {
      setSending(false);
      setNotice("The turn could not be started. Please try again.");
      return;
    }
    const { turnId } = (await res.json()) as { turnId: string };
    setDraft("");
    await loadConversation(conversationId);
    followTurn(conversationId, turnId);
  };

  if (state === "loading") {
    return <p className="mt-10 text-sm text-white/50">Loading your conversations…</p>;
  }
  if (state === "signed-out") {
    return (
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Sign in to use the investigator</h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">
          The investigator is a signed-in research surface. Your conversations are
          stored under your account and are visible only to you.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/signin" className="text-cyan-300 hover:underline">
            Sign in →
          </Link>
        </p>
      </div>
    );
  }
  if (state === "unavailable") {
    return (
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Investigator unavailable</h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">{copy.notConfiguredText}</p>
      </div>
    );
  }
  if (state === "error") {
    return (
      <p className="mt-10 text-sm text-white/60 leading-relaxed">
        Your conversations could not be loaded. Please reload the page.
      </p>
    );
  }

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside>
        <button
          type="button"
          onClick={() => void newConversation()}
          className="w-full rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
        >
          New conversation
        </button>
        <ul className="mt-4 space-y-2">
          {conversations.map((c) => (
            <li
              key={c.id}
              className={`rounded-xl border p-3 ${
                c.id === activeId
                  ? "border-cyan-300/40 bg-cyan-300/[0.06]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <button
                type="button"
                onClick={() => void selectConversation(c.id)}
                className="block w-full text-left text-sm font-medium text-white/90"
              >
                {c.title}
              </button>
              <p className="mt-1 text-xs text-white/40">{c.updatedAt.slice(0, 10)}</p>
              <button
                type="button"
                onClick={() => void deleteConversation(c.id)}
                className="mt-1 text-xs text-white/40 hover:text-white/70"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        {conversations.length === 0 && (
          <p className="mt-4 text-sm text-white/50 leading-relaxed">
            No conversations yet. Conversations persist until you delete them.
          </p>
        )}
        {usage && (
          <div className="mt-6">
            <UsageDisplay usage={usage} />
          </div>
        )}
      </aside>

      <section>
        {messages.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-base font-semibold text-white">Start with a research question</h2>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">
              Ask about a provider, recipient, award, code, or published dataset.
              Every figure in an answer is cited to the tool result it came from.
            </p>
            <ul className="mt-4 space-y-2">
              {STARTER_QUESTIONS.map((s) => (
                <li key={s.question}>
                  <button
                    type="button"
                    onClick={() => setDraft(s.question)}
                    className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-white/75 hover:bg-white/5"
                  >
                    <span className="font-semibold text-cyan-200">{s.engine}: </span>
                    {s.question}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="space-y-4">
          {messages.map((m) => (
            <MessageView key={m.id} message={m} copy={copy} />
          ))}
          {sending && liveText && (
            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">
                Investigator · working…
              </p>
              <div className="mt-2 text-sm whitespace-pre-wrap text-white/85 leading-relaxed">
                {liveText}
              </div>
            </article>
          )}
        </div>
        {notice && (
          <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100/90 leading-relaxed">
            {notice}
          </p>
        )}
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="investigator-composer" className="text-sm font-medium text-white/80">
            Ask a research question
          </label>
          <textarea
            id="investigator-composer"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Name an entity by NPI or UEI, a code, or a published dataset…"
            className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={sending || draft.trim().length === 0}
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-40"
            >
              {sending ? "Researching…" : "Ask"}
            </button>
            <p className="text-xs text-white/40">
              Answers cite published records only. One question counts as one research
              operation against your monthly allowance.
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
