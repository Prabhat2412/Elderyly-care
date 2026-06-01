import { DailyTask } from '../types';

export type VitalMetricType =
  | 'blood_pressure'
  | 'temp'
  | 'glucose'
  | 'heartbeat'
  | 'weight'
  | 'oxygen_saturation';

export interface VitalReadingPayload {
  value: number | { systolic: number; diastolic: number };
  notes?: string;
}

export interface VitalMetricConfig {
  type: VitalMetricType;
  label: string;
  unit: string;
  placeholder: string;
  step?: string;
  min: number;
  max: number;
  isBloodPressure?: boolean;
}

const METRIC_ALIASES: Record<string, VitalMetricType> = {
  heart_rate: 'heartbeat',
  bp: 'blood_pressure',
  temperature: 'temp',
};

export function normalizeMetricType(metricType?: string | null): VitalMetricType | null {
  if (!metricType) return null;
  const key = metricType.toLowerCase().replace(/\s+/g, '_') as string;
  return METRIC_ALIASES[key] ?? (key as VitalMetricType);
}

export function taskRequiresReading(task: DailyTask): boolean {
  if (task.requires_reading) return true;
  return task.category === 'vital' || !!task.metric_type;
}

export function getMetricConfig(metricType?: string | null): VitalMetricConfig | null {
  const type = normalizeMetricType(metricType);
  if (!type) return null;

  const configs: Record<VitalMetricType, VitalMetricConfig> = {
    blood_pressure: {
      type: 'blood_pressure',
      label: 'Blood Pressure',
      unit: 'mmHg',
      placeholder: '120/80',
      min: 70,
      max: 250,
      isBloodPressure: true,
    },
    temp: {
      type: 'temp',
      label: 'Temperature',
      unit: '°C',
      placeholder: '36.6',
      step: '0.1',
      min: 32,
      max: 42,
    },
    glucose: {
      type: 'glucose',
      label: 'Blood Glucose',
      unit: 'mg/dL',
      placeholder: '110',
      min: 20,
      max: 600,
    },
    heartbeat: {
      type: 'heartbeat',
      label: 'Heart Rate',
      unit: 'BPM',
      placeholder: '72',
      min: 30,
      max: 220,
    },
    weight: {
      type: 'weight',
      label: 'Weight',
      unit: 'kg',
      placeholder: '70',
      step: '0.1',
      min: 20,
      max: 300,
    },
    oxygen_saturation: {
      type: 'oxygen_saturation',
      label: 'Oxygen Saturation',
      unit: '%',
      placeholder: '98',
      min: 50,
      max: 100,
    },
  };

  return configs[type] ?? null;
}

/** Client-side validation before API (mirrors backend ranges). */
export function validateVitalReading(
  metricType: string | null | undefined,
  value: VitalReadingPayload['value']
): string | null {
  const config = getMetricConfig(metricType);
  if (!config) return 'Unknown vital type.';

  if (config.isBloodPressure) {
    if (typeof value !== 'object' || value === null || !('systolic' in value)) {
      return 'Enter systolic and diastolic values.';
    }
    const { systolic, diastolic } = value;
    if (systolic < 70 || systolic > 250) return 'Systolic must be between 70 and 250.';
    if (diastolic < 40 || diastolic > 150) return 'Diastolic must be between 40 and 150.';
    if (systolic <= diastolic) return 'Systolic must be greater than diastolic.';
    return null;
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) return 'Enter a valid number.';
  if (num < config.min || num > config.max) {
    return `${config.label} must be between ${config.min} and ${config.max}.`;
  }
  return null;
}
