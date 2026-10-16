import { useState } from 'react';
import { TabBar, type TabId } from './components/TabBar';
import { ExerciseList } from './features/exercises/ExerciseList';
import { ProgramList } from './features/programs/ProgramList';

import { SeanceTab } from './features/session/SeanceTab';

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
            className="flex-1 flex flex-col"
          >
            <SeanceTab />
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
