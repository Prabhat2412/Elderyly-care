import React from 'react';
import { Pill } from 'lucide-react';
import { LiveCountdown } from './LiveCountdown';

interface NextMedicationCardProps {
  name: string;
  dosage: string;
  nextDoseIso: string | null;
}

export function NextMedicationCard({ name, dosage, nextDoseIso }: NextMedicationCardProps) {
  if (!nextDoseIso) return null;

  return (
    <div className="bg-white p-5 sm:p-8 rounded-[32px] sm:rounded-[40px] border-4 border-rose-100 shadow-xl w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-rose-200 shrink-0">
            <Pill className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">
              Next Medication
            </p>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tighter truncate">{name}</h3>
            <p className="text-base sm:text-lg font-bold text-gray-500 truncate">{dosage}</p>
          </div>
        </div>
        <LiveCountdown
          targetIso={nextDoseIso}
          variant="med"
          label="Until next dose"
          className="w-full sm:w-auto"
        />
      </div>
    </div>
  );
}
