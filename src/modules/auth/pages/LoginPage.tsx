import React, { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Button } from '@/modules/core/components/ui/Button';
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';

interface LoginPageProps {
  onNavigateToSignUp: () => void;
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToSignUp,
  onLoginSuccess,
}) => {
  const { login } = useAuth();
  const { success, error } = useToast();

  const [email, setEmail] = useState('admin@fairway.co.in');
  const [password, setPassword] = useState('fairway123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      error('Email required', 'Please enter your work email address.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      login(email, password);
      setIsLoading(false);
      success('Welcome back', 'Signed in successfully to Fairway workspace.');
      onLoginSuccess();
    }, 300);
  };

  const handleSelectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('fairway123');
  };

  return (
    <AuthLayout
      headline="Simplify. Automate. Grow."
      subheadline="Built for industrial real estate developers, leasing managers, and brokerage teams. Organize inquiries, streamline property matching, and keep client follow-ups in one secure place."
    >
      <div className="text-left space-y-6">
        {/* Right Side Header with Fairway Brand */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-border p-1 flex items-center justify-center shadow-xs shrink-0">
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
              <span className="text-xl font-black tracking-tight text-fairway-900">FAIRWAY</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-accent-100 text-accent-900 border border-accent-300 shadow-2xs">
                AI CRM
              </span>
            </div>
          </div>
          <p className="text-xs text-foreground-muted">
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
                placeholder="admin@fairway.co.in"
                className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border hover:border-slate-300 focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 rounded-lg text-xs text-foreground placeholder:text-foreground-muted transition-colors outline-none shadow-xs"
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
                className="w-full pl-9 pr-9 py-2.5 bg-surface border border-border hover:border-slate-300 focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 rounded-lg text-xs text-foreground placeholder:text-foreground-muted transition-colors outline-none shadow-xs"
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
            className="w-full py-2.5 text-xs font-bold rounded-lg shadow-sm mt-2"
          >
            Sign in
          </Button>

          {/* Switch Link */}
          <div className="pt-1 text-center">
            <p className="text-xs text-foreground-muted">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToSignUp}
                className="font-bold text-fairway-700 hover:text-fairway-900 underline underline-offset-2 transition-colors ml-0.5"
              >
                Sign up
              </button>
            </p>
          </div>
        </form>

        {/* Demo Accounts Helper */}
        <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-fairway-900">
            <Shield className="w-3.5 h-3.5 text-fairway-700" />
            <span>Instant Demo Accounts</span>
          </div>
          <div className="space-y-1 text-xs">
            <button
              type="button"
              onClick={() => handleSelectDemoAccount('admin@fairway.co.in')}
              className="w-full text-left hover:text-fairway-800 hover:bg-surface p-1.5 rounded transition-colors flex items-center justify-between border border-transparent hover:border-border"
            >
              <span className="font-mono text-[11px] text-foreground">admin@fairway.co.in</span>
              <span className="font-semibold text-fairway-700 text-[10px] bg-fairway-100 px-1.5 py-0.5 rounded">Super Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemoAccount('ops@fairway.co.in')}
              className="w-full text-left hover:text-fairway-800 hover:bg-surface p-1.5 rounded transition-colors flex items-center justify-between border border-transparent hover:border-border"
            >
              <span className="font-mono text-[11px] text-foreground">ops@fairway.co.in</span>
              <span className="font-semibold text-slate-700 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">Sales Admin</span>
            </button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

