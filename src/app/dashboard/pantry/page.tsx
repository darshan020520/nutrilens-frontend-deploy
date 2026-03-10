"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, Plus, Search, Trash2, Weight } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardPageLoader, useInitialPageLoader } from "@/shared/components/states/DashboardPageLoader";
import { useDeleteItem, useInventoryItems, useInventoryStatus, useMakeableRecipes } from "../inventory/hooks/useInventory";
import { useExpiringItems, useRestockList } from "../inventory/hooks/useTracking";
import AddItemsDialog from "../inventory/components/AddItemsDialog";
import ReceiptUpload from "../inventory/components/ReceiptUpload";
import { FilterOptions, InventoryItem } from "../inventory/types";

type MakeableResponse = {
  fully_makeable?: unknown[];
};

const AI_SHOWN_SESSION_KEY = "pantry_ai_shown";
const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const CATEGORY_CHIP = "rounded-lg bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700";

function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`;
  return `${Math.round(grams)} g`;
}

function getSignalRingClass(variant: "low" | "soon" | "fresh"): string {
  if (variant === "low") return "bg-[conic-gradient(#E57373_0%_25%,transparent_25%_100%)]";
  if (variant === "soon") return "bg-[conic-gradient(#E6A23C_0%_40%,transparent_40%_100%)]";
  return "bg-[conic-gradient(#5A9A7E_0%_80%,transparent_80%_100%)]";
}

function getUseSoonRingVariant(daysRemaining: number): "low" | "soon" | "fresh" {
  if (daysRemaining <= 1) return "low";
  if (daysRemaining <= 3) return "soon";
  return "fresh";
}

function getFreshnessText(daysUntilExpiry: number | null): string {
  if (daysUntilExpiry === null) return "Freshness window not available";
  if (daysUntilExpiry < 0) {
    const expiredDaysAgo = Math.abs(daysUntilExpiry);
    return `Expired ${expiredDaysAgo} day${expiredDaysAgo === 1 ? "" : "s"} ago`;
  }
  if (daysUntilExpiry === 0) return "Expires today";
  if (daysUntilExpiry === 1) return "Fresh for 1 more day";
  return `Fresh for ${daysUntilExpiry} more days`;
}

function getFreshnessMeta(daysUntilExpiry: number | null): { fillClass: string; width: number } {
  if (daysUntilExpiry === null) return { fillClass: "bg-gradient-to-r from-[#1B7D5A] to-[#22956B]", width: 32 };
  if (daysUntilExpiry < 0) return { fillClass: "bg-gradient-to-r from-[#DC2626] to-[#F97316]", width: 12 };
  if (daysUntilExpiry === 0) return { fillClass: "bg-gradient-to-r from-[#E6A23C] to-[#F59E0B]", width: 20 };
  if (daysUntilExpiry < 3) return { fillClass: "bg-gradient-to-r from-[#1B7D5A] to-[#22956B]", width: Math.max(18, Math.min(36, daysUntilExpiry * 10 + 10)) };
  if (daysUntilExpiry <= 7) return { fillClass: "bg-gradient-to-r from-[#1B7D5A] to-[#22956B]", width: Math.max(42, Math.min(76, (daysUntilExpiry / 7) * 76)) };
  return { fillClass: "bg-gradient-to-r from-[#1B7D5A] to-[#22956B]", width: Math.max(78, Math.min(100, (daysUntilExpiry / 14) * 100)) };
}

function getHealthMessage(score: number): string {
  if (score > 80) return "Stable";
  return "Needs attention";
}

function formatCategoryLabel(category: string): string {
  return category
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function PantryPageContent() {
  const searchParams = useSearchParams();
  const heroRef = useRef<HTMLElement | null>(null);

  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [receiptUploadOpen, setReceiptUploadOpen] = useState(false);
  const [queryHandled, setQueryHandled] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [expiringDays, setExpiringDays] = useState<number>(3);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isAIActive, setIsAIActive] = useState(false);
  const [isAITabInvite, setIsAITabInvite] = useState(false);
  const [isInstantClosingAI, setIsInstantClosingAI] = useState(false);
  const [aiStreamText, setAiStreamText] = useState("");
  const [activeRecommendationIdx, setActiveRecommendationIdx] = useState(0);
  const aiStreamStartTimerRef = useRef<number | null>(null);
  const aiStreamCharTimerRef = useRef<number | null>(null);
  const aiFoldTimerRef = useRef<number | null>(null);
  const aiAutoOpenTimerRef = useRef<number | null>(null);
  const hasAttemptedAutoOpenRef = useRef(false);
  const aiShouldAutoFoldRef = useRef(false);
  const aiInsightTextRef = useRef("");

  const queryFilters: FilterOptions = {
    category: category === "all" ? undefined : category,
    lowStockOnly: false,
    expiringSoon: false,
  };

  const { data: inventoryStatus, isLoading: inventoryStatusLoading, error: inventoryStatusError } = useInventoryStatus();
  const { data: inventoryItemsData, isLoading: inventoryItemsLoading, error: inventoryItemsError } = useInventoryItems(queryFilters);
  const { data: expiringData, isLoading: expiringLoading, error: expiringError, refetch: refetchExpiring } = useExpiringItems(expiringDays);
  const { data: restockData, isLoading: restockLoading, error: restockError } = useRestockList();
  const { data: makeableDataRaw } = useMakeableRecipes(8);
  const deleteItem = useDeleteItem();

  const isCoreDataReady =
    !inventoryStatusLoading &&
    !inventoryItemsLoading &&
    !expiringLoading &&
    !restockLoading;
  const { showLoader: showInitialLoader, isExiting: isLoaderExiting } = useInitialPageLoader(isCoreDataReady, {
    showDelayMs: 0,
    minVisibleMs: 560,
    exitMs: 200,
  });

  useEffect(() => {
    if (queryHandled) return;
    if (searchParams.get("openAddModal") === "true") setAddItemsOpen(true);
    if (searchParams.get("openReceiptModal") === "true") setReceiptUploadOpen(true);
    setQueryHandled(true);
  }, [queryHandled, searchParams]);

  const totalWeight = inventoryStatus?.total_weight_g ?? 0;
  const totalItems = inventoryStatus?.total_items ?? 0;
  const expiringSoonCount = (expiringData?.items ?? []).length;
  const runningLowCount = (inventoryStatus?.low_stock ?? []).length;

  const pantryHealthScore = useMemo(() => {
    const expiringSoon = inventoryStatus?.expiring_soon ?? [];
    const oneDayCount = expiringSoon.filter((item) => {
      const d = item.days_until_expiry ?? 99;
      return d <= 1;
    }).length;
    const threeDayCount = expiringSoon.filter((item) => {
      const d = item.days_until_expiry ?? 99;
      return d > 1 && d <= 3;
    }).length;
    const lowStock = inventoryStatus?.low_stock?.length ?? 0;
    const raw = 100 - oneDayCount * 10 - threeDayCount * 5 - lowStock * 2;
    return Math.max(0, Math.min(100, raw));
  }, [inventoryStatus?.expiring_soon, inventoryStatus?.low_stock]);

  useEffect(() => {
    setAnimatedScore(0);
    const rafId = window.requestAnimationFrame(() => setAnimatedScore(pantryHealthScore));
    return () => window.cancelAnimationFrame(rafId);
  }, [pantryHealthScore]);

  const expiringInventoryIds = useMemo(() => {
    return new Set((expiringData?.items ?? []).map((item) => item.inventory_id));
  }, [expiringData?.items]);

  const filteredItems = useMemo(() => {
    let items = inventoryItemsData?.items ?? [];

    if (showExpiringOnly) {
      items = items.filter((item) => expiringInventoryIds.has(item.id));
    }

    if (!search.trim()) return items;
    const needle = search.trim().toLowerCase();
    return items.filter((item) => item.item_name.toLowerCase().includes(needle));
  }, [expiringInventoryIds, inventoryItemsData?.items, search, showExpiringOnly]);

  const categories = useMemo(() => {
    return Object.keys(inventoryStatus?.categories ?? {}).sort((a, b) => a.localeCompare(b));
  }, [inventoryStatus?.categories]);

  const makeableData = makeableDataRaw as MakeableResponse | undefined;
  const readyRecipeCount = Array.isArray(makeableData?.fully_makeable) ? makeableData.fully_makeable.length : 0;

  const expiringPreview = useMemo(() => {
    return [...(expiringData?.items ?? [])].sort((a, b) => a.days_remaining - b.days_remaining).slice(0, 3);
  }, [expiringData?.items]);

  const runningLowPreview = useMemo(() => {
    return (restockData?.urgent_items ?? []).slice(0, 3);
  }, [restockData?.urgent_items]);

  const expiringRecommendations = useMemo(() => {
    return (expiringData?.action_recommendations ?? []).slice(0, 3);
  }, [expiringData?.action_recommendations]);

  const heroAiLines = useMemo(() => {
    const aiLines = (inventoryStatus?.ai_recommendations ?? [])
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 4);

    if (aiLines.length > 0) return aiLines;

    const fallback = [
      `${expiringSoonCount} item${expiringSoonCount === 1 ? "" : "s"} need expiry attention soon.`,
      `${runningLowCount} staple${runningLowCount === 1 ? "" : "s"} are running low.`,
      `${totalItems} tracked ingredients are currently shaping your kitchen plan.`,
      `Pantry health is ${pantryHealthScore}% right now.`
    ];

    return fallback;
  }, [expiringSoonCount, inventoryStatus?.ai_recommendations, pantryHealthScore, runningLowCount, totalItems]);

  const aiInsightText = useMemo(() => heroAiLines.join("\n\n"), [heroAiLines]);

  useEffect(() => {
    aiInsightTextRef.current = aiInsightText;
  }, [aiInsightText]);

  useEffect(() => {
    if (!showExpiringOnly || expiringRecommendations.length === 0) {
      setActiveRecommendationIdx(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveRecommendationIdx((prev) => (prev + 1) % expiringRecommendations.length);
    }, 2800);

    return () => window.clearInterval(intervalId);
  }, [expiringRecommendations.length, showExpiringOnly]);

  const heroHeadline = useMemo(() => {
    if (runningLowCount >= 4) return "You're running low on staples.";
    if (expiringSoonCount > 0) return "A few essentials need attention.";
    if (readyRecipeCount > 0) return "Your kitchen is stocked and ready.";
    if (totalItems > 0) return "Fresh ingredients, ready to cook.";
    return "Your pantry journey starts here.";
  }, [expiringSoonCount, readyRecipeCount, runningLowCount, totalItems]);

  const onDeleteItem = (item: InventoryItem) => {
    if (!confirm(`Remove "${item.item_name}" from pantry?`)) return;
    deleteItem.mutate(item.id);
  };

  const onToggleExpiringFilter = () => {
    const next = !showExpiringOnly;
    setShowExpiringOnly(next);
    if (next) {
      void refetchExpiring();
    }
  };

  const clearAIStreamTimers = useCallback(() => {
    if (aiAutoOpenTimerRef.current !== null) {
      window.clearTimeout(aiAutoOpenTimerRef.current);
      aiAutoOpenTimerRef.current = null;
    }
    if (aiStreamStartTimerRef.current !== null) {
      window.clearTimeout(aiStreamStartTimerRef.current);
      aiStreamStartTimerRef.current = null;
    }
    if (aiStreamCharTimerRef.current !== null) {
      window.clearTimeout(aiStreamCharTimerRef.current);
      aiStreamCharTimerRef.current = null;
    }
    if (aiFoldTimerRef.current !== null) {
      window.clearTimeout(aiFoldTimerRef.current);
      aiFoldTimerRef.current = null;
    }
  }, []);

  const streamText = useCallback((text: string, onComplete?: () => void) => {
    setAiStreamText("");

    let charIndex = 0;
    const chars = Array.from(text);

    const typeNextChar = () => {
      if (charIndex >= chars.length) {
        aiStreamCharTimerRef.current = null;
        onComplete?.();
        return;
      }

      const currentChar = chars[charIndex];
      setAiStreamText((prev) => prev + currentChar);

      let delay = 5;
      if (currentChar === ",") delay = 20;
      if (currentChar === ".") delay = 50;
      if (currentChar === "\n") delay = 50;
      delay += 1;

      charIndex += 1;
      aiStreamCharTimerRef.current = window.setTimeout(typeNextChar, delay);
    };

    typeNextChar();
  }, []);

  const autoFoldAI = useCallback(() => {
    aiShouldAutoFoldRef.current = false;
    setIsAIActive(false);
    setIsAITabInvite(true);
  }, []);

  const deactivateAI = useCallback(() => {
    clearAIStreamTimers();
    aiShouldAutoFoldRef.current = false;
    setIsAIActive(false);
    setAiStreamText("");
  }, [clearAIStreamTimers]);

  const forceDeactivateAI = useCallback(() => {
    clearAIStreamTimers();
    aiShouldAutoFoldRef.current = false;
    setIsInstantClosingAI(true);
    setIsAIActive(false);
    setAiStreamText("");
    setIsAITabInvite(false);
    window.setTimeout(() => setIsInstantClosingAI(false), 0);
  }, [clearAIStreamTimers]);

  const activateAI = useCallback((options?: { auto?: boolean; text?: string }) => {
    const isAutoActivation = options?.auto === true;
    const textToStream = options?.text ?? aiInsightTextRef.current;
    clearAIStreamTimers();
    aiShouldAutoFoldRef.current = isAutoActivation;
    setIsInstantClosingAI(false);
    setIsAIActive(true);
    setIsAITabInvite(false);
    setAiStreamText("");
    aiStreamStartTimerRef.current = window.setTimeout(() => {
      streamText(textToStream, () => {
        if (aiShouldAutoFoldRef.current) {
          aiFoldTimerRef.current = window.setTimeout(() => {
            autoFoldAI();
            aiFoldTimerRef.current = null;
          }, 1000);
        }
      });
      aiStreamStartTimerRef.current = null;
    }, 100);
  }, [autoFoldAI, clearAIStreamTimers, streamText]);

  useEffect(() => {
    return () => {
      clearAIStreamTimers();
    };
  }, [clearAIStreamTimers]);

  useEffect(() => {
    if (!isAIActive) return;
    const heroEl = heroRef.current;
    if (!heroEl) return;

    const handleScroll = () => {
      const rect = heroEl.getBoundingClientRect();
      if (rect.height < 80) return;
      const heroHeight = rect.height || 1;
      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      const visibleRatio = visibleHeight / heroHeight;

      if (visibleRatio < 0.3) {
        forceDeactivateAI();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    const rafId = window.requestAnimationFrame(handleScroll);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [forceDeactivateAI, isAIActive]);

  useEffect(() => {
    if (inventoryStatusLoading || isAIActive) return;
    if (showInitialLoader) return;
    if (!aiInsightText.trim()) return;
    if (aiAutoOpenTimerRef.current !== null) return;

    const hasShownAI = sessionStorage.getItem(AI_SHOWN_SESSION_KEY) === "true";
    if (hasShownAI) {
      hasAttemptedAutoOpenRef.current = true;
      return;
    }
    if (hasAttemptedAutoOpenRef.current) {
      return;
    }

    aiAutoOpenTimerRef.current = window.setTimeout(() => {
      activateAI({ auto: true, text: aiInsightText });
      sessionStorage.setItem(AI_SHOWN_SESSION_KEY, "true");
      hasAttemptedAutoOpenRef.current = true;
      aiAutoOpenTimerRef.current = null;
    }, 400);
  }, [activateAI, aiInsightText, inventoryStatusLoading, isAIActive, showInitialLoader]);

  const scoreOffset = RING_CIRCUMFERENCE * (1 - animatedScore / 100);

  if (showInitialLoader) {
    return (
      <DashboardLayout>
        <div className="min-h-full">
          <div className="mx-auto max-w-[1200px] px-8 pb-12 pt-2 text-[#2F2A24]">
            <DashboardPageLoader scene="pantry" isExiting={isLoaderExiting} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-full page-reveal">
        <div className="mx-auto max-w-[1200px] px-8 pb-12 pt-2 text-[#2F2A24]">
          <section
            ref={heroRef}
            id="hero"
            className={`hero-wrapper relative h-[360px] overflow-hidden rounded-[24px] px-10 py-12 ${isInstantClosingAI ? "transition-none" : "transition-[background,box-shadow] duration-[260ms] ease-out"} ${
              isAIActive
                ? "ai-active bg-[linear-gradient(120deg,#0F4C35_0%,#1A6B4C_100%)] bg-[length:200%_200%] [animation:pantry-hero-drift_10s_ease_infinite_alternate] shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
                : "bg-[linear-gradient(155deg,#14533C_0%,#1B7D5A_55%,#22956B_100%)] shadow-[0_6px_20px_rgba(0,0,0,0.05),0_30px_60px_rgba(0,0,0,0.06)]"
            } flex flex-col items-stretch justify-between gap-10 lg:flex-row`}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.04) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 1px, transparent 1px)",
                backgroundSize: "56px 56px",
              }}
            />
            <button
              type="button"
              onClick={() => (isAIActive ? deactivateAI() : activateAI({ auto: false }))}
              className={`ai-tab absolute right-4 top-1/2 z-30 -translate-y-1/2 rounded-[12px] border border-white/12 bg-white/8 px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50 transition-all duration-[260ms] [writing-mode:vertical-rl] ${
                isAIActive
                  ? "active border-[#34D399]/40 bg-white/15 text-[#34D399]"
                  : isAITabInvite
                    ? "invite border-[#34D399]/40 bg-white/12 text-[#34D399]"
                    : ""
              }`}
              aria-pressed={isAIActive}
              aria-label={isAIActive ? "Close pantry insight mode" : "Open pantry insight mode"}
            >
              AI Insight
            </button>
            <div
              className={`hero-default-layer space-y-4 lg:w-[62%] ${
                isInstantClosingAI ? "transition-none" : "transition-[opacity,transform] duration-[260ms] ease-out"
              } ${isAIActive ? "pointer-events-none -translate-y-[10px] opacity-0" : "opacity-100"}`}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">Your Pantry</p>
              <div className="flex items-start gap-4">
                <span aria-hidden className="mt-1 block h-[56px] w-[6px] rounded-[6px] bg-white/25" />
                <div className="space-y-2">
                  <h1
                    className="text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {heroHeadline}
                  </h1>
                  <p className="text-[16px] text-white/50">Track freshness, reduce waste, and power smarter meals.</p>
                  <p className="text-[15px] text-white/45">You can cook {readyRecipeCount} meals with what you have.</p>
                </div>
              </div>
              <div className="flex gap-3 pl-6 pt-1">
                <Button className="h-10 rounded-[12px] bg-white px-[18px] py-[10px] font-semibold text-[#14533C] shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:bg-white/90" onClick={() => setAddItemsOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Items
                </Button>
                <Button variant="outline" className="h-10 rounded-[12px] border border-white/12 bg-white/10 px-[18px] py-[10px] font-medium text-white/80 hover:bg-white/15" onClick={() => setReceiptUploadOpen(true)}>
                  <Camera className="mr-2 h-4 w-4" />
                  Scan Receipt
                </Button>
              </div>
            </div>

            <div
              className={`metrics-card z-[1] h-full rounded-[20px] border border-white/10 bg-white/8 p-6 backdrop-blur-[16px] ${
                isInstantClosingAI ? "transition-none" : "transition-[opacity,transform,filter] duration-[260ms] ease-out"
              } shadow-[0_6px_18px_rgba(0,0,0,0.04),0_20px_40px_rgba(0,0,0,0.05)] ${isAIActive ? "scale-[0.96] opacity-[0.14] filter saturate-[.85]" : "opacity-100"} lg:w-[38%]`}
            >
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                  <p className="text-[12px] text-white/40">Items</p>
                  <p className="text-[22px] font-semibold text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>{totalItems}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[12px] text-white/40">Expiring</p>
                  <p className="text-[22px] font-semibold text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>{expiringSoonCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[12px] text-white/40">Weight</p>
                  <p className="text-[22px] font-semibold text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>{formatWeight(totalWeight)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[12px] text-white/40">Low</p>
                  <p className="text-[22px] font-semibold text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>{runningLowCount}</p>
                </div>
              </div>

              <div className="my-4 h-px bg-white/10" />

              <div className="mt-3 flex items-center gap-3">
                <div className="h-9 w-9 shrink-0">
                  <svg viewBox="0 0 44 44" className="h-9 w-9 -rotate-90">
                    <circle cx="22" cy="22" r={RING_RADIUS} stroke="rgba(255,255,255,0.12)" strokeWidth="5" fill="none" />
                    <circle
                      cx="22"
                      cy="22"
                      r={RING_RADIUS}
                      stroke="#34D399"
                      strokeWidth="7"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={scoreOffset}
                      style={{ transition: "stroke-dashoffset 300ms ease-out" }}
                    />
                  </svg>
                </div>
                <p className="text-[13px] text-white/45">
                  <span className="font-medium text-white/70">Pantry Health:</span> {getHealthMessage(pantryHealthScore)}
                </p>
              </div>
            </div>

            <div
              className={`hero-ai-layer absolute inset-0 z-[2] flex items-center justify-center p-12 ${
                isInstantClosingAI ? "transition-none" : "transition-opacity duration-[260ms] ease-out"
              } ${
                isAIActive ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <div className="ai-content relative w-full max-w-[820px]">
                <div className="ai-header mb-[6px] flex items-center justify-between">
                  <span className="ai-label text-[12px] font-semibold tracking-[1px] text-[#34D399]">PANTRY INSIGHT</span>
                  <button
                    type="button"
                    onClick={deactivateAI}
                    className="ai-close absolute right-10 top-8 border-b border-white/20 bg-transparent pb-0.5 text-[13px] font-medium text-white/40 transition-opacity hover:text-white/70"
                  >
                    Close
                  </button>
                </div>

                <div className="ai-main flex min-h-[220px] max-w-[820px] items-stretch">
                  <div
                    className={`ai-accent mr-5 w-1 rounded-[2px] bg-gradient-to-b from-[#34D399] to-[#22956B] shadow-[0_0_14px_rgba(47,111,94,0.28)] ${
                      isInstantClosingAI ? "transition-none" : "transition-[height] duration-[400ms] ease-out"
                    } ${
                      isAIActive ? "h-full" : "h-0"
                    }`}
                  />
                  <div className="ai-text">
                    <h2 className="ai-title mb-[18px] text-[34px] font-[650] tracking-[-0.2px] text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Here&apos;s what your pantry is telling you.</h2>
                    <div className="ai-divider mb-[22px] h-px w-20 bg-white/20" />
                    <div id="ai-stream-container" className="ai-body max-w-[580px] whitespace-pre-line text-[16px] leading-[1.3] text-white/65">
                      {aiStreamText}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white px-6 py-[26px]">
              <div className="mb-0.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2
                    className="signal-title relative pb-[10px] text-[18px] font-semibold tracking-[-0.01em] text-slate-900 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-8 after:rounded-[2px] after:bg-emerald-500/30 after:content-['']"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    Use Soon
                  </h2>
                  <Select value={String(expiringDays)} onValueChange={(value) => setExpiringDays(Number(value))}>
                    <SelectTrigger className="h-8 w-[96px] rounded-[8px] border-slate-200 bg-white text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Link href="/dashboard/kitchen" className="text-[13px] font-semibold text-emerald-600 hover:text-emerald-700">
                  View all
                </Link>
              </div>
              {expiringLoading ? (
                <div className="space-y-2.5">
                  <Skeleton className="h-6 w-full rounded-[10px]" />
                  <Skeleton className="h-6 w-full rounded-[10px]" />
                </div>
              ) : expiringError ? (
                <p className="text-[13px] text-slate-400">Could not load expiring insights.</p>
              ) : expiringPreview.length === 0 ? (
                <div className="signal-empty flex items-center gap-[14px] px-1 py-3">
                  <span className="empty-ring relative h-[18px] w-[18px] shrink-0 rounded-full border-2 border-[#5A9A7E]">
                    <span className="absolute inset-1 rounded-full bg-[#5A9A7E]" />
                  </span>
                  <span className="empty-text min-w-0">
                    <span className="empty-title text-[14px] font-medium text-emerald-700">All good for now</span>
                    <span className="empty-subtext block text-[14px] text-slate-400">
                      Nothing expiring in the next {expiringDays} day{expiringDays > 1 ? "s" : ""}.
                    </span>
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {expiringPreview.map((item) => {
                    const ringVariant = getUseSoonRingVariant(item.days_remaining);
                    return (
                      <Link
                        key={item.inventory_id}
                        href={`/dashboard/kitchen?ingredient=${encodeURIComponent(item.item_name)}`}
                        className="block"
                      >
                        <div className="signal-item flex items-center justify-between rounded-[14px] px-[14px] py-[10px] transition-[background,transform] duration-150 ease-out hover:translate-x-[2px] hover:bg-slate-50">
                          <div className="signal-left flex min-w-0 items-center">
                            <span className="signal-ring relative mr-3 h-4 w-4 shrink-0 -translate-y-px rounded-full bg-slate-100">
                              <span className={`absolute inset-0 rounded-full ${getSignalRingClass(ringVariant)}`} />
                              <span className="absolute inset-[3px] rounded-full bg-white" />
                            </span>
                            <span className="signal-item-name overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-medium tracking-[0.2px] text-slate-800">
                              {item.item_name}
                            </span>
                          </div>
                          <span className="signal-meta text-[13px] text-slate-400">{item.days_remaining <= 0 ? "Today" : `${item.days_remaining} days`}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="running-low-card rounded-2xl border border-slate-200/70 bg-white px-6 py-[26px]">
              <div className="mb-0.5 flex items-center justify-between">
                <h2
                  className="signal-title relative pb-[10px] text-[18px] font-semibold tracking-[-0.01em] text-slate-900 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-8 after:rounded-[2px] after:bg-emerald-500/30 after:content-['']"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Running Low
                </h2>
                <Link href="/dashboard/restock" className="text-[13px] font-semibold text-emerald-600 hover:text-emerald-700">
                  View all
                </Link>
              </div>
              {restockLoading ? (
                <div className="space-y-2.5">
                  <Skeleton className="h-6 w-full rounded-[10px]" />
                  <Skeleton className="h-6 w-full rounded-[10px]" />
                </div>
              ) : restockError ? (
                <p className="text-[13px] text-slate-400">Could not load stock insights.</p>
              ) : runningLowPreview.length === 0 ? (
                <p className="text-[13px] text-slate-400">You&apos;re stocked up.</p>
              ) : (
                <div className="space-y-3">
                  {runningLowPreview.map((item) => (
                    <Link
                      key={item.item_id}
                      href="/dashboard/restock"
                      className="block"
                    >
                      <div className="signal-item flex items-center justify-between rounded-[14px] px-[14px] py-[10px] transition-[background,transform] duration-150 ease-out hover:translate-x-[2px] hover:bg-slate-50">
                        <div className="signal-left flex min-w-0 items-center">
                          <span className="signal-ring relative mr-3 h-4 w-4 shrink-0 -translate-y-px rounded-full bg-slate-100">
                            <span className={`absolute inset-0 rounded-full ${getSignalRingClass("low")}`} />
                            <span className="absolute inset-[3px] rounded-full bg-white" />
                          </span>
                          <span className="signal-item-name overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-medium tracking-[0.2px] text-slate-800">
                            {item.item_name}
                          </span>
                        </div>
                        <span className="status-low rounded-lg border border-red-200 bg-red-50 px-[10px] py-1 text-[12px] font-medium text-red-600">
                          Low
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section id="all-items" className="mt-14 rounded-2xl border border-slate-200/70 bg-white p-8">
            <div className="space-y-1.5">
              <h2 className="text-[19px] font-semibold text-slate-900" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>All Ingredients</h2>
              <p className="text-[14px] text-slate-400">Everything currently in your kitchen.</p>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 md:flex-row md:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search pantry items..."
                  className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white md:w-44">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {entry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={showExpiringOnly ? "default" : "outline"}
                className={`h-10 rounded-xl ${showExpiringOnly ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                onClick={onToggleExpiringFilter}
              >
                Expiring
              </Button>
            </div>

            {showExpiringOnly && !expiringLoading && !expiringError && expiringRecommendations.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-[16px] border border-[#DCE9E3] bg-gradient-to-r from-[#FFFFFF] via-[#F7FBF9] to-[#EEF7F2] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2F6F5E]/35" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2F6F5E]" />
                    </span>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#2F6F5E]">
                      Expiry Intelligence Stream
                    </p>
                  </div>
                  <span className="text-[12px] text-[#5E6A63]">
                    {activeRecommendationIdx + 1}/{expiringRecommendations.length}
                  </span>
                </div>

                <div className="mt-3 grid gap-2">
                  {expiringRecommendations.map((recommendation, index) => {
                    const isActive = index === activeRecommendationIdx;
                    return (
                      <div
                        key={`${recommendation}-${index}`}
                        className={`rounded-[12px] border px-3 py-2 text-[13px] leading-relaxed transition-all duration-300 ${
                          isActive
                            ? "border-[#B7D5C8] bg-white/90 opacity-100 shadow-[0_8px_18px_rgba(47,111,94,0.08)]"
                            : "border-[#E6ECE8] bg-white/55 opacity-80"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? "bg-[#2F6F5E]" : "bg-[#AAB8B0]"}`} />
                          <p className="text-[#2F2A24]">{recommendation}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-6">
              {(inventoryItemsLoading ||
                inventoryStatusLoading ||
                (showExpiringOnly && expiringLoading)) ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <Skeleton key={item} className="h-[176px] w-full rounded-[18px]" />
                  ))}
                </div>
              ) : inventoryItemsError || inventoryStatusError || (showExpiringOnly && expiringError) ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Failed to load pantry items.</AlertDescription>
                </Alert>
              ) : filteredItems.length === 0 ? (
                <div className="rounded-[18px] bg-white px-6 py-10 text-center text-[13px] text-slate-500">No pantry items match these filters.</div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  {filteredItems.map((item) => {
                    const freshness = getFreshnessMeta(item.days_until_expiry);
                    return (
                      <Card
                        key={item.id}
                        className="group rounded-2xl border border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                      >
                        <CardContent className="p-5">
                          <div className="mb-5 flex items-start gap-3">
                            <h3 className="min-w-0 flex-1 break-words text-[16px] font-semibold text-slate-900 [overflow-wrap:anywhere]">
                              {item.item_name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge className={`${CATEGORY_CHIP} max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap`}>
                                {formatCategoryLabel(item.category)}
                              </Badge>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-[8px] text-slate-400 hover:text-red-500" onClick={() => onDeleteItem(item)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="mb-5 flex items-center justify-between gap-2">
                            <p className="inline-flex items-center gap-1 text-[14px] font-medium text-slate-500">
                              <Weight className="h-3.5 w-3.5" />
                              {item.is_depleted ? "Out of stock" : formatWeight(item.quantity_grams)}
                            </p>
                          </div>

                          <div>
                            <p className="mb-1 text-[12px] text-slate-500">Freshness</p>
                            <div className="h-[5px] overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-[5px] rounded-full ${freshness.fillClass}`}
                                style={{ width: `${freshness.width}%`, transition: "width 400ms ease-out" }}
                              />
                            </div>
                            <p className={`mt-1.5 text-[13px] ${item.days_until_expiry !== null && item.days_until_expiry < 0 ? "text-[#B42318]" : "text-slate-500"}`}>
                              {getFreshnessText(item.days_until_expiry)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <AddItemsDialog open={addItemsOpen} onOpenChange={setAddItemsOpen} />
      <ReceiptUpload open={receiptUploadOpen} onOpenChange={setReceiptUploadOpen} />
      <style jsx>{`
        @keyframes pantry-hero-drift {
          from {
            background-position: 0% 50%;
          }
          to {
            background-position: 100% 50%;
          }
        }

        .page-reveal {
          animation: pantry-page-reveal 220ms ease-out;
        }

        @keyframes pantry-page-reveal {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </DashboardLayout>
  );
}

function PantryPageFallback() {
  return (
    <DashboardLayout>
      <div className="min-h-full">
        <div className="mx-auto max-w-[1200px] px-8 pb-12 pt-2 text-[#2F2A24]">
          <DashboardPageLoader scene="pantry" />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function PantryPage() {
  return (
    <Suspense fallback={<PantryPageFallback />}>
      <PantryPageContent />
    </Suspense>
  );
}

