import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import api from '../services/api';

const STATUS_COLORS = {
  active: '#16a34a',
  scheduled: '#2563eb',
  overdue: '#dc2626',
};

const ServiceAreaMap = () => {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    api.get('/custom-views/service-area-map')
      .then(res => { if (mounted) { setPoints(res.data.points || []); setLoading(false); } })
      .catch(err => { if (mounted) { setError(err.response?.data?.error || err.message); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  const filtered = filter === 'all' ? points : points.filter(p => p.status === filter);
  const center = filtered.length > 0
    ? [filtered.reduce((a, p) => a + p.lat, 0) / filtered.length, filtered.reduce((a, p) => a + p.lng, 0) / filtered.length]
    : [32.7767, -96.7970];

  const counts = points.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {});

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Service Area Map</h3>
          <p className="text-sm text-gray-500">Customer locations colored by service status</p>
        </div>
        <div className="flex gap-2 text-sm">
          {['all', 'active', 'scheduled', 'overdue'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded border ${filter === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              {s} {s !== 'all' ? `(${counts[s] || 0})` : `(${points.length})`}
            </button>
          ))}
        </div>
      </div>
      {loading && <div className="text-gray-500 py-6">Loading map...</div>}
      {error && <div className="text-red-600 py-6">Error: {error}</div>}
      {!loading && !error && (
        <div style={{ height: 480, width: '100%' }}>
          <MapContainer center={center} zoom={9} style={{ height: '100%', width: '100%', borderRadius: 8 }} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            {filtered.map(p => (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lng]}
                radius={7}
                pathOptions={{ color: STATUS_COLORS[p.status] || '#666', fillColor: STATUS_COLORS[p.status] || '#666', fillOpacity: 0.7 }}
              >
                <Tooltip>{p.customer} - {p.status}</Tooltip>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{p.name}</div>
                    <div>{p.address}</div>
                    <div className="mt-1">Customer: {p.customer}</div>
                    <div>Status: <span style={{ color: STATUS_COLORS[p.status] }}>{p.status}</span></div>
                    <div>Service orders: {p.orderCount}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}
      <div className="flex gap-4 mt-3 text-xs">
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <div key={s} className="flex items-center gap-1">
            <span style={{ background: c, width: 12, height: 12, borderRadius: '50%', display: 'inline-block' }} />
            <span className="capitalize">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceAreaMap;
