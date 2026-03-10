'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { onboardingAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import StepTransitionOverlay from '../components/StepTransitionOverlay';
import { extractFirstName, setOnboardingFirstName } from '../components/onboardingSession';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.number().min(13, 'Must be at least 13 years old').max(100, 'Invalid age'),
  height_cm: z.number().min(100, 'Height must be at least 100cm').max(250, 'Height must be less than 250cm'),
  weight_kg: z.number().min(30, 'Weight must be at least 30kg').max(300, 'Weight must be less than 300kg'),
  sex: z.enum(['male', 'female']),
  activity_level: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']),
});

type FormValues = z.infer<typeof formSchema>;

type BasicInfoResponse = {
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

const fadeUpItem = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, ease: SPRING_EASE, delay },
});

export default function BasicInfoPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [requestReady, setRequestReady] = useState(false);
  const [nextStep, setNextStep] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      age: 25,
      height_cm: 170,
      weight_kg: 70,
      sex: 'male',
      activity_level: 'moderately_active',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setRequestReady(false);
    setNextStep(null);

    const parsedFirstName = extractFirstName(values.name);
    setFirstName(parsedFirstName);
    setOnboardingFirstName(parsedFirstName);

    const openTimer = window.setTimeout(() => {
      setShowTransition(true);
    }, 300);

    try {
      const response = (await onboardingAPI.submitBasicInfo({
        ...values,
        medical_conditions: [],
      })) as BasicInfoResponse;

      setNextStep(response.next_step);
      setRequestReady(true);
    } catch (error: unknown) {
      window.clearTimeout(openTimer);
      setShowTransition(false);
      setIsSubmitting(false);
      setRequestReady(false);
      toast.error(getErrorMessage(error, 'Failed to save information'));
    }
  };

  const disableInputs = isSubmitting;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.46)] transition-transform duration-300',
        showTransition ? 'scale-[0.995]' : 'scale-100'
      )}
    >
      {/* Top accent bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1B7D5A] via-[#22956B] to-[#E29D4A]" />

      <div className="p-7 md:p-8">
        {/* Heading */}
        <motion.div className="space-y-1.5" {...fadeUpItem(0)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1B7D5A]">
            Step 1 of 4
          </p>
          <h2
            className="text-[28px] font-medium tracking-[-0.024em] text-slate-900 md:text-[30px]"
            style={{ fontFamily: "var(--font-onboarding-serif), Georgia, serif" }}
          >
            Tell us about yourself
          </h2>
          <p className="text-[14px] leading-relaxed text-slate-500">
            We&apos;ll use this to personalize your nutrition starting point.
          </p>
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-7 space-y-5">
            {/* Name */}
            <motion.div {...fadeUpItem(0.06)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => {
                  const hasValue = field.value.trim().length > 0;
                  return (
                    <FormItem>
                      <div className="relative">
                        <FormControl>
                          <Input
                            placeholder=" "
                            autoComplete="name"
                            {...field}
                            disabled={disableInputs}
                            className="peer h-14 rounded-[16px] border-slate-200 bg-white/85 px-4 pt-6 text-[15px] transition-[border-color,box-shadow] duration-200 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100"
                          />
                        </FormControl>
                        <FormLabel
                          className={cn(
                            'pointer-events-none absolute left-4 text-slate-500 transition-all duration-200 peer-focus:top-2 peer-focus:text-xs peer-focus:text-emerald-700',
                            hasValue ? 'top-2 text-xs text-slate-600' : 'top-1/2 -translate-y-1/2 text-sm'
                          )}
                        >
                          Full name
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </motion.div>

            {/* Age + Sex */}
            <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2" {...fadeUpItem(0.12)}>
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => {
                  const hasValue = Number.isFinite(field.value);
                  return (
                    <FormItem>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder=" "
                            value={field.value}
                            onChange={(event) => field.onChange(event.target.valueAsNumber)}
                            disabled={disableInputs}
                            className="peer h-14 rounded-[16px] border-slate-200 bg-white/85 px-4 pt-6 text-[15px] transition-[border-color,box-shadow] duration-200 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100"
                          />
                        </FormControl>
                        <FormLabel
                          className={cn(
                            'pointer-events-none absolute left-4 text-slate-500 transition-all duration-200 peer-focus:top-2 peer-focus:text-xs peer-focus:text-emerald-700',
                            hasValue ? 'top-2 text-xs text-slate-600' : 'top-1/2 -translate-y-1/2 text-sm'
                          )}
                        >
                          Age
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                      Sex
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={disableInputs}>
                      <FormControl>
                        <SelectTrigger className="h-12 w-full rounded-[16px] border-slate-200 bg-white/90 transition-[border-color,box-shadow] duration-200 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100">
                          <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-[14px] border-slate-200 bg-white/96">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            {/* Height + Weight */}
            <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2" {...fadeUpItem(0.18)}>
              <FormField
                control={form.control}
                name="height_cm"
                render={({ field }) => {
                  const hasValue = Number.isFinite(field.value);
                  return (
                    <FormItem>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            placeholder=" "
                            value={field.value}
                            onChange={(event) => field.onChange(event.target.valueAsNumber)}
                            disabled={disableInputs}
                            className="peer h-14 rounded-[16px] border-slate-200 bg-white/85 px-4 pt-6 text-[15px] transition-[border-color,box-shadow] duration-200 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100"
                          />
                        </FormControl>
                        <FormLabel
                          className={cn(
                            'pointer-events-none absolute left-4 text-slate-500 transition-all duration-200 peer-focus:top-2 peer-focus:text-xs peer-focus:text-emerald-700',
                            hasValue ? 'top-2 text-xs text-slate-600' : 'top-1/2 -translate-y-1/2 text-sm'
                          )}
                        >
                          Height (cm)
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="weight_kg"
                render={({ field }) => {
                  const hasValue = Number.isFinite(field.value);
                  return (
                    <FormItem>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            placeholder=" "
                            value={field.value}
                            onChange={(event) => field.onChange(event.target.valueAsNumber)}
                            disabled={disableInputs}
                            className="peer h-14 rounded-[16px] border-slate-200 bg-white/85 px-4 pt-6 text-[15px] transition-[border-color,box-shadow] duration-200 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100"
                          />
                        </FormControl>
                        <FormLabel
                          className={cn(
                            'pointer-events-none absolute left-4 text-slate-500 transition-all duration-200 peer-focus:top-2 peer-focus:text-xs peer-focus:text-emerald-700',
                            hasValue ? 'top-2 text-xs text-slate-600' : 'top-1/2 -translate-y-1/2 text-sm'
                          )}
                        >
                          Weight (kg)
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </motion.div>

            {/* Activity level */}
            <motion.div {...fadeUpItem(0.24)}>
              <FormField
                control={form.control}
                name="activity_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                      Activity level
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={disableInputs}>
                      <FormControl>
                        <SelectTrigger className="h-12 w-full rounded-[16px] border-slate-200 bg-white/90 transition-[border-color,box-shadow] duration-200 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100">
                          <SelectValue placeholder="Select activity level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-[14px] border-slate-200 bg-white/96">
                        <SelectItem value="sedentary">Sedentary</SelectItem>
                        <SelectItem value="lightly_active">Lightly active</SelectItem>
                        <SelectItem value="moderately_active">Moderately active</SelectItem>
                        <SelectItem value="very_active">Very active</SelectItem>
                        <SelectItem value="extra_active">Extra active</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            {/* Submit */}
            <motion.div className="pt-1" {...fadeUpItem(0.30)}>
              <Button
                type="submit"
                size="lg"
                disabled={disableInputs}
                className="relative h-12 w-full overflow-hidden rounded-[16px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_16px_30px_-20px_rgba(5,150,105,0.7)] transition-all duration-200 hover:from-emerald-500 hover:to-teal-500 hover:shadow-[0_20px_34px_-20px_rgba(5,150,105,0.82)] active:scale-[0.98]"
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
      </div>

      <StepTransitionOverlay
        open={showTransition}
        ready={requestReady}
        title="Building your starting profile..."
        description="Analyzing your body metrics and activity level."
        checkpoints={[
          'Estimating daily energy needs',
          'Adjusting for activity',
          'Calibrating baseline targets',
        ]}
        completionTitle={firstName ? `Nice work, ${firstName}.` : 'Nice work.'}
        completionDescription="Let's define your goal."
        onComplete={() => {
          if (nextStep) router.push(nextStep);
        }}
      />
    </div>
  );
}

