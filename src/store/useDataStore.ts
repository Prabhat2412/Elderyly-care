import { create } from 'zustand';
import api from '../lib/api';
import { DailyCheckIn, CaregiverAlert, DailyTask, TimelineEvent } from '../types';
import { VitalReadingPayload } from '../lib/vitalMetrics';
import { shouldAutoMiss } from '../lib/taskTiming';
import toast from 'react-hot-toast';

interface DataState {
  medications: any[];
  checkins: DailyCheckIn[];
  alerts: CaregiverAlert[];
  patients: any[];
  activePatient: any | null;
  medicalProfile: any | null;
  healthLogs: any[];
  schedules: DailyTask[];
  isLoading: boolean;
  fetchMeds: (userId: number) => Promise<void>;
  fetchPatients: () => Promise<void>;
  setActivePatient: (patientId: number) => Promise<void>;
  fetchProfile: (userId: number) => Promise<void>;
  updateProfile: (userId: number, data: any) => Promise<void>;
  fetchHealthLogs: (userId: number) => Promise<void>;
  addHealthLog: (data: any) => Promise<void>;
  addCheckin: (payload: any) => Promise<void>;
  triggerEmergency: (userId: number) => Promise<void>;
  takeMed: (medId: number) => Promise<void>;
  updateMed: (medId: number, data: any) => Promise<void>;
  deleteMed: (medId: number) => Promise<void>;
  fetchAlerts: () => Promise<void>;
  fetchSchedules: (userId?: number) => Promise<void>;
  completeTask: (
    taskId: string,
    originalId: number,
    type: 'routine' | 'medication',
    time: string,
    options?: { onBehalf?: boolean; reading?: VitalReadingPayload }
  ) => Promise<boolean>;
  markTaskMissed: (taskId: string, originalId: number, type: 'routine' | 'medication', title: string, time: string, options?: { auto?: boolean }) => Promise<boolean>;
  processAutoMissedTasks: () => Promise<void>;
  resolveAlert: (alertId: string | number) => Promise<void>;
  chatHistory: any[];
  sendChatMessage: (userId: number, message: string) => Promise<void>;
  clearChatHistory: () => void;
  aiSummary: { summary: string; recommendations: string[]; concern_level: string } | null;
  fetchAiSummary: (userId: number) => Promise<void>;
  safeZoneActive: boolean;
  toggleSafeZone: () => void;
  timelineEvents: TimelineEvent[];
  timelineLoading: boolean;
  fetchTimeline: (patientId: number, date?: string) => Promise<void>;
}

function normalizeAlert(alert: any): CaregiverAlert {
  return {
    ...alert,
    id: alert.id,
    timestamp: alert.timestamp ?? alert.created_at ?? new Date().toISOString(),
    userId: alert.userId ?? String(alert.user_id ?? ''),
  };
}

export const useDataStore = create<DataState>((set, get) => ({
  medications: [],
  checkins: [],
  alerts: [],
  patients: [],
  activePatient: null,
  medicalProfile: null,
  healthLogs: [],
  schedules: [],
  isLoading: false,
  safeZoneActive: true,
  timelineEvents: [],
  timelineLoading: false,

  toggleSafeZone: () => {
    const currentState = get().safeZoneActive;
    set({ safeZoneActive: !currentState });

    if (currentState) {
      const newAlert: CaregiverAlert = {
        id: Date.now().toString(),
        userId: 'current',
        type: 'emergency',
        message: 'Patient has left the Safe Zone.',
        timestamp: new Date().toISOString(),
        resolved: false,
      };
      set((state) => ({ alerts: [newAlert, ...state.alerts] }));
      toast('Left Safe Zone. Caregiver notified.', { icon: '📍' });
    } else {
      toast.success('Returned to Safe Zone');
    }
  },

  fetchMeds: async (userId) => {
    set({ isLoading: true });
    try {
      const response = await api.get('/medications', { params: { user_id: userId } });
      set({ medications: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to fetch meds', error);
    }
  },

  fetchPatients: async () => {
    try {
      const response = await api.get('/patients');
      set({ patients: response.data });
      if (response.data.length > 0 && !get().activePatient) {
        get().setActivePatient(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch patients', error);
    }
  },

  setActivePatient: async (patientId) => {
    try {
      await api.post('/patients/active', { patient_id: patientId });
      const patient = get().patients.find((p) => p.id === patientId);
      set({ activePatient: patient });
      if (patient) {
        await Promise.all([
          get().fetchMeds(patient.id),
          get().fetchProfile(patient.id),
          get().fetchHealthLogs(patient.id),
          get().fetchAlerts(),
          get().fetchSchedules(patient.id),
        ]);
      }
    } catch (error) {
      console.error('Failed to set active patient', error);
    }
  },

  fetchProfile: async (userId) => {
    try {
      const response = await api.get(`/patients/${userId}/profile`);
      set({ medicalProfile: response.data });
    } catch (error) {
      console.error('Failed to fetch profile', error);
    }
  },

  updateProfile: async (userId, data) => {
    try {
      const response = await api.put(`/patients/${userId}/profile`, data);
      set({ medicalProfile: response.data });
      toast.success('Profile updated successfully');
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error("You don't have permission to edit this profile.");
      } else {
        console.error('Failed to update profile', error);
      }
    }
  },

  fetchHealthLogs: async (userId) => {
    try {
      const response = await api.get('/health-logs', { params: { user_id: userId } });
      set({ healthLogs: response.data });
    } catch (error) {
      console.error('Failed to fetch health logs', error);
    }
  },

  addHealthLog: async (data) => {
    try {
      const response = await api.post('/health-logs', data);
      set((state) => ({ healthLogs: [response.data, ...state.healthLogs] }));
      toast.success(`${data.type.replace('_', ' ')} recorded!`);
    } catch (error) {
      console.error('Failed to add health log', error);
    }
  },

  addCheckin: async (payload) => {
    try {
      const response = await api.post('/checkin', payload);
      set((state) => ({ checkins: [response.data, ...state.checkins] }));
    } catch (error) {
      console.error('Failed to add checkin', error);
    }
  },

  triggerEmergency: async (userId) => {
    try {
      await api.post('/emergency', { user_id: userId });
      toast.success('EMERGENCY SIGNAL SENT! Caregiver and family have been notified.', {
        duration: 5000,
        icon: '🚨',
      });
    } catch (error) {
      console.error('Failed to trigger emergency', error);
    }
  },

  takeMed: async (medId) => {
    try {
      await api.post(`/medications/${medId}/take`);
      toast.success('Medicine recorded!');
      if (get().activePatient) get().fetchMeds(get().activePatient.id);
      get().fetchSchedules(get().activePatient?.id);
    } catch (error) {
      console.error('Failed to take med', error);
    }
  },

  updateMed: async (medId, data) => {
    try {
      await api.put(`/medications/${medId}`, data);
      toast.success('Medication updated successfully');
      if (get().activePatient) get().fetchMeds(get().activePatient.id);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error("You don't have permission to edit this medication.");
      } else {
        console.error('Failed to update med', error);
      }
    }
  },

  deleteMed: async (medId) => {
    try {
      await api.delete(`/medications/${medId}`);
      toast.success('Medication removed');
      if (get().activePatient) get().fetchMeds(get().activePatient.id);
    } catch (error) {
      console.error('Failed to delete med', error);
    }
  },

  fetchAlerts: async () => {
    try {
      const response = await api.get('/alerts');
      set({ alerts: response.data.map(normalizeAlert) });
    } catch (error) {
      console.error('Failed to fetch alerts', error);
    }
  },

  fetchSchedules: async (userId) => {
    try {
      const response = await api.get('/daily-tasks', { params: userId ? { user_id: userId } : {} });
      set({ schedules: response.data });
    } catch (error) {
      console.error('Failed to fetch schedules', error);
    }
  },

  completeTask: async (taskId, originalId, type, time, options) => {
    try {
      const endpoint =
        type === 'routine' ? `/schedules/${originalId}/complete` : `/medications/${originalId}/take`;

      const payload: Record<string, unknown> = {
        scheduled_time: time,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      if (type === 'routine' && options?.reading) {
        payload.reading = {
          value: options.reading.value,
          notes: options.reading.notes,
        };
      }

      const response = await api.post(endpoint, payload);

      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === taskId ? { ...s, is_completed: true, is_missed: false } : s
        ),
      }));

      const patientId = get().activePatient?.id;
      if (response.data?.health_log) {
        set((state) => ({
          healthLogs: [response.data.health_log, ...state.healthLogs],
        }));
        if (patientId) {
          get().fetchHealthLogs(patientId);
        }
        toast.success('Vital reading saved and task completed!');
      } else {
        toast.success(`${type === 'routine' ? 'Task' : 'Medicine'} recorded!`);
      }

      if (type === 'medication' && get().activePatient) {
        get().fetchMeds(get().activePatient.id);
      }
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error ?? error.response?.data?.message;
      const code = error.response?.data?.code;
      if (error.response?.status === 403 && code === 'task_not_due') {
        toast.error(message || 'This task is not in your flexible time window yet.');
      } else if (error.response?.status === 403 && code === 'elderly_complete_blocked') {
        toast.error(message || 'Ask your caregiver or family to mark this complete.');
      } else if (error.response?.status === 422 && code === 'vital_reading_required') {
        toast.error(message || 'Please record the vital reading to complete this task.');
      } else if (error.response?.status === 422) {
        const errors = error.response?.data?.errors;
        const first = errors ? Object.values(errors).flat()[0] : message;
        toast.error(typeof first === 'string' ? first : 'Invalid reading. Please check your values.');
      } else if (!options?.onBehalf) {
        console.error('Failed to complete task', error);
      }
      return false;
    }
  },

  markTaskMissed: async (taskId, originalId, type, title, time, options) => {
    try {
      const endpoint =
        type === 'routine' ? `/schedules/${originalId}/miss` : `/medications/${originalId}/miss`;

      await api.post(endpoint, {
        scheduled_time: time,
        auto: options?.auto ?? false,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === taskId
            ? { ...s, is_missed: true, marked_by: options?.auto ? 'auto' : (s.marked_by ?? 'elderly') }
            : s
        ),
      }));

      if (!options?.auto) {
        toast.error(`${type === 'routine' ? 'Task' : 'Medicine'} marked as missed. Care team notified.`);
      }

      get().fetchAlerts();
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error;
      const code = error.response?.data?.code;
      if (error.response?.status === 403 && code === 'task_not_due') {
        toast.error(message || 'You can mark missed once the scheduled time has passed.');
      } else if (!options?.auto) {
        console.error('Failed to mark task missed', error);
      }
      return false;
    }
  },

  processAutoMissedTasks: async () => {
    const pending = get().schedules.filter((s) => !s.is_completed && !s.is_missed);
    const toAutoMiss = pending.filter((s) => shouldAutoMiss(s));
    if (toAutoMiss.length === 0) return;

    let autoMissed = 0;
    for (const task of toAutoMiss) {
      const endpoint =
        task.type === 'routine' ? `/schedules/${task.original_id}/miss` : `/medications/${task.original_id}/miss`;

      try {
        await api.post(endpoint, {
          scheduled_time: task.scheduled_time,
          auto: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        autoMissed += 1;
      } catch (error) {
        console.error('Failed to auto-miss task', error);
      }
    }

    if (autoMissed > 0) {
      await get().fetchSchedules(get().activePatient?.id);
      get().fetchAlerts();
      toast(
        autoMissed === 1
          ? 'A task was auto-marked as missed (30+ min overdue). Your care team has been notified.'
          : `${autoMissed} tasks were auto-marked as missed. Your care team has been notified.`,
        { icon: '⏰' }
      );
    }
  },

  resolveAlert: async (alertId) => {
    try {
      await api.post(`/alerts/${alertId}/resolve`);
      set((state) => ({
        alerts: state.alerts.map((a) =>
          String(a.id) === String(alertId) ? { ...a, resolved: true } : a
        ),
      }));
      toast.success('Alert resolved successfully');
    } catch (error) {
      console.error('Failed to resolve alert', error);
    }
  },

  chatHistory: [],
  sendChatMessage: async (userId, message) => {
    const userMsg = { sender: 'user', text: message, timestamp: new Date() };
    set((state) => ({ chatHistory: [...state.chatHistory, userMsg] }));
    try {
      const historyToSend = get().chatHistory.map((h) => ({ sender: h.sender, text: h.text }));
      const response = await api.post(`/patients/${userId}/chatbot`, {
        message,
        history: historyToSend,
      });
      const botMsg = { sender: 'bot', text: response.data.reply, timestamp: new Date() };
      set((state) => ({ chatHistory: [...state.chatHistory, botMsg] }));
    } catch (error) {
      console.error('Failed to send chatbot message', error);
      const errorMsg = {
        sender: 'bot',
        text: "I'm sorry, I'm having trouble connecting right now. Please try again.",
        timestamp: new Date(),
      };
      set((state) => ({ chatHistory: [...state.chatHistory, errorMsg] }));
    }
  },

  clearChatHistory: () => {
    set({ chatHistory: [] });
  },

  aiSummary: null,
  fetchAiSummary: async (userId) => {
    try {
      const response = await api.get(`/patients/${userId}/ai-summary`);
      set({ aiSummary: response.data });
    } catch (error) {
      console.error('Failed to fetch AI summary', error);
    }
  },

  fetchTimeline: async (patientId, date) => {
    set({ timelineLoading: true });
    try {
      const params: Record<string, string> = {};
      if (date) params.date = date;
      const response = await api.get(`/patients/${patientId}/timeline`, { params });
      set({ timelineEvents: response.data, timelineLoading: false });
    } catch (error) {
      console.error('Failed to fetch timeline', error);
      set({ timelineLoading: false });
    }
  },
}));
