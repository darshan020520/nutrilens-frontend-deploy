"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Check,
  Clock3,
  HeartHandshake,
  Layers3,
  Package,
  ScanSearch,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  WandSparkles,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   DESIGN DIRECTION: Editorial Precision
   
   Warm serif headlines (Fraunces) + clean sans body (DM Sans).
   Dark forest-green hero that feels premium, not SaaS-generic.
   Generous whitespace. Strong typographic hierarchy.
   Each section has its own visual identity.
   The product preview should feel alive and real.
   ═══════════════════════════════════════════════════════════════════ */

const EASE = [0.22, 1, 0.36, 1] as const;

const problemPoints = [
  { icon: Clock3, title: "Too many decisions", desc: "Planning meals, tracking calories, and shopping all compete for your attention." },
  { icon: Activity, title: "Progress feels unclear", desc: "You put in effort, but daily feedback rarely shows what's actually improving." },
  { icon: ShoppingBasket, title: "Food waste and rebuys", desc: "Pantry blind spots cause expiry losses, duplicate purchases, and rushed choices." },
  { icon: HeartHandshake, title: "Hard to stay consistent", desc: "Busy days break momentum when systems are rigid or hard to use quickly." },
];

const steps = [
  { id: 1, icon: ScanSearch, title: "Capture your real context", desc: "Your goals, dietary style, pantry state, and routine become one live profile." },
  { id: 2, icon: WandSparkles, title: "Generate an adaptive plan", desc: "NutriLens builds meal plans, alternatives, and shopping actions that fit your day." },
  { id: 3, icon: ShieldCheck, title: "Execute and auto-adjust", desc: "Log meals, swap fast, and use AI guidance to stay on track even when plans shift." },
];

const features = [
  { icon: Layers3, title: "Unified command center", desc: "Meals, tracking, inventory, and nutrition insights in one focused workflow." },
  { icon: Sparkles, title: "Intelligent meal flow", desc: "Generate, swap, skip, or log external meals with clear impact and recommendations." },
  { icon: Package, title: "Inventory intelligence", desc: "Low stock, expiry risk, receipt scanning, fuzzy add-items, and restock automation." },
  { icon: Activity, title: "Operational analytics", desc: "Daily adherence and macro trend visibility designed for quick decisions." },
  { icon: ShoppingBasket, title: "Closed shopping loop", desc: "From plan to grocery list to inventory update, all connected without manual friction." },
  { icon: WandSparkles, title: "AI recipe creativity", desc: "Generate recipes from available inventory in goal-aligned or guilt-free mode." },
];

const testimonials = [
  { name: "Aarav", role: "Product manager, parent", quote: "I finally have one calm system that keeps food, goals, and shopping aligned during packed weeks." },
  { name: "Maya", role: "Consultant, frequent traveler", quote: "Meal swaps and external logging made consistency realistic for my schedule, not theoretical." },
  { name: "Rohan", role: "Strength training enthusiast", quote: "The inventory and meal planning loop removed guesswork and reduced wasted food almost immediately." },
];

function useCountUp(target: number, dur = 1200): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px -10% 0px" });
  return (
    <motion.div ref={ref} className={className} initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.55, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "#1B7D5A" }}>
      <span className="inline-block h-[1.5px] w-5 rounded-full" style={{ background: "#1B7D5A" }} />
      {children}
    </p>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */

export default function Home() {
  const readiness = useCountUp(94, 1400);
  const adherence = useCountUp(87, 1600);
  const calsLeft = useCountUp(460, 1300);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const pxs = useSpring(px, { stiffness: 80, damping: 24, mass: 0.5 });
  const pys = useSpring(py, { stiffness: 80, damping: 24, mass: 0.5 });

  const heroMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - b.left) / b.width - 0.5) * 12);
    py.set(((e.clientY - b.top) / b.height - 0.5) * 8);
  };
  const heroLeave = () => { px.set(0); py.set(0); };

  const bars = [0.48, 0.62, 0.58, 0.74, 0.68, 0.82, 0.87];

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#FAFAF7", color: "#1a1a1a", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Global Fonts ── */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&display=swap" />

      {/* ══════════════════════════════════════════════════════════════
         HERO — Dark forest green, editorial serif, product preview
         ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(155deg, #0C3B2E 0%, #14533C 25%, #1B7D5A 55%, #1A6B4C 100%)" }}
        onMouseMove={heroMove}
        onMouseLeave={heroLeave}
      >
        {/* Texture */}
        <div className="pointer-events-none absolute inset-0 opacity-100" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.04) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 70% at 0% 100%, rgba(34,149,107,0.2), transparent 55%)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 60% at 100% 0%, rgba(255,255,255,0.03), transparent 45%)" }} />

        <div className="relative z-[1] mx-auto flex w-full max-w-[1140px] flex-col px-6 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">

          {/* Nav hint */}
          <motion.div className="mb-14 flex items-center justify-between"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: EASE }}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
                <span className="text-[15px] font-bold text-white" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>N</span>
              </div>
              <span className="text-[15px] font-semibold text-white/90">NutriLens</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="#how-it-works" className="hidden text-[13px] font-medium text-white/50 transition-colors hover:text-white/80 md:block">How it works</Link>
              <Link href="#features" className="hidden text-[13px] font-medium text-white/50 transition-colors hover:text-white/80 md:block">Features</Link>
              <Link href="/login" className="text-[13px] font-medium text-white/50 transition-colors hover:text-white/80">Log in</Link>
              <Link href="/register" className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white/90 transition-all" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}>
                Start Free
              </Link>
            </div>
          </motion.div>

          {/* Hero grid */}
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_0.88fr]">

            {/* Left — Copy */}
            <div className="space-y-8">
              <motion.div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                <Sparkles className="h-3 w-3" style={{ color: "#34D399" }} />
                Built for busy routines
              </motion.div>

              <div>
                <motion.h1
                  className="max-w-[540px]"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(2.4rem, 5.2vw, 3.6rem)", fontWeight: 500, lineHeight: 1.06, letterSpacing: "-0.025em", color: "#fff" }}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE, delay: 0.05 }}>
                  Stay on track with your eating, even on your busiest days.
                </motion.h1>
              </div>

              <motion.p className="max-w-[460px] text-[15.5px] leading-[1.65]"
                style={{ color: "rgba(255,255,255,0.5)" }}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}>
                NutriLens turns meal planning, tracking, pantry management, and nutrition guidance into one calm, modern flow.
              </motion.p>

              <motion.div className="flex flex-wrap items-center gap-4"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.22 }}>
                <Link href="/register" className="group inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[14px] font-semibold transition-all duration-200"
                  style={{ background: "#fff", color: "#14533C", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
                  Start Free
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <Link href="#how-it-works" className="group inline-flex items-center gap-1 text-[14px] font-medium transition-colors" style={{ color: "rgba(255,255,255,0.45)" }}>
                  <span className="border-b border-transparent transition-all group-hover:border-white/30 group-hover:text-white/70">See how it works</span>
                </Link>
              </motion.div>
            </div>

            {/* Right — Product Preview */}
            <motion.div className="relative" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}>
              <motion.div style={{ x: pxs, y: pys }}
                className="relative rounded-2xl p-5"
                {...{ style: { x: pxs, y: pys, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 20, padding: 24 } } as Record<string, unknown>}>

                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>Today Snapshot</p>
                  <span className="rounded-lg px-2.5 py-1 text-[11px] font-semibold" style={{ background: "rgba(52,211,153,0.12)", color: "#34D399" }}>On track</span>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: "Readiness", value: `${readiness}%` },
                    { label: "This week", value: `${adherence}%` },
                    { label: "Cals left", value: `${calsLeft}` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
                      <p className="mt-1 text-[22px] font-semibold text-white" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className="mt-4 rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>Adherence trend</p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>7 days</p>
                  </div>
                  <div className="flex h-16 items-end gap-1.5">
                    {bars.map((s, i) => (
                      <motion.div key={i} className="h-full w-full rounded-md"
                        style={{ originY: 1, background: `linear-gradient(to top, rgba(27,125,90,0.9), rgba(34,211,153,0.6))` }}
                        initial={{ scaleY: 0.15, opacity: 0.3 }} animate={{ scaleY: s, opacity: 1 }}
                        transition={{ duration: 0.5, ease: EASE, delay: 0.2 + i * 0.05 }} />
                    ))}
                  </div>
                </div>

                {/* Meal card */}
                <motion.div className="mt-3.5 rounded-xl p-3.5"
                  style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.1)" }}
                  whileHover={{ y: -2, scale: 1.01 }} transition={{ duration: 0.2, ease: EASE }}>
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>Lunch — High-protein bowl</p>
                    <span className="text-[11px] font-medium" style={{ color: "#34D399" }}>Ready</span>
                  </div>
                  <p className="mt-1 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>Macro aligned · 12 min prep · One tap to log</p>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Hero bottom fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24" style={{ background: "linear-gradient(to top, #FAFAF7, transparent)" }} />
      </section>

      {/* ══════════════════════════════════════════════════════════════
         PROBLEM — Why this exists
         ══════════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-[1140px] px-6 py-24 md:px-8 md:py-32">
        <Reveal>
          <SectionLabel>The everyday problem</SectionLabel>
          <h2 className="mt-4 max-w-[680px] text-[28px] font-medium leading-[1.15] tracking-[-0.02em] md:text-[36px]"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Healthy intent often fails because the system around it is fragmented.
          </h2>
          <p className="mt-4 max-w-[520px] text-[15px] leading-[1.7] text-slate-500">
            NutriLens is built for regular people with real schedules. It reduces friction at each decision point so consistency feels calm and practical.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-3 md:grid-cols-2">
          {problemPoints.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} delay={i * 0.06}>
                <div className="group rounded-2xl border border-slate-200/70 bg-white p-5 transition-all duration-250 hover:-translate-y-0.5 hover:border-emerald-200/60 hover:shadow-[0_12px_36px_rgba(0,0,0,0.05)]">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-600">
                    <Icon className="h-[17px] w-[17px]" />
                  </div>
                  <p className="text-[14.5px] font-semibold text-slate-900">{p.title}</p>
                  <p className="mt-1.5 text-[13.5px] leading-[1.6] text-slate-500">{p.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
         HOW IT WORKS — Numbered steps with visual distinction
         ══════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative mx-auto max-w-[1140px] px-6 py-20 md:px-8 md:py-28">
        {/* Subtle divider */}
        <div className="absolute left-6 right-6 top-0 h-px md:left-8 md:right-8" style={{ background: "linear-gradient(90deg, transparent, #d4d4d0, transparent)" }} />

        <Reveal>
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-4 max-w-[600px] text-[28px] font-medium leading-[1.15] tracking-[-0.02em] md:text-[36px]"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Three focused steps, designed for speed and consistency.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.id} delay={i * 0.08}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-6 transition-all duration-250 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
                  {/* Step number — large, faded */}
                  <span className="pointer-events-none absolute -right-2 -top-3 text-[72px] font-bold leading-none"
                    style={{ fontFamily: "'Fraunces', Georgia, serif", color: "rgba(27,125,90,0.05)" }}>
                    {step.id}
                  </span>
                  <div className="relative">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition-all duration-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:rotate-[4deg]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">Step {step.id}</p>
                    <h3 className="mt-1 text-[17px] font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-2 text-[13.5px] leading-[1.6] text-slate-500">{step.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
         FEATURES — 2-column grid, distinctive
         ══════════════════════════════════════════════════════════════ */}
      <section id="features" className="relative" style={{ background: "#F3F3EE" }}>
        <div className="mx-auto max-w-[1140px] px-6 py-24 md:px-8 md:py-32">
          <Reveal>
            <SectionLabel>Capabilities</SectionLabel>
            <h2 className="mt-4 max-w-[640px] text-[28px] font-medium leading-[1.15] tracking-[-0.02em] md:text-[36px]"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Premium execution surfaces for every nutrition workflow.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-3 md:grid-cols-2">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={(i % 2) * 0.06}>
                  <div className="group relative h-full overflow-hidden rounded-2xl border border-white/80 bg-white/70 p-5 backdrop-blur-sm transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(0,0,0,0.05)]">
                    {/* Hover gradient */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-250 group-hover:opacity-100"
                      style={{ background: "linear-gradient(135deg, rgba(27,125,90,0.04), transparent 60%)" }} />
                    <div className="relative">
                      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 bg-white text-slate-600 transition-colors duration-200 group-hover:text-emerald-600">
                        <Icon className="h-[17px] w-[17px]" />
                      </div>
                      <h3 className="text-[15.5px] font-semibold text-slate-900">{f.title}</h3>
                      <p className="mt-1.5 max-w-[420px] text-[13.5px] leading-[1.6] text-slate-500">{f.desc}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
         SOCIAL PROOF — Clean testimonials
         ══════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-[1140px] px-6 py-24 md:px-8 md:py-32">
        <Reveal>
          <SectionLabel>People using NutriLens</SectionLabel>
          <h2 className="mt-4 max-w-[600px] text-[28px] font-medium leading-[1.15] tracking-[-0.02em] md:text-[36px]"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Trusted by people who need clarity in real life, not perfect conditions.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-slate-200/70 bg-white p-5 transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(0,0,0,0.05)]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-slate-900">{t.name}</p>
                    <p className="text-[12px] text-slate-400">{t.role}</p>
                  </div>
                </div>
                <p className="text-[14px] leading-[1.65] text-slate-600">&ldquo;{t.quote}&rdquo;</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
         FINAL CTA — Dark band, confident, magnetic
         ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(155deg, #0C3B2E 0%, #14533C 40%, #1B7D5A 100%)" }}>
        {/* Texture */}
        <div className="pointer-events-none absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.03) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 80% at 50% 0%, rgba(52,211,153,0.15), transparent 60%)" }} />

        <div className="relative z-[1] mx-auto max-w-[720px] px-6 py-20 text-center md:px-8 md:py-28">
          <Reveal>
            <h2 className="text-[28px] font-medium leading-[1.12] tracking-[-0.02em] text-white md:text-[40px]"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              A modern nutrition system that feels calm, fast, and reliable from day one.
            </h2>
            <p className="mx-auto mt-4 max-w-[480px] text-[15px] leading-[1.65]" style={{ color: "rgba(255,255,255,0.5)" }}>
              Start free, set your profile, and let NutriLens handle the operational complexity while you focus on results.
            </p>

            <motion.div className="mt-10 inline-block"
              animate={{ boxShadow: ["0 0 0 0 rgba(52,211,153,0.15)", "0 0 0 16px rgba(52,211,153,0)", "0 0 0 0 rgba(52,211,153,0.15)"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
              <Link href="/register" className="group inline-flex items-center gap-2 rounded-xl px-8 py-4 text-[15px] font-semibold transition-all duration-200"
                style={{ background: "#fff", color: "#14533C", boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
                Start Free
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mx-auto max-w-[1140px] px-6 py-10 md:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
              <span className="text-[11px] font-bold text-white" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>N</span>
            </div>
            <span className="text-[13px] font-semibold text-slate-700">NutriLens</span>
          </div>
          <p className="text-[12px] text-slate-400">Built for real routines, not perfect conditions.</p>
        </div>
      </footer>
    </div>
  );
}