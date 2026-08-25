import React, { useState } from 'react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { Input, Select, Textarea } from '@/modules/core/components/ui/Input';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { useToast } from '@/modules/core/providers/ToastContext';
import { Company, PriorityLevel } from '@/modules/core/types';
import { Building2, AlertTriangle } from 'lucide-react';

export interface NewCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (companyId: string) => void;
}

export const NewCompanyModal: React.FC<NewCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, users } = useAuth();
  const { success } = useToast();

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

  const [duplicates, setDuplicates] = useState<Company[]>([]);

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name, legalName: `${name} Private Limited` });
    if (name.length > 2) {
      const dupes = StorageService.checkCompanyDuplicates(name);
      setDuplicates(dupes);
    } else {
      setDuplicates([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const owner = users.find((u) => u.id === formData.assignedOwnerId) || currentUser;

    const company = StorageService.createCompany({
      ...formData,
      status: 'Active',
      assignedOwnerName: owner.name,
    });

    onClose();
    onSuccess(company.id);
    success('Company Created', `Registered ${company.name} in CRM.`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2 text-fairway-900">
          <Building2 className="w-5 h-5 text-fairway-600" />
          <span>Add New Industrial Company</span>
        </div>
      }
      description="Register a new top-level corporate account"
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
        {duplicates.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Duplicate Warning: {duplicates.length} matching company exists</span>
            </div>
            <p className="text-[11px]">
              Found: {duplicates.map((d) => `${d.name} (${d.city})`).join(', ')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Legal Entity Name"
            value={formData.legalName}
            onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
            required
          />
          <Input
            label="Website URL"
            placeholder="https://..."
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Industry Domain"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          >
            <option value="Specialty Chemicals & Polymers">Specialty Chemicals & Polymers</option>
            <option value="Pharmaceuticals & APIs">Pharmaceuticals & APIs</option>
            <option value="Automotive & EV Components">Automotive & EV Components</option>
            <option value="3PL & Contract Logistics">3PL & Contract Logistics</option>
            <option value="Consumer Electricals & White Goods">Consumer Electricals</option>
            <option value="FMCG & Retail Distribution">FMCG & Retail Distribution</option>
          </Select>

          <Select
            label="Lead Priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Corporate Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <Input
          label="Corporate / Registered Address"
          placeholder="Plot No., Industrial Zone..."
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
          <Input
            label="State"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          />
          <Input
            label="Pincode"
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
          />
        </div>

        <Select
          label="Assigned Lead Owner"
          value={formData.assignedOwnerId}
          onChange={(e) => setFormData({ ...formData, assignedOwnerId: e.target.value })}
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </Select>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Save Company
          </Button>
        </div>
      </form>
    </Modal>
  );
};
