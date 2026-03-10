'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { useAuth } from '@/hooks/useAuth';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof formSchema>;
type ApiErrorLike = {
  response?: {
    status?: number;
    data?: {
      detail?: string;
    };
  };
};

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    setIsLoading(true);
    try {
      await registerUser(values.email, values.password);
      router.push(`/login?verify_pending=1&email=${encodeURIComponent(values.email)}`);
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike;
      const detail = apiError?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : 'Registration failed';

      if (apiError?.response?.status === 409 || /already registered/i.test(message)) {
        form.setError('email', {
          type: 'server',
          message: 'This email is already registered',
        });
        setServerError('This email is already registered');
      } else {
        setServerError(message);
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap" />

      <div className="flex min-h-screen" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* ── Left Panel — Brand ── */}
        <div
          className="relative hidden flex-col justify-between overflow-hidden lg:flex lg:w-[48%] xl:w-[45%]"
          style={{ background: "linear-gradient(165deg, #0C3B2E 0%, #14533C 30%, #1B7D5A 65%, #1A6B4C 100%)" }}
        >
          {/* Textures */}
          <div className="pointer-events-none absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.04) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }} />
          <div className="pointer-events-none absolute inset-0" style={{
            background: "radial-gradient(ellipse 60% 70% at 10% 90%, rgba(34,149,107,0.2), transparent 55%)",
          }} />
          <div className="pointer-events-none absolute inset-0" style={{
            background: "radial-gradient(ellipse 40% 50% at 90% 10%, rgba(255,255,255,0.03), transparent 45%)",
          }} />

          {/* Content */}
          <div className="relative z-[1] flex flex-1 flex-col justify-between p-10 xl:p-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
                <span className="text-[15px] font-bold text-white" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>N</span>
              </div>
              <span className="text-[15px] font-semibold text-white/80">NutriLens</span>
            </Link>

            {/* Headline */}
            <div className="max-w-[380px]">
              <h2
                className="text-[32px] font-medium leading-[1.1] tracking-[-0.025em] text-white xl:text-[38px]"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Your nutrition,
                <br />simplified.
              </h2>
              <p className="mt-4 text-[15px] leading-[1.65]" style={{ color: "rgba(255,255,255,0.45)" }}>
                Meal planning, tracking, pantry management, and AI guidance — one calm system built for real routines.
              </p>

              {/* Trust signals */}
              <div className="mt-8 flex flex-col gap-3">
                {[
                  "Personalized meal plans in seconds",
                  "Smart pantry tracking with waste reduction",
                  "AI coaching that adapts to your day",
                ].map((point) => (
                  <div key={point} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(52,211,153,0.15)" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-[13.5px]" style={{ color: "rgba(255,255,255,0.5)" }}>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              Built for real routines, not perfect conditions.
            </p>
          </div>
        </div>

        {/* ── Right Panel — Form ── */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12" style={{ background: "#FAFAF7" }}>
          <div className="w-full max-w-[400px]">

            {/* Mobile logo */}
            <div className="mb-10 flex justify-center lg:hidden">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}>
                  <span className="text-[14px] font-bold text-white" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>N</span>
                </div>
                <span className="text-[15px] font-semibold text-slate-800">NutriLens</span>
              </Link>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1
                className="text-[26px] font-medium tracking-[-0.02em] text-slate-900"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Create your account
              </h1>
              <p className="mt-1.5 text-[14px] text-slate-400">
                Start your nutrition journey today — it&apos;s free.
              </p>
            </div>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] font-medium text-slate-600">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="h-11 rounded-xl border-slate-200 bg-white px-4 text-[14px] text-slate-900 shadow-none transition-all duration-200 placeholder:text-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage className="text-[12px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] font-medium text-slate-600">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="At least 8 characters"
                          className="h-11 rounded-xl border-slate-200 bg-white px-4 text-[14px] text-slate-900 shadow-none transition-all duration-200 placeholder:text-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage className="text-[12px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] font-medium text-slate-600">Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Repeat your password"
                          className="h-11 rounded-xl border-slate-200 bg-white px-4 text-[14px] text-slate-900 shadow-none transition-all duration-200 placeholder:text-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage className="text-[12px]" />
                    </FormItem>
                  )}
                />

                {serverError ? (
                  <div className="rounded-xl bg-red-50 px-4 py-3">
                    <p className="text-[13px] font-medium text-red-600">{serverError}</p>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl text-[14px] font-semibold shadow-[0_2px_10px_rgba(27,125,90,0.2)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(27,125,90,0.3)]"
                  style={{ background: "linear-gradient(135deg, #1B7D5A, #22956B)" }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200/70" />
              <span className="text-[11.5px] font-medium text-slate-300">or</span>
              <div className="h-px flex-1 bg-slate-200/70" />
            </div>

            {/* Login link */}
            <p className="text-center text-[13.5px] text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold transition-colors" style={{ color: "#1B7D5A" }}>
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
