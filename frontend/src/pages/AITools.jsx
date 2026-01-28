import React, { useState, useRef } from 'react';
import { aiService } from '../services/api';
import { FiSearch, FiClipboard, FiMap, FiTrendingUp, FiMessageSquare, FiDollarSign, FiMail, FiZap, FiUpload, FiLoader, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AITools = () => {
  const [activeTab, setActiveTab] = useState('pestId');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  // Pest Identifier
  const [pestImage, setPestImage] = useState(null);
  const [pestImageName, setPestImageName] = useState('');
  const [pestDescription, setPestDescription] = useState('');

  // Treatment Recommender
  const [treatmentPest, setTreatmentPest] = useState('');
  const [treatmentLocation, setTreatmentLocation] = useState('');
  const [treatmentSeverity, setTreatmentSeverity] = useState('moderate');

  // Route Optimizer
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
  const [routeTechId, setRouteTechId] = useState('');

  // Seasonal Predictor
  const [predictionZip, setPredictionZip] = useState('');

  // Quote Generator
  const [quoteServices, setQuoteServices] = useState('');
  const [quotePropertySize, setQuotePropertySize] = useState('');

  const handlePestIdentify = async () => {
    if (!pestDescription) { toast.error('Please describe the pest'); return; }
    setLoading(true); setResult(null);
    try {
      const response = await aiService.identifyPest({ description: pestDescription, imageUrl: pestImage });
      setResult({ type: 'pestId', data: response.data });
    } catch (error) { toast.error('Failed to identify pest'); } finally { setLoading(false); }
  };

  const handleTreatmentRecommend = async () => {
    if (!treatmentPest) { toast.error('Please specify the pest type'); return; }
    setLoading(true); setResult(null);
    try {
      const response = await aiService.recommendTreatment({ pestType: treatmentPest, location: treatmentLocation, severity: treatmentSeverity });
      setResult({ type: 'treatment', data: response.data });
    } catch (error) { toast.error('Failed to get recommendations'); } finally { setLoading(false); }
  };

  const handleOptimizeRoute = async () => {
    setLoading(true); setResult(null);
    try {
      const response = await aiService.optimizeRoute({ date: routeDate, technicianId: routeTechId || undefined });
      setResult({ type: 'route', data: response.data });
      toast.success('Route optimized!');
    } catch (error) { toast.error('Failed to optimize route'); } finally { setLoading(false); }
  };

  const handlePredict = async () => {
    if (!predictionZip) { toast.error('Please enter a ZIP code'); return; }
    setLoading(true); setResult(null);
    try {
      const response = await aiService.predictSeasonal({ zipCode: predictionZip });
      setResult({ type: 'prediction', data: response.data });
    } catch (error) { toast.error('Failed to get predictions'); } finally { setLoading(false); }
  };

  const handleGenerateQuote = async () => {
    if (!quoteServices) { toast.error('Please specify services'); return; }
    setLoading(true); setResult(null);
    try {
      const response = await aiService.generateQuote({ services: quoteServices.split(',').map(s => s.trim()), propertySize: quotePropertySize });
      setResult({ type: 'quote', data: response.data });
    } catch (error) { toast.error('Failed to generate quote'); } finally { setLoading(false); }
  };

  const tools = [
    { id: 'pestId', label: 'Pest Identifier', icon: FiSearch, color: 'bg-red-100 text-red-600' },
    { id: 'treatment', label: 'Treatment Recommender', icon: FiClipboard, color: 'bg-blue-100 text-blue-600' },
    { id: 'route', label: 'Route Optimizer', icon: FiMap, color: 'bg-green-100 text-green-600' },
    { id: 'seasonal', label: 'Seasonal Predictor', icon: FiTrendingUp, color: 'bg-purple-100 text-purple-600' },
    { id: 'quote', label: 'Quote Generator', icon: FiDollarSign, color: 'bg-yellow-100 text-yellow-600' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Tools</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {tools.map((tool) => (
          <button key={tool.id} onClick={() => { setActiveTab(tool.id); setResult(null); }} className={`p-4 rounded-xl border-2 text-center transition-all ${activeTab === tool.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className={`w-12 h-12 rounded-full ${tool.color} flex items-center justify-center mx-auto mb-2`}><tool.icon className="w-6 h-6" /></div>
            <p className="text-sm font-medium">{tool.label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">{tools.find(t => t.id === activeTab)?.label}</h2>

          {activeTab === 'pestId' && (
            <div className="space-y-4">
              <div><label className="label">Describe the pest</label><textarea value={pestDescription} onChange={(e) => setPestDescription(e.target.value)} className="input" rows={4} placeholder="Describe what you see: size, color, number of legs, wings, where found, etc." /></div>
              <div><label className="label">Upload Image (optional)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
                >
                  {pestImageName ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm text-primary-600 font-medium">{pestImageName}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPestImage(null); setPestImageName(''); }} className="p-1 hover:bg-red-100 rounded"><FiX className="w-4 h-4 text-red-500" /></button>
                    </div>
                  ) : (
                    <>
                      <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Click to upload image</p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files[0]; if (file) { setPestImage(file); setPestImageName(file.name); } }} />
                </div>
              </div>
              <button onClick={handlePestIdentify} disabled={loading} className="btn btn-primary w-full">{loading ? <FiLoader className="w-5 h-5 animate-spin" /> : 'Identify Pest'}</button>
            </div>
          )}

          {activeTab === 'treatment' && (
            <div className="space-y-4">
              <div><label className="label">Pest Type *</label><input type="text" value={treatmentPest} onChange={(e) => setTreatmentPest(e.target.value)} className="input" placeholder="e.g., Cockroaches, Ants, Rodents" /></div>
              <div><label className="label">Location</label><input type="text" value={treatmentLocation} onChange={(e) => setTreatmentLocation(e.target.value)} className="input" placeholder="e.g., Kitchen, Basement, Exterior" /></div>
              <div><label className="label">Severity</label><select value={treatmentSeverity} onChange={(e) => setTreatmentSeverity(e.target.value)} className="select"><option value="light">Light</option><option value="moderate">Moderate</option><option value="severe">Severe</option></select></div>
              <button onClick={handleTreatmentRecommend} disabled={loading} className="btn btn-primary w-full">{loading ? <FiLoader className="w-5 h-5 animate-spin" /> : 'Get Recommendations'}</button>
            </div>
          )}

          {activeTab === 'route' && (
            <div className="space-y-4">
              <div><label className="label">Date</label><input type="date" value={routeDate} onChange={(e) => setRouteDate(e.target.value)} className="input" /></div>
              <div><label className="label">Technician ID (optional)</label><input type="text" value={routeTechId} onChange={(e) => setRouteTechId(e.target.value)} className="input" placeholder="Leave blank for all technicians" /></div>
              <button onClick={handleOptimizeRoute} disabled={loading} className="btn btn-primary w-full">{loading ? <FiLoader className="w-5 h-5 animate-spin" /> : 'Optimize Routes'}</button>
            </div>
          )}

          {activeTab === 'seasonal' && (
            <div className="space-y-4">
              <div><label className="label">ZIP Code *</label><input type="text" value={predictionZip} onChange={(e) => setPredictionZip(e.target.value)} className="input" placeholder="Enter ZIP code" /></div>
              <button onClick={handlePredict} disabled={loading} className="btn btn-primary w-full">{loading ? <FiLoader className="w-5 h-5 animate-spin" /> : 'Get Predictions'}</button>
            </div>
          )}

          {activeTab === 'quote' && (
            <div className="space-y-4">
              <div><label className="label">Services (comma-separated) *</label><input type="text" value={quoteServices} onChange={(e) => setQuoteServices(e.target.value)} className="input" placeholder="e.g., General Pest Control, Termite Treatment" /></div>
              <div><label className="label">Property Size</label><input type="text" value={quotePropertySize} onChange={(e) => setQuotePropertySize(e.target.value)} className="input" placeholder="e.g., 2000 sq ft" /></div>
              <button onClick={handleGenerateQuote} disabled={loading} className="btn btn-primary w-full">{loading ? <FiLoader className="w-5 h-5 animate-spin" /> : 'Generate Quote'}</button>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Results</h2>
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="text-center"><FiLoader className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" /><p className="text-gray-500">AI is analyzing...</p></div></div>
          ) : result ? (
            <div className="space-y-4">
              {result.type === 'pestId' && (
                <div>
                  <div className="p-4 bg-green-50 rounded-lg mb-4"><h3 className="font-semibold text-green-800">Identified: {result.data.identification?.name || 'Unknown'}</h3><p className="text-sm text-green-600">Confidence: {result.data.identification?.confidence || 'N/A'}%</p></div>
                  <div><h4 className="font-medium mb-2">Description</h4><p className="text-sm text-gray-600">{result.data.identification?.description || 'No description available'}</p></div>
                  {result.data.recommendations && <div className="mt-4"><h4 className="font-medium mb-2">Recommendations</h4><ul className="list-disc list-inside text-sm text-gray-600">{result.data.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}</ul></div>}
                </div>
              )}
              {result.type === 'treatment' && (
                <div>
                  <h3 className="font-semibold mb-4">Treatment Recommendations</h3>
                  {result.data.recommendations?.map((rec, i) => (
                    <div key={i} className="p-4 border rounded-lg mb-3">
                      <h4 className="font-medium">{rec.product}</h4>
                      <p className="text-sm text-gray-600">{rec.method}</p>
                      <p className="text-sm text-gray-500">Application Rate: {rec.applicationRate}</p>
                    </div>
                  ))}
                  {result.data.safetyNotes && <div className="p-4 bg-yellow-50 rounded-lg"><h4 className="font-medium text-yellow-800">Safety Notes</h4><p className="text-sm text-yellow-700">{result.data.safetyNotes}</p></div>}
                </div>
              )}
              {result.type === 'route' && (
                <div>
                  <h3 className="font-semibold mb-4">Optimized Route</h3>
                  <div className="space-y-2">
                    {result.data.optimizedStops?.map((stop, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-700">{i + 1}</div>
                        <div><p className="font-medium">{stop.address}</p><p className="text-sm text-gray-500">{stop.estimatedTime}</p></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg"><p className="text-sm">Total Distance: <span className="font-semibold">{result.data.totalDistance} miles</span></p><p className="text-sm">Estimated Time: <span className="font-semibold">{result.data.totalDuration}</span></p><p className="text-sm">Savings: <span className="font-semibold text-green-600">{result.data.savings}</span></p></div>
                </div>
              )}
              {result.type === 'prediction' && (
                <div>
                  <h3 className="font-semibold mb-4">Seasonal Pest Predictions</h3>
                  {result.data.predictions?.map((pred, i) => (
                    <div key={i} className="p-4 border rounded-lg mb-3">
                      <div className="flex items-center justify-between"><h4 className="font-medium">{pred.pest}</h4><span className={`badge ${pred.risk === 'High' ? 'badge-red' : pred.risk === 'Medium' ? 'badge-yellow' : 'badge-green'}`}>{pred.risk} Risk</span></div>
                      <p className="text-sm text-gray-600 mt-2">{pred.notes}</p>
                    </div>
                  ))}
                </div>
              )}
              {result.type === 'quote' && (
                <div>
                  <h3 className="font-semibold mb-4">Generated Quote</h3>
                  <div className="space-y-3">
                    {result.data.lineItems?.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg"><span>{item.service}</span><span className="font-semibold">${item.price}</span></div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-primary-50 rounded-lg text-right"><p className="text-sm text-gray-600">Subtotal: ${result.data.subtotal}</p>{result.data.discount > 0 && <p className="text-sm text-green-600">Discount: -${result.data.discount}</p>}<p className="text-xl font-bold text-primary-700">Total: ${result.data.total}</p></div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400"><p>Results will appear here</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITools;
