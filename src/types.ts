export interface DailyCheckIn {
  id: string;
  userId: string;
  timestamp: string;
  ate: boolean;
  tookMeds: boolean;
  drankWater: boolean;
  sleptWell: boolean;
  movedAround: boolean;
  inPain: boolean;
  mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
  notes?: string;
}

export interface CaregiverAlert {
  id: string | number;
  userId?: string;
  user_id?: number;
  type: string;
  message: string;
  timestamp?: string;
  created_at?: string;
  resolved: boolean;
}

export interface DailyTask {
  id: string;
  original_id: number;
  title: string;
  type: 'routine' | 'medication';
  category?: string;
  metric_type?: string;
  scheduled_time: string;
  is_completed: boolean;
  is_missed: boolean;
  marked_by?: 'elderly' | 'auto' | 'caregiver' | 'child' | null;
  minutes_past_due?: number;
  requires_reading?: boolean;
}

export interface HealthSummary {
  id: string;
  userId: string;
  weekStarting: string;
  summary: string;
  recommendations: string[];
  generatedAt: string;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: 'elderly' | 'caregiver' | 'child';
  caregiverId?: string; // If role is elderly
  elderlyIds?: string[]; // If role is caregiver or child
  hospitalName?: string;
  hospitalContact?: string;
}
