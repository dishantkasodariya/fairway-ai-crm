import { DiscoveredCompany, DiscoveredCompanyDetail } from '@/modules/core/services/intelligenceService';

export interface ExportableProspect {
  company: DiscoveredCompany;
  detail?: DiscoveredCompanyDetail;
}

const csvField = (val: unknown): string => `"${String(val ?? '').replace(/"/g, '""')}"`;

/**
 * Builds a CSV using the Import Wizard's already-recognized headers (Company,
 * Industry, Comments) plus the ones import.controller.ts now also recognizes
 * (Opportunity Score, Revenue (Cr), Source) - Remark 1 is set to
 * 'New — AI Discovered' so mapStatusToStage lands the imported row in 'new'.
 */
export function exportProspectsCsv(prospects: ExportableProspect[]): void {
  const headers = ['Company', 'Industry', 'Comments', 'Opportunity Score', 'Revenue (Cr)', 'Source', 'Remark 1 – Current Status'];

  const rows = prospects.map(({ company, detail }) => {
    const why = detail?.opportunityScore?.why;
    const comments = why
      ? `AI-discovered prospect (score ${company.opportunityScore ?? 'n/a'}/100): ${why}`
      : `AI-discovered prospect${company.distanceKm !== null ? ` (${company.distanceKm.toFixed(1)} km away)` : ''}.`;

    return [
      csvField(company.name),
      csvField(company.businessType || ''),
      csvField(comments),
      csvField(company.opportunityScore ?? ''),
      csvField(company.latestRevenueCr ?? ''),
      csvField('AI Discovery'),
      csvField('New — AI Discovered'),
    ].join(',');
  });

  const csvContent = '﻿' + [headers.map(csvField).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Fairway_AI_Prospects_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
