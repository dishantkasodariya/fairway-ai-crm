import React, { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles, TrendingUp, MapPin, Globe, Phone, Download, Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';
import { Card } from '@/modules/core/components/ui/Card';
import { Badge } from '@/modules/core/components/ui/Badge';
import { useToast } from '@/modules/core/providers/ToastContext';
import { IntelligenceService, DiscoveredCompany, DiscoveredCompanyDetail } from '@/modules/core/services/intelligenceService';
import { addProspectToCrm } from '../utils/addProspectToCrm';
import { exportProspectsCsv } from '../utils/exportProspectsCsv';

export interface AiProspectDetailPageProps {
  prospectId: number;
  onBack: () => void;
}

const scoreBadgeClass = (score: number | null | undefined) => {
  if (score === null || score === undefined) return 'bg-surface-muted text-foreground-muted border-border';
  if (score >= 70) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (score >= 40) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  return 'bg-surface-muted text-foreground-muted border-border';
};

export const AiProspectDetailPage: React.FC<AiProspectDetailPageProps> = ({ prospectId, onBack }) => {
  const { success, error: toastError } = useToast();
  const [detail, setDetail] = useState<DiscoveredCompanyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    IntelligenceService.getDiscoveredCompany(prospectId).then((res) => {
      if (res.success && res.data) setDetail(res.data);
      setIsLoading(false);
    });
  }, [prospectId]);

  const asDiscoveredCompany = (d: DiscoveredCompanyDetail): DiscoveredCompany => ({
    id: d.id,
    name: d.name,
    businessType: d.businessType,
    address: d.address,
    distanceKm: d.distanceKm,
    siteCount: d.siteCount,
    latestRevenueCr: d.revenueSnapshots[0]?.revenueCr ?? null,
    opportunityScore: d.opportunityScore?.score ?? null,
    latestSignalFreshness: d.opportunityScore?.latestSignalFreshness ?? null,
  });

  const handleAddToCrm = async () => {
    if (!detail) return;
    setIsAdding(true);
    try {
      const result = await addProspectToCrm({ company: asDiscoveredCompany(detail), detail });
      if (!result.success) {
        toastError(result.companyId ? 'Company Added, Inquiry Failed' : 'Add Failed', result.error || `Could not add ${detail.name} to the CRM.`);
        return;
      }
      setIsAdded(true);
      success('Added to CRM', `${detail.name} is now on the Pipeline board's New Lead column.`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!detail) return;
    exportProspectsCsv([{ company: asDiscoveredCompany(detail), detail }]);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 text-fairway-600 animate-spin mx-auto" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6 space-y-4">
        <Button type="button" variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={onBack}>
          Back
        </Button>
        <p className="text-sm text-foreground-muted">Prospect not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={onBack}>
          Back to AI Discovery
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadCsv} leftIcon={<Download className="w-3.5 h-3.5" />} className="rounded-lg text-xs font-semibold">
            Download CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isAdded ? 'outline' : 'primary'}
            onClick={handleAddToCrm}
            disabled={isAdded}
            isLoading={isAdding}
            leftIcon={isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            className="rounded-lg text-xs font-semibold"
          >
            {isAdded ? 'Added to CRM' : 'Add to CRM'}
          </Button>
        </div>
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-fairway-600" />
              {detail.name}
            </h1>
            <p className="text-xs text-foreground-muted mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {detail.address || 'Address unavailable'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold border shrink-0 flex items-center gap-1 ${scoreBadgeClass(detail.opportunityScore?.score)}`}>
            <TrendingUp className="w-4 h-4" />
            {detail.opportunityScore ? Math.round(detail.opportunityScore.score) : '—'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {detail.businessType && <Badge variant="outline">{detail.businessType}</Badge>}
          {detail.website && (
            <a href={detail.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-foreground-muted hover:text-primary">
              <Globe className="w-3 h-3" /> Website
            </a>
          )}
          {detail.phone && (
            <span className="flex items-center gap-1 text-foreground-muted">
              <Phone className="w-3 h-3" /> {detail.phone}
            </span>
          )}
        </div>
      </Card>

      {detail.opportunityScore && (
        <Card className="p-5 space-y-2">
          <h2 className="text-sm font-bold text-foreground">Opportunity Score Breakdown</h2>
          <p className="text-xs text-foreground-muted">{detail.opportunityScore.why}</p>
          <div className="grid grid-cols-2 gap-3 text-xs pt-2">
            <div>
              <span className="text-foreground-muted">Estimated Requirement</span>
              <p className="font-semibold text-foreground">{detail.opportunityScore.estimatedRequirement || '—'}</p>
            </div>
            <div>
              <span className="text-foreground-muted">Recommended Action</span>
              <p className="font-semibold text-foreground">{detail.opportunityScore.recommendedAction || '—'}</p>
            </div>
            <div>
              <span className="text-foreground-muted">Confidence</span>
              <p className="font-semibold text-foreground">{detail.opportunityScore.confidence || '—'}</p>
            </div>
            <div>
              <span className="text-foreground-muted">Latest Signal</span>
              <p className="font-semibold text-foreground">{detail.opportunityScore.latestSignalFreshness || '—'}</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5 space-y-2">
        <h2 className="text-sm font-bold text-foreground">Revenue History</h2>
        {detail.revenueSnapshots.length === 0 ? (
          <p className="text-xs text-foreground-muted">No revenue data yet.</p>
        ) : (
          <div className="space-y-2">
            {detail.revenueSnapshots.map((rs) => (
              <div key={rs.id} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0">
                <div>
                  <p className="font-semibold text-foreground">{rs.revenue || `₹${rs.revenueCr} Cr`}</p>
                  <p className="text-foreground-muted">{rs.fiscalYear} · {rs.sourceName}</p>
                </div>
                <span className="text-foreground-muted">{rs.confidence}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-2">
        <h2 className="text-sm font-bold text-foreground">Signals Timeline</h2>
        {detail.signals.length === 0 ? (
          <p className="text-xs text-foreground-muted">No signals researched yet.</p>
        ) : (
          <div className="space-y-3">
            {detail.signals.map((s) => (
              <div key={s.id} className="text-xs border-b border-border pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" size="sm">{s.type}</Badge>
                  <span className="text-foreground-muted">{s.date}</span>
                </div>
                <p className="text-foreground mt-1">{s.summary}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AiProspectDetailPage;
