import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Calendar,
  Clock,
  User,
  Building2,
  FileText,
  Search,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  X,
  Plus,
} from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { TimePicker } from '@/modules/core/components/ui/TimePicker';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { CallService } from '@/modules/core/services/callService';
import { CompanyService } from '@/modules/core/services/companyService';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { ContactService } from '@/modules/core/services/contactService';
import { Call, CallForType, RelatedToType, CallType, CallStatus } from '@/modules/core/types';
import { cn } from '@/modules/core/lib/utils';

export interface NewCallPageProps {
  initialCallType?: 'schedule' | 'log';
  onBack: () => void;
  onSuccess: (newCallId?: string) => void;
}

export const NewCallPage: React.FC<NewCallPageProps> = ({
  initialCallType = 'schedule',
  onBack,
  onSuccess,
}) => {
  const { users, currentUser } = useAuth();
  const { success, error } = useToast();

  const isLogMode = initialCallType === 'log';

  // Form state matching user's screenshots
  const [formData, setFormData] = useState({
    callForType: 'Contact' as CallForType,
    callForId: '',
    callForName: '',
    relatedToType: 'Account' as RelatedToType,
    relatedToId: '',
    relatedToName: '',
    callType: 'Outbound' as CallType,
    callStatus: (isLogMode ? 'Completed' : 'Scheduled') as CallStatus,
    callStartDate: new Date().toISOString().split('T')[0],
    callStartTime: '06:00 PM',
    callDuration: isLogMode ? '00:15' : '00:15',
    callOwnerId: currentUser?.id || 'usr_amit_1',
    callOwnerName: currentUser?.name || 'Harsheel Kasodariya',
    subject: isLogMode ? 'Call logged with Customer' : 'Call scheduled with Unknown',
    callPurpose: 'Prospecting',
    agenda: '',
    callResult: isLogMode ? 'Interested' : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessView, setShowSuccessView] = useState(false);
  const [createdCallId, setCreatedCallId] = useState<string>('');

  // Lookup options loaded from backend
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);

  // Search dropdowns visibility
  const [isCallForOpen, setIsCallForOpen] = useState(false);
  const [callForSearch, setCallForSearch] = useState('');
  const [isRelatedToOpen, setIsRelatedToOpen] = useState(false);
  const [relatedToSearch, setRelatedToSearch] = useState('');

  const callForRef = useRef<HTMLDivElement>(null);
  const relatedToRef = useRef<HTMLDivElement>(null);

  // Load companies & inquiries for search lookups
  useEffect(() => {
    CompanyService.getCompanies({ pageSize: 100 }).then((res) => {
      if (res.success && res.data) {
        setCompanies(res.data);
      }
    });

    InquiryService.getInquiries({ pageSize: 100 }).then((res) => {
      if (res.success && res.data) {
        setInquiries(res.data);
      }
    });
  }, []);

  // Fetch contacts for selected company or general contacts
  useEffect(() => {
    if (formData.relatedToId && formData.relatedToType === 'Account') {
      ContactService.getContacts(formData.relatedToId).then((res: any) => {
        if (res.success && res.data) {
          setContacts(res.data);
        }
      });
    } else {
      // Default fallback contacts
      setContacts([
        { id: 'cnt_1', name: 'Rajesh Patel', designation: 'VP Supply Chain', companyName: 'Reliance Petrochemicals' },
        { id: 'cnt_2', name: 'Sunil Deshmukh', designation: 'Head of Infra', companyName: 'Tata Advanced Systems' },
        { id: 'cnt_3', name: 'Nilesh Shah', designation: 'Director Logistics', companyName: 'Adani Ports Logistics' },
        { id: 'cnt_4', name: 'Vikram Mehta', designation: 'General Manager', companyName: 'Decathlon Sports' },
      ]);
    }
  }, [formData.relatedToId, formData.relatedToType]);

  // Close lookup popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (callForRef.current && !callForRef.current.contains(e.target as Node)) {
        setIsCallForOpen(false);
      }
      if (relatedToRef.current && !relatedToRef.current.contains(e.target as Node)) {
        setIsRelatedToOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Filtered Call For candidates
  const filteredCallForList = useMemo(() => {
    const q = callForSearch.toLowerCase().trim();
    if (formData.callForType === 'Contact') {
      return contacts.filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.companyName && c.companyName.toLowerCase().includes(q))
      );
    }
    // Lead / Inquiries
    return inquiries.filter(
      (inq) =>
        !q ||
        inq.inquiryNumber?.toLowerCase().includes(q) ||
        inq.companyName?.toLowerCase().includes(q) ||
        inq.contactName?.toLowerCase().includes(q)
    );
  }, [formData.callForType, contacts, inquiries, callForSearch]);

  // Filtered Related To candidates
  const filteredRelatedToList = useMemo(() => {
    const q = relatedToSearch.toLowerCase().trim();
    if (formData.relatedToType === 'Account') {
      return companies.filter((comp) => !q || comp.name?.toLowerCase().includes(q));
    }
    if (formData.relatedToType === 'Deal') {
      return inquiries.filter(
        (inq) =>
          !q ||
          inq.inquiryNumber?.toLowerCase().includes(q) ||
          inq.companyName?.toLowerCase().includes(q)
      );
    }
    // Campaign default list
    return [
      { id: 'camp_1', name: 'Q3 Industrial Expansion - Gujarat PCPIR' },
      { id: 'camp_2', name: 'Cold Storage & Agro Infrastructure Corridor' },
      { id: 'camp_3', name: 'E-Commerce Tier-1 Hub Campaign' },
    ].filter((camp) => !q || camp.name.toLowerCase().includes(q));
  }, [formData.relatedToType, companies, inquiries, relatedToSearch]);

  const handleSelectCallFor = (item: any) => {
    if (formData.callForType === 'Contact') {
      const contactName = item.name;
      setFormData((prev) => ({
        ...prev,
        callForId: item.id,
        callForName: contactName,
        relatedToName: prev.relatedToName || item.companyName || '',
        subject: `Call with ${contactName}`,
      }));
    } else {
      const leadName = item.contactName || item.companyName || item.inquiryNumber;
      setFormData((prev) => ({
        ...prev,
        callForId: item.id,
        callForName: leadName,
        relatedToName: prev.relatedToName || item.companyName || '',
        subject: `Follow up with ${leadName}`,
      }));
    }
    setIsCallForOpen(false);
    setCallForSearch('');
    clearError('callFor');
  };

  const handleSelectRelatedTo = (item: any) => {
    setFormData((prev) => ({
      ...prev,
      relatedToId: item.id,
      relatedToName: item.name || item.companyName || item.inquiryNumber,
    }));
    setIsRelatedToOpen(false);
    setRelatedToSearch('');
  };

  const validateForm = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formData.subject.trim()) {
      errs.subject = 'Subject is required';
    }
    if (!formData.callStartDate) {
      errs.callStartDate = 'Call date is required';
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      error('Incomplete Details', 'Please fill all mandatory fields marked with a red indicator.');
      return;
    }

    setIsSubmitting(true);
    try {
      const owner = users.find((u) => u.id === formData.callOwnerId) || currentUser;
      const payload = {
        callForType: formData.callForType,
        callForId: formData.callForId || undefined,
        callForName: formData.callForName || undefined,
        relatedToType: formData.relatedToType,
        relatedToId: formData.relatedToId || undefined,
        relatedToName: formData.relatedToName || undefined,
        callType: formData.callType,
        callStatus: formData.callStatus,
        callStartDate: formData.callStartDate,
        callStartTime: formData.callStartTime,
        callDuration: formData.callDuration || '00:15',
        callOwnerId: formData.callOwnerId,
        callOwnerName: owner.name,
        subject: formData.subject.trim(),
        callPurpose: formData.callPurpose,
        agenda: formData.agenda,
        callResult: formData.callResult,
      };

      const res = await CallService.createCall(payload);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to save call record');
      }

      setCreatedCallId(res.data.id);
      success(
        formData.callStatus === 'Completed' ? 'Call Logged' : 'Call Scheduled',
        `Call record "${formData.subject}" has been successfully recorded in CRM.`
      );
      setShowSuccessView(true);
    } catch (err: any) {
      error('Action Failed', err.message || 'Could not record call');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (showSuccessView) {
    return (
      <div className="w-full text-left space-y-6 animate-fade-in pb-16">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-6 shadow-xs max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-fairway-50 text-fairway-600 dark:bg-fairway-950 dark:text-fairway-400 flex items-center justify-center mx-auto border border-fairway-200 dark:border-fairway-800 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {formData.callStatus === 'Completed' ? 'Call Successfully Logged!' : 'Call Successfully Scheduled!'}
            </h1>
            <p className="text-xs text-foreground-muted leading-relaxed">
              <strong className="text-foreground">{formData.subject}</strong> has been saved and linked to assigned owner{' '}
              <span className="font-semibold text-foreground">{formData.callOwnerName}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => onSuccess(createdCallId)}
              className="bg-fairway-600 hover:bg-fairway-700 text-white font-semibold text-xs px-5 shadow-xs"
            >
              Go to Calls Master
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessView(false);
                setFormData((prev) => ({
                  ...prev,
                  subject: 'Call scheduled with Unknown',
                  agenda: '',
                  callForName: '',
                  callForId: '',
                }));
              }}
              className="text-xs border-border"
            >
              Log Another Call
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isValid = Object.keys(errors).length === 0 && formData.subject.trim().length > 0;

  return (
    <div className="w-full text-left space-y-6 pb-20">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 pb-4 border-b border-border">
        <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-fairway-500/10 text-fairway-600 dark:bg-fairway-500/20 dark:text-fairway-400 border border-fairway-500/20 flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">
                {isLogMode ? 'Log a Call' : 'Schedule a call'}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 border border-fairway-500/20 whitespace-nowrap shrink-0">
                {isLogMode ? 'Completed Call' : 'Upcoming Event'}
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5 leading-relaxed">
              {isLogMode
                ? 'Record details, customer notes, and outcome of an outbound or inbound phone conversation'
                : 'Plan an upcoming client call, specify purpose, agenda, and associate with accounts or deals'}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4 shrink-0" />}
            className="rounded-xl font-semibold justify-center h-9 shadow-2xs text-xs whitespace-nowrap"
          >
            Back
          </Button>
        </div>
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} noValidate className="w-full space-y-6">
        {/* ========================================================================= */}
        {/* SECTION 1: CALL INFORMATION (MATCHING USER SCREENSHOTS) */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="pb-3 border-b border-border flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                Call Information
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Target contact, associated CRM records, schedule timing, and call ownership
              </p>
            </div>
            <span className="inline-flex items-center text-[11px] font-bold text-fairway-600 bg-fairway-50 dark:bg-fairway-950/60 dark:text-fairway-300 px-2.5 py-1 rounded-md border border-fairway-200 dark:border-fairway-800 whitespace-nowrap shrink-0">
              Mandatory Fields
            </span>
          </div>

          <div className="space-y-4">
            {/* Field 1: Call For (Contact / Lead dropdown + search lookup) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <label className="sm:col-span-3 text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Call For</span>
                <span className="w-1.5 h-3.5 bg-rose-500 rounded-xs inline-block ml-1" />
              </label>
              <div className="sm:col-span-9 relative" ref={callForRef}>
                <div className="flex items-center border border-border rounded-xl bg-surface-muted/40 overflow-hidden focus-within:border-fairway-600 focus-within:ring-1 focus-within:ring-fairway-600 transition-all">
                  <select
                    value={formData.callForType}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        callForType: e.target.value as CallForType,
                        callForName: '',
                        callForId: '',
                      }));
                    }}
                    className="bg-transparent text-xs font-semibold text-foreground px-3 py-2.5 border-r border-border outline-none shrink-0 cursor-pointer"
                  >
                    <option value="Contact">Contact</option>
                    <option value="Lead">Lead</option>
                  </select>

                  <div
                    onClick={() => setIsCallForOpen(true)}
                    className="flex-1 flex items-center justify-between px-3 py-2 text-xs text-foreground cursor-pointer min-w-0"
                  >
                    <span className={formData.callForName ? 'font-medium text-foreground truncate' : 'text-foreground-muted'}>
                      {formData.callForName || `Select or search ${formData.callForType.toLowerCase()}...`}
                    </span>
                    <Search className="w-4 h-4 text-foreground-muted shrink-0 ml-2" />
                  </div>
                </div>

                {/* Call For Popover Search Results */}
                {isCallForOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50">
                    <div className="p-2 border-b border-border bg-surface-muted/30">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-2.5 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          placeholder={`Search ${formData.callForType.toLowerCase()}s by name or company...`}
                          value={callForSearch}
                          onChange={(e) => setCallForSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-foreground placeholder:text-foreground-muted outline-none focus:border-fairway-600"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1 divide-y divide-border/40">
                      {filteredCallForList.length === 0 ? (
                        <div className="p-3 text-center text-xs text-foreground-muted">
                          No {formData.callForType.toLowerCase()}s found.
                        </div>
                      ) : (
                        filteredCallForList.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectCallFor(item)}
                            className="p-2 hover:bg-fairway-50 dark:hover:bg-fairway-950/40 cursor-pointer rounded-lg transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate">
                                {item.name || item.contactName || item.inquiryNumber}
                              </div>
                              <div className="text-[11px] text-foreground-muted truncate">
                                {item.companyName || item.designation || 'Inquiry Reference'}
                              </div>
                            </div>
                            <span className="text-[10px] text-fairway-600 font-bold bg-fairway-500/10 px-1.5 py-0.5 rounded shrink-0 ml-2">
                              Select
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Field 2: Related To (Account / Deal / Campaign dropdown + search lookup) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <label className="sm:col-span-3 text-xs font-semibold text-foreground">
                Related To
              </label>
              <div className="sm:col-span-9 relative" ref={relatedToRef}>
                <div className="flex items-center border border-border rounded-xl bg-surface-muted/40 overflow-hidden focus-within:border-fairway-600 focus-within:ring-1 focus-within:ring-fairway-600 transition-all">
                  <select
                    value={formData.relatedToType}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        relatedToType: e.target.value as RelatedToType,
                        relatedToName: '',
                        relatedToId: '',
                      }));
                    }}
                    className="bg-transparent text-xs font-semibold text-foreground px-3 py-2.5 border-r border-border outline-none shrink-0 cursor-pointer"
                  >
                    <option value="Account">Account</option>
                    <option value="Deal">Deal</option>
                    <option value="Campaign">Campaign</option>
                  </select>

                  <div
                    onClick={() => setIsRelatedToOpen(true)}
                    className="flex-1 flex items-center justify-between px-3 py-2 text-xs text-foreground cursor-pointer min-w-0"
                  >
                    <span className={formData.relatedToName ? 'font-medium text-foreground truncate' : 'text-foreground-muted'}>
                      {formData.relatedToName || `Select or search ${formData.relatedToType.toLowerCase()}...`}
                    </span>
                    <Search className="w-4 h-4 text-foreground-muted shrink-0 ml-2" />
                  </div>
                </div>

                {/* Related To Popover Search Results */}
                {isRelatedToOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50">
                    <div className="p-2 border-b border-border bg-surface-muted/30">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-2.5 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          placeholder={`Search ${formData.relatedToType.toLowerCase()}...`}
                          value={relatedToSearch}
                          onChange={(e) => setRelatedToSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-foreground placeholder:text-foreground-muted outline-none focus:border-fairway-600"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1 divide-y divide-border/40">
                      {filteredRelatedToList.length === 0 ? (
                        <div className="p-3 text-center text-xs text-foreground-muted">
                          No {formData.relatedToType.toLowerCase()}s found.
                        </div>
                      ) : (
                        filteredRelatedToList.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectRelatedTo(item)}
                            className="p-2 hover:bg-fairway-50 dark:hover:bg-fairway-950/40 cursor-pointer rounded-lg transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 font-semibold text-foreground truncate">
                              {item.name || item.companyName || item.inquiryNumber}
                            </div>
                            <span className="text-[10px] text-fairway-600 font-bold bg-fairway-500/10 px-1.5 py-0.5 rounded shrink-0 ml-2">
                              Select
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Field 3: Call Type (Outbound / Inbound) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <label className="sm:col-span-3 text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Call Type</span>
                <span className="w-1.5 h-3.5 bg-rose-500 rounded-xs inline-block ml-1" />
              </label>
              <div className="sm:col-span-9">
                <div className="flex items-center justify-between border border-border rounded-xl bg-surface-muted/40 px-3.5 py-2">
                  <select
                    value={formData.callType}
                    onChange={(e) => setFormData({ ...formData, callType: e.target.value as CallType })}
                    className="bg-transparent text-xs font-semibold text-foreground outline-none w-full cursor-pointer"
                  >
                    <option value="Outbound">Outbound</option>
                    <option value="Inbound">Inbound</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Field 4: Outgoing Call Status */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <label className="sm:col-span-3 text-xs font-semibold text-foreground">
                Outgoing Call Status
              </label>
              <div className="sm:col-span-9">
                <div className="flex items-center justify-between border border-border rounded-xl bg-surface-muted/40 px-3.5 py-2">
                  <select
                    value={formData.callStatus}
                    onChange={(e) => setFormData({ ...formData, callStatus: e.target.value as CallStatus })}
                    className="bg-transparent text-xs font-semibold text-foreground outline-none w-full cursor-pointer"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Field 5: Call Start Time (DatePicker + TimePicker) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <label className="sm:col-span-3 text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Call Start Time</span>
                <span className="w-1.5 h-3.5 bg-rose-500 rounded-xs inline-block ml-1" />
              </label>
              <div className="sm:col-span-9 grid grid-cols-1 xs:grid-cols-2 gap-3">
                <DatePicker
                  value={formData.callStartDate}
                  onChange={(val) => {
                    setFormData({ ...formData, callStartDate: val });
                    clearError('callStartDate');
                  }}
                />
                <TimePicker
                  value={formData.callStartTime}
                  onChange={(val) => setFormData({ ...formData, callStartTime: val })}
                />
              </div>
            </div>

            {/* Field 6: Call Duration (e.g. 00:15) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <label className="sm:col-span-3 text-xs font-semibold text-foreground">
                Call Duration
              </label>
              <div className="sm:col-span-9">
                <input
                  type="text"
                  placeholder="e.g. 00:15"
                  value={formData.callDuration}
                  onChange={(e) => setFormData({ ...formData, callDuration: e.target.value })}
                  className="w-full bg-surface-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:border-fairway-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Field 7: Call Owner */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <label className="sm:col-span-3 text-xs font-semibold text-foreground">
                Call Owner
              </label>
              <div className="sm:col-span-9">
                <div className="flex items-center border border-border rounded-xl bg-surface-muted/40 overflow-hidden focus-within:border-fairway-600 transition-all">
                  <select
                    value={formData.callOwnerId}
                    onChange={(e) => {
                      const u = users.find((usr) => usr.id === e.target.value);
                      setFormData({
                        ...formData,
                        callOwnerId: e.target.value,
                        callOwnerName: u ? u.name : formData.callOwnerName,
                      });
                    }}
                    className="flex-1 bg-transparent px-3.5 py-2.5 text-xs font-medium text-foreground outline-none cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                  <div className="pr-3 text-foreground-muted shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Field 8: Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <label className="sm:col-span-3 text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Subject</span>
                <span className="w-1.5 h-3.5 bg-rose-500 rounded-xs inline-block ml-1" />
              </label>
              <div className="sm:col-span-9">
                <input
                  type="text"
                  placeholder="e.g. Call scheduled with Rajesh Patel"
                  value={formData.subject}
                  onChange={(e) => {
                    setFormData({ ...formData, subject: e.target.value });
                    clearError('subject');
                  }}
                  className={cn(
                    'w-full bg-surface-muted/40 border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none transition-colors',
                    errors.subject ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-border focus:border-fairway-600'
                  )}
                  required
                />
                {errors.subject && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.subject}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: PURPOSE OF OUTGOING CALL & DISCUSSION NOTES */}
        {/* ========================================================================= */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="pb-3 border-b border-border">
            <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
              Purpose Of Outgoing Call & Notes
            </h2>
            <p className="text-xs text-foreground-muted mt-0.5">
              Categorize the objective and record key discussion points or next actions
            </p>
          </div>

          <div className="space-y-4">
            {/* Purpose */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <label className="sm:col-span-3 text-xs font-semibold text-foreground">
                Call Purpose
              </label>
              <div className="sm:col-span-9">
                <select
                  value={formData.callPurpose}
                  onChange={(e) => setFormData({ ...formData, callPurpose: e.target.value })}
                  className="w-full bg-surface-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:border-fairway-600 focus:outline-none cursor-pointer"
                >
                  <option value="Prospecting">Prospecting</option>
                  <option value="Administrative">Administrative</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Project Demo">Project Demo / Site Tour</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Cold Outreach">Cold Outreach</option>
                  <option value="Support">Support & Queries</option>
                </select>
              </div>
            </div>

            {/* Agenda / Discussion Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              <label className="sm:col-span-3 text-xs font-semibold text-foreground pt-2">
                Discussion Notes / Agenda
              </label>
              <div className="sm:col-span-9">
                <textarea
                  rows={4}
                  placeholder="Summarize discussion topics, client feedback, power/water requirements, timeline expectations, or next steps..."
                  value={formData.agenda}
                  onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                  className="w-full bg-surface-muted/40 border border-border rounded-xl p-3.5 text-xs text-foreground placeholder:text-foreground-muted focus:border-fairway-600 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Call Result / Outcome */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <label className="sm:col-span-3 text-xs font-semibold text-foreground">
                Call Outcome / Result
              </label>
              <div className="sm:col-span-9">
                <input
                  type="text"
                  placeholder="e.g. Interested - Needs Site Visit next Tuesday"
                  value={formData.callResult}
                  onChange={(e) => setFormData({ ...formData, callResult: e.target.value })}
                  className="w-full bg-surface-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:border-fairway-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: STICKY SUBMISSION CONTROLS */}
        {/* ========================================================================= */}
        <div className="sticky bottom-2 sm:bottom-4 z-30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-5 bg-surface/95 dark:bg-surface/95 backdrop-blur-md border border-border rounded-2xl shadow-lg sm:shadow-xl transition-all">
          <div className="flex items-center gap-2.5 sm:gap-3 text-xs min-w-0">
            {Object.keys(errors).length > 0 ? (
              <span className="flex items-center gap-1.5 text-rose-500 font-semibold truncate">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="truncate">Please complete mandatory fields highlighted in red</span>
              </span>
            ) : isValid ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">All required call details verified</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-foreground-muted text-[11px] sm:text-xs min-w-0">
                <ShieldCheck className="w-4 h-4 text-fairway-600 shrink-0" />
                <span className="leading-snug truncate sm:whitespace-normal">
                  Record will be securely synced with Fairway CRM communication trail
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-foreground text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-fairway-600 hover:bg-fairway-700 text-white text-xs font-bold shadow-xs transition-colors whitespace-nowrap justify-center"
            >
              {isSubmitting
                ? 'Recording...'
                : isLogMode
                ? 'Log Call Record'
                : 'Schedule Call'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewCallPage;
