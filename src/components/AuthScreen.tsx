'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useAppStore } from '@/store/store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, FileText, Volume2, Check, Loader2 } from 'lucide-react';
import ThinkNextLogo from '@/components/ThinkNextLogo';

// Zod Validation Schemas
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  rememberMe: z.boolean().optional(),
});

const signupSchema = z.object({
  fullName: z.string().min(3, { message: 'Full name must be at least 3 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string().min(6, { message: 'Confirm password must match.' }),
  agreeTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Terms of Service and Privacy Policy.',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function AuthScreen() {
  const { authView, setAuthView } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Forms
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors },
    reset: resetLogin,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    formState: { errors: signupErrors },
    reset: resetSignup,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', agreeTerms: false },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe ? 'true' : 'false',
        redirect: false,
      });
      if (result?.error) {
        setAuthError('Invalid email or password. Please try again.');
      } else {
        setAuthView(null); // close auth overlay — session now active
        resetLogin();
      }
    } catch {
      setAuthError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSignupSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      // 1. Register the user via API
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.fullName,
          email: data.email,
          password: data.password,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAuthError(body.error ?? 'Registration failed. Please try again.');
        return;
      }
      // 2. Auto-login after successful registration
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        setAuthError('Account created! Please sign in.');
        setAuthView('login');
      } else {
        setAuthView(null);
        resetSignup();
      }
    } catch {
      setAuthError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fbfbfb] text-black font-sans flex flex-col md:flex-row overflow-x-hidden">
      <AnimatePresence mode="wait">
        {authView === 'login' ? (
          <motion.div
            key="login-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col md:flex-row min-h-screen"
          >
            {/* Left Column (Figma visual presentation) */}
            <div className="w-full md:w-1/2 bg-[#fafafa] p-10 md:p-20 flex flex-col justify-between border-r border-gray-100">
              <div className="flex flex-col max-w-lg">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white px-3.5 py-1 text-xs font-semibold text-gray-700 shadow-sm self-start mb-10">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  AI Video Creation Platform
                </div>

                {/* Heading */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6">
                  Turn Ideas<br />Into Videos.
                </h1>

                {/* Subtitle */}
                <p className="text-gray-500 text-sm md:text-base leading-relaxed mb-12">
                  ScriptForge AI empowers you to generate professional video content at scale. From raw concept to final render in minutes.
                </p>

                {/* Step indicators */}
                <div className="space-y-6 relative pl-3">
                  {/* Pipeline Step 1 */}
                  <div className="flex items-start gap-4 relative">
                    <div className="absolute top-10 bottom-[-24px] left-5 w-px bg-gray-200" />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm">
                      <Lightbulb className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-800">Idea</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Input your core concept or prompt.</p>
                    </div>
                  </div>

                  {/* Pipeline Step 2 */}
                  <div className="flex items-start gap-4 relative">
                    <div className="absolute top-10 bottom-[-24px] left-5 w-px bg-gray-200" />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm">
                      <FileText className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-800">Script</h3>
                      <p className="text-xs text-gray-500 mt-0.5">AI crafts a compelling narrative structure.</p>
                    </div>
                  </div>

                  {/* Pipeline Step 3 */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm">
                      <Volume2 className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-800">Voice & Video</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Avatars, realistic neural voice overlays, and final compilation.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo Bottom */}
              <button
                onClick={() => setAuthView(null)}
                className="mt-16 md:mt-24 hover:opacity-85 transition-opacity self-start text-left cursor-pointer"
              >
                <ThinkNextLogo variant="full" size="sm" />
              </button>
            </div>

            {/* Right Column (Login Form Pane) */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16">
              <div className="w-full max-w-md bg-white border border-gray-100/80 rounded-3xl p-8 md:p-10 shadow-2xl shadow-neutral-100/50">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-1">Welcome Back</h2>
                  <p className="text-sm text-gray-500">Please enter your details to sign in.</p>
                </div>

                <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-5">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="login-email" className="text-xs font-semibold text-gray-700">Email Address</label>
                    <input
                      id="login-email"
                      type="email"
                      placeholder="name@company.com"
                      {...registerLogin('email')}
                      className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                    />
                    {loginErrors.email && (
                      <p className="text-xs font-medium text-red-500">{loginErrors.email.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="login-password" className="text-xs font-semibold text-gray-700">Password</label>
                      <button type="button" className="text-xs font-medium text-gray-500 hover:text-black transition-colors">
                        Forgot Password?
                      </button>
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      {...registerLogin('password')}
                      className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-gray-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                    />
                    {loginErrors.password && (
                      <p className="text-xs font-medium text-red-500">{loginErrors.password.message}</p>
                    )}
                  </div>

                  {/* Remember me */}
                  <div className="flex items-center gap-2 py-1">
                    <input
                      id="rememberMe"
                      type="checkbox"
                      {...registerLogin('rememberMe')}
                      className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                    />
                    <label htmlFor="rememberMe" className="text-xs font-medium text-gray-600 select-none cursor-pointer">
                      Remember me for 30 days
                    </label>
                  </div>

                  {/* Auth Error */}
                  {authError && (
                    <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                      {authError}
                    </p>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-black text-white hover:bg-neutral-800 font-semibold text-sm transition-all"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <>
                        Sign In
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <span className="relative bg-white px-3 text-xs font-medium text-gray-400">
                    Or continue with
                  </span>
                </div>

                {/* Social Login Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => signIn('google', { callbackUrl: '/' })}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.76 14.94 1 12 1 7.35 1 3.4 3.65 1.5 7.52l3.75 2.9C6.12 7.54 8.82 5.04 12 5.04z" />
                      <path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.61-.21-2.38H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.42-4.93 3.42-8.58z" />
                      <path fill="#FBBC05" d="M5.25 14.78c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28L1.5 7.32C.54 9.24 0 11.36 0 13.5s.54 4.26 1.5 6.18l3.75-2.9z" />
                      <path fill="#34A853" d="M12 23c3.24 0 5.96-1.07 7.95-2.91l-3.7-2.87c-1.03.69-2.34 1.1-4.25 1.1-3.18 0-5.88-2.5-6.85-5.38l-3.75 2.9C3.4 20.35 7.35 23 12 23z" />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => signIn('github', { callbackUrl: '/' })}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    GitHub
                  </button>
                </div>

                {/* Account Toggle */}
                <div className="text-center mt-8 text-xs font-semibold text-neutral-500">
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => {
                      setAuthView('signup');
                      resetLogin();
                    }}
                    className="text-black hover:underline focus:outline-none"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="signup-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col md:flex-row min-h-screen"
          >
            {/* Left Column (Figma visual presentation) */}
            <div className="w-full md:w-1/2 bg-[#fafafa] p-10 md:p-20 flex flex-col justify-between border-r border-gray-100">
              <div className="flex flex-col max-w-lg">
                {/* Logo Top Left */}
                <button
                  onClick={() => setAuthView(null)}
                  className="flex items-center gap-2 mb-16 hover:opacity-85 transition-opacity self-start text-left cursor-pointer"
                >
                  <ThinkNextLogo variant="full" size="sm" />
                </button>

                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white px-3.5 py-1 text-xs font-semibold text-gray-700 shadow-sm self-start mb-10">
                  <span className="h-2 w-2 rounded-full bg-black" />
                  Intelligent Creation Suite
                </div>

                {/* Heading */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6">
                  The quiet<br />authority in<br />content creation.
                </h1>

                {/* Subtitle */}
                <p className="text-gray-500 text-sm md:text-base leading-relaxed">
                  Streamline your workflow from script to screen with precision-engineered AI tools designed for professionals.
                </p>
              </div>

              {/* Divider spacing */}
              <div className="h-20" />
            </div>

            {/* Right Column (Sign Up Form Pane) */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16">
              <div className="w-full max-w-md bg-white border border-gray-100/80 rounded-3xl p-8 md:p-10 shadow-2xl shadow-neutral-100/50">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-1">Create your Account</h2>
                  <p className="text-sm text-gray-500">Start building your next masterpiece today.</p>
                </div>

                <form onSubmit={handleSubmitSignup(onSignupSubmit)} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="fullName" className="text-xs font-semibold text-gray-700">Full Name</label>
                    <input
                      id="fullName"
                      type="text"
                      placeholder="Jane Doe"
                      {...registerSignup('fullName')}
                      className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                    />
                    {signupErrors.fullName && (
                      <p className="text-xs font-medium text-red-500">{signupErrors.fullName.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="signup-email" className="text-xs font-semibold text-gray-700">Email</label>
                    <input
                      id="signup-email"
                      type="email"
                      placeholder="jane@example.com"
                      {...registerSignup('email')}
                      className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                    />
                    {signupErrors.email && (
                      <p className="text-xs font-medium text-red-500">{signupErrors.email.message}</p>
                    )}
                  </div>

                  {/* Password Columns */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="signup-password" className="text-xs font-semibold text-gray-700">Password</label>
                      <input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        {...registerSignup('password')}
                        className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-gray-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="confirmPassword" className="text-xs font-semibold text-gray-700">Confirm Password</label>
                      <input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        {...registerSignup('confirmPassword')}
                        className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-gray-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
                      />
                    </div>
                  </div>
                  {(signupErrors.password || signupErrors.confirmPassword) && (
                    <p className="text-xs font-medium text-red-500">
                      {signupErrors.password?.message || signupErrors.confirmPassword?.message}
                    </p>
                  )}

                  {/* T&C checkbox */}
                  <div className="flex items-start gap-2 py-1">
                    <input
                      id="agreeTerms"
                      type="checkbox"
                      {...registerSignup('agreeTerms')}
                      className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer mt-0.5"
                    />
                    <label htmlFor="agreeTerms" className="text-xs font-medium text-gray-600 select-none cursor-pointer leading-normal">
                      I agree to the <a href="#" className="underline font-semibold text-gray-700 hover:text-black">Terms of Service</a> and <a href="#" className="underline font-semibold text-gray-700 hover:text-black">Privacy Policy</a>.
                    </label>
                  </div>
                  {signupErrors.agreeTerms && (
                    <p className="text-xs font-medium text-red-500">{signupErrors.agreeTerms.message}</p>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-black text-white hover:bg-neutral-800 font-semibold text-sm transition-all"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-5 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <span className="relative bg-white px-3 text-xs font-medium text-gray-400">
                    or continue with
                  </span>
                </div>

                {/* Social logins */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => signIn('google', { callbackUrl: '/' })}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.76 14.94 1 12 1 7.35 1 3.4 3.65 1.5 7.52l3.75 2.9C6.12 7.54 8.82 5.04 12 5.04z" />
                      <path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.61-.21-2.38H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.42-4.93 3.42-8.58z" />
                      <path fill="#FBBC05" d="M5.25 14.78c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28L1.5 7.32C.54 9.24 0 11.36 0 13.5s.54 4.26 1.5 6.18l3.75-2.9z" />
                      <path fill="#34A853" d="M12 23c3.24 0 5.96-1.07 7.95-2.91l-3.7-2.87c-1.03.69-2.34 1.1-4.25 1.1-3.18 0-5.88-2.5-6.85-5.38l-3.75 2.9C3.4 20.35 7.35 23 12 23z" />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => signIn('github', { callbackUrl: '/' })}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    GitHub
                  </button>
                </div>

                {/* Toggle sign in */}
                <div className="text-center mt-6 text-xs font-semibold text-neutral-500">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setAuthView('login');
                      resetSignup();
                    }}
                    className="text-black hover:underline focus:outline-none"
                  >
                    Sign in
                  </button>
                </div>

                {/* Checklist (Why ScriptForge) */}
                <div className="mt-8 rounded-2xl bg-gray-50 border border-gray-100 p-5">
                  <h4 className="text-xs font-bold text-neutral-800 mb-3 font-sans">Why ScriptForge?</h4>
                  <ul className="space-y-2 text-[11px] text-gray-500 font-medium font-sans">
                    <li className="flex items-center gap-2">
                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-black/5 text-black">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      Generate scripts with AI
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-black/5 text-black">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      Create realistic voiceovers
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-black/5 text-black">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      Generate avatar videos automatically
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-black/5 text-black">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      Manage everything in one workspace
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
