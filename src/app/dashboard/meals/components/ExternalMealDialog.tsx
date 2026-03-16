"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  UtensilsCrossed,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { api, getEndpoint } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface ExternalMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealLogId?: number | null;
  mealType?: string;
  onSuccess?: () => void;
}

interface EstimatedNutrition {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  confidence: number;
  reasoning: string;
  estimation_method: string;
}

interface ExternalMealLogResult {
  replaced_meal?: boolean;
  original_recipe?: string;
  recommendations?: string[];
  insights?: string[];
  remaining_calories?: number;
}

type ApiErrorLike = { response?: { data?: { detail?: string } } };
type Step = "input" | "estimate" | "success";

const SERIF = "Georgia, 'Times New Roman', serif";
const MACRO_COLORS = {
  calories: { bg: "bg-emerald-50", text: "text-emerald-800", label: "text-emerald-600" },
  protein: { bg: "bg-[#EEF4FF]", text: "text-[#3B6FD4]", label: "text-[#5B8DEF]" },
  carbs: { bg: "bg-[#FFF7ED]", text: "text-[#C67A1A]", label: "text-[#E8913A]" },
  fat: { bg: "bg-[#FEF3F2]", text: "text-[#C4462B]", label: "text-[#D4644A]" },
};

export default function ExternalMealDialog({ open, onOpenChange, mealLogId, mealType, onSuccess }: ExternalMealDialogProps) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>("input");
  const [dishName, setDishName] = useState("");
  const [portionSize, setPortionSize] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [notes, setNotes] = useState("");
  const [estimated, setEstimated] = useState<EstimatedNutrition | null>(null);
  const [logResult, setLogResult] = useState<ExternalMealLogResult | null>(null);
  const [calories, setCalories] = useState(0);
  const [proteinG, setProteinG] = useState(0);
  const [carbsG, setCarbsG] = useState(0);
  const [fatG, setFatG] = useState(0);
  const [fiberG, setFiberG] = useState(0);

  const estimateMut = useMutation({
    mutationFn: async () => {
      const r = await api.post(getEndpoint("/tracking/estimate-external-meal"), {
        dish_name: dishName, portion_size: portionSize,
        restaurant_name: restaurantName || null, cuisine_type: cuisineType || null,
      });
      return r.data;
    },
    onSuccess: (d) => {
      setEstimated(d);
      setCalories(Math.round(d.calories)); setProteinG(Math.round(d.protein_g));
      setCarbsG(Math.round(d.carbs_g)); setFatG(Math.round(d.fat_g)); setFiberG(Math.round(d.fiber_g));
      setStep("estimate");
    },
    onError: (e: unknown) => {
      const d = (e as ApiErrorLike)?.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Failed to estimate nutrition");
    },
  });

  const logMut = useMutation({
    mutationFn: async () => {
      const r = await api.post(getEndpoint("/tracking/log-external-meal"), {
        dish_name: dishName, portion_size: portionSize,
        restaurant_name: restaurantName || null, cuisine_type: cuisineType || null,
        calories, protein_g: proteinG, carbs_g: carbsG, fat_g: fatG, fiber_g: fiberG,
        meal_log_id_to_replace: mealLogId || null, meal_type: mealLogId ? null : mealType,
        notes: notes || null,
      });
      return r.data;
    },
    onSuccess: (d: ExternalMealLogResult) => {
      queryClient.invalidateQueries({ queryKey: ["tracking", "today"] });
      queryClient.invalidateQueries({ queryKey: ["meal-plan", "current"] });
      if (d.replaced_meal) toast.success(`Replaced "${d.original_recipe}" with external meal`);
      else toast.success("External meal logged successfully");
      if ((d.recommendations?.length ?? 0) > 0 || (d.insights?.length ?? 0) > 0) {
        setLogResult(d); setStep("success");
      } else { handleClose(); onSuccess?.(); }
    },
    onError: (e: unknown) => {
      const d = (e as ApiErrorLike)?.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Failed to log external meal");
    },
  });

  const handleEstimate = () => {
    if (!dishName.trim()) { toast.error("Please enter a dish name"); return; }
    if (!portionSize.trim()) { toast.error("Please enter a portion size"); return; }
    estimateMut.mutate();
  };

  const handleLog = () => {
    if (calories <= 0) { toast.error("Calories must be greater than 0"); return; }
    logMut.mutate();
  };

  const handleClose = () => {
    setStep("input"); setDishName(""); setPortionSize(""); setRestaurantName("");
    setCuisineType(""); setNotes(""); setEstimated(null); setLogResult(null);
    setCalories(0); setProteinG(0); setCarbsG(0); setFatG(0); setFiberG(0);
    onOpenChange(false);
  };

  useEffect(() => { if (open && scrollRef.current) scrollRef.current.scrollTop = 0; }, [open, step]);

  const inputCls = "h-10 rounded-xl border-slate-200 bg-white px-3.5 text-[14px] text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        overlayClassName="bg-slate-950/60 backdrop-blur-[3px]"
        className="overflow-hidden border-0 p-0 sm:max-w-[560px]"
        style={{ background: "#FAFAF7", boxShadow: "0 32px 80px -30px rgba(15,23,42,0.5), 0 0 0 1px rgba(0,0,0,0.04)" }}
      >
        <VisuallyHidden.Root asChild>
          <DialogTitle>Log External Meal</DialogTitle>
        </VisuallyHidden.Root>

        {/* ── Header ── */}
        <div className="border-b border-slate-100 px-6 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
              <UtensilsCrossed className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <h2 className="text-[19px] font-medium tracking-[-0.01em] text-slate-900" style={{ fontFamily: SERIF }}>
                {mealLogId ? "Replace with External Meal" : "Log External Meal"}
              </h2>
              <p className="mt-0.5 text-[13px] text-slate-400">
                {step === "input" && "Enter details about what you ate"}
                {step === "estimate" && "Review and adjust AI-estimated nutrition"}
                {step === "success" && "Meal logged — here are your insights"}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          {step !== "success" && (
            <div className="mt-4 flex items-center gap-2">
              {["Details", "Review"].map((label, i) => {
                const active = (i === 0 && step === "input") || (i === 1 && step === "estimate");
                const done = (i === 0 && step === "estimate");
                return (
                  <div key={label} className="flex items-center gap-2">
                    {i > 0 && <div className="h-px w-6 bg-slate-200" />}
                    <div className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all",
                      done ? "bg-emerald-100 text-emerald-600"
                        : active ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    )}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={cn("text-[12px] font-medium", active || done ? "text-slate-700" : "text-slate-400")}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto px-6 py-5">

          {/* Step 1: Input */}
          {step === "input" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[12.5px] font-medium text-slate-600">
                    Dish Name <span className="text-red-400">*</span>
                  </Label>
                  <Input placeholder="e.g., Chicken Tikka Masala" value={dishName}
                    onChange={(e) => setDishName(e.target.value)} disabled={estimateMut.isPending}
                    className={inputCls} />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[12.5px] font-medium text-slate-600">
                    Portion Size <span className="text-red-400">*</span>
                  </Label>
                  <Input placeholder="e.g., 1 large plate, 300g" value={portionSize}
                    onChange={(e) => setPortionSize(e.target.value)} disabled={estimateMut.isPending}
                    className={inputCls} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12.5px] font-medium text-slate-600">Restaurant</Label>
                  <Input placeholder="e.g., Indian Palace" value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)} disabled={estimateMut.isPending}
                    className={inputCls} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12.5px] font-medium text-slate-600">Cuisine Type</Label>
                  <Input placeholder="e.g., Indian, Italian" value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)} disabled={estimateMut.isPending}
                    className={inputCls} />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[12.5px] font-medium text-slate-600">Notes</Label>
                  <Textarea placeholder="Any additional notes..." value={notes}
                    onChange={(e) => setNotes(e.target.value)} rows={2} disabled={estimateMut.isPending}
                    className="resize-none rounded-xl border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Review Estimate */}
          {step === "estimate" && estimated && (
            <div className="space-y-5">
              {/* Meal summary */}
              <div className="rounded-xl bg-white p-4">
                <p className="text-[15px] font-semibold text-slate-800">{dishName}</p>
                <p className="mt-0.5 text-[13px] text-slate-400">
                  {portionSize}{restaurantName ? ` · ${restaurantName}` : ""}
                </p>
              </div>

              {/* Confidence */}
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-[12px] font-semibold text-slate-600">AI Estimation</span>
                  </div>
                  <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    estimated.confidence > 0.7 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                    {Math.round(estimated.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="mt-2 text-[12.5px] leading-[1.55] text-slate-400">{estimated.reasoning}</p>
              </div>

              {/* Macro display — visual */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: "calories" as const, val: calories, unit: "", label: "Calories" },
                  { key: "protein" as const, val: proteinG, unit: "g", label: "Protein" },
                  { key: "carbs" as const, val: carbsG, unit: "g", label: "Carbs" },
                  { key: "fat" as const, val: fatG, unit: "g", label: "Fat" },
                ].map((m) => (
                  <div key={m.key} className={cn("rounded-xl p-3 text-center", MACRO_COLORS[m.key].bg)}>
                    <p className={cn("text-[22px] font-semibold leading-none", MACRO_COLORS[m.key].text)}
                      style={{ fontFamily: SERIF }}>
                      {m.val}{m.unit}
                    </p>
                    <p className={cn("mt-1 text-[10.5px] font-semibold", MACRO_COLORS[m.key].label)}>{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Editable fields */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Adjust values</p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "Cal", val: calories, set: setCalories },
                    { label: "Protein", val: proteinG, set: setProteinG },
                    { label: "Carbs", val: carbsG, set: setCarbsG },
                    { label: "Fat", val: fatG, set: setFatG },
                    { label: "Fiber", val: fiberG, set: setFiberG },
                  ].map((f) => (
                    <div key={f.label} className="space-y-1">
                      <Label className="text-[10px] font-medium text-slate-400">{f.label}</Label>
                      <Input type="number" value={f.val} onChange={(e) => f.set(Number(e.target.value))} min={0}
                        className="h-9 rounded-lg border-slate-200 bg-white px-2 text-center text-[13px] text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/10" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === "success" && logResult && (
            <div className="space-y-5">
              {/* Confirmation */}
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                  <CheckCircle2 className="h-[18px] w-[18px] text-emerald-600" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-emerald-800">{dishName} logged</p>
                  <p className="text-[12px] text-emerald-600">{calories} calories</p>
                </div>
              </div>

              {/* Remaining calories */}
              {logResult.remaining_calories !== undefined && (
                <div className="rounded-xl bg-white p-4 text-center">
                  <p className="text-[28px] font-semibold text-slate-800" style={{ fontFamily: SERIF }}>
                    {Math.round(logResult.remaining_calories)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-400">Calories remaining today</p>
                </div>
              )}

              {/* Insights */}
              {logResult.insights && logResult.insights.length > 0 && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">Insights</p>
                  <div className="space-y-2">
                    {logResult.insights.map((s, i) => (
                      <p key={i} className="flex items-start gap-2 text-[13px] leading-[1.55] text-slate-600">
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
                        {s}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {logResult.recommendations && logResult.recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">Recommendations</p>
                  {logResult.recommendations.map((r, i) => (
                    <div key={i} className="rounded-xl bg-white p-3.5 text-[13px] leading-[1.55] text-slate-600">
                      {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="flex justify-end gap-2.5">
            {step === "input" && (
              <>
                <Button variant="outline" onClick={handleClose}
                  className="h-10 rounded-xl border-slate-200 px-4 text-[13px] text-slate-500 hover:bg-slate-50">
                  Cancel
                </Button>
                <Button onClick={handleEstimate}
                  disabled={estimateMut.isPending || !dishName.trim() || !portionSize.trim()}
                  className="h-10 rounded-xl px-5 text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(27,125,90,0.2)]"
                  style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                  {estimateMut.isPending ? (
                    <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Estimating...</>
                  ) : (
                    <><Sparkles className="mr-2 h-3.5 w-3.5" />Get AI Estimate</>
                  )}
                </Button>
              </>
            )}

            {step === "estimate" && (
              <>
                <Button variant="outline" onClick={() => setStep("input")}
                  className="h-10 rounded-xl border-slate-200 px-4 text-[13px] text-slate-500 hover:bg-slate-50">
                  <ArrowLeft className="mr-2 h-3.5 w-3.5" />Back
                </Button>
                <Button onClick={handleLog} disabled={logMut.isPending || calories <= 0}
                  className="h-10 rounded-xl px-5 text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(27,125,90,0.2)]"
                  style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                  {logMut.isPending ? (
                    <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Logging...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-3.5 w-3.5" />{mealLogId ? "Replace & Log" : "Log Meal"}</>
                  )}
                </Button>
              </>
            )}

            {step === "success" && (
              <Button onClick={() => { handleClose(); onSuccess?.(); }}
                className="h-10 rounded-xl px-5 text-[13px] font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                Done <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}