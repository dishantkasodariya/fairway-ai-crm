import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import ContactService from '@/modules/core/services/contactService';
import CompanyService from '@/modules/core/services/companyService';
import { Contact, Company } from '@/modules/core/types';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Button } from '@/modules/core/components/ui/Button';
import { Card } from '@/modules/core/components/ui/Card';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Input, Select, Textarea } from '@/modules/core/components/ui/Input';

interface ContactsPageProps {
  onSelectCompany?: (companyId: string) => void;
  onOpenNewInquiry?: (companyId?: string) => void;
}

export const ContactsPage: React.FC<ContactsPageProps> = ({ onSelectCompany }) => {
  const { success, error } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [primaryOnly, setPrimaryOnly] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    companyId: '',
    companyName: '',
    name: '',
    designation: '',
    department: 'Supply Chain',
    phone: '',
    email: '',
    linkedinUrl: '',
    isPrimary: false,
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactRes, compRes] = await Promise.all([
        ContactService.getContacts(),
        CompanyService.getCompanies({ pageSize: 100 }),
      ]);

      if (contactRes.success && contactRes.data) {
        setContacts(contactRes.data);
      }
      if (compRes.success && compRes.data) {
        setCompanies(compRes.data);
      }
    } catch (err: any) {
      error('Failed to load contacts', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.designation?.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);

    const matchesDept = selectedDepartment === 'all' || c.department === selectedDepartment;
    const matchesCompany = selectedCompanyId === 'all' || c.companyId === selectedCompanyId;
    const matchesPrimary = !primaryOnly || c.isPrimary;

    return matchesSearch && matchesDept && matchesCompany && matchesPrimary;
  });

  // KPI calculations
  const totalContacts = contacts.length;
  const primaryContacts = contacts.filter((c) => c.isPrimary).length;
  const decisionMakers = contacts.filter((c) =>
    ['VP', 'Director', 'Head', 'CEO', 'COO', 'Chief', 'General Manager'].some((role) =>
      c.designation?.toLowerCase().includes(role.toLowerCase())
    )
  ).length;
  const companiesCount = new Set(contacts.map((c) => c.companyId).filter(Boolean)).size;

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({
      companyId: companies[0]?.id || '',
      companyName: companies[0]?.name || '',
      name: '',
      designation: '',
      department: 'Supply Chain',
      phone: '',
      email: '',
      linkedinUrl: '',
      isPrimary: false,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Contact) => {
    setEditingContact(c);
    setFormData({
      companyId: c.companyId,
      companyName: c.companyName || '',
      name: c.name,
      designation: c.designation || '',
      department: c.department || 'Supply Chain',
      phone: c.phone || '',
      email: c.email || '',
      linkedinUrl: c.linkedinUrl || '',
      isPrimary: Boolean(c.isPrimary),
      notes: c.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete stakeholder ${name}?`)) return;
    try {
      const res = await ContactService.deleteContact(id);
      if (res.success) {
        success('Contact Deleted', `Removed ${name} from records.`);
        loadData();
      } else {
        error('Delete Failed', res.error || 'Unable to delete contact');
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.companyId) {
      error('Validation Error', 'Contact name and target company are required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const targetComp = companies.find((comp) => comp.id === formData.companyId);
      const res = await ContactService.createContact({
        ...formData,
        companyName: targetComp?.name || formData.companyName,
      });

      if (res.success) {
        success('Contact Saved', `Successfully registered ${formData.name}.`);
        setIsModalOpen(false);
        loadData();
      } else {
        error('Save Failed', res.error || 'Could not save contact.');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left">
      {/* 1. Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary" />
            <span>Contacts & Key Stakeholders</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise decision-makers, industrial supply chain leads, and warehouse operational heads across Gujarat & Western India.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleOpenAdd} className="gap-2 shadow-sm font-medium">
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-border/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Contacts</span>
            <span className="p-2 rounded-lg bg-orange-50 text-primary">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{totalContacts}</span>
            <span className="text-xs text-muted-foreground">in database</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-border/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decision Makers</span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{decisionMakers}</span>
            <span className="text-xs text-muted-foreground">C-Level / VP / Directors</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-border/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Liaisons</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Star className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{primaryContacts}</span>
            <span className="text-xs text-muted-foreground">Account heads</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-border/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Companies Connected</span>
            <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{companiesCount}</span>
            <span className="text-xs text-muted-foreground">industrial firms</span>
          </div>
        </Card>
      </div>

      {/* 3. Search & Advanced Filter Bar */}
      <Card className="p-4 bg-white border border-border/80 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by contact name, designation, company, phone or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 bg-slate-50/50 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:border-primary"
            >
              <option value="all">All Departments</option>
              <option value="Supply Chain">Supply Chain</option>
              <option value="Logistics & Warehousing">Logistics & Warehousing</option>
              <option value="Real Estate & Infrastructure">Real Estate & Infrastructure</option>
              <option value="Executive Leadership">Executive Leadership</option>
              <option value="Plant Operations">Plant Operations</option>
              <option value="Procurement">Procurement</option>
            </select>

            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-2 bg-slate-50/50 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:border-primary max-w-[180px] truncate"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setPrimaryOnly((prev) => !prev)}
              className={`px-3 py-2 border rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                primaryOnly
                  ? 'bg-primary text-white border-primary'
                  : 'bg-slate-50 text-slate-700 border-border hover:bg-slate-100'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Primary Only</span>
            </button>
          </div>
        </div>
      </Card>

      {/* 4. Table / Data View */}
      <Card className="bg-white border border-border/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading stakeholder directory...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-muted-foreground flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No contacts found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {search || selectedDepartment !== 'all' || selectedCompanyId !== 'all'
                ? 'Try adjusting your search criteria or clear active filters.'
                : 'Get started by adding your first enterprise contact stakeholder.'}
            </p>
            <Button size="sm" onClick={handleOpenAdd} className="mt-2 gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Add First Contact</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredContacts.map((c) => {
                  const isDecisionMaker = ['VP', 'Director', 'Head', 'CEO', 'COO', 'Chief', 'General Manager'].some(
                    (role) => c.designation?.toLowerCase().includes(role.toLowerCase())
                  );

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Name & Primary badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              <span>{c.name}</span>
                              {c.isPrimary && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  PRIMARY
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-medium">{c.designation || 'Operational Liaison'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="py-3.5 px-4">
                        {c.companyId ? (
                          <button
                            onClick={() => onSelectCompany && onSelectCompany(c.companyId)}
                            className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5 text-left"
                          >
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[200px]">{c.companyName || 'Enterprise Account'}</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">Unassigned</span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {c.department || 'Supply Chain'}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4">
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            className="text-foreground hover:text-primary font-mono text-xs flex items-center gap-1.5"
                          >
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span>{c.phone}</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4">
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            className="text-foreground hover:text-primary text-xs flex items-center gap-1.5 truncate max-w-[190px]"
                          >
                            <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Decision Maker badge */}
                      <td className="py-3.5 px-4 text-center">
                        {isDecisionMaker ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Key Decider</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Coordinator</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(c)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(c.id, c.name)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 5. Add / Edit Contact Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContact ? 'Edit Key Contact' : 'Register New Stakeholder'}
        description="Add operational supply chain heads, decision-makers, and facility coordinators."
      >
        <form onSubmit={handleSaveContact} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Associated Company *
            </label>
            <select
              value={formData.companyId}
              onChange={(e) => {
                const comp = companies.find((c) => c.id === e.target.value);
                setFormData({
                  ...formData,
                  companyId: e.target.value,
                  companyName: comp?.name || '',
                });
              }}
              required
              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="" disabled>
                Select Company Account
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city || 'Gujarat'})
                </option>
              ))}
            </select>
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
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="Supply Chain">Supply Chain</option>
                <option value="Logistics & Warehousing">Logistics & Warehousing</option>
                <option value="Real Estate & Infrastructure">Real Estate & Infrastructure</option>
                <option value="Executive Leadership">Executive Leadership</option>
                <option value="Plant Operations">Plant Operations</option>
                <option value="Procurement">Procurement</option>
              </select>
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
                className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
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
              placeholder="Prefers WhatsApp updates, structural decisions require board signoff..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formSubmitting} className="gap-2">
              {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              <span>{editingContact ? 'Update Contact' : 'Save Contact'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ContactsPage;
