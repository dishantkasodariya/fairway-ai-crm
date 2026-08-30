import { Task } from '@/modules/core/types';
import { API_BASE_URL } from './api';

export class TaskService {
  /**
   * Fetch all tasks with optional filters
   */
  static async getTasks(filters?: {
    assignedUserId?: string;
    status?: string;
    taskType?: string;
    search?: string;
    inquiryId?: string;
    companyId?: string;
  }): Promise<{ success: boolean; data: Task[]; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (filters?.assignedUserId && filters.assignedUserId !== 'all') {
        params.append('assignedUserId', filters.assignedUserId);
      }
      if (filters?.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters?.taskType && filters.taskType !== 'all') {
        params.append('taskType', filters.taskType);
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }
      if (filters?.inquiryId) {
        params.append('inquiryId', filters.inquiryId);
      }
      if (filters?.companyId) {
        params.append('companyId', filters.companyId);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE_URL}/tasks${queryString}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('TaskService.getTasks failed:', err);
      return { success: false, data: [], error: err.message || 'Network error' };
    }
  }

  /**
   * Fetch single task details by ID
   */
  static async getTaskById(id: string): Promise<{ success: boolean; data?: Task; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${id}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`TaskService.getTaskById(${id}) failed:`, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  /**
   * Create a new task/follow-up
   */
  static async createTask(taskData: Partial<Task>): Promise<{ success: boolean; data?: Task; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('TaskService.createTask failed:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  /**
   * Update an existing task
   */
  static async updateTask(id: string, taskData: Partial<Task>): Promise<{ success: boolean; data?: Task; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`TaskService.updateTask(${id}) failed:`, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  /**
   * Toggle task status between Pending and Completed
   */
  static async toggleTask(id: string): Promise<{ success: boolean; data?: Task; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${id}/toggle`, {
        method: 'PATCH',
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`TaskService.toggleTask(${id}) failed:`, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`TaskService.deleteTask(${id}) failed:`, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }
}

export default TaskService;
