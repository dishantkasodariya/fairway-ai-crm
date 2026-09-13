import React, { useState } from 'react';
import { Kanban } from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { PipelineStageConfig } from '@/modules/core/types';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';

export const PipelineStagesTab: React.FC = () => {
  const [stages] = useState<PipelineStageConfig[]>(StorageService.getPipelineStages());

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
              System pipeline stages and status lifecycle for deals and inquiries.
            </p>
          </div>
        </CardHeader>

        <div className="space-y-3">
          {stages.map((st, idx) => (
            <div
              key={st.key}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3.5 border border-border rounded-xl bg-surface-muted/20 hover:border-fairway-400 transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {idx + 1}
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
      </Card>
    </div>
  );
};

export default PipelineStagesTab;
