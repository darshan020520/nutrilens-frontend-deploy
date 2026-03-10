'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, Loader2, MailCheck } from 'lucide-react';
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
import { authAPI } from '@/lib/api';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
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

const DASHBOARD_LOGIN_WELCOME_KEY = 'nutrilens:dashboard:login-welcome';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [serverError, setServerError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [showVerifyPendingBanner, setShowVerifyPendingBanner] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const email = searchParams.get('email');
    const verifyPending = searchParams.get('verify_pending');
    setShowVerifyPendingBanner(verifyPending === '1');
    if (email) {
      form.setValue('email', email);
      setUnverifiedEmail(email);
    }
  }, [form, searchParams]);

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    setIsLoading(true);
    try {
      const onboardingStatus = await login(values.email, values.password);
      const nextPath = searchParams.get('next');
      const safeNext =
        typeof nextPath === 'string' && nextPath.startsWith('/dashboard')
          ? nextPath
          : null;

      // Redirect based on onboarding status
      const destination =
        onboardingStatus.redirect_to === '/dashboard' && safeNext
          ? safeNext
          : onboardingStatus.redirect_to;
      if (destination.startsWith('/dashboard') && typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          DASHBOARD_LOGIN_WELCOME_KEY,
          JSON.stringify({
            source: 'login',
            email: values.email,
            timestamp: Date.now(),
          })
        );
      }
      router.push(destination);
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike;
      const detail = apiError?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : 'Login failed';

      if (apiError?.response?.status === 403 && /not verified/i.test(message)) {
        form.setError('email', { type: 'server', message: 'Email is not verified' });
        setUnverifiedEmail(values.email);
        setServerError(message);
      } else if (apiError?.response?.status === 400 && /invalid email format/i.test(message)) {
        form.setError('email', { type: 'server', message: 'Invalid email address' });
        setServerError(message);
      } else {
        setServerError(message);
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) {
      return;
    }

    setIsResending(true);
    try {
      await authAPI.resendVerification(unverifiedEmail);
      toast.success('Verification email sent. Please check your inbox.');
    } catch (error: unknown) {
      const detail = (error as ApiErrorLike)?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : 'Failed to resend verification email';
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap"
      />

      <div
        className="flex min-h-screen"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        <div
          className="relative hidden flex-col justify-between overflow-hidden lg:flex lg:w-[48%] xl:w-[45%]"
          style={{
            background:
              'linear-gradient(165deg, #0C3B2E 0%, #14533C 30%, #1B7D5A 65%, #1A6B4C 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.04) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 70% at 10% 90%, rgba(34,149,107,0.2), transparent 55%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 40% 50% at 90% 10%, rgba(255,255,255,0.03), transparent 45%)',
            }}
          />

          <div className="relative z-[1] flex flex-1 flex-col justify-between p-10 xl:p-14">
            <Link href="/" className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                <span
                  className="text-[15px] font-bold text-white"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  N
                </span>
              </div>
              <span className="text-[15px] font-semibold text-white/80">NutriLens</span>
            </Link>

            <div className="max-w-[380px]">
              <h2
                className="text-[32px] font-medium leading-[1.1] tracking-[-0.025em] text-white xl:text-[38px]"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Welcome back.
                <br />
                Keep your routine strong.
              </h2>
              <p
                className="mt-4 text-[15px] leading-[1.65]"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                Log in to your nutrition dashboard, track progress, and stay on top of meals,
                macros, and pantry with less effort.
              </p>

              <div className="mt-8 flex flex-col gap-3">
                {[
                  'Daily meal and macro check-ins',
                  'Smarter pantry planning and restock flow',
                  'Personalized guidance as your goals evolve',
                ].map((point) => (
                  <div key={point} className="flex items-center gap-3">
                    <div
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ background: 'rgba(52,211,153,0.15)' }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#34D399"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-[13.5px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {point}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Consistency beats intensity.
            </p>
          </div>
        </div>

        <div
          className="flex flex-1 flex-col items-center justify-center px-6 py-12"
          style={{ background: '#FAFAF7' }}
        >
          <div className="w-full max-w-[400px]">
            <div className="mb-10 flex justify-center lg:hidden">
              <Link href="/" className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #1B7D5A, #22956B)' }}
                >
                  <span
                    className="text-[14px] font-bold text-white"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    N
                  </span>
                </div>
                <span className="text-[15px] font-semibold text-slate-800">NutriLens</span>
              </Link>
            </div>

            <div className="mb-8">
              <h1
                className="text-[26px] font-medium tracking-[-0.02em] text-slate-900"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Log in to your account
              </h1>
              <p className="mt-1.5 text-[14px] text-slate-400">
                Pick up where you left off.
              </p>
            </div>

            {showVerifyPendingBanner ? (
              <div className="mb-5 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-teal-50/70 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.16)]">
                    <MailCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-slate-900">
                      Verify your email to continue
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">
                      {unverifiedEmail
                        ? `We sent a verification link to ${unverifiedEmail}.`
                        : 'We sent a verification link to your inbox.'}{' '}
                      Please verify before logging in.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2.5 h-8 rounded-lg border-emerald-200 bg-white/85 px-3 text-[12px] font-medium text-emerald-700 hover:bg-white"
                      onClick={handleResendVerification}
                      disabled={isResending || !unverifiedEmail}
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Resend verification email'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] font-medium text-slate-600">
                        Email
                      </FormLabel>
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
                      <FormLabel className="text-[13px] font-medium text-slate-600">
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
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

                {unverifiedEmail && /not verified/i.test(serverError) ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                    onClick={handleResendVerification}
                    disabled={isResending}
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending verification...
                      </>
                    ) : (
                      'Resend Verification Email'
                    )}
                  </Button>
                ) : null}

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl text-[14px] font-semibold shadow-[0_2px_10px_rgba(27,125,90,0.2)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(27,125,90,0.3)]"
                  style={{ background: 'linear-gradient(135deg, #1B7D5A, #22956B)' }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Log In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200/70" />
              <span className="text-[11.5px] font-medium text-slate-300">or</span>
              <div className="h-px flex-1 bg-slate-200/70" />
            </div>

            <p className="text-center text-[13.5px] text-slate-500">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-semibold transition-colors"
                style={{ color: '#1B7D5A' }}
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function LoginPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF7] px-6 py-12">
      <div className="w-full max-w-[400px]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-[14px] text-slate-500">Loading login...</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
