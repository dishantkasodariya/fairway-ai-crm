import { Note } from '@/modules/core/types';
import { API_BASE_URL } from './api';

export class NoteService {
  /**
   * Fetch notes for a company or inquiry
   */
  static async getNotes(params?: { companyId?: string; inquiryId?: string }): Promise<{
    success: boolean;
    data: Note[];
    error?: string;
  }> {
    try {
      const q = new URLSearchParams();
      if (params?.companyId) q.append('companyId', params.companyId);
      if (params?.inquiryId) q.append('inquiryId', params.inquiryId);

      const res = await fetch(`${API_BASE_URL}/notes?${q.toString()}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('NoteService.getNotes failed:', err);
      return { success: false, data: [], error: err.message };
    }
  }

  /**
   * Create a note
   */
  static async createNote(payload: {
    companyId?: string;
    companyName?: string;
    inquiryId?: string;
    inquiryNumber?: string;
    authorId?: string;
    authorName?: string;
    content: string;
    isPinned?: boolean;
  }): Promise<{ success: boolean; data?: Note; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('NoteService.createNote failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete a note
   */
  static async deleteNote(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('NoteService.deleteNote failed:', err);
      return { success: false, error: err.message };
    }
  }
}

export default NoteService;
