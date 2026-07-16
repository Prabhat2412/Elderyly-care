import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Phone, Bell, Activity, Pill, Home, FileText, ChevronRight, Smile, ShieldAlert, CheckCircle2, Heart, AlertCircle, Trash, UserCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';
import { TimelineView } from './TimelineView';
import { TaskCard } from './TaskCard';
import { VitalReadingModal } from './VitalReadingModal';
import { VitalReadingForm } from './VitalReadingForm';
import { toLocalIso, computeAdherencePercent } from '../lib/taskTiming';
import { DailyCheckIn, DailyTask, CaregiverAlert } from '../types';
import { VitalReadingPayload } from '../lib/vitalMetrics';
import api from '../lib/api';

export function CaregiverDashboard({ view, setView, checkins, alerts, medications }: {
  view: string,
  setView: (v: any) => void,
  checkins: DailyCheckIn[],
  alerts: CaregiverAlert[],
  medications: any[]
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'medical'>('overview');
  const { patients, activePatient, setActivePatient, fetchMeds, healthLogs, safeZoneActive, schedules } = useDataStore();
  const [patientLocation, setPatientLocation] = useState<{ lat: number, lng: number, timestamp: string } | null>(null);
  const activeAlerts = alerts.filter(a => !a.resolved);
  const adherencePercent = computeAdherencePercent(schedules || []);

  const nextMed = medications
    .filter(m => m.next_dose)
    .sort((a, b) => dayjs(toLocalIso(a.next_dose)).diff(dayjs(toLocalIso(b.next_dose))))[0];

  useEffect(() => {
    if (view === 'dashboard') setActiveTab('overview');
  }, [view]);

  useEffect(() => {
    if (!activePatient) return;

    // Poll location every 30 seconds
    const fetchLocation = async () => {
      try {
        const res = await api.get(`/location/${activePatient.id}`);
        if (res.data && (res.data.latitude !== undefined || res.data.lat !== undefined)) {
          setPatientLocation({
            lat: res.data.latitude ?? res.data.lat,
            lng: res.data.longitude ?? res.data.lng,
            timestamp: res.data.recorded_at ?? res.data.timestamp
          });
        }
      } catch (e) { }
    };
    fetchLocation();
    const interval = setInterval(fetchLocation, 30000);
    return () => clearInterval(interval);
  }, [activePatient]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Patient Management</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-gray-400 text-sm font-medium">Monitoring:</span>
            <select
              value={activePatient?.id || ''}
              onChange={(e) => setActivePatient(Number(e.target.value))}
              className="bg-transparent border-none text-rose-500 font-bold p-0 outline-none cursor-pointer text-sm sm:text-base max-w-[200px] sm:max-w-none truncate"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              {patients.length === 0 && <option>No Patients Linked</option>}
            </select>
          </div>
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
          <button
            onClick={() => setView('timeline')}
            className={cn("p-3 border rounded-2xl shadow-sm transition-colors", view === 'timeline' ? "bg-rose-50 border-rose-200 text-rose-500" : "bg-white border-gray-100 text-gray-400")}
          ><Clock className="w-5 h-5" /></button>
          <button className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm"><Phone className="w-5 h-5 text-gray-400" /></button>
          <button
            onClick={() => setView('alerts')}
            className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm relative"
          >
            <Bell className={cn("w-5 h-5", activeAlerts.length > 0 ? "text-primary" : "text-gray-400")} />
            {activeAlerts.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-ping" />}
          </button>
        </div>
      </header>

      {/* View Switcher Logic */}
      {view === 'alerts' ? (
        <AlertsListView alerts={alerts} onResolve={(id) => useDataStore.getState().resolveAlert(id)} />
      ) : view === 'timeline' ? (
        <TimelineView patientId={activePatient?.id} patientName={activePatient?.name || 'Patient'} />
      ) : view === 'family' ? (
        <StatsView healthLogs={healthLogs} activePatient={activePatient} schedules={schedules} />
      ) : (
        <>
          <div className="flex bg-gray-100 p-1 rounded-2xl w-full max-w-sm mb-8">
            {(['overview', 'medical'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-all",
                  activeTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Adherence" value={`${adherencePercent}%`} icon={<CheckCircle2 />} color="text-green-500" />
                <StatCard label="Next Med" value={nextMed ? dayjs(toLocalIso(nextMed.next_dose)).format('HH:mm') : 'None'} icon={<Pill />} color="text-rose-500" />
                <StatCard label="Location" value={patientLocation ? 'Tracked' : (safeZoneActive ? 'At Home' : 'Away')} icon={<Home />} color={safeZoneActive ? "text-green-500" : "text-amber-500"} />
              </div>

              {patientLocation && (
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm mb-4 mt-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Live Coordinates</p>
                  <p className="font-bold text-gray-700">Lat: {patientLocation.lat.toFixed(4)}, Lng: {patientLocation.lng.toFixed(4)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Updated {dayjs(patientLocation.timestamp).fromNow()}</p>
                </div>
              )}

              <div className="glass-card p-6 sm:p-8 rounded-[40px] relative overflow-hidden mt-4">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs uppercase tracking-widest text-indigo-600">Medical Summary</span>
                  </div>
                  <p className="text-xl font-bold leading-tight mb-4">
                    "Patient shows positive response to new medication. Hydration is stable. No pain reported in last 48 hours."
                  </p>
                  <button className="text-indigo-600 font-black text-sm flex items-center gap-1 group">
                    Detailed Analysis <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              </div>

              <DailyTaskChecklist patientName={activePatient?.name || 'Unknown Patient'} />

              <div className="space-y-4 mt-8">
                <h3 className="text-xl font-black tracking-tight">Recent Activity</h3>
                <div className="grid gap-3">
                  {checkins.length > 0 ? checkins.map((c, i) => (
                    <div key={i} className="bg-white p-4 rounded-3xl border border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-rose-500">
                          <Smile className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold">Daily Check-in</p>
                          <p className="text-xs text-gray-400 font-medium">{new Date(c.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-black uppercase">Good</span>
                    </div>
                  )) : (
                    <div className="py-12 text-center text-gray-400 bg-white rounded-[40px] border border-dashed border-gray-100">
                      No recent activity logs.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <MedicalProfileView medications={medications} fetchMeds={fetchMeds} activePatient={activePatient} />
          )}
        </>
      )}
    </motion.div>
  );
}

function AlertsListView({ alerts, onResolve }: { alerts: CaregiverAlert[]; onResolve: (id: string | number) => void }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-black tracking-tight">Emergency & Care Alerts</h3>
      <div className="grid gap-4">
        {alerts.map((alert) => (
          <div key={alert.id} className={cn(
            "p-6 rounded-[32px] border flex items-center justify-between",
            alert.resolved ? "bg-white border-gray-100 grayscale" : "bg-rose-50 border-rose-100 shadow-lg shadow-rose-100"
          )}>
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", alert.resolved ? "bg-gray-100" : "bg-rose-500 text-white")}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-lg">{alert.message}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{dayjs(alert.timestamp ?? alert.created_at).fromNow()}</p>
                {!alert.resolved && alert.type === 'emergency' && (
                  <p className="text-xs text-rose-500 font-bold uppercase mt-1">Escalation to Family in 5:00</p>
                )}
              </div>
            </div>
            {!alert.resolved && (
              <button
                type="button"
                onClick={() => onResolve(alert.id)}
                className="px-4 py-2 bg-rose-500 text-white rounded-xl font-bold text-xs"
              >
                RESOLVE
              </button>
            )}
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="py-20 text-center text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold">All clear! No pending alerts.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsView({ healthLogs, activePatient, schedules = [] }: { healthLogs: any[], activePatient: any, schedules?: DailyTask[] }) {
  const adherencePercent = computeAdherencePercent(schedules);
  const missedCount = schedules.filter((t) => t.is_missed && !t.is_completed).length;
  const completedCount = schedules.filter((t) => t.is_completed).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-4">
        <h3 className="text-2xl font-black tracking-tight">Health Trends</h3>
        <p className="text-sm font-bold text-gray-400">{activePatient?.name}'s Summary</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-indigo-500 uppercase tracking-widest text-xs">Heart Rate History</h4>
            <Heart className="w-5 h-5 text-rose-500 animate-pulse" />
          </div>
          <div className="h-32 flex items-end gap-2 px-2">
            {[65, 72, 68, 75, 82, 70, 74].map((v, i) => (
              <div key={i} className="flex-1 bg-indigo-50 rounded-t-lg relative group" style={{ height: `${(v / 100) * 100}%` }}>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {v}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-black text-gray-300 uppercase">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-blue-500 uppercase tracking-widest text-xs">Adherence Report</h4>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex items-center justify-center py-2">
            <div className={cn(
              "w-20 h-20 rounded-full border-8 flex items-center justify-center",
              adherencePercent >= 80 ? "border-green-500" : adherencePercent >= 50 ? "border-amber-500" : "border-rose-500"
            )}>
              <span className="text-xl font-black">{adherencePercent}%</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6 text-center">
            <div className="bg-green-50 rounded-2xl p-3">
              <p className="text-2xl font-black text-green-600">{completedCount}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Completed</p>
            </div>
            <div className="bg-rose-50 rounded-2xl p-3">
              <p className="text-2xl font-black text-rose-600">{missedCount}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Missed</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3">
              <p className="text-2xl font-black text-gray-600">{schedules.length}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Total Today</p>
            </div>
          </div>
          <p className="text-center text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest">Today&apos;s Task Summary</p>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100">
        <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs mb-6">Recent Vitals Log</h4>
        <div className="space-y-3">
          {healthLogs.slice(0, 10).map((log, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <p className="font-bold capitalize">{log.type}</p>
                <span className="text-[10px] text-gray-300">{dayjs(log.created_at).format('MMM D, HH:mm')}</span>
              </div>
              <p className="font-black text-indigo-600">
                {typeof log.value === 'object' ? `${log.value.systolic}/${log.value.diastolic}` : log.value} {log.unit}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyTaskChecklist({ patientName }: { patientName: string }) {
  const { schedules, completeTask, markTaskMissed, activePatient, fetchHealthLogs } = useDataStore();
  const [vitalTask, setVitalTask] = useState<DailyTask | null>(null);
  const [vitalSubmitting, setVitalSubmitting] = useState(false);
  const activeTasks = (schedules || []).filter((s) => !s.is_completed);
  const pendingCount = activeTasks.filter((s) => !s.is_missed).length;
  const missedCount = activeTasks.filter((s) => s.is_missed).length;

  const handleVitalSubmit = async (reading: VitalReadingPayload) => {
    if (!vitalTask) return;
    setVitalSubmitting(true);
    const ok = await completeTask(
      vitalTask.id,
      vitalTask.original_id,
      vitalTask.type,
      vitalTask.scheduled_time,
      { onBehalf: true, reading }
    );
    setVitalSubmitting(false);
    if (ok) {
      setVitalTask(null);
      if (activePatient) fetchHealthLogs(activePatient.id);
    }
  };

  return (
    <>
      <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs">Today&apos;s Care Tasks</h4>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black">
              {pendingCount} PENDING
            </span>
            {missedCount > 0 && (
              <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">
                {missedCount} MISSED
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {activeTasks.map((s: DailyTask) => (
            <TaskCard
              key={s.id}
              task={s}
              variant="caregiver"
              onComplete={() => completeTask(s.id, s.original_id, s.type, s.scheduled_time, { onBehalf: true })}
              onMiss={() => markTaskMissed(s.id, s.original_id, s.type, s.title, s.scheduled_time)}
              onRecordReading={() => setVitalTask(s)}
            />
          ))}
          {activeTasks.length === 0 && (
            <div className="py-8 text-center text-gray-400 italic text-sm">
              All tasks for {patientName} are completed! ✨
            </div>
          )}
        </div>
      </div>

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


function MedicalProfileView({ medications, fetchMeds, activePatient }: { medications: any[], fetchMeds: (id: number) => void, activePatient: any }) {
  const [showAddMed, setShowAddMed] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);
  const [showAddLog, setShowAddLog] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const { updateMed, deleteMed, medicalProfile, updateProfile, healthLogs, addHealthLog, fetchSchedules } = useDataStore();
  const { user } = useAuthStore();

  const canEdit = user?.role === 'caregiver' || user?.role === 'elderly';

  const handleSaveMed = async (formData: any) => {
    if (editingMed) {
      await updateMed(editingMed.id, formData);
      setEditingMed(null);
    } else {
      await api.post('/medications', {
        ...formData,
        user_id: activePatient.id
      });
      setShowAddMed(false);
    }
    await Promise.all([
      fetchMeds(activePatient.id),
      fetchSchedules(activePatient.id),
    ]);
  };

  if (!medicalProfile) {
    return (
      <div className="bg-white p-12 rounded-[40px] text-center border border-gray-100">
        <Activity className="w-12 h-12 text-rose-200 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-400 font-bold">Loading medical profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recording Quick Action */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 sm:p-8 rounded-[40px] text-white shadow-xl shadow-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h3 className="text-2xl font-black tracking-tight">Record Health Data</h3>
          <p className="text-indigo-100 font-medium opacity-90">Daily vitals for {activePatient.name}</p>
        </div>
        <button
          onClick={() => setShowAddLog(!showAddLog)}
          className="px-6 py-3 bg-white text-indigo-600 font-black rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          {showAddLog ? 'Cancel' : '+ New Record'}
        </button>
      </div>

      <AnimatePresence>
        {showAddLog && (
          <HealthLogForm
            patientId={activePatient.id}
            monitoredMetrics={medicalProfile.monitored_metrics || ['heartbeat', 'blood_pressure', 'glucose', 'temp']}
            onSave={async (data) => {
              await addHealthLog(data);
              setShowAddLog(false);
            }}
          />
        )}
      </AnimatePresence>

      <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100 space-y-8">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-500" /> Chronic Conditions
          </h3>
          {canEdit && (
            <button
              onClick={() => setShowEditProfile(!showEditProfile)}
              className="text-rose-500 font-bold text-sm"
            >
              {showEditProfile ? 'Cancel' : '+ Edit Profile'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {showEditProfile && (
            <ProfileEditForm
              initialData={medicalProfile}
              onSave={async (data) => {
                await updateProfile(activePatient.id, data);
                setShowEditProfile(false);
              }}
              onCancel={() => setShowEditProfile(false)}
            />
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-2">
          {medicalProfile.chronic_conditions?.map((c: string) => (
            <span key={c} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm">{c}</span>
          ))}
          {!medicalProfile.chronic_conditions?.length && <p className="text-gray-400 italic text-sm">No conditions listed.</p>}
        </div>

        <div className="pt-8 border-t border-gray-50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-500" /> Medications
            </h3>
            {canEdit && (
              <button
                onClick={() => setShowAddMed(!showAddMed)}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100"
              >
                {showAddMed ? 'Cancel' : '+ Add Medication'}
              </button>
            )}
          </div>

          {(showAddMed || editingMed) && (
            <MedicationForm
              initialData={editingMed}
              onSave={handleSaveMed}
              onCancel={() => { setShowAddMed(false); setEditingMed(null); }}
            />
          )}

          <div className="space-y-3">
            {medications.map((m, i) => (
              <div key={i} className="p-6 bg-white border border-gray-100 rounded-[32px] flex justify-between items-center group hover:border-rose-200 transition-all shadow-sm">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-lg">{m.name} <span className="text-rose-500 text-sm">{m.dosage}</span></p>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{m.frequency_data?.type || 'Daily'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => useDataStore.getState().takeMed(m.id)}
                    className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                </div>
                {canEdit && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingMed(m)} className="p-2 hover:bg-blue-50 text-blue-500 rounded-xl transition-colors">
                      <FileText className="w-5 h-5" />
                    </button>
                    <button onClick={() => deleteMed(m.id)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors">
                      <Trash className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {medications.length === 0 && <p className="text-center text-gray-400 py-4 italic">No medications found.</p>}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-black tracking-tight mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-500" /> Allergies
          </h3>
          <div className="flex flex-wrap gap-2">
            {medicalProfile.allergies?.map((a: string) => (
              <span key={a} className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-bold text-sm">{a}</span>
            ))}
            {!medicalProfile.allergies?.length && <p className="text-gray-400 italic text-sm">No allergies listed.</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-50">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Blood Type</p>
            <p className="text-lg font-black">{medicalProfile.blood_type || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Cognitive Status</p>
            <p className="text-lg font-black text-amber-600">{medicalProfile.cognitive_status || 'Stable'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fall Risk</p>
            <p className="text-lg font-black text-rose-500">{medicalProfile.fall_risk || 'Low'}</p>
          </div>
        </div>
      </div>

      {/* Recent Health Logs */}
      <div className="space-y-4">
        <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" /> Recent Vital History
        </h3>
        <div className="grid gap-3">
          {healthLogs.slice(0, 5).map((log, i) => (
            <div key={i} className="bg-white p-5 rounded-[32px] border border-gray-50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                  {log.type === 'heartbeat' ? <Heart className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
                </div>
                <div>
                  <p className="font-bold capitalize">{log.type.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{dayjs(log.created_at).fromNow()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-indigo-600">
                  {/* @ts-ignore */}
                  {typeof log.value === 'object' ? `${log.value.systolic}/${log.value.diastolic}` : log.value}
                  <span className="text-[10px] text-gray-400 ml-1 uppercase">{log.unit}</span>
                </p>
              </div>
            </div>
          ))}
          {!healthLogs.length && (
            <div className="py-8 text-center text-gray-400 bg-white rounded-[32px] border border-dashed border-gray-100">
              No health logs recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileEditForm({ initialData, onSave, onCancel }: { initialData: any, onSave: (data: any) => void, onCancel: () => void }) {
  const [conditions, setConditions] = useState(initialData.chronic_conditions?.join(', ') || '');
  const [allergies, setAllergies] = useState(initialData.allergies?.join(', ') || '');
  const [bloodType, setBloodType] = useState(initialData.blood_type || '');
  const [cognitive, setCognitive] = useState(initialData.cognitive_status || 'Stable');
  const [fallRisk, setFallRisk] = useState(initialData.fall_risk || 'low');
  const [metrics, setMetrics] = useState<string[]>(initialData.monitored_metrics || ['heartbeat', 'blood_pressure']);

  const allMetrics = [
    { id: 'heartbeat', label: 'Heartbeat (BPM)' },
    { id: 'blood_pressure', label: 'Blood Pressure' },
    { id: 'glucose', label: 'Glucose Levels' },
    { id: 'temp', label: 'Temperature' },
    { id: 'weight', label: 'Weight' }
  ];

  const toggleMetric = (id: string) => {
    setMetrics(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      chronic_conditions: conditions.split(',').map(s => s.trim()).filter(Boolean),
      allergies: allergies.split(',').map(s => s.trim()).filter(Boolean),
      blood_type: bloodType,
      cognitive_status: cognitive,
      fall_risk: fallRisk,
      monitored_metrics: metrics
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-rose-50 p-6 rounded-[32px] border border-rose-100 mb-6 space-y-6 overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">Chronic Conditions (comma separated)</label>
            <input value={conditions} onChange={e => setConditions(e.target.value)} type="text" className="w-full p-4 bg-white border border-rose-100 rounded-2xl outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">Allergies (comma separated)</label>
            <input value={allergies} onChange={e => setAllergies(e.target.value)} type="text" className="w-full p-4 bg-white border border-rose-100 rounded-2xl outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">Blood Type</label>
            <input value={bloodType} onChange={e => setBloodType(e.target.value)} type="text" className="w-full p-4 bg-white border border-rose-100 rounded-2xl outline-none font-bold" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">Cognitive</label>
            <select value={cognitive} onChange={e => setCognitive(e.target.value)} className="w-full p-4 bg-white border border-rose-100 rounded-2xl outline-none font-bold">
              <option value="Stable">Stable</option>
              <option value="Declining">Declining</option>
              <option value="Impaired">Impaired</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">Fall Risk</label>
            <select value={fallRisk} onChange={e => setFallRisk(e.target.value)} className="w-full p-4 bg-white border border-rose-100 rounded-2xl outline-none font-bold">
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">Required Daily Records</label>
          <div className="flex flex-wrap gap-2">
            {allMetrics.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMetric(m.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  metrics.includes(m.id) ? "bg-rose-500 text-white" : "bg-white text-gray-400 border border-rose-100"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-200">
          Update Patient Requirements
        </button>
      </form>
    </motion.div>
  );
}

function HealthLogForm({ patientId, monitoredMetrics, onSave }: { patientId: number, monitoredMetrics: string[], onSave: (data: any) => void }) {
  const [type, setType] = useState(monitoredMetrics[0] || 'heartbeat');

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-indigo-50 p-8 rounded-[40px] border border-indigo-100 mb-6"
    >
      <div className="space-y-4 mb-4">
        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2">Metric Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full p-4 bg-white border border-indigo-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold capitalize"
        >
          {monitoredMetrics.map((m) => (
            <option key={m} value={m}>{m.replace('_', ' ')}</option>
          ))}
        </select>
      </div>
      <VitalReadingForm
        metricType={type}
        onSubmit={(reading) =>
          onSave({
            user_id: patientId,
            type,
            value: reading.value,
            notes: reading.notes,
          })
        }
        submitLabel="Save Metric Record"
        variant="inline"
      />
    </motion.div>
  );
}


export function FamilyDashboard({ view, setView, checkins, alerts, medications }: {
  view: string,
  setView: (v: any) => void,
  checkins: DailyCheckIn[],
  alerts: CaregiverAlert[],
  medications: any[]
}) {
  const { healthLogs, schedules, resolveAlert, patients, activePatient } = useDataStore();
  const { user } = useAuthStore();
  const [patientLocation, setPatientLocation] = useState<{ latitude: number, longitude: number, recorded_at: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  const nextMed = medications
    .filter(m => m.next_dose)
    .sort((a, b) => dayjs(toLocalIso(a.next_dose)).diff(dayjs(toLocalIso(b.next_dose))))[0];

  const activeAlerts = alerts.filter(a => !a.resolved);
  const completedToday = (schedules || []).filter(s => s.is_completed).length;
  const totalToday = (schedules || []).length;
  const lastCheckin = checkins && checkins.length > 0 ? checkins[checkins.length - 1] : null;

  // Poll location every 30 seconds
  useEffect(() => {
    if (!activePatient) return;
    const fetch = async () => {
      setLocationLoading(true);
      try {
        const res = await api.get(`/location/${activePatient.id}`);
        if (res.data) setPatientLocation(res.data);
      } catch (e) { }
      finally { setLocationLoading(false); }
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [activePatient]);

  if (view === 'alerts') return <AlertsListView alerts={alerts} onResolve={resolveAlert} />;
  if (view === 'timeline') return <TimelineView patientId={activePatient?.id} patientName={activePatient?.name || 'Patient'} />;
  if (view === 'family') return <StatsView healthLogs={healthLogs} activePatient={null} schedules={schedules} />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 sm:p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-indigo-200 font-bold text-sm uppercase tracking-widest mb-1">Family Dashboard</p>
          <h2 className="text-3xl font-black tracking-tighter mb-1">
            {activePatient?.name || 'Your Loved One'}
          </h2>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-bold text-indigo-100">Online · Active Monitoring</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
      </div>

      {/* Emergency Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-[28px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-rose-500 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <p className="font-black text-rose-700 uppercase tracking-widest text-xs">
              {activeAlerts.length} Active Alert{activeAlerts.length > 1 ? 's' : ''}
            </p>
          </div>
          {activeAlerts.slice(0, 3).map(a => (
            <div key={a.id} className="flex items-start gap-3 py-2 border-b border-rose-100 last:border-0">
              <p className="font-bold text-rose-800 text-sm flex-1">{a.message}</p>
              <span className="text-[10px] text-rose-400 font-bold whitespace-nowrap">
                {dayjs(a.created_at).fromNow()}
              </span>
            </div>
          ))}
          <button
            onClick={() => setView('alerts')}
            className="mt-3 w-full py-2.5 bg-rose-500 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all"
          >
            View All Alerts
          </button>
        </div>
      )}

      {/* Live Location */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-[28px] p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-gray-800">Live Location</p>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] font-bold text-green-600 uppercase tracking-wider">Live</span>
            </div>
          </div>
        </div>
        {locationLoading ? (
          <p className="text-sm text-gray-400 font-medium animate-pulse">Fetching location...</p>
        ) : patientLocation ? (
          <div className="space-y-2">
            <div className="bg-white rounded-2xl p-3 border border-green-100">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Coordinates</p>
              <p className="font-black text-gray-800">
                {patientLocation.latitude.toFixed(5)}, {patientLocation.longitude.toFixed(5)}
              </p>
            </div>
            <p className="text-xs text-gray-400 font-medium px-1">
              Last updated: {patientLocation.recorded_at
                ? dayjs(patientLocation.recorded_at).format('MMM D, HH:mm')
                : 'Just now'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-3 border border-green-100">
            <p className="text-sm text-gray-400 font-medium">No location data yet. Location will appear once the app is opened on the elderly device.</p>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Today's Tasks</p>
          <p className="text-3xl font-black text-indigo-600">
            {completedToday}<span className="text-gray-300 text-xl font-bold">/{totalToday}</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-medium">Completed</p>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Next Medication</p>
          <p className="text-xl font-black text-gray-800">
            {nextMed ? dayjs(toLocalIso(nextMed.next_dose)).format('HH:mm') : 'None'}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-medium">
            {nextMed ? dayjs(toLocalIso(nextMed.next_dose)).fromNow() : 'No meds scheduled'}
          </p>
        </div>
      </div>

      {/* Last Check-in */}
      {lastCheckin && (
        <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Last Mood Check-in</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-2xl">
              {lastCheckin.mood === 'great' ? '😁' : lastCheckin.mood === 'good' ? '😊' : lastCheckin.mood === 'okay' ? '😐' : lastCheckin.mood === 'bad' ? '😔' : '😭'}
            </div>
            <div>
              <p className="font-black text-gray-800">{lastCheckin.mood}</p>
              <p className="text-xs text-gray-400 font-medium">
                {dayjs(lastCheckin.timestamp || lastCheckin.created_at).fromNow()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Health Logs */}
      {healthLogs.length > 0 && (
        <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Recent Vitals</p>
          <div className="space-y-3">
            {healthLogs.slice(0, 5).map((log, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm capitalize">{log.type}</p>
                    <p className="text-[10px] text-gray-400">{dayjs(log.created_at).format('MMM D, HH:mm')}</p>
                  </div>
                </div>
                <p className="font-black text-indigo-600 text-sm">
                  {typeof log.value === 'object'
                    ? `${log.value.systolic}/${log.value.diastolic}`
                    : log.value} {log.unit}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <button
        onClick={() => setView('timeline')}
        className="w-full py-5 bg-white border border-gray-100 rounded-[32px] font-bold shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:border-indigo-200 hover:bg-indigo-50 group"
      >
        <Clock className="w-6 h-6 text-indigo-400 group-hover:text-indigo-500 transition-colors" />
        <span className="text-gray-700 group-hover:text-indigo-600 transition-colors">View Activity Timeline</span>
      </button>
    </motion.div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-50", color)}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" })}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black">{value}</p>
      </div>
    </div>
  );
}

const WEEKDAYS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

function MedicationForm({ initialData, onSave, onCancel }: { initialData?: any, onSave: (data: any) => void, onCancel: () => void }) {
  const [name, setName] = useState(initialData?.name || '');
  const [dosage, setDosage] = useState(initialData?.dosage || '');
  const [instructions, setInstructions] = useState(initialData?.instructions || '');
  const [type, setType] = useState(initialData?.frequency_data?.type || 'daily');
  const [time, setTime] = useState(initialData?.frequency_data?.times?.[0]?.substring(0, 5) || '08:00');
  const [weekDays, setWeekDays] = useState<string[]>(
    initialData?.frequency_data?.days?.length
      ? initialData.frequency_data.days
      : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  );

  const toggleDay = (day: string) => {
    setWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'weekly' && weekDays.length === 0) {
      return;
    }
    const frequency_data =
      type === 'weekly'
        ? { type: 'weekly', times: [time], days: weekDays.map((d) => d.toLowerCase()) }
        : { type: 'daily', times: [time] };

    onSave({
      name,
      dosage,
      instructions,
      frequency_data,
      is_active: true,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 mb-6 space-y-4 overflow-hidden"
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-black text-rose-500 uppercase tracking-widest text-xs">
          {initialData ? 'Edit Medication' : 'Add New Medication'}
        </h4>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-900 transition-colors"><AlertCircle className="w-5 h-5 rotate-45" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="e.g. Metformin" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500" required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Dosage</label>
            <input value={dosage} onChange={e => setDosage(e.target.value)} type="text" placeholder="e.g. 500mg" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500" required />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Frequency</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 font-bold min-h-[52px]">
              <option value="daily">Every day</option>
              <option value="weekly">Specific days</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Time</label>
            <input value={time} onChange={e => setTime(e.target.value)} type="time" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 font-bold min-h-[52px]" required />
          </div>
        </div>
        {type === 'weekly' && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Days</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={cn(
                    'min-w-[44px] min-h-[44px] px-3 rounded-xl font-bold text-sm transition-all touch-manipulation',
                    weekDays.includes(d.id)
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-500'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Special Instructions</label>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="e.g. Take with food" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 h-24" />
        </div>
        <button type="submit" className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-200 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest">
          {initialData ? 'Update Schedule' : 'Create Medication'}
        </button>
      </form>
    </motion.div>
  );
}

