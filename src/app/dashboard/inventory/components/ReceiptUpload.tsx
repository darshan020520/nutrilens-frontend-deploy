"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import {
  Camera, Upload, CheckCircle2, AlertTriangle, Loader2,
  FileImage, X, PackageCheck, Sparkles, ScanLine, ArrowRight,
} from "lucide-react";
import { useUploadReceipt } from "../hooks/useReceipt";
import { useConfirmItem } from "../hooks/useInventory";
import Image from "next/image";
import { ReceiptUploadResult } from "../types";
import { resolveImageUrl } from "@/lib/imageUrl";
import { cn } from "@/lib/utils";

interface ReceiptUploadProps { open: boolean; onOpenChange: (open: boolean) => void; }

type Phase = "upload" | "scanning" | "results";

const SCAN_STEPS = [
  "Reading receipt text",
  "Identifying grocery items",
  "Matching to database",
  "Estimating quantities",
];

export default function ReceiptUpload({ open, onOpenChange }: ReceiptUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<ReceiptUploadResult | null>(null);
  const [dismissedIndices, setDismissedIndices] = useState<Set<number>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("upload");
  const [scanProgress, setScanProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [scanLinePos, setScanLinePos] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanTimersRef = useRef<number[]>([]);
  const scanLineRafRef = useRef<number | null>(null);

  const uploadReceipt = useUploadReceipt();
  const confirmItem = useConfirmItem();

  const visibleConfirmItems = uploadResult?.needs_confirmation
    .map((item, i) => ({ item, i })).filter(({ i }) => !dismissedIndices.has(i)) ?? [];
  const hasConfirmable = visibleConfirmItems.some(({ item }) => item.success);

  // ── Scan animation ──
  const startScanLine = useCallback(() => {
    let start: number | null = null;
    const dur = 2800;
    const go = (ts: number) => {
      if (!start) start = ts;
      const p = ((ts - start) % dur) / dur;
      setScanLinePos((p < 0.5 ? p * 2 : 2 - p * 2) * 100);
      scanLineRafRef.current = requestAnimationFrame(go);
    };
    scanLineRafRef.current = requestAnimationFrame(go);
  }, []);

  const stopScanLine = useCallback(() => {
    if (scanLineRafRef.current) cancelAnimationFrame(scanLineRafRef.current);
    scanLineRafRef.current = null;
  }, []);

  const startSteps = useCallback(() => {
    setCompletedSteps(0); setScanProgress(0);
    SCAN_STEPS.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setCompletedSteps(i + 1);
        setScanProgress(((i + 1) / SCAN_STEPS.length) * 88);
      }, 1400 + i * 2400);
      scanTimersRef.current.push(t);
    });
  }, []);

  const clearTimers = useCallback(() => {
    scanTimersRef.current.forEach(clearTimeout);
    scanTimersRef.current = [];
    stopScanLine();
  }, [stopScanLine]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // ── Handlers ──
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setSelectedFile(file);
    const r = new FileReader();
    r.onloadend = () => setPreview(r.result as string);
    r.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setPhase("scanning"); startScanLine(); startSteps();
    try {
      const result = await uploadReceipt.mutateAsync(selectedFile);
      clearTimers(); setScanProgress(100); setCompletedSteps(SCAN_STEPS.length);
      await new Promise((r) => setTimeout(r, 700));
      setUploadResult(result); setPhase("results");
      setTimeout(() => setShowResults(true), 80);
    } catch { clearTimers(); setPhase("upload"); }
  };

  const handleConfirmSingle = async (
    item: Extract<ReceiptUploadResult["needs_confirmation"][number], { success: true }>, index: number
  ) => {
    await confirmItem.mutateAsync({ original_text: item.input, item_id: item.item_id, quantity_grams: item.quantity_grams });
    setDismissedIndices((p) => new Set([...p, index]));
  };

  const handleDismiss = (i: number) => setDismissedIndices((p) => new Set([...p, i]));

  const handleConfirmAll = async () => {
    const items = uploadResult?.needs_confirmation.map((item, i) => ({ item, i }))
      .filter(({ item, i }) => item.success && !dismissedIndices.has(i)) ?? [];
    await Promise.all(items.map(({ item, i }) =>
      confirmItem.mutateAsync({
        original_text: item.input,
        item_id: (item as Extract<typeof item, { success: true }>).item_id,
        quantity_grams: (item as Extract<typeof item, { success: true }>).quantity_grams,
      }).then(() => setDismissedIndices((p) => new Set([...p, i])))
    ));
  };

  const handleClose = () => {
    clearTimers(); setSelectedFile(null); setPreview(null); setUploadResult(null);
    setDismissedIndices(new Set()); setIsDragOver(false); setPhase("upload");
    setScanProgress(0); setCompletedSteps(0); setShowResults(false);
    onOpenChange(false);
  };

  const receiptUrl = uploadResult ? resolveImageUrl(uploadResult.image_url) : null;
  const displayImg = phase === "results" ? receiptUrl : preview;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        overlayClassName="bg-slate-950/60 backdrop-blur-[3px]"
        className={cn(
          "!max-w-none overflow-hidden border-0 p-0",
          phase === "upload" && !selectedFile ? "w-[540px]" : "w-[88vw] max-w-[1120px]"
        )}
        style={{
          background: "#FAFAF7",
          transition: "width 0.45s cubic-bezier(0.22,1,0.36,1)",
          boxShadow: "0 32px 90px -30px rgba(15,23,42,0.5), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        <style>{`
          @keyframes rl-item-in { from { opacity:0; transform:translateX(14px); } to { opacity:1; transform:translateX(0); } }
          @keyframes rl-fade-up { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
          @keyframes rl-check-pop { 0%{transform:scale(0.4);opacity:0} 50%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
          @keyframes rl-glow-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
          .rl-s1{animation:rl-fade-up .45s ease both .06s}
          .rl-s2{animation:rl-fade-up .45s ease both .14s}
          .rl-s3{animation:rl-fade-up .45s ease both .22s}
          .rl-s4{animation:rl-fade-up .45s ease both .3s}
        `}</style>

        {/* Accessible title (visually hidden — each phase has its own visible heading) */}
        <VisuallyHidden.Root asChild>
          <DialogTitle>Scan Receipt</DialogTitle>
        </VisuallyHidden.Root>

        {/* ═══════════════════════════════════════════════════
           UPLOAD — No file
           ═══════════════════════════════════════════════════ */}
        {phase === "upload" && !selectedFile && (
          <div className="px-10 pb-10 pt-9">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                <ScanLine className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-[22px] font-medium tracking-[-0.015em] text-slate-900"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Scan Receipt
                </h2>
                <p className="mt-0.5 text-[14px] text-slate-400">AI extracts and identifies items automatically</p>
              </div>
            </div>

            <div
              className={cn(
                "group cursor-pointer rounded-2xl border-2 border-dashed py-16 text-center transition-all duration-250",
                isDragOver ? "border-emerald-400 bg-emerald-50/50" : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
            >
              <div className="flex justify-center">
                <div className={cn("flex h-[72px] w-[72px] items-center justify-center rounded-2xl transition-all duration-250",
                  isDragOver ? "scale-110 bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500")}>
                  <FileImage className="h-8 w-8" />
                </div>
              </div>
              <p className="mt-6 text-[16px] font-semibold text-slate-700">Drop your receipt here</p>
              <p className="mt-1.5 text-[14px] text-slate-400">or click to browse · JPG, PNG, HEIC</p>
              <Button variant="outline" size="sm"
                className="mt-6 h-10 rounded-xl border-slate-200 px-5 text-[13px] font-medium text-slate-500 hover:bg-slate-50"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <Upload className="mr-2 h-4 w-4" />Choose File
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={handleClose}
                className="h-10 rounded-xl border-slate-200 px-5 text-[13px] text-slate-500">Cancel</Button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
           UPLOAD — File selected (split preview)
           ═══════════════════════════════════════════════════ */}
        {phase === "upload" && selectedFile && preview && (
          <div className="flex h-[540px]">
            {/* Receipt — fixed width, not percentage */}
            <div className="relative flex w-[380px] flex-shrink-0 items-center justify-center overflow-hidden bg-slate-100 p-8">
              <div className="relative h-full w-full overflow-hidden rounded-2xl">
                <Image src={preview} alt="Receipt" fill className="object-contain" />
              </div>
              <button type="button" onClick={() => { setSelectedFile(null); setPreview(null); }}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-slate-500 shadow-sm backdrop-blur-sm hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Info panel — takes remaining space */}
            <div className="flex flex-1 flex-col justify-between p-10">
              <div>
                <div className="mb-8 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                    <ScanLine className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-[24px] font-medium tracking-[-0.015em] text-slate-900"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                      Ready to scan
                    </h2>
                    <p className="mt-0.5 text-[14.5px] text-slate-400">AI will extract items from your receipt</p>
                  </div>
                </div>

                {/* File card */}
                <div className="rounded-xl bg-white p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                      <FileImage className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-slate-700">{selectedFile.name}</p>
                      <p className="mt-0.5 text-[13px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                </div>

                {/* Steps preview — horizontal on wide screens */}
                <div className="mt-8">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">What happens next</p>
                  <div className="grid grid-cols-3 gap-3">
                    {["AI reads all text from the image", "Items matched to our food database", "Quantities estimated and added to pantry"].map((s, i) => (
                      <div key={i} className="rounded-xl bg-white p-4">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-600">{i + 1}</span>
                        <p className="mt-2.5 text-[13.5px] leading-[1.5] text-slate-500">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <Button variant="outline" onClick={() => { setSelectedFile(null); setPreview(null); }}
                  className="h-11 rounded-xl border-slate-200 px-5 text-[14px] text-slate-500 hover:bg-slate-50">
                  Change file
                </Button>
                <Button onClick={handleUpload} disabled={uploadReceipt.isPending}
                  className="h-11 flex-1 rounded-xl text-[14.5px] font-semibold text-white shadow-[0_3px_12px_rgba(27,125,90,0.25)]"
                  style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                  <Camera className="mr-2 h-4 w-4" />Begin Scan
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
           SCANNING — Cinematic split
           ═══════════════════════════════════════════════════ */}
        {phase === "scanning" && preview && (
          <div className="flex h-[560px]">
            {/* Left — Receipt with scan */}
            <div className="relative flex w-[380px] flex-shrink-0 items-center justify-center overflow-hidden p-8" style={{ background: "#0A0A0A" }}>
              <div className="relative h-full w-full overflow-hidden rounded-2xl opacity-60">
                <Image src={preview} alt="Scanning" fill className="object-contain" />
              </div>

              {/* Scan line + glow */}
              <div className="pointer-events-none absolute inset-8 overflow-hidden rounded-2xl">
                <div className="absolute inset-x-0 h-[2px]"
                  style={{
                    top: `${scanLinePos}%`,
                    background: "linear-gradient(90deg, transparent 0%, #34D399 25%, #34D399 75%, transparent 100%)",
                    boxShadow: "0 0 28px 8px rgba(52,211,153,0.2)",
                    transition: "none",
                  }} />
                <div className="pointer-events-none absolute inset-x-0 h-20 -translate-y-1/2"
                  style={{ top: `${scanLinePos}%`, background: "linear-gradient(to bottom, transparent, rgba(52,211,153,0.04), transparent)", transition: "none" }} />
              </div>

              {/* Frame */}
              <div className="pointer-events-none absolute inset-8 rounded-2xl"
                style={{ border: "1.5px solid rgba(52,211,153,0.1)" }} />

              {/* Status */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2"
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)" }}>
                <p className="flex items-center gap-2.5 text-[12px] font-semibold text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  Scanning in progress
                </p>
              </div>
            </div>

            {/* Right — AI feed (takes all remaining space) */}
            <div className="flex flex-1 flex-col justify-between p-10">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600">AI Scanner</p>
                </div>
                <h2 className="mt-4 text-[28px] font-medium leading-[1.12] tracking-[-0.015em] text-slate-900"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Reading your receipt...
                </h2>
                <p className="mt-2 text-[15px] text-slate-400">
                  Identifying items and matching to our database
                </p>
              </div>

              {/* Steps — 2×2 grid with plenty of space */}
              <div className="grid grid-cols-2 gap-3">
                {SCAN_STEPS.map((step, i) => {
                  const done = i < completedSteps;
                  const active = i === completedSteps;
                  return (
                    <div key={step} className={cn(
                      "flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all duration-400",
                      done ? "border-emerald-200/50 bg-emerald-50/40"
                        : active ? "border-slate-200 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
                        : "border-slate-100 bg-slate-50/40 opacity-30"
                    )}>
                      <div className={cn(
                        "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                        done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                      )}>
                        {done ? <CheckCircle2 className="h-[18px] w-[18px]" style={{ animation: "rl-check-pop 0.35s ease both" }} />
                          : active ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <span className="text-[12px] font-bold">{i + 1}</span>}
                      </div>
                      <div>
                        <p className={cn("text-[14.5px] font-medium", done ? "text-emerald-800" : "text-slate-500")}>
                          {step}
                        </p>
                        {done && <p className="mt-0.5 text-[11.5px] font-semibold text-emerald-500">Complete</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-slate-400">Processing</p>
                  <p className="text-[13px] font-semibold tabular-nums text-slate-600">{Math.round(scanProgress)}%</p>
                </div>
                <div className="h-[6px] w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ width: `${scanProgress}%`, background: "linear-gradient(90deg, #1B7D5A, #22956B)" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
           RESULTS — Compact, uses horizontal space
           ═══════════════════════════════════════════════════ */}
        {phase === "results" && uploadResult && (
          <div className="flex max-h-[85vh] min-h-[500px]">
            {/* Left — Receipt */}
            {displayImg && (
              <div className="relative hidden w-[380px] flex-shrink-0 items-center justify-center overflow-hidden bg-slate-50 p-6 md:flex">
                <div className="relative h-full w-full overflow-hidden rounded-2xl">
                  <Image src={displayImg} alt="Scanned receipt" fill className="object-contain" />
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-white/95 px-4 py-2 shadow-sm backdrop-blur-sm">
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />Scan complete
                  </p>
                </div>
              </div>
            )}

            {/* Right — Results */}
            <div className="flex flex-1 flex-col overflow-y-auto">
              {/* Header + Stats inline */}
              <div className="border-b border-slate-100 px-7 pb-5 pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className={cn("text-[20px] font-medium tracking-[-0.01em] text-slate-900", showResults ? "rl-s1" : "opacity-0")}
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                      Scan Results
                    </h2>
                    <p className={cn("mt-0.5 text-[13px] text-slate-400", showResults ? "rl-s1" : "opacity-0")}>
                      {uploadResult.auto_added_count + uploadResult.needs_confirmation_count} items found
                    </p>
                  </div>
                  {/* Stats inline with header */}
                  <div className={cn("flex items-center gap-3", showResults ? "rl-s2" : "opacity-0")}>
                    <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-4 py-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <div>
                        <span className="text-[20px] font-semibold leading-none text-emerald-800"
                          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                          {uploadResult.auto_added_count}
                        </span>
                        <p className="text-[10px] font-semibold text-emerald-600">Auto-added</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 px-4 py-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <div>
                        <span className="text-[20px] font-semibold leading-none text-amber-700"
                          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                          {uploadResult.needs_confirmation_count}
                        </span>
                        <p className="text-[10px] font-semibold text-amber-600">To review</p>
                      </div>
                    </div>
                    <button type="button" onClick={handleClose}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-5 px-7 pb-6 pt-5">
                {/* Auto-added — 2-column grid */}
                {uploadResult.auto_added.length > 0 && (
                  <div className={cn("rounded-xl border border-emerald-200/40 bg-emerald-50/25 p-4", showResults ? "rl-s2" : "opacity-0")}>
                    <div className="mb-3 flex items-center gap-2">
                      <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Added to Inventory</p>
                    </div>
                    <div className="grid max-h-[140px] grid-cols-2 gap-x-6 gap-y-1 overflow-y-auto">
                      {uploadResult.auto_added.map((item, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-emerald-50"
                          style={{ animation: `rl-item-in 0.3s ease ${0.25 + i * 0.03}s both` }}>
                          <span className="text-[13px] capitalize text-emerald-800">{item.item_name.replace(/_/g, " ")}</span>
                          <span className="text-[12px] font-semibold tabular-nums text-emerald-600">{item.quantity_grams}g</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review items — compact 2-column grid */}
                {visibleConfirmItems.length > 0 && (
                  <div className={cn("space-y-3", showResults ? "rl-s3" : "opacity-0")}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-[14px] font-semibold text-slate-800">Needs Your Review</h4>
                      {hasConfirmable && (
                        <Button size="sm" onClick={handleConfirmAll} disabled={confirmItem.isPending}
                          className="h-8 rounded-lg px-3.5 text-[12px] font-semibold"
                          style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                          {confirmItem.isPending ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3 w-3" />}
                          Confirm All
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {visibleConfirmItems.map(({ item, i }) =>
                        item.success ? (
                          <div key={i}
                            className="group rounded-xl border border-slate-200/80 bg-white p-3.5 transition-all duration-150 hover:shadow-[0_4px_14px_rgba(0,0,0,0.04)]"
                            style={{ animation: `rl-item-in 0.3s ease ${0.3 + i * 0.04}s both` }}>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="truncate text-[11px] text-slate-400">&quot;{item.input}&quot;</p>
                              <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                                item.confidence >= 0.8 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                                {Math.round(item.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-[14px] font-semibold capitalize text-slate-800">{item.item_name.replace(/_/g, " ")}</p>
                            <p className="text-[12px] text-slate-400">{item.quantity_grams}g</p>
                            <div className="mt-3 flex items-center gap-2">
                              <Button size="sm" onClick={() => handleConfirmSingle(item, i)} disabled={confirmItem.isPending}
                                className="h-7 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-700">
                                <CheckCircle2 className="mr-1 h-3 w-3" />Add
                              </Button>
                              <button type="button" onClick={() => handleDismiss(i)}
                                className="h-7 rounded-lg px-2 text-[11px] text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                                Skip
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div key={i}
                            className="rounded-xl border border-amber-200/50 bg-amber-50/30 p-3.5"
                            style={{ animation: `rl-item-in 0.3s ease ${0.3 + i * 0.04}s both` }}>
                            <div className="mb-1 flex items-center gap-1.5">
                              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100">
                                <AlertTriangle className="h-[9px] w-[9px] text-amber-500" />
                              </div>
                              <p className="text-[10px] font-semibold text-amber-600">Unknown</p>
                            </div>
                            <p className="text-[14px] font-semibold text-amber-900">{item.extracted.item_text}</p>
                            <p className="text-[12px] text-amber-600">{item.extracted.quantity} {item.extracted.unit}</p>
                            <button type="button" onClick={() => handleDismiss(i)}
                              className="mt-2 h-7 rounded-lg px-2 text-[11px] font-medium text-slate-500 hover:bg-amber-100/40">
                              Skip
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-7 py-4">
                <div className="flex justify-end gap-2.5">
                  {!hasConfirmable ? (
                    <Button onClick={handleClose}
                      className="h-10 rounded-xl px-5 text-[13px] font-semibold"
                      style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                      Done <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleClose}
                        className="h-10 rounded-xl border-slate-200 px-4 text-[13px] text-slate-500">Finish Later</Button>
                      <Button onClick={handleConfirmAll} disabled={confirmItem.isPending}
                        className="h-10 rounded-xl px-5 text-[13px] font-semibold shadow-[0_2px_10px_rgba(27,125,90,0.2)]"
                        style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                        {confirmItem.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-2 h-3.5 w-3.5" />}
                        Confirm All
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}