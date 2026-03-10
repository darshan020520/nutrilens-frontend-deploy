'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface StepTransitionOverlayProps {
  open: boolean;
  ready: boolean;
  title: string;
  description: string;
  checkpoints: string[];
  completionTitle: string;
  completionDescription: string;
  onComplete: () => void;
}

const SPRING_EASE = [0.22, 1, 0.36, 1] as const;
const REVEAL_START_DELAY_MS = 320;
const REVEAL_STEP_DELAY_MS = 520;
const COMPLETION_REVEAL_DELAY_MS = 180;
const COMPLETE_ROUTE_DELAY_MS = 420;
const MIN_TRANSITION_DURATION_MS = 2200;

export default function StepTransitionOverlay({
  open,
  ready,
  title,
  description,
  checkpoints,
  completionTitle,
  completionDescription,
  onComplete,
}: StepTransitionOverlayProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [mounted, setMounted] = useState(false);

  const doneTimeoutRef = useRef<number | null>(null);
  const revealTimeoutRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);
  const openedAtRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setVisibleCount(0);
      setProgress(0);
      setShowCompletion(false);
      hasCompletedRef.current = false;
      if (doneTimeoutRef.current) window.clearTimeout(doneTimeoutRef.current);
      if (revealTimeoutRef.current) window.clearTimeout(revealTimeoutRef.current);
      return;
    }

    setVisibleCount(0);
    setProgress(0);
    setShowCompletion(false);
    hasCompletedRef.current = false;
    openedAtRef.current = performance.now();

    let revealTimeout: number | null = null;
    const revealNext = () => {
      setVisibleCount((prev) => {
        if (prev >= checkpoints.length) return prev;
        const nextCompleted = prev + 1;
        const clampedCompleted = Math.min(nextCompleted, checkpoints.length);
        const syncedProgress = checkpoints.length > 0 ? (clampedCompleted / checkpoints.length) * 90 : 90;
        setProgress(syncedProgress);

        if (nextCompleted < checkpoints.length) {
          revealTimeout = window.setTimeout(revealNext, REVEAL_STEP_DELAY_MS);
        }
        return nextCompleted;
      });
    };

    revealTimeout = window.setTimeout(revealNext, REVEAL_START_DELAY_MS);

    return () => {
      if (revealTimeout) window.clearTimeout(revealTimeout);
      if (doneTimeoutRef.current) window.clearTimeout(doneTimeoutRef.current);
      if (revealTimeoutRef.current) window.clearTimeout(revealTimeoutRef.current);
    };
  }, [checkpoints.length, open]);

  useEffect(() => {
    if (!open || !ready || hasCompletedRef.current) return;
    if (visibleCount < checkpoints.length) return;

    const runCompletion = () => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      setProgress(100);

      revealTimeoutRef.current = window.setTimeout(() => {
        setShowCompletion(true);
      }, COMPLETION_REVEAL_DELAY_MS);

      doneTimeoutRef.current = window.setTimeout(() => {
        onComplete();
      }, COMPLETE_ROUTE_DELAY_MS);
    };

    const elapsed = performance.now() - openedAtRef.current;
    const remainingMinDuration = Math.max(0, MIN_TRANSITION_DURATION_MS - elapsed);
    doneTimeoutRef.current = window.setTimeout(runCompletion, remainingMinDuration);
  }, [checkpoints.length, onComplete, open, ready, visibleCount]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{
            background: 'rgba(2, 6, 23, 0.26)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          <div className="flex min-h-full items-center justify-center px-6 py-8">
            <motion.div
              className="relative w-full max-w-xl overflow-hidden rounded-[24px] border border-white/75 bg-[linear-gradient(168deg,#ffffff_0%,#f4faf6_46%,#fff7ec_100%)] p-8 shadow-[0_36px_88px_-44px_rgba(15,23,42,0.65),0_0_0_1px_rgba(255,255,255,0.6)_inset]"
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{
                scale: showCompletion ? 1.015 : 1,
                opacity: 1,
                y: 0,
              }}
              transition={{ duration: 0.42, ease: SPRING_EASE }}
            >
              <div className="pointer-events-none absolute -left-20 -top-8 h-48 w-48 rounded-full bg-emerald-300/22 blur-3xl" />
              <div className="pointer-events-none absolute -right-20 top-12 h-48 w-48 rounded-full bg-amber-300/18 blur-3xl" />

              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-700/75">
                  Precision Personalization
                </p>

                <motion.div
                  animate={showCompletion ? { opacity: 0, y: -6 } : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.26 }}
                >
                  <h3
                    className="mt-2.5 text-[28px] font-medium leading-[1.08] tracking-[-0.02em] text-slate-900"
                    style={{ fontFamily: "var(--font-onboarding-serif), Georgia, serif" }}
                  >
                    {title}
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">{description}</p>
                </motion.div>

                <motion.div
                  className="absolute left-0 top-7 w-full"
                  initial={{ opacity: 0, y: 8 }}
                  animate={showCompletion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={{ duration: 0.3, ease: SPRING_EASE }}
                >
                  <h3
                    className="text-[28px] font-medium leading-[1.08] tracking-[-0.02em] text-slate-900"
                    style={{ fontFamily: "var(--font-onboarding-serif), Georgia, serif" }}
                  >
                    {completionTitle}
                  </h3>
                  <p className="mt-1.5 text-[14px] text-slate-500">{completionDescription}</p>
                </motion.div>
              </div>

              <motion.div
                className="mt-6 space-y-2.5"
                animate={{ opacity: showCompletion ? 0 : 1 }}
                transition={{ duration: 0.22 }}
              >
                {checkpoints.slice(0, visibleCount).map((checkpoint, index) => {
                  return (
                    <motion.div
                      key={checkpoint}
                      className="flex items-center gap-3 rounded-[14px] border border-slate-200/80 bg-white/86 px-3.5 py-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.34, ease: SPRING_EASE, delay: index * 0.02 }}
                    >
                      <motion.div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        animate={{
                          scale: 1,
                          borderWidth: '1.5px',
                          borderColor: 'rgb(110, 231, 183)',
                          backgroundColor: 'rgb(209, 250, 229)',
                          boxShadow: '0 0 0 5px rgba(16, 185, 129, 0.13)',
                        }}
                        transition={{ duration: 0.3, ease: SPRING_EASE }}
                      >
                        <Check className="h-2.5 w-2.5" style={{ color: 'rgb(5, 150, 105)' }} />
                      </motion.div>
                      <p className="text-sm text-slate-700">{checkpoint}</p>
                    </motion.div>
                  );
                })}
              </motion.div>

              <div className="mt-7 h-[6px] overflow-hidden rounded-full bg-slate-200/70">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#1B7D5A] via-[#22956B] to-[#E29D4A]"
                  animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                  transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

