import React from 'react';
import { PhoneCall, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';

export interface CallEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onNewCall: () => void;
}

export const CallEmptyState: React.FC<CallEmptyStateProps> = ({
  hasFilters,
  onClearFilters,
  onNewCall,
}) => {
  return (
    <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-4 shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-fairway-50 text-fairway-600 dark:bg-fairway-950 dark:text-fairway-400 flex items-center justify-center mx-auto border border-fairway-200 dark:border-fairway-800 shadow-2xs">
        <PhoneCall className="w-7 h-7" />
      </div>

      <div className="space-y-1 max-w-sm mx-auto">
        <h3 className="text-base font-bold text-foreground tracking-tight">
          {hasFilters ? 'No Matching Calls Found' : 'No Call Records Logged Yet'}
        </h3>
        <p className="text-xs text-foreground-muted leading-relaxed">
          {hasFilters
            ? 'Try adjusting your search query, call type filters, or status selection.'
            : 'Schedule an upcoming client phone call or log notes from a completed customer conversation.'}
        </p>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
        {hasFilters ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onClearFilters}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs rounded-xl"
          >
            Clear All Filters
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            onClick={onNewCall}
            leftIcon={<Plus className="w-4 h-4" />}
            className="text-xs rounded-xl bg-fairway-600 hover:bg-fairway-700 text-white font-bold"
          >
            Schedule a Call
          </Button>
        )}
      </div>
    </div>
  );
};

export default CallEmptyState;
