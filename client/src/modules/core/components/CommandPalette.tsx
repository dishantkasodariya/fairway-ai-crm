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
  CornerDownLeft,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { formatSqFt } from '@/modules/core/utils/formatters';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'company' | 'inquiry' | 'contact' | 'property' | 'facility', id: string) => void;
}

type FilterCategory = 'all' | 'inquiries' | 'companies' | 'properties' | 'contacts' | 'facilities';

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Focus input on open & reset state on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setSelectedIndex(0);
      setActiveCategory('all');
    }
  }, [isOpen]);

  // Global ESC key listener - closes modal anywhere on keyboard escape
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

  // Flatten filtered results based on activeCategory
  const flatList: Array<{
    type: 'inquiry' | 'company' | 'property' | 'contact' | 'facility';
    id: string;
    targetId: string;
    key: string;
  }> = [
    ...(activeCategory === 'all' || activeCategory === 'inquiries'
      ? filteredInquiries.map((i) => ({
          type: 'inquiry' as const,
          id: i.id,
          targetId: i.id,
          key: `inq-${i.id}`,
        }))
      : []),
    ...(activeCategory === 'all' || activeCategory === 'companies'
      ? filteredCompanies.map((c) => ({
          type: 'company' as const,
          id: c.id,
          targetId: c.id,
          key: `comp-${c.id}`,
        }))
      : []),
    ...(activeCategory === 'all' || activeCategory === 'properties'
      ? filteredProperties.map((p) => ({
          type: 'property' as const,
          id: p.id,
          targetId: p.id,
          key: `prop-${p.id}`,
        }))
      : []),
    ...(activeCategory === 'all' || activeCategory === 'contacts'
      ? filteredContacts.map((c) => ({
          type: 'contact' as const,
          id: c.id,
          targetId: c.companyId,
          key: `cnt-${c.id}`,
        }))
      : []),
    ...(activeCategory === 'all' || activeCategory === 'facilities'
      ? filteredFacilities.map((f) => ({
          type: 'facility' as const,
          id: f.id,
          targetId: f.companyId,
          key: `fac-${f.id}`,
        }))
      : []),
  ];

  // Reset selected index when search query or category changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

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

  const getStageBadgeClass = (stage: string) => {
    const s = stage.toLowerCase();
    if (s.includes('closed_won') || s.includes('final')) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
    }
    if (s.includes('matched') || s.includes('requirement')) {
      return 'bg-fairway-50 text-fairway-700 dark:bg-fairway-950/60 dark:text-fairway-300 border-fairway-200 dark:border-fairway-800/60';
    }
    if (s.includes('negotiation') || s.includes('proposal')) {
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';
    }
    return 'bg-surface-muted text-foreground-muted border-border';
  };

  const totalResultsCount =
    filteredInquiries.length +
    filteredCompanies.length +
    filteredProperties.length +
    filteredContacts.length +
    filteredFacilities.length;

  const categoryPills: { id: FilterCategory; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: totalResultsCount },
    { id: 'inquiries', label: 'Inquiries', count: filteredInquiries.length },
    { id: 'companies', label: 'Companies', count: filteredCompanies.length },
    { id: 'properties', label: 'Properties', count: filteredProperties.length },
    ...(filteredContacts.length > 0 ? [{ id: 'contacts' as FilterCategory, label: 'Contacts', count: filteredContacts.length }] : []),
    ...(filteredFacilities.length > 0 ? [{ id: 'facilities' as FilterCategory, label: 'Facilities', count: filteredFacilities.length }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 px-3 sm:px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-surface/98 dark:bg-[#16181d]/98 backdrop-blur-xl rounded-2xl border border-border shadow-2xl shadow-black/40 z-10 overflow-hidden flex flex-col max-h-[85vh] animate-fade-in text-left">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 sm:px-5 py-3.5 border-b border-border bg-surface shrink-0 gap-3">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-fairway-600 dark:text-fairway-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search companies, inquiries, contacts, properties, corridors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm sm:text-base text-foreground placeholder:text-foreground-muted border-0 outline-none focus:outline-none focus:ring-0 ring-0 shadow-none p-0 font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-muted rounded-md shrink-0 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Interactive ESC Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-foreground-muted hover:text-foreground bg-surface-muted/70 hover:bg-surface-muted border border-border transition-all cursor-pointer shadow-2xs group shrink-0"
            title="Close dialog (Escape)"
          >
            <span className="font-mono text-[10px] font-bold bg-surface px-1.5 py-0.5 rounded border border-border group-hover:border-foreground/30 shadow-2xs transition-colors">
              ESC
            </span>
            <span className="hidden sm:inline text-[11px]">to close</span>
            <X className="w-3.5 h-3.5 text-foreground-muted group-hover:text-foreground transition-colors ml-0.5" />
          </button>
        </div>

        {/* Quick Filter Categories Bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border/60 bg-surface-muted/30 overflow-x-auto shrink-0 scrollbar-none">
          {categoryPills.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-fairway-600 text-white font-semibold shadow-2xs'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-muted'
              }`}
            >
              <span>{cat.label}</span>
              {cat.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeCategory === cat.id
                      ? 'bg-white/20 text-white'
                      : 'bg-surface-muted text-foreground-muted border border-border'
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-3 space-y-4 flex-1">
          {!hasResults && (
            <div className="py-14 text-center text-foreground-muted space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-surface-muted flex items-center justify-center text-foreground-muted border border-border">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs max-w-sm mx-auto text-foreground-muted">
                Try searching by company name, inquiry ID (e.g. INQ-1048), corridor, or contact name.
              </p>
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="mt-2 text-xs font-semibold text-fairway-600 hover:text-fairway-700 dark:text-fairway-400 hover:underline cursor-pointer"
                >
                  Clear search query
                </button>
              )}
            </div>
          )}

          {/* Inquiries */}
          {(activeCategory === 'all' || activeCategory === 'inquiries') && filteredInquiries.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground-muted flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-foreground-muted">Inquiries / Leads</span>
                </div>
                <span className="text-[10px] font-mono text-foreground-muted">{filteredInquiries.length} results</span>
              </div>
              <div className="space-y-1 mt-1.5">
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
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all gap-2.5 border ${
                        isSelected
                          ? 'bg-fairway-50/80 dark:bg-fairway-950/40 border-fairway-300 dark:border-fairway-800 shadow-2xs text-foreground ring-1 ring-fairway-500/20'
                          : 'hover:bg-surface-muted/60 border-transparent text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                            isSelected
                              ? 'bg-fairway-600 text-white border-fairway-700 shadow-2xs'
                              : 'bg-surface-muted text-foreground border-border'
                          }`}
                        >
                          {inq.inquiryNumber}
                        </span>
                        <div className="truncate min-w-0 flex-1">
                          <div className="text-xs font-semibold flex items-center gap-1.5 truncate">
                            <span className="truncate text-foreground font-bold">{inq.companyName}</span>
                            <span className="text-[11px] font-normal text-foreground-muted shrink-0">
                              · {formatSqFt(inq.requiredAreaSqFt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-foreground-muted truncate mt-0.5">{inq.requirement}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap border ${getStageBadgeClass(
                            inq.stage
                          )}`}
                        >
                          {inq.stage.replace(/_/g, ' ')}
                        </span>
                        <ArrowRight
                          className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                            isSelected ? 'text-fairway-600 translate-x-0.5' : 'text-foreground-muted'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Companies */}
          {(activeCategory === 'all' || activeCategory === 'companies') && filteredCompanies.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground-muted flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="text-foreground-muted">Companies</span>
                </div>
                <span className="text-[10px] font-mono text-foreground-muted">{filteredCompanies.length} results</span>
              </div>
              <div className="space-y-1 mt-1.5">
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
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all gap-2.5 border ${
                        isSelected
                          ? 'bg-fairway-50/80 dark:bg-fairway-950/40 border-fairway-300 dark:border-fairway-800 shadow-2xs text-foreground ring-1 ring-fairway-500/20'
                          : 'hover:bg-surface-muted/60 border-transparent text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-2xs">
                          {c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate min-w-0 flex-1">
                          <span className="text-xs font-bold block truncate text-foreground">{c.name}</span>
                          <p className="text-[11px] text-foreground-muted truncate mt-0.5">
                            {c.industry} · {c.city}, {c.state}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline-block text-[11px] text-foreground-muted">
                          Owner: {c.assignedOwnerName}
                        </span>
                        <ArrowRight
                          className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                            isSelected ? 'text-fairway-600 translate-x-0.5' : 'text-foreground-muted'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warehouse Properties */}
          {(activeCategory === 'all' || activeCategory === 'properties') && filteredProperties.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground-muted flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Warehouse className="w-3.5 h-3.5" />
                  <span className="text-foreground-muted">Warehouse Properties</span>
                </div>
                <span className="text-[10px] font-mono text-foreground-muted">{filteredProperties.length} results</span>
              </div>
              <div className="space-y-1 mt-1.5">
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
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all gap-2.5 border ${
                        isSelected
                          ? 'bg-fairway-50/80 dark:bg-fairway-950/40 border-fairway-300 dark:border-fairway-800 shadow-2xs text-foreground ring-1 ring-fairway-500/20'
                          : 'hover:bg-surface-muted/60 border-transparent text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-mono shadow-2xs">
                          {p.code.split('-')[1] || p.code}
                        </div>
                        <div className="truncate min-w-0 flex-1">
                          <span className="text-xs font-bold block truncate text-foreground">{p.name}</span>
                          <p className="text-[11px] text-foreground-muted truncate mt-0.5">
                            {formatSqFt(p.availableAreaSqFt)} avail @ ₹{p.rentPerSqFtINR}/sq.ft · {p.city}
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                          isSelected ? 'text-fairway-600 translate-x-0.5' : 'text-foreground-muted'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contacts */}
          {(activeCategory === 'all' || activeCategory === 'contacts') && filteredContacts.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground-muted flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <User className="w-3.5 h-3.5" />
                  <span className="text-foreground-muted">Contacts</span>
                </div>
                <span className="text-[10px] font-mono text-foreground-muted">{filteredContacts.length} results</span>
              </div>
              <div className="space-y-1 mt-1.5">
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
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all gap-2.5 border ${
                        isSelected
                          ? 'bg-fairway-50/80 dark:bg-fairway-950/40 border-fairway-300 dark:border-fairway-800 shadow-2xs text-foreground ring-1 ring-fairway-500/20'
                          : 'hover:bg-surface-muted/60 border-transparent text-foreground'
                      }`}
                    >
                      <div className="truncate min-w-0 flex-1">
                        <span className="text-xs font-bold block truncate text-foreground">{cnt.name}</span>
                        <p className="text-[11px] text-foreground-muted truncate mt-0.5">
                          {cnt.designation} · {cnt.companyName} ({cnt.phone})
                        </p>
                      </div>
                      <ArrowRight
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-fairway-600' : 'text-foreground-muted'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Facilities */}
          {(activeCategory === 'all' || activeCategory === 'facilities') && filteredFacilities.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground-muted flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                  <Factory className="w-3.5 h-3.5" />
                  <span className="text-foreground-muted">Facilities</span>
                </div>
                <span className="text-[10px] font-mono text-foreground-muted">{filteredFacilities.length} results</span>
              </div>
              <div className="space-y-1 mt-1.5">
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
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all gap-2.5 border ${
                        isSelected
                          ? 'bg-fairway-50/80 dark:bg-fairway-950/40 border-fairway-300 dark:border-fairway-800 shadow-2xs text-foreground ring-1 ring-fairway-500/20'
                          : 'hover:bg-surface-muted/60 border-transparent text-foreground'
                      }`}
                    >
                      <div className="truncate min-w-0 flex-1">
                        <span className="text-xs font-bold block truncate text-foreground">{fac.name}</span>
                        <p className="text-[11px] text-foreground-muted truncate mt-0.5">
                          {fac.type} · {fac.city}, {fac.state} · {fac.companyName}
                        </p>
                      </div>
                      <ArrowRight
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-fairway-600' : 'text-foreground-muted'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Clean Enterprise Footer */}
        <div className="px-4 sm:px-5 py-2.5 bg-surface-muted/40 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-foreground-muted shrink-0">
          <div className="flex items-center gap-3.5">
            <span className="flex items-center gap-1">
              Navigation:{' '}
              <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border shadow-2xs text-foreground text-[10px]">
                ↑
              </kbd>{' '}
              <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border shadow-2xs text-foreground text-[10px]">
                ↓
              </kbd>
            </span>
            <span className="flex items-center gap-1">
              Select:{' '}
              <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border shadow-2xs text-foreground text-[10px] flex items-center gap-0.5">
                <CornerDownLeft className="w-2.5 h-2.5" /> Enter
              </kbd>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-foreground-muted hover:text-foreground font-medium transition-colors cursor-pointer group"
            title="Click or press ESC to close"
          >
            <span>Close:</span>
            <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border shadow-2xs text-foreground text-[10px] group-hover:border-fairway-500 group-hover:text-fairway-600 transition-colors">
              ESC
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
