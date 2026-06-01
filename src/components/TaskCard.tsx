import React from 'react';
import { Activity, CheckCircle2, Clock, Pill, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { DailyTask } from '../types';
import {
  canCaregiverActOnTask,
  canCaregiverComplete,
  canElderlyComplete,
  canMarkTaskMissed,
  formatGraceWindowRange,
  getTaskVisualStatus,
  getMinutesPastDue,
  isActionWindowOpen,
  SCHEDULE_GRACE_MINUTES,
} from '../lib/taskTiming';
import { taskRequiresReading } from '../lib/vitalMetrics';
import { LiveCountdown } from './LiveCountdown';
import dayjs from 'dayjs';

interface TaskCardProps {
  task: DailyTask;
  variant?: 'elderly' | 'caregiver';
  onComplete?: () => void | Promise<any>;
  onMiss?: () => void | Promise<any>;
  onRecordReading?: () => void | Promise<any>;
  compact?: boolean;
}

export function TaskCard({
  task,
  variant = 'elderly',
  onComplete,
  onMiss,
  onRecordReading,
  compact = false,
}: TaskCardProps) {
  const needsReading = taskRequiresReading(task);
  const now = dayjs();
  const visualStatus = getTaskVisualStatus(task.scheduled_time, !!task.is_missed, !!task.is_completed, now);
  const actionOpen = isActionWindowOpen(task.scheduled_time, now);
  const elderlyCanComplete = canElderlyComplete(task, now);
  const caregiverCanComplete = canCaregiverComplete(task, now);
  const canMiss = canMarkTaskMissed(task, now);
  const showActions =
    (variant === 'caregiver' ? canCaregiverActOnTask(task) : !task.is_completed && !task.is_missed) &&
    (actionOpen || canMiss);

  const statusLabel =
    task.is_missed
      ? task.marked_by === 'auto'
        ? 'Auto-missed'
        : 'Missed'
      : visualStatus === 'upcoming'
        ? 'Scheduled'
        : visualStatus === 'due-soon'
          ? 'Early window'
          : visualStatus === 'in-window'
            ? 'In window'
            : visualStatus === 'late-blocked'
              ? 'Very overdue'
              : visualStatus === 'auto-miss-due'
                ? 'Overdue (30+ min)'
                : visualStatus === 'overdue'
                  ? 'Past window'
                  : null;

  const cardClass =
    variant === 'elderly'
      ? cn(
          'w-full p-4 backdrop-blur-md rounded-2xl transition-all border-2',
          task.is_missed && 'bg-white/10 border-white/20 opacity-70',
          !task.is_missed && visualStatus === 'upcoming' && 'bg-white/15 border-white/25',
          !task.is_missed && visualStatus === 'due-soon' && 'bg-amber-200/30 border-amber-300/50',
          !task.is_missed && visualStatus === 'in-window' && 'bg-green-200/35 border-green-300/60',
          !task.is_missed && visualStatus === 'overdue' && 'bg-rose-200/40 border-rose-300/60',
          !task.is_missed && visualStatus === 'auto-miss-due' && 'bg-orange-200/40 border-orange-400/70',
          !task.is_missed && visualStatus === 'late-blocked' && 'bg-rose-300/50 border-rose-500/80'
        )
      : cn(
          'p-4 rounded-2xl border transition-all',
          task.is_completed && 'bg-green-50 border-green-100 opacity-80',
          task.is_missed && !task.is_completed && 'bg-rose-50 border-rose-200',
          !task.is_completed && !task.is_missed && visualStatus === 'upcoming' && 'bg-slate-50 border-slate-200',
          !task.is_completed && !task.is_missed && visualStatus === 'in-window' && 'bg-green-50 border-green-200',
          !task.is_completed && !task.is_missed && visualStatus === 'overdue' && 'bg-amber-50 border-amber-200',
          !task.is_completed && !task.is_missed && 'bg-gray-50 border-gray-100'
        );

  const handleComplete = () => {
    if (needsReading && onRecordReading) {
      onRecordReading();
      return;
    }
    onComplete?.();
  };

  return (
    <div className={cardClass}>
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
            variant === 'elderly'
              ? visualStatus === 'in-window'
                ? 'bg-green-100 text-green-700'
                : visualStatus === 'upcoming' || visualStatus === 'due-soon'
                  ? 'bg-white/90 text-indigo-500'
                  : 'bg-rose-100 text-rose-600'
              : task.is_missed
                ? 'bg-rose-100 text-rose-600'
                : task.is_completed
                  ? 'bg-green-100 text-green-600'
                  : visualStatus === 'in-window'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-white text-indigo-500 shadow-sm'
          )}
        >
          {task.type === 'medication' ? (
            <Pill className="w-6 h-6" />
          ) : task.category === 'vital' ? (
            <Activity className="w-6 h-6" />
          ) : (
            <CheckCircle2 className="w-6 h-6" />
          )}
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className={cn('font-bold leading-snug', variant === 'caregiver' && 'text-gray-800')}>{task.title}</p>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <Clock className="w-3 h-3 opacity-70 shrink-0" />
            <p className="text-xs opacity-80">
              Target {task.scheduled_time.substring(0, 5)} · ±{SCHEDULE_GRACE_MINUTES}m
            </p>
            {statusLabel && (
              <span
                className={cn(
                  'text-[10px] font-black px-2 py-0.5 rounded-full uppercase',
                  visualStatus === 'in-window'
                    ? 'bg-green-500 text-white'
                    : visualStatus === 'upcoming' || visualStatus === 'due-soon'
                      ? 'bg-indigo-500 text-white'
                      : task.is_missed || visualStatus === 'late-blocked'
                        ? 'bg-rose-500 text-white'
                        : 'bg-orange-500 text-white'
                )}
              >
                {statusLabel}
              </span>
            )}
          </div>

          {!task.is_completed && !task.is_missed && (
            <div className="mt-3 space-y-2">
              <LiveCountdown scheduledTime={task.scheduled_time} variant={variant} />
              <p
                className={cn(
                  'text-[10px] font-semibold',
                  variant === 'elderly' ? 'text-rose-100/90' : 'text-gray-500'
                )}
              >
                Flexible window: {formatGraceWindowRange(task.scheduled_time)}
              </p>
            </div>
          )}

          {variant === 'elderly' && actionOpen && !elderlyCanComplete && !task.is_missed && (
            <p className="text-[11px] mt-2 font-semibold text-rose-100">
              Past your {SCHEDULE_GRACE_MINUTES}-minute window — ask family or caregiver to record.
            </p>
          )}
        </div>
      </div>

      {showActions && !compact && (
        <div className={cn('flex flex-col sm:flex-row gap-2', variant === 'elderly' ? 'pl-0 sm:pl-14' : '')}>
          {((variant === 'caregiver' && caregiverCanComplete) || elderlyCanComplete) && (
            <button
              type="button"
              onClick={handleComplete}
              className={cn(
                'flex-1 min-h-[48px] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all touch-manipulation',
                variant === 'elderly'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                  : 'bg-indigo-500 text-white'
              )}
            >
              <CheckCircle2 className="w-5 h-5" />
              {needsReading
                ? 'Record reading'
                : variant === 'caregiver' && task.is_missed
                  ? 'Mark complete'
                  : 'Done'}
            </button>
          )}
          {canMiss && (
            <button
              type="button"
              onClick={onMiss}
              className={cn(
                'flex-1 min-h-[48px] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all touch-manipulation',
                variant === 'elderly'
                  ? 'bg-white/30 text-white border-2 border-white/40'
                  : 'bg-rose-100 text-rose-700 border-2 border-rose-200'
              )}
            >
              <XCircle className="w-5 h-5" /> Missed
            </button>
          )}
        </div>
      )}

      {task.is_completed && variant === 'caregiver' && (
        <p className="text-xs font-bold text-green-600 uppercase tracking-widest mt-2">Completed</p>
      )}
      {task.is_missed && !task.is_completed && variant === 'caregiver' && (
        <p className="text-[10px] text-rose-500 font-semibold mt-2">
          {task.marked_by === 'auto' ? 'System auto-missed' : 'Marked missed'} — caregiver/family can still record
          completion.
        </p>
      )}
    </div>
  );
}
