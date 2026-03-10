'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Beef, Check, Fish, Leaf, Loader2, Salad } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { onboardingAPI } from '@/lib/api';
import StepTransitionOverlay from '../components/StepTransitionOverlay';
import { getOnboardingFirstName } from '../components/onboardingSession';

const formSchema = z.object({
  dietary_type: z.enum(['vegetarian', 'non_vegetarian', 'vegan', 'pescatarian']),
  allergies: z.array(z.string()).optional(),
  cuisine_preferences: z.array(z.string()).min(1, 'Select at least one cuisine'),
  max_prep_time_weekday: z.number().min(10).max(120),
  max_prep_time_weekend: z.number().min(10).max(180),
});

type FormValues = z.infer<typeof formSchema>;

type CalculatedTargetsResponse = {
  bmr: number;
  tdee: number;
  goal_calories: number;
  macro_targets: {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  meals_per_day: number;
};

type TargetDraft = {
  goal_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type PreferencesResponse = {
  redirect_to: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { detail?: { message?: string } | string } } }).response?.data?.detail ===
      'string'
  ) {
    return (error as { response?: { data?: { detail?: string } } }).response?.data?.detail as string;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { detail?: { message?: string } } } }).response?.data?.detail?.message ===
      'string'
  ) {
    return (error as { response?: { data?: { detail?: { message?: string } } } }).response?.data?.detail?.message as string;
  }

  return fallback;
}

function useAnimatedValue(target: number, triggerKey: number, delayMs: number): number {
  const [value, setValue] = useState(target);
  const previousTriggerRef = useRef(triggerKey);

  useEffect(() => {
    if (triggerKey === previousTriggerRef.current) {
      setValue(target);
      return;
    }

    previousTriggerRef.current = triggerKey;
    let frameId: number | null = null;
    let delayTimer: number | null = null;
    const startValue = 0;
    const duration = 900;

    delayTimer = window.setTimeout(() => {
      const startTime = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const next = startValue + (target - startValue) * eased;
        setValue(Math.round(next));
        if (progress < 1) {
          frameId = window.requestAnimationFrame(animate);
        }
      };
      frameId = window.requestAnimationFrame(animate);
    }, delayMs);

    return () => {
      if (delayTimer) window.clearTimeout(delayTimer);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [delayMs, target, triggerKey]);

  return value;
}

const SPRING_EASE = [0.22, 1, 0.36, 1] as const;

const cuisineOptions = [
  { value: 'indian', label: 'Indian' },
  { value: 'continental', label: 'Continental' },
  { value: 'asian', label: 'Asian' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'italian', label: 'Italian' },
];

const allergyOptions = [
  { value: 'nuts', label: 'Nuts' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'soy', label: 'Soy' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'shellfish', label: 'Shellfish' },
];

const macroCards = [
  { key: 'goal_calories' as const, label: 'Calories', unit: '', accent: 'emerald', big: true },
  { key: 'protein_g' as const, label: 'Protein', unit: 'g', accent: 'blue', big: false },
  { key: 'carbs_g' as const, label: 'Carbs', unit: 'g', accent: 'amber', big: false },
  { key: 'fat_g' as const, label: 'Fat', unit: 'g', accent: 'rose', big: false },
];

const accentStyles: Record<string, { card: string; label: string; value: string }> = {
  emerald: {
    card: 'border-emerald-200/80 bg-emerald-50/70',
    label: 'text-emerald-700/80',
    value: 'text-emerald-900',
  },
  blue: {
    card: 'border-blue-200/70 bg-blue-50/50',
    label: 'text-blue-600/80',
    value: 'text-slate-900',
  },
  amber: {
    card: 'border-amber-200/70 bg-amber-50/50',
    label: 'text-amber-600/80',
    value: 'text-slate-900',
  },
  rose: {
    card: 'border-rose-200/70 bg-rose-50/50',
    label: 'text-rose-600/80',
    value: 'text-slate-900',
  },
};

export default function PreferencesPage() {
  const DASHBOARD_WELCOME_KEY = 'nutrilens:onboarding:dashboard-welcome';
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [targetsReady, setTargetsReady] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [counterTrigger, setCounterTrigger] = useState(0);
  const [pendingPreferences, setPendingPreferences] = useState<FormValues | null>(null);
  const [targetDraft, setTargetDraft] = useState<TargetDraft | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [lockButtonSuccess, setLockButtonSuccess] = useState(false);
  const [showCompletionPanel, setShowCompletionPanel] = useState(false);
  const [completionVisibleCount, setCompletionVisibleCount] = useState(0);
  const [isExitingToDashboard, setIsExitingToDashboard] = useState(false);
  const transitionTimersRef = useRef<number[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dietary_type: 'non_vegetarian',
      allergies: [],
      cuisine_preferences: ['indian'],
      max_prep_time_weekday: 30,
      max_prep_time_weekend: 60,
    },
  });

  useEffect(() => {
    setFirstName(getOnboardingFirstName());
  }, []);

  useEffect(() => {
    return () => {
      transitionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      transitionTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!showCompletionPanel) {
      setCompletionVisibleCount(0);
      return;
    }

    setCompletionVisibleCount(0);
    let visible = 0;
    const intervalId = window.setInterval(() => {
      visible += 1;
      setCompletionVisibleCount(Math.min(3, visible));
      if (visible >= 3) {
        window.clearInterval(intervalId);
      }
    }, 160);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [showCompletionPanel]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setTargetsReady(false);
    setPendingPreferences(values);
    setShowReveal(false);
    setLockButtonSuccess(false);
    setShowCompletionPanel(false);
    setCompletionVisibleCount(0);
    setIsExitingToDashboard(false);

    const openTimer = window.setTimeout(() => {
      setShowProcessing(true);
    }, 300);

    try {
      const targets = (await onboardingAPI.getCalculatedTargets()) as CalculatedTargetsResponse;
      setTargetDraft({
        goal_calories: Math.round(targets.goal_calories),
        protein_g: Math.round(targets.macro_targets.protein_g),
        carbs_g: Math.round(targets.macro_targets.carbs_g),
        fat_g: Math.round(targets.macro_targets.fat_g),
      });
      setTargetsReady(true);
    } catch (error: unknown) {
      window.clearTimeout(openTimer);
      setShowProcessing(false);
      setIsSubmitting(false);
      toast.error(getErrorMessage(error, 'Failed to generate personalized targets'));
    }
  };

  const caloriesAnimated = useAnimatedValue(targetDraft?.goal_calories ?? 0, counterTrigger, 0);
  const proteinAnimated = useAnimatedValue(targetDraft?.protein_g ?? 0, counterTrigger, 120);
  const carbsAnimated = useAnimatedValue(targetDraft?.carbs_g ?? 0, counterTrigger, 240);
  const fatAnimated = useAnimatedValue(targetDraft?.fat_g ?? 0, counterTrigger, 360);

  const animatedValues = {
    goal_calories: caloriesAnimated,
    protein_g: proteinAnimated,
    carbs_g: carbsAnimated,
    fat_g: fatAnimated,
  };

  const handleDraftChange = (field: keyof TargetDraft, value: number) => {
    if (!targetDraft) return;
    setTargetDraft({
      ...targetDraft,
      [field]: Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0,
    });
  };

  const handleFinalize = async () => {
    if (!pendingPreferences || !targetDraft) return;

    setIsLocking(true);
    try {
      await onboardingAPI.lockTargets(targetDraft);
      const response = (await onboardingAPI.submitPreferences({
        ...pendingPreferences,
        disliked_ingredients: [],
      })) as PreferencesResponse;

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          DASHBOARD_WELCOME_KEY,
          JSON.stringify({
            firstName: firstName.trim(),
            calories: targetDraft.goal_calories,
            source: 'onboarding-complete',
            timestamp: Date.now(),
          })
        );
      }

      setLockButtonSuccess(true);
      setIsLocking(false);

      transitionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      transitionTimersRef.current = [];

      const phaseOneTimer = window.setTimeout(() => {
        setShowCompletionPanel(true);

        const bridgeTransitionTimer = window.setTimeout(() => {
          setIsExitingToDashboard(true);
          const routeTimer = window.setTimeout(() => {
            router.push(response.redirect_to);
          }, 380);
          transitionTimersRef.current.push(routeTimer);
        }, 1200);

        transitionTimersRef.current.push(bridgeTransitionTimer);
      }, 300);
      transitionTimersRef.current.push(phaseOneTimer);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to complete onboarding'));
      setLockButtonSuccess(false);
      setShowCompletionPanel(false);
      setIsExitingToDashboard(false);
      setIsLocking(false);
    }
  };

  return (
    <motion.div
      animate={isExitingToDashboard ? { opacity: 0, scale: 0.97 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.46)] transition-[transform,opacity] duration-300',
          showProcessing ? 'scale-[0.98] opacity-85' : 'scale-100 opacity-100'
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1B7D5A] via-[#22956B] to-[#E29D4A]" />

        {/* AnimatePresence crossfades between the form view and reveal view */}
        <AnimatePresence mode="wait">
          {showReveal && targetDraft ? (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: SPRING_EASE }}
              className="p-7 md:p-8"
            >
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1B7D5A]">
                  Final Review
                </p>
                <h2
                  className="text-[28px] font-medium tracking-[-0.024em] text-slate-900 md:text-[30px]"
                  style={{ fontFamily: "var(--font-onboarding-serif), Georgia, serif" }}
                >
                  {firstName ? `${firstName}, your plan is ready.` : 'Your plan is ready.'}
                </h2>
                <p className="text-[14px] leading-relaxed text-slate-500">
                  Here&apos;s your personalized starting point.
                </p>
              </div>

              {/* Macro summary cards */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {macroCards.map((card, index) => {
                  const styles = accentStyles[card.accent];
                  const displayValue = animatedValues[card.key];
                  return (
                    <motion.div
                      key={card.key}
                      className={cn(
                        'rounded-[18px] border p-4',
                        styles.card
                      )}
                      initial={{ opacity: 0, y: 16, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.38,
                        ease: SPRING_EASE,
                        delay: index * 0.08,
                      }}
                    >
                      <p className={cn('text-xs font-semibold uppercase tracking-[0.12em]', styles.label)}>
                        {card.label}
                      </p>
                      <p className={cn('mt-1 font-semibold leading-none tracking-tight', styles.value, card.big ? 'text-[34px]' : 'text-[26px]')}>
                        {displayValue.toLocaleString()}
                        <span className="text-sm font-normal opacity-60">{card.unit || ' kcal'}</span>
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Fine-tune inputs */}
              <motion.div
                className="mt-5 rounded-[18px] border border-slate-200 bg-white/85 p-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: SPRING_EASE, delay: 0.35 }}
              >
                <p className="text-sm text-slate-500">
                  You can fine-tune these before locking them in.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                      Calories
                    </Label>
                    <Input
                      type="number"
                      value={targetDraft.goal_calories}
                      onChange={(event) => handleDraftChange('goal_calories', event.target.valueAsNumber)}
                      className="mt-1 h-11 rounded-[14px] border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                      Protein (g)
                    </Label>
                    <Input
                      type="number"
                      value={targetDraft.protein_g}
                      onChange={(event) => handleDraftChange('protein_g', event.target.valueAsNumber)}
                      className="mt-1 h-11 rounded-[14px] border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                      Carbs (g)
                    </Label>
                    <Input
                      type="number"
                      value={targetDraft.carbs_g}
                      onChange={(event) => handleDraftChange('carbs_g', event.target.valueAsNumber)}
                      className="mt-1 h-11 rounded-[14px] border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                      Fat (g)
                    </Label>
                    <Input
                      type="number"
                      value={targetDraft.fat_g}
                      onChange={(event) => handleDraftChange('fat_g', event.target.valueAsNumber)}
                      className="mt-1 h-11 rounded-[14px] border-slate-200"
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLocking}
                    onClick={() => {
                      setShowReveal(false);
                      setIsSubmitting(false);
                    }}
                    className="h-11 rounded-[14px] border-slate-200 px-5"
                  >
                    Back to preferences
                  </Button>

                  <Button
                    type="button"
                    disabled={isLocking}
                    onClick={handleFinalize}
                    className={cn(
                      'relative h-11 min-w-[188px] overflow-hidden rounded-[14px] bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_16px_30px_-18px_rgba(5,150,105,0.75)] active:scale-[0.98]',
                      lockButtonSuccess ? 'from-emerald-500 to-teal-500 shadow-[0_0_0_8px_rgba(16,185,129,0.14)]' : ''
                    )}
                  >
                    <span
                      className={cn(
                        'absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-200',
                        !isLocking && !lockButtonSuccess ? 'opacity-100' : 'opacity-0'
                      )}
                    >
                      Lock in my targets
                    </span>
                    <span
                      className={cn(
                        'absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-200',
                        isLocking ? 'opacity-100' : 'opacity-0'
                      )}
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Locking...
                    </span>
                    <span
                      className={cn(
                        'absolute inset-0 flex items-center justify-center gap-2 transition-[opacity,transform] duration-300',
                        lockButtonSuccess ? 'scale-100 opacity-100' : 'scale-[0.8] opacity-0'
                      )}
                    >
                      <Check className="h-4 w-4" />
                      Targets locked
                    </span>
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
              className="p-7 md:p-8"
            >
              <motion.div
                className="space-y-1.5"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, ease: SPRING_EASE }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1B7D5A]">
                  Step 4 of 4
                </p>
                <h2
                  className="text-[28px] font-medium tracking-[-0.024em] text-slate-900 md:text-[30px]"
                  style={{ fontFamily: "var(--font-onboarding-serif), Georgia, serif" }}
                >
                  Final step: Your preferences
                </h2>
                <p className="text-[14px] leading-relaxed text-slate-500">
                  Help us fine-tune your nutrition plan.
                </p>
              </motion.div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-7 space-y-6">
                  <motion.div
                    className="space-y-4 rounded-[18px] border border-slate-200 bg-white/85 p-5"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.38, ease: SPRING_EASE, delay: 0.07 }}
                  >
                    <FormField
                      control={form.control}
                      name="dietary_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                            Dietary preference
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <FormControl>
                              <SelectTrigger className="h-12 w-full rounded-[16px] border-slate-200 bg-white/90">
                                <SelectValue placeholder="Select dietary type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-[14px] border-slate-200 bg-white/96">
                              <SelectItem value="non_vegetarian">
                                <div className="flex items-center gap-2">
                                  <Beef className="h-4 w-4" />
                                  Non-vegetarian
                                </div>
                              </SelectItem>
                              <SelectItem value="vegetarian">
                                <div className="flex items-center gap-2">
                                  <Salad className="h-4 w-4" />
                                  Vegetarian
                                </div>
                              </SelectItem>
                              <SelectItem value="vegan">
                                <div className="flex items-center gap-2">
                                  <Leaf className="h-4 w-4" />
                                  Vegan
                                </div>
                              </SelectItem>
                              <SelectItem value="pescatarian">
                                <div className="flex items-center gap-2">
                                  <Fish className="h-4 w-4" />
                                  Pescatarian
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="allergies"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                            Allergies (optional)
                          </FormLabel>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {allergyOptions.map((allergy) => (
                              <FormField
                                key={allergy.value}
                                control={form.control}
                                name="allergies"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2 rounded-[12px] border border-slate-200/80 bg-white/80 px-3 py-2.5">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(allergy.value)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value ?? [];
                                          const next = checked
                                            ? [...current, allergy.value]
                                            : current.filter((value) => value !== allergy.value);
                                          field.onChange(next);
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="cursor-pointer font-normal text-slate-700">
                                      {allergy.label}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  <motion.div
                    className="space-y-4 rounded-[18px] border border-slate-200 bg-white/85 p-5"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.38, ease: SPRING_EASE, delay: 0.14 }}
                  >
                    <FormField
                      control={form.control}
                      name="cuisine_preferences"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                            Favorite cuisines
                          </FormLabel>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {cuisineOptions.map((cuisine) => (
                              <FormField
                                key={cuisine.value}
                                control={form.control}
                                name="cuisine_preferences"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2 rounded-[12px] border border-slate-200/80 bg-white/80 px-3 py-2.5">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(cuisine.value)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value ?? [];
                                          const next = checked
                                            ? [...current, cuisine.value]
                                            : current.filter((value) => value !== cuisine.value);
                                          field.onChange(next);
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="cursor-pointer font-normal text-slate-700">
                                      {cuisine.label}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="max_prep_time_weekday"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                              Weekday prep time (min)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.valueAsNumber)}
                                disabled={isSubmitting}
                                className="h-12 rounded-[14px] border-slate-200"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="max_prep_time_weekend"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                              Weekend prep time (min)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.valueAsNumber)}
                                disabled={isSubmitting}
                                className="h-12 rounded-[14px] border-slate-200"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.36, ease: SPRING_EASE, delay: 0.22 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={isSubmitting}
                      className="h-12 rounded-[16px] border-slate-200 px-6"
                    >
                      Back
                    </Button>

                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="relative h-12 w-full overflow-hidden rounded-[16px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_16px_30px_-20px_rgba(5,150,105,0.7)] transition-all duration-200 hover:from-emerald-500 hover:to-teal-500 hover:shadow-[0_20px_34px_-20px_rgba(5,150,105,0.82)] active:scale-[0.98] sm:w-[286px]"
                    >
                      <span className={cn('transition-opacity duration-200', isSubmitting ? 'opacity-0' : 'opacity-100')}>
                        Generate my personalized targets
                      </span>
                      <span
                        className={cn(
                          'pointer-events-none absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-200',
                          isSubmitting ? 'opacity-100' : 'opacity-0'
                        )}
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </span>
                    </Button>
                  </motion.div>
                </form>
              </Form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <StepTransitionOverlay
        open={showProcessing}
        ready={targetsReady}
        title="Creating your personalized nutrition blueprint..."
        description="Analyzing your goals, lifestyle, and preferences."
        checkpoints={[
          'Understanding your profile',
          'Balancing calories intelligently',
          'Optimizing macro distribution',
          'Applying safety safeguards',
        ]}
        completionTitle={firstName ? `${firstName}, your plan is ready.` : 'Your plan is ready.'}
        completionDescription="Here's your personalized starting point."
        onComplete={() => {
          setShowProcessing(false);
          setShowReveal(true);
          setIsSubmitting(false);
          setCounterTrigger((previous) => previous + 1);
        }}
      />

      {/* Completion panel */}
      <AnimatePresence>
        {showCompletionPanel && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto px-6 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: isExitingToDashboard ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
            style={{ background: 'rgba(2, 6, 23, 0.18)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <motion.div
              className="relative my-auto w-full max-w-md overflow-hidden rounded-[22px] border border-white/75 bg-[linear-gradient(165deg,#ffffff_0%,#f9f9f2_52%,#ffffff_100%)] p-7 shadow-[0_32px_72px_-36px_rgba(15,23,42,0.5)]"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Ambient glow */}
              <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/20 blur-3xl" />
              <div className="pointer-events-none absolute right-0 top-4 h-32 w-32 translate-x-1/3 rounded-full bg-amber-300/20 blur-3xl" />

              {/* Check icon */}
              <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full border border-emerald-400/50"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Check className="h-7 w-7 text-emerald-600" />
                </motion.div>
              </div>

              <h3 className="text-center text-[22px] font-semibold tracking-[-0.015em] text-slate-900">
                {firstName ? `You're all set, ${firstName}.` : "You're all set."}
              </h3>
              <p className="mt-2 text-center text-sm text-slate-500">
                Your personalized nutrition plan is ready to go.
              </p>

              <div className="mt-5 space-y-2">
                {(['Targets locked', 'Profile calibrated', 'Ready to start tracking'] as const).map((line, index) => (
                  <motion.div
                    key={line}
                    className="flex items-center gap-2.5 rounded-[12px] border border-slate-200/90 bg-white/90 px-3.5 py-2.5 text-sm text-slate-700"
                    initial={{ opacity: 0, y: 10 }}
                    animate={
                      completionVisibleCount > index
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: 10 }
                    }
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Check className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span>{line}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

