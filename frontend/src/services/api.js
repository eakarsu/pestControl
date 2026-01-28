import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API service functions
export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updatePassword: (data) => api.put('/auth/password', data)
};

export const customerService = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getServiceHistory: (id) => api.get(`/customers/${id}/service-history`),
  getBilling: (id) => api.get(`/customers/${id}/billing`)
};

export const propertyService = {
  getAll: (params) => api.get('/properties', { params }),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
  getPestIssues: (id) => api.get(`/properties/${id}/pest-issues`),
  addPestIssue: (id, data) => api.post(`/properties/${id}/pest-issues`, data)
};

export const contractService = {
  getAll: (params) => api.get('/contracts', { params }),
  getById: (id) => api.get(`/contracts/${id}`),
  create: (data) => api.post('/contracts', data),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  delete: (id) => api.delete(`/contracts/${id}`),
  sign: (id, data) => api.post(`/contracts/${id}/sign`, data),
  renew: (id, data) => api.post(`/contracts/${id}/renew`, data)
};

export const invoiceService = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  recordPayment: (id, data) => api.post(`/invoices/${id}/payments`, data),
  send: (id) => api.post(`/invoices/${id}/send`)
};

export const serviceService = {
  getTypes: () => api.get('/services/types'),
  createType: (data) => api.post('/services/types', data),
  updateType: (id, data) => api.put(`/services/types/${id}`, data),
  deleteType: (id) => api.delete(`/services/types/${id}`),
  getAll: (params) => api.get('/services', { params }),
  getById: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`)
};

export const serviceOrderService = {
  getAll: (params) => api.get('/service-orders', { params }),
  getById: (id) => api.get(`/service-orders/${id}`),
  create: (data) => api.post('/service-orders', data),
  update: (id, data) => api.put(`/service-orders/${id}`, data),
  delete: (id) => api.delete(`/service-orders/${id}`),
  clockIn: (id) => api.post(`/service-orders/${id}/clock-in`),
  clockOut: (id) => api.post(`/service-orders/${id}/clock-out`),
  complete: (id, data) => api.post(`/service-orders/${id}/complete`, data),
  addProduct: (id, data) => api.post(`/service-orders/${id}/products`, data),
  createRetreatment: (id, data) => api.post(`/service-orders/${id}/retreatment`, data),
  getTodayForTechnician: (techId) => api.get(`/service-orders/technician/${techId}/today`)
};

export const productService = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  adjustInventory: (id, data) => api.post(`/products/${id}/adjust-inventory`, data),
  getLowStock: () => api.get('/products/status/low-stock')
};

export const technicianService = {
  getAll: (params) => api.get('/technicians', { params }),
  getById: (id) => api.get(`/technicians/${id}`),
  create: (data) => api.post('/technicians', data),
  update: (id, data) => api.put(`/technicians/${id}`, data),
  delete: (id) => api.delete(`/technicians/${id}`),
  updateLocation: (id, data) => api.put(`/technicians/${id}/location`, data),
  setAvailability: (id, data) => api.put(`/technicians/${id}/availability`, data),
  clockIn: (id) => api.post(`/technicians/${id}/clock-in`),
  clockOut: (id) => api.post(`/technicians/${id}/clock-out`),
  getTimeEntries: (id, params) => api.get(`/technicians/${id}/time-entries`, { params })
};

export const scheduleService = {
  getSchedule: (params) => api.get('/schedules', { params }),
  getTechnicianSchedule: (techId, params) => api.get(`/schedules/technician/${techId}`, { params }),
  setTechnicianSchedule: (techId, data) => api.post(`/schedules/technician/${techId}`, data),
  bulkSetSchedule: (techId, data) => api.post(`/schedules/technician/${techId}/bulk`, data),
  getAvailableTechnicians: (params) => api.get('/schedules/available', { params }),
  getServiceWindows: () => api.get('/schedules/windows'),
  createRecurring: (data) => api.post('/schedules/recurring', data)
};

export const territoryService = {
  getAll: () => api.get('/territories'),
  getById: (id) => api.get(`/territories/${id}`),
  create: (data) => api.post('/territories', data),
  update: (id, data) => api.put(`/territories/${id}`, data),
  delete: (id) => api.delete(`/territories/${id}`),
  assignTechnician: (id, data) => api.post(`/territories/${id}/technicians`, data),
  removeTechnician: (id, techId) => api.delete(`/territories/${id}/technicians/${techId}`),
  lookupByZip: (zipCode) => api.get(`/territories/lookup/${zipCode}`)
};

export const routeService = {
  getRoutes: (params) => api.get('/routes', { params }),
  getById: (id) => api.get(`/routes/${id}`),
  optimize: (data) => api.post('/routes/optimize', data),
  update: (id, data) => api.put(`/routes/${id}`, data),
  start: (id) => api.post(`/routes/${id}/start`),
  complete: (id) => api.post(`/routes/${id}/complete`),
  reorder: (id, data) => api.put(`/routes/${id}/reorder`, data)
};

export const complianceService = {
  getLicenses: (params) => api.get('/compliance/licenses', { params }),
  getLicense: (id) => api.get(`/compliance/licenses/${id}`),
  createLicense: (data) => api.post('/compliance/licenses', data),
  updateLicense: (id, data) => api.put(`/compliance/licenses/${id}`, data),
  deleteLicense: (id) => api.delete(`/compliance/licenses/${id}`),
  getExpiringLicenses: () => api.get('/compliance/licenses/status/expiring'),
  getCertifications: (params) => api.get('/compliance/certifications', { params }),
  createCertification: (data) => api.post('/compliance/certifications', data),
  getRegistrations: (params) => api.get('/compliance/registrations', { params }),
  createRegistration: (data) => api.post('/compliance/registrations', data),
  getSafetyDataSheets: (params) => api.get('/compliance/sds', { params }),
  createSafetyDataSheet: (data) => api.post('/compliance/sds', data),
  getSDS: (params) => api.get('/compliance/sds', { params }),
  createSDS: (data) => api.post('/compliance/sds', data),
  getUsageReports: (params) => api.get('/compliance/usage-reports', { params }),
  generateUsageReport: (data) => api.post('/compliance/usage-reports/generate', data),
  generateUsageReports: (data) => api.post('/compliance/usage-reports/generate', data)
};

export const leadService = {
  getAll: (params) => api.get('/leads', { params }),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  convert: (id) => api.post(`/leads/${id}/convert`),
  addFollowUp: (id, data) => api.post(`/leads/${id}/follow-ups`, data),
  completeFollowUp: (followUpId, data) => api.post(`/leads/follow-ups/${followUpId}/complete`, data),
  getPendingFollowUps: () => api.get('/leads/follow-ups/pending')
};

export const quoteService = {
  getAll: (params) => api.get('/quotes', { params }),
  getById: (id) => api.get(`/quotes/${id}`),
  create: (data) => api.post('/quotes', data),
  update: (id, data) => api.put(`/quotes/${id}`, data),
  delete: (id) => api.delete(`/quotes/${id}`),
  send: (id) => api.post(`/quotes/${id}/send`),
  accept: (id) => api.post(`/quotes/${id}/accept`),
  reject: (id) => api.post(`/quotes/${id}/reject`),
  duplicate: (id) => api.post(`/quotes/${id}/duplicate`)
};

export const inspectionService = {
  getAll: (params) => api.get('/inspections', { params }),
  getById: (id) => api.get(`/inspections/${id}`),
  create: (data) => api.post('/inspections', data),
  update: (id, data) => api.put(`/inspections/${id}`, data),
  delete: (id) => api.delete(`/inspections/${id}`),
  start: (id) => api.post(`/inspections/${id}/start`),
  complete: (id, data) => api.post(`/inspections/${id}/complete`, data),
  addPhotos: (id, data) => api.post(`/inspections/${id}/photos`, data),
  getToday: () => api.get('/inspections/schedule/today'),
  generateReport: (id) => api.post(`/inspections/${id}/report`)
};

export const pestService = {
  getTypes: (params) => api.get('/pests/types', { params }),
  getType: (id) => api.get(`/pests/types/${id}`),
  createType: (data) => api.post('/pests/types', data),
  updateType: (id, data) => api.put(`/pests/types/${id}`, data),
  getIssues: (params) => api.get('/pests/issues', { params }),
  getIssue: (id) => api.get(`/pests/issues/${id}`),
  createIssue: (data) => api.post('/pests/issues', data),
  updateIssue: (id, data) => api.put(`/pests/issues/${id}`, data),
  resolveIssue: (id) => api.post(`/pests/issues/${id}/resolve`),
  getRecommendations: (params) => api.get('/pests/recommendations', { params }),
  getPredictions: (params) => api.get('/pests/predictions', { params })
};

export const aiService = {
  identifyPest: (data) => api.post('/ai/identify-pest', data),
  recommendTreatment: (data) => api.post('/ai/recommend-treatment', data),
  optimizeRoute: (data) => api.post('/ai/optimize-route', data),
  predictSeasonal: (data) => api.post('/ai/predict-seasonal', data),
  generateQuote: (data) => api.post('/ai/generate-quote', data),
  generateFollowUps: () => api.post('/ai/generate-follow-ups'),
  recommendUpsell: (data) => api.post('/ai/recommend-upsell', data),
  autoCompleteReport: (data) => api.post('/ai/auto-complete-report', data)
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getScheduleToday: () => api.get('/dashboard/schedule-today'),
  getActivity: (params) => api.get('/dashboard/activity', { params }),
  getAlerts: () => api.get('/dashboard/alerts'),
  getTechnicianPerformance: () => api.get('/dashboard/technician-performance'),
  getRevenueChart: (params) => api.get('/dashboard/revenue-chart', { params }),
  getServiceChart: (params) => api.get('/dashboard/service-chart', { params })
};

export const reportService = {
  getRevenue: (params) => api.get('/reports/revenue', { params }),
  getServices: (params) => api.get('/reports/services', { params }),
  getCustomers: (params) => api.get('/reports/customers', { params }),
  getProductUsage: (params) => api.get('/reports/product-usage', { params }),
  getTechnicianPerformance: (params) => api.get('/reports/technician-performance', { params }),
  getPestActivity: (params) => api.get('/reports/pest-activity', { params }),
  getSalesPipeline: () => api.get('/reports/sales-pipeline'),
  generate: (params) => api.get('/reports/generate', { params })
};

export const serviceTypeService = {
  getAll: () => api.get('/services/types'),
  getById: (id) => api.get(`/services/types/${id}`),
  create: (data) => api.post('/services/types', data),
  update: (id, data) => api.put(`/services/types/${id}`, data),
  delete: (id) => api.delete(`/services/types/${id}`)
};

export const settingsService = {
  getAll: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  getCompany: () => api.get('/settings/company'),
  updateCompany: (data) => api.put('/settings/company', data)
};

// Config service - provides all dropdown options from database
export const configService = {
  // Get all enum values (fixed options from schema)
  getEnums: () => api.get('/config/enums'),

  // Get specific enum by name
  getEnum: (name) => api.get(`/config/enums/${name}`),

  // Get all custom configurations
  getCustomConfigs: () => api.get('/config/custom'),

  // Get custom config by category
  getCustomConfig: (category) => api.get(`/config/custom/${category}`),

  // Create custom configuration option
  createCustomConfig: (data) => api.post('/config/custom', data),

  // Update custom configuration option
  updateCustomConfig: (id, data) => api.put(`/config/custom/${id}`, data),

  // Delete custom configuration option
  deleteCustomConfig: (id) => api.delete(`/config/custom/${id}`),

  // Get all dropdown data (enums + custom configs merged)
  getDropdowns: () => api.get('/config/dropdowns')
};
