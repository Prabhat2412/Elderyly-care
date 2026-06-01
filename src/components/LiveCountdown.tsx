import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  formatLiveCountdown,
  formatTimeRemaining,
  getSecondsUntilActionOpens,
  getSecondsUntilGraceWindowEnds,
  isActionWindowOpen,
  isWithinGraceWindow,
  LIVE_COUNTDOWN_THRESHOLD_SECONDS,
  SCHEDULE_GRACE_MINUTES,
} from '../lib/taskTiming';
import dayjs from 'dayjs';

interface LiveCountdownProps {
  scheduledTime?: string;
  targetIso?: string | null;
  variant?: 'elderly' | 'caregiver' | 'med';
  label?: string;
  className?: string;
  /** Apply ±grace to medication ISO targets (opens early, same as tasks). */
  useGraceWindow?: boolean;
}

function getMedSecondsUntilOpen(targetIso: string): number {
  const localIso = targetIso.replace(/(Z|[+-]\d{2}:\d{2})$/, '');
  return dayjs(localIso).subtract(SCHEDULE_GRACE_MINUTES, 'minute').diff(dayjs(), 'second');
}

function getMedSecondsUntilWindowEnd(targetIso: string): number {
  const localIso = targetIso.replace(/(Z|[+-]\d{2}:\d{2})$/, '');
  return dayjs(localIso).add(SCHEDULE_GRACE_MINUTES, 'minute').diff(dayjs(), 'second');
}

export function LiveCountdown({
  scheduledTime,
  targetIso,
  variant = 'elderly',
  label = 'Time remaining',
  className,
  useGraceWindow = true,
}: LiveCountdownProps) {
  const computeState = () => {
    if (targetIso && useGraceWindow) {
      const untilOpen = getMedSecondsUntilOpen(targetIso);
      const untilWindowEnd = getMedSecondsUntilWindowEnd(targetIso);
      const inWindow = untilOpen <= 0 && untilWindowEnd > 0;
      return {
        secondsLeft: untilOpen > 0 ? untilOpen : untilWindowEnd,
        phase: untilOpen > 0 ? ('before' as const) : inWindow ? ('in' as const) : ('after' as const),
      };
    }
    if (scheduledTime) {
      const untilOpen = getSecondsUntilActionOpens(scheduledTime);
      const untilEnd = getSecondsUntilGraceWindowEnds(scheduledTime);
      const inWindow = isWithinGraceWindow(scheduledTime);
      const open = isActionWindowOpen(scheduledTime);
      return {
        secondsLeft: untilOpen > 0 ? untilOpen : untilEnd,
        phase: untilOpen > 0 ? ('before' as const) : inWindow ? ('in' as const) : open ? ('after' as const) : ('after' as const),
      };
    }
    return { secondsLeft: 0, phase: 'after' as const };
  };

  const [state, setState] = useState(computeState);

  useEffect(() => {
    const tick = () => setState(computeState());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [scheduledTime, targetIso, useGraceWindow]);

  const { secondsLeft, phase } = state;
  const isLive = secondsLeft > 0 && secondsLeft <= LIVE_COUNTDOWN_THRESHOLD_SECONDS;
  const isPast = secondsLeft <= 0 && phase !== 'before';

  let displayLabel = label;
  if (phase === 'before') {
    displayLabel = `Opens in (${SCHEDULE_GRACE_MINUTES} min early OK)`;
  } else if (phase === 'in') {
    displayLabel = 'In your window — mark now';
  } else if (phase === 'after') {
    displayLabel = 'Window ended';
  }

  const display =
    phase === 'in' && secondsLeft > 0
      ? isLive
        ? formatLiveCountdown(secondsLeft)
        : formatTimeRemaining(secondsLeft)
      : phase === 'before' && secondsLeft > 0
        ? isLive
          ? formatLiveCountdown(secondsLeft)
          : formatTimeRemaining(secondsLeft)
        : phase === 'in'
          ? 'Now'
          : isPast
            ? 'Ready'
            : isLive
              ? formatLiveCountdown(Math.max(0, secondsLeft))
              : formatTimeRemaining(Math.max(0, secondsLeft));

  const styles = {
    elderly: cn(
      'rounded-xl px-3 py-2 flex items-center gap-2',
      phase === 'in' ? 'bg-green-500/30 border border-green-300/50' : 'bg-white/15 border border-white/25'
    ),
    caregiver: cn(
      'rounded-xl px-3 py-2 flex items-center gap-2',
      phase === 'in' ? 'bg-green-50 border border-green-200' : 'bg-indigo-50 border border-indigo-100'
    ),
    med: cn(
      'rounded-2xl px-4 py-3 text-right min-w-[120px]',
      phase === 'in' ? 'bg-green-50 border-2 border-green-200' : isLive ? 'bg-rose-50 border-2 border-rose-200' : 'bg-gray-50 border border-gray-100'
    ),
  };

  const textStyles = {
    elderly: phase === 'in' ? 'text-green-100' : 'text-rose-50',
    caregiver: phase === 'in' ? 'text-green-700' : 'text-indigo-700',
    med: phase === 'in' ? 'text-green-700' : isLive ? 'text-rose-600' : 'text-gray-600',
  };

  return (
    <div className={cn(styles[variant], className)}>
      {variant !== 'med' && <Clock className={cn('w-4 h-4 shrink-0', textStyles[variant])} />}
      <div className={variant === 'med' ? 'w-full' : ''}>
        <p
          className={cn(
            'text-[10px] font-black uppercase tracking-widest leading-tight',
            variant === 'med' ? 'text-gray-400' : textStyles[variant],
            'opacity-90'
          )}
        >
          {displayLabel}
        </p>
        <p
          className={cn(
            'font-black tabular-nums leading-tight',
            variant === 'med' ? (isLive || phase === 'in' ? 'text-3xl sm:text-4xl' : 'text-2xl') : 'text-sm',
            textStyles[variant]
          )}
        >
          {display}
        </p>
      </div>
    </div>
  );
}
