import { useState } from 'react';
import { TabBar, type TabId } from './components/TabBar';
import { ExerciseList } from './features/exercises/ExerciseList';
import { ProgramList } from './features/programs/ProgramList';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('seance');

  return (
    <div className="min-h-svh bg-bg text-text flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="flex-1 flex flex-col">
        {activeTab === 'seance' && (
          <div
            role="tabpanel"
            id="panel-seance"
            aria-labelledby="tab-seance"
            className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-16 h-16 rounded-xl bg-surface border border-line flex items-center justify-center mb-4 text-gold">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8"
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
            </div>
            <h1 className="text-2xl font-semibold text-text mb-2 tracking-tight">
              Séance
            </h1>
            <p className="text-xs uppercase tracking-widest text-muted font-semibold mb-2">
              À venir
            </p>
            <p className="text-sm text-muted max-w-xs">
              La saisie de séance en direct sera disponible dans la prochaine version.
            </p>
          </div>
        )}

        {activeTab === 'programs' && (
          <div
            role="tabpanel"
            id="panel-programs"
            aria-labelledby="tab-programs"
            className="flex-1 flex flex-col"
          >
            <ProgramList />
          </div>
        )}

        {activeTab === 'exercises' && (
          <div
            role="tabpanel"
            id="panel-exercises"
            aria-labelledby="tab-exercises"
            className="flex-1 flex flex-col"
          >
            <ExerciseList />
          </div>
        )}
      </div>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
