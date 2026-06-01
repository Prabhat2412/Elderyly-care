import dayjs, { Dayjs } from 'dayjs';

/** Real-world flexibility: complete up to this many minutes before/after scheduled time. */
export const SCHEDULE_GRACE_MINUTES = 20;
export const AUTO_MISS_MINUTES = 30;
export const ELDERLY_COMPLETE_LIMIT_MINUTES = 120;
export const LIVE_COUNTDOWN_THRESHOLD_SECONDS = 60 * 60;

export type TaskVisualStatus =
  | 'upcoming'
  | 'due-soon'
  | 'in-window'
  | 'overdue'
  | 'auto-miss-due'
  | 'late-blocked';

export function normalizeScheduledTime(scheduledTime: string): string {
  return scheduledTime.length === 5 ? `${scheduledTime}:00` : scheduledTime;
}

export function getTaskDueAt(scheduledTime: string, now = dayjs()): Dayjs {
  const today = now.format('YYYY-MM-DD');
  return dayjs(`${today} ${normalizeScheduledTime(scheduledTime)}`);
}

export function getActionWindowOpensAt(scheduledTime: string, now = dayjs()): Dayjs {
  return getTaskDueAt(scheduledTime, now).subtract(SCHEDULE_GRACE_MINUTES, 'minute');
}

export function getActionWindowClosesAt(scheduledTime: string, now = dayjs()): Dayjs {
  return getTaskDueAt(scheduledTime, now).add(SCHEDULE_GRACE_MINUTES, 'minute');
}

export function getSecondsUntilActionOpens(scheduledTime: string, now = dayjs()): number {
  return getActionWindowOpensAt(scheduledTime, now).diff(now, 'second');
}

export function getSecondsUntilGraceWindowEnds(scheduledTime: string, now = dayjs()): number {
  return getActionWindowClosesAt(scheduledTime, now).diff(now, 'second');
}

export function getSecondsUntilDue(scheduledTime: string, now = dayjs()): number {
  return getTaskDueAt(scheduledTime, now).diff(now, 'second');
}

export function getMinutesPastDue(scheduledTime: string, now = dayjs()): number {
  return now.diff(getTaskDueAt(scheduledTime, now), 'minute');
}

export function formatGraceWindowRange(scheduledTime: string): string {
  const due = getTaskDueAt(scheduledTime);
  const open = due.subtract(SCHEDULE_GRACE_MINUTES, 'minute');
  const close = due.add(SCHEDULE_GRACE_MINUTES, 'minute');
  return `${open.format('HH:mm')} – ${close.format('HH:mm')}`;
}

export function formatTimeRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Due now';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatLiveCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function isWithinGraceWindow(scheduledTime: string, now = dayjs()): boolean {
  const mpd = getMinutesPastDue(scheduledTime, now);
  return mpd >= -SCHEDULE_GRACE_MINUTES && mpd <= SCHEDULE_GRACE_MINUTES;
}

export function isActionWindowOpen(scheduledTime: string, now = dayjs()): boolean {
  return getMinutesPastDue(scheduledTime, now) >= -SCHEDULE_GRACE_MINUTES;
}

/** @deprecated Use isActionWindowOpen — kept for gradual migration */
export function isTaskDue(scheduledTime: string, now = dayjs()): boolean {
  return isActionWindowOpen(scheduledTime, now);
}

export function getTaskVisualStatus(
  scheduledTime: string,
  isMissed: boolean,
  isCompleted: boolean,
  now = dayjs()
): TaskVisualStatus {
  if (isCompleted || isMissed) return 'upcoming';

  const minutesPastDue = getMinutesPastDue(scheduledTime, now);

  if (minutesPastDue < -SCHEDULE_GRACE_MINUTES) return 'upcoming';
  if (minutesPastDue < 0) return 'due-soon';
  if (minutesPastDue <= SCHEDULE_GRACE_MINUTES) return 'in-window';
  if (minutesPastDue >= ELDERLY_COMPLETE_LIMIT_MINUTES) return 'late-blocked';
  if (minutesPastDue >= AUTO_MISS_MINUTES) return 'auto-miss-due';
  return 'overdue';
}

export function canMarkTaskComplete(
  task: { is_completed?: boolean; scheduled_time: string },
  now = dayjs()
): boolean {
  if (task.is_completed) return false;
  return getMinutesPastDue(task.scheduled_time, now) >= -SCHEDULE_GRACE_MINUTES;
}

export function canMarkTaskMissed(
  task: { is_completed?: boolean; is_missed?: boolean; scheduled_time: string },
  now = dayjs()
): boolean {
  if (task.is_completed || task.is_missed) return false;
  return getMinutesPastDue(task.scheduled_time, now) >= 0;
}

/** Elderly: complete within ±grace window (and not after 2h / missed). */
export function canElderlyComplete(
  task: { is_missed?: boolean; is_completed?: boolean; scheduled_time: string },
  now = dayjs()
): boolean {
  if (!canMarkTaskComplete(task, now) || task.is_missed) return false;
  const mpd = getMinutesPastDue(task.scheduled_time, now);
  return mpd <= SCHEDULE_GRACE_MINUTES;
}

/** Caregiver/family: may complete from grace-before through late/missed recovery. */
export function canCaregiverComplete(
  task: { is_completed?: boolean; is_missed?: boolean; scheduled_time: string },
  now = dayjs()
): boolean {
  if (task.is_completed) return false;
  return canMarkTaskComplete(task, now);
}

export function shouldAutoMiss(
  task: { is_missed?: boolean; is_completed?: boolean; scheduled_time: string },
  now = dayjs()
): boolean {
  if (task.is_completed || task.is_missed) return false;
  return getMinutesPastDue(task.scheduled_time, now) >= AUTO_MISS_MINUTES;
}

export function canCaregiverActOnTask(task: { is_completed?: boolean }): boolean {
  return !task.is_completed;
}

export function computeAdherencePercent(
  tasks: { is_completed?: boolean; is_missed?: boolean }[]
): number {
  if (tasks.length === 0) return 100;
  const completed = tasks.filter((t) => t.is_completed).length;
  return Math.round((completed / tasks.length) * 100);
}

export function toLocalIso(iso: string | null | undefined): string | null | undefined {
  if (!iso) return iso;
  return iso.replace(/(Z|[+-]\d{2}:\d{2})$/, '');
}