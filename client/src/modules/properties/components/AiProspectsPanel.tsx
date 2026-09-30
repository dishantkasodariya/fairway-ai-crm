import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, Plus, Check, MapPin, TrendingUp } from 'lucide-react';
import { IntelligenceService, DiscoveredCompany, DiscoveryRun } from '@/modules/core/services/intelligenceService';
import { addProspectToCrm } from '@/modules/intelligence/utils/addProspectToCrm';
import { Property } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';
import { cn } from '@/modules/core/lib/utils';
import { useToast } from '@/modules/core/providers/ToastContext';

export interface AiProspectsPanelProps {
  property: Property;
}

const POLL_INTERVAL_MS = 4000;

const scoreBadgeClass = (score: number | null) => {
  if (score === null) return 'bg-surface-muted text-foreground-muted border-border';
  if (score >= 70) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (score >= 40) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  return 'bg-surface-muted text-foreground-muted border-border';
};

export const AiProspectsPanel: React.FC<AiProspectsPanelProps> = ({ property }) => {
  const { success, error: toastError } = useToast();
  const [radiusKm, setRadiusKm] = useState(10);
  const [run, setRun] = useState<DiscoveryRun | null>(null);
  const [prospects, setProspects] = useState<DiscoveredCompany[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  const loadResults = async (runId: number) => {
    const res = await IntelligenceService.listDiscoveredCompanies({ discoveryRunId: runId, sortBy: 'score', limit: 100 });
    if (res.success && res.data) {
      setProspects(res.data.items);
    }
  };

  const handleFindProspects = async () => {
    if (!property.latitude || !property.longitude) {
      toastError('Missing Coordinates', 'This property has no geo-coordinates set — cannot search nearby.');
      return;
    }

    setIsStarting(true);
    setProspects([]);
    try {
      const res = await IntelligenceService.startDiscoveryRun({
        lat: property.latitude,
        lng: property.longitude,
        radiusKm,
      });

      if (!res.success || !res.data) {
        toastError('Search Failed', res.error || 'Could not start the prospect search.');
        return;
      }

      setRun(res.data);
      const runId = res.data.id;

      stopPolling();
      pollRef.current = setInterval(async () => {
        const poll = await IntelligenceService.getDiscoveryRun(runId);
        if (!poll.success || !poll.data) return;

        setRun(poll.data);
        if (poll.data.status === 'done') {
          stopPolling();
          await loadResults(runId);
        } else if (poll.data.status === 'failed') {
          stopPolling();
          toastError('Search Failed', 'The prospect search failed on the intelligence service.');
        }
      }, POLL_INTERVAL_MS);
    } finally {
      setIsStarting(false);
    }
  };

  const handleAddToCrm = async (company: DiscoveredCompany) => {
    setAddingIds((prev) => new Set(prev).add(company.id));
    try {
      const result = await addProspectToCrm({ companyId: company.id });

      if (!result.success) {
        if (result.alreadyOpen) setAddedIds((prev) => new Set(prev).add(company.id));
        toastError(result.alreadyOpen ? 'Already in the CRM' : 'Add Failed', result.error || `Could not add ${company.name} to the CRM.`);
        return;
      }

      setAddedIds((prev) => new Set(prev).add(company.id));
      const d = result.data!;
      success(
        'Added to CRM',
        `${d.inquiryNumber} on the New Lead column${d.owner ? `, owned by ${d.owner.managerName}` : ''}${d.companyCreated ? '' : ` (existing company ${d.companyName})`}.`
      );
    } catch (err: any) {
      toastError('Add Failed', err.message || `Could not add ${company.name} to the CRM.`);
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(company.id);
        return next;
      });
    }
  };

  const isSearching = run !== null && (run.status === 'queued' || run.status === 'running');

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-fairway-600" />
            <span>AI-Discovered Prospects</span>
          </h2>
          <p className="text-xs text-foreground-muted mt-0.5">
            Companies found near this park, scored by expansion/hiring/funding/distress signals — sourced from the Fairway Company Intelligence engine.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-surface-muted rounded-lg border border-border px-2.5 py-1.5">
            <label className="text-[11px] font-semibold text-foreground-muted">Radius</label>
            <input
              type="number"
              min={1}
              max={50}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-12 bg-transparent text-xs font-bold text-foreground focus:outline-none"
              disabled={isSearching}
            />
            <span className="text-[11px] text-foreground-muted">km</span>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleFindProspects}
            isLoading={isStarting || isSearching}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            className="rounded-xl text-xs font-semibold"
          >
            {isSearching ? 'Searching…' : 'Find Prospects'}
          </Button>
        </div>
      </div>

      {isSearching && (
        <div className="py-10 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-fairway-600 animate-spin mx-auto" />
          <p className="text-xs text-foreground-muted">
            Tiling a {radiusKm}km radius, classifying businesses, and scoring opportunity — this can take a minute for larger radii.
          </p>
        </div>
      )}

      {!isSearching && run?.status === 'done' && prospects.length === 0 && (
        <div className="py-10 text-center space-y-2">
          <p className="text-xs text-foreground-muted">No companies found within {run.radiusKm}km of this park.</p>
        </div>
      )}

      {!isSearching && prospects.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] text-foreground-muted">
            {prospects.length} companies found within {run?.radiusKm}km, sorted by opportunity score.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prospects.map((company) => {
              const isAdding = addingIds.has(company.id);
              const isAdded = addedIds.has(company.id);
              return (
                <div
                  key={company.id}
                  className="p-4 bg-surface-muted/30 border border-border rounded-2xl shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-foreground text-sm leading-snug">{company.name}</h4>
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 flex items-center gap-1', scoreBadgeClass(company.opportunityScore))}>
                      <TrendingUp className="w-3 h-3" />
                      <span>{company.opportunityScore !== null ? Math.round(company.opportunityScore) : '—'}</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-foreground-muted flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{company.address || 'Address unavailable'}</span>
                  </p>

                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {company.businessType && (
                      <span className="px-2 py-0.5 rounded-lg bg-surface border border-border text-foreground-muted font-semibold">
                        {company.businessType}
                      </span>
                    )}
                    {company.distanceKm !== null && (
                      <span className="px-2 py-0.5 rounded-lg bg-surface border border-border text-foreground-muted font-semibold">
                        {company.distanceKm.toFixed(1)} km away
                      </span>
                    )}
                    {company.latestRevenueCr !== null && (
                      <span className="px-2 py-0.5 rounded-lg bg-surface border border-border text-foreground-muted font-semibold">
                        ₹{company.latestRevenueCr} Cr revenue
                      </span>
                    )}
                    {company.latestSignalFreshness && (
                      <span className="px-2 py-0.5 rounded-lg bg-surface border border-border text-foreground-muted font-semibold">
                        {company.latestSignalFreshness}
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isAdded ? 'outline' : 'primary'}
                    onClick={() => handleAddToCrm(company)}
                    disabled={isAdded}
                    isLoading={isAdding}
                    leftIcon={isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    className="w-full rounded-xl text-xs font-semibold"
                  >
                    {isAdded ? 'Added to CRM' : 'Add to CRM'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiProspectsPanel;
