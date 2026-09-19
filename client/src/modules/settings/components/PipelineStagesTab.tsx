import React, { useState, useEffect } from 'react';
import { Kanban, Loader2, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { PipelineStageService } from '@/modules/core/services/pipelineStageService';
import { PipelineStageConfig } from '@/modules/core/types';
import { Card, CardTitle } from '@/modules/core/components/ui/Card';
import { Button } from '@/modules/core/components/ui/Button';
import { cn } from '@/modules/core/lib/utils';

export const PipelineStagesTab: React.FC = () => {
  const [stages, setStages] = useState<PipelineStageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStages = async (spin = false) => {
    if (spin) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await PipelineStageService.getPipelineStages();
      if (res.success && res.data) {
        setStages(res.data);
      }
    } catch (err) {
      console.error('Failed to load stages from backend:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  const getStageCategory = (order: number) => {
    if (order <= 3) return 'Initial Qualification';
    if (order <= 6) return 'Property Matching & Proposal';
    if (order <= 8) return 'Inspection & Negotiation';
    return 'Deal Closure';
  };

  return (
    <div className="space-y-4 animate-fade-in text-left">
      <Card className="p-4 sm:p-6 bg-surface dark:bg-[#121214] border border-border dark:border-white/[0.08] rounded-2xl shadow-xs space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                <Kanban className="w-5 h-5 text-fairway-600 dark:text-fairway-400" />
                <span>Pipeline Stages Configuration</span>
              </CardTitle>
              {stages.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-fairway-500/10 text-fairway-700 dark:text-fairway-300 border border-fairway-500/20">
                  {stages.length} Live Stages
                </span>
              )}
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              Active PostgreSQL pipeline lifecycle governing inquiry progression and deal flow across all industrial corridors.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStages(true)}
            disabled={isRefreshing || loading}
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5 shrink-0', isRefreshing && 'animate-spin text-fairway-600')} />}
            className="text-xs whitespace-nowrap self-start sm:self-auto border-border bg-white dark:bg-[#161c24] text-foreground hover:bg-surface-muted shadow-2xs cursor-pointer"
          >
            Refresh Stages
          </Button>
        </div>

        {/* Stages Content */}
        {loading ? (
          <div className="py-16 flex flex-col justify-center items-center gap-2 text-foreground-muted text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-fairway-600" />
            <span>Loading pipeline configuration...</span>
          </div>
        ) : stages.length === 0 ? (
          <div className="py-12 text-center text-foreground-muted text-xs bg-surface-muted/30 dark:bg-[#161c24] rounded-xl border border-border">
            <Kanban className="w-8 h-8 text-foreground-muted mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-foreground">No pipeline stages configured</p>
            <p className="text-[11px] text-foreground-muted mt-0.5">Stages defined in PostgreSQL will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
            {stages.map((st, idx) => {
              const orderNum = st.order ?? idx + 1;
              const formattedOrder = String(orderNum).padStart(2, '0');
              const category = getStageCategory(orderNum);
              const isWon = st.key === 'won';
              const isLost = st.key === 'lost';

              return (
                <div
                  key={st.key}
                  className="flex flex-col justify-between p-4 border border-border dark:border-white/[0.08] rounded-xl bg-surface hover:border-fairway-500/50 hover:shadow-card transition-all shadow-2xs group text-left"
                >
                  <div>
                    {/* Top Row: Step badge, category pill, key code */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/70">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-xs"
                          style={{
                            backgroundColor: `${st.color}15`,
                            color: st.color,
                            border: `1px solid ${st.color}35`,
                          }}
                        >
                          {formattedOrder}
                        </span>
                        <span className="font-mono text-[10px] text-foreground-muted bg-surface-muted px-2 py-0.5 rounded-md border border-border">
                          {st.key}
                        </span>
                      </div>

                      <span className="text-[10px] font-semibold text-foreground-muted">
                        {category}
                      </span>
                    </div>

                    {/* Stage Title and Description */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: st.color }}
                        />
                        <h4 className="font-bold text-sm text-foreground group-hover:text-fairway-600 dark:group-hover:text-fairway-400 transition-colors">
                          {st.label}
                        </h4>
                        {isWon && (
                          <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.2 rounded-full border border-emerald-500/25">
                            Success
                          </span>
                        )}
                        {isLost && (
                          <span className="text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.2 rounded-full border border-rose-500/25">
                            Closed
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-foreground-muted mt-2 leading-relaxed">
                        {st.description || 'Standard pipeline milestone tracking lead progress toward lease agreement.'}
                      </p>
                    </div>
                  </div>

                  {/* Footer status bar */}
                  <div className="mt-4 pt-2.5 border-t border-border/70 flex items-center justify-between text-[11px] text-foreground-muted">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Stage Active</span>
                    </span>
                    <span className="text-[10px] font-mono text-foreground-muted/80">
                      Step {orderNum} of {stages.length}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PipelineStagesTab;
