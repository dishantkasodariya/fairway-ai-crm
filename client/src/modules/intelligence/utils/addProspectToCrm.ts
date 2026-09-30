import { IntelligenceService, AddToCrmResult } from '@/modules/core/services/intelligenceService';

export interface AddProspectToCrmParams {
  /** Intelligence (AI Discovery) company id. */
  companyId: number;
  /** Key person to put on the deal. */
  contactId?: number;
  /** Add another deal even though the company already has an open one. */
  allowSecondInquiry?: boolean;
}

export interface AddProspectToCrmOutcome {
  success: boolean;
  error?: string;
  /** The company already has an open deal; nothing was created. */
  alreadyOpen?: boolean;
  data?: AddToCrmResult;
}

/**
 * Add an AI-discovered company to the CRM. The server does it in one transaction and never
 * duplicates: it reuses an existing CRM company (same link, website or cleaned-up name), refuses a
 * second open deal, and assigns the manager of the nearest warehouse as the owner.
 */
export async function addProspectToCrm({ companyId, contactId, allowSecondInquiry }: AddProspectToCrmParams): Promise<AddProspectToCrmOutcome> {
  const res = await IntelligenceService.addToCrm(companyId, { contactId, allowSecondInquiry });
  if (res.success && res.data) return { success: true, data: res.data };
  const error = typeof res.error === 'string' ? res.error : 'Could not add the company to the CRM.';
  return { success: false, error, alreadyOpen: /already has an open deal/i.test(error) };
}
