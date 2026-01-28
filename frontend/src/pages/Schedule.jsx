import React, { useState, useEffect } from 'react';
import { scheduleService, technicianService, serviceOrderService } from '../services/api';
import { FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Schedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState({});
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSchedule(); loadTechnicians(); }, [currentDate]);

  const loadSchedule = async () => {
    try { setLoading(true);
      const startDate = new Date(currentDate); startDate.setDate(startDate.getDate() - startDate.getDay());
      const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 6);
      const response = await scheduleService.getSchedule({ startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] });
      setSchedule(response.data);
    } catch (error) { toast.error('Failed to load schedule'); } finally { setLoading(false); }
  };

  const loadTechnicians = async () => { try { const response = await technicianService.getAll(); setTechnicians(response.data || []); } catch (error) {} };

  const getWeekDays = () => {
    const start = new Date(currentDate); start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  };

  const navigateWeek = (direction) => { const newDate = new Date(currentDate); newDate.setDate(newDate.getDate() + (direction * 7)); setCurrentDate(newDate); };

  const weekDays = getWeekDays();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><FiChevronLeft className="w-5 h-5" /></button>
          <span className="font-medium">{weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-gray-100 rounded-lg"><FiChevronRight className="w-5 h-5" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="btn btn-secondary">Today</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" /></div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-40">Technician</th>
                  {weekDays.map((day) => (
                    <th key={day.toISOString()} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <div className="text-center">
                        <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className={`text-lg font-semibold ${day.toDateString() === new Date().toDateString() ? 'text-primary-600' : 'text-gray-900'}`}>{day.getDate()}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {technicians.map((tech) => (
                  <tr key={tech.id}>
                    <td className="px-4 py-3"><div className="font-medium">{tech.user?.firstName} {tech.user?.lastName}</div></td>
                    {weekDays.map((day) => {
                      const dateKey = day.toISOString().split('T')[0];
                      const orders = schedule[dateKey]?.filter(o => o.technicianId === tech.id) || [];
                      return (
                        <td key={dateKey} className="px-2 py-2 min-w-[120px]">
                          <div className="space-y-1">
                            {orders.map((order) => (
                              <div key={order.id} className={`text-xs p-2 rounded ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                <div className="font-medium truncate">{order.scheduledTimeStart}</div>
                                <div className="truncate">{order.property?.customer?.lastName}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
