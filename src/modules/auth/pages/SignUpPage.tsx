import React, { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Button } from '@/modules/core/components/ui/Button';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface SignUpPageProps {
  onNavigateToLogin: () => void;
  onSignUpSuccess: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({
  onNavigateToLogin,
  onSignUpSuccess,
}) => {
  const { signup } = useAuth();
  const { success, error } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      error('Missing fields', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      signup(fullName, email, password);
      setIsLoading(false);
      success('Account created', `Welcome to Fairway CRM, ${fullName}!`);
      onSignUpSuccess();
    }, 400);
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
            Create an account to get started with your Fairway CRM workspace.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Full Name
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border hover:border-slate-300 focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 rounded-lg text-xs text-foreground placeholder:text-foreground-muted transition-colors outline-none shadow-xs"
              />
              <User className="w-4 h-4 text-foreground-muted absolute left-3 pointer-events-none" />
            </div>
          </div>

          {/* Work Email */}
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
                placeholder="e.g. rahul@company.com"
                className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border hover:border-slate-300 focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 rounded-lg text-xs text-foreground placeholder:text-foreground-muted transition-colors outline-none shadow-xs"
              />
              <Mail className="w-4 h-4 text-foreground-muted absolute left-3 pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Password
            </label>
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

          {/* Primary Submit Button */}
          <Button
            type="submit"
            isLoading={isLoading}
            variant="primary"
            className="w-full py-2.5 text-xs font-bold rounded-lg shadow-sm mt-2"
          >
            Create Account
          </Button>

          {/* Switch Link */}
          <div className="pt-1 text-center">
            <p className="text-xs text-foreground-muted">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-bold text-fairway-700 hover:text-fairway-900 underline underline-offset-2 transition-colors ml-0.5"
              >
                Sign in
              </button>
            </p>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
};
