import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { DailyTask } from '../types';
import { VitalReadingPayload } from '../lib/vitalMetrics';
import { VitalReadingForm } from './VitalReadingForm';
import { getMetricConfig } from '../lib/vitalMetrics';

interface VitalReadingModalProps {
  task: DailyTask | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (reading: VitalReadingPayload) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function VitalReadingModal({ task, open, onClose, onSubmit, isSubmitting }: VitalReadingModalProps) {
  const config = task ? getMetricConfig(task.metric_type) : null;

  return (
    <AnimatePresence>
      {open && task && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed left-4 right-4 bottom-4 sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[101] w-auto sm:w-full sm:max-w-md bg-white rounded-[32px] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black tracking-tight">Record Reading</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  {config?.label ?? 'Vital'} · scheduled {task.scheduled_time.substring(0, 5)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <VitalReadingForm
              metricType={task.metric_type}
              taskTitle={task.title}
              onSubmit={onSubmit}
              onCancel={onClose}
              submitLabel={isSubmitting ? 'Saving...' : 'Save & Mark Complete'}
              variant="modal"
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
