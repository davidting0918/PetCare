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
    <div className="fixed bottom-0 left-0 right-0 bg-surface-1 border-t border-border-subtle shadow-elevated z-50">
      <div className="max-w-md lg:max-w-7xl mx-auto">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-colors duration-200 ${
                  isActive
                    ? 'text-accent-pink'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <Icon
                  className={`w-5 h-5 mb-1 transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}
                />
                <span className={`text-xs font-medium transition-colors duration-200 ${
                  isActive ? 'text-accent-pink' : 'text-text-tertiary'
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
