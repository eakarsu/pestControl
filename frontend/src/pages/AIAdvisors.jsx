import React, { useState } from 'react';
import { aiService } from '../services/api';
import { FiShield, FiUsers, FiLoader, FiPlay, FiTool } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AIAdvisors = () => {
  const [activeTab, setActiveTab] = useState('chemicalSafety');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Chemical Safety
  const [chemicalName, setChemicalName] = useState('');
  const [applicationContext, setApplicationContext] = useState('');
  const [environment, setEnvironment] = useState('residential');

  // Customer Churn
  const [customerProfile, setCustomerProfile] = useState(JSON.stringify({
    serviceMonths: 14,
    plansActive: ['monthly-pest'],
    lastVisitDays: 60,
    missedAppointments: 1,
    invoiceLateCount: 0,
    npsScore: 7,
  }, null, 2));
  const [lookbackDays, setLookbackDays] = useState(90);

  // Equipment Maintenance Scheduler
  const [equipmentJson, setEquipmentJson] = useState(JSON.stringify([
    { id: 'van-01', name: 'Service Van #1', type: 'vehicle', mileage: 64500, lastServiceDate: '2025-09-15', usageHoursWeek: 35 },
    { id: 'spray-01', name: 'Backpack Sprayer', type: 'equipment', cyclesSinceService: 220, lastServiceDate: '2025-08-01' }
  ], null, 2));
  const [horizonDays, setHorizonDays] = useState(60);

  const runChemicalSafety = async () => {
    if (!chemicalName) { toast.error('Please enter a chemical name'); return; }
    setLoading(true); setResult(null); setError(null);
    try {
      const response = await aiService.chemicalSafetyChecker({
        chemicalName,
        applicationContext,
        environment,
      });
      setResult({ type: 'chemicalSafety', data: response.data });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const runChurnPredictor = async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      let parsed;
      try { parsed = JSON.parse(customerProfile); }
      catch { setError('Customer profile must be valid JSON'); setLoading(false); return; }
      const response = await aiService.customerChurnPredictor({
        customerProfile: parsed,
        lookbackDays: Number(lookbackDays) || 90,
      });
      setResult({ type: 'churn', data: response.data });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const runEquipmentScheduler = async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      let parsed;
      try { parsed = JSON.parse(equipmentJson); }
      catch { setError('Equipment list must be valid JSON'); setLoading(false); return; }
      const response = await aiService.equipmentMaintenanceScheduler({
        equipment: parsed,
        horizonDays: Number(horizonDays) || 60,
      });
      setResult({ type: 'equipment', data: response.data });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const tools = [
    { id: 'chemicalSafety', label: 'Chemical Safety', icon: FiShield, color: 'bg-amber-100 text-amber-600' },
    { id: 'churn', label: 'Customer Churn', icon: FiUsers, color: 'bg-rose-100 text-rose-600' },
    { id: 'equipment', label: 'Equipment Maintenance', icon: FiTool, color: 'bg-emerald-100 text-emerald-600' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Advisors</h1>
        <p className="text-gray-500">Chemical safety checks and customer churn prediction.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-2">
          {tools.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setResult(null); setError(null); }}
                className={`w-full text-left p-4 rounded-lg border ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'} hover:border-blue-400 transition`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-2 ${t.color}`}>
                  <Icon size={18} />
                </div>
                <div className="font-medium text-gray-900">{t.label}</div>
              </button>
            );
          })}
        </div>

        <div className="md:col-span-3 space-y-4">
          <div className="bg-white border rounded-lg p-6">
            {activeTab === 'chemicalSafety' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Chemical Safety Checker</h2>
                <div>
                  <label className="block text-sm font-medium mb-1">Chemical / Active Ingredient</label>
                  <input
                    type="text"
                    value={chemicalName}
                    onChange={(e) => setChemicalName(e.target.value)}
                    placeholder="e.g., Bifenthrin 7.9%"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Application Context</label>
                  <textarea
                    value={applicationContext}
                    onChange={(e) => setApplicationContext(e.target.value)}
                    rows={4}
                    placeholder="Where, target pest, presence of children/pets, food contact surfaces..."
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Environment</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="food-service">Food Service</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="school">School / Childcare</option>
                    <option value="outdoor">Outdoor</option>
                  </select>
                </div>
                <button
                  onClick={runChemicalSafety}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {loading ? <FiLoader className="animate-spin" /> : <FiPlay />}
                  {loading ? 'Checking...' : 'Run Safety Check'}
                </button>
              </div>
            )}

            {activeTab === 'equipment' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Equipment Maintenance Scheduler</h2>
                <div>
                  <label className="block text-sm font-medium mb-1">Equipment List (JSON)</label>
                  <textarea
                    value={equipmentJson}
                    onChange={(e) => setEquipmentJson(e.target.value)}
                    rows={10}
                    className="w-full border rounded px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Horizon Days</label>
                  <input
                    type="number"
                    value={horizonDays}
                    onChange={(e) => setHorizonDays(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <button
                  onClick={runEquipmentScheduler}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {loading ? <FiLoader className="animate-spin" /> : <FiPlay />}
                  {loading ? 'Planning...' : 'Generate Schedule'}
                </button>
              </div>
            )}

            {activeTab === 'churn' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Customer Churn Predictor</h2>
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Profile (JSON)</label>
                  <textarea
                    value={customerProfile}
                    onChange={(e) => setCustomerProfile(e.target.value)}
                    rows={10}
                    className="w-full border rounded px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lookback Days</label>
                  <input
                    type="number"
                    value={lookbackDays}
                    onChange={(e) => setLookbackDays(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <button
                  onClick={runChurnPredictor}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {loading ? <FiLoader className="animate-spin" /> : <FiPlay />}
                  {loading ? 'Predicting...' : 'Predict Churn Risk'}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-sm">{error}</div>
          )}

          {result && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="font-semibold mb-3">Result</h3>
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-[480px]">
                {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAdvisors;
