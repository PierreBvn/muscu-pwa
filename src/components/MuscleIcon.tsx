import type { MuscleGroup } from '../db/schema';
import abdos from '../assets/muscles/abdos.png';
import avantBras from '../assets/muscles/avant-bras.png';
import biceps from '../assets/muscles/biceps.png';
import epaules from '../assets/muscles/epaules.png';
import fessiers from '../assets/muscles/fessiers.png';
import grandDorsal from '../assets/muscles/grand-dorsal.png';
import ischios from '../assets/muscles/ischios.png';
import mollets from '../assets/muscles/mollets.png';
import pectoraux from '../assets/muscles/pectoraux.png';
import quadriceps from '../assets/muscles/quadriceps.png';
import triceps from '../assets/muscles/triceps.png';

const ICONS: Record<MuscleGroup, string> = {
  Pectoraux: pectoraux,
  Dos: grandDorsal,
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

export const MuscleIcon: React.FC<MuscleIconProps> = ({ group, className }) => {
  const iconUrl = ICONS[group];

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: 'inline-block',
        backgroundColor: 'currentColor',
        maskImage: `url(${iconUrl})`,
        WebkitMaskImage: `url(${iconUrl})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  );
};
