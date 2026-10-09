import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('clinic365_token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export const api = {
  // ==========================================
  // Auth & Session
  // ==========================================
  async login(username, password) {
    const res = await client.post('/auth/login/', { username, password });
    if (res.data?.token) {
      localStorage.setItem('clinic365_token', res.data.token);
      localStorage.setItem('clinic365_user', JSON.stringify(res.data.user));
      localStorage.setItem('clinic365_dept', res.data.department || 'Admin');
    }
    return res.data;
  },

  async getCurrentUser() {
    const res = await client.get('/auth/me/');
    return res.data;
  },

  logout() {
    localStorage.removeItem('clinic365_token');
    localStorage.removeItem('clinic365_user');
    localStorage.removeItem('clinic365_dept');
    localStorage.removeItem('selectedDepartment');
    try {
      client.post('/auth/logout/');
    } catch (_) {}
  },

  // ==========================================
  // Profile & Security Settings
  // ==========================================
  async getProfile() {
    const res = await client.get('/profile/');
    return res.data;
  },

  async updateProfile(profileData) {
    const res = await client.put('/profile/', profileData);
    return res.data;
  },

  async changePassword(passwordData) {
    const res = await client.post('/profile/change-password/', passwordData);
    return res.data;
  },

  async updatePin(pinData) {
    const res = await client.post('/profile/update-pin/', pinData);
    return res.data;
  },

  // ==========================================
  // Dashboard & Metadata
  // ==========================================
  async getDashboardStats() {
    const res = await client.get('/dashboard/stats/');
    return res.data;
  },

  async getDepartments() {
    const res = await client.get('/departments/');
    return res.data;
  },

  async createDepartment(departmentData) {
    const res = await client.post('/departments/', departmentData);
    return res.data;
  },

  async deleteDepartment(id) {
    const res = await client.delete('/departments/', { params: { id } });
    return res.data;
  },

  async updateDepartmentModules(departmentId, modules) {
    const res = await client.put('/departments/', { id: departmentId, modules });
    return res.data;
  },

  // ==========================================
  // Patients Management
  // ==========================================
  async getPatients(params = {}) {
    const res = await client.get('/patients/', { params });
    return res.data;
  },

  async getPatient(id) {
    const res = await client.get(`/patients/${id}/`);
    return res.data;
  },

  async createPatient(patientData) {
    const res = await client.post('/patients/', patientData);
    return res.data;
  },

  async updatePatient(id, patientData) {
    const res = await client.put(`/patients/${id}/`, patientData);
    return res.data;
  },

  async deletePatient(id) {
    const res = await client.delete(`/patients/${id}/`);
    return res.data;
  },

  async getCategories() {
    const res = await client.get('/patient-categories/');
    return res.data?.results || res.data;
  },

  // Sponsors & HMOs (e.g. AIICO, AVON HMO, RELIANCE, etc.)
  async getSponsors(params = null) {
    const queryParams = typeof params === 'object' && params !== null
      ? params
      : (params ? { category: params } : {});
    const res = await client.get('/sponsors/', {
      params: queryParams,
    });
    return res.data?.results || res.data;
  },

  async createSponsor(sponsorData) {
    const res = await client.post('/sponsors/', sponsorData);
    return res.data;
  },

  async updateSponsor(id, sponsorData) {
    const res = await client.put(`/sponsors/${id}/`, sponsorData);
    return res.data;
  },

  async deleteSponsor(id) {
    const res = await client.delete(`/sponsors/${id}/`);
    return res.data;
  },

  async importSponsors(formData = null) {
    const res = await client.post('/sponsors/import-sponsors/', formData || {}, {
      headers: formData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return res.data;
  },

  // Plans under Sponsors (e.g. Bronze, Silver, Gold, Platinum under a Sponsor)
  async getPlans(params = null) {
    let queryParams = {};
    if (typeof params === 'object' && params !== null) {
      queryParams = params;
    } else if (params) {
      // If a numeric ID or string is passed, check if it's sponsor or category
      queryParams = { sponsor: params };
    }
    const res = await client.get('/patient-plans/', {
      params: queryParams,
    });
    return res.data?.results || res.data;
  },

  async createPlan(planData) {
    const res = await client.post('/patient-plans/', planData);
    return res.data;
  },

  async updatePlan(id, planData) {
    const res = await client.put(`/patient-plans/${id}/`, planData);
    return res.data;
  },

  async deletePlan(id) {
    const res = await client.delete(`/patient-plans/${id}/`);
    return res.data;
  },

  async createCategory(categoryData) {
    const res = await client.post('/patient-categories/', categoryData);
    return res.data;
  },

  // ==========================================
  // Queue Operations
  // ==========================================
  async getQueues(params = {}) {
    const res = await client.get('/queues/', { params });
    return res.data?.results || res.data;
  },

  async createQueue(queueData) {
    const res = await client.post('/queues/', queueData);
    return res.data;
  },

  async updateQueue(id, queueData) {
    const res = await client.patch(`/queues/${id}/`, queueData);
    return res.data;
  },

  async getVisitPurposes() {
    const res = await client.get('/visit-purposes/');
    return res.data?.results || res.data;
  },

  // ==========================================
  // Billings & Financial Records
  // ==========================================
  async getInvoices(params = {}) {
    const res = await client.get('/invoices/', { params });
    return res.data?.results || res.data;
  },

  async createInvoice(invoiceData) {
    const res = await client.post('/invoices/', invoiceData);
    return res.data;
  },

  async updateInvoice(id, invoiceData) {
    const res = await client.patch(`/invoices/${id}/`, invoiceData);
    return res.data;
  },

  async getReceipts(params = {}) {
    const res = await client.get('/receipts/', { params });
    return res.data?.results || res.data;
  },

  async createReceipt(receiptData) {
    const res = await client.post('/receipts/', receiptData);
    return res.data;
  },

  async getDeposits(params = {}) {
    const res = await client.get('/deposits/', { params });
    return res.data?.results || res.data;
  },

  async createDeposit(depositData) {
    const res = await client.post('/deposits/', depositData);
    return res.data;
  },

  async getRefunds(params = {}) {
    const res = await client.get('/refunds/', { params });
    return res.data?.results || res.data;
  },

  async createRefund(refundData) {
    const res = await client.post('/refunds/', refundData);
    return res.data;
  },

  // ==========================================
  // Inpatient (IPD) & Wards
  // ==========================================
  async getAdmissions(params = {}) {
    const res = await client.get('/admissions/', { params });
    return res.data?.results || res.data;
  },

  async createAdmission(admissionData) {
    const res = await client.post('/admissions/', admissionData);
    return res.data;
  },

  async updateAdmission(id, admissionData) {
    const res = await client.patch(`/admissions/${id}/`, admissionData);
    return res.data;
  },

  async getWards() {
    const res = await client.get('/wards/');
    return res.data?.results || res.data;
  },

  async getBedAllocations() {
    const res = await client.get('/bed-allocations/');
    return res.data?.results || res.data;
  },

  async allocateBed(allocationData) {
    const res = await client.post('/bed-allocations/', allocationData);
    return res.data;
  },

  // ==========================================
  // Antenatal Care (ANC)
  // ==========================================
  async getANCRegistrations(params = {}) {
    const res = await client.get('/anc/', { params });
    return res.data?.results || res.data;
  },

  async createANCRegistration(ancData) {
    const res = await client.post('/anc/', ancData);
    return res.data;
  },

  // ==========================================
  // Pharmacy & Medications
  // ==========================================
  async getPharmacyDrugs(params = {}) {
    const res = await client.get('/pharmacy/drugs/', { params });
    return res.data?.results || res.data;
  },

  async createPharmacyDrug(drugData) {
    const res = await client.post('/pharmacy/drugs/', drugData);
    return res.data;
  },

  async updatePharmacyDrug(id, drugData) {
    const res = await client.patch(`/pharmacy/drugs/${id}/`, drugData);
    return res.data;
  },

  // ==========================================
  // Diagnostics: Lab & Radiology
  // ==========================================
  async getRadioLabTests(params = {}) {
    const res = await client.get('/radio-lab/', { params });
    return res.data?.results || res.data;
  },

  async getRadioLabOrders(params = {}) {
    return this.getRadioLabTests(params);
  },

  async createRadioLabTest(testData) {
    const res = await client.post('/radio-lab/', testData);
    return res.data;
  },

  async updateRadioLabTest(id, testData) {
    const res = await client.patch(`/radio-lab/${id}/`, testData);
    return res.data;
  },

  // ==========================================
  // Central Inventory & Store
  // ==========================================
  async getInventoryProducts(params = {}) {
    const res = await client.get('/inventory/products/', { params });
    return res.data?.results || res.data;
  },

  async createInventoryProduct(data) {
    const res = await client.post('/inventory/products/', data);
    return res.data;
  },

  async getInventoryTransfers(params = {}) {
    const res = await client.get('/inventory/transfers/', { params });
    return res.data?.results || res.data;
  },

  async createInventoryTransfer(data) {
    const res = await client.post('/inventory/transfers/', data);
    return res.data;
  },

  async getInventoryRequisitions(params = {}) {
    const res = await client.get('/inventory/requests/', { params });
    return res.data?.results || res.data;
  },

  async createInventoryRequisition(data) {
    const res = await client.post('/inventory/requests/', data);
    return res.data;
  },

  async updateInventoryRequisition(id, data) {
    const res = await client.patch(`/inventory/requests/${id}/`, data);
    return res.data;
  },

  client,

  // ==========================================
  // Task Manager Module
  // ==========================================
  async getStaff(params = {}) {
    const res = await client.get('/task-manager/staff/', { params });
    return res.data;
  },

  async getStaffUsers(params = {}) {
    const res = await client.get('/task-manager/staff/', { params });
    return res.data;
  },

  async createStaffUser(staffData) {
    const res = await client.post('/task-manager/staff/', staffData);
    return res.data;
  },

  async staffAction(actionData) {
    const res = await client.post('/task-manager/staff-action/', actionData);
    return res.data;
  },

  async getOnlineUsers() {
    const res = await client.get('/task-manager/online-users/');
    return res.data;
  },

  async forceLogout(userId) {
    const res = await client.post('/task-manager/force-logout/', { user_id: userId });
    return res.data;
  },

  async getActivityLogs(params = {}) {
    const res = await client.get('/task-manager/activity-logs/', { params });
    return res.data;
  },

  async getActivityDashboard() {
    const res = await client.get('/task-manager/activity-dashboard/');
    return res.data;
  },

  async verifyStaff(params = {}) {
    const res = await client.get('/task-manager/verify-staff/', { params });
    return res.data;
  },

  async getVerifiedStaff(params = {}) {
    const res = await client.get('/task-manager/verify-staff/', { params });
    return res.data;
  },

  async addVerifiedStaff(staffId) {
    const res = await client.post('/task-manager/verify-staff/', { staff_id: staffId });
    return res.data;
  },

  async deleteVerifiedStaff(id) {
    const res = await client.delete('/task-manager/verify-staff/', { params: { id } });
    return res.data;
  },

  async getQueueMonitor() {
    const res = await client.get('/task-manager/queue-monitor/');
    return res.data;
  },

  async getQueueMonitorStats() {
    const res = await client.get('/task-manager/queue-monitor/');
    return res.data;
  },

  async getStatisticalInsights() {
    const res = await client.get('/task-manager/statistical-insights/');
    return res.data;
  },

  // ==========================================
  // Manage Tariff Plans Module
  // ==========================================
  async getRegistrationFees() {
    const res = await client.get('/tariffs/registration-fees/');
    return res.data;
  },

  async saveRegistrationFee(data) {
    const res = await client.post('/tariffs/registration-fees/', data);
    return res.data;
  },

  async deleteRegistrationFee(id) {
    const res = await client.delete(`/tariffs/registration-fees/${id}/`);
    return res.data;
  },

  async getLabCharges() {
    const res = await client.get('/tariffs/lab-charges/');
    return res.data;
  },

  async saveLabCharge(data) {
    const res = await client.post('/tariffs/lab-charges/', data);
    return res.data;
  },

  async deleteLabCharge(id) {
    const res = await client.delete(`/tariffs/lab-charges/${id}/`);
    return res.data;
  },

  async getRadiologyCharges() {
    const res = await client.get('/tariffs/radiology-charges/');
    return res.data;
  },

  async saveRadiologyCharge(data) {
    const res = await client.post('/tariffs/radiology-charges/', data);
    return res.data;
  },

  async deleteRadiologyCharge(id) {
    const res = await client.delete(`/tariffs/radiology-charges/${id}/`);
    return res.data;
  },

  async getAdmissionFees() {
    const res = await client.get('/tariffs/admission-fees/');
    return res.data;
  },

  async saveAdmissionFee(data) {
    const res = await client.post('/tariffs/admission-fees/', data);
    return res.data;
  },

  async deleteAdmissionFee(id) {
    const res = await client.delete(`/tariffs/admission-fees/${id}/`);
    return res.data;
  },

  async getOtherServices() {
    const res = await client.get('/tariffs/other-services/');
    return res.data;
  },

  async saveOtherService(data) {
    const res = await client.post('/tariffs/other-services/', data);
    return res.data;
  },

  async deleteOtherService(id) {
    const res = await client.delete(`/tariffs/other-services/${id}/`);
    return res.data;
  },

  async getMedicationFees() {
    const res = await client.get('/tariffs/medication-fees/');
    return res.data;
  },

  async saveMedicationFee(data) {
    const res = await client.post('/tariffs/medication-fees/', data);
    return res.data;
  },

  async deleteMedicationFee(id) {
    const res = await client.delete(`/tariffs/medication-fees/${id}/`);
    return res.data;
  },

  async getPackages() {
    const res = await client.get('/tariffs/packages/');
    return res.data;
  },

  async savePackage(data) {
    const res = await client.post('/tariffs/packages/', data);
    return res.data;
  },

  async deletePackage(id) {
    const res = await client.delete(`/tariffs/packages/${id}/`);
    return res.data;
  },

  async getPackageData() {
    const res = await client.get('/tariffs/package-data/');
    return res.data;
  },

  async savePackageData(data) {
    const res = await client.post('/tariffs/package-data/', data);
    return res.data;
  },

  async deletePackageData(id) {
    const res = await client.delete(`/tariffs/package-data/${id}/`);
    return res.data;
  },

  async getImmunizationFees() {
    const res = await client.get('/tariffs/immunization-fees/');
    return res.data;
  },
};

export default api;
