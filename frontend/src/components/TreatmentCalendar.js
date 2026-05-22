import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const CHEM_COLORS = {
  Insecticide: '#dc2626',
  Rodenticide: '#7c3aed',
  Herbicide: '#16a34a',
  Fungicide: '#0891b2',
  General: '#64748b',
  Other: '#f59e0b',
  Chemical: '#dc2626',
};

function colorFor(type) {
  if (!type) return CHEM_COLORS.General;
  for (const k of Object.keys(CHEM_COLORS)) {
    if (type.toLowerCase().includes(k.toLowerCase())) return CHEM_COLORS[k];
  }
  return '#3b82f6';
}

const TreatmentCalendar = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedTech, setSelectedTech] = useState('all');

  useEffect(() => {
    setLoading(true);
    api.get(`/custom-views/treatment-calendar?monthOffset=${monthOffset}`)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => { setError(err.response?.data?.error || err.message); setLoading(false); });
  }, [monthOffset]);

  const { gridDays, daysInMonth, firstWeekday, monthName } = useMemo(() => {
    if (!data) return { gridDays: [], daysInMonth: 0, firstWeekday: 0, monthName: '' };
    const start = new Date(data.monthStart);
    const dim = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const fw = start.getDay();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return {
      gridDays: Array.from({ length: dim }, (_, i) => i + 1),
      daysInMonth: dim,
      firstWeekday: fw,
      monthName: monthNames[start.getMonth()] + ' ' + start.getFullYear(),
    };
  }, [data]);

  const eventsByDay = useMemo(() => {
    if (!data) return {};
    const filtered = selectedTech === 'all' ? data.events : data.events.filter(e => (e.technicianId || 'unassigned') === selectedTech);
    const map = {};
    for (const e of filtered) {
      (map[e.day] = map[e.day] || []).push(e);
    }
    return map;
  }, [data, selectedTech]);

  const totalCells = firstWeekday + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Treatment Calendar</h3>
          <p className="text-sm text-gray-500">{monthName} - treatments per technician, color by chemical type</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthOffset(monthOffset - 1)} className="px-2 py-1 border rounded">Prev</button>
          <button onClick={() => setMonthOffset(0)} className="px-2 py-1 border rounded">Today</button>
          <button onClick={() => setMonthOffset(monthOffset + 1)} className="px-2 py-1 border rounded">Next</button>
          <select value={selectedTech} onChange={e => setSelectedTech(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="all">All Technicians</option>
            {(data?.technicians || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="text-gray-500 py-6">Loading calendar...</div>}
      {error && <div className="text-red-600 py-6">Error: {error}</div>}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-7 gap-1 mb-1 text-xs text-gray-500 font-medium">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: rows * 7 }, (_, i) => {
              const dayIdx = i - firstWeekday + 1;
              const inMonth = dayIdx >= 1 && dayIdx <= daysInMonth;
              const evs = inMonth ? (eventsByDay[dayIdx] || []) : [];
              return (
                <div key={i} className={`min-h-[88px] border rounded p-1 text-xs ${inMonth ? 'bg-white' : 'bg-gray-50'}`}>
                  {inMonth && <div className="text-gray-400 mb-1">{dayIdx}</div>}
                  {evs.slice(0, 3).map(e => (
                    <div key={e.id} title={`${e.serviceType} - ${e.technicianName} - ${e.chemicalType}`}
                         className="truncate rounded px-1 py-0.5 mb-0.5 text-white"
                         style={{ background: colorFor(e.chemicalType) }}>
                      {e.technicianName.split(' ')[0]}: {e.chemicalType}
                    </div>
                  ))}
                  {evs.length > 3 && <div className="text-gray-500">+{evs.length - 3} more</div>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-3 text-xs flex-wrap">
            {Object.entries(CHEM_COLORS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1">
                <span style={{ background: v, width: 12, height: 12, borderRadius: 2, display: 'inline-block' }} />
                <span>{k}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">Total events this month: {data.events.length}</div>
        </>
      )}
    </div>
  );
};

export default TreatmentCalendar;
