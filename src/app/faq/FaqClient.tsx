"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export type Faq = { q: string; a: React.ReactNode };

function FaqItem({ q, a }: Faq) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
      >
        <span className="font-medium text-white/90">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#D4AF37] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="px-6 pb-5 text-sm text-white/60 leading-relaxed space-y-2">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqAccordion({ groups }: { groups: { title: string; faqs: Faq[] }[] }) {
  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="text-xl md:text-2xl font-bold mb-5">
            <span className="text-[#D4AF37]">{g.title}</span>
          </h2>
          <div className="space-y-3">
            {g.faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
