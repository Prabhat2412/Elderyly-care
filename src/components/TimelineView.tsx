import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, Activity, Smile, AlertTriangle,
  Calendar, ChevronLeft, ChevronRight, Clock, Filter,
  Loader2
} from 'lucide-react';
import dayjs from 'dayjs';
import { useDataStore } from '../store/useDataStore';
import { TimelineEvent } from '../types';

const EVENT_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; label: string }> = {
  completed_task: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    label: 'Completed',
  },
  missed_task: {
    icon: <XCircle className="w-5 h-5" />,
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Missed',
  },
  health_log: {
    icon: <Activity className="w-5 h-5" />,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Vital',
  },
  check_in: {
    icon: <Smile className="w-5 h-5" />,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Check-in',
  },
  alert: {
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    label: 'Alert',
  },
};

type DateFilter = 'today' | 'yesterday' | 'all' | 'custom';

interface TimelineViewProps {
  patientId: number;
  patientName: string;
}

export function TimelineView({ patientId, patientName }: TimelineViewProps) {
  const { timelineEvents, timelineLoading, fetchTimeline } = useDataStore();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const dateString = useMemo(() => {
    switch (dateFilter) {
      case 'today': return dayjs().format('YYYY-MM-DD');
      case 'yesterday': return dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      case 'all': return 'all';
      case 'custom': return customDate;
    }
  }, [dateFilter, customDate]);

  useEffect(() => {
    if (patientId) {
      fetchTimeline(patientId, dateString);
    }
  }, [patientId, dateString, fetchTimeline]);

  const filteredEvents = useMemo(() => {
    if (typeFilter === 'all') return timelineEvents;
    return timelineEvents.filter((e) => e.type === typeFilter);
  }, [timelineEvents, typeFilter]);

  // Group events by date for "All Time" view
  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    for (const event of filteredEvents) {
      const dateKey = dayjs(event.timestamp).format('YYYY-MM-DD');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    }
    // Sort by date descending
    return Object.entries(groups).sort(([a], [b]) => (a > b ? -1 : 1));
  }, [filteredEvents]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const current = dateFilter === 'custom' ? dayjs(customDate) : dateFilter === 'yesterday' ? dayjs().subtract(1, 'day') : dayjs();
    const newDate = direction === 'prev' ? current.subtract(1, 'day') : current.add(1, 'day');
    setCustomDate(newDate.format('YYYY-MM-DD'));
    setDateFilter('custom');
  };

  const displayDateLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'all': return 'All Time';
      case 'custom': {
        const d = dayjs(customDate);
        if (d.isSame(dayjs(), 'day')) return 'Today';
        if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
        return d.format('ddd, MMM D, YYYY');
      }
    }
  };

  const eventTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: timelineEvents.length };
    for (const e of timelineEvents) {
      counts[e.type] = (counts[e.type] || 0) + 1;
    }
    return counts;
  }, [timelineEvents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Activity Timeline</h2>
          <p className="text-gray-400 text-sm font-medium mt-1">
            Tracking {patientName}'s care history
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-3 rounded-2xl border transition-all ${showFilters ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-white border-gray-100 text-gray-400'}`}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Date Navigation */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="text-xl font-black">{displayDateLabel()}</p>
            {dateFilter !== 'all' && (
              <p className="text-xs text-gray-400 font-medium">
                {dayjs(dateFilter === 'today' ? undefined : dateFilter === 'yesterday' ? dayjs().subtract(1, 'day') : customDate).format('dddd, MMMM D, YYYY')}
              </p>
            )}
          </div>
          <button
            onClick={() => navigateDate('next')}
            disabled={dateFilter === 'today' || (dateFilter === 'custom' && dayjs(customDate).isSame(dayjs(), 'day'))}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['today', 'yesterday', 'all'] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-all ${
                dateFilter === f
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-200'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? 'All Time' : f}
            </button>
          ))}
          <div className="relative">
            <input
              type="date"
              value={customDate}
              max={dayjs().format('YYYY-MM-DD')}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDateFilter('custom');
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all appearance-none cursor-pointer ${
                dateFilter === 'custom'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-200'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Type Filters (collapsible) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Filter by Type</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  All ({eventTypeCounts.all || 0})
                </button>
                {Object.entries(EVENT_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setTypeFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      typeFilter === key ? `${cfg.bg} ${cfg.color} ${cfg.border} border` : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {cfg.label} ({eventTypeCounts[key] || 0})
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      {timelineLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-rose-400 animate-spin mb-4" />
          <p className="text-gray-400 font-medium">Loading timeline...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-xl font-bold text-gray-600 mb-2">No activity found</p>
          <p className="text-gray-400 text-sm">
            {dateFilter === 'all'
              ? 'No events have been recorded yet.'
              : `No events recorded for ${displayDateLabel().toLowerCase()}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedEvents.map(([dateKey, events]) => (
            <div key={dateKey}>
              {/* Date group header (only in "All Time" mode) */}
              {dateFilter === 'all' && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-sm font-bold text-gray-500">
                    {dayjs(dateKey).isSame(dayjs(), 'day')
                      ? 'Today'
                      : dayjs(dateKey).isSame(dayjs().subtract(1, 'day'), 'day')
                        ? 'Yesterday'
                        : dayjs(dateKey).format('dddd, MMM D, YYYY')}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs font-medium text-gray-400">{events.length} events</span>
                </div>
              )}

              {/* Events list */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[27px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-gray-200 via-gray-100 to-transparent rounded-full" />

                <div className="space-y-3">
                  {events.map((event, idx) => {
                    const cfg = EVENT_CONFIG[event.type] || EVENT_CONFIG.alert;
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="flex items-start gap-4 relative"
                      >
                        {/* Timeline dot */}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color} shadow-sm relative z-10`}>
                          {cfg.icon}
                        </div>

                        {/* Content card */}
                        <div className={`flex-1 bg-white rounded-[20px] border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                              </div>
                              <p className="font-bold text-gray-900 text-sm leading-snug">{event.title}</p>
                            </div>
                            <div className="flex items-center gap-1 text-gray-400 flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              <span className="text-xs font-medium">{dayjs(event.timestamp).format('HH:mm')}</span>
                            </div>
                          </div>

                          {/* Meta info */}
                          {event.meta && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {event.meta.value && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold">
                                  {event.meta.value}
                                </span>
                              )}
                              {event.meta.notes && (
                                <span className="text-xs text-gray-400 italic">"{event.meta.notes}"</span>
                              )}
                              {event.meta.mood && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-semibold">
                                  Mood: {event.meta.mood}
                                </span>
                              )}
                              {event.meta.marked_by && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-gray-50 text-gray-500 text-xs font-semibold">
                                  Marked by: {event.meta.marked_by}
                                </span>
                              )}
                              {event.meta.message && (
                                <span className="text-xs text-gray-500">{event.meta.message}</span>
                              )}
                              {event.meta.resolved !== undefined && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${event.meta.resolved ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                  {event.meta.resolved ? 'Resolved' : 'Unresolved'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary stats footer */}
      {!timelineLoading && filteredEvents.length > 0 && (
        <div className="bg-white rounded-[24px] border border-gray-100 p-4 flex items-center justify-around">
          {Object.entries(EVENT_CONFIG).map(([key, cfg]) => {
            const count = eventTypeCounts[key] || 0;
            if (count === 0) return null;
            return (
              <div key={key} className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg} ${cfg.color}`}>
                  {React.cloneElement(cfg.icon as React.ReactElement, { className: 'w-4 h-4' })}
                </div>
                <span className="text-sm font-black">{count}</span>
                <span className="text-[10px] text-gray-400 font-medium">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
