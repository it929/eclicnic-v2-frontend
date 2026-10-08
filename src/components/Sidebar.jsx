import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  normalizeDepartmentKey,
  DEPARTMENT_LIST,
  formatDepartmentItem,
  AVAILABLE_MODULES,
  getDefaultModulesForDepartment,
  isModuleAllowed,
} from '../utils/departmentUtils';

export default function Sidebar({
  activeTab,
  setActiveTab,
  currentRole,
  setCurrentRole,
  isCollapsed,
  setIsCollapsed,
  onOpenNewPatient,
  selectedDepartment,
  setSelectedDepartment,
  dbDepartments = [],
  user = null,
}) {
  // Collapsible states
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [openSubSubmenu, setOpenSubSubmenu] = useState(null);
  const [openTariffSubSubmenu, setOpenTariffSubSubmenu] = useState(null);

  // Dynamic Departments from Database
  const [dynamicDepartments, setDynamicDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const fetchDbDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const data = await api.getDepartments();
      if (Array.isArray(data) && data.length > 0) {
        setDynamicDepartments(data.map(formatDepartmentItem).filter(Boolean));
      }
    } catch (err) {
      console.error('Failed to load departments from database in Sidebar:', err);
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    fetchDbDepartments();
  }, []);

  // Update when prop changes from parent
  useEffect(() => {
    if (Array.isArray(dbDepartments) && dbDepartments.length > 0) {
      setDynamicDepartments(dbDepartments.map(formatDepartmentItem).filter(Boolean));
    }
  }, [dbDepartments]);

  // Combined department list (DB takes priority, fallback to built-in list)
  const departmentList = dynamicDepartments.length > 0 ? dynamicDepartments : DEPARTMENT_LIST;

  const isAdmin = currentRole === 'Admin' || currentRole === 'CMD';

  // Determine permitted modules for this user based on their department
  const staffModules = (() => {
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

    const found = dynamicDepartments.find(
      (d) =>
        (userDeptId && d.id === userDeptId) ||
        (d.name && userDeptName && d.name.toLowerCase() === String(userDeptName).toLowerCase())
    );
    if (found && Array.isArray(found.modules) && found.modules.length > 0) {
      return found.modules;
    }

    return getDefaultModulesForDepartment(normalizeDepartmentKey(userDeptName));
  })();

  const isDeptKeyAllowed = (deptKey) => {
    if (isAdmin) return true;
    if (!Array.isArray(staffModules) || staffModules.length === 0) return false;

    const mapping = {
      frontdesk: ['frontdesk'],
      nursing: ['nursing'],
      clinical: ['clinical'],
      inventory: ['inventory'],
      ipd1: ['ipd_pharmacy'],
      ipd2: ['ipd_pharmacy'],
      ipd3: ['ipd_pharmacy'],
      opd1: ['opd_pharmacy'],
      opd2: ['opd_pharmacy'],
      laboratory: ['laboratory'],
      radiology: ['radiology'],
      billings: ['billings'],
      reporting: ['reporting'],
    };

    const required = mapping[deptKey] || [deptKey];
    return required.some((m) => staffModules.includes(m));
  };

  // Filter department list to allowed ones
  const allowedDepartmentList = isAdmin
    ? departmentList
    : departmentList.filter((d) => isDeptKeyAllowed(d.key));

  // Switch Department state
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const [activeDept, setActiveDept] = useState(() => {
    const raw = localStorage.getItem('selectedDepartment') || selectedDepartment || currentRole || 'frontdesk';
    return normalizeDepartmentKey(raw);
  });

  // Sync activeDept whenever selectedDepartment or currentRole prop changes
  useEffect(() => {
    if (selectedDepartment) {
      const normalized = normalizeDepartmentKey(selectedDepartment);
      if (normalized !== activeDept) {
        setActiveDept(normalized);
        localStorage.setItem('selectedDepartment', normalized);
      }
    } else if (currentRole && currentRole !== 'Admin' && currentRole !== 'CMD') {
      const normalized = normalizeDepartmentKey(currentRole);
      if (normalized !== activeDept) {
        setActiveDept(normalized);
        localStorage.setItem('selectedDepartment', normalized);
      }
    }
  }, [selectedDepartment, currentRole]);

  // Load department handler (matching HTML loadDepartment function)
  const loadDepartment = (deptKey) => {
    const normalized = normalizeDepartmentKey(deptKey);
    setActiveDept(normalized);
    localStorage.setItem('selectedDepartment', normalized);
    if (setSelectedDepartment) {
      setSelectedDepartment(normalized);
    }
    setIsDepartmentDropdownOpen(false);
  };

  // Ensure staff members are on an allowed department module
  useEffect(() => {
    if (!isAdmin && allowedDepartmentList.length > 0) {
      const isAllowed = allowedDepartmentList.some((d) => d.key === activeDept);
      if (!isAllowed) {
        loadDepartment(allowedDepartmentList[0].key);
      }
    }
  }, [isAdmin, allowedDepartmentList, activeDept]);

  const toggleSubmenu = (menu) => {
    setOpenSubmenu(openSubmenu === menu ? null : menu);
  };

  const toggleSubSubmenu = (sub) => {
    setOpenSubSubmenu(openSubSubmenu === sub ? null : sub);
  };

  const toggleTariffSubSubmenu = (sub) => {
    setOpenTariffSubSubmenu(openTariffSubSubmenu === sub ? null : sub);
  };

  const currentDeptObj =
    departmentList.find((d) => d.key === activeDept) || {
      key: activeDept,
      label: `🏢 ${currentRole || activeDept}`,
      icon: 'fa-building',
    };

  return (
    <ul
      className={`navbar-nav bg-gradient-primary sidebar sidebar-dark accordion ${
        isCollapsed ? 'toggled' : ''
      }`}
      id="accordionSidebar"
      style={{ minHeight: '100vh', transition: 'width 0.2s ease' }}
    >
      {/* Sidebar - Brand */}
      <a
        className="sidebar-brand d-flex align-items-center justify-content-center cursor-pointer py-3"
        style={{ height: 'auto', minHeight: '4.5rem' }}
        onClick={() => setActiveTab('dashboard')}
      >
        <div
          className="sidebar-brand-icon d-flex align-items-center justify-content-center"
          style={{ width: '40px', height: '40px', flexShrink: 0 }}
        >
          <img
            src="/admin-img/isalu-emblem-transparent.png"
            alt="Isalu Hospitals"
            style={{
              maxHeight: '38px',
              maxWidth: '38px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25))',
            }}
          />
        </div>
        <div className="sidebar-brand-text mx-2 text-left">
          <div
            className="font-weight-bold text-white"
            style={{ fontSize: '1.05rem', lineHeight: '1.15', letterSpacing: '0.5px' }}
          >
            ISALU
          </div>
          <div
            className="text-white-50 font-weight-bold"
            style={{ fontSize: '0.7rem', letterSpacing: '0.8px' }}
          >
            HOSPITALS
          </div>
        </div>
      </a>

      {/* Role Switcher Pill */}
      <div className="px-3 py-2 text-center">
        <span className="badge badge-light px-2 py-1 text-primary font-weight-bold" style={{ fontSize: '0.75rem' }}>
          Role: {currentRole}
        </span>
        <div className="mt-1">
          <select
            className="custom-select custom-select-sm bg-light text-dark font-weight-bold border-0"
            style={{ fontSize: '0.75rem', height: '28px' }}
            value={currentRole}
            onChange={(e) => {
              const newRole = e.target.value;
              setCurrentRole(newRole);
              const deptKey = normalizeDepartmentKey(newRole);
              loadDepartment(deptKey);
            }}
          >
            <option value="Admin">Admin View</option>
            <option value="CMD">CMD View</option>
            {departmentList.map((dept) => {
              const optVal = dept.name || dept.label.replace(/^[\S]+\s*/, '');
              if (optVal.toLowerCase() === 'admin' || optVal.toLowerCase() === 'cmd') return null;
              return (
                <option key={dept.id || dept.key} value={optVal}>
                  {optVal} View
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <hr className="sidebar-divider my-2" />

      {/* Nav Item - Dashboard */}
      <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
        <a
          className="nav-link cursor-pointer"
          onClick={() => setActiveTab('dashboard')}
        >
          <i className="fas fa-fw fa-tachometer-alt"></i>
          <span>Dashboard</span>
        </a>
      </li>

      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* USER PROFILE & SETTINGS                                        */}
      {/* ============================================================== */}
      <hr className="sidebar-divider" />
      <div className="sidebar-heading">Profile &amp; Settings</div>

      {/* Profile Settings */}
          <li className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
            <a
              className="nav-link cursor-pointer collapsed"
              onClick={() => toggleSubmenu('profileSettings')}
            >
              <i className="fas fa-fw fa-cog"></i>
              <span>Profile Settings</span>
              <i className={`fas fa-chevron-${openSubmenu === 'profileSettings' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
            </a>
            {openSubmenu === 'profileSettings' && (
              <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                <a
                  className="collapse-item cursor-pointer text-primary font-weight-bold"
                  onClick={() => setActiveTab('profile', 'modify')}
                >
                  <i className="fas fa-user-edit mr-1"></i> Modify Profile
                </a>
                <a
                  className="collapse-item cursor-pointer text-primary"
                  onClick={() => setActiveTab('profile', 'overview')}
                >
                  <i className="fas fa-id-badge mr-1"></i> My Profile
                </a>
                <a
                  className="collapse-item cursor-pointer text-primary"
                  onClick={() => setActiveTab('profile', 'password')}
                >
                  <i className="fas fa-lock mr-1"></i> Change Password
                </a>
                <a
                  className="collapse-item cursor-pointer text-primary"
                  onClick={() => setActiveTab('profile', 'pin')}
                >
                  <i className="fas fa-shield-alt mr-1"></i> Security PIN
                </a>
              </div>
            )}
          </li>

          {/* Task Manager Module */}
          {(isAdmin || staffModules.includes('taskmanager')) && (
            <li className={`nav-item ${activeTab === 'taskmanager' ? 'active' : ''}`} style={{ marginTop: '-10px' }}>
            <a
              className="nav-link cursor-pointer collapsed"
              onClick={() => toggleSubmenu('taskManager')}
            >
              <i className="fas fa-fw fa-tasks"></i>
              <span>Task Manager</span>
              <i className={`fas fa-chevron-${openSubmenu === 'taskManager' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
            </a>
            {openSubmenu === 'taskManager' && (
              <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                {/* Staff Management */}
                <a
                  className="collapse-item cursor-pointer d-flex justify-content-between align-items-center text-info font-weight-bold"
                  onClick={() => toggleSubSubmenu('staff')}
                >
                  <span><i className="fas fa-users-cog mr-1"></i> Staff Management</span>
                  <i className={`fas fa-chevron-${openSubSubmenu === 'staff' ? 'down' : 'right'} text-xs`}></i>
                </a>
                {openSubSubmenu === 'staff' && (
                  <div className="pl-3 py-1 bg-light rounded mx-2 mb-1">
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'manage_users')}
                    >
                      <i className="fas fa-user-friends mr-1"></i> Manage Users
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'online_users')}
                    >
                      <i className="fas fa-globe mr-1"></i> View Online Users
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'activity_logs')}
                    >
                      <i className="fas fa-history mr-1"></i> User Activity logs
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'activity_dashboard')}
                    >
                      <i className="fas fa-tachometer-alt mr-1"></i> Activities Dashboard
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'verify_staff')}
                    >
                      <i className="fas fa-id-card mr-1"></i> Authenticate Users ID
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'create_staff')}
                    >
                      <i className="fas fa-user-plus mr-1"></i> Create Staff
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'departments')}
                    >
                      <i className="fas fa-sitemap mr-1"></i> User Categories (Departments)
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'assign_modules')}
                    >
                      <i className="fas fa-cubes mr-1"></i> Assign Department Modules
                    </a>
                  </div>
                )}

                {/* Queue Monitor */}
                <a
                  className="collapse-item cursor-pointer d-flex justify-content-between align-items-center text-primary font-weight-bold"
                  onClick={() => toggleSubSubmenu('queue')}
                >
                  <span><i className="fas fa-user-clock mr-1"></i> Queue Monitor</span>
                  <i className={`fas fa-chevron-${openSubSubmenu === 'queue' ? 'down' : 'right'} text-xs`}></i>
                </a>
                {openSubSubmenu === 'queue' && (
                  <div className="pl-3 py-1 bg-light rounded mx-2 mb-1">
                    <a
                      className="collapse-item cursor-pointer text-info d-block py-1 small"
                      onClick={() => setActiveTab('taskmanager', 'queue', 'waiting_list')}
                    >
                      <i className="fas fa-hourglass-half mr-1"></i> Waiting List
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-info d-block py-1 small"
                      onClick={() => setActiveTab('taskmanager', 'queue', 'completed_list')}
                    >
                      <i className="fas fa-check-double mr-1"></i> Completed List
                    </a>
                  </div>
                )}

                {/* Statistical Insights */}
                <a
                  className="collapse-item cursor-pointer d-flex justify-content-between align-items-center text-success font-weight-bold"
                  onClick={() => toggleSubSubmenu('stats')}
                >
                  <span><i className="fas fa-chart-line mr-1"></i> Statistical Insights</span>
                  <i className={`fas fa-chevron-${openSubSubmenu === 'stats' ? 'down' : 'right'} text-xs`}></i>
                </a>
                {openSubSubmenu === 'stats' && (
                  <div className="pl-3 py-1 bg-light rounded mx-2 mb-1">
                    <a
                      className="collapse-item cursor-pointer text-info d-block py-1 small"
                      onClick={() => setActiveTab('taskmanager', 'stats', 'diagnosis')}
                    >
                      <i className="fas fa-stethoscope mr-1"></i> Medical Diagnosis
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-info d-block py-1 small"
                      onClick={() => setActiveTab('taskmanager', 'stats', 'financial')}
                    >
                      <i className="fas fa-file-invoice-dollar mr-1"></i> Financial Data
                    </a>
                  </div>
                )}
              </div>
            )}
            </li>
          )}

          {/* Manage Tariff Plans Module */}
          {(isAdmin || staffModules.includes('tariffs')) && (
            <li className={`nav-item ${activeTab === 'tariffs' ? 'active' : ''}`} style={{ marginTop: '-10px' }}>
            <a
              className="nav-link cursor-pointer collapsed"
              onClick={() => toggleSubmenu('manageTariffs')}
            >
              <i className="fas fa-fw fa-upload"></i>
              <span>Manage Tariff Plans</span>
              <i className={`fas fa-chevron-${openSubmenu === 'manageTariffs' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
            </a>
            {openSubmenu === 'manageTariffs' && (
              <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                {/* Service Tariffs */}
                <a
                  className="collapse-item cursor-pointer d-flex justify-content-between align-items-center text-info font-weight-bold"
                  onClick={() => toggleTariffSubSubmenu('service')}
                >
                  <span><i className="fas fa-concierge-bell mr-1"></i> Service Tariffs</span>
                  <i className={`fas fa-chevron-${openTariffSubSubmenu === 'service' ? 'down' : 'right'} text-xs`}></i>
                </a>
                {openTariffSubSubmenu === 'service' && (
                  <div className="pl-3 py-1 bg-light rounded mx-2 mb-1">
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('tariffs', 'service', 'reg_fees')}
                    >
                      <i className="fas fa-id-card mr-1"></i> Registration Fees
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('tariffs', 'service', 'lab_charges')}
                    >
                      <i className="fas fa-vial mr-1"></i> Laboratory Charges
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('tariffs', 'service', 'radiology_charges')}
                    >
                      <i className="fas fa-x-ray mr-1"></i> Radiology Charges
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('tariffs', 'service', 'admission_fees')}
                    >
                      <i className="fas fa-bed mr-1"></i> Admission Fees
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-primary d-block py-1 small"
                      onClick={() => setActiveTab('tariffs', 'service', 'other_services')}
                    >
                      <i className="fas fa-hand-holding-medical mr-1"></i> Other Services Fees
                    </a>
                  </div>
                )}

                {/* Product Tariffs */}
                <a
                  className="collapse-item cursor-pointer d-flex justify-content-between align-items-center text-primary font-weight-bold"
                  onClick={() => toggleTariffSubSubmenu('product')}
                >
                  <span><i className="fas fa-capsules mr-1"></i> Product Tariffs</span>
                  <i className={`fas fa-chevron-${openTariffSubSubmenu === 'product' ? 'down' : 'right'} text-xs`}></i>
                </a>
                {openTariffSubSubmenu === 'product' && (
                  <div className="pl-3 py-1 bg-light rounded mx-2 mb-1">
                    <a
                      className="collapse-item cursor-pointer text-info d-block py-1 small"
                      onClick={() => setActiveTab('tariffs', 'product', 'medication_fees')}
                    >
                      <i className="fas fa-pills mr-1"></i> Medication fees
                    </a>
                  </div>
                )}

                {/* Manage Packages */}
                <a
                  className="collapse-item cursor-pointer d-flex justify-content-between align-items-center text-success font-weight-bold"
                  onClick={() => toggleTariffSubSubmenu('packages')}
                >
                  <span><i className="fas fa-box-open mr-1"></i> Manage Packages</span>
                  <i className={`fas fa-chevron-${openTariffSubSubmenu === 'packages' ? 'down' : 'right'} text-xs`}></i>
                </a>
                {openTariffSubSubmenu === 'packages' && (
                  <div className="pl-3 py-1 bg-light rounded mx-2 mb-1">
                    <a
                      className="collapse-item cursor-pointer text-info d-block py-1 small"
                      onClick={() => setActiveTab('tariffs', 'packages', 'upload_packages')}
                    >
                      <i className="fas fa-cubes mr-1"></i> Upload Packages
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-info d-block py-1 small"
                      onClick={() => setActiveTab('tariffs', 'packages', 'manage_package_data')}
                    >
                      <i className="fas fa-list-alt mr-1"></i> Manage Package Data
                    </a>
                    <a
                      className="collapse-item cursor-pointer text-info d-block py-1 small"
                      onClick={() => setActiveTab('tariffs', 'packages', 'immunization_fees')}
                    >
                      <i className="fas fa-syringe mr-1"></i> Immunization fees
                    </a>
                  </div>
                )}
              </div>
            )}
            </li>
          )}

      {/* ============================================================== */}
      {/* SWITCH DEPARTMENT / MODULE DROPDOWN */}
      {/* Admin can switch across all departments; Staff can switch across assigned modules */}
      {/* ============================================================== */}
      {(isAdmin || allowedDepartmentList.length > 1) && (
        <>
          <hr className="sidebar-divider my-2" />

          <li className="nav-item position-relative">
            <a
              className="nav-link cursor-pointer d-flex align-items-center justify-content-between"
              id="departmentDropdown"
              onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
              style={{
                backgroundColor: isDepartmentDropdownOpen ? 'rgba(255, 193, 7, 0.15)' : 'transparent',
                borderRadius: '0.35rem',
              }}
            >
              <div>
                <i className="fas fa-fw fa-building text-warning mr-1"></i>
                <span style={{ fontWeight: 'bold' }} className="text-warning">
                  {isAdmin ? 'Switch Department ▼' : 'Switch Module ▼'}
                </span>
              </div>
              <span className="badge badge-warning text-dark font-weight-bold" style={{ fontSize: '0.65rem' }}>
                {currentDeptObj.label.split(' ')[1] || 'Front'}
              </span>
            </a>

            {/* Dropdown Menu matching HTML structure */}
            {isDepartmentDropdownOpen && (
              <div
                className="dropdown-menu show shadow-lg py-1 border-0"
                aria-labelledby="departmentDropdown"
                style={{
                  position: 'static',
                  float: 'none',
                  width: '90%',
                  margin: '0 auto 10px auto',
                  borderRadius: '0.4rem',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  display: 'block',
                }}
              >
                <div className="dropdown-header text-muted text-uppercase px-3 py-1 font-weight-bold small d-flex justify-content-between align-items-center">
                  <span>
                    {isAdmin
                      ? `Hospital Departments (${allowedDepartmentList.length})`
                      : `Assigned Modules (${allowedDepartmentList.length})`}
                  </span>
                  {loadingDepartments && <i className="fas fa-spinner fa-spin text-primary ml-1"></i>}
                </div>
                {allowedDepartmentList.map((dept) => (
                  <a
                    key={dept.id || dept.key}
                    className={`dropdown-item cursor-pointer py-1.5 px-3 d-flex align-items-center justify-content-between ${
                      activeDept === dept.key ? 'bg-light font-weight-bold text-primary' : 'text-dark'
                    }`}
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => loadDepartment(dept.key)}
                  >
                    <span>{dept.label}</span>
                    <div className="d-flex align-items-center">
                      {dept.staffCount !== undefined && dept.staffCount > 0 && (
                        <span className="badge badge-light border text-muted mr-2" style={{ fontSize: '0.7rem' }}>
                          {dept.staffCount} staff
                        </span>
                      )}
                      {activeDept === dept.key && (
                        <i className="fas fa-check text-success small"></i>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </li>
        </>
      )}

      {/* ============================================================== */}
      {/* DEPARTMENT NAVIGATION CONTAINER (#departmentNavContainer) */}
      {/* Displays the navigation of the selected department dynamically */}
      {/* ============================================================== */}
      <div id="departmentNavContainer" className="w-100">
        {/* ----------------- 1. FRONT DESK ----------------- */}
        {activeDept === 'frontdesk' && (
          <div id="nav-frontdesk" className="department-nav">
            <div className="sidebar-heading">
              <span className="text-warning font-weight-bold">🏥 Front Desk</span>
            </div>

            {/* Patients Registration */}
            <li className="nav-item">
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('fdRegistration')}
              >
                <i className="fas fa-fw fa-user-plus"></i>
                <span>Patients Registration</span>
                <i className={`fas fa-chevron-${openSubmenu === 'fdRegistration' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'fdRegistration' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary font-weight-bold"
                    onClick={onOpenNewPatient}
                  >
                    <i className="fas fa-plus-circle mr-1"></i> Register new Patient
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('patients')}
                  >
                    <i className="fas fa-file-excel mr-1"></i> Import Patient from Excel
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('patients')}
                  >
                    <i className="fas fa-calendar-day mr-1"></i> Registered Today
                  </a>
                </div>
              )}
            </li>

            {/* Patients Records */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('fdPatientRecords')}
              >
                <i className="fas fa-fw fa-users"></i>
                <span>Patients Records</span>
                <i className={`fas fa-chevron-${openSubmenu === 'fdPatientRecords' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'fdPatientRecords' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('patients')}
                  >
                    <i className="fas fa-search mr-1"></i> Search for Patients
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-clock mr-1"></i> Waiting List (Doctors)
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('patients')}
                  >
                    <i className="fas fa-birthday-cake mr-1"></i> Today's Birthday List
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('patients')}
                  >
                    <i className="fas fa-user-friends mr-1"></i> Family Patients
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('anc')}
                  >
                    <i className="fas fa-female mr-1"></i> ANC Patients
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('patients')}
                  >
                    <i className="fas fa-id-card mr-1"></i> HMO Patients
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('patients')}
                  >
                    <i className="fas fa-shield-alt mr-1"></i> NHIS Patients
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('patients')}
                  >
                    <i className="fas fa-briefcase mr-1"></i> Retainership Patients
                  </a>
                </div>
              )}
            </li>

            {/* Appointments */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('fdAppointments')}
              >
                <i className="fas fa-fw fa-bell"></i>
                <span>Appointments</span>
                <i className={`fas fa-chevron-${openSubmenu === 'fdAppointments' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'fdAppointments' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-calendar-check mr-1"></i> Today's Appointments
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-calendar-alt mr-1"></i> Upcoming Appointments
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-calendar-times mr-1"></i> Cancelled Appointments
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-history mr-1"></i> Expired Appointments
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-notes-medical mr-1"></i> Appointments Reviews
                  </a>
                </div>
              )}
            </li>

            {/* Attendance Sheet */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('fdAttendance')}
              >
                <i className="fas fa-fw fa-clipboard-list"></i>
                <span>Attendance Sheet</span>
                <i className={`fas fa-chevron-${openSubmenu === 'fdAttendance' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'fdAttendance' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-clipboard-check mr-1"></i> All-time Attendance
                  </a>
                </div>
              )}
            </li>

            {/* File Uploads */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('fdUploads')}
              >
                <i className="fas fa-fw fa-upload"></i>
                <span>File Uploads</span>
                <i className={`fas fa-chevron-${openSubmenu === 'fdUploads' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'fdUploads' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('tariffs', 'packages')}
                  >
                    <i className="fas fa-file-upload mr-1"></i> Upload patients Type
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('patients')}
                  >
                    <i className="fas fa-users-cog mr-1"></i> Upload patients Records
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('tariffs', 'service')}
                  >
                    <i className="fas fa-list-alt mr-1"></i> Upload Service List
                  </a>
                </div>
              )}
            </li>

            {/* Deactivated Patients */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('patients')}
              >
                <i className="fas fa-user-times mr-1"></i>
                <span>Deactivated Patients</span>
              </a>
            </li>
          </div>
        )}

        {/* ----------------- 2. NURSING ----------------- */}
        {activeDept === 'nursing' && (
          <div id="nav-nursing" className="department-nav">
            <div className="sidebar-heading">
              <span className="text-warning font-weight-bold">💉 Nursing Interface</span>
            </div>

            {/* Patients Queue */}
            <li className="nav-item">
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('nurseQueue')}
              >
                <i className="fas fa-fw fa-users"></i>
                <span>Patients Queue</span>
                <i className={`fas fa-chevron-${openSubmenu === 'nurseQueue' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'nurseQueue' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-user-clock mr-1"></i> Patients Waiting List
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-check-circle mr-1"></i> Today's Completed List
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-stethoscope mr-1"></i> Waiting List (Doctors)
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-hospital mr-1"></i> Hospital Waiting List (All)
                  </a>
                </div>
              )}
            </li>

            {/* Today's Appointments List */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('queues')}
              >
                <i className="fas fa-clipboard-list"></i>
                <span>Today's Appointments List</span>
              </a>
            </li>

            {/* Wards Management */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('nurseWards')}
              >
                <i className="fas fa-fw fa-bed"></i>
                <span>Wards Management</span>
                <i className={`fas fa-chevron-${openSubmenu === 'nurseWards' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'nurseWards' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('ipd')}
                  >
                    <i className="fas fa-procedures mr-1"></i> Create & Manage Bed
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('ipd')}
                  >
                    <i className="fas fa-table mr-1"></i> Admissions Table
                  </a>
                </div>
              )}
            </li>

            {/* In Patient: Admission */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('nurseAdmit')}
              >
                <i className="fas fa-procedures"></i>
                <span className="text-warning font-weight-bold">In Patient: Admission</span>
                <i className={`fas fa-chevron-${openSubmenu === 'nurseAdmit' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'nurseAdmit' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('ipd')}
                  >
                    <i className="fas fa-file-medical-alt mr-1"></i> Admission Notes
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('ipd')}
                  >
                    <i className="fas fa-pills mr-1"></i> Drugs Chart
                  </a>
                </div>
              )}
            </li>

            {/* Search for Patients */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('patients')}
              >
                <i className="fas fa-search"></i>
                <span>Search for Patients</span>
              </a>
            </li>
          </div>
        )}

        {/* ----------------- 3. CLINICAL ----------------- */}
        {activeDept === 'clinical' && (
          <div id="nav-clinical" className="department-nav">
            <div className="sidebar-heading">
              <span className="text-warning font-weight-bold">👨‍⚕️ Clinical Interface</span>
            </div>

            {/* Patients Queue */}
            <li className="nav-item">
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('clinicalQueue')}
              >
                <i className="fas fa-fw fa-users"></i>
                <span>Patients Queue</span>
                <i className={`fas fa-chevron-${openSubmenu === 'clinicalQueue' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'clinicalQueue' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-clock mr-1"></i> Patients Waiting List
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('radiolab')}
                  >
                    <i className="fas fa-vial mr-1"></i> Lab Results Queues
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('radiolab')}
                  >
                    <i className="fas fa-x-ray mr-1"></i> Scan Results Queues
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-check-double mr-1"></i> Today's Completed List
                  </a>
                </div>
              )}
            </li>

            {/* Appointments List */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('clinicalAppts')}
              >
                <i className="fas fa-fw fa-bell"></i>
                <span>Appointments List</span>
                <i className={`fas fa-chevron-${openSubmenu === 'clinicalAppts' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'clinicalAppts' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-calendar-day mr-1"></i> Today's Appointments
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-calendar-alt mr-1"></i> Upcoming Appointments
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('queues')}
                  >
                    <i className="fas fa-history mr-1"></i> All-time Appointments
                  </a>
                </div>
              )}
            </li>

            {/* Admissions Table */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('ipd')}
              >
                <i className="fas fa-fw fa-clipboard-list"></i>
                <span>Admissions Table</span>
              </a>
            </li>

            {/* Medical Diagnosis */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('taskmanager', 'stats', 'diagnosis')}
              >
                <i className="fas fa-fw fa-chart-pie"></i>
                <span>Medical Diagnosis</span>
              </a>
            </li>

            {/* Search for Patients */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('patients')}
              >
                <i className="fas fa-search"></i>
                <span>Search for Patients</span>
              </a>
            </li>
          </div>
        )}

        {/* ----------------- 4. INVENTORY ----------------- */}
        {activeDept === 'inventory' && (
          <div id="nav-inventory" className="department-nav">
            <div className="sidebar-heading">
              <span className="text-warning font-weight-bold">📦 Inventory</span>
            </div>

            {/* Inventory Settings */}
            <li className="nav-item">
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('invSettings')}
              >
                <i className="fas fa-fw fa-cog"></i>
                <span>Inventory Settings</span>
                <i className={`fas fa-chevron-${openSubmenu === 'invSettings' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'invSettings' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary font-weight-bold"
                    onClick={() => setActiveTab('inventory', 'view')}
                  >
                    <i className="fas fa-boxes mr-1"></i> View Inventory
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('inventory', 'upload')}
                  >
                    <i className="fas fa-upload mr-1"></i> Upload Products
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('inventory', 'imports')}
                  >
                    <i className="fas fa-file-import mr-1"></i> Manage all Imports
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('inventory', 'imports_history')}
                  >
                    <i className="fas fa-history mr-1"></i> Importations History
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('inventory', 'vendors')}
                  >
                    <i className="fas fa-building mr-1"></i> Manage Vendors
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('inventory', 'scan')}
                  >
                    <i className="fas fa-barcode mr-1"></i> Scan Products
                  </a>
                </div>
              )}
            </li>

            {/* Transfer Products */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('invTransfer')}
              >
                <i className="fas fa-arrow-up"></i>
                <span>Transfer Products</span>
                <i className={`fas fa-chevron-${openSubmenu === 'invTransfer' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'invTransfer' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-info font-weight-bold"
                    onClick={() => setActiveTab('inventory', 'transfers')}
                  >
                    <i className="fas fa-share mr-1"></i> To IPD Pharmacy (1, 2, 3)
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary font-weight-bold"
                    onClick={() => setActiveTab('inventory', 'transfers')}
                  >
                    <i className="fas fa-share mr-1"></i> To OPD Pharmacy (1, 2)
                  </a>
                </div>
              )}
            </li>

            {/* Manage Transfers */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('invManageTransfers')}
              >
                <i className="fas fa-adjust"></i>
                <span>Manage Transfers</span>
                <i className={`fas fa-chevron-${openSubmenu === 'invManageTransfers' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'invManageTransfers' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-info font-weight-bold"
                    onClick={() => setActiveTab('inventory', 'transfers')}
                  >
                    <i className="fas fa-tasks mr-1"></i> Manage IPD Transfers
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary font-weight-bold"
                    onClick={() => setActiveTab('inventory', 'transfers')}
                  >
                    <i className="fas fa-tasks mr-1"></i> Manage OPD Transfers
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-danger font-weight-bold"
                    onClick={() => setActiveTab('inventory', 'transfers')}
                  >
                    <i className="fas fa-history mr-1"></i> Transfer History
                  </a>
                </div>
              )}
            </li>

            {/* Manage Requisitions */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('invRequisitions')}
              >
                <i className="fas fa-clipboard-check"></i>
                <span>Manage Requisitions</span>
                <i className={`fas fa-chevron-${openSubmenu === 'invRequisitions' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'invRequisitions' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-info font-weight-bold"
                    onClick={() => setActiveTab('inventory', 'requisitions')}
                  >
                    <i className="fas fa-file-invoice mr-1"></i> Manage IPD Request
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary font-weight-bold"
                    onClick={() => setActiveTab('inventory', 'requisitions')}
                  >
                    <i className="fas fa-file-invoice mr-1"></i> Manage OPD Request
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-danger font-weight-bold"
                    onClick={() => setActiveTab('inventory', 'requisitions')}
                  >
                    <i className="fas fa-history mr-1"></i> Requisitions History
                  </a>
                </div>
              )}
            </li>
          </div>
        )}

        {/* ----------------- 5. IPD PHARMACY 1, 2, 3 ----------------- */}
        {(activeDept === 'ipd1' || activeDept === 'ipd2' || activeDept === 'ipd3') && (
          <div id={`nav-${activeDept}`} className="department-nav">
            <div className="sidebar-heading">
              <span className="text-warning font-weight-bold">
                💊 IPD Pharmacy {activeDept === 'ipd1' ? '1' : activeDept === 'ipd2' ? '2' : '3'}
              </span>
            </div>

            {/* Queue Management */}
            <li className="nav-item">
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('ipdQueue')}
              >
                <i className="fas fa-fw fa-users"></i>
                <span>Queue Managements</span>
                <i className={`fas fa-chevron-${openSubmenu === 'ipdQueue' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'ipdQueue' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('pharmacy')}
                  >
                    <i className="fas fa-user-clock mr-1"></i> Waiting List
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('pharmacy')}
                  >
                    <i className="fas fa-check-circle mr-1"></i> Completed List
                  </a>
                </div>
              )}
            </li>

            {/* View IPD Pharmacy */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('ipdStore')}
              >
                <i className="fas fa-fw fa-capsules"></i>
                <span>View IPD Pharmacy</span>
                <i className={`fas fa-chevron-${openSubmenu === 'ipdStore' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'ipdStore' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('pharmacy')}
                  >
                    <i className="fas fa-pills mr-1"></i> View Inventory
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('pharmacy')}
                  >
                    <i className="fas fa-barcode mr-1"></i> Scan Products
                  </a>
                </div>
              )}
            </li>

            {/* Product Requisition */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('ipdRequisition')}
              >
                <i className="fas fa-adjust"></i>
                <span>Product Requisition</span>
                <i className={`fas fa-chevron-${openSubmenu === 'ipdRequisition' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'ipdRequisition' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-info font-weight-bold"
                    onClick={() => setActiveTab('pharmacy')}
                  >
                    <i className="fas fa-store mr-1"></i> My Store Requisitions
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary font-weight-bold"
                    onClick={() => setActiveTab('inventory', 'requisitions')}
                  >
                    <i className="fas fa-warehouse mr-1"></i> Central Inventory Store
                  </a>
                </div>
              )}
            </li>

            {/* Product Restore Point */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('ipdRestore')}
              >
                <i className="fas fa-fw fa-undo"></i>
                <span>Product Restore Point</span>
                <i className={`fas fa-chevron-${openSubmenu === 'ipdRestore' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'ipdRestore' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-warning font-weight-bold"
                    onClick={() => setActiveTab('pharmacy')}
                  >
                    <i className="fas fa-ban mr-1"></i> Cancelled Transaction
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-danger font-weight-bold"
                    onClick={() => setActiveTab('pharmacy')}
                  >
                    <i className="fas fa-exclamation-circle mr-1"></i> Staled Transaction
                  </a>
                </div>
              )}
            </li>
          </div>
        )}

        {/* ----------------- 6. OPD PHARMACY 1, 2 ----------------- */}
        {(activeDept === 'opd1' || activeDept === 'opd2') && (
          <div id={`nav-${activeDept}`} className="department-nav">
            <div className="sidebar-heading">
              <span className="text-warning font-weight-bold">
                💊 OPD Pharmacy {activeDept === 'opd1' ? '1' : '2'}
              </span>
            </div>

            {/* Queue Management */}
            <li className="nav-item">
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('opdQueue')}
              >
                <i className="fas fa-fw fa-users"></i>
                <span>Queue Managements</span>
                <i className={`fas fa-chevron-${openSubmenu === 'opdQueue' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'opdQueue' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('pharmacy')}
                  >
                    <i className="fas fa-user-clock mr-1"></i> Waiting List
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('pharmacy')}
                  >
                    <i className="fas fa-check-circle mr-1"></i> Completed List
                  </a>
                </div>
              )}
            </li>

            {/* View OPD Pharmacy */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('opdStore')}
              >
                <i className="fas fa-fw fa-capsules"></i>
                <span>View OPD Pharmacy</span>
                <i className={`fas fa-chevron-${openSubmenu === 'opdStore' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'opdStore' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('pharmacy')}
                  >
                    <i className="fas fa-pills mr-1"></i> View Inventory
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('pharmacy')}
                  >
                    <i className="fas fa-barcode mr-1"></i> Scan Products
                  </a>
                </div>
              )}
            </li>

            {/* Product Requisition */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('opdRequisition')}
              >
                <i className="fas fa-adjust"></i>
                <span>Product Requisition</span>
                <i className={`fas fa-chevron-${openSubmenu === 'opdRequisition' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'opdRequisition' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-info font-weight-bold"
                    onClick={() => setActiveTab('pharmacy')}
                  >
                    <i className="fas fa-store mr-1"></i> My Store Requisitions
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary font-weight-bold"
                    onClick={() => setActiveTab('inventory', 'requisitions')}
                  >
                    <i className="fas fa-warehouse mr-1"></i> Central Inventory Store
                  </a>
                </div>
              )}
            </li>
          </div>
        )}

        {/* ----------------- 7. LABORATORY ----------------- */}
        {activeDept === 'laboratory' && (
          <div id="nav-laboratory" className="department-nav">
            <div className="sidebar-heading">
              <span className="text-warning font-weight-bold">🔬 Laboratory</span>
            </div>

            {/* Queue Management */}
            <li className="nav-item">
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('labQueue')}
              >
                <i className="fas fa-users"></i>
                <span>Queue Management</span>
                <i className={`fas fa-chevron-${openSubmenu === 'labQueue' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'labQueue' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary font-weight-bold"
                    onClick={() => setActiveTab('radiolab')}
                  >
                    <i className="fas fa-hourglass-start mr-1"></i> Waiting List
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('radiolab')}
                  >
                    <i className="fas fa-clipboard-check mr-1"></i> Completed List
                  </a>
                </div>
              )}
            </li>

            {/* Manage Lab Inventory */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('labInventory')}
              >
                <i className="fas fa-clipboard-list"></i>
                <span>Manage Lab Inventory</span>
                <i className={`fas fa-chevron-${openSubmenu === 'labInventory' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'labInventory' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-info font-weight-bold"
                    onClick={() => setActiveTab('radiolab')}
                  >
                    <i className="fas fa-vials mr-1"></i> Lab Inventory
                  </a>
                </div>
              )}
            </li>

            {/* Search for Patients */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('patients')}
              >
                <i className="fas fa-search"></i>
                <span>Search for Patients</span>
              </a>
            </li>
          </div>
        )}

        {/* ----------------- 8. RADIOLOGY ----------------- */}
        {activeDept === 'radiology' && (
          <div id="nav-radiology" className="department-nav">
            <div className="sidebar-heading">
              <span className="text-warning font-weight-bold">📡 Radiology</span>
            </div>

            {/* Queue Management */}
            <li className="nav-item">
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('radioQueue')}
              >
                <i className="fas fa-users"></i>
                <span>Queue Management</span>
                <i className={`fas fa-chevron-${openSubmenu === 'radioQueue' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'radioQueue' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary font-weight-bold"
                    onClick={() => setActiveTab('radiolab')}
                  >
                    <i className="fas fa-hourglass-start mr-1"></i> Waiting List
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('radiolab')}
                  >
                    <i className="fas fa-clipboard-check mr-1"></i> Completed List
                  </a>
                </div>
              )}
            </li>

            {/* Manage Scan Inventory */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('radioInventory')}
              >
                <i className="fas fa-clipboard-list"></i>
                <span>Manage Scan Inventory</span>
                <i className={`fas fa-chevron-${openSubmenu === 'radioInventory' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'radioInventory' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-info font-weight-bold"
                    onClick={() => setActiveTab('radiolab')}
                  >
                    <i className="fas fa-x-ray mr-1"></i> Scan Inventory
                  </a>
                </div>
              )}
            </li>

            {/* Search for Patients */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('patients')}
              >
                <i className="fas fa-search"></i>
                <span>Search for Patients</span>
              </a>
            </li>
          </div>
        )}

        {/* ----------------- 9. BILLINGS ----------------- */}
        {activeDept === 'billings' && (
          <div id="nav-billings" className="department-nav">
            <div className="sidebar-heading">
              <span className="text-warning font-weight-bold">💰 Billings</span>
            </div>

            {/* Queues Management */}
            <li className="nav-item">
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('billQueue')}
              >
                <i className="fas fa-users"></i>
                <span>Queues Management</span>
                <i className={`fas fa-chevron-${openSubmenu === 'billQueue' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'billQueue' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary font-weight-bold"
                    onClick={() => setActiveTab('billings')}
                  >
                    <i className="fas fa-receipt mr-1"></i> Unprocessed Bills
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-warning font-weight-bold"
                    onClick={() => setActiveTab('billings')}
                  >
                    <i className="fas fa-adjust mr-1"></i> Partially Cleared
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-success font-weight-bold"
                    onClick={() => setActiveTab('billings')}
                  >
                    <i className="fas fa-check-double mr-1"></i> Fully Paid
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-info font-weight-bold"
                    onClick={() => setActiveTab('billings')}
                  >
                    <i className="fas fa-list-alt mr-1"></i> Transactions log
                  </a>
                </div>
              )}
            </li>

            {/* Daily Revenue Chart */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('billings')}
              >
                <i className="fas fa-chart-line"></i>
                <span>Daily Revenue Chart</span>
              </a>
            </li>

            {/* Transaction Day Book */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('billings')}
              >
                <i className="fas fa-list"></i>
                <span>Transaction Day Book</span>
              </a>
            </li>

            {/* Search for Patients */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('patients')}
              >
                <i className="fas fa-search"></i>
                <span>Search for Patients</span>
              </a>
            </li>
          </div>
        )}

        {/* ----------------- 10. REPORTING ----------------- */}
        {activeDept === 'reporting' && (
          <div id="nav-reporting" className="department-nav">
            <div className="sidebar-heading">
              <span className="text-warning font-weight-bold">📊 Reporting Unit</span>
            </div>

            {/* Ambulatory Reports */}
            <li className="nav-item">
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('repAmbulatory')}
              >
                <i className="fas fa-chart-line"></i>
                <span>Ambulatory Reports</span>
                <i className={`fas fa-chevron-${openSubmenu === 'repAmbulatory' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'repAmbulatory' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'ambulatory', 'patients_reg')}
                  >
                    <i className="fas fa-user-plus mr-1"></i> Patients Registration
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'ambulatory', 'visits')}
                  >
                    <i className="fas fa-stethoscope mr-1"></i> Visit report
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'ambulatory', 'admissions')}
                  >
                    <i className="fas fa-bed mr-1"></i> IPD Admission Reports
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'ambulatory', 'deactivated')}
                  >
                    <i className="fas fa-user-slash mr-1"></i> Profile Deactivation Report
                  </a>
                </div>
              )}
            </li>

            {/* Billing Reports */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('repBilling')}
              >
                <i className="fas fa-chart-line"></i>
                <span>Billing Reports</span>
                <i className={`fas fa-chevron-${openSubmenu === 'repBilling' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'repBilling' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'billing', 'invoices')}
                  >
                    <i className="fas fa-file-invoice mr-1"></i> Billing Invoice Listing
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'billing', 'exceptions')}
                  >
                    <i className="fas fa-exclamation-triangle mr-1"></i> Exception Bills Report
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'billing', 'cancelled')}
                  >
                    <i className="fas fa-times-circle mr-1"></i> Cancelled Bills Report
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'billing', 'transaction_book')}
                  >
                    <i className="fas fa-book mr-1"></i> Complete Transaction Book
                  </a>
                </div>
              )}
            </li>

            {/* Pharmacies & Inventory */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('repInventory')}
              >
                <i className="fas fa-chart-line"></i>
                <span>Pharmacies & Inventory</span>
                <i className={`fas fa-chevron-${openSubmenu === 'repInventory' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'repInventory' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'inventory', 'expired')}
                  >
                    <i className="fas fa-calendar-times mr-1"></i> Expired Products Report
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'inventory', 'low_stock')}
                  >
                    <i className="fas fa-hourglass-end mr-1"></i> Short-Dated Products
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'inventory', 'low_stock')}
                  >
                    <i className="fas fa-arrow-down mr-1"></i> Low Stock Report
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'inventory', 'low_stock')}
                  >
                    <i className="fas fa-ban mr-1"></i> Out of Stock Report
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'inventory', 'requisitions')}
                  >
                    <i className="fas fa-dolly mr-1"></i> Product Requisitions Detail
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'inventory', 'stock_analysis')}
                  >
                    <i className="fas fa-chart-pie mr-1"></i> Stock Analysis Report
                  </a>
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'inventory', 'vendors')}
                  >
                    <i className="fas fa-hand-holding-usd mr-1"></i> Vendors & Expense Report
                  </a>
                </div>
              )}
            </li>

            {/* Other Reports */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer collapsed"
                onClick={() => toggleSubmenu('repOthers')}
              >
                <i className="fas fa-chart-line"></i>
                <span>Other Reports</span>
                <i className={`fas fa-chevron-${openSubmenu === 'repOthers' ? 'down' : 'right'} float-right text-xs mt-1`}></i>
              </a>
              {openSubmenu === 'repOthers' && (
                <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                  <a
                    className="collapse-item cursor-pointer text-primary"
                    onClick={() => setActiveTab('reporting', 'others', 'appointments')}
                  >
                    <i className="fas fa-calendar mr-1"></i> Appointments Reports
                  </a>
                </div>
              )}
            </li>
          </div>
        )}

        {/* ----------------- 14. CUSTOM / GENERAL DEPARTMENT FALLBACK ----------------- */}
        {!['frontdesk', 'nursing', 'clinical', 'inventory', 'ipd1', 'ipd2', 'ipd3', 'opd1', 'opd2', 'laboratory', 'radiology', 'billings', 'reporting'].includes(activeDept) && (
          <div id="nav-custom-dept" className="department-nav">
            <div className="sidebar-heading">
              <span className="text-warning font-weight-bold">
                🏢 {currentRole || activeDept} Unit
              </span>
            </div>

            {/* Department Queue */}
            <li className="nav-item">
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('queues')}
              >
                <i className="fas fa-fw fa-clock"></i>
                <span>Department Waiting List</span>
              </a>
            </li>

            {/* Patients Directory */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('patients')}
              >
                <i className="fas fa-fw fa-users"></i>
                <span>Patients Directory</span>
              </a>
            </li>

            {/* Staff Profile */}
            <li className="nav-item" style={{ marginTop: '-10px' }}>
              <a
                className="nav-link cursor-pointer"
                onClick={() => setActiveTab('profile', 'overview')}
              >
                <i className="fas fa-fw fa-user"></i>
                <span>My Profile</span>
              </a>
            </li>
          </div>
        )}
      </div>

      <hr className="sidebar-divider d-none d-md-block" />

      {/* Sidebar Toggler */}
      <div className="text-center d-none d-md-inline mt-2">
        <button
          className="rounded-circle border-0"
          id="sidebarToggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ width: '2.5rem', height: '2.5rem', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          <i className={`fas fa-angle-${isCollapsed ? 'right' : 'left'}`}></i>
        </button>
      </div>
    </ul>
  );
}
