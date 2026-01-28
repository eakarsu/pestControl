import React, { useState, useEffect } from 'react';
import { routeService, technicianService } from '../services/api';
import { FiMap, FiNavigation, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const RoutesPage = () => {
  const [routes, setRoutes] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTech, setSelectedTech] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTechnicians(); }, []);
  useEffect(() => { if (selectedTech) loadRoutes(); }, [selectedDate, selectedTech]);

  const loadTechnicians = async () => { try { const response = await technicianService.getAll(); setTechnicians(response.data || []); if (response.data?.length) setSelectedTech(response.data[0].id); } catch (error) { toast.error('Failed to load technicians'); } };
  const loadRoutes = async () => { try { setLoading(true); const response = await routeService.getRoutes({ date: selectedDate, technicianId: selectedTech }); setRoutes(response.data || []); } catch (error) { console.error(error); } finally { setLoading(false); } };

  const handleOptimize = async () => {
    try { const response = await routeService.optimize({ date: selectedDate, technicianId: selectedTech }); toast.success('Route optimized!'); loadRoutes(); }
    catch (error) { toast.error('Failed to optimize route'); }
  };

  const currentRoute = routes[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Route Optimization</h1>
        <button onClick={handleOptimize} disabled={!selectedTech} className="btn btn-primary flex items-center gap-2"><FiRefreshCw className="w-5 h-5" /> Optimize Route</button>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="label">Date</label><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input" /></div>
          <div><label className="label">Technician</label><select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} className="select">
            <option value="">Select Technician</option>{technicians.map((t) => <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName}</option>)}
          </select></div>
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" /></div> : currentRoute ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <h3 className="font-semibold text-lg mb-4">Route Stops</h3>
            <div className="space-y-4">
              {currentRoute.stops?.map((stop, index) => (
                <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-700">{stop.order}</div>
                  <div className="flex-1">
                    <p className="font-medium">{stop.address}</p>
                    <p className="text-sm text-gray-500">{stop.serviceOrder?.serviceType?.name}</p>
                    <p className="text-sm text-gray-500">Est. duration: {stop.estimatedDuration} min</p>
                  </div>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(stop.address)}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm flex items-center gap-1"><FiNavigation className="w-4 h-4" /> Navigate</a>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-lg mb-4">Route Summary</h3>
            <div className="space-y-4">
              <div><p className="text-sm text-gray-500">Total Stops</p><p className="text-2xl font-bold">{currentRoute.stops?.length || 0}</p></div>
              <div><p className="text-sm text-gray-500">Total Distance</p><p className="text-2xl font-bold">{currentRoute.totalDistance?.toFixed(1) || 0} mi</p></div>
              <div><p className="text-sm text-gray-500">Est. Duration</p><p className="text-2xl font-bold">{Math.floor((currentRoute.totalDuration || 0) / 60)}h {(currentRoute.totalDuration || 0) % 60}m</p></div>
              <div><p className="text-sm text-gray-500">Status</p><span className={`badge ${currentRoute.status === 'COMPLETED' ? 'badge-green' : currentRoute.status === 'IN_PROGRESS' ? 'badge-blue' : 'badge-gray'}`}>{currentRoute.status}</span></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <FiMap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No route found for selected date and technician</p>
          <p className="text-sm text-gray-400 mt-2">Click "Optimize Route" to create one</p>
        </div>
      )}
    </div>
  );
};

export default RoutesPage;
