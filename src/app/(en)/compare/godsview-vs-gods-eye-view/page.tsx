import type { Metadata } from "next";
import PairComparePage, { pairMetadata } from "../PairCompare";

const SLUG = "godsview-vs-gods-eye-view";

export function generateMetadata(): Metadata {
  return pairMetadata(SLUG);
}

export default function Page() {
  return <PairComparePage slug={SLUG} />;
}
