import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Pencil,
  ArrowLeft,
  Lock,
  KeyRound,
  Check,
  Copy,
  Clock,
  Globe,
  Building,
  Briefcase,
  PhoneCall,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Button } from '@/modules/core/components/ui/Button';
import { Modal } from '@/modules/core/components/ui/Modal';
import { AuthService } from '@/modules/core/services/authService';

export const ProfilePage: React.FC = () => {
  const { currentUser, updateProfile } = useAuth();
  const { success, error } = useToast();

  // Mode: 'view' or 'edit'
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopiedEmail, setIsCopiedEmail] = useState(false);

  // Form state
  const [name, setName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || '98849 6151');
  const [countryCode, setCountryCode] = useState('+91');
  const [department, setDepartment] = useState(currentUser.department || 'Industrial Leasing');
  const [timezone, setTimezone] = useState(currentUser.timezone || 'Asia/Kolkata');
  const [workingHoursStart, setWorkingHoursStart] = useState(currentUser.workingHoursStart || '10:00 AM');
  const [workingHoursEnd, setWorkingHoursEnd] = useState(currentUser.workingHoursEnd || '7:30 PM');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Sync form state whenever currentUser changes and not actively editing
  useEffect(() => {
    if (!isEditing) {
      setName(currentUser.name || '');
      const rawPhone = currentUser.phone || '+91 988496151';
      const cleanPhone = rawPhone.replace('+91', '').trim();
      setPhone(cleanPhone || '98849 6151');
      setDepartment(currentUser.department || 'Industrial Leasing');
      setTimezone(currentUser.timezone || 'Asia/Kolkata');
      setWorkingHoursStart(currentUser.workingHoursStart || '10:00 AM');
      setWorkingHoursEnd(currentUser.workingHoursEnd || '7:30 PM');
    }
  }, [currentUser, isEditing]);

  const handleStartEdit = () => {
    setName(currentUser.name || '');
    const rawPhone = currentUser.phone || '+91 988496151';
    const cleanPhone = rawPhone.replace('+91', '').trim();
    setPhone(cleanPhone || '98849 6151');
    setDepartment(currentUser.department || 'Industrial Leasing');
    setTimezone(currentUser.timezone || 'Asia/Kolkata');
    setWorkingHoursStart(currentUser.workingHoursStart || '10:00 AM');
    setWorkingHoursEnd(currentUser.workingHoursEnd || '7:30 PM');
    setIsEditing(true);
  };

  const handleCopyEmail = () => {
    if (!currentUser.email) return;
    navigator.clipboard.writeText(currentUser.email);
    setIsCopiedEmail(true);
    success('Copied', 'Email address copied to clipboard.');
    setTimeout(() => setIsCopiedEmail(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Name required', 'Please enter your name.');
      return;
    }

    setIsSaving(true);
    try {
      const fullPhone = `${countryCode} ${phone}`.trim();
      const res = await updateProfile({
        name: name.trim(),
        phone: fullPhone,
        department: department.trim(),
        timezone,
        workingHoursStart,
        workingHoursEnd,
        // Two-factor authentication preserved without modification
        twoFactorEnabled: currentUser.twoFactorEnabled,
      });

      setIsSaving(false);
      if (res.success) {
        success('Profile Updated', 'Your profile details have been saved successfully.');
        setIsEditing(false);
      } else {
        error('Update Failed', res.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setIsSaving(false);
      error('Update Failed', err.message || 'An unexpected error occurred while saving profile.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      error('Missing fields', 'Please enter both current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      error('Password too short', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('Mismatch', 'New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await AuthService.changePassword(currentPassword, newPassword);
      setIsChangingPassword(false);

      if (res.success) {
        success('Password Changed', 'Your password has been updated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsPasswordModalOpen(false);
      } else {
        error('Password Error', res.error?.message || 'Failed to change password.');
      }
    } catch (err: any) {
      setIsChangingPassword(false);
      error('Error', err.message || 'Failed to update password.');
    }
  };

  // Compute 2-letter uppercase initials
  const initials = currentUser.name
    ? currentUser.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : 'U';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 text-left animate-fade-in">
      {/* 1. TOP EXECUTIVE IDENTITY HERO BANNER */}
      <div className="bg-surface rounded-2xl border border-border p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: User Initials Circle & Key Metadata */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            {/* Pure Circular Text Initials Badge (Zero Images) */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface-muted border-2 border-border flex items-center justify-center text-foreground font-bold text-xl sm:text-2xl select-none shrink-0 shadow-2xs">
              {initials}
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
                  {currentUser.name}
                </h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-surface-muted text-foreground border border-border shrink-0">
                  {currentUser.role?.replace(/_/g, ' ') || 'Sales Team'}
                </span>
               
              </div>

              {/* Email & Phone Contact Bar */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-foreground-muted">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-foreground-muted" />
                  <span className="font-mono">{currentUser.email}</span>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                    title="Copy Email"
                  >
                    {isCopiedEmail ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <span className="text-border hidden sm:inline">·</span>

                <div className="flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 shrink-0 text-foreground-muted" />
                  <span>{currentUser.phone || '+91 98849 6151'}</span>
                </div>

                {currentUser.department && (
                  <>
                    <span className="text-border hidden sm:inline">·</span>
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 shrink-0 text-foreground-muted" />
                      <span>{currentUser.department}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Profile Actions */}
          <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/80">
            {isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                className="rounded-xl px-4 h-9 font-medium"
              >
                Back to Profile
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPasswordModalOpen(true)}
                  leftIcon={<KeyRound className="w-3.5 h-3.5 text-foreground-muted" />}
                  className="rounded-xl px-3.5 h-9 font-medium"
                >
                  Change Password
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartEdit}
                  leftIcon={<Pencil className="w-3.5 h-3.5" />}
                  className="rounded-xl px-4 h-9 font-bold shadow-xs"
                >
                  Edit Profile
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN VIEW BODY (READ-ONLY VIEW OR EDIT MODE) */}
      {!isEditing ? (
        /* --- CLEAN READ-ONLY SALES PROFILE SECTION --- */
        <div className="bg-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-surface-muted/30 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building className="w-4 h-4 text-foreground" />
              <span>Commercial & Account Information</span>
            </h2>
            <span className="text-[11px] text-foreground-muted font-medium">
              Fairway Commercial CRM
            </span>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 text-xs">
              {/* Full Name */}
              <div className="space-y-1 p-3.5 rounded-xl bg-surface-muted/30 border border-border">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted block">
                  Full Name
                </span>
                <p className="text-sm font-bold text-foreground truncate">
                  {currentUser.name}
                </p>
              </div>

              {/* Official Email */}
              <div className="space-y-1 p-3.5 rounded-xl bg-surface-muted/30 border border-border">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted block">
                  Work Email Address
                </span>
                <p className="text-sm font-bold text-foreground font-mono truncate">
                  {currentUser.email}
                </p>
              </div>

              {/* Direct Phone */}
              <div className="space-y-1 p-3.5 rounded-xl bg-surface-muted/30 border border-border">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted block">
                  Direct Phone
                </span>
                <p className="text-sm font-bold text-foreground truncate">
                  {currentUser.phone || '+91 98849 6151'}
                </p>
              </div>

              {/* Department */}
              <div className="space-y-1 p-3.5 rounded-xl bg-surface-muted/30 border border-border">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted block">
                  Department / Vertical
                </span>
                <p className="text-sm font-bold text-foreground truncate">
                  {currentUser.department || 'Industrial Leasing & Warehousing'}
                </p>
              </div>

              {/* Assigned Active Deals */}
              <div className="space-y-1 p-3.5 rounded-xl bg-surface-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted block">
                    Active Pipeline Deals
                  </span>
                  <Briefcase className="w-3.5 h-3.5 text-foreground-muted" />
                </div>
                <p className="text-sm font-bold text-foreground">
                  {currentUser.assignedLeadsCount || 0} Opportunities Assigned
                </p>
              </div>

              {/* Timezone & Working Hours */}
              <div className="space-y-1 p-3.5 rounded-xl bg-surface-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted block">
                    Timezone & Schedule
                  </span>
                  <Globe className="w-3.5 h-3.5 text-foreground-muted" />
                </div>
                <p className="text-sm font-bold text-foreground truncate">
                  {currentUser.timezone || 'Asia/Kolkata'} ({currentUser.workingHoursStart || '10:00 AM'} – {currentUser.workingHoursEnd || '7:30 PM'})
                </p>
              </div>
            </div>

            {/* Note: Two-Step Authentication is deliberately hidden/commented out per user requirement */}
          </div>
        </div>
      ) : (
        /* --- STREAMLINED EDIT PROFILE FORM --- */
        <form onSubmit={handleSaveProfile} className="bg-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-surface-muted/30 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Pencil className="w-4 h-4 text-foreground" />
              <span>Edit Account Information</span>
            </h2>
            <span className="text-[11px] text-foreground-muted font-medium">
              Update personal & commercial details
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Full Name</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-surface border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-foreground transition-all shadow-2xs"
                  placeholder="e.g. Harsheel Kasodariya"
                />
              </div>

              {/* Email (Locked / Read-Only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Work Email</span>
                  <span className="text-[10px] text-foreground-muted font-normal">Primary Login ID</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full h-10 px-3.5 bg-surface-muted/60 border border-border rounded-xl text-xs text-foreground-muted cursor-not-allowed select-none font-mono pr-9 shadow-2xs"
                  />
                  <Lock className="w-3.5 h-3.5 text-foreground-muted absolute right-3 pointer-events-none" />
                </div>
              </div>

              {/* Direct Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Direct Phone Number
                </label>
                <div className="flex h-10 w-full items-center gap-2 bg-surface border border-border rounded-xl px-3 shadow-2xs focus-within:border-foreground transition-all">
                  <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-border text-xs font-semibold text-foreground select-none">
                    <span>🇮🇳</span>
                    <span>{countryCode}</span>
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none"
                    placeholder="98849 6151"
                  />
                </div>
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Department / Vertical
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-10 px-3.5 bg-surface border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-foreground transition-all shadow-2xs"
                  placeholder="e.g. Industrial Leasing"
                />
              </div>

              {/* Working Hours Start */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Working Hours Start
                </label>
                <input
                  type="text"
                  value={workingHoursStart}
                  onChange={(e) => setWorkingHoursStart(e.target.value)}
                  className="w-full h-10 px-3.5 bg-surface border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-foreground transition-all shadow-2xs"
                  placeholder="10:00 AM"
                />
              </div>

              {/* Working Hours End */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Working Hours End
                </label>
                <input
                  type="text"
                  value={workingHoursEnd}
                  onChange={(e) => setWorkingHoursEnd(e.target.value)}
                  className="w-full h-10 px-3.5 bg-surface border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-foreground transition-all shadow-2xs"
                  placeholder="7:30 PM"
                />
              </div>
            </div>

            {/* Note: Two-Step Authentication toggle is intentionally hidden per user instructions */}

            {/* Bottom Form Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="rounded-xl px-4 h-9 font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSaving}
                className="rounded-xl px-5 h-9 font-bold shadow-xs"
              >
                {isSaving ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* 3. CLEAN PASSWORD CHANGE MODAL (STANDARD MODAL COMPONENT) */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-foreground font-bold">
            <KeyRound className="w-5 h-5 text-foreground shrink-0" />
            <span>Change Account Password</span>
          </div>
        }
        description="Update your credentials to secure your Fairway CRM account"
        maxWidth="md"
      >
        <form onSubmit={handleChangePassword} className="space-y-4 text-left">
          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">Current Password</label>
            <div className="relative flex items-center">
              <input
                type={showCurrentPass ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-xs text-foreground focus:border-foreground outline-none shadow-2xs pr-10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 text-foreground-muted hover:text-foreground cursor-pointer"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">New Password</label>
            <div className="relative flex items-center">
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-xs text-foreground focus:border-foreground outline-none shadow-2xs pr-10"
                placeholder="Minimum 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 text-foreground-muted hover:text-foreground cursor-pointer"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">Confirm New Password</label>
            <div className="relative flex items-center">
              <input
                type={showConfirmPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-xs text-foreground focus:border-foreground outline-none shadow-2xs pr-10"
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 text-foreground-muted hover:text-foreground cursor-pointer"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPasswordModalOpen(false)}
              className="rounded-xl px-4 h-9 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isChangingPassword}
              className="rounded-xl px-4 h-9 font-bold shadow-xs"
            >
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
