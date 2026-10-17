import type { MuscleGroup } from '../db/schema';
import abdos from '../assets/muscles/abdos.png';
import avantBras from '../assets/muscles/avant-bras.png';
import biceps from '../assets/muscles/biceps.png';
import dos from '../assets/muscles/dos.png';
import epaules from '../assets/muscles/epaules.png';
import fessiers from '../assets/muscles/fessiers.png';
import ischios from '../assets/muscles/ischios.png';
import mollets from '../assets/muscles/mollets.png';
import pectoraux from '../assets/muscles/pectoraux.png';
import quadriceps from '../assets/muscles/quadriceps.png';
import triceps from '../assets/muscles/triceps.png';

const ICONS: Record<MuscleGroup, string> = {
  Pectoraux: pectoraux,
  Dos: dos,
  Épaules: epaules,
  Biceps: biceps,
  Triceps: triceps,
  'Avant-bras': avantBras,
  Abdos: abdos,
  Quadriceps: quadriceps,
  Ischios: ischios,
  Fessiers: fessiers,
  Mollets: mollets,
};

interface MuscleIconProps {
  group: MuscleGroup;
  className?: string;
}

export const MuscleIcon: React.FC<MuscleIconProps> = ({ group, className }) => (
  <img
    src={ICONS[group]}
    alt=""
    aria-hidden="true"
    className={className}
    draggable={false}
  />
);
