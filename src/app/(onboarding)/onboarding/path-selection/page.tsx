'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Clock, Dumbbell, Loader2, Moon, Sun, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { onboardingAPI } from '@/lib/api';
import StepTransitionOverlay from '../components/StepTransitionOverlay';
import { getOnboardingFirstName } from '../components/onboardingSession';

const formSchema = z.object({
  path_type: z.enum(['if_16_8', 'if_18_6', 'omad', 'traditional', 'bodybuilder']),
});

type FormValues = z.infer<typeof formSchema>;

type PathSelectionResponse = {
  next_step: string;
};

type ApiErrorLike = {
  response?: {
    data?: {
      detail?: {
        message?: string;
      };
    };
  };
};

function getErrorMessage(error: unknown, fallback: string): string {
  const message = (error as ApiErrorLike)?.response?.data?.detail?.message;
  return typeof message === 'string' ? message : fallback;
}

const SPRING_EASE = [0.22, 1, 0.36, 1] as const;

const pathOptions = [
  {
    value: 'traditional',
    icon: Utensils,
    title: 'Traditional eating',
    description: 'Breakfast, lunch, dinner, and optional snacks',
    meals: '4 meals/day',
    timing: 'Spread through the day',
    tone: 'text-blue-700 bg-blue-50',
    selectedTone: 'border-blue-300/70 bg-blue-50/70 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.32)]',
  },
  {
    value: 'if_16_8',
    icon: Clock,
    title: 'Intermittent fasting 16:8',
    description: '16 hours fasting, 8-hour eating window',
    meals: '2-3 meals/day',
    timing: '12 PM - 8 PM',
    tone: 'text-emerald-700 bg-emerald-50',
    selectedTone: 'border-emerald-400/80 bg-emerald-50/70 shadow-[0_16px_34px_-24px_rgba(16,185,129,0.4)]',
  },
  {
    value: 'if_18_6',
    icon: Moon,
    title: 'Intermittent fasting 18:6',
    description: 'Longer fasting with tighter feeding window',
    meals: '2 meals/day',
    timing: '2 PM - 8 PM',
    tone: 'text-indigo-700 bg-indigo-50',
    selectedTone: 'border-indigo-300/70 bg-indigo-50/70 shadow-[0_16px_34px_-24px_rgba(79,70,229,0.32)]',
  },
  {
    value: 'omad',
    icon: Sun,
    title: 'One meal a day',
    description: 'Single consolidated meal in a chosen window',
    meals: '1 meal/day',
    timing: 'Flexible',
    tone: 'text-amber-700 bg-amber-50',
    selectedTone: 'border-amber-300/70 bg-amber-50/75 shadow-[0_16px_34px_-24px_rgba(217,119,6,0.34)]',
  },
  {
    value: 'bodybuilder',
    icon: Dumbbell,
    title: 'Bodybuilder split',
    description: 'Frequent meals for high training recovery',
    meals: '5-6 meals/day',
    timing: 'Every 2-3 hours',
    tone: 'text-rose-700 bg-rose-50',
    selectedTone: 'border-rose-300/70 bg-rose-50/70 shadow-[0_16px_34px_-24px_rgba(225,29,72,0.32)]',
  },
];

export default function PathSelectionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [requestReady, setRequestReady] = useState(false);
  const [nextStep, setNextStep] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      path_type: 'traditional',
    },
  });

  useEffect(() => {
    setFirstName(getOnboardingFirstName());
  }, []);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setRequestReady(false);
    setNextStep(null);

    const openTimer = window.setTimeout(() => {
      setShowTransition(true);
    }, 300);

    try {
      const response = (await onboardingAPI.submitPath(values)) as PathSelectionResponse;
      setNextStep(response.next_step);
      setRequestReady(true);
    } catch (error: unknown) {
      window.clearTimeout(openTimer);
      setShowTransition(false);
      setIsSubmitting(false);
      setRequestReady(false);
      toast.error(getErrorMessage(error, 'Failed to save path'));
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1B7D5A]">Step 3 of 4</p>
        <h2
          className="text-[28px] font-medium tracking-[-0.024em] text-slate-900 md:text-[30px]"
          style={{ fontFamily: "var(--font-onboarding-serif), Georgia, serif" }}
        >
          Choose your eating pattern
        </h2>
        <p className="text-[14px] leading-relaxed text-slate-500">Pick what fits your lifestyle.</p>
      </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-7 space-y-6">
          <FormField
            control={form.control}
            name="path_type"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                    {pathOptions.map((path, index) => {
                      const Icon = path.icon;
                      const isSelected = field.value === path.value;

                      return (
                        <motion.div
                          key={path.value}
                          initial={{ opacity: 0, x: -14 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.36,
                            ease: SPRING_EASE,
                            delay: 0.05 + index * 0.06,
                          }}
                        >
                          <RadioGroupItem value={path.value} id={path.value} className="sr-only" />
                          <Label
                            htmlFor={path.value}
                            className={cn(
                              'flex cursor-pointer items-start gap-4 rounded-[18px] border p-5 transition-[transform,box-shadow,border-color,background-color] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]',
                              isSelected
                                ? path.selectedTone
                                : 'border-slate-200 bg-white hover:-translate-y-[2px] hover:border-slate-300 hover:shadow-[0_10px_26px_-18px_rgba(15,23,42,0.28)]'
                            )}
                          >
                            <motion.div
                              className={cn(
                                'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]',
                                path.tone
                              )}
                              animate={{ scale: isSelected ? 1.08 : 1 }}
                              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                            >
                              <Icon className="h-5 w-5" />
                            </motion.div>

                            <div className="min-w-0 space-y-1.5">
                              <p className="text-[15px] font-semibold text-slate-900">{path.title}</p>
                              <p className="text-[13px] leading-relaxed text-slate-500">{path.description}</p>
                              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-xs">
                                <span className="font-medium text-slate-700">{path.meals}</span>
                                <span className="text-slate-400">&bull;</span>
                                <span className="text-slate-500">{path.timing}</span>
                              </div>
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
        title="Designing your daily rhythm..."
        description="Mapping your preferred pattern into a routine that stays practical."
        checkpoints={['Validating feeding windows', 'Matching meal cadence', 'Syncing daily structure']}
        completionTitle={firstName ? `That fits your routine well, ${firstName}.` : 'That fits your routine well.'}
        completionDescription="Now we'll fine-tune your preferences."
        onComplete={() => {
          if (nextStep) router.push(nextStep);
        }}
      />
    </div>
  );
}

