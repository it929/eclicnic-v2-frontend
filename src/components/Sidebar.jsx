import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import {
  normalizeDepartmentKey,
  DEPARTMENT_LIST,
  formatDepartmentItem,
  AVAILABLE_MODULES,
  getDefaultModulesForDepartment,
  getDefaultTabForDepartment,
  getDepartmentLanding,
} from '../utils/departmentUtils';

export default function Sidebar({
  activeTab,
  setActiveTab,
  navigateToRoute = null,
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

  // Safe FontAwesome icon class helper
  const getSafeIcon = (rawIcon) => {
    if (!rawIcon) return 'fa-cubes';
    const clean = String(rawIcon).trim().replace(/^fa[srbld]?\s+/, '').replace(/^fa-/, '');
    return `fa-${clean}`;
  };

  // Dynamic Departments & Assigned Modules from Database
  const [dbRoles, setDbRoles] = useState([]);
  const [dynamicDepartments, setDynamicDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const fetchDbDepartments = useCallback(async () => {
    try {
      setLoadingDepartments(true);
      const rolesData = await api.getRoles();
      if (Array.isArray(rolesData) && rolesData.length > 0) {
        setDbRoles(rolesData);
        setDynamicDepartments(rolesData.map(formatDepartmentItem).filter(Boolean));
      } else {
        const deptsData = await api.getDepartments();
        if (Array.isArray(deptsData) && deptsData.length > 0) {
          setDynamicDepartments(deptsData.map(formatDepartmentItem).filter(Boolean));
        }
      }
    } catch (err) {
      console.error('Failed to load roles/departments in Sidebar:', err);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  useEffect(() => {
    fetchDbDepartments();
    const handleRbacUpdate = () => {
      fetchDbDepartments();
    };
    window.addEventListener('clinic365_rbac_updated', handleRbacUpdate);
    return () => window.removeEventListener('clinic365_rbac_updated', handleRbacUpdate);
  }, [fetchDbDepartments]);

  // Update when prop changes from parent
  useEffect(() => {
    if (Array.isArray(dbDepartments) && dbDepartments.length > 0) {
      setDynamicDepartments(dbDepartments.map(formatDepartmentItem).filter(Boolean));
    }
  }, [dbDepartments]);

  // Combined department list (DB takes priority, fallback to built-in list)
  const departmentList = dynamicDepartments.length > 0 ? dynamicDepartments : DEPARTMENT_LIST;

  const userRole = String(
    user?.role_name ||
    (typeof user?.role === 'object' ? user?.role?.name : user?.role) ||
    localStorage.getItem('clinic365_user_role') ||
    ''
  ).toLowerCase();

  const isUserAdmin = Boolean(
    user?.is_superuser ||
    user?.is_staff ||
    userRole === 'admin' ||
    userRole === 'cmd' ||
    localStorage.getItem('clinic365_is_admin') === 'true' ||
    currentRole === 'Admin' ||
    currentRole === 'CMD'
  );

  const isAdmin = isUserAdmin;

  // Determine permitted modules for this user based on their department
  const staffModules = useMemo(() => {
    if (isAdmin) return AVAILABLE_MODULES.map((m) => m.id);

    // Primary: Role-Based Access Control Modules from Database
    if (user?.role_modules && Array.isArray(user.role_modules) && user.role_modules.length > 0) {
      return user.role_modules;
    }
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
  }, [isAdmin, user, currentRole, dynamicDepartments]);

  const isDeptKeyAllowed = useCallback(
    (deptKey) => {
      if (isAdmin) return true;
      if (!Array.isArray(staffModules) || staffModules.length === 0) return false;

      const mapping = {
        frontdesk: [
          'frontdesk',
          'fd_registration',
          'fd_records',
          'fd_appointments',
          'fd_attendance',
          'fd_uploads',
          'fd_billing',
        ],
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
        billings: ['billings', 'fd_billing'],
        reporting: ['reporting'],
      };

      const required = mapping[deptKey] || [deptKey];
      return required.some((m) => staffModules.includes(m));
    },
    [isAdmin, staffModules]
  );

  const isSubmoduleAllowed = useCallback(
    (codeOrCodes, moduleKey) => {
      if (isAdmin) return true;
      if (moduleKey && !isDeptKeyAllowed(moduleKey)) return false;
      const roleSubs = user?.role_submodules;
      if (!Array.isArray(roleSubs) || roleSubs.length === 0) {
        return true; // No granular submodule restrictions applied
      }
      const codes = Array.isArray(codeOrCodes) ? codeOrCodes : [codeOrCodes];
      const lowerRoleSubs = roleSubs.map((s) => String(s).toLowerCase());
      return codes.some((c) => lowerRoleSubs.includes(String(c).toLowerCase()));
    },
    [isAdmin, isDeptKeyAllowed, user]
  );

  // Filter department list to allowed ones and deduplicate by key
  const allowedDepartmentList = useMemo(() => {
    const list = isAdmin
      ? departmentList
      : departmentList.filter((d) => isDeptKeyAllowed(d.key));

    const seen = new Set();
    return list.filter((dept) => {
      if (!dept || !dept.key) return false;
      if (seen.has(dept.key)) return false;
      seen.add(dept.key);
      return true;
    });
  }, [isAdmin, departmentList, isDeptKeyAllowed]);

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
  }, [selectedDepartment, currentRole, activeDept]);

  // Resolve active department object and its assigned modules from database
  const activeDepartmentRole = useMemo(() => {
    if (!Array.isArray(dbRoles) || dbRoles.length === 0) return null;
    return (
      dbRoles.find((r) => normalizeDepartmentKey(r.name) === activeDept) ||
      dbRoles.find((r) => currentRole && r.name && r.name.toLowerCase() === currentRole.toLowerCase()) ||
      dbRoles.find((r) => r.name && r.name.toLowerCase().includes(activeDept)) ||
      null
    );
  }, [dbRoles, activeDept, currentRole]);

  const activeDepartmentModules = useMemo(() => {
    if (!activeDepartmentRole || !Array.isArray(activeDepartmentRole.modules)) {
      return [];
    }
    return activeDepartmentRole.modules;
  }, [activeDepartmentRole]);

  // Load department handler (matching HTML loadDepartment function)
  const loadDepartment = useCallback(
    (deptKey, rawDeptName = null) => {
      if (!isAdmin) {
        setIsDepartmentDropdownOpen(false);
        return;
      }
      const normalized = normalizeDepartmentKey(deptKey);
      setActiveDept(normalized);
      localStorage.setItem('selectedDepartment', normalized);
      if (setSelectedDepartment) {
        setSelectedDepartment(normalized);
      }
      if (setCurrentRole && rawDeptName) {
        // Strip leading emoji/symbols to keep role name clean
        const cleanRole = String(rawDeptName).replace(/^[\S]+\s*/, '').trim() || rawDeptName;
        setCurrentRole(cleanRole);
        localStorage.setItem('clinic365_dept', cleanRole);
      }
      // Route directly to the department's dedicated landing page:
      // Front Desk -> /patients/all
      // Nursing & Clinical -> /appointments/today
      // Billings -> /billings/unprocessed
      // Admin / CMD -> /dashboard
      const landing = getDepartmentLanding(normalized, rawDeptName);
      if (navigateToRoute && landing.route) {
        navigateToRoute(landing.route);
      } else if (setActiveTab) {
        setActiveTab(landing.tab, landing.subTab, landing.subSubTab);
        if (landing.route && window.location.hash !== `#${landing.route}`) {
          window.location.hash = landing.route;
        }
      }
      setIsDepartmentDropdownOpen(false);
    },
    [isAdmin, setSelectedDepartment, setCurrentRole, setActiveTab, navigateToRoute]
  );

  // Automatically expand the first module with submodules when switching department
  useEffect(() => {
    if (activeDepartmentModules.length > 0) {
      const firstWithSubs = activeDepartmentModules.find(
        (m) => Array.isArray(m.submodules) && m.submodules.length > 0
      );
      if (firstWithSubs) {
        setOpenSubmenu(firstWithSubs.code || firstWithSubs.id);
      } else {
        setOpenSubmenu(null);
      }
    }
  }, [activeDept, activeDepartmentModules]);

  // Submodule navigation handler
  const handleSubmoduleClick = (sub, mod) => {
    if (sub.route && navigateToRoute) {
      navigateToRoute(sub.route);
    } else if (setActiveTab && sub.tab_key) {
      setActiveTab(sub.tab_key, sub.sub_tab, sub.sub_sub_tab);
    } else if (setActiveTab && mod.primary_tab) {
      setActiveTab(mod.primary_tab);
    }
  };

  // Module navigation handler
  const handleModuleClick = (mod) => {
    if (mod.submodules && mod.submodules.length > 0) {
      toggleSubmenu(mod.code || mod.id);
    } else if (setActiveTab && mod.primary_tab) {
      setActiveTab(mod.primary_tab);
    }
  };

  // Ensure staff members stay on an allowed department module without cascading renders
  useEffect(() => {
    if (!isAdmin && allowedDepartmentList.length > 0) {
      const isAllowed = allowedDepartmentList.some((d) => d.key === activeDept);
      if (!isAllowed) {
        const fallback = allowedDepartmentList[0];
        setActiveDept(fallback.key);
        localStorage.setItem('selectedDepartment', fallback.key);
        if (setSelectedDepartment) {
          setSelectedDepartment(fallback.key);
        }
      }
    }
  }, [isAdmin, allowedDepartmentList, activeDept, setSelectedDepartment]);

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
    departmentList.find((d) => d && d.key === activeDept) || {
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

      {/* Role Pill - Read-only for staff, view selector for admin */}
      <div className="px-3 py-2 text-center">
        <span className="badge badge-light px-2 py-1 text-primary font-weight-bold" style={{ fontSize: '0.75rem' }}>
          {isAdmin ? `Department: ${currentRole}` : `Role: ${currentRole}`}
        </span>
        {isAdmin && (
          <div className="mt-1">
            <select
              className="custom-select custom-select-sm bg-light text-dark font-weight-bold border-0"
              style={{ fontSize: '0.75rem', height: '28px' }}
              value={currentRole}
              onChange={(e) => {
                const newRole = e.target.value;
                const deptKey = normalizeDepartmentKey(newRole);
                loadDepartment(deptKey, newRole);
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
        )}
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

      {/* Nav Item - Registered Patients */}
      <li className={`nav-item ${activeTab === 'patients' ? 'active' : ''}`}>
        <a
          className="nav-link cursor-pointer"
          onClick={() => setActiveTab('patients')}
        >
          <i className="fas fa-fw fa-hospital-user"></i>
          <span>Registered Patients</span>
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
              <div className="bg-white py-2 collapse-inner rounded shadow-sm">
                {/* Staff Management */}
                <div
                  className={`sidebar-submenu-toggle cursor-pointer ${
                    openSubSubmenu === 'staff' ? 'is-open' : ''
                  }`}
                  onClick={() => toggleSubSubmenu('staff')}
                >
                  <span className="d-flex align-items-center text-truncate mr-1">
                    <span className="icon-badge">
                      <i className="fas fa-users-cog"></i>
                    </span>
                    <span>Staff Management</span>
                  </span>
                  <i className={`fas fa-chevron-${openSubSubmenu === 'staff' ? 'down' : 'right'} text-xs text-muted flex-shrink-0`}></i>
                </div>
                {openSubSubmenu === 'staff' && (
                  <div className="sidebar-sub-tree">
                    <a
                      className="sidebar-sub-item"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'manage_users')}
                      title="Manage Users"
                    >
                      <span className="sub-item-text"><i className="fas fa-user-friends sub-item-icon"></i> Manage Users</span>
                    </a>
                    <a
                      className="sidebar-sub-item"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'online_users')}
                      title="View Online Users"
                    >
                      <span className="sub-item-text"><i className="fas fa-globe sub-item-icon"></i> Online Users</span>
                    </a>
                    <a
                      className="sidebar-sub-item"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'activity_logs')}
                      title="User Activity Logs"
                    >
                      <span className="sub-item-text"><i className="fas fa-history sub-item-icon"></i> Activity Logs</span>
                    </a>
                    <a
                      className="sidebar-sub-item"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'activity_dashboard')}
                      title="Activities Dashboard"
                    >
                      <span className="sub-item-text"><i className="fas fa-tachometer-alt sub-item-icon"></i> Activity Dashboard</span>
                    </a>
                    <a
                      className="sidebar-sub-item"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'verify_staff')}
                      title="Authenticate Staff ID"
                    >
                      <span className="sub-item-text"><i className="fas fa-id-card sub-item-icon"></i> Verify Staff ID</span>
                    </a>
                    <a
                      className="sidebar-sub-item"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'create_staff')}
                      title="Create Staff Account"
                    >
                      <span className="sub-item-text"><i className="fas fa-user-plus sub-item-icon"></i> Create Staff</span>
                    </a>
                    <a
                      className="sidebar-sub-item"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'departments')}
                      title="User Departments & Categories"
                    >
                      <span className="sub-item-text"><i className="fas fa-sitemap sub-item-icon"></i> User Departments</span>
                    </a>
                    <a
                      className="sidebar-sub-item"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'assign_modules')}
                      title="Assign Department Modules"
                    >
                      <span className="sub-item-text"><i className="fas fa-cubes sub-item-icon"></i> Department Modules</span>
                    </a>
                    <a
                      className="sidebar-sub-item sidebar-sub-item-danger font-weight-bold"
                      onClick={() => setActiveTab('taskmanager', 'staff', 'rbac')}
                      title="Department & Module Access Control"
                    >
                      <span className="sub-item-text"><i className="fas fa-sitemap sub-item-icon"></i> Department Access</span>
                      <span className="sidebar-micro-badge badge-danger">RBAC</span>
                    </a>
                  </div>
                )}

                {/* Queue Monitor */}
                <div
                  className={`sidebar-submenu-toggle cursor-pointer mt-1 ${
                    openSubSubmenu === 'queue' ? 'is-open' : ''
                  }`}
                  onClick={() => toggleSubSubmenu('queue')}
                >
                  <span className="d-flex align-items-center text-truncate mr-1">
                    <span className="icon-badge">
                      <i className="fas fa-user-clock"></i>
                    </span>
                    <span>Queue Monitor</span>
                  </span>
                  <i className={`fas fa-chevron-${openSubSubmenu === 'queue' ? 'down' : 'right'} text-xs text-muted flex-shrink-0`}></i>
                </div>
                {openSubSubmenu === 'queue' && (
                  <div className="sidebar-sub-tree">
                    <a
                      className="sidebar-sub-item"
                      onClick={() => setActiveTab('taskmanager', 'queue', 'waiting_list')}
                      title="Waiting Patients Queue"
                    >
                      <span className="sub-item-text"><i className="fas fa-hourglass-half sub-item-icon text-warning"></i> Waiting List</span>
                    </a>
                    <a
                      className="sidebar-sub-item"
                      onClick={() => setActiveTab('taskmanager', 'queue', 'completed_list')}
                      title="Completed Consultations"
                    >
                      <span className="sub-item-text"><i className="fas fa-check-double sub-item-icon text-success"></i> Completed List</span>
                    </a>
                  </div>
                )}

                {/* Statistical Insights */}
                <div
                  className={`sidebar-submenu-toggle cursor-pointer mt-1 ${
                    openSubSubmenu === 'stats' ? 'is-open' : ''
                  }`}
                  onClick={() => toggleSubSubmenu('stats')}
                >
                  <span className="d-flex align-items-center text-truncate mr-1">
                    <span className="icon-badge">
                      <i className="fas fa-chart-line"></i>
                    </span>
                    <span>Statistical Insights</span>
                  </span>
                  <i className={`fas fa-chevron-${openSubSubmenu === 'stats' ? 'down' : 'right'} text-xs text-muted flex-shrink-0`}></i>
                </div>
                {openSubSubmenu === 'stats' && (
                  <div className="sidebar-sub-tree">
                    <a
                      className="sidebar-sub-item"
                      onClick={() => setActiveTab('taskmanager', 'stats', 'diagnosis')}
                      title="Medical Diagnosis Analytics"
                    >
                      <span className="sub-item-text"><i className="fas fa-stethoscope sub-item-icon text-info"></i> Medical Diagnosis</span>
                    </a>
                    <a
                      className="sidebar-sub-item"
                      onClick={() => setActiveTab('taskmanager', 'stats', 'financial')}
                      title="Hospital Financial Analytics"
                    >
                      <span className="sub-item-text"><i className="fas fa-file-invoice-dollar sub-item-icon text-success"></i> Financial Data</span>
                    </a>
                  </div>
                )}

                {/* Dedicated RBAC Access Action Banner */}
                <div className="pt-2 mt-2 border-top px-1">
                  <a
                    className="sidebar-rbac-banner"
                    onClick={() => setActiveTab('taskmanager', 'staff', 'rbac')}
                    title="Department & Module Access Control"
                  >
                    <span className="d-flex align-items-center text-truncate mr-2">
                      <i className="fas fa-sitemap mr-2 text-danger"></i>
                      <span className="font-weight-bold text-truncate" style={{ fontSize: '0.82rem' }}>Department Access</span>
                    </span>
                    <span className="sidebar-rbac-pill">DEPT</span>
                  </a>
                </div>
              </div>
            )}
            </li>
          )}

          {/* Manage Tariff Plans Module */}
          {(isAdmin || staffModules.includes('tariffs')) && (
            <li className={`nav-item ${activeTab === 'tariffs' || activeTab === 'visit-purposes' || activeTab === 'diagnoses-setup' ? 'active' : ''}`} style={{ marginTop: '-10px' }}>
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
                {/* Sponsors */}
                <a
                  className="collapse-item cursor-pointer text-primary font-weight-bold mb-1"
                  onClick={() => setActiveTab('tariffs', 'sponsors', 'manage_sponsors')}
                >
                  <i className="fas fa-building mr-1"></i> Sponsors
                </a>

                {/* Plans */}
                <a
                  className="collapse-item cursor-pointer text-primary font-weight-bold mb-1"
                  onClick={() => setActiveTab('tariffs', 'plans', 'manage_plans')}
                >
                  <i className="fas fa-layer-group mr-1"></i> Plans
                </a>

                {/* Categories */}
                <a
                  className="collapse-item cursor-pointer text-primary font-weight-bold mb-1"
                  onClick={() => setActiveTab('tariffs', 'categories', 'manage_categories')}
                >
                  <i className="fas fa-tags mr-1"></i> Categories
                </a>

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
                    <a
                      className="collapse-item cursor-pointer text-info font-weight-bold d-block py-1 small"
                      onClick={() => setActiveTab('visit-purposes')}
                    >
                      <i className="fas fa-stethoscope mr-1"></i> Appointment &amp; Visit Purposes Setup
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

                {/* Appointment & Visit Purposes Setup */}
                <a
                  className={`collapse-item cursor-pointer text-primary font-weight-bold mb-1 d-flex align-items-center ${
                    activeTab === 'visit-purposes' ? 'active font-weight-bolder text-info' : ''
                  }`}
                  onClick={() => setActiveTab('visit-purposes')}
                  title="Configure clinical consultation fees, triage purposes and tariffs"
                >
                  <i className="fas fa-stethoscope mr-1 text-info"></i>
                  <span>Appointment &amp; Visit Purposes Setup</span>
                </a>

                {/* Medical Diagnoses Directory & Bulk Setup */}
                <a
                  className={`collapse-item cursor-pointer text-primary font-weight-bold mb-1 d-flex align-items-center ${
                    activeTab === 'diagnoses-setup' ? 'active font-weight-bolder text-info' : ''
                  }`}
                  onClick={() => setActiveTab('diagnoses-setup')}
                  title="Medical Diagnoses Directory & Bulk Setup"
                >
                  <i className="fas fa-book-medical mr-1 text-danger"></i>
                  <span>Medical Diagnoses Directory &amp; Bulk Setup</span>
                </a>
              </div>
            )}
            </li>
          )}

      {/* ============================================================== */}
      {/* SWITCH DEPARTMENT DROPDOWN */}
      {/* Admin users only: only admin can switch department */}
      {/* ============================================================== */}
      {isAdmin && (
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
                  Switch Department ▼
                </span>
              </div>
              <span className="badge badge-warning text-dark font-weight-bold" style={{ fontSize: '0.65rem' }}>
                {currentDeptObj?.label ? currentDeptObj.label.replace(/^[\S]+\s*/, '') : 'Dept'}
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
                    Hospital Departments ({allowedDepartmentList.length})
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
                    onClick={() => {
                      loadDepartment(dept.key, dept.name || dept.label);
                    }}
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
      {/* ============================================================== */}
      {/* DEPARTMENT NAVIGATION CONTAINER (#departmentNavContainer) */}
      {/* Displays the modules & submodules assigned to the selected department */}
      {/* ============================================================== */}
      <div id="departmentNavContainer" className="w-100">
        {loadingDepartments && activeDepartmentModules.length === 0 ? (
          <div className="text-center py-4 text-white-50 small">
            <i className="fas fa-spinner fa-spin mr-1"></i> Loading modules...
          </div>
        ) : activeDepartmentModules && activeDepartmentModules.length > 0 ? (
          <div id={`nav-dept-${activeDept}`} className="department-nav">
            <div className="sidebar-heading d-flex align-items-center justify-content-between mb-1">
              <span className="text-warning font-weight-bold">
                {currentDeptObj?.label?.split(' ')[0] || '🏢'}{' '}
                {(activeDepartmentRole?.name || currentRole || activeDept).toUpperCase()}
              </span>
              <span
                className="badge badge-light border text-muted"
                style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px' }}
                title={`${activeDepartmentModules.length} modules assigned`}
              >
                {activeDepartmentModules.length} {activeDepartmentModules.length === 1 ? 'module' : 'modules'}
              </span>
            </div>

            {activeDepartmentModules.map((mod) => {
              const subs = mod.submodules || [];
              const hasSubs = subs.length > 0;
              const isSubOpen = openSubmenu === (mod.code || mod.id);

              if (hasSubs) {
                return (
                  <li key={mod.id || mod.code} className="nav-item">
                    <a
                      className={`nav-link cursor-pointer d-flex align-items-center justify-content-between ${
                        isSubOpen ? '' : 'collapsed'
                      }`}
                      onClick={() => toggleSubmenu(mod.code || mod.id)}
                    >
                      <div className="d-flex align-items-center text-truncate mr-2">
                        <i className={`fas fa-fw ${getSafeIcon(mod.icon || 'fa-cubes')} mr-1`}></i>
                        <span className="text-truncate">{mod.name}</span>
                      </div>
                      <i className={`fas fa-chevron-${isSubOpen ? 'down' : 'right'} text-xs text-white-50 flex-shrink-0`}></i>
                    </a>

                    {isSubOpen && (
                      <div className="bg-white py-2 collapse-inner rounded mx-3 mb-2 shadow-sm">
                        {subs.map((s) => {
                          const isSubActive = Boolean(
                            (s.route && window.location.hash === `#${s.route}`) ||
                            (s.tab_key && activeTab === s.tab_key && !s.route)
                          );

                          return (
                            <a
                              key={s.id || s.code}
                              className={`collapse-item cursor-pointer text-primary d-flex align-items-center py-1.5 px-3 ${
                                isSubActive ? 'bg-light font-weight-bold text-dark border-left border-primary' : ''
                              }`}
                              onClick={() => handleSubmoduleClick(s, mod)}
                              title={s.route ? `Route: ${s.route}` : s.name}
                              style={{ fontSize: '0.82rem' }}
                            >
                              <i
                                className={`fas ${getSafeIcon(s.icon || 'fa-circle')} mr-2 text-muted`}
                                style={{ width: '15px', textAlign: 'center', fontSize: '0.8rem' }}
                              ></i>
                              <span className="text-truncate">{s.name}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              }

              // Single module without submodules
              return (
                <li key={mod.id || mod.code} className="nav-item">
                  <a
                    className={`nav-link cursor-pointer d-flex align-items-center ${
                      activeTab === mod.primary_tab ? 'active font-weight-bold' : ''
                    }`}
                    onClick={() => handleModuleClick(mod)}
                  >
                    <i className={`fas fa-fw ${getSafeIcon(mod.icon || 'fa-cubes')} mr-1`}></i>
                    <span className="text-truncate">{mod.name}</span>
                  </a>
                </li>
              );
            })}
          </div>
        ) : (
          /* Empty state if dynamic role has no modules */
          <div id="nav-empty-dept" className="department-nav px-3 py-4 text-center text-white-50 small">
            <i className="fas fa-cubes fa-2x mb-2 text-warning d-block"></i>
            <div>No modules assigned to {(activeDepartmentRole?.name || activeDept)} in database.</div>
            {isAdmin && (
              <button
                className="btn btn-sm btn-outline-warning mt-2 font-weight-bold"
                style={{ fontSize: '0.75rem' }}
                onClick={() => {
                  setActiveTab('taskmanager');
                  if (navigateToRoute) navigateToRoute('/admin/departments');
                }}
              >
                <i className="fas fa-key mr-1"></i> Configure Permissions
              </button>
            )}
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
