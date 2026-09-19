import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  Edit2,
  ExternalLink,
  Download,
  Loader2,
  Star,
  UserCheck,
  RefreshCw,
  List,
  LayoutGrid,
  X,
  Settings,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/modules/core/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/modules/core/components/ui/tooltip';
import ContactService from '@/modules/core/services/contactService';
import CompanyService from '@/modules/core/services/companyService';
import { Contact, Company } from '@/modules/core/types';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Button } from '@/modules/core/components/ui/Button';
import { Card } from '@/modules/core/components/ui/Card';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input, Textarea } from '@/modules/core/components/ui/Input';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { cn } from '@/modules/core/lib/utils';
import { ContactsList } from '../components/ContactsList';
import { ContactsCard } from '../components/ContactsCard';

interface ContactsPageProps {
  onSelectCompany?: (companyId: string) => void;
  onOpenNewInquiry?: (companyId?: string) => void;
}

const DEPARTMENT_OPTIONS = [
  'Supply Chain',
  'Logistics & Warehousing',
  'Real Estate & Infrastructure',
  'Executive Leadership',
  'Plant Operations',
  'Procurement',
];

export const ContactsPage: React.FC<ContactsPageProps> = ({ onSelectCompany }) => {
  const { success, error } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [primaryOnly, setPrimaryOnly] = useState(false);

  // Filter Drawer Drafts
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [draftDepartment, setDraftDepartment] = useState('all');
  const [draftCompanyId, setDraftCompanyId] = useState('all');
  const [draftPrimaryOnly, setDraftPrimaryOnly] = useState(false);

  // Column Visibility Config
  const [columns, setColumns] = useState<Record<string, boolean>>({
    contact: true,
    company: true,
    department: true,
    phone: true,
    email: true,
    actions: true,
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    department: 'Supply Chain',
    phone: '',
    email: '',
    linkedinUrl: '',
    companyId: '',
    isPrimary: false,
    notes: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadData = async (isSpin = false) => {
    if (isSpin) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [contactsRes, companiesRes] = await Promise.all([
        ContactService.getContacts(),
        CompanyService.getCompanies(),
      ]);

      if (contactsRes.success && contactsRes.data) {
        setContacts(contactsRes.data);
      }
      if (companiesRes.success && companiesRes.data) {
        setCompanies(companiesRes.data);
      }
    } catch (err: any) {
      error('Failed to load contacts', err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openFilterDrawer = () => {
    setDraftDepartment(selectedDepartment);
    setDraftCompanyId(selectedCompanyId);
    setDraftPrimaryOnly(primaryOnly);
    setIsFilterDrawerOpen(true);
  };

  const applyFilters = () => {
    setSelectedDepartment(draftDepartment);
    setSelectedCompanyId(draftCompanyId);
    setPrimaryOnly(draftPrimaryOnly);
    setIsFilterDrawerOpen(false);
  };

  const resetFilters = () => {
    setDraftDepartment('all');
    setDraftCompanyId('all');
    setDraftPrimaryOnly(false);
    setSelectedDepartment('all');
    setSelectedCompanyId('all');
    setPrimaryOnly(false);
    setSearch('');
    setIsFilterDrawerOpen(false);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedDepartment !== 'all') count++;
    if (selectedCompanyId !== 'all') count++;
    if (primaryOnly) count++;
    return count;
  }, [selectedDepartment, selectedCompanyId, primaryOnly]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.designation && c.designation.toLowerCase().includes(q)) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q));

      const matchesDept = selectedDepartment === 'all' || c.department === selectedDepartment;
      const matchesCompany = selectedCompanyId === 'all' || c.companyId === selectedCompanyId;
      const matchesPrimary = !primaryOnly || c.isPrimary;

      return matchesSearch && matchesDept && matchesCompany && matchesPrimary;
    });
  }, [contacts, search, selectedDepartment, selectedCompanyId, primaryOnly]);

  // Top Metrics
  const totalContacts = contacts.length;
  const primaryContacts = contacts.filter((c) => c.isPrimary).length;
  const decisionMakers = contacts.filter((c) =>
    ['VP', 'Director', 'Head', 'CEO', 'COO', 'Chief', 'General Manager'].some(
      (role) => c.designation?.toLowerCase().includes(role.toLowerCase())
    )
  ).length;
  const uniqueCompaniesCount = new Set(contacts.map((c) => c.companyId).filter(Boolean)).size;

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      designation: '',
      department: 'Supply Chain',
      phone: '',
      email: '',
      linkedinUrl: '',
      companyId: companies[0]?.id || '',
      isPrimary: false,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      designation: contact.designation || '',
      department: contact.department || 'Supply Chain',
      phone: contact.phone || '',
      email: contact.email || '',
      linkedinUrl: contact.linkedinUrl || '',
      companyId: contact.companyId || '',
      isPrimary: !!contact.isPrimary,
      notes: contact.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete stakeholder "${name}"?`)) return;

    try {
      const res = await ContactService.deleteContact(id);
      if (res.success) {
        setContacts((prev) => prev.filter((c) => c.id !== id));
        success('Contact Deleted', `${name} has been removed.`);
      } else {
        error('Delete Failed', res.error || 'Could not delete contact');
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      error('Validation Error', 'Contact name is required');
      return;
    }

    setFormSubmitting(true);
    try {
      const selectedComp = companies.find((c) => c.id === formData.companyId);
      const payload = {
        ...formData,
        companyName: selectedComp?.name || '',
      };

      if (editingContact) {
        const res = await ContactService.updateContact(editingContact.id, payload);
        if (res.success && res.data) {
          setContacts((prev) => prev.map((c) => (c.id === editingContact.id ? res.data! : c)));
          success('Contact Updated', `${payload.name} details saved.`);
          setIsModalOpen(false);
        } else {
          error('Update Failed', res.error || 'Could not update contact');
        }
      } else {
        const res = await ContactService.createContact(payload);
        if (res.success && res.data) {
          setContacts((prev) => [res.data!, ...prev]);
          success('Contact Created', `${payload.name} added to directory.`);
          setIsModalOpen(false);
        } else {
          error('Creation Failed', res.error || 'Could not create contact');
        }
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const departmentOptions: ComboboxOption[] = [
    { value: 'all', label: 'All Departments' },
    ...DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d })),
  ];

  const companyOptions: ComboboxOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'All Companies' },
      ...companies.map((c) => ({ value: c.id, label: c.name })),
    ];
  }, [companies]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-left">
      {/* 1. Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">CRM / Contacts</span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-0.5">
            <Users className="w-6 h-6 text-primary" />
            <span>Contacts & Key Stakeholders</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Enterprise decision-makers, supply chain leads, and warehouse operational heads across Gujarat.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={handleOpenAdd} size="sm" className="gap-1.5 shadow-sm font-semibold w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Contacts</span>
            <span className="p-1.5 rounded-lg bg-surface-muted text-foreground border border-border">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{totalContacts}</span>
            <span className="text-xs text-muted-foreground">in database</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Decision Makers</span>
            <span className="p-1.5 rounded-lg bg-surface-muted text-foreground border border-border">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{decisionMakers}</span>
            <span className="text-xs text-muted-foreground">C-Level / VP / Heads</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Primary Liaisons</span>
            <span className="p-1.5 rounded-lg bg-surface-muted text-foreground border border-border">
              <Star className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{primaryContacts}</span>
            <span className="text-xs text-muted-foreground">Account heads</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Companies Connected</span>
            <span className="p-1.5 rounded-lg bg-surface-muted text-foreground border border-border">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{uniqueCompaniesCount}</span>
            <span className="text-xs text-muted-foreground">organizations</span>
          </div>
        </Card>
      </div>

      {/* 3. Sleek Search & Control Toolbar matching reference */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by contact name, designation, company, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-surface-muted/60 dark:bg-[#141a23] border border-border rounded-lg text-foreground placeholder:text-foreground-muted/60 focus:border-fairway-600 focus:outline-none transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-foreground-muted hover:text-foreground p-0.5 rounded-full"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Controls & View Switcher */}
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end w-full sm:w-auto">
            {/* Filter Drawer Trigger Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={openFilterDrawer}
                  className={cn(
                    "relative size-9 rounded-button border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs",
                    activeFiltersCount > 0 && "text-fairway-600 border-fairway-400 bg-fairway-50 dark:bg-fairway-950/40"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 size-4 rounded-full bg-fairway-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Filter
              </TooltipContent>
            </Tooltip>

            {/* Column Settings Dropdown (Desktop Only) */}
            <div className="hidden sm:block">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="size-9 rounded-button border border-border bg-white dark:bg-[#171717] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Column
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-48 bg-surface dark:bg-[#161c24] border border-border dark:border-white/[0.12] shadow-none ring-0 outline-none p-1 rounded-card z-50">
                  <DropdownMenuLabel className="text-xs font-bold text-foreground px-2 py-1.5">
                    Toggle Columns
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={columns.contact}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, contact: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Contact Person
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.company}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, company: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Company
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.department}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, department: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Department
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.phone}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, phone: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Phone Number
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.email}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, email: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Email Address
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columns.actions}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(val) => setColumns((prev) => ({ ...prev, actions: !!val }))}
                    className="text-xs cursor-pointer"
                  >
                    Actions
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Refresh Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => loadData(true)}
                  disabled={isRefreshing || loading}
                  className="size-9 rounded-button border border-border bg-white dark:bg-[#11161d] hover:bg-surface-muted flex items-center justify-center text-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 disabled:opacity-70"
                >
                  <RefreshCw
                    className={cn(
                      "w-4 h-4 transition-transform duration-700",
                      (isRefreshing || loading) && "animate-spin text-fairway-600"
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Refresh
              </TooltipContent>
            </Tooltip>

            {/* Segmented View Switcher (Desktop Only) */}
            <div className="hidden sm:flex items-center h-9 bg-white dark:bg-[#11161d] border border-border rounded-button overflow-hidden shadow-2xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "w-9 h-full flex items-center justify-center transition-all cursor-pointer",
                      viewMode === 'table'
                        ? "bg-fairway-600 text-white font-bold"
                        : "text-foreground hover:text-foreground hover:bg-surface-muted/60"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  List
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "w-9 h-full flex items-center justify-center transition-all cursor-pointer",
                      viewMode === 'grid'
                        ? "bg-fairway-600 text-white font-bold"
                        : "text-foreground hover:text-foreground hover:bg-surface-muted/60"
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Card
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* 4. Content Area */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-surface border border-border rounded-card">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading stakeholder directory...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-surface border border-border rounded-card p-6 shadow-subtle">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-muted-foreground flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No contacts found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {search || activeFiltersCount > 0
              ? 'Try adjusting your search criteria or clear active filters.'
              : 'Get started by adding your first enterprise contact stakeholder.'}
          </p>
          {(search || activeFiltersCount > 0) && (
            <Button size="sm" variant="outline" onClick={resetFilters} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile view: ONLY Card View show, NOT list page show */}
          <div className="block sm:hidden">
            <ContactsCard
              contacts={filteredContacts}
              onSelectCompany={onSelectCompany}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          </div>

          {/* Desktop view: Respects user viewMode (List vs Card) */}
          <div className="hidden sm:block">
            {viewMode === 'table' ? (
              <ContactsList
                contacts={filteredContacts}
                columns={columns}
                onSelectCompany={onSelectCompany}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            ) : (
              <ContactsCard
                contacts={filteredContacts}
                onSelectCompany={onSelectCompany}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        </>
      )}

      {/* Advanced Filters Drawer (Right Slide-out) */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-end animate-fade-in select-none overflow-hidden m-0 p-0">
          <div
            className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          <div className="relative w-full max-w-full sm:max-w-sm bg-surface border-l border-border h-full shadow-2xl flex flex-col z-10 animate-slide-left outline-none text-left">
            <div className="p-5 border-b border-border bg-surface flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-fairway-600" />
                  <span>Contact Filters</span>
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Filter stakeholders by department and company
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Department</label>
                <Combobox
                  options={departmentOptions}
                  value={draftDepartment}
                  onChange={setDraftDepartment}
                  placeholder="Select department..."
                  searchPlaceholder="Search department..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Connected Company</label>
                <Combobox
                  options={companyOptions}
                  value={draftCompanyId}
                  onChange={setDraftCompanyId}
                  placeholder="Select company..."
                  searchPlaceholder="Search company..."
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={draftPrimaryOnly}
                    onChange={(e) => setDraftPrimaryOnly(e.target.checked)}
                    className="w-4 h-4 text-fairway-600 rounded border-border"
                  />
                  <span>Primary Liaisons Only</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-surface flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 py-2.5 px-4 rounded-button border text-xs font-bold transition-all text-center bg-surface hover:bg-surface-muted border-border text-foreground cursor-pointer shadow-2xs"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 py-2.5 px-4 rounded-button bg-fairway-600 hover:bg-fairway-700 text-white text-xs font-bold transition-all text-center shadow-xs cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Contact Modal with Combobox */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContact ? 'Edit Key Stakeholder' : 'Register New Stakeholder'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Associated Company *
            </label>
            <Combobox
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              value={formData.companyId}
              onChange={(val) => setFormData({ ...formData, companyId: val })}
              placeholder="Select company..."
              searchPlaceholder="Search company..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <Input
                placeholder="e.g. Rajesh Patel"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Designation / Title
              </label>
              <Input
                placeholder="e.g. VP Supply Chain & Logistics"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Department
              </label>
              <Combobox
                options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
                value={formData.department}
                onChange={(val) => setFormData({ ...formData, department: val })}
                placeholder="Select department..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Direct Mobile Phone
              </label>
              <Input
                placeholder="+91 98250 12345"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Official Email
              </label>
              <Input
                type="email"
                placeholder="rajesh.patel@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                LinkedIn Profile URL
              </label>
              <Input
                placeholder="https://linkedin.com/in/..."
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={formData.isPrimary}
                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                className="w-4 h-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
              />
              <span>Designate as Primary Company Account Stakeholder</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Internal Operational Notes
            </label>
            <Textarea
              rows={2}
              placeholder="e.g. Primary decision maker for logistics warehousing across Western India..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex flex-col-reverse xs:flex-row xs:items-center xs:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-border w-full">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="w-full xs:w-auto">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={formSubmitting} className="w-full xs:w-auto">
              {formSubmitting ? 'Saving...' : editingContact ? 'Save Changes' : 'Register Stakeholder'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ContactsPage;
