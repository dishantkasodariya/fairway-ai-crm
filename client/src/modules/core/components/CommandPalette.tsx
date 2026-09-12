import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Building2,
  FileText,
  User,
  Warehouse,
  Factory,
  ArrowRight,
  X,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { formatSqFt } from '@/modules/core/utils/formatters';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'company' | 'inquiry' | 'contact' | 'property' | 'facility', id: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Focus input when opened and reset when closed
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global Escape key listener - closes modal reliably from anywhere
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown, true);
    return () => window.removeEventListener('keydown', handleWindowKeyDown, true);
  }, [isOpen, onClose]);

  const companies = StorageService.getCompanies();
  const inquiries = StorageService.getInquiries();
  const contacts = StorageService.getContacts();
  const properties = StorageService.getProperties();
  const facilities = StorageService.getFacilities();

  const q = query.trim().toLowerCase();

  const filteredInquiries = q
    ? inquiries
        .filter(
          (i) =>
            i.inquiryNumber.toLowerCase().includes(q) ||
            i.companyName.toLowerCase().includes(q) ||
            i.location.toLowerCase().includes(q) ||
            i.requirement.toLowerCase().includes(q)
        )
        .slice(0, 5)
    : inquiries.slice(0, 3);

  const filteredCompanies = q
    ? companies
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.industry.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q)
        )
        .slice(0, 5)
    : companies.slice(0, 3);

  const filteredProperties = q
    ? properties
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.city.toLowerCase().includes(q) ||
            p.corridor.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : properties.slice(0, 2);

  const filteredContacts = q
    ? contacts
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.companyName.toLowerCase().includes(q) ||
            c.designation.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const filteredFacilities = q
    ? facilities
        .filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.companyName.toLowerCase().includes(q) ||
            f.city.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  // Flatten all filtered items for unified keyboard navigation
  const flatList = [
    ...filteredInquiries.map((i) => ({ type: 'inquiry' as const, id: i.id, targetId: i.id, key: `inq-${i.id}` })),
    ...filteredCompanies.map((c) => ({ type: 'company' as const, id: c.id, targetId: c.id, key: `comp-${c.id}` })),
    ...filteredProperties.map((p) => ({ type: 'property' as const, id: p.id, targetId: p.id, key: `prop-${p.id}` })),
    ...filteredContacts.map((c) => ({ type: 'contact' as const, id: c.id, targetId: c.companyId, key: `cnt-${c.id}` })),
    ...filteredFacilities.map((f) => ({ type: 'facility' as const, id: f.id, targetId: f.companyId, key: `fac-${f.id}` })),
  ];

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatList.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % flatList.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatList.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + flatList.length) % flatList.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatList.length > 0 && flatList[selectedIndex]) {
        const item = flatList[selectedIndex];
        onSelect(item.type, item.targetId);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const hasResults = flatList.length > 0;
  let runningIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-150"
        onClick={onClose}
      />

      {/* shadcn Command Dialog Box */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl z-10 flex flex-col max-h-[80vh] animate-in fade-in-0 zoom-in-95 duration-150 text-left">
        {/* Command Input Bar */}
        <div className="flex items-center border-b border-border px-4" cmdk-input-wrapper="">
          <Search className="mr-3 h-4 w-4 shrink-0 text-foreground-muted opacity-70" />
          <input
            ref={inputRef}
            type="text"
            cmdk-input=""
            data-transparent="true"
            placeholder="Search companies, inquiries, properties, contacts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              backgroundColor: 'transparent',
              background: 'transparent',
              border: 'none',
              borderRadius: '0px',
              boxShadow: 'none',
              outline: 'none',
            }}
            className="cmdk-input flex-1 h-12 w-full !bg-transparent py-3 text-sm text-foreground placeholder:text-foreground-muted/70 !border-0 !border-none !outline-none focus:!outline-none !shadow-none !rounded-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-foreground-muted hover:text-foreground rounded transition-colors mr-2 cursor-pointer"
              title="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-surface-muted px-1.5 font-mono text-[10px] font-medium text-foreground-muted hover:text-foreground transition-colors cursor-pointer shrink-0 ml-1"
            title="Close dialog (Escape)"
          >
            <span>ESC</span>
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Command List Body */}
        <div className="overflow-y-auto max-h-[380px] p-2 space-y-2 flex-1 scrollbar-thin">
          {!hasResults && (
            <div className="py-10 text-center text-sm text-foreground-muted">
              No results found.
            </div>
          )}

          {/* Inquiries Group */}
          {filteredInquiries.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted/70">
                Inquiries / Leads
              </div>
              <div className="space-y-0.5 mt-0.5">
                {filteredInquiries.map((inq) => {
                  const currentIndex = runningIndex++;
                  const isSelected = selectedIndex === currentIndex;

                  return (
                    <div
                      key={inq.id}
                      ref={(el) => (itemRefs.current[currentIndex] = el)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      onClick={() => {
                        onSelect('inquiry', inq.id);
                        onClose();
                      }}
                      className={`relative flex items-center justify-between rounded-lg px-2.5 py-2 text-sm cursor-pointer select-none transition-colors gap-2 ${
                        isSelected
                          ? 'bg-surface-muted text-foreground'
                          : 'text-foreground hover:bg-surface-muted/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FileText className="h-4 w-4 shrink-0 text-foreground-muted" />
                        <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-surface border border-border shrink-0">
                          {inq.inquiryNumber}
                        </span>
                        <div className="truncate min-w-0 flex-1 flex items-baseline gap-1.5">
                          <span className="font-medium text-foreground truncate">{inq.companyName}</span>
                          <span className="text-xs text-foreground-muted truncate">
                            · {formatSqFt(inq.requiredAreaSqFt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize text-foreground-muted bg-surface border border-border whitespace-nowrap">
                          {inq.stage.replace(/_/g, ' ')}
                        </span>
                        {isSelected && (
                          <ArrowRight className="h-3.5 w-3.5 text-foreground-muted shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Companies Group */}
          {filteredCompanies.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted/70">
                Companies
              </div>
              <div className="space-y-0.5 mt-0.5">
                {filteredCompanies.map((c) => {
                  const currentIndex = runningIndex++;
                  const isSelected = selectedIndex === currentIndex;

                  return (
                    <div
                      key={c.id}
                      ref={(el) => (itemRefs.current[currentIndex] = el)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      onClick={() => {
                        onSelect('company', c.id);
                        onClose();
                      }}
                      className={`relative flex items-center justify-between rounded-lg px-2.5 py-2 text-sm cursor-pointer select-none transition-colors gap-2 ${
                        isSelected
                          ? 'bg-surface-muted text-foreground'
                          : 'text-foreground hover:bg-surface-muted/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Building2 className="h-4 w-4 shrink-0 text-foreground-muted" />
                        <span className="font-medium text-foreground truncate">{c.name}</span>
                        <span className="text-xs text-foreground-muted truncate">
                          · {c.industry || c.city}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.assignedOwnerName && (
                          <span className="text-[11px] text-foreground-muted hidden sm:inline">
                            {c.assignedOwnerName}
                          </span>
                        )}
                        {isSelected && (
                          <ArrowRight className="h-3.5 w-3.5 text-foreground-muted shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Properties Group */}
          {filteredProperties.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted/70">
                Properties
              </div>
              <div className="space-y-0.5 mt-0.5">
                {filteredProperties.map((p) => {
                  const currentIndex = runningIndex++;
                  const isSelected = selectedIndex === currentIndex;

                  return (
                    <div
                      key={p.id}
                      ref={(el) => (itemRefs.current[currentIndex] = el)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      onClick={() => {
                        onSelect('property', p.id);
                        onClose();
                      }}
                      className={`relative flex items-center justify-between rounded-lg px-2.5 py-2 text-sm cursor-pointer select-none transition-colors gap-2 ${
                        isSelected
                          ? 'bg-surface-muted text-foreground'
                          : 'text-foreground hover:bg-surface-muted/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Warehouse className="h-4 w-4 shrink-0 text-foreground-muted" />
                        <span className="font-medium text-foreground truncate">{p.name}</span>
                        <span className="text-xs text-foreground-muted truncate">
                          · {formatSqFt(p.availableAreaSqFt)} · {p.city}
                        </span>
                      </div>
                      {isSelected && (
                        <ArrowRight className="h-3.5 w-3.5 text-foreground-muted shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contacts Group */}
          {filteredContacts.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted/70">
                Contacts
              </div>
              <div className="space-y-0.5 mt-0.5">
                {filteredContacts.map((cnt) => {
                  const currentIndex = runningIndex++;
                  const isSelected = selectedIndex === currentIndex;

                  return (
                    <div
                      key={cnt.id}
                      ref={(el) => (itemRefs.current[currentIndex] = el)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      onClick={() => {
                        onSelect('contact', cnt.companyId);
                        onClose();
                      }}
                      className={`relative flex items-center justify-between rounded-lg px-2.5 py-2 text-sm cursor-pointer select-none transition-colors gap-2 ${
                        isSelected
                          ? 'bg-surface-muted text-foreground'
                          : 'text-foreground hover:bg-surface-muted/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <User className="h-4 w-4 shrink-0 text-foreground-muted" />
                        <span className="font-medium text-foreground truncate">{cnt.name}</span>
                        <span className="text-xs text-foreground-muted truncate">
                          · {cnt.designation || cnt.companyName}
                        </span>
                      </div>
                      {isSelected && (
                        <ArrowRight className="h-3.5 w-3.5 text-foreground-muted shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Facilities Group */}
          {filteredFacilities.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted/70">
                Facilities
              </div>
              <div className="space-y-0.5 mt-0.5">
                {filteredFacilities.map((fac) => {
                  const currentIndex = runningIndex++;
                  const isSelected = selectedIndex === currentIndex;

                  return (
                    <div
                      key={fac.id}
                      ref={(el) => (itemRefs.current[currentIndex] = el)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      onClick={() => {
                        onSelect('facility', fac.companyId);
                        onClose();
                      }}
                      className={`relative flex items-center justify-between rounded-lg px-2.5 py-2 text-sm cursor-pointer select-none transition-colors gap-2 ${
                        isSelected
                          ? 'bg-surface-muted text-foreground'
                          : 'text-foreground hover:bg-surface-muted/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Factory className="h-4 w-4 shrink-0 text-foreground-muted" />
                        <span className="font-medium text-foreground truncate">{fac.name}</span>
                        <span className="text-xs text-foreground-muted truncate">
                          · {fac.city || fac.companyName}
                        </span>
                      </div>
                      {isSelected && (
                        <ArrowRight className="h-3.5 w-3.5 text-foreground-muted shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Clean shadcn Command Footer */}
        <div className="flex items-center justify-between border-t border-border px-3.5 py-2 text-[11px] text-foreground-muted bg-surface-muted/20">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-surface px-1 py-0.2 font-mono text-[10px]">↑</kbd>
              <kbd className="rounded border border-border bg-surface px-1 py-0.2 font-mono text-[10px]">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="text-foreground-muted/40">•</span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.2 font-mono text-[10px]">↵</kbd>
              <span>Select</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <span>Close</span>
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.2 font-mono text-[10px]">ESC</kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
