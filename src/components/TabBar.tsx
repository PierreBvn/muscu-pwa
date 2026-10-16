import React from 'react';

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
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path d="M6 4v16" />
          <path d="M18 4v16" />
          <path d="M2 9h4" />
          <path d="M2 15h4" />
          <path d="M18 9h4" />
          <path d="M18 15h4" />
          <path d="M6 12h12" />
        </svg>
      ),
    },
    {
      id: 'programs',
      label: 'Séances types',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
          <path d="M6 14h6" />
        </svg>
      ),
    },
    {
      id: 'exercises',
      label: 'Exercices',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      role="tablist"
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-md border-t border-line pb-[env(safe-area-inset-bottom)]"
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
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 px-3 py-1 transition ${
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
