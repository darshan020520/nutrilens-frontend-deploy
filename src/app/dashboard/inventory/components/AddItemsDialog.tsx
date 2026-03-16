"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Info,
  ArrowRight,
  Package,
} from "lucide-react";
import { useAddItems, useConfirmItem } from "../hooks/useInventory";
import type { AddItemsResult } from "../types";
import { cn } from "@/lib/utils";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface AddItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AddItemsResults = AddItemsResult["results"];
type NeedsConfirmationItem = AddItemsResults["needs_confirmation"][number];
type SuccessfulItem = AddItemsResults["successful"][number];
type FailedItem = AddItemsResults["failed"][number];

const EASE = [0.22, 1, 0.36, 1];

const processingPhases = [
  "Parsing quantities and units",
  "Matching items with fuzzy confidence",
  "Preparing confirmations",
];

export default function AddItemsDialog({ open, onOpenChange }: AddItemsDialogProps) {
  const [textInput, setTextInput] = useState("");
  const [results, setResults] = useState<AddItemsResults | null>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);

  const addItems = useAddItems();
  const confirmItem = useConfirmItem();

  useEffect(() => {
    if (!addItems.isPending) return;
    const interval = window.setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % processingPhases.length);
    }, 850);
    return () => window.clearInterval(interval);
  }, [addItems.isPending]);

  const handleSubmit = async () => {
    if (!textInput.trim()) return;
    setPhaseIndex(0);
    const result = await addItems.mutateAsync({ text_input: textInput });
    setResults(result.results);
  };

  const handleConfirm = async (item: NeedsConfirmationItem, itemId: number) => {
    await confirmItem.mutateAsync({
      original_text: item.original,
      item_id: itemId,
      quantity_grams: item.quantity_grams ?? 0,
    });
    setResults((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        needs_confirmation: prev.needs_confirmation.filter((e) => e.original !== item.original),
        summary: { ...prev.summary, needs_confirmation: prev.summary.needs_confirmation - 1, successful: prev.summary.successful + 1 },
      };
    });
  };

  const handleClose = () => {
    setTextInput("");
    setResults(null);
    onOpenChange(false);
  };

  const hasResults = results !== null;
  const confirmableItems = results?.needs_confirmation?.filter(
    (item): item is NeedsConfirmationItem & { item_id: number } => typeof item.item_id === "number"
  ) || [];
  const pendingItems = results?.needs_confirmation?.filter((item) => item.action === "add_to_pending") || [];
  const hasConfirmations = confirmableItems.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        overlayClassName="bg-slate-950/60 backdrop-blur-[3px]"
        className="overflow-hidden border-0 p-0 sm:max-w-[540px]"
        style={{
          background: "#FAFAF7",
          boxShadow: "0 32px 80px -30px rgba(15,23,42,0.5), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        <VisuallyHidden.Root asChild>
          <DialogTitle>Add items to inventory</DialogTitle>
        </VisuallyHidden.Root>

        {/* ── Header ── */}
        <div className="border-b border-slate-100 px-6 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
              <Package className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <h2 className="text-[20px] font-medium tracking-[-0.01em] text-slate-900"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                Add items to inventory
              </h2>
              <p className="mt-0.5 text-[13px] text-slate-400">
                Enter items naturally — AI will parse and normalize
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 pb-7 pt-5">
          <div className="space-y-5">

            {/* ── Input Phase ── */}
            {!hasResults && (
              <>
                {/* Examples */}
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-white text-slate-400">
                      <Info className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-slate-600">Examples</p>
                      <p className="mt-1 text-[13px] leading-[1.6] text-slate-400">
                        &quot;2 apples, 500g chicken breast, 1L milk&quot; or &quot;bananas x3, ground beef 1kg&quot;
                      </p>
                    </div>
                  </div>
                </div>

                {/* Textarea */}
                <Textarea
                  placeholder="E.g., 2 apples, 500g chicken, 1L milk, 250g cheddar cheese..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={4}
                  className="resize-none rounded-xl border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />

                {/* Processing indicator */}
                <AnimatePresence>
                  {addItems.isPending && (
                    <motion.div
                      className="rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-4"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25, ease: EASE }}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-700">AI parser running</p>
                      </div>
                      <p className="mt-2 text-[13.5px] text-slate-600">{processingPhases[phaseIndex]}</p>
                      <div className="mt-3 h-[5px] w-full overflow-hidden rounded-full bg-emerald-100">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg, #1B7D5A, #22956B)" }}
                          initial={{ width: "15%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 1.3, ease: "easeInOut" }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex justify-end gap-2.5">
                  <Button variant="outline" onClick={handleClose}
                    className="h-10 rounded-xl border-slate-200 px-4 text-[13px] text-slate-500 hover:bg-slate-50">
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={!textInput.trim() || addItems.isPending}
                    className="h-10 rounded-xl px-5 text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(27,125,90,0.2)]"
                    style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                    {addItems.isPending ? (
                      <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Processing...</>
                    ) : (
                      <><Sparkles className="mr-2 h-3.5 w-3.5" />Analyze and add</>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* ── Results Phase ── */}
            {hasResults && results && (
              <div className="space-y-5">

                {/* Stats — inline compact */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-[20px] font-semibold text-emerald-800"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                      {results.summary.successful}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600">Added</span>
                  </div>
                  {results.summary.needs_confirmation > 0 && (
                    <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-[20px] font-semibold text-amber-700"
                        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                        {results.summary.needs_confirmation}
                      </span>
                      <span className="text-[11px] font-semibold text-amber-600">To confirm</span>
                    </div>
                  )}
                  {results.summary.failed > 0 && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-[20px] font-semibold text-red-700"
                        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                        {results.summary.failed}
                      </span>
                      <span className="text-[11px] font-semibold text-red-600">Failed</span>
                    </div>
                  )}
                </div>

                {/* Successfully added — 2-col grid */}
                {results.successful.length > 0 && (
                  <div className="rounded-xl border border-emerald-200/40 bg-emerald-50/25 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Successfully added</p>
                    </div>
                    <div className="space-y-1.5">
                      {results.successful.map((item: SuccessfulItem, i: number) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                          <span className="text-[13px] font-medium text-slate-800">{item.matched}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-slate-400">{item.quantity}</span>
                            <span className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                              item.confidence >= 0.9 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            )}>
                              {(item.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Needs confirmation — compact cards */}
                {confirmableItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      <h4 className="text-[13px] font-semibold text-slate-800">Confirm matches</h4>
                    </div>
                    <div className="space-y-2">
                      {confirmableItems.map((item, i: number) => (
                        <div key={`${item.original}-${i}`}
                          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white px-4 py-3 transition-all duration-150 hover:shadow-[0_4px_14px_rgba(0,0,0,0.04)]">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] text-slate-400">&quot;{item.original}&quot;</p>
                            <p className="mt-0.5 text-[14px] font-semibold text-slate-800">
                              {item.suggested || item.suggested_name}
                            </p>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            <span className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                              item.confidence >= 0.7 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            )}>
                              {(item.confidence * 100).toFixed(0)}%
                            </span>
                            <Button size="sm" onClick={() => handleConfirm(item, item.item_id)}
                              disabled={confirmItem.isPending}
                              className="h-8 rounded-lg bg-emerald-600 px-3 text-[12px] font-semibold text-white hover:bg-emerald-700">
                              <CheckCircle2 className="mr-1 h-3 w-3" />Confirm
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending items — queued for catalog */}
                {pendingItems.length > 0 && (
                  <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">Queued for catalog</p>
                    </div>
                    <div className="space-y-1.5">
                      {pendingItems.map((item, i: number) => (
                        <div key={`${item.original}-${i}`}
                          className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                          <div>
                            <p className="text-[13px] font-medium text-slate-700">{item.suggested_name}</p>
                            <p className="text-[11px] text-slate-400">from &quot;{item.original}&quot;</p>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Pending</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Failed */}
                {results.failed.length > 0 && (
                  <div className="rounded-xl border border-red-200/50 bg-red-50/30 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-red-600">Could not process</p>
                    </div>
                    <div className="space-y-1.5">
                      {results.failed.map((item: FailedItem, i: number) => (
                        <div key={i} className="rounded-lg bg-white px-3 py-2">
                          <p className="text-[13px] text-slate-700">&quot;{item.original || item.original_text}&quot;</p>
                          {(item.reason || item.error) && (
                            <p className="mt-0.5 text-[11px] text-red-500">{item.reason || item.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer actions */}
                <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                  {!hasConfirmations ? (
                    <Button onClick={handleClose}
                      className="h-10 rounded-xl px-5 text-[13px] font-semibold"
                      style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                      Done <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleClose}
                        className="h-10 rounded-xl border-slate-200 px-4 text-[13px] text-slate-500">
                        Finish Later
                      </Button>
                      <Button
                        className="h-10 rounded-xl px-5 text-[13px] font-semibold"
                        style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}
                        onClick={() => {
                          setResults((prev) => {
                            if (!prev) return prev;
                            return { ...prev, needs_confirmation: [], summary: { ...prev.summary, needs_confirmation: 0 } };
                          });
                        }}>
                        Skip Remaining
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}