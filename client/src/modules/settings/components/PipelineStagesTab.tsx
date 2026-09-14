import React, { useState, useEffect } from 'react';
import { Kanban, Loader2 } from 'lucide-react';
import { PipelineStageService } from '@/modules/core/services/pipelineStageService';
import { PipelineStageConfig } from '@/modules/core/types';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';

export const PipelineStagesTab: React.FC = () => {
  const [stages, setStages] = useState<PipelineStageConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStages = async () => {
      setLoading(true);
      try {
        const res = await PipelineStageService.getPipelineStages();
        if (isMounted && res.success && res.data) {
          setStages(res.data);
        }
      } catch (err) {
        console.error('Failed to load stages from backend:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStages();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="space-y-4">
        <CardHeader>
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Kanban className="w-4 h-4 text-fairway-600" />
              <span>Pipeline Stages Configuration</span>
            </CardTitle>
            <p className="text-xs text-foreground-muted mt-0.5">
              Live PostgreSQL pipeline stages and status lifecycle for deals and inquiries.
            </p>
          </div>
        </CardHeader>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-fairway-600" />
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((st, idx) => (
              <div
                key={st.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3.5 border border-border rounded-xl bg-surface-muted/20 hover:border-fairway-400 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                    style={{ backgroundColor: `${st.color}20`, color: st.color }}
                  >
                    {st.order ?? idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-xs">{st.label}</h4>
                    <span className="text-[10px] text-foreground-muted font-mono">{st.key}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pl-9 sm:pl-0">
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-bold text-fairway-600">{st.description || 'Active stage'}</span>
                    <span className="text-[10px] text-foreground-muted block">Stage Info</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PipelineStagesTab;
