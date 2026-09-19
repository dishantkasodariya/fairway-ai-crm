import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/modules/core/components/ui/Modal';
import { Button } from '@/modules/core/components/ui/Button';
import { Textarea, Input } from '@/modules/core/components/ui/Input';
import { Combobox, ComboboxOption } from '@/modules/core/components/ui/combobox-1';
import { DatePicker } from '@/modules/core/components/ui/DatePicker';
import { CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { PropertyService } from '@/modules/core/services/propertyService';
import confetti from 'canvas-confetti';

export interface WonCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryNumber: string;
  companyName: string;
  defaultPropertyId?: string;
  defaultMonthlyRent?: number;
  onConfirm: (data: {
    wonPropertyId: string;
    wonPropertyName: string;
    wonFinalValueMonthlyINR: number;
    wonComments: string;
    wonDate: string;
  }) => void;
}

interface ActivePropertyItem {
  id: string;
  name: string;
  city: string;
  corridor?: string;
  availableAreaSqFt?: number;
}

export const WonCelebrationModal: React.FC<WonCelebrationModalProps> = ({
  isOpen,
  onClose,
  inquiryNumber,
  companyName,
  defaultPropertyId,
  defaultMonthlyRent = 1500000,
  onConfirm,
}) => {
  const [properties, setProperties] = useState<ActivePropertyItem[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [propertyId, setPropertyId] = useState(defaultPropertyId || '');
  const [monthlyValue, setMonthlyValue] = useState(defaultMonthlyRent ? defaultMonthlyRent.toString() : '');
  const [wonDate, setWonDate] = useState(new Date().toISOString().split('T')[0]);
  const [comments, setComments] = useState('');

  // Fetch properties dynamically from backend whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingProperties(true);

    const loadProperties = async () => {
      try {
        // Try dedicated active dropdown endpoint first
        const res = await PropertyService.getActivePropertiesDropdown();
        if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const items: ActivePropertyItem[] = res.data.map((p) => ({
            id: p.id,
            name: p.name,
            city: p.city,
            corridor: p.corridor,
            availableAreaSqFt: p.availableAreaSqFt,
          }));
          setProperties(items);
          if (!propertyId || !items.some((p) => p.id === propertyId)) {
            setPropertyId(defaultPropertyId && items.some((p) => p.id === defaultPropertyId) ? defaultPropertyId : items[0].id);
          }
          return;
        }

        // Fallback to general getProperties if needed
        const fullRes = await PropertyService.getProperties();
        if (isMounted && fullRes.success && Array.isArray(fullRes.data) && fullRes.data.length > 0) {
          const items: ActivePropertyItem[] = fullRes.data.map((p) => ({
            id: p.id,
            name: p.name,
            city: p.city,
            corridor: p.corridor,
            availableAreaSqFt: p.availableAreaSqFt,
          }));
          setProperties(items);
          if (!propertyId || !items.some((p) => p.id === propertyId)) {
            setPropertyId(defaultPropertyId && items.some((p) => p.id === defaultPropertyId) ? defaultPropertyId : items[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic properties:', err);
      } finally {
        if (isMounted) setIsLoadingProperties(false);
      }
    };

    loadProperties();

    // Reset default rent if provided
    if (defaultMonthlyRent) {
      setMonthlyValue(defaultMonthlyRent.toString());
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, defaultPropertyId, defaultMonthlyRent]);

  // Real-time Searchable Combobox options for warehouse properties
  const propertyComboboxOptions: ComboboxOption[] = useMemo(() => {
    return properties.map((p) => ({
      value: p.id,
      label: p.name,
      description: `${p.corridor || p.city || 'Gujarat'} • ${
        p.availableAreaSqFt
          ? Number(p.availableAreaSqFt).toLocaleString('en-IN') + ' sq.ft available'
          : p.city
      }`,
      icon: <Building2 className="w-4 h-4 text-foreground-muted shrink-0" />,
    }));
  }, [properties]);

  // Confetti burst on modal opening
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EB661F', '#F59E0B', '#3B82F6', '#10B981'],
      });
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedProp = properties.find((p) => p.id === propertyId);
    onConfirm({
      wonPropertyId: propertyId,
      wonPropertyName: selectedProp?.name || 'Fairway Logistics Park',
      wonFinalValueMonthlyINR: parseFloat(monthlyValue) || defaultMonthlyRent,
      wonComments: comments.trim() || 'Commercial agreement executed. Handover process initiated.',
      wonDate,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-foreground font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>Mark Opportunity as Won</span>
        </div>
      }
      description={`Finalize commercial lease agreement for ${inquiryNumber} (${companyName})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="p-3 bg-surface-muted/60 border border-border rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface border border-border text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <h4 className="text-xs font-bold text-foreground">Deal Conversion Record</h4>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Confirm final commercial lease terms to update warehouse property occupancy and revenue pipeline.
            </p>
          </div>
        </div>

        {/* Real-Time Searchable Combobox for Warehouse Properties */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <span>Contracted Warehouse Property</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            {isLoadingProperties && (
              <span className="text-[11px] text-foreground-muted flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                Loading properties...
              </span>
            )}
          </div>

          <Combobox
            options={propertyComboboxOptions}
            value={propertyId}
            onChange={(val) => setPropertyId(val)}
            placeholder={isLoadingProperties ? 'Loading warehouse properties...' : 'Search and select contracted property...'}
            searchPlaceholder="Search property by name, corridor, city..."
            disabled={isLoadingProperties || properties.length === 0}
            className="h-10 text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="number"
            label="Final Monthly Rent (INR)"
            value={monthlyValue}
            onChange={(e) => setMonthlyValue(e.target.value)}
            required
            min={1}
          />
          <DatePicker
            label="Execution / LOI Date"
            value={wonDate}
            onChange={(dateStr) => setWonDate(dateStr)}
            placeholder="Select date"
          />
        </div>

        <Textarea
          label="Commercial Highlights & Handover Notes"
          placeholder="e.g. 5-year lease executed with 3-year lock-in. Fit-outs start next week..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl px-4 h-9 font-medium">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isLoadingProperties || !propertyId}
            leftIcon={<CheckCircle2 className="w-4 h-4 shrink-0" />}
            className="rounded-xl px-4 h-9 font-bold shadow-xs"
          >
            Confirm Deal Won
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default WonCelebrationModal;
