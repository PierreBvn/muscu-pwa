import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  getActiveSession,
  getSessionDetails,
  startSession,
  finishSession,
  closeForgottenSession,
  formatLocalDate,
} from '../../db/sessions';
import {
  getAllPrograms,
  getProgram,
} from '../../db/programs';
import { getSuggestedProgramForDate } from '../../db/suggestions';
import { StartSessionView } from './StartSessionView';
import { ForgottenSessionPrompt } from './ForgottenSessionPrompt';
import { ActiveSessionView } from './ActiveSessionView';

export const SeanceTab: React.FC = () => {
  const [hasResumed, setHasResumed] = useState(false);

  // Date locale actuelle pour comparer les dates de séance
  const now = new Date();
  const todayDate = formatLocalDate(now);

  // Données réactives Dexie
  const activeSession = useLiveQuery(
    async () => await getActiveSession(),
    [],
    null
  );

  const sessionDetails = useLiveQuery(
    async () => {
      if (!activeSession?.id) return null;
      return await getSessionDetails(activeSession.id);
    },
    [activeSession?.id],
    null
  );

  const sessionProgram = useLiveQuery(
    async () => {
      if (!activeSession?.programId) return null;
      return await getProgram(activeSession.programId);
    },
    [activeSession?.programId],
    null
  );

  const suggestedProgram = useLiveQuery(
    async () => await getSuggestedProgramForDate(now),
    [todayDate],
    undefined
  );

  const allPrograms = useLiveQuery(
    async () => await getAllPrograms(),
    [],
    undefined
  );

  // État de chargement initial
  if (activeSession === null && suggestedProgram === undefined) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-muted">
        Chargement...
      </div>
    );
  }

  // Cas 1 : Une séance non terminée existe
  if (activeSession) {
    const isForgotten = activeSession.date !== todayDate;

    // Si la séance date d'un jour antérieur et n'a pas encore été reprise
    if (isForgotten && !hasResumed) {
      return (
        <ForgottenSessionPrompt
          session={activeSession}
          onResume={() => setHasResumed(true)}
          onCloseSession={async () => {
            if (activeSession.id !== undefined) {
              await closeForgottenSession(activeSession.id);
            }
          }}
        />
      );
    }

    // Séance active en cours (du jour, ou reprise)
    if (!sessionDetails) {
      return (
        <div className="flex min-h-[300px] items-center justify-center text-sm text-muted">
          Chargement de la séance en cours...
        </div>
      );
    }

    return (
      <ActiveSessionView
        session={activeSession}
        details={sessionDetails}
        program={sessionProgram}
        onFinishSession={async () => {
          if (activeSession.id !== undefined) {
            await finishSession(activeSession.id);
            setHasResumed(false);
          }
        }}
      />
    );
  }

  // Cas 2 : Aucune séance en cours -> Démarrage
  return (
    <StartSessionView
      suggestedProgram={suggestedProgram}
      allPrograms={allPrograms ?? []}
      onStartProgram={async (programId) => {
        await startSession({ programId });
      }}
      onStartFreeSession={async () => {
        await startSession();
      }}
    />
  );
};
