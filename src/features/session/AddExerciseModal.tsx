import React from 'react';
import type { Exercise } from '../../db/schema';
import { ExercisePicker } from '../../components/ExercisePicker';

interface AddExerciseModalProps {
  isOpen: boolean;
  existingExerciseIds: number[];
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => Promise<void>;
}

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  isOpen,
  existingExerciseIds,
  onClose,
  onSelectExercise,
}) => {
  return (
    <ExercisePicker
      isOpen={isOpen}
      title="Ajouter un exercice"
      existingExerciseIds={existingExerciseIds}
      onClose={onClose}
      onSelectExercise={onSelectExercise}
    />
  );
};
