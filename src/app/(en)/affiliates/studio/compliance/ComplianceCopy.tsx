"use client";
// Tiny client wrapper so the server-rendered compliance page can offer
// one-click copy for the disclosure snippets.
import { CopyButton } from "@/components/affiliate/ui";

export default function ComplianceCopy({ text, label }: { text: string; label?: string }) {
  return <CopyButton text={text} label={label ?? "Copy"} />;
}
