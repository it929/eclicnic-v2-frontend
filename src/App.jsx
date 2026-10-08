import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './components/Dashboard';
import PatientList from './components/PatientList';
import QueueView from './components/QueueView';
import BillingsView from './components/BillingsView';
import PharmacyView from './components/PharmacyView';
import IPDView from './components/IPDView';
import ANCView from './components/ANCView';
import RadioLabView from './components/RadioLabView';
import ProfileSettingsView from './components/ProfileSettingsView';
import TaskManagerView from './components/TaskManagerView';
import TariffPlansView from './components/TariffPlansView';
import InventoryView from './components/InventoryView';
import ReportingView from './components/ReportingView';
import LoginPage from './components/LoginPage';
import PatientModal from './components/PatientModal';
import PatientDetailModal from './components/PatientDetailModal';
import LoginModal from './components/LoginModal';
import api from './services/api';
import {
  normalizeDepartmentKey,
  getDefaultTabForDepartment,
  AVAILABLE_MODULES,
  getDefaultModulesForDepartment,
} from './utils/departmentUtils';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('clinic365_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [currentRole, setCurrentRole] = useState(() => {
    return localStorage.getItem('clinic365_dept') || 'Admin';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('clinic365_token');
    const isLoggedOut = localStorage.getItem('clinic365_logged_out') === 'true';
    if (isLoggedOut || !token) return false;
    try {
      const saved = localStorage.getItem('clinic365_user');
      return Boolean(saved);
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileSubTab, setProfileSubTab] = useState('overview');
  const [taskSubmodule, setTaskSubmodule] = useState('staff');
  const [taskSubSubmodule, setTaskSubSubmodule] = useState('manage_users');
  const [tariffSubmodule, setTariffSubmodule] = useState('service');
  const [tariffSubSubmodule, setTariffSubSubmodule] = useState('reg_fees');
  const [inventorySubmodule, setInventorySubmodule] = useState('view');
  const [reportingCategory, setReportingCategory] = useState('ambulatory');
  const [reportingSubReport, setReportingSubReport] = useState('patients_reg');
  const [selectedDepartment, setSelectedDepartment] = useState(() => {
    return localStorage.getItem('selectedDepartment') || 'frontdesk';
  });
  const [dbDepartments, setDbDepartments] = useState([]);

  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [patients, setPatients] = useState([]);
  const [totalPatientsCount, setTotalPatientsCount] = useState(0);
  const [queues, setQueues] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    try {
      const data = await api.getDashboardStats();
      if (data?.stats) setStats(data.stats);
      if (data?.categories) setCategories(data.categories);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  }, []);

  // Load Patients Data
  const loadPatients = useCallback(async () => {
    try {
      setLoadingPatients(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;

      const res = await api.getPatients(params);
      setPatients(res.results || res);
      setTotalPatientsCount(res.count !== undefined ? res.count : (res.results || res).length);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoadingPatients(false);
    }
  }, [searchQuery, selectedCategory]);

  // Load Queues & Categories & Departments
  const loadInitialData = useCallback(async () => {
    try {
      const [catsRes, queuesRes, userRes, deptsRes] = await Promise.all([
        api.getCategories(),
        api.getQueues(),
        api.getCurrentUser(),
        api.getDepartments(),
      ]);
      if (catsRes) setCategories(catsRes);
      if (queuesRes) setQueues(queuesRes);
      if (deptsRes) setDbDepartments(deptsRes);
      if (userRes?.user) {
        setUser(userRes.user);
        const userDept = userRes.department || userRes.user.department_name || 'Front Desk';
        setCurrentRole(userDept);
        const deptKey = normalizeDepartmentKey(userDept);
        const savedDept = localStorage.getItem('selectedDepartment');
        if (!savedDept || (userDept.toLowerCase() !== 'admin' && userDept.toLowerCase() !== 'cmd')) {
          setSelectedDepartment(deptKey);
          localStorage.setItem('selectedDepartment', deptKey);
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
      loadInitialData();
    }
  }, [isAuthenticated, loadDashboardData, loadInitialData]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPatients();
    }
  }, [isAuthenticated, loadPatients]);

  const handlePatientCreated = (newPatient) => {
    loadDashboardData();
    loadPatients();
    setSelectedPatient(newPatient);
  };

  const handleLogin = async (username, password) => {
    const res = await api.login(username, password);
    if (res?.user) {
      setUser(res.user);
      const userDept = res.department || res.user.department_name || 'Front Desk';
      setCurrentRole(userDept);
      const deptKey = normalizeDepartmentKey(userDept);
      setSelectedDepartment(deptKey);
      localStorage.setItem('selectedDepartment', deptKey);
      localStorage.setItem('clinic365_dept', userDept);

      // Route directly to the staff's departmental module (e.g. Nursing -> 'queues', Inventory -> 'inventory')
      const targetTab = getDefaultTabForDepartment(deptKey);
      setActiveTab(targetTab);
    }
    localStorage.removeItem('clinic365_logged_out');
    setIsAuthenticated(true);
    loadDashboardData();
    loadPatients();
  };

  const handleLogout = () => {
    api.logout();
    localStorage.setItem('clinic365_logged_out', 'true');
    localStorage.removeItem('selectedDepartment');
    setUser(null);
    setIsAuthenticated(false);
    setIsLoginModalOpen(false);
    setActiveTab('dashboard');
  };

  if (!isAuthenticated || !user) {
    return <LoginPage onLoginSuccess={handleLogin} />;
  }

  const isAdmin = currentRole === 'Admin' || currentRole === 'CMD';

  // Determine allowed modules for current user based on department
  const userAllowedModules = (() => {
    if (isAdmin) return AVAILABLE_MODULES.map((m) => m.id);

    if (user?.department_modules && Array.isArray(user.department_modules) && user.department_modules.length > 0) {
      return user.department_modules;
    }
    if (user?.modules && Array.isArray(user.modules) && user.modules.length > 0) {
      return user.modules;
    }

    const userDeptName =
      user?.department_name ||
      (typeof user?.department === 'object' ? user?.department?.department : user?.department) ||
      currentRole;
    const userDeptId =
      user?.department_id || (typeof user?.department === 'object' ? user?.department?.id : undefined);

    const found = dbDepartments.find(
      (d) =>
        (userDeptId && d.id === userDeptId) ||
        (d.department && userDeptName && d.department.toLowerCase() === String(userDeptName).toLowerCase())
    );
    if (found && Array.isArray(found.modules) && found.modules.length > 0) {
      return found.modules;
    }

    return getDefaultModulesForDepartment(normalizeDepartmentKey(userDeptName));
  })();

  const isTabAllowed = (tab) => {
    if (isAdmin) return true;
    if (tab === 'dashboard' || tab === 'profile') return true;

    const tabModuleMap = {
      patients: ['frontdesk', 'nursing', 'clinical', 'anc', 'billings'],
      queues: ['nursing', 'clinical', 'frontdesk'],
      billings: ['billings'],
      pharmacy: ['opd_pharmacy'],
      ipd: ['ipd_pharmacy', 'nursing'],
      anc: ['anc', 'nursing', 'clinical'],
      radiolab: ['laboratory', 'radiology'],
      inventory: ['inventory'],
      reporting: ['reporting'],
      taskmanager: ['taskmanager'],
      tariffs: ['tariffs'],
    };

    const required = tabModuleMap[tab] || [tab];
    return required.some((m) => userAllowedModules.includes(m));
  };

  return (
    <div id="wrapper">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab, subTab, subSubTab) => {
          setActiveTab(tab);
          if (tab === 'profile' && subTab) setProfileSubTab(subTab);
          if (tab === 'taskmanager') {
            if (subTab) setTaskSubmodule(subTab);
            if (subSubTab) setTaskSubSubmodule(subSubTab);
          }
          if (tab === 'tariffs') {
            if (subTab) setTariffSubmodule(subTab);
            if (subSubTab) setTariffSubSubmodule(subSubTab);
          }
          if (tab === 'inventory') {
            if (subTab) setInventorySubmodule(subTab);
          }
          if (tab === 'reporting') {
            if (subTab) setReportingCategory(subTab);
            if (subSubTab) setReportingSubReport(subSubTab);
          }
        }}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        selectedDepartment={selectedDepartment}
        setSelectedDepartment={setSelectedDepartment}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
        dbDepartments={dbDepartments}
        user={user}
      />

      {/* Content Wrapper */}
      <div id="content-wrapper" className="d-flex flex-column">
        {/* Main Content */}
        <div id="content">
          {/* Topbar */}
          <Topbar
            user={user}
            currentRole={currentRole}
            searchQuery={searchQuery}
            setSearchQuery={(q) => {
              setSearchQuery(q);
              if (activeTab !== 'patients') setActiveTab('patients');
            }}
            onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
            onOpenProfile={(subTab) => {
              setActiveTab('profile');
              setProfileSubTab(subTab || 'overview');
            }}
            onLogout={handleLogout}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          {/* Active Tab View with RBAC Guard */}
          {!isTabAllowed(activeTab) ? (
            <div className="container-fluid py-5">
              <div className="row justify-content-center">
                <div className="col-lg-7 col-md-9">
                  <div className="card shadow-lg border-0 border-left-danger">
                    <div className="card-body p-5 text-center">
                      <div
                        className="rounded-circle bg-danger text-white d-inline-flex align-items-center justify-content-center mb-4 shadow"
                        style={{ width: '80px', height: '80px', fontSize: '32px' }}
                      >
                        <i className="fas fa-shield-alt"></i>
                      </div>
                      <h3 className="font-weight-bold text-gray-800 mb-2">Module Access Restricted</h3>
                      <p className="text-muted mb-4" style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>
                        The <strong>{activeTab.toUpperCase()}</strong> module has not been assigned to your department (<strong>{currentRole}</strong>). Your account only has permission to view modules granted by hospital administration.
                      </p>

                      <div className="card bg-light border p-3 mb-4 text-left">
                        <h6 className="font-weight-bold text-primary mb-2 small text-uppercase">
                          <i className="fas fa-check-circle mr-1"></i> Your Department's Assigned Modules:
                        </h6>
                        <div className="d-flex flex-wrap">
                          {userAllowedModules.length === 0 ? (
                            <span className="text-muted small">No specific modules assigned yet.</span>
                          ) : (
                            userAllowedModules.map((modId) => {
                              const mod = AVAILABLE_MODULES.find((m) => m.id === modId);
                              return (
                                <span
                                  key={modId}
                                  className="badge badge-primary px-2.5 py-1.5 font-weight-bold mr-2 mb-2"
                                  style={{ fontSize: '0.8rem' }}
                                >
                                  <i className={`fas ${mod?.icon || 'fa-cubes'} mr-1`}></i>
                                  {mod?.name || modId}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="d-flex justify-content-center">
                        <button
                          className="btn btn-primary font-weight-bold px-4 py-2 shadow-sm"
                          onClick={() => {
                            const fallbackTab = getDefaultTabForDepartment(normalizeDepartmentKey(currentRole));
                            setActiveTab(fallbackTab);
                          }}
                        >
                          <i className="fas fa-arrow-left mr-1"></i> Return to Department Workspace
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard
                  stats={stats}
                  categories={categories}
                  recentPatients={patients.slice(0, 5)}
                  onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
                  onViewPatients={() => setActiveTab('patients')}
                  onViewQueues={() => setActiveTab('queues')}
                  onSelectPatient={(p) => setSelectedPatient(p)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  currentRole={currentRole}
                  selectedDepartment={selectedDepartment}
                  onRefresh={() => {
                    loadDashboardData();
                    loadPatients();
                  }}
                  onQuickSearch={(query) => {
                    setSearchQuery(query);
                    setActiveTab('patients');
                  }}
                />
              )}

              {activeTab === 'patients' && (
                <PatientList
                  patients={patients}
                  totalCount={totalPatientsCount}
                  loading={loadingPatients}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  categories={categories}
                  onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
                  onSelectPatient={(p) => setSelectedPatient(p)}
                  onPatientQueued={loadInitialData}
                />
              )}

              {activeTab === 'queues' && (
                <QueueView
                  queues={queues}
                  onSelectPatient={(p) => setSelectedPatient(p)}
                  onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
                  onRefreshQueues={loadInitialData}
                />
              )}

              {activeTab === 'billings' && (
                <BillingsView
                  onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
                />
              )}

              {activeTab === 'pharmacy' && (
                <PharmacyView />
              )}

              {activeTab === 'ipd' && (
                <IPDView />
              )}

              {activeTab === 'anc' && (
                <ANCView
                  onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
                />
              )}

              {activeTab === 'radiolab' && (
                <RadioLabView />
              )}

              {activeTab === 'profile' && (
                <ProfileSettingsView
                  initialTab={profileSubTab}
                  onUserUpdated={(updatedUser) => setUser(updatedUser)}
                />
              )}

              {activeTab === 'taskmanager' && (
                <TaskManagerView
                  initialSubmodule={taskSubmodule}
                  initialSubSubmodule={taskSubSubmodule}
                  onDepartmentsChanged={loadInitialData}
                />
              )}

              {activeTab === 'tariffs' && (
                <TariffPlansView
                  initialSubmodule={tariffSubmodule}
                  initialSubSubmodule={tariffSubSubmodule}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryView
                  initialSubmodule={inventorySubmodule}
                />
              )}

              {activeTab === 'reporting' && (
                <ReportingView
                  initialCategory={reportingCategory}
                  initialReport={reportingSubReport}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="sticky-footer bg-white border-top py-3 mt-auto">
          <div className="container my-auto">
            <div className="copyright text-center my-auto small text-muted d-flex align-items-center justify-content-center flex-wrap">
              <img
                src="/admin-img/isalu-emblem-transparent.png"
                alt="Isalu Hospitals"
                style={{ height: '22px', objectFit: 'contain' }}
                className="mr-2"
              />
              <span>
                Copyright &copy; <strong>ISALU HOSPITALS (RC 502112)</strong> 2026 &bull; Clinic365 Enterprise HIS &bull; Clinical EMR
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <PatientModal
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onPatientCreated={handlePatientCreated}
        categories={categories}
      />

      <PatientDetailModal
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
        onQueueUpdated={loadInitialData}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLogin}
      />
    </div>
  );
}
