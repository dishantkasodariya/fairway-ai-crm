import React from 'react';
import { Compass, ArrowLeft } from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';

export interface NotFoundPageProps {
  onGoHome?: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-fairway-100 flex items-center justify-center text-fairway-700 shadow-subtle mb-2">
        <Compass className="w-8 h-8 animate-spin-slow" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground">404</h1>
      <h2 className="text-lg font-semibold text-foreground">Page Not Found</h2>
      <p className="text-sm text-foreground-muted max-w-md">
        The requested view or resource could not be found. Please navigate back to the dashboard.
      </p>
      {onGoHome && (
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={onGoHome} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotFoundPage;
