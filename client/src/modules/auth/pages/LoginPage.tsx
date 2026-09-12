import React, { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Button } from '@/modules/core/components/ui/Button';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
}) => {
  const { login } = useAuth();
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      error('Email required', 'Please enter your work email address.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      setIsLoading(false);

      if (result.success) {
        success('Welcome back', result.message || 'Signed in successfully to Fairway workspace.');
        onLoginSuccess();
      } else {
        error('Sign In Failed', result.error || 'Invalid email or password.');
      }
    } catch (err: any) {
      setIsLoading(false);
      error('Sign In Error', err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <AuthLayout
      headline="Simplify. Automate. Grow."
      subheadline="Built for industrial real estate developers, leasing managers, and brokerage teams. Organize inquiries, streamline property matching, and keep client follow-ups in one secure place."
    >
      <div className="text-left space-y-6">
        {/* Right Side Header with Fairway Brand */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-surface-muted border border-border p-1 flex items-center justify-center shadow-xs shrink-0">
              <img
                src="/images/logo.png"
                alt="Fairway Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-foreground">FAIRWAY</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-surface-muted text-foreground-muted border border-border shadow-2xs">
                CRM
              </span>
            </div>
          </div>
          <p className="text-xs text-foreground-muted leading-relaxed">
            Enter your email and password to access your CRM workspace.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Work Email
            </label>
            <div className="relative flex items-center">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. amit@fairway.co.in"
                className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border hover:border-slate-300 focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 rounded-lg text-sm text-foreground placeholder:text-foreground-muted transition-colors outline-none shadow-xs"
              />
              <Mail className="w-4 h-4 text-foreground-muted absolute left-3 pointer-events-none" />
            </div>
          </div>

          {/* Password Input with Show/Hide */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground block">
                Password
              </label>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-surface border border-border hover:border-slate-300 focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 rounded-lg text-sm text-foreground placeholder:text-foreground-muted transition-colors outline-none shadow-xs"
              />
              <Lock className="w-4 h-4 text-foreground-muted absolute left-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-foreground-muted hover:text-foreground p-0.5 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Primary Sign In Button */}
          <Button
            type="submit"
            isLoading={isLoading}
            variant="primary"
            className="w-full py-2.5 text-sm font-bold rounded-lg shadow-sm mt-3"
          >
            Sign in
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};

