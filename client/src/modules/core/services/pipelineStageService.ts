import { PipelineStageConfig } from '@/modules/core/types';
import { api } from './api';

export class PipelineStageService {
  /**
   * Fetch all pipeline stages from backend PostgreSQL API
   */
  static async getPipelineStages(): Promise<{
    success: boolean;
    data?: PipelineStageConfig[];
    error?: string;
  }> {
    try {
      const res = await api.get<PipelineStageConfig[]>('/pipeline-stages');
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error?.message || 'Failed to fetch pipeline stages' };
    } catch (err: any) {
      console.warn('PipelineStageService.getPipelineStages error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create custom pipeline stage
   */
  static async createPipelineStage(stage: Partial<PipelineStageConfig>): Promise<{
    success: boolean;
    data?: PipelineStageConfig;
    error?: string;
  }> {
    try {
      const res = await api.post<PipelineStageConfig>('/pipeline-stages', stage);
      return { success: res.success, data: res.data, error: res.error?.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Update pipeline stage
   */
  static async updatePipelineStage(
    id: string,
    updates: Partial<PipelineStageConfig>
  ): Promise<{ success: boolean; data?: PipelineStageConfig; error?: string }> {
    try {
      const res = await api.put<PipelineStageConfig>(`/pipeline-stages/${id}`, updates);
      return { success: res.success, data: res.data, error: res.error?.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export default PipelineStageService;
