import { Contact } from '@/modules/core/types';
import { API_BASE_URL } from './api';

export class ContactService {
  /**
   * Fetch contacts for a company
   */
  static async getContacts(companyId?: string): Promise<{
    success: boolean;
    data: Contact[];
    error?: string;
  }> {
    try {
      const q = companyId ? `?companyId=${companyId}` : '';
      const res = await fetch(`${API_BASE_URL}/contacts${q}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('ContactService.getContacts failed:', err);
      return { success: false, data: [], error: err.message };
    }
  }

  /**
   * Create a contact
   */
  static async createContact(payload: {
    companyId: string;
    companyName?: string;
    name: string;
    designation?: string;
    department?: string;
    phone?: string;
    email?: string;
    linkedinUrl?: string;
    isPrimary?: boolean;
    notes?: string;
  }): Promise<{ success: boolean; data?: Contact; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('ContactService.createContact failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete a contact
   */
  static async deleteContact(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/contacts/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('ContactService.deleteContact failed:', err);
      return { success: false, error: err.message };
    }
  }
}

export default ContactService;
