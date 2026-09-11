import { API_BASE_URL } from './api';

export interface DocumentItem {
  id: string;
  name: string;
  fileType: string;
  fileSize: string;
  url?: string;
  companyId?: string;
  companyName?: string;
  inquiryId?: string;
  inquiryNumber?: string;
  uploadedById?: string;
  uploadedByName?: string;
  category: string;
  createdAt: string;
}

export class DocumentService {
  /**
   * Fetch documents with optional filters
   */
  static async getDocuments(params?: {
    companyId?: string;
    inquiryId?: string;
    category?: string;
    search?: string;
  }): Promise<{ success: boolean; data: DocumentItem[]; error?: string }> {
    try {
      const q = new URLSearchParams();
      if (params?.companyId) q.append('companyId', params.companyId);
      if (params?.inquiryId) q.append('inquiryId', params.inquiryId);
      if (params?.category && params.category !== 'all') q.append('category', params.category);
      if (params?.search) q.append('search', params.search);

      const res = await fetch(`${API_BASE_URL}/documents?${q.toString()}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('DocumentService.getDocuments failed:', err);
      return { success: false, data: [], error: err.message };
    }
  }

  /**
   * Create / upload document record
   */
  static async createDocument(payload: {
    name: string;
    fileType?: string;
    fileSize?: string;
    url?: string;
    companyId?: string;
    companyName?: string;
    inquiryId?: string;
    inquiryNumber?: string;
    uploadedById?: string;
    uploadedByName?: string;
    category?: string;
  }): Promise<{ success: boolean; data?: DocumentItem; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('DocumentService.createDocument failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete document record
   */
  static async deleteDocument(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('DocumentService.deleteDocument failed:', err);
      return { success: false, error: err.message };
    }
  }
}

export default DocumentService;
