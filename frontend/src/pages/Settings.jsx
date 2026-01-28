import React, { useState, useEffect } from 'react';
import { settingsService } from '../services/api';
import { FiSave, FiUser, FiBell, FiLock, FiMail, FiGlobe, FiDollarSign, FiCreditCard, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    company: { name: '', address: '', city: '', state: '', zip: '', phone: '', email: '', website: '', logo: '' },
    notifications: { emailOnNewLead: true, emailOnServiceComplete: true, emailOnPayment: true, smsEnabled: false, dailyDigest: true },
    billing: { taxRate: 0, paymentTerms: 30, acceptedPayments: ['CREDIT_CARD', 'CHECK'], stripeEnabled: false, stripeKey: '' },
    scheduling: { defaultServiceDuration: 60, workdayStart: '08:00', workdayEnd: '17:00', workDays: [1, 2, 3, 4, 5], bufferTime: 15 },
    integrations: { googleMapsKey: '', twilioEnabled: false, twilioSid: '', openaiEnabled: false, openaiKey: '' }
  });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsService.getAll();
      if (response.data) setSettings(prev => ({ ...prev, ...response.data }));
    } catch (error) { console.error(error); }
  };

  const handleSave = async (section) => {
    setLoading(true);
    try {
      await settingsService.update({ [section]: settings[section] });
      toast.success('Settings saved');
    } catch (error) { toast.error('Failed to save settings'); } finally { setLoading(false); }
  };

  const tabs = [
    { id: 'company', label: 'Company', icon: FiGlobe },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    { id: 'billing', label: 'Billing', icon: FiDollarSign },
    { id: 'scheduling', label: 'Scheduling', icon: FiMapPin },
    { id: 'integrations', label: 'Integrations', icon: FiLock },
    { id: 'profile', label: 'My Profile', icon: FiUser }
  ];

  const updateSetting = (section, key, value) => {
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };

  const toggleArrayItem = (section, key, item) => {
    const current = settings[section][key] || [];
    const updated = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
    updateSetting(section, key, updated);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="flex gap-6">
        <div className="w-64 space-y-1">{tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            <tab.icon className="w-5 h-5" />{tab.label}
          </button>
        ))}</div>

        <div className="flex-1 card">
          {activeTab === 'company' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Company Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="label">Company Name</label><input type="text" value={settings.company.name} onChange={(e) => updateSetting('company', 'name', e.target.value)} className="input" /></div>
                <div className="col-span-2"><label className="label">Address</label><input type="text" value={settings.company.address} onChange={(e) => updateSetting('company', 'address', e.target.value)} className="input" /></div>
                <div><label className="label">City</label><input type="text" value={settings.company.city} onChange={(e) => updateSetting('company', 'city', e.target.value)} className="input" /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="label">State</label><input type="text" value={settings.company.state} onChange={(e) => updateSetting('company', 'state', e.target.value)} className="input" /></div><div><label className="label">ZIP</label><input type="text" value={settings.company.zip} onChange={(e) => updateSetting('company', 'zip', e.target.value)} className="input" /></div></div>
                <div><label className="label">Phone</label><input type="tel" value={settings.company.phone} onChange={(e) => updateSetting('company', 'phone', e.target.value)} className="input" /></div>
                <div><label className="label">Email</label><input type="email" value={settings.company.email} onChange={(e) => updateSetting('company', 'email', e.target.value)} className="input" /></div>
                <div className="col-span-2"><label className="label">Website</label><input type="url" value={settings.company.website} onChange={(e) => updateSetting('company', 'website', e.target.value)} className="input" /></div>
              </div>
              <button onClick={() => handleSave('company')} disabled={loading} className="btn btn-primary flex items-center gap-2"><FiSave className="w-4 h-4" /> Save Changes</button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Notification Preferences</h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer"><div><p className="font-medium">New Lead Notifications</p><p className="text-sm text-gray-500">Receive email when a new lead is created</p></div><input type="checkbox" checked={settings.notifications.emailOnNewLead} onChange={(e) => updateSetting('notifications', 'emailOnNewLead', e.target.checked)} className="w-5 h-5 rounded" /></label>
                <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer"><div><p className="font-medium">Service Completion</p><p className="text-sm text-gray-500">Receive email when a service is completed</p></div><input type="checkbox" checked={settings.notifications.emailOnServiceComplete} onChange={(e) => updateSetting('notifications', 'emailOnServiceComplete', e.target.checked)} className="w-5 h-5 rounded" /></label>
                <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer"><div><p className="font-medium">Payment Received</p><p className="text-sm text-gray-500">Receive email when a payment is processed</p></div><input type="checkbox" checked={settings.notifications.emailOnPayment} onChange={(e) => updateSetting('notifications', 'emailOnPayment', e.target.checked)} className="w-5 h-5 rounded" /></label>
                <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer"><div><p className="font-medium">SMS Notifications</p><p className="text-sm text-gray-500">Enable SMS notifications for urgent items</p></div><input type="checkbox" checked={settings.notifications.smsEnabled} onChange={(e) => updateSetting('notifications', 'smsEnabled', e.target.checked)} className="w-5 h-5 rounded" /></label>
                <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer"><div><p className="font-medium">Daily Digest</p><p className="text-sm text-gray-500">Receive daily summary email</p></div><input type="checkbox" checked={settings.notifications.dailyDigest} onChange={(e) => updateSetting('notifications', 'dailyDigest', e.target.checked)} className="w-5 h-5 rounded" /></label>
              </div>
              <button onClick={() => handleSave('notifications')} disabled={loading} className="btn btn-primary flex items-center gap-2"><FiSave className="w-4 h-4" /> Save Changes</button>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Billing Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Tax Rate (%)</label><input type="number" step="0.01" value={settings.billing.taxRate} onChange={(e) => updateSetting('billing', 'taxRate', parseFloat(e.target.value))} className="input" /></div>
                <div><label className="label">Payment Terms (days)</label><input type="number" value={settings.billing.paymentTerms} onChange={(e) => updateSetting('billing', 'paymentTerms', parseInt(e.target.value))} className="input" /></div>
              </div>
              <div><label className="label">Accepted Payment Methods</label>
                <div className="flex flex-wrap gap-2">{['CREDIT_CARD', 'CHECK', 'CASH', 'ACH', 'INVOICE'].map((method) => (
                  <button key={method} type="button" onClick={() => toggleArrayItem('billing', 'acceptedPayments', method)} className={`px-4 py-2 rounded-lg text-sm border ${settings.billing.acceptedPayments?.includes(method) ? 'bg-primary-100 border-primary-500 text-primary-700' : 'border-gray-300'}`}>{method.replace('_', ' ')}</button>
                ))}</div>
              </div>
              <div className="border-t pt-4"><h3 className="font-medium mb-4">Stripe Integration</h3>
                <label className="flex items-center gap-3 mb-4"><input type="checkbox" checked={settings.billing.stripeEnabled} onChange={(e) => updateSetting('billing', 'stripeEnabled', e.target.checked)} className="w-5 h-5 rounded" /><span>Enable Stripe Payments</span></label>
                {settings.billing.stripeEnabled && <div><label className="label">Stripe API Key</label><input type="password" value={settings.billing.stripeKey} onChange={(e) => updateSetting('billing', 'stripeKey', e.target.value)} className="input" placeholder="sk_live_..." /></div>}
              </div>
              <button onClick={() => handleSave('billing')} disabled={loading} className="btn btn-primary flex items-center gap-2"><FiSave className="w-4 h-4" /> Save Changes</button>
            </div>
          )}

          {activeTab === 'scheduling' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Scheduling Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Default Service Duration (min)</label><input type="number" value={settings.scheduling.defaultServiceDuration} onChange={(e) => updateSetting('scheduling', 'defaultServiceDuration', parseInt(e.target.value))} className="input" /></div>
                <div><label className="label">Buffer Time Between Jobs (min)</label><input type="number" value={settings.scheduling.bufferTime} onChange={(e) => updateSetting('scheduling', 'bufferTime', parseInt(e.target.value))} className="input" /></div>
                <div><label className="label">Workday Start</label><input type="time" value={settings.scheduling.workdayStart} onChange={(e) => updateSetting('scheduling', 'workdayStart', e.target.value)} className="input" /></div>
                <div><label className="label">Workday End</label><input type="time" value={settings.scheduling.workdayEnd} onChange={(e) => updateSetting('scheduling', 'workdayEnd', e.target.value)} className="input" /></div>
              </div>
              <div><label className="label">Work Days</label>
                <div className="flex gap-2">{[{ day: 0, label: 'Sun' }, { day: 1, label: 'Mon' }, { day: 2, label: 'Tue' }, { day: 3, label: 'Wed' }, { day: 4, label: 'Thu' }, { day: 5, label: 'Fri' }, { day: 6, label: 'Sat' }].map(({ day, label }) => (
                  <button key={day} type="button" onClick={() => toggleArrayItem('scheduling', 'workDays', day)} className={`w-12 h-12 rounded-full text-sm font-medium ${settings.scheduling.workDays?.includes(day) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>
                ))}</div>
              </div>
              <button onClick={() => handleSave('scheduling')} disabled={loading} className="btn btn-primary flex items-center gap-2"><FiSave className="w-4 h-4" /> Save Changes</button>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Integrations</h2>
              <div className="space-y-6">
                <div className="p-4 border rounded-lg"><h3 className="font-medium mb-4">Google Maps</h3><div><label className="label">API Key</label><input type="password" value={settings.integrations.googleMapsKey} onChange={(e) => updateSetting('integrations', 'googleMapsKey', e.target.value)} className="input" placeholder="AIza..." /></div></div>
                <div className="p-4 border rounded-lg"><h3 className="font-medium mb-4">Twilio (SMS)</h3>
                  <label className="flex items-center gap-3 mb-4"><input type="checkbox" checked={settings.integrations.twilioEnabled} onChange={(e) => updateSetting('integrations', 'twilioEnabled', e.target.checked)} className="w-5 h-5 rounded" /><span>Enable Twilio</span></label>
                  {settings.integrations.twilioEnabled && <div><label className="label">Account SID</label><input type="password" value={settings.integrations.twilioSid} onChange={(e) => updateSetting('integrations', 'twilioSid', e.target.value)} className="input" /></div>}
                </div>
                <div className="p-4 border rounded-lg"><h3 className="font-medium mb-4">OpenAI (AI Features)</h3>
                  <label className="flex items-center gap-3 mb-4"><input type="checkbox" checked={settings.integrations.openaiEnabled} onChange={(e) => updateSetting('integrations', 'openaiEnabled', e.target.checked)} className="w-5 h-5 rounded" /><span>Enable AI Features</span></label>
                  {settings.integrations.openaiEnabled && <div><label className="label">API Key</label><input type="password" value={settings.integrations.openaiKey} onChange={(e) => updateSetting('integrations', 'openaiKey', e.target.value)} className="input" placeholder="sk-..." /></div>}
                </div>
              </div>
              <button onClick={() => handleSave('integrations')} disabled={loading} className="btn btn-primary flex items-center gap-2"><FiSave className="w-4 h-4" /> Save Changes</button>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">My Profile</h2>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center"><span className="text-3xl font-bold text-primary-700">{user?.firstName?.[0]}{user?.lastName?.[0]}</span></div>
                <div><p className="text-xl font-semibold">{user?.firstName} {user?.lastName}</p><p className="text-gray-500">{user?.email}</p><p className="badge badge-blue mt-2">{user?.role}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">First Name</label><input type="text" defaultValue={user?.firstName} className="input" /></div>
                <div><label className="label">Last Name</label><input type="text" defaultValue={user?.lastName} className="input" /></div>
                <div><label className="label">Email</label><input type="email" defaultValue={user?.email} className="input" /></div>
                <div><label className="label">Phone</label><input type="tel" defaultValue={user?.phone} className="input" /></div>
              </div>
              <div className="border-t pt-4"><h3 className="font-medium mb-4">Change Password</h3>
                <div className="grid grid-cols-2 gap-4"><div><label className="label">Current Password</label><input type="password" className="input" /></div><div></div><div><label className="label">New Password</label><input type="password" className="input" /></div><div><label className="label">Confirm Password</label><input type="password" className="input" /></div></div>
              </div>
              <button onClick={() => toast.success('Profile updated')} disabled={loading} className="btn btn-primary flex items-center gap-2"><FiSave className="w-4 h-4" /> Save Changes</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
