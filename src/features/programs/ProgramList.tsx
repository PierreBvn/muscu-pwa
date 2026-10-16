import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Program } from '../../db/schema';
import {
  getAllPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
} from '../../db/programs';
import { ProgramCard } from './ProgramCard';
import { ProgramModal } from './ProgramModal';
import { ProgramDetail } from './ProgramDetail';

export const ProgramList: React.FC = () => {
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);

  const programs = useLiveQuery(async () => await getAllPrograms(), [], undefined);

  if (selectedProgramId !== null) {
    return (
      <ProgramDetail
        programId={selectedProgramId}
        onBack={() => setSelectedProgramId(null)}
      />
    );
  }

  const handleOpenCreate = () => {
    setEditingProgram(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (program: Program) => {
    setEditingProgram(program);
    setIsModalOpen(true);
  };

  const handleSaveProgram = async (data: { name: string; weekdays: number[] }) => {
    if (editingProgram?.id) {
      await updateProgram(editingProgram.id, data);
    } else {
      await createProgram(data);
    }
  };

  const handleConfirmDelete = async () => {
    if (programToDelete?.id) {
      await deleteProgram(programToDelete.id);
      setProgramToDelete(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-svh bg-zinc-950 text-zinc-100 flex flex-col pb-12">
      <header className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Programmes
          </h1>
          <p className="text-xs text-zinc-400">
            Gérez vos routines d’entraînement
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 text-sm font-semibold text-white shadow-md shadow-purple-600/30 hover:bg-purple-500 active:bg-purple-700 transition"
        >
          <span className="text-lg leading-none">+</span>
          <span>Nouveau programme</span>
        </button>
      </header>

      <main className="flex-1 px-4 py-5">
        {programs === undefined ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-zinc-500">
            Chargement des programmes...
          </div>
        ) : programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[260px] text-center p-6 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800">
            <div className="w-12 h-12 rounded-xl bg-zinc-800/70 flex items-center justify-center text-zinc-400 mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
                aria-hidden="true"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              Aucun programme
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mb-4">
              Créez votre premier programme pour organiser vos séances hebdomadaires.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="min-h-[44px] px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-purple-400 transition"
            >
              Créer un programme
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onSelect={(p) => setSelectedProgramId(p.id ?? null)}
                onEdit={handleOpenEdit}
                onDelete={(p) => setProgramToDelete(p)}
              />
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <ProgramModal
          key={editingProgram?.id ?? 'new'}
          isOpen={isModalOpen}
          program={editingProgram}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProgram}
        />
      )}

      {programToDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-program-dialog-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/60 p-5 shadow-2xl">
            <h3
              id="delete-program-dialog-title"
              className="text-lg font-bold text-white mb-2"
            >
              Supprimer le programme ?
            </h3>
            <p className="text-sm text-zinc-300 mb-2">
              Êtes-vous sûr de vouloir supprimer{' '}
              <strong className="text-white font-semibold">
                « {programToDelete.name} »
              </strong>{' '}
              ?
            </p>
            <p className="text-xs text-emerald-400 font-medium mb-5 bg-emerald-950/40 border border-emerald-800/40 p-2.5 rounded-xl">
              ✓ Les séances passées sont conservées.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setProgramToDelete(null)}
                className="flex-1 min-h-[44px] items-center justify-center rounded-xl bg-zinc-800 text-sm font-medium text-zinc-300 hover:bg-zinc-700 active:bg-zinc-750 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 min-h-[44px] items-center justify-center rounded-xl bg-red-600 text-sm font-semibold text-white shadow-md shadow-red-600/30 hover:bg-red-500 active:bg-red-700 transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
