import React, { useState, useEffect } from 'react';
import { type TimerState, remaining, isExpired, formatTimer } from '../../timer';

interface RestBannerProps {
  timer?: TimerState;
  remainingSeconds?: number;
  onAddTime: () => void;
  onSkip: () => void;
  onExpire?: () => void;
}

export const RestBanner: React.FC<RestBannerProps> = ({
  timer,
  remainingSeconds: propRemainingSeconds,
  onAddTime,
  onSkip,
  onExpire,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer) return;

    const interval = window.setInterval(() => {
      const current = Date.now();
      if (isExpired(timer, current)) {
        clearInterval(interval);
        onExpire?.();
      } else {
        setNow(current);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [timer, onExpire]);

  const displaySeconds = timer ? remaining(timer, now) : (propRemainingSeconds ?? 0);

  return (
    <aside
      role="region"
      aria-label="Minuteur de repos"
      className="fixed bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom))] left-0 right-0 z-nav bg-surface/95 backdrop-blur-md border-t border-line"
    >
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-muted font-semibold">
            Repos
          </span>
          <span
            aria-label={`${displaySeconds} secondes restantes`}
            className="text-2xl font-bold tabular-nums text-gold tracking-tight"
          >
            {formatTimer(displaySeconds)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddTime}
            aria-label="Ajouter 30 secondes de repos"
            className="min-h-[44px] px-3.5 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text hover:bg-surface active:opacity-90 transition"
          >
            +30 s
          </button>

          <button
            type="button"
            onClick={onSkip}
            aria-label="Passer le temps de repos"
            className="min-h-[44px] px-3.5 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text hover:bg-surface active:opacity-90 transition"
          >
            Passer
          </button>
        </div>
      </div>
    </aside>
  );
};
