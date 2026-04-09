import React from 'react';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ title, description }) => {
  return (
    <div className="p-6 text-center">
      <div className="surface-card p-8">
        <div className="mb-4">
          <div className="w-16 h-16 bg-accent-pink/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Construction className="w-8 h-8 text-accent-pink" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">{title}</h2>
          <p className="text-text-secondary">
            {description || 'This feature is coming soon! We\'re working hard to bring you the best pet care experience.'}
          </p>
        </div>

        <div className="mt-6 p-4 bg-surface-2 rounded-xl border border-border-subtle">
          <p className="text-sm text-text-tertiary">
            In the meantime, you can explore other features from the navigation below.
          </p>
        </div>
      </div>
    </div>
  );
};
