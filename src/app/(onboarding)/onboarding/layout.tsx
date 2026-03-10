'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DM_Sans, Fraunces } from 'next/font/google';
import { AnimatePresence, motion } from 'framer-motion';

const steps = [
  {
    number: 1,
    path: '/onboarding/basic-info',
    title: 'Basics',
    blurb: 'Body metrics and activity',
  },
  {
    number: 2,
    path: '/onboarding/goal-selection',
    title: 'Goal',
    blurb: 'Primary outcome',
  },
  {
    number: 3,
    path: '/onboarding/path-selection',
    title: 'Pattern',
    blurb: 'Daily eating rhythm',
  },
  {
    number: 4,
    path: '/onboarding/preferences',
    title: 'Preferences',
    blurb: 'Cuisine and constraints',
  },
];

const SLIDE_EASE = [0.4, 0, 0.2, 1] as const;

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-onboarding-sans',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-onboarding-serif',
});

const pageVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 56 : -56,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? -56 : 56,
    opacity: 0,
  }),
};

const pageTransition = {
  duration: 0.32,
  ease: SLIDE_EASE,
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentStepIndex = steps.findIndex((step) => pathname.includes(step.path));
  const activeStep = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;
  const activeStepData = steps[Math.max(0, activeStep - 1)];
  const progressPercent = useMemo(() => (activeStep / steps.length) * 100, [activeStep]);

  const prevStepRef = useRef(activeStep);
  const direction = activeStep - prevStepRef.current;
  prevStepRef.current = activeStep;

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <>
      <div className={`${dmSans.variable} ${fraunces.variable} flex min-h-screen font-[var(--font-onboarding-sans)]`}>
        <aside
          className="relative hidden flex-col justify-between overflow-hidden lg:flex lg:w-[36%] xl:w-[32%]"
          style={{
            background:
              'linear-gradient(165deg, #0C3B2E 0%, #14533C 34%, #1B7D5A 66%, #1A6B4C 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 22% 80%, rgba(255,255,255,0.04) 1px, transparent 1px), radial-gradient(circle at 82% 18%, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '54px 54px',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 64% 72% at 8% 88%, rgba(34,149,107,0.24), transparent 56%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 45% 54% at 92% 12%, rgba(247,178,100,0.14), transparent 52%)',
            }}
          />

          <div className="relative z-[1] flex h-full flex-col justify-between px-8 py-10 xl:px-10 xl:py-12">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  <span
                    className="text-[15px] font-bold text-white"
                    style={{ fontFamily: 'var(--font-onboarding-serif), Georgia, serif' }}
                  >
                    N
                  </span>
                </div>
                <span className="text-[15px] font-semibold text-white/85">NutriLens</span>
              </Link>

              <h1
                className="mt-10 max-w-[290px] text-[30px] font-medium leading-[1.08] tracking-[-0.025em] text-white xl:text-[32px]"
                style={{ fontFamily: 'var(--font-onboarding-serif), Georgia, serif' }}
              >
                Build a plan that fits your real routine.
              </h1>
              <p className="mt-4 max-w-[310px] text-[14px] leading-[1.68] text-white/52">
                This setup takes under a minute and creates a personalized nutrition baseline you can
                actually sustain.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              {steps.map((step) => {
                const isActive = step.number === activeStep;
                const isComplete = step.number < activeStep;
                return (
                  <div
                    key={step.path}
                    className="relative flex items-center gap-3 rounded-[14px] border px-3.5 py-3 transition-all duration-200"
                    style={{
                      borderColor: isActive ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.12)',
                      background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
                      boxShadow: isActive ? '0 10px 26px -20px rgba(2, 6, 23, 0.8)' : 'none',
                    }}
                  >
                    {isActive ? (
                      <div className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-[#6EE7B7] via-[#34D399] to-[#E29D4A]" />
                    ) : null}

                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={{
                        background: isComplete
                          ? 'rgba(52,211,153,0.24)'
                          : isActive
                            ? 'rgba(255,255,255,0.2)'
                            : 'rgba(255,255,255,0.12)',
                        color: isComplete ? '#6EE7B7' : 'rgba(255,255,255,0.8)',
                      }}
                    >
                      {step.number}
                    </div>
                    <div>
                      <p className="text-[13.5px] font-semibold text-white/90">{step.title}</p>
                      <p className="text-[12px] text-white/45">{step.blurb}</p>
                    </div>
                    {isActive ? (
                      <span className="ml-auto rounded-full border border-white/35 bg-white/18 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-white/88">
                        Current
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <p className="mt-8 text-[12px] text-white/28">Built for real routines, not perfect conditions.</p>
          </div>
        </aside>

        <div
          className="relative flex flex-1 flex-col overflow-hidden"
          style={{
            background:
              'radial-gradient(95% 100% at 10% 0%, rgba(212,242,228,0.55) 0%, transparent 56%), radial-gradient(75% 90% at 92% 12%, rgba(255,228,196,0.38) 0%, transparent 60%), linear-gradient(165deg, #FAFAF7 0%, #F7F8F3 44%, #FCFBF8 100%)',
          }}
        >
          <header className="border-b border-slate-200/65 bg-white/74 backdrop-blur-lg">
            <div className="mx-auto w-full max-w-4xl px-6 py-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2.5 lg:hidden">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ background: 'linear-gradient(135deg, #1B7D5A, #22956B)' }}
                    >
                      <span
                        className="text-[12px] font-bold text-white"
                        style={{ fontFamily: 'var(--font-onboarding-serif), Georgia, serif' }}
                      >
                        N
                      </span>
                    </div>
                    <span className="text-[14px] font-semibold text-slate-800">NutriLens</span>
                  </div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: '#1B7D5A' }}
                  >
                    Onboarding
                  </p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    Step {activeStep} of {steps.length}: {activeStepData.title}
                  </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-white/90 px-3.5 py-1.5 text-[11.5px] font-medium text-slate-600">
                  Personalized setup
                </div>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/75">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#1B7D5A] via-[#22956B] to-[#E29D4A]"
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.4, ease: SLIDE_EASE }}
                />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-4xl overflow-hidden px-6 py-8 md:py-10">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={pathname}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={pageTransition}
                className="mx-auto w-full max-w-3xl"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </>
  );
}
