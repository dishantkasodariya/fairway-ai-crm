import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, FileText, User, Warehouse, Factory, ArrowRight, X } from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { Company, Inquiry, Contact, Property, Facility } from '@/modules/core/types';
import { formatINR, formatSqFt } from '@/modules/core/utils/formatters';

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

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const companies = StorageService.getCompanies();
  const inquiries = StorageService.getInquiries();
  const contacts = StorageService.getContacts();
  const properties = StorageService.getProperties();
  const facilities = StorageService.getFacilities();

  const q = query.trim().toLowerCase();

  const filteredCompanies = q
    ? companies.filter((c) => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)).slice(0, 4)
    : companies.slice(0, 3);

  const filteredInquiries = q
    ? inquiries.filter((i) => i.inquiryNumber.toLowerCase().includes(q) || i.companyName.toLowerCase().includes(q) || i.location.toLowerCase().includes(q) || i.requirement.toLowerCase().includes(q)).slice(0, 4)
    : inquiries.slice(0, 3);

  const filteredProperties = q
    ? properties.filter((p) => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.corridor.toLowerCase().includes(q)).slice(0, 3)
    : properties.slice(0, 2);

  const filteredContacts = q
    ? contacts.filter((c) => c.name.toLowerCase().includes(q) || c.companyName.toLowerCase().includes(q) || c.designation.toLowerCase().includes(q)).slice(0, 3)
    : [];

  const filteredFacilities = q
    ? facilities.filter((f) => f.name.toLowerCase().includes(q) || f.companyName.toLowerCase().includes(q) || f.city.toLowerCase().includes(q)).slice(0, 3)
    : [];

  // Flatten all filtered results into a single indexable list for ArrowUp/Down and Enter navigation
  const flatList: Array<{
    type: 'inquiry' | 'company' | 'property' | 'contact' | 'facility';
    id: string;
    targetId: string;
    key: string;
  }> = [
    ...filteredInquiries.map((i) => ({ type: 'inquiry' as const, id: i.id, targetId: i.id, key: `inq-${i.id}` })),
    ...filteredCompanies.map((c) => ({ type: 'company' as const, id: c.id, targetId: c.id, key: `comp-${c.id}` })),
    ...filteredProperties.map((p) => ({ type: 'property' as const, id: p.id, targetId: p.id, key: `prop-${p.id}` })),
    ...filteredContacts.map((c) => ({ type: 'contact' as const, id: c.id, targetId: c.companyId, key: `cnt-${c.id}` })),
    ...filteredFacilities.map((f) => ({ type: 'facility' as const, id: f.id, targetId: f.companyId, key: `fac-${f.id}` })),
  ];

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view when selectedIndex changes
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Keyboard navigation handler (Up/Down/Enter/Escape/Ctrl+K)
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
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const hasResults = flatList.length > 0;
  let runningIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 px-3 sm:px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-surface rounded-xl border border-border shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh] animate-fade-in text-left">
        {/* Search Input Bar - Seamlessly integrated */}
        <div className="flex items-center px-3.5 sm:px-4 py-3 border-b border-border bg-surface shrink-0">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-foreground-muted mr-2.5 sm:mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search companies, inquiries, contacts, properties, corridors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-foreground-muted border-0 outline-none focus:outline-none focus:ring-0 ring-0 shadow-none p-0"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-foreground-muted hover:text-foreground mr-1.5 shrink-0 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[10px] font-semibold bg-surface-muted text-foreground-muted px-2 py-0.5 rounded border border-border shrink-0 select-none font-mono">
            ESC to close
          </span>
          <button onClick={onClose} className="sm:hidden p-1 text-foreground-muted hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-2 space-y-3.5 flex-1">
          {!hasResults && (
            <div className="py-12 text-center text-foreground-muted">
              <p className="text-sm font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs mt-1">Try searching by company name, inquiry ID, city, or corridor.</p>
            </div>
          )}

          {/* Inquiries */}
          {filteredInquiries.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-foreground-muted" />
                <span>Inquiries / Leads</span>
              </div>
              <div className="space-y-1 mt-1">
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
                      className={`flex items-center justify-between p-2.5 sm:px-3 sm:py-2 rounded-lg cursor-pointer transition-all gap-2 border ${
                        isSelected
                          ? 'bg-surface-muted border-border font-semibold shadow-2xs text-foreground ring-1 ring-border'
                          : 'hover:bg-surface-muted/60 border-transparent text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <span className={`text-[11px] sm:text-xs font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded border shrink-0 ${
                          isSelected
                            ? 'bg-fairway-50 text-fairway-800 border-fairway-200 dark:bg-fairway-950/70 dark:text-fairway-300 dark:border-fairway-800'
                            : 'bg-surface-muted text-foreground border-border'
                        }`}>
                          {inq.inquiryNumber}
                        </span>
                        <div className="truncate min-w-0 flex-1">
                          <div className="text-xs font-semibold flex items-center gap-1.5 truncate">
                            <span className="truncate text-foreground">{inq.companyName}</span>
                            <span className="text-[11px] font-normal text-foreground-muted shrink-0">· {formatSqFt(inq.requiredAreaSqFt)}</span>
                          </div>
                          <p className="text-[11px] text-foreground-muted truncate mt-0.5">{inq.requirement}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize whitespace-nowrap bg-surface-muted text-foreground-muted border border-border">
                          {inq.stage.replace(/_/g, ' ')}
                        </span>
                        <ArrowRight className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                          isSelected ? 'text-fairway-600 translate-x-0.5' : 'text-foreground-muted'
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Companies */}
          {filteredCompanies.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-foreground-muted" />
                <span>Companies</span>
              </div>
              <div className="space-y-1 mt-1">
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
                      className={`flex items-center justify-between p-2.5 sm:px-3 sm:py-2 rounded-lg cursor-pointer transition-all gap-2 border ${
                        isSelected
                          ? 'bg-surface-muted border-border font-semibold shadow-2xs text-foreground ring-1 ring-border'
                          : 'hover:bg-surface-muted/60 border-transparent text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 bg-surface-muted text-foreground border border-border">
                          {c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate min-w-0 flex-1">
                          <span className="text-xs font-semibold block truncate text-foreground">{c.name}</span>
                          <p className="text-[11px] text-foreground-muted truncate mt-0.5">{c.industry} · {c.city}, {c.state}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline-block text-[11px] text-foreground-muted">Owner: {c.assignedOwnerName}</span>
                        <ArrowRight className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                          isSelected ? 'text-fairway-600 translate-x-0.5' : 'text-foreground-muted'
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warehouse Properties */}
          {filteredProperties.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-foreground-muted" />
                <span>Warehouse Properties</span>
              </div>
              <div className="space-y-1 mt-1">
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
                      className={`flex items-center justify-between p-2.5 sm:px-3 sm:py-2 rounded-lg cursor-pointer transition-all gap-2 border ${
                        isSelected
                          ? 'bg-surface-muted border-border font-semibold shadow-2xs text-foreground ring-1 ring-border'
                          : 'hover:bg-surface-muted/60 border-transparent text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 bg-surface-muted text-foreground border border-border font-mono">
                          {p.code.split('-')[1] || p.code}
                        </div>
                        <div className="truncate min-w-0 flex-1">
                          <span className="text-xs font-semibold block truncate text-foreground">{p.name}</span>
                          <p className="text-[11px] text-foreground-muted truncate mt-0.5">
                            {formatSqFt(p.availableAreaSqFt)} avail @ ₹{p.rentPerSqFtINR}/sq.ft · {p.city}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                        isSelected ? 'text-fairway-600 translate-x-0.5' : 'text-foreground-muted'
                      }`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contacts */}
          {filteredContacts.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-foreground-muted" />
                <span>Contacts</span>
              </div>
              <div className="space-y-1 mt-1">
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
                      className={`flex items-center justify-between p-2.5 sm:px-3 sm:py-2 rounded-lg cursor-pointer transition-all gap-2 border ${
                        isSelected
                          ? 'bg-surface-muted border-border font-semibold shadow-2xs text-foreground ring-1 ring-border'
                          : 'hover:bg-surface-muted/60 border-transparent text-foreground'
                      }`}
                    >
                      <div className="truncate min-w-0 flex-1">
                        <span className="text-xs font-semibold block truncate text-foreground">{cnt.name}</span>
                        <p className="text-[11px] text-foreground-muted truncate mt-0.5">{cnt.designation} · {cnt.companyName} ({cnt.phone})</p>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-fairway-600' : 'text-foreground-muted'
                      }`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Facilities */}
          {filteredFacilities.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-foreground-muted" />
                <span>Facilities</span>
              </div>
              <div className="space-y-1 mt-1">
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
                      className={`flex items-center justify-between p-2.5 sm:px-3 sm:py-2 rounded-lg cursor-pointer transition-all gap-2 border ${
                        isSelected
                          ? 'bg-surface-muted border-border font-semibold shadow-2xs text-foreground ring-1 ring-border'
                          : 'hover:bg-surface-muted/60 border-transparent text-foreground'
                      }`}
                    >
                      <div className="truncate min-w-0 flex-1">
                        <span className="text-xs font-semibold block truncate text-foreground">{fac.name}</span>
                        <p className="text-[11px] text-foreground-muted truncate mt-0.5">
                          {fac.type} · {fac.city}, {fac.state} · {fac.companyName}
                        </p>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-fairway-600' : 'text-foreground-muted'
                      }`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Clean Enterprise Footer */}
        <div className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-surface-muted/40 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-foreground-muted shrink-0">
          <div className="flex items-center gap-3">
            <span>Navigation: <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border shadow-2xs text-foreground text-[10px]">↑</kbd> <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border shadow-2xs text-foreground text-[10px]">↓</kbd></span>
            <span>Select: <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border shadow-2xs text-foreground text-[10px]">Enter</kbd></span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground-muted font-medium">
            <span>Close: <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border shadow-2xs text-foreground text-[10px]">ESC</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
};
