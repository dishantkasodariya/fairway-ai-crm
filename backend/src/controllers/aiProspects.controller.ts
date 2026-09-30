import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { callIntelligenceApi, IntelligenceApiError, toCamelCaseDeep } from './intelligence.controller.js';
import { addProspectToCrm, getCrmStatus } from '../services/aiProspects.js';
import { DealError } from '../services/dealErrors.js';

const fail = (res: Response, error: any, fallback: string) => {
  const status = error instanceof DealError || error instanceof IntelligenceApiError ? error.status : 500;
  if (status >= 500) console.error(`[ai-prospects] ${fallback}:`, error);
  res.status(status).json({ success: false, error: error.message || fallback });
};

/** GET /api/intelligence/companies/:id/crm-status — is this prospect already in the CRM, and who would own it? */
export const crmStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: await getCrmStatus(Number(req.params.id)) });
  } catch (error: any) {
    fail(res, error, 'Failed to check CRM status');
  }
};

/** POST /api/intelligence/companies/:id/add-to-crm { contactId?, allowSecondInquiry? } */
export const addToCrm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await addProspectToCrm(
      Number(req.params.id),
      { contactId: req.body?.contactId ?? null, allowSecondInquiry: !!req.body?.allowSecondInquiry },
      req.user?.userId
    );
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    fail(res, error, 'Failed to add the prospect to the CRM');
  }
};

/** POST /api/intelligence/companies/:id/contacts — add a key person by hand. */
export const createManualContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, title, email, phone, linkedinUrl } = req.body || {};
    const contact = await callIntelligenceApi(`/v1/companies/${req.params.id}/contacts`, {
      method: 'POST',
      body: JSON.stringify({ name, title, email, phone, linkedin_url: linkedinUrl }),
    });
    res.status(201).json({ success: true, data: toCamelCaseDeep(contact) });
  } catch (error: any) {
    fail(res, error, 'Failed to add the contact');
  }
};

/** DELETE /api/intelligence/contacts/:id */
export const deleteContact = async (req: Request, res: Response): Promise<void> => {
  try {
    await callIntelligenceApi(`/v1/contacts/${req.params.id}`, { method: 'DELETE' });
    res.status(200).json({ success: true });
  } catch (error: any) {
    fail(res, error, 'Failed to delete the contact');
  }
};
