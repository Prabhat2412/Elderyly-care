import React, { useState } from 'react';
import { useLocationTracker } from '../../hooks/useLocationTracker';
import { motion } from 'framer-motion';
import { MapPin, CheckCircle, Pill, CheckCircle2, ChevronRight, AlertCircle, Bell, Smile, Phone, ShieldAlert, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DailyCheckIn, DailyTask, CaregiverAlert } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { useDataStore } from '../../store/useDataStore';
import { TaskCard } from '../TaskCard';
import { NextMedicationCard } from '../NextMedicationCard';
import { LiveCountdown } from '../LiveCountdown';
import { VitalReadingModal } from '../VitalReadingModal';
import { VitalReadingForm } from '../VitalReadingForm';
import { VitalReadingPayload, taskRequiresReading } from '../../lib/vitalMetrics';
import {
  canElderlyComplete,
  canMarkTaskComplete,
  canMarkTaskMissed,
  formatGraceWindowRange,
  toLocalIso,
  getTaskVisualStatus,
  isActionWindowOpen,
  SCHEDULE_GRACE_MINUTES,
} from '../../lib/taskTiming';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

export function ElderlyFlow({ view, setView, onCheckin, onEmergency, checkins, medications, alerts }: {
  view: string,
  setView: (v: any) => void,
  onCheckin: (d: any) => void,
  onEmergency: () => void,
  checkins: DailyCheckIn[],
  medications: any[],
  alerts: CaregiverAlert[]
}) {
  const { user } = useAuthStore();
  const {
    schedules,
    completeTask,
    markTaskMissed,
    safeZoneActive,
    toggleSafeZone,
    fetchHealthLogs,
  } = useDataStore();
  const [vitalTask, setVitalTask] = useState<DailyTask | null>(null);
  const [vitalSubmitting, setVitalSubmitting] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);

  // Automatically track and upload GPS location in the background
  useLocationTracker(true, (date) => setLastLocationUpdate(date));

  const handleVitalSubmit = async (reading: VitalReadingPayload) => {
    if (!vitalTask) return;
    setVitalSubmitting(true);
    const ok = await completeTask(
      vitalTask.id,
      vitalTask.original_id,
      vitalTask.type,
      vitalTask.scheduled_time,
      { reading }
    );
    setVitalSubmitting(false);
    if (ok) {
      setVitalTask(null);
      if (user) fetchHealthLogs(user.id);
    }
  };

  if (view === 'checkin') {
    return <ElderlyCheckin onComplete={(data) => { onCheckin(data); setView('home'); }} onBack={() => setView('home')} />;
  }

  if (view === 'meds') {
    return <ElderlyMeds meds={medications} schedules={schedules} onBack={() => setView('home')} />;
  }

  const nextMed = medications
    .filter(m => m.next_dose)
    .sort((a, b) => dayjs(toLocalIso(a.next_dose)).diff(dayjs(toLocalIso(b.next_dose))))[0];

  const now = dayjs();
  const pendingTasks = (schedules || []).filter((s) => !s.is_completed && !s.is_missed);
  const missedTasks = (schedules || []).filter((s) => s.is_missed && !s.is_completed);
  const completedTasks = (schedules || []).filter((s) => s.is_completed);

  const overdueTasks = pendingTasks.filter((s) => {
    const status = getTaskVisualStatus(s.scheduled_time, false, false, now);
    return status === 'overdue' || status === 'auto-miss-due' || status === 'late-blocked';
  });

  const activeReminders = (alerts || []).filter((a) => !a.resolved);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Location Sharing Status Card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-[28px] p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-200 shrink-0">
              <MapPin className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-black text-gray-800 text-lg">Location Sharing</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500 text-white text-[11px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Live
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600 font-medium">
                  <span className="font-bold text-gray-700">Status:</span> Sharing Live Location
                </p>
                <p className="text-sm text-gray-600 font-medium">
                  <span className="font-bold text-gray-700">Shared With:</span> Registered Caregiver &amp; Family Members
                </p>
                <p className="text-sm text-gray-500 font-medium">
                  <span className="font-bold text-gray-600">Last Updated:</span>{' '}
                  {lastLocationUpdate ? lastLocationUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Updating...'}
                </p>
              </div>
            </div>
            <CheckCircle className="w-6 h-6 text-green-500 shrink-0 mt-1" />
          </div>
          <p className="mt-4 text-xs text-green-700 font-medium bg-green-100 rounded-xl px-3 py-2">
            Your location is automatically shared with your registered caregiver and family members. No manual updates required.
          </p>
        </div>

        {overdueTasks.length > 0 && (
          <div className="bg-rose-100 border-l-4 border-rose-500 p-4 rounded-r-2xl mb-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span className="font-black text-rose-800 uppercase tracking-widest text-xs">Overdue Tasks</span>
            </div>
            <p className="text-rose-900 font-bold">You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}. Please mark them as completed or missed.</p>
          </div>
        )}

        {activeReminders.length > 0 && (
          <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded-r-2xl mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-amber-600 animate-pulse" />
              <span className="font-black text-amber-800 uppercase tracking-widest text-xs">Reminder</span>
            </div>
            {activeReminders.map(r => (
              <p key={r.id} className="text-amber-900 font-bold mb-1">{r.message}</p>
            ))}
          </div>
        )}

        <div className="bg-gradient-to-br from-rose-500 to-orange-400 p-6 sm:p-8 rounded-[40px] text-white shadow-2xl shadow-rose-200 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl font-black mb-2">Good morning!</h2>
            <p className="text-rose-100 text-lg font-medium opacity-90">
              {pendingTasks.length > 0 ? `You have ${pendingTasks.length} tasks for today.` : "You're all caught up!"}
            </p>

            <div className="mt-8 space-y-3">
              {pendingTasks.map((s: DailyTask) => (
                <TaskCard
                  key={s.id}
                  task={s}
                  variant="elderly"
                  onComplete={() => completeTask(s.id, s.original_id, s.type, s.scheduled_time)}
                  onMiss={() => markTaskMissed(s.id, s.original_id, s.type, s.title, s.scheduled_time)}
                  onRecordReading={() => setVitalTask(s)}
                />
              ))}
              {pendingTasks.length === 0 && (
                <div className="p-6 bg-white/10 rounded-2xl text-center border border-white/10">
                  <Smile className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-bold">Everything is done for now!</p>
                </div>
              )}
            </div>

            {/* Missed Tasks Summary */}
            {missedTasks.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/20">
                <p className="text-xs font-black uppercase tracking-widest text-rose-200 mb-3">Missed Today ({missedTasks.length})</p>
                {missedTasks.map(s => (
                  <div key={s.id} className="flex items-center gap-3 py-2 opacity-60">
                    <XCircle className="w-5 h-5 text-rose-200" />
                    <span className="font-bold text-sm line-through">{s.title}</span>
                    <span className="text-xs opacity-70 ml-auto">{s.scheduled_time.substring(0, 5)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Completed Tasks Summary */}
            {completedTasks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-xs font-black uppercase tracking-widest text-green-200 mb-3">Completed ({completedTasks.length})</p>
                {completedTasks.map(s => (
                  <div key={s.id} className="flex items-center gap-3 py-2 opacity-60">
                    <CheckCircle2 className="w-5 h-5 text-green-200" />
                    <span className="font-bold text-sm line-through">{s.title}</span>
                    <span className="text-xs opacity-70 ml-auto">{s.scheduled_time.substring(0, 5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        </div>

        {nextMed?.next_dose && (
          <NextMedicationCard
            name={nextMed.name}
            dosage={nextMed.dosage}
            nextDoseIso={nextMed.next_dose}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setView('meds')}
            className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4 hover:border-rose-200 transition-all group"
          >
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Pill className="w-10 h-10" />
            </div>
            <span className="text-2xl font-bold">My Medicines</span>
          </button>

          <button
            className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4 hover:border-rose-200 transition-all group"
          >
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="w-10 h-10" />
            </div>
            <span className="text-2xl font-bold">Call Family</span>
          </button>
        </div>

        <div className="pt-4">
          <button
            onClick={onEmergency}
            className="w-full py-10 bg-rose-600 text-white rounded-[40px] shadow-2xl shadow-rose-200 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group animate-pulse"
          >
            <ShieldAlert className="w-16 h-16 mb-2" />
            <span className="text-4xl font-black uppercase tracking-tighter">Emergency Help</span>
            <p className="text-rose-200 font-bold opacity-80 uppercase tracking-widest text-xs">Press if you need help</p>
          </button>
        </div>
      </motion.div>

      <VitalReadingModal
        task={vitalTask}
        open={!!vitalTask}
        onClose={() => setVitalTask(null)}
        onSubmit={handleVitalSubmit}
        isSubmitting={vitalSubmitting}
      />
    </>
  );
}

export function ElderlyCheckin({ onComplete, onBack }: { onComplete: (d: any) => void, onBack: () => void }) {
  const { user } = useAuthStore();
  const { schedules, completeTask, markTaskMissed, fetchHealthLogs } = useDataStore();
  const [initialTasks] = useState((schedules || []).filter((s) => !s.is_completed && !s.is_missed));
  const [step, setStep] = useState(0);
  const [recordingVital, setRecordingVital] = useState(false);

  const isWellbeingStep = step >= initialTasks.length;

  const handleNextTask = async (didComplete: boolean) => {
    const task = initialTasks[step] as DailyTask;
    if (didComplete) {
      if (!canElderlyComplete(task)) {
        return;
      }
      if (taskRequiresReading(task)) {
        setRecordingVital(true);
        return;
      }
      await completeTask(task.id, task.original_id, task.type, task.scheduled_time);
      setStep(step + 1);
    } else {
      if (!canMarkTaskMissed(task)) {
        return;
      }
      const ok = await markTaskMissed(task.id, task.original_id, task.type, task.title, task.scheduled_time);
      if (ok) setStep(step + 1);
    }
  };

  const handleVitalRecorded = async (reading: VitalReadingPayload) => {
    const task = initialTasks[step] as DailyTask;
    const ok = await completeTask(task.id, task.original_id, task.type, task.scheduled_time, { reading });
    if (ok) {
      setRecordingVital(false);
      setStep(step + 1);
      if (user) fetchHealthLogs(user.id);
    }
  };

  const handleWellbeing = (mood: string) => {
    onComplete({ mood });
  };

  if (isWellbeingStep) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="min-h-[70vh] flex flex-col"
      >
        <button onClick={onBack} className="self-start mb-8 text-gray-400 font-bold flex items-center gap-2">
          <ChevronRight className="rotate-180 w-5 h-5" /> Back
        </button>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-32 h-32 rounded-[40px] flex items-center justify-center text-white mb-8 shadow-2xl bg-indigo-500">
            <Smile className="w-16 h-16" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black mb-12 tracking-tighter">How are you feeling today?</h2>

          <div className="grid grid-cols-1 w-full gap-4 px-4">
            <button onClick={() => handleWellbeing('Happy')} className="py-8 bg-green-500 text-white rounded-[40px] text-3xl font-black shadow-xl shadow-green-100 active:scale-95 transition-all">Good / Happy</button>
            <button onClick={() => handleWellbeing('Neutral')} className="py-8 bg-blue-500 text-white rounded-[40px] text-3xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all">Okay / Neutral</button>
            <button onClick={() => handleWellbeing('Sad')} className="py-8 bg-white border-4 border-gray-100 text-gray-400 rounded-[40px] text-3xl font-black active:scale-95 transition-all">Not Great / Sad</button>
          </div>
        </div>
      </motion.div>
    );
  }

  const currentTask = initialTasks[step] as DailyTask;
  const elderlyCanComplete = canElderlyComplete(currentTask);
  const taskCanMiss = canMarkTaskMissed(currentTask);
  const actionOpen = isActionWindowOpen(currentTask.scheduled_time);

  if (recordingVital && currentTask) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[70vh] flex flex-col p-4">
        <button onClick={() => setRecordingVital(false)} className="self-start mb-6 text-gray-400 font-bold flex items-center gap-2">
          <ChevronRight className="rotate-180 w-5 h-5" /> Back
        </button>
        <div className="bg-white rounded-[40px] border border-gray-100 p-6 sm:p-8 shadow-sm flex-1">
          <h2 className="text-2xl font-black mb-2">{currentTask.title}</h2>
          <p className="text-gray-500 font-medium mb-6">Enter your reading to complete this task.</p>
          <VitalReadingForm
            metricType={currentTask.metric_type}
            taskTitle={currentTask.title}
            onSubmit={handleVitalRecorded}
            onCancel={() => setRecordingVital(false)}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-[70vh] flex flex-col"
    >
      <button onClick={onBack} className="self-start mb-8 text-gray-400 font-bold flex items-center gap-2">
        <ChevronRight className="rotate-180 w-5 h-5" /> Back
      </button>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-32 h-32 rounded-[40px] flex items-center justify-center text-white mb-8 shadow-2xl bg-rose-500">
          {currentTask.type === 'medication' ? <Pill className="w-16 h-16" /> : <CheckCircle2 className="w-16 h-16" />}
        </div>
        <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tighter px-2">{currentTask.title}</h2>
        <p className="text-lg text-gray-500 font-bold mb-2">
          Target {currentTask.scheduled_time.substring(0, 5)} · ±{SCHEDULE_GRACE_MINUTES} min window
        </p>
        <p className="text-sm text-gray-400 font-medium mb-6">{formatGraceWindowRange(currentTask.scheduled_time)}</p>

        {!actionOpen && (
          <div className="w-full max-w-sm mb-8 px-4">
            <LiveCountdown scheduledTime={currentTask.scheduled_time} variant="caregiver" />
            <p className="text-sm text-gray-500 font-medium mt-4">
              You can mark complete up to {SCHEDULE_GRACE_MINUTES} minutes early, or missed after the scheduled time.
            </p>
          </div>
        )}

        {actionOpen && !elderlyCanComplete && !taskCanMiss && (
          <p className="text-rose-600 font-bold mb-6 px-4 text-base">
            Your flexible window has ended. Ask your caregiver or family to record completion.
          </p>
        )}

        {actionOpen && (
          <div className="grid grid-cols-1 w-full gap-4 px-4 max-w-md">
            {elderlyCanComplete && (
              <button
                type="button"
                onClick={() => handleNextTask(true)}
                className="min-h-[56px] py-6 bg-green-500 text-white rounded-[32px] text-2xl font-black shadow-xl shadow-green-100 active:scale-95 transition-all flex items-center justify-center gap-3 touch-manipulation"
              >
                <CheckCircle2 className="w-8 h-8" /> YES, DONE
              </button>
            )}
            {taskCanMiss && (
              <button
                type="button"
                onClick={() => handleNextTask(false)}
                className="min-h-[56px] py-6 bg-rose-500 text-white rounded-[32px] text-2xl font-black shadow-xl shadow-rose-100 active:scale-95 transition-all flex items-center justify-center gap-3 touch-manipulation"
              >
                <XCircle className="w-8 h-8" /> I MISSED IT
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ElderlyMeds({ meds, schedules, onBack }: { meds: any[], schedules: DailyTask[], onBack: () => void }) {
  const displayMeds = meds.length > 0 ? meds : [];
  const { completeTask } = useDataStore();

  const handleTakeMed = async (med: any) => {
    const todayTasks = (schedules || []).filter(
      (t) => t.type === 'medication' && t.original_id === med.id && !t.is_completed && !t.is_missed
    );
    const dueTask = todayTasks.find((t) => canMarkTaskComplete(t));

    if (dueTask) {
      await completeTask(dueTask.id, dueTask.original_id, 'medication', dueTask.scheduled_time);
      return;
    }
    if (todayTasks.length > 0) {
      toast.error('This dose is not due yet. See the countdown above.');
      return;
    }
    if (med.next_dose) {
      const localNextDose = med.next_dose.replace(/(Z|[+-]\d{2}:\d{2})$/, '');
      if (dayjs(localNextDose).diff(dayjs(), 'second') > 0) {
        toast.error('This dose is not due yet.');
        return;
      }
    }
    // Assume an ad-hoc or simple fallback, but normally Elderly should follow tasks.
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black tracking-tighter">My Medicines</h2>
        <button onClick={onBack} className="p-4 bg-gray-100 rounded-2xl font-bold">Close</button>
      </div>

      <div className="relative pl-8 space-y-6">
        {/* Vertical Timeline Line */}
        <div className="absolute left-3 top-4 bottom-4 w-1 bg-gray-100 rounded-full" />

        {displayMeds.sort((a, b) => dayjs(toLocalIso(a.next_dose) || 0).diff(dayjs(toLocalIso(b.next_dose) || 0))).map((med, i) => {
          const medTask = (schedules || []).find(
            (t) => t.type === 'medication' && t.original_id === med.id && !t.is_completed && !t.is_missed
          );
          const canTake = medTask ? canElderlyComplete(medTask) : false;

          return (
            <div key={med.id ?? i} className="relative bg-white p-5 sm:p-6 rounded-[32px] border border-gray-100 flex flex-col gap-4 shadow-sm">
              <div className="absolute -left-9 top-8 w-6 h-6 rounded-full bg-rose-100 border-4 border-white flex items-center justify-center hidden sm:flex">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn('w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center shrink-0 bg-gray-50', med.color || 'text-rose-500')}>
                    <Pill className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold truncate">{med.name}</p>
                    <p className="text-rose-500 font-black">{med.dosage}</p>
                  </div>
                </div>
                {med.next_dose && (
                  <LiveCountdown targetIso={med.next_dose} variant="med" label="Next dose" className="w-full sm:w-auto" />
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={!canTake && !!medTask}
                  onClick={() => handleTakeMed(med)}
                  className={cn(
                    'flex-1 min-h-[52px] py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 touch-manipulation transition-all',
                    canTake || !medTask
                      ? 'bg-green-500 text-white active:scale-95'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {canTake ? 'Mark taken' : medTask ? 'Not due yet' : 'Mark taken'}
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Instructions</p>
                <p className="font-medium text-gray-700">{med.instructions || 'No specific instructions.'}</p>
              </div>
            </div>
          );
        })}
        {displayMeds.length === 0 && <p className="text-center text-gray-400 py-12">No medications scheduled.</p>}
      </div>

      <div className="bg-blue-50 p-8 rounded-[40px] border border-blue-100 mt-12">
        <p className="text-blue-700 font-bold text-center text-lg">Your family will be notified when you take your pills! 💖</p>
      </div>
    </motion.div>
  );
}
