import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User as UserIcon,
  Pencil,
  ArrowLeft,
  Lock,
  Calendar,
  Info,
  KeyRound,
  Check,
  Upload,
  Copy,
  Clock,
  Globe,
  Shield,
  Building,
  Briefcase,
  Eye,
  EyeOff,
  Trash2,
  PhoneCall,
} from 'lucide-react';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Button } from '@/modules/core/components/ui/Button';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
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
  const [birthDate, setBirthDate] = useState(currentUser.birthDate || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(currentUser.twoFactorEnabled ?? false);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isPasswordModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPasswordModalOpen]);

  const handleStartEdit = () => {
    setName(currentUser.name || '');
    const rawPhone = currentUser.phone || '+91 988496151';
    const cleanPhone = rawPhone.replace('+91', '').trim();
    setPhone(cleanPhone || '98849 6151');
    setDepartment(currentUser.department || 'Industrial Leasing');
    setTimezone(currentUser.timezone || 'Asia/Kolkata');
    setWorkingHoursStart(currentUser.workingHoursStart || '10:00 AM');
    setWorkingHoursEnd(currentUser.workingHoursEnd || '7:30 PM');
    setBirthDate(currentUser.birthDate || '');
    setAvatar(currentUser.avatar || '');
    setTwoFactorEnabled(currentUser.twoFactorEnabled ?? false);
    setIsEditing(true);
  };

  const handleCopyEmail = () => {
    if (!currentUser.email) return;
    navigator.clipboard.writeText(currentUser.email);
    setIsCopiedEmail(true);
    success('Copied', 'Email address copied to clipboard.');
    setTimeout(() => setIsCopiedEmail(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      error('File too large', 'Please choose an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        const img = new Image();
        img.onload = () => {
          const maxDim = 512;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setAvatar(compressedDataUrl);
          } else {
            setAvatar(event.target?.result as string);
          }
        };
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
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
        avatar: avatar.trim() || undefined,
        birthDate: birthDate || undefined,
        twoFactorEnabled,
      });

      setIsSaving(false);
      if (res.success) {
        success('Profile Updated', 'Your profile details have been saved successfully.');
        setIsEditing(false);
      } else {
        const errMsg = res.error || 'Failed to update profile. Please try again.';
        error('Update Failed', errMsg);
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

  return (
    <div className="w-full max-w-full space-y-6 pb-12 text-left animate-fade-in">
      {/* Hidden File Input for Avatar Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-fairway-500/10 dark:bg-fairway-500/20 text-fairway-700 dark:text-fairway-300 flex items-center justify-center border border-fairway-500/20">
              <UserIcon className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              User Profile
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-foreground-muted pl-10.5">
            View and manage your personal information
          </p>
        </div>

        {isEditing ? (
          <Button
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 border-border hover:bg-surface-muted shadow-2xs self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Profile</span>
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <Button
              variant="outline"
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 shadow-2xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-foreground-muted" />
              <span>Change Password</span>
            </Button>
            <Button
              onClick={handleStartEdit}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-fairway-600 hover:bg-fairway-700 text-white shadow-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Full-Width Content View */}
      {!isEditing ? (
        /* --- FULL-WIDTH READ ONLY VIEW --- */
        <div className="w-full bg-surface rounded-2xl border border-border p-5 sm:p-7 md:p-9 shadow-xs space-y-8 animate-fade-in">
          {/* Main User Card Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-7 pb-8 border-b border-border/80">
            {/* Large Avatar container */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-surface-muted/90 border-2 border-border shadow-sm flex items-center justify-center">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-fairway-500 via-fairway-600 to-fairway-800 flex items-center justify-center text-white font-bold text-3xl select-none">
                    {currentUser.name
                      ? currentUser.name
                          .split(/\s+/)
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : 'U'}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight truncate">
                  {currentUser.name}
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-fairway-100 text-fairway-900 border border-fairway-300 dark:bg-fairway-950/80 dark:text-fairway-300 dark:border-fairway-800">
                  {currentUser.role?.replace('_', ' ')}
                </span>
              </div>

              {/* Email with copy button */}
              <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground-muted font-mono">
                <span className="truncate">{currentUser.email}</span>
                <button
                  onClick={handleCopyEmail}
                  className="p-1 text-foreground-muted hover:text-foreground hover:bg-surface-muted rounded transition-colors"
                  title="Copy email"
                >
                  {isCopiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Phone */}
              <p className="text-xs sm:text-sm text-foreground-muted font-medium flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                <span>{currentUser.phone || '+91 988496151'}</span>
              </p>

              {/* Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Account
                </span>

                {currentUser.department && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-muted text-foreground-muted border border-border">
                    <Building className="w-3.5 h-3.5 text-foreground-muted" />
                    <span>{currentUser.department}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Other Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
              <Info className="w-4 h-4 text-fairway-600" />
              <span>Other Information</span>
            </h3>

            {/* Responsive Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 pt-1">
              {/* Timezone */}
              <div className="p-4 rounded-xl bg-surface-muted/40 border border-border/80 space-y-1 hover:border-fairway-400/50 transition-colors shadow-2xs">
                <div className="flex items-center gap-1.5 text-foreground-muted">
                  <Globe className="w-3.5 h-3.5 text-fairway-600" />
                  <span className="text-xs font-semibold block">Timezone</span>
                </div>
                <p className="text-sm font-bold text-foreground truncate">
                  {currentUser.timezone || 'Asia/Kolkata'}
                </p>
              </div>

              {/* Working Hours Start */}
              <div className="p-4 rounded-xl bg-surface-muted/40 border border-border/80 space-y-1 hover:border-fairway-400/50 transition-colors shadow-2xs">
                <div className="flex items-center gap-1.5 text-foreground-muted">
                  <Clock className="w-3.5 h-3.5 text-fairway-600" />
                  <span className="text-xs font-semibold block">Working Hours Start</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {currentUser.workingHoursStart || '10:00 AM'}
                </p>
              </div>

              {/* Working Hours End */}
              <div className="p-4 rounded-xl bg-surface-muted/40 border border-border/80 space-y-1 hover:border-fairway-400/50 transition-colors shadow-2xs">
                <div className="flex items-center gap-1.5 text-foreground-muted">
                  <Clock className="w-3.5 h-3.5 text-fairway-600" />
                  <span className="text-xs font-semibold block">Working Hours End</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {currentUser.workingHoursEnd || '7:30 PM'}
                </p>
              </div>

              {/* Two-Step Authentication */}
              <div className="p-4 rounded-xl bg-surface-muted/40 border border-border/80 space-y-1 hover:border-fairway-400/50 transition-colors shadow-2xs">
                <div className="flex items-center gap-1.5 text-foreground-muted">
                  <Shield className="w-3.5 h-3.5 text-fairway-600" />
                  <span className="text-xs font-semibold block">Two-Step Auth</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {currentUser.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>

              {/* Birth Date */}
              {currentUser.birthDate && (
                <div className="p-4 rounded-xl bg-surface-muted/40 border border-border/80 space-y-1 hover:border-fairway-400/50 transition-colors shadow-2xs">
                  <div className="flex items-center gap-1.5 text-foreground-muted">
                    <Calendar className="w-3.5 h-3.5 text-fairway-600" />
                    <span className="text-xs font-semibold block">Birth Date</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {currentUser.birthDate}
                  </p>
                </div>
              )}

              {/* Active Deals / Leads */}
              <div className="p-4 rounded-xl bg-surface-muted/40 border border-border/80 space-y-1 hover:border-fairway-400/50 transition-colors shadow-2xs">
                <div className="flex items-center gap-1.5 text-foreground-muted">
                  <Briefcase className="w-3.5 h-3.5 text-fairway-600" />
                  <span className="text-xs font-semibold block">Assigned Deals</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {currentUser.assignedLeadsCount || 0} active
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* --- FULL-WIDTH EDIT USER PROFILE FORM (RESPONSIVE FOR WEB, TABLET & MOBILE) --- */
        <form onSubmit={handleSaveProfile} className="w-full bg-surface rounded-2xl border border-border p-5 sm:p-7 md:p-9 shadow-xs space-y-8 animate-fade-in">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center justify-center space-y-3 pb-6 border-b border-border/80">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <span>Profile Image</span>
              <Info className="w-3.5 h-3.5 text-foreground-muted cursor-help" />
            </div>

            {/* Click to upload box with preview */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-surface-muted/90 border-2 border-dashed border-border hover:border-fairway-500 hover:ring-4 hover:ring-fairway-500/10 transition-all flex items-center justify-center cursor-pointer overflow-hidden shadow-xs group"
              title="Click to choose a photo under 2MB"
            >
              {avatar ? (
                <>
                  <img src={avatar} alt="Profile preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-semibold gap-1">
                    <Upload className="w-5 h-5" />
                    <span>Change</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-foreground-muted group-hover:text-foreground transition-colors gap-2">
                  <UserIcon className="w-12 h-12 text-foreground-muted/60 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium text-foreground-muted">Upload Photo</span>
                </div>
              )}
            </div>

            {/* Helper Action Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-fairway-600 hover:text-fairway-700 transition-colors"
              >
                Click to upload profile photo
              </button>
              {avatar && (
                <>
                  <span className="text-foreground-muted text-xs">•</span>
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    className="text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </>
              )}
            </div>
            <p className="text-[10px] text-foreground-muted">Supported formats: JPG, PNG or WEBP (under 2MB)</p>
          </div>

          {/* Form Fields Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500 transition-all shadow-2xs"
                placeholder="e.g. Harsheel Kasodariya"
              />
            </div>

            {/* Email (Read-only with lock icon) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Email
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full h-10 px-3.5 bg-surface-muted/80 border border-border rounded-xl text-xs text-foreground-muted cursor-not-allowed select-none font-mono pr-9 shadow-2xs"
                />
                <Lock className="w-4 h-4 text-foreground-muted absolute right-3 pointer-events-none" />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Phone Number
              </label>
              <div className="flex h-10 w-full items-center gap-2 bg-surface-muted/40 border border-border rounded-xl px-3 shadow-2xs focus-within:border-fairway-500 focus-within:ring-1 focus-within:ring-fairway-500 transition-all">
                <div className="flex items-center gap-1.5 shrink-0 pr-2.5 border-r border-border text-xs font-semibold text-foreground select-none">
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

            {/* Birth Date with DatePicker */}
            <div className="space-y-1.5">
              <DatePicker
                label="Birth Date"
                value={birthDate}
                onChange={(dateStr) => setBirthDate(dateStr)}
                placeholder="Select your birth date"
              />
            </div>
          </div>



          {/* Two-Step Authentication Full Width Section */}
          <div className="rounded-2xl border border-border p-5 sm:p-6 space-y-4 bg-surface-muted/20 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-foreground">
                  Two-Step Authentication
                </h3>
                <p className="text-[11px] text-foreground-muted">
                  Add an extra layer of security to your Fairway CRM account
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={twoFactorEnabled}
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  twoFactorEnabled ? 'bg-fairway-600' : 'bg-surface-muted border-border'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Blue Alert Banner */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-sky-500/10 border-l-4 border-l-sky-500 border border-sky-500/20 text-[11px] sm:text-xs text-sky-400">
              <p className="leading-relaxed">
                <span className="font-semibold text-sky-300">Important:</span> When this is ON, an OTP is sent to your email every time you log in.{' '}
                <span className="underline font-semibold text-sky-200">You cannot log in without entering the OTP.</span>
              </p>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="text-xs font-semibold px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-fairway-600 hover:bg-fairway-700 text-white text-xs font-semibold rounded-xl shadow-xs"
            >
              {isSaving ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      )}

      {/* Change Password Responsive Modal using React Portal */}
      {isPasswordModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Full-screen Backdrop covering topbar, sidebar, and whole viewport */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => setIsPasswordModalOpen(false)}
            />

            {/* Dialog Box */}
            <div className="relative w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl p-6 space-y-6 text-left z-10 my-auto animate-scale-in">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-fairway-500/10 text-fairway-600 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">Change Password</h3>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">Current Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 outline-none shadow-2xs pr-10"
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 text-foreground-muted hover:text-foreground"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">New Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 outline-none shadow-2xs pr-10"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 text-foreground-muted hover:text-foreground"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">Confirm New Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-muted/40 border border-border rounded-xl text-xs text-foreground focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 outline-none shadow-2xs pr-10"
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 text-foreground-muted hover:text-foreground"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="text-xs px-4 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isChangingPassword}
                    className="bg-fairway-600 hover:bg-fairway-700 text-white text-xs font-semibold px-5 py-2 shadow-xs"
                  >
                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ProfilePage;
