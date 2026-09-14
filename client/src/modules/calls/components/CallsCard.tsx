import React from 'react';
import { Call } from '@/modules/core/types';
import { CallCard, CallLineCard, CallCardSkeleton } from './CallCard';
import { CallEmptyState } from './CallEmptyState';

export interface CallsCardProps {
  calls: Call[];
  isLoading: boolean;
  mode?: 'grid' | 'line';
  hasFilters: boolean;
  onClearFilters: () => void;
  onNewCall: () => void;
  onSelectCall?: (id: string) => void;
  onEditCall?: (call: Call) => void;
  onToggleStatus?: (call: Call) => void;
  onDeleteCall?: (id: string) => void;
  pageSize?: number;
}

export const CallsCard: React.FC<CallsCardProps> = ({
  calls,
  isLoading,
  mode = 'grid',
  hasFilters,
  onClearFilters,
  onNewCall,
  onSelectCall,
  onEditCall,
  onToggleStatus,
  onDeleteCall,
  pageSize = 12,
}) => {
  if (isLoading) {
    if (mode === 'line') {
      return (
        <div className="space-y-2 animate-fade-in">
          {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
            <CallCardSkeleton key={i} mode="line" />
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
        {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
          <CallCardSkeleton key={i} mode="grid" />
        ))}
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <CallEmptyState
        hasFilters={hasFilters}
        onClearFilters={onClearFilters}
        onNewCall={onNewCall}
      />
    );
  }

  if (mode === 'line') {
    return (
      <div className="space-y-2 animate-fade-in">
        {calls.map((call) => (
          <CallLineCard
            key={call.id}
            call={call}
            onSelect={onSelectCall}
            onEdit={onEditCall}
            onToggleStatus={onToggleStatus}
            onDelete={onDeleteCall}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
      {calls.map((call) => (
        <CallCard
          key={call.id}
          call={call}
          onSelect={onSelectCall}
          onEdit={onEditCall}
          onToggleStatus={onToggleStatus}
          onDelete={onDeleteCall}
        />
      ))}
    </div>
  );
};

export default CallsCard;
