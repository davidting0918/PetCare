import React from 'react';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ title, description }) => {
  return (
    <div className="p-6 text-center">
      <div className="card-3d p-8">
        <div className="mb-4">
          <div className="w-16 h-16 bg-orange/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Construction className="w-8 h-8 text-orange" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
          <p className="text-gray-600">
            {description || 'This feature is coming soon! We\'re working hard to bring you the best pet care experience.'}
          </p>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">
            In the meantime, you can explore other features from the navigation below.
          </p>
        </div>
      </div>
    </div>
  );
};
