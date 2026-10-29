import type { Metadata } from "next";
import PairComparePage, { pairMetadata } from "../PairCompare";

const SLUG = "gods-eye-view-vs-world-monitor";

export function generateMetadata(): Metadata {
  return pairMetadata(SLUG);
}

export default function Page() {
  return <PairComparePage slug={SLUG} />;
}
