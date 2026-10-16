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

  // Données réactives Dexie emballées dans un objet pour distinguer chargement (undefined) et absence
  const sessionResult = useLiveQuery(
    async () => ({ session: await getActiveSession() }),
    []
  );

  const activeSession = sessionResult?.session;

  const detailsResult = useLiveQuery(
    async () => {
      if (!activeSession?.id) return { details: null };
      return { details: await getSessionDetails(activeSession.id) };
    },
    [activeSession?.id]
  );

  const programResult = useLiveQuery(
    async () => {
      if (!activeSession?.programId) return { program: null };
      return { program: await getProgram(activeSession.programId) };
    },
    [activeSession?.programId]
  );

  const suggestedResult = useLiveQuery(
    async () => ({ suggested: await getSuggestedProgramForDate(now) }),
    [todayDate]
  );

  const allProgramsResult = useLiveQuery(
    async () => ({ programs: await getAllPrograms() }),
    []
  );

  // Tant que l'état initial de la session n'est pas résolu : rien n'est affiché
  if (sessionResult === undefined) {
    return null;
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

    // Séance active en cours (du jour, ou reprise) : tant que les détails ne sont pas chargés, rien n'est affiché
    if (detailsResult === undefined || programResult === undefined || !detailsResult.details) {
      return null;
    }

    return (
      <ActiveSessionView
        session={activeSession}
        details={detailsResult.details}
        program={programResult.program}
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
  // Tant que le programme suggéré ou la liste des programmes n'est pas chargé : rien n'est affiché
  if (suggestedResult === undefined || allProgramsResult === undefined) {
    return null;
  }

  return (
    <StartSessionView
      suggestedProgram={suggestedResult.suggested}
      allPrograms={allProgramsResult.programs ?? []}
      onStartProgram={async (programId) => {
        await startSession({ programId });
      }}
      onStartFreeSession={async () => {
        await startSession();
      }}
    />
  );
};
