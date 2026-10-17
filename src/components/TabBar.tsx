import React from 'react';
import { Dumbbell, ClipboardList, LayoutGrid } from 'lucide-react';

export type TabId = 'seance' | 'programs' | 'exercises';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'seance',
      label: 'Séance',
      icon: <Dumbbell size={24} strokeWidth={2} aria-hidden="true" />,
    },
    {
      id: 'programs',
      label: 'Séances types',
      icon: <ClipboardList size={24} strokeWidth={2} aria-hidden="true" />,
    },
    {
      id: 'exercises',
      label: 'Exercices',
      icon: <LayoutGrid size={24} strokeWidth={2} aria-hidden="true" />,
    },
  ];

  return (
    <nav
      role="tablist"
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-nav bg-bg/95 backdrop-blur-md border-t border-line pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-md mx-auto grid grid-cols-3 px-2 h-[var(--tabbar-height)] items-center">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center min-h-[48px] py-1 px-1 transition-colors"
            >
              <div
                className={`flex flex-col items-center justify-center gap-1 px-3 py-1 transition ${
                  isSelected
                    ? 'text-gold font-semibold'
                    : 'text-muted hover:text-text'
                }`}
              >
                <span className="flex items-center justify-center">
                  {tab.icon}
                </span>
                <span className="text-xs leading-tight">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
