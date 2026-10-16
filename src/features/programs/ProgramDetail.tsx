import React from 'react';

interface ProgramDetailProps {
  programId: number;
  onBack: () => void;
}

export const ProgramDetail: React.FC<ProgramDetailProps> = ({ onBack }) => {
  return (
    <div className="w-full max-w-md mx-auto min-h-svh bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm font-semibold text-purple-400"
        >
          ← Programmes
        </button>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Détail du programme
        </h1>
      </header>
    </div>
  );
};
