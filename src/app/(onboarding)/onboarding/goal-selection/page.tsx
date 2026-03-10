'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Activity, Dumbbell, Heart, Loader2, Scale, Target, TrendingUp } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { onboardingAPI } from '@/lib/api';
import StepTransitionOverlay from '../components/StepTransitionOverlay';
import { getOnboardingFirstName } from '../components/onboardingSession';

const formSchema = z.object({
  goal_type: z.enum(['muscle_gain', 'fat_loss', 'body_recomp', 'weight_training', 'endurance', 'general_health']),
  target_weight: z.number().min(30).max(300).optional(),
  target_date: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type GoalSelectionResponse = {
  next_step: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { detail?: { message?: string } } } }).response?.data?.detail
      ?.message === 'string'
  ) {
    return (error as { response?: { data?: { detail?: { message?: string } } } }).response?.data?.detail
      ?.message as string;
  }
  return fallback;
}

const SPRING_EASE = [0.22, 1, 0.36, 1] as const;

const goalOptions = [
  {
    value: 'fat_loss',
    icon: TrendingUp,
    title: 'Fat loss',
    description: 'Reduce body fat while preserving muscle',
    tone: 'text-rose-700 bg-rose-50',
    selectedTone: 'border-rose-300/70 bg-rose-50/70 shadow-[0_16px_34px_-24px_rgba(225,29,72,0.34)]',
  },
  {
    value: 'muscle_gain',
    icon: Dumbbell,
    title: 'Muscle gain',
    description: 'Build lean mass with higher protein support',
    tone: 'text-blue-700 bg-blue-50',
    selectedTone: 'border-blue-300/70 bg-blue-50/70 shadow-[0_16px_34px_-24px_rgba(29,78,216,0.34)]',
  },
  {
    value: 'body_recomp',
    icon: Scale,
    title: 'Body recomposition',
    description: 'Progressively lose fat while improving muscle',
    tone: 'text-amber-700 bg-amber-50',
    selectedTone: 'border-amber-300/70 bg-amber-50/75 shadow-[0_16px_34px_-24px_rgba(217,119,6,0.34)]',
  },
  {
    value: 'weight_training',
    icon: Activity,
    title: 'Training performance',
    description: 'Fuel strength sessions and recovery better',
    tone: 'text-indigo-700 bg-indigo-50',
    selectedTone: 'border-indigo-300/70 bg-indigo-50/75 shadow-[0_16px_34px_-24px_rgba(79,70,229,0.34)]',
  },
  {
    value: 'endurance',
    icon: Target,
    title: 'Endurance',
    description: 'Support higher energy demand for cardio focus',
    tone: 'text-emerald-600 bg-emerald-50',
    selectedTone: 'border-emerald-400/80 bg-emerald-50/75 shadow-[0_16px_34px_-24px_rgba(16,185,129,0.4)]',
  },
  {
    value: 'general_health',
    icon: Heart,
    title: 'General health',
    description: 'Maintain a sustainable and balanced routine',
    tone: 'text-teal-700 bg-teal-50',
    selectedTone: 'border-teal-300/70 bg-teal-50/75 shadow-[0_16px_34px_-24px_rgba(13,148,136,0.34)]',
  },
];

export default function GoalSelectionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [requestReady, setRequestReady] = useState(false);
  const [nextStep, setNextStep] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goal_type: 'fat_loss',
    },
  });

  useEffect(() => {
    setFirstName(getOnboardingFirstName());
  }, []);

  const selectedGoal = form.watch('goal_type');

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setRequestReady(false);
    setNextStep(null);

    const openTimer = window.setTimeout(() => {
      setShowTransition(true);
    }, 300);

    try {
      const response = (await onboardingAPI.submitGoal(values)) as GoalSelectionResponse;
      setNextStep(response.next_step);
      setRequestReady(true);
    } catch (error: unknown) {
      window.clearTimeout(openTimer);
      setShowTransition(false);
      setIsSubmitting(false);
      setRequestReady(false);
      toast.error(getErrorMessage(error, 'Failed to save goal'));
    }
  };

  const disableInputs = isSubmitting;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 p-7 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.46)] transition-transform duration-300 md:p-8',
        showTransition ? 'scale-[0.995]' : 'scale-100'
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1B7D5A] via-[#22956B] to-[#E29D4A]" />

      <motion.div
        className="space-y-1.5"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: SPRING_EASE }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1B7D5A]">
          Step 2 of 4
        </p>
        <h2
          className="text-[28px] font-medium tracking-[-0.024em] text-slate-900 md:text-[30px]"
          style={{ fontFamily: "var(--font-onboarding-serif), Georgia, serif" }}
        >
          What&apos;s your main goal?
        </h2>
        <p className="text-[14px] leading-relaxed text-slate-500">Choose what matters most right now.</p>
      </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-7 space-y-6">
          <FormField
            control={form.control}
            name="goal_type"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid gap-3 md:grid-cols-2"
                  >
                    {goalOptions.map((goal, index) => {
                      const Icon = goal.icon;
                      const isSelected = field.value === goal.value;

                      return (
                        <motion.div
                          key={goal.value}
                          initial={{ opacity: 0, y: 16, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            duration: 0.36,
                            ease: SPRING_EASE,
                            delay: 0.05 + index * 0.055,
                          }}
                        >
                          <RadioGroupItem value={goal.value} id={goal.value} className="sr-only" />
                          <Label
                            htmlFor={goal.value}
                            className={cn(
                              'group flex min-h-[152px] cursor-pointer flex-col justify-between rounded-[18px] border p-5 transition-[transform,box-shadow,border-color,background-color] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]',
                              isSelected
                                ? goal.selectedTone
                                : 'border-slate-200 bg-white hover:-translate-y-[2px] hover:border-slate-300 hover:shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28)]'
                            )}
                          >
                            <motion.div
                              className={cn(
                                'inline-flex h-10 w-10 items-center justify-center rounded-[14px]',
                                goal.tone
                              )}
                              animate={{ scale: isSelected ? 1.08 : 1 }}
                              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                            >
                              <Icon className="h-5 w-5" />
                            </motion.div>
                            <div className="space-y-1">
                              <p className="text-[15px] font-semibold text-slate-900">{goal.title}</p>
                              <p className="text-[13px] leading-relaxed text-slate-500">{goal.description}</p>
                            </div>
                          </Label>
                        </motion.div>
                      );
                    })}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Optional target weight — AnimatePresence for smooth show/hide */}
          <AnimatePresence>
            {(selectedGoal === 'fat_loss' || selectedGoal === 'body_recomp') ? (
              <motion.div
                key="target-weight"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <FormField
                  control={form.control}
                  name="target_weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                        Optional target weight (kg)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={field.value ?? ''}
                          onChange={(event) => {
                            const parsed = event.target.valueAsNumber;
                            field.onChange(Number.isNaN(parsed) ? undefined : parsed);
                          }}
                          disabled={disableInputs}
                          className="h-12 rounded-[16px] border-slate-200 bg-white/90 transition-[border-color,box-shadow] duration-200 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div
            className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: SPRING_EASE, delay: 0.38 }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={disableInputs}
              className="h-12 rounded-[16px] border-slate-200 px-6"
            >
              Back
            </Button>

            <Button
              type="submit"
              size="lg"
              disabled={disableInputs}
              className="relative h-12 w-full overflow-hidden rounded-[16px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_16px_30px_-20px_rgba(5,150,105,0.7)] transition-all duration-200 hover:from-emerald-500 hover:to-teal-500 hover:shadow-[0_20px_34px_-20px_rgba(5,150,105,0.82)] active:scale-[0.98] sm:w-[210px]"
            >
              <span className={cn('transition-opacity duration-200', disableInputs ? 'opacity-0' : 'opacity-100')}>
                Continue
              </span>
              <span
                className={cn(
                  'pointer-events-none absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-200',
                  disableInputs ? 'opacity-100' : 'opacity-0'
                )}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            </Button>
          </motion.div>
        </form>
      </Form>

      <StepTransitionOverlay
        open={showTransition}
        ready={requestReady}
        title="Aligning your goal..."
        description="Understanding your goal profile and setting the right direction."
        checkpoints={[
          'Understanding goal intensity',
          'Setting calorie direction',
          'Preparing macro balance',
        ]}
        completionTitle={firstName ? `Great choice, ${firstName}.` : 'Great choice.'}
        completionDescription="Now let's shape your eating pattern."
        onComplete={() => {
          if (nextStep) router.push(nextStep);
        }}
      />
    </div>
  );
}

