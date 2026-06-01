import React, { useState } from 'react';
import { getMetricConfig, normalizeMetricType, validateVitalReading, VitalReadingPayload } from '../lib/vitalMetrics';

interface VitalReadingFormProps {
  metricType?: string | null;
  taskTitle?: string;
  onSubmit: (reading: VitalReadingPayload) => void;
  onCancel?: () => void;
  submitLabel?: string;
  variant?: 'modal' | 'inline';
}

export function VitalReadingForm({
  metricType,
  taskTitle,
  onSubmit,
  onCancel,
  submitLabel = 'Save & Mark Complete',
  variant = 'modal',
}: VitalReadingFormProps) {
  const config = getMetricConfig(metricType);
  const type = normalizeMetricType(metricType);

  const [value, setValue] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!config || !type) {
    return (
      <p className="text-rose-600 font-bold text-sm">
        This vital task is missing a metric type. Ask your caregiver to update the schedule.
      </p>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let readingValue: VitalReadingPayload['value'];
    if (config.isBloodPressure) {
      readingValue = {
        systolic: parseInt(systolic, 10),
        diastolic: parseInt(diastolic, 10),
      };
    } else {
      readingValue = parseFloat(value);
    }

    const validationError = validateVitalReading(type, readingValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    onSubmit({ value: readingValue, notes: notes.trim() || undefined });
  };

  const wrapperClass =
    variant === 'modal'
      ? 'space-y-5'
      : 'bg-indigo-50 p-8 rounded-[40px] border border-indigo-100 space-y-6';

  return (
    <form onSubmit={handleSubmit} className={wrapperClass}>
      {taskTitle && (
        <p className="text-sm font-bold text-gray-600">
          Recording for: <span className="text-gray-900">{taskTitle}</span>
        </p>
      )}

      <div className="space-y-2">
        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">
          {config.label} ({config.unit})
        </label>
        {config.isBloodPressure ? (
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              placeholder="Systolic"
              className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <span className="text-gray-400 font-black">/</span>
            <input
              type="number"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              placeholder="Diastolic"
              className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        ) : (
          <input
            type="number"
            step={config.step ?? '1'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={config.placeholder}
            className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        )}
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations..."
          className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 h-20"
        />
      </div>

      {error && (
        <p className="text-rose-600 text-sm font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
