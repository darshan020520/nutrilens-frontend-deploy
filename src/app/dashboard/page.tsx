"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { MealsCard } from "./components/MealsCard";
import { MacrosCard } from "./components/MacrosCard";
import { InventoryCard } from "./components/InventoryCard";
import { GoalCard } from "./components/GoalCard";
import { QuickActions } from "./components/QuickActions";
import { RecentActivity } from "./components/RecentActivity";
import { useDashboard } from "./hooks/useDashboard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPageLoader, useInitialPageLoader } from "@/shared/components/states/DashboardPageLoader";
import { motion } from "framer-motion";

const DASHBOARD_WELCOME_KEY = "nutrilens:onboarding:dashboard-welcome";
const DASHBOARD_LOGIN_WELCOME_KEY = "nutrilens:dashboard:login-welcome";
const ONBOARDING_FIRST_NAME_KEY = "nutrilens:onboarding:first-name";
const FIRST_MEAL_PULSE_KEY = "nutrilens:dashboard:first-meal-cta-pulse";

function getTimeOfDayLabel(date: Date): "morning" | "afternoon" | "evening" {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { summary, activity, isLoading, error, refetch } = useDashboard();
  const { showLoader: showInitialLoader, isExiting: isLoaderExiting } = useInitialPageLoader(!isLoading, {
    showDelayMs: 0,
    minVisibleMs: 520,
    exitMs: 200,
  });

  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const [welcomeCalories, setWelcomeCalories] = useState<number | null>(null);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [welcomeBannerType, setWelcomeBannerType] = useState<"onboarding" | "login" | null>(null);
  const [showBridgeOverlay, setShowBridgeOverlay] = useState(false);
  const [bridgeFadeOut, setBridgeFadeOut] = useState(false);
  const [displayedRemainingCalories, setDisplayedRemainingCalories] = useState(0);
  const [calorieUnderlineVisible, setCalorieUnderlineVisible] = useState(false);
  const [highlightFirstMealCta, setHighlightFirstMealCta] = useState(false);

  const timersRef = useRef<number[]>([]);
  const caloriesAnimationFrameRef = useRef<number | null>(null);
  const hasAnimatedCaloriesRef = useRef(false);

  const welcomeTitle = useMemo(
    () => (welcomeName ? `Welcome, ${welcomeName}.` : "Welcome."),
    [welcomeName]
  );
  const welcomeBannerTitle = useMemo(() => {
    if (welcomeBannerType === "login") {
      return welcomeName ? `Welcome back, ${welcomeName}.` : "Welcome back.";
    }
    return welcomeTitle;
  }, [welcomeBannerType, welcomeName, welcomeTitle]);
  const welcomeBannerDescription = useMemo(() => {
    if (welcomeBannerType === "login") {
      return "You're signed in and your dashboard is ready.";
    }
    return "Your targets are locked and ready.";
  }, [welcomeBannerType]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let parsedName = "";
    let parsedCalories: number | null = null;
    let fromOnboarding = false;
    const showLoginBanner = !!window.sessionStorage.getItem(DASHBOARD_LOGIN_WELCOME_KEY);

    const raw = window.sessionStorage.getItem(DASHBOARD_WELCOME_KEY);
    if (raw) {
      fromOnboarding = true;

      try {
        const payload = JSON.parse(raw) as { firstName?: string; calories?: number };
        parsedName = typeof payload.firstName === "string" ? payload.firstName.trim() : "";
        parsedCalories = typeof payload.calories === "number" ? Math.round(payload.calories) : null;
      } catch {
        parsedName = "";
        parsedCalories = null;
        fromOnboarding = false;
        window.sessionStorage.removeItem(DASHBOARD_WELCOME_KEY);
      }
    } else {
      const fallbackName = window.sessionStorage.getItem(ONBOARDING_FIRST_NAME_KEY);
      parsedName = typeof fallbackName === "string" ? fallbackName.trim() : "";
    }

    setWelcomeName(parsedName);
    setWelcomeCalories(parsedCalories);

    if (fromOnboarding) {
      setWelcomeBannerType("onboarding");
      setShowBridgeOverlay(true);
      setBridgeFadeOut(false);
      setIsDashboardVisible(false);
      if (showLoginBanner) {
        window.sessionStorage.removeItem(DASHBOARD_LOGIN_WELCOME_KEY);
      }

      const startFadeTimer = window.setTimeout(() => {
        setBridgeFadeOut(true);
        setIsDashboardVisible(true);
        setShowWelcomeBanner(true);

        const removeOverlayTimer = window.setTimeout(() => {
          setShowBridgeOverlay(false);
          window.sessionStorage.removeItem(DASHBOARD_WELCOME_KEY);
        }, 500);
        timersRef.current.push(removeOverlayTimer);
      }, 1200);

      timersRef.current.push(startFadeTimer);
    } else {
      setShowBridgeOverlay(false);
      setBridgeFadeOut(false);
      setWelcomeBannerType(showLoginBanner ? "login" : null);
      const rafId = window.requestAnimationFrame(() => {
        setIsDashboardVisible(true);
        setShowWelcomeBanner(showLoginBanner);
      });
      timersRef.current.push(rafId);
      if (showLoginBanner) {
        window.sessionStorage.removeItem(DASHBOARD_LOGIN_WELCOME_KEY);
      }
    }

    return () => {
      timersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
        window.cancelAnimationFrame(timerId);
      });
      timersRef.current = [];
      if (caloriesAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(caloriesAnimationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showWelcomeBanner) return;

    const dismissBanner = () => {
      setShowWelcomeBanner(false);
    };

    const autoDismissTimer = window.setTimeout(() => {
      setShowWelcomeBanner(false);
    }, 4000);

    window.addEventListener("pointerdown", dismissBanner, { once: true, passive: true });
    window.addEventListener("keydown", dismissBanner, { once: true });
    window.addEventListener("wheel", dismissBanner, { once: true, passive: true });

    return () => {
      window.clearTimeout(autoDismissTimer);
      window.removeEventListener("pointerdown", dismissBanner);
      window.removeEventListener("keydown", dismissBanner);
      window.removeEventListener("wheel", dismissBanner);
    };
  }, [showWelcomeBanner]);

  const remainingCalories = Math.max(
    0,
    (summary?.macros_card.calories_target ?? 0) - (summary?.macros_card.calories_consumed ?? 0)
  );
  const roundedRemainingCalories = Math.round(remainingCalories);
  const timeOfDay = useMemo(() => getTimeOfDayLabel(new Date()), []);
  const personalizedGreeting = welcomeName
    ? `Good ${timeOfDay}, ${welcomeName}.`
    : `Good ${timeOfDay}.`;

  useEffect(() => {
    if (isLoading) return;

    if (!hasAnimatedCaloriesRef.current) {
      const target = roundedRemainingCalories;
      const durationMs = 800;
      const startAt = performance.now();

      const animate = (now: number) => {
        const progress = Math.min((now - startAt) / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayedRemainingCalories(Math.round(target * eased));
        if (progress < 1) {
          caloriesAnimationFrameRef.current = window.requestAnimationFrame(animate);
          return;
        }
        hasAnimatedCaloriesRef.current = true;
        setCalorieUnderlineVisible(true);
      };

      caloriesAnimationFrameRef.current = window.requestAnimationFrame(animate);
      return;
    }

    setDisplayedRemainingCalories(roundedRemainingCalories);
  }, [isLoading, roundedRemainingCalories]);

  useEffect(() => {
    if (!summary) return;
    if (summary.meals_card.meals_planned > 0 || summary.meals_card.meals_consumed > 0) return;
    if (typeof window === "undefined") return;
    const alreadyPulsed = window.localStorage.getItem(FIRST_MEAL_PULSE_KEY);
    if (alreadyPulsed) return;

    setHighlightFirstMealCta(true);
    window.localStorage.setItem(FIRST_MEAL_PULSE_KEY, "1");
    const pulseTimer = window.setTimeout(() => {
      setHighlightFirstMealCta(false);
    }, 1400);

    return () => {
      window.clearTimeout(pulseTimer);
    };
  }, [summary]);

  return (
    <DashboardLayout>
      {/* ── Custom animations & overrides ── */}
      <style>{`
        @keyframes nl-hero-shine {
          0% { background-position: -200% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes nl-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes nl-scale-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes nl-underline-grow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .nl-stagger-1 { animation: nl-fade-up 0.45s ease both; animation-delay: 0.06s; }
        .nl-stagger-2 { animation: nl-fade-up 0.45s ease both; animation-delay: 0.12s; }
        .nl-stagger-3 { animation: nl-fade-up 0.45s ease both; animation-delay: 0.18s; }
        .nl-stagger-4 { animation: nl-fade-up 0.45s ease both; animation-delay: 0.24s; }
        .nl-stagger-5 { animation: nl-fade-up 0.45s ease both; animation-delay: 0.30s; }
        .nl-stagger-6 { animation: nl-fade-up 0.45s ease both; animation-delay: 0.36s; }

        .nl-hero-card {
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.12);
        }
        .nl-hero-card:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.18);
        }

        .nl-hero-btn {
          background: #fff;
          color: #166534;
          box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }
        .nl-hero-btn:hover {
          background: #f0fdf4;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          transform: translateY(-1px);
        }

        .nl-card-grid > * {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .nl-card-grid > *:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.06);
        }

        .nl-dot-pattern {
          background-image:
            radial-gradient(circle at 15% 85%, rgba(255,255,255,0.06) 1px, transparent 1px),
            radial-gradient(circle at 85% 15%, rgba(255,255,255,0.06) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px, 48px 48px, 24px 24px;
        }
      `}</style>

      {/* ── Page loader (shown while data fetches, bridge overlay renders above it) ── */}
      {showInitialLoader && (
        <div className="space-y-8">
          <DashboardPageLoader scene="home" isExiting={isLoaderExiting} />
        </div>
      )}

      {/* ── Error state ── */}
      {!showInitialLoader && error && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>Failed to load dashboard data</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* ── Main dashboard content ── */}
      {!showInitialLoader && !error && (
      <div
        className={cn(
          "space-y-5 transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          isDashboardVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
      >
        {/* ── Welcome banner (onboarding transition) — always in DOM, CSS-driven show/hide ── */}
        <section
          className={cn(
            "overflow-hidden rounded-[18px] border border-emerald-200/70 bg-[linear-gradient(120deg,rgba(236,253,245,0.96)_0%,rgba(240,253,250,0.94)_55%,rgba(255,247,237,0.9)_100%)] transition-[max-height,opacity,padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            showWelcomeBanner
              ? "max-h-36 px-5 py-4 opacity-100"
              : "max-h-0 px-5 py-0 opacity-0"
          )}
          aria-hidden={!showWelcomeBanner}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-[0_4px_16px_-10px_rgba(16,185,129,0.4)]">
              <BadgeCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold tracking-[-0.015em] text-slate-900">{welcomeBannerTitle}</p>
              <p className="mt-0.5 text-[13px] text-slate-600">{welcomeBannerDescription}</p>
            </div>
            <span className="rounded-full border border-emerald-200/90 bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
              {welcomeBannerType === "login" ? "Signed in" : "Onboarding complete"}
            </span>
          </div>
        </section>

        {/* ── Hero Banner ── */}
        <section
          className="nl-stagger-1 relative overflow-hidden rounded-[20px]"
          style={{
            background: "linear-gradient(135deg, #14533C 0%, #166534 30%, #1B7D5A 60%, #22956B 100%)",
          }}
        >
          {/* Dot texture overlay */}
          <div className="nl-dot-pattern pointer-events-none absolute inset-0" />

          {/* Subtle radial glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 60% 80% at 0% 100%, rgba(34,149,107,0.3), transparent 60%)",
            }}
          />

          <div className="relative z-[1] flex flex-col gap-6 p-7 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="space-y-2">
              <p
                className="text-[11px] font-medium uppercase tracking-[1.2px]"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Daily Command Center
              </p>
              <h1
                className="text-[30px] font-medium leading-[1.15] tracking-[-0.5px] text-white md:text-[34px]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {personalizedGreeting}
              </h1>
              <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                You have{" "}
                <span className="font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {roundedRemainingCalories.toLocaleString()} kcal
                </span>{" "}
                remaining today.
              </p>
            </div>

            {/* Calories card — glass morphism */}
            <div className="nl-hero-card min-w-[200px] rounded-2xl p-5 text-right transition-all duration-200 md:min-w-[220px]">
              <p
                className="text-[10.5px] font-medium uppercase tracking-[0.5px]"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Remaining
              </p>
              <p
                className="mt-1 text-[36px] font-semibold leading-none tracking-tight text-white md:text-[40px]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {displayedRemainingCalories.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                kcal today
              </p>

              {/* Animated underline */}
              <div
                className={cn(
                  "mx-auto mt-2 h-[2.5px] w-full origin-left rounded-full transition-transform duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
                  calorieUnderlineVisible ? "scale-x-100" : "scale-x-0"
                )}
                style={{
                  background: "linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.4), rgba(255,255,255,0.15))",
                }}
              />

              <button
                className="nl-hero-btn mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[10px] px-5 py-[9px] text-[13px] font-semibold transition-all duration-200"
                onClick={() => router.push("/dashboard/meals?tab=today")}
              >
                Continue Today
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* ── Summary Cards Grid ── */}
        <div className="nl-card-grid nl-stagger-2 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MealsCard data={summary?.meals_card} isLoading={isLoading} pulseFirstAction={highlightFirstMealCta} />
          <MacrosCard data={summary?.macros_card} isLoading={isLoading} />
          <InventoryCard data={summary?.inventory_card} isLoading={isLoading} />
          <GoalCard data={summary?.goal_card} isLoading={isLoading} />
        </div>

        {/* ── Quick Actions ── */}
        <div className="nl-stagger-4">
          <QuickActions />
        </div>

        {/* ── Recent Activity ── */}
        <div className="nl-stagger-5">
          <RecentActivity data={activity} isLoading={isLoading} />
        </div>
      </div>
      )}

      {/* ── Bridge Overlay (onboarding → dashboard transition) — always in DOM ── */}
      {/* Always rendered so CSS opacity transition works reliably without a useEffect tick delay. */}
      <div
        className="fixed inset-0 z-40 flex items-center justify-center px-6"
        style={{
          opacity: showBridgeOverlay ? (bridgeFadeOut ? 0 : 1) : 0,
          pointerEvents: showBridgeOverlay && !bridgeFadeOut ? "auto" : "none",
          transition: bridgeFadeOut ? "opacity 550ms ease-in-out" : "none",
          background: "linear-gradient(160deg, #edfdf4 0%, #f8fffe 40%, #f0faf5 100%)",
        }}
      >
        {/* Only render animated content while the overlay is active — resets animations on each open */}
        {showBridgeOverlay && (
          <>
            <div
              className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: "rgba(16,185,129,0.22)" }}
            />
            <div
              className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full blur-3xl"
              style={{ background: "rgba(20,184,166,0.14)" }}
            />

            <div className="relative text-center">
              <motion.h2
                className="text-3xl font-medium tracking-[-0.025em] text-slate-900 md:text-[42px]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              >
                {welcomeName ? `Welcome, ${welcomeName}.` : "Welcome."}
              </motion.h2>

              <motion.p
                className="mt-3 text-[15px] text-slate-600"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1], delay: 0.26 }}
              >
                {welcomeCalories !== null
                  ? `Your daily target is set to ${welcomeCalories.toLocaleString()} kcal.`
                  : "Your daily target is set and ready."}
              </motion.p>

              <motion.p
                className="mt-1.5 text-sm text-slate-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.44 }}
              >
                Let&apos;s start strong.
              </motion.p>

              <motion.div
                className="mx-auto mt-6 h-px rounded-full"
                style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)" }}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 120, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
              />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
