import React, { useState, useEffect } from 'react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { Input, Select, Textarea } from '@/modules/core/components/ui/Input';
import { StorageService } from '@/modules/core/services/storageService';
import { CompanyService } from '@/modules/core/services/companyService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { UserCombobox } from '@/modules/core/components/ui/UserCombobox';
import { Company, PriorityLevel } from '@/modules/core/types';
import { Building2, AlertTriangle, Edit3 } from 'lucide-react';

export interface NewCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (companyId: string) => void;
  companyToEdit?: Company | null;
}

export const NewCompanyModal: React.FC<NewCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companyToEdit,
}) => {
  const { currentUser, users } = useAuth();
  const { success, error } = useToast();

  const isEditing = !!companyToEdit;

  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    website: '',
    industry: 'Specialty Chemicals & Polymers',
    address: '',
    city: 'Dahej',
    state: 'Gujarat',
    pincode: '392130',
    phone: '',
    email: '',
    assignedOwnerId: currentUser.id,
    prospectStage: 'New',
    priority: 'High' as PriorityLevel,
    annualTurnover: '₹500+ Cr',
    employeeCount: '1,000+',
    gujaratPresence: true,
  });

  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (companyToEdit) {
      setFormData({
        name: companyToEdit.name || '',
        legalName: companyToEdit.legalName || '',
        website: companyToEdit.website || '',
        industry: companyToEdit.industry || 'Specialty Chemicals & Polymers',
        address: companyToEdit.address || '',
        city: companyToEdit.city || 'Dahej',
        state: companyToEdit.state || 'Gujarat',
        pincode: companyToEdit.pincode || '392130',
        phone: companyToEdit.phone || '',
        email: companyToEdit.email || '',
        assignedOwnerId: companyToEdit.assignedOwnerId || currentUser.id,
        prospectStage: companyToEdit.prospectStage || 'New',
        priority: (companyToEdit.priority as PriorityLevel) || 'High',
        annualTurnover: companyToEdit.annualTurnover || '₹500+ Cr',
        employeeCount: companyToEdit.employeeCount || '1,000+',
        gujaratPresence: companyToEdit.gujaratPresence ?? true,
      });
      setDuplicates([]);
    } else {
      setFormData({
        name: '',
        legalName: '',
        website: '',
        industry: 'Specialty Chemicals & Polymers',
        address: '',
        city: 'Dahej',
        state: 'Gujarat',
        pincode: '392130',
        phone: '',
        email: '',
        assignedOwnerId: currentUser.id,
        prospectStage: 'New',
        priority: 'High' as PriorityLevel,
        annualTurnover: '₹500+ Cr',
        employeeCount: '1,000+',
        gujaratPresence: true,
      });
      setDuplicates([]);
    }
  }, [companyToEdit, isOpen, currentUser]);

  const handleNameChange = async (name: string) => {
    setFormData((prev) => ({ ...prev, name, legalName: prev.legalName || `${name} Private Limited` }));
    if (!isEditing && name.trim().length > 2) {
      try {
        const res = await CompanyService.checkDuplicates(name);
        if (res.success && res.duplicates && res.duplicates.length > 0) {
          setDuplicates(res.duplicates);
        } else {
          const localDupes = StorageService.checkCompanyDuplicates(name);
          setDuplicates(localDupes);
        }
      } catch {
        const localDupes = StorageService.checkCompanyDuplicates(name);
        setDuplicates(localDupes);
      }
    } else {
      setDuplicates([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      error('Validation Error', 'Company brand name is required.');
      return;
    }

    const owner = users.find((u) => u.id === formData.assignedOwnerId) || currentUser;

    setIsSubmitting(true);
    try {
      if (isEditing && companyToEdit) {
        // Edit mode
        await CompanyService.updateCompany(companyToEdit.id, {
          ...formData,
          assignedOwnerName: owner.name,
        });

        StorageService.updateCompany(companyToEdit.id, {
          ...formData,
          assignedOwnerName: owner.name,
        });

        success('Company Updated', `Saved changes for ${formData.name}.`);
        onClose();
        onSuccess(companyToEdit.id);
      } else {
        // Create mode
        const res = await CompanyService.createCompany({
          ...formData,
          status: 'Active',
          assignedOwnerName: owner.name,
        });

        if (res.success && res.data) {
          try {
            StorageService.createCompany({
              ...formData,
              status: 'Active',
              assignedOwnerName: owner.name,
            });
          } catch {}

          success('Company Created', `Registered ${res.data.name} in CRM.`);
          onClose();
          onSuccess(res.data.id);
        } else {
          const localCompany = StorageService.createCompany({
            ...formData,
            status: 'Active',
            assignedOwnerName: owner.name,
          });
          success('Company Created', `Registered ${localCompany.name} in CRM.`);
          onClose();
          onSuccess(localCompany.id);
        }
      }
    } catch (err: any) {
      error(isEditing ? 'Update Failed' : 'Creation Failed', err.message || 'Failed to save company');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2 text-foreground font-bold">
          {isEditing ? <Edit3 className="w-5 h-5 text-fairway-600" /> : <Building2 className="w-5 h-5 text-fairway-600" />}
          <span>{isEditing ? `Edit Company: ${companyToEdit?.name}` : 'Add New Industrial Company'}</span>
        </div>
      }
      description={isEditing ? 'Modify account profile, contact details, and tier' : 'Register a new top-level corporate account'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-left">
        <Input
          label="Company Brand Name"
          placeholder="e.g. Reliance Petrochemicals"
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />

        {/* Duplicate Warning */}
        {duplicates.length > 0 && !isEditing && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 rounded-lg text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Duplicate Warning: {duplicates.length} matching company exists</span>
            </div>
            <p className="text-[11px]">
              Found: {duplicates.map((d: any) => `${d.name} (${d.city || ''})`).join(', ')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Legal Entity Name"
            value={formData.legalName}
            onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
            required
          />
          <Input
            label="Website URL"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://example.com"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Industry Sector"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            options={[
              { value: 'Specialty Chemicals & Polymers', label: 'Specialty Chemicals & Polymers' },
              { value: 'Heavy Engineering & Fabrication', label: 'Heavy Engineering & Fabrication' },
              { value: 'Pharma & Life Sciences', label: 'Pharma & Life Sciences' },
              { value: 'Automotive & EV Ancillaries', label: 'Automotive & EV Ancillaries' },
              { value: 'Renewables & Green Energy', label: 'Renewables & Green Energy' },
              { value: 'Logistics & 3PL Warehousing', label: 'Logistics & 3PL Warehousing' },
              { value: 'Agro & Food Processing', label: 'Agro & Food Processing' },
              { value: 'General Industrial', label: 'General Industrial' },
            ]}
          />
          <Select
            label="Target Hub / City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            options={[
              { value: 'Dahej', label: 'Dahej PCPIR' },
              { value: 'Sanand', label: 'Sanand Auto Hub' },
              { value: 'Changodar', label: 'Changodar Industrial Zone' },
              { value: 'Hazira', label: 'Hazira Port Corridor' },
              { value: 'Ankleshwar', label: 'Ankleshwar GIDC' },
              { value: 'Jhagadia', label: 'Jhagadia Mega Estate' },
              { value: 'Halol', label: 'Halol Manufacturing Belt' },
              { value: 'Vapi', label: 'Vapi Chemical Hub' },
              { value: 'Surat', label: 'Surat Logistics Corridor' },
              { value: 'Ahmedabad', label: 'Ahmedabad Ring Road' },
            ]}
          />
        </div>

        <Textarea
          label="Registered Industrial Address"
          rows={2}
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Plot No, GIDC Phase, Landmark..."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Official Phone / Landline"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+91 2642 XXXXXX"
          />
          <Input
            label="Corporate Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="corporate@company.com"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
          <UserCombobox
            label="Account Owner"
            users={users}
            value={formData.assignedOwnerId}
            onChange={(val) => setFormData({ ...formData, assignedOwnerId: val })}
            placeholder="Select owner..."
          />
          <Select
            label="Prospect Stage"
            value={formData.prospectStage}
            onChange={(e) => setFormData({ ...formData, prospectStage: e.target.value })}
            options={[
              { value: 'New', label: 'New Lead' },
              { value: 'Requirement Confirmed', label: 'Requirement Confirmed' },
              { value: 'Site Visit Planned', label: 'Site Visit Planned' },
              { value: 'Proposal Submitted', label: 'Proposal Submitted' },
              { value: 'Active Client', label: 'Active Client' },
            ]}
          />
          <Select
            label="Priority Tier"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as PriorityLevel })}
            options={[
              { value: 'High', label: '🔴 High Priority' },
              { value: 'Medium', label: '🟡 Medium Priority' },
              { value: 'Low', label: '⚪ Low Priority' },
            ]}
          />
        </div>

        <div className="flex flex-col-reverse xs:flex-row xs:items-center xs:justify-end gap-2.5 pt-4 border-t border-border w-full">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="w-full xs:w-auto">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="w-full xs:w-auto">
            {isSubmitting ? (isEditing ? 'Saving Changes...' : 'Creating Company...') : (isEditing ? 'Save Changes' : 'Create Company')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
