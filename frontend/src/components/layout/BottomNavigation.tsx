import React from 'react';
import {
  BarChart3,
  UtensilsCrossed,
  Pill,
  Scale,
  Settings,
  type LucideIcon
} from 'lucide-react';
import type { NavigationTab } from '../../types';

interface NavigationItem {
  id: NavigationTab;
  label: string;
  icon: LucideIcon;
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'meal', label: 'Meals', icon: UtensilsCrossed },
  { id: 'medicine', label: 'Medicine', icon: Pill },
  { id: 'weight', label: 'Weight', icon: Scale },
  { id: 'settings', label: 'Settings', icon: Settings }
];

interface BottomNavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-3d z-50">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-orange shadow-3d bg-orange/10'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon
                  className={`w-5 h-5 mb-1 transition-all duration-200 ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}
                />
                <span className={`text-xs font-medium transition-all duration-200 ${
                  isActive ? 'text-orange' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
