import { CompanyService } from '@/modules/core/services/companyService';
import { FacilityService } from '@/modules/core/services/facilityService';
import { InquiryService } from '@/modules/core/services/inquiryService';
import { DiscoveredCompany, DiscoveredCompanyDetail } from '@/modules/core/services/intelligenceService';

export const priorityFromScore = (score: number | null | undefined): 'High' | 'Medium' | 'Low' => {
  const s = score ?? 0;
  if (s >= 70) return 'High';
  if (s >= 40) return 'Medium';
  return 'Low';
};

export interface AddProspectToCrmParams {
  company: DiscoveredCompany;
  detail?: DiscoveredCompanyDetail;
  city?: string;
  state?: string;
  /** Used in the fallback note when there's no opportunity-score "why" text, e.g. a property name. */
  contextLabel?: string;
}

export interface AddProspectToCrmResult {
  success: boolean;
  error?: string;
  companyId?: string;
}

/**
 * Add an AI-discovered company to the CRM as a Company + (if it has
 * coordinates) a Facility + a real Inquiry on the Pipeline board's "new"
 * stage. Shared between AiProspectsPanel and the AI Discovery module so the
 * three-call sequence and source/score wiring only lives in one place.
 */
export async function addProspectToCrm({
  company,
  detail,
  city,
  state,
  contextLabel,
}: AddProspectToCrmParams): Promise<AddProspectToCrmResult> {
  const priority = priorityFromScore(company.opportunityScore);

  const companyRes = await CompanyService.createCompany({
    name: company.name,
    industry: company.businessType || undefined,
    address: company.address || undefined,
    city,
    state,
    website: detail?.website || undefined,
    phone: detail?.phone || undefined,
    priority,
    prospectStage: 'New',
    source: 'AI Discovery',
    initialNotes: detail?.opportunityScore?.why
      ? `AI-discovered prospect (score ${company.opportunityScore ?? 'n/a'}/100): ${detail.opportunityScore.why}`
      : contextLabel
        ? `AI-discovered prospect near ${contextLabel} (${company.distanceKm?.toFixed(1) ?? '?'} km away).`
        : `AI-discovered prospect (score ${company.opportunityScore ?? 'n/a'}/100).`,
  });

  if (!companyRes.success || !companyRes.data) {
    return { success: false, error: companyRes.error || `Could not add ${company.name} to the CRM.` };
  }

  if (detail?.lat && detail?.lng) {
    await FacilityService.createFacility({
      companyId: companyRes.data.id,
      companyName: company.name,
      name: `${company.name} — Facility`,
      type: 'Manufacturing Plant',
      address: company.address || '',
      city,
      state,
      latitude: detail.lat,
      longitude: detail.lng,
      status: 'Active',
    });
  }

  const inquiryRes = await InquiryService.createInquiry({
    companyId: companyRes.data.id,
    companyName: company.name,
    contactPhone: detail?.phone || undefined,
    source: 'AI Discovery',
    requirement: detail?.opportunityScore?.estimatedRequirement || undefined,
    location: city,
    industry: company.businessType || undefined,
    priority,
    leadScore: company.opportunityScore ?? undefined,
    opportunityScore: company.opportunityScore ?? undefined,
    stage: 'new',
    status: 'Active',
  });

  if (!inquiryRes.success) {
    return {
      success: false,
      error: inquiryRes.error || `${company.name} was added as a company, but the inquiry could not be created.`,
      companyId: companyRes.data.id,
    };
  }

  return { success: true, companyId: companyRes.data.id };
}
