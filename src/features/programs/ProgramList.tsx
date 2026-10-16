import React from 'react';

export const ProgramList: React.FC = () => {
  return (
    <div className="w-full max-w-md mx-auto min-h-svh bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Programmes
          </h1>
          <p className="text-xs text-zinc-400">
            Gérez vos routines d’entraînement
          </p>
        </div>
      </header>
      <main className="flex-1 px-4 py-5">
        <p className="text-sm text-zinc-400">Liste des programmes</p>
      </main>
    </div>
  );
};
