/**
 * Report types for the admin "Onboarding & Activation" section.
 * Kept dependency-free so the client component can `import type` from
 * here without pulling server code into the browser bundle.
 * The producer is src/lib/analytics/onboarding.ts.
 */

export interface OnboardingFilters {
  /** Inclusive range start (ISO). */
  from: string;
  /** Exclusive range end (ISO). */
  to: string;
  preset: string;
  source: string | null;
  landing: string | null;
  device: string | null;
}

export interface StepStat {
  step: number;
  /** Sessions with onboarding_step_complete:<step>. */
  completed: number;
  /** Sessions with onboarding_step_skip:<step>. */
  skipped: number;
  /** Sessions that reached this step (touched it or any later step). */
  reached: number;
  /**
   * Sessions that started the tour, never completed it, and whose last
   * touched step was this one (explicit onboarding_dropoff:<step> when
   * emitted, otherwise inferred from the last step event).
   */
  droppedOff: number;
}

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  /** % of the previous step, null for the first step. */
  pctFromPrevious: number | null;
  /** Honesty label, e.g. "site-wide — not joined to sessions". */
  note: string | null;
}

export interface DurationBucket {
  key: string;
  label: string;
  sessions: number;
  avgSec: number | null;
  medianSec: number | null;
}

export interface VariantRow {
  variant: string;
  label: string;
  sessions: number;
  activationRate: number | null;
  avgDurationSec: number | null;
  medianDurationSec: number | null;
  avgFeaturesPerSession: number | null;
  proCtr: number | null;
  /** Signed-in visitors only (see report notes). */
  returnRate: number | null;
  returnBase: number;
  /** Paid subscriptions attributable via signed-in user match. */
  paidAttributed: number;
  enoughData: boolean;
}

export interface OnboardingReport {
  generatedAt: string;
  filters: OnboardingFilters;
  /** Filter vocabularies present in the selected range (pre-filter). */
  availableSources: string[];
  availableLandings: string[];
  /** True once at least one onboarding event exists in range. */
  hasOnboardingData: boolean;
  totals: {
    sessions: number;
    impressions: number;
    starts: number;
    /** starts / impressions */
    startRate: number | null;
    completions: number;
    /** completions / starts */
    completionRate: number | null;
    dismissals: number;
    /** Sessions with at least one step skip. */
    skipSessions: number;
    /** skipSessions / starts */
    skipRate: number | null;
    /** Sessions with any conversion_shown event. */
    conversionShown: number;
    conversionClickPro: number;
    conversionDismiss: number;
    medianTimeInTutorialSec: number | null;
    avgTimeInTutorialSec: number | null;
    /** Sessions with a measurable start→end tutorial span. */
    timedTutorialSessions: number;
  };
  steps: StepStat[];
  /** Sessions whose first-use milestones happened (any time in session). */
  firsts: {
    globe: number;
    camera: number;
    flight: number;
    satellite: number;
    layer: number;
  };
  /** Sessions that viewed /pricing, split by onboarding status bucket. */
  pricingByStatus: { key: string; label: string; sessions: number }[];
  funnel: FunnelStep[];
  subscriptions: {
    /** Subscriptions created in range still in `trialing` status. */
    trialsStarted: number;
    trialsAttributed: number;
    /** Subscriptions created in range with status `active` and a real paid price. */
    paidStarted: number;
    paidAttributed: number;
  };
  durationsByStatus: DurationBucket[];
  variants: VariantRow[];
  returns: {
    signedInVisitors: number;
    returningVisitors: number;
    rate: number | null;
  };
  /** Plain-language honesty notes rendered as footnotes in the admin UI. */
  notes: string[];
}
