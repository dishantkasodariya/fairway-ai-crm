import React, { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Button } from '@/modules/core/components/ui/Button';
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';

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

  const handleSelectDemoAccount = async (demoEmail: string, demoPassword = 'fairway123') => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsLoading(true);
    try {
      const result = await login(demoEmail, demoPassword);
      setIsLoading(false);
      if (result.success) {
        success('Welcome back', result.message || 'Signed in successfully to Fairway workspace.');
        onLoginSuccess();
      } else {
        error('Sign In Failed', result.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setIsLoading(false);
      error('Sign In Error', err.message || 'An unexpected error occurred.');
    }
  };

  const demoAccounts = [
    {
      name: 'Dishant Patel',
      email: 'admin@fairway.com',
      role: 'Super Admin',
      roleBadge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300',
    },
    {
      name: 'Amit Patel',
      email: 'amit@fairway.co.in',
      role: 'Super Admin',
      roleBadge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300',
    },
    {
      name: 'Aryan Verma',
      email: 'aryan@fairway.co.in',
      role: 'Sales Lead',
      roleBadge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
    },
    {
      name: 'Rahul Sharma',
      email: 'sales@fairway.com',
      role: 'Sales Desk',
      roleBadge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300',
    },
    {
      name: 'Aditya Mehta',
      email: 'admin@fairway.co.in',
      role: 'Admin',
      roleBadge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
    },
  ];

  return (
    <AuthLayout
      headline="Simplify. Automate. Grow."
      subheadline="Built for industrial real estate developers, leasing managers, and brokerage teams. Organize inquiries, streamline property matching, and keep client follow-ups in one secure place."
    >
      <div className="text-left space-y-6">
        {/* Right Side Header with Fairway Brand */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
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
                placeholder="e.g. admin@fairway.com"
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
        </form>

        {/* Demo Accounts Helper */}
        <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-fairway-900">
              <Shield className="w-3.5 h-3.5 text-fairway-700" />
              <span>Instant Demo Accounts</span>
            </div>
            <span className="text-[10px] text-foreground-muted font-mono">Password: fairway123</span>
          </div>
          <div className="space-y-1 text-xs">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleSelectDemoAccount(account.email)}
                className="w-full text-left hover:text-fairway-800 hover:bg-surface p-1.5 rounded transition-colors flex items-center justify-between border border-transparent hover:border-border group"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span className="font-semibold text-[11px] text-foreground group-hover:text-fairway-700 truncate">
                    {account.name}
                  </span>
                  <span className="font-mono text-[10px] text-foreground-muted truncate">
                    ({account.email})
                  </span>
                </div>
                <span className={`font-semibold text-[9px] px-1.5 py-0.5 rounded shrink-0 ${account.roleBadge}`}>
                  {account.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

