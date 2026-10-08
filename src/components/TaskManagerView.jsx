import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { AVAILABLE_MODULES, getDefaultModulesForDepartment } from '../utils/departmentUtils';

export default function TaskManagerView({
  initialSubmodule = 'staff',
  initialSubSubmodule = 'manage_users',
  onDepartmentsChanged,
}) {
  // Submodule navigation state
  const [activeSubmodule, setActiveSubmodule] = useState(initialSubmodule);
  const [activeSubSubmodule, setActiveSubSubmodule] = useState(initialSubSubmodule);

  // When props change from sidebar click
  useEffect(() => {
    if (initialSubmodule) setActiveSubmodule(initialSubmodule);
    if (initialSubSubmodule) setActiveSubSubmodule(initialSubSubmodule);
  }, [initialSubmodule, initialSubSubmodule]);

  // Loading & Alert state
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success' | 'danger', message: '' }

  // Staff Management State
  const [staffList, setStaffList] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityDashboard, setActivityDashboard] = useState(null);
  const [verifiedStaff, setVerifiedStaff] = useState([]);
  const [newStaffId, setNewStaffId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departments, setDepartments] = useState([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [selectedDeptIdForModules, setSelectedDeptIdForModules] = useState('');
  const [selectedModulesList, setSelectedModulesList] = useState([]);
  const [savingModules, setSavingModules] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    username: '',
    fullname: '',
    email: '',
    phone_number: '',
    gender: 'Male',
    dob: '',
    address: '',
    department_id: '',
    password: '',
    confirm_password: '',
    pin: '1234',
  });

  // Admin PIN Action Modal State
  const [actionModal, setActionModal] = useState({
    open: false,
    action: '', // 'reset_pin' | 'reset_password' | 'toggle_status'
    targetUser: null,
    title: '',
    pinCode: '',
    showPin: false,
  });

  // Queue Monitor State
  const [queueStats, setQueueStats] = useState({
    waiting: { doctor_waiting: 0, nurse_waiting: 0, lab_waiting: 0, pharmacy_waiting: 0 },
    completed: { doctor_completed: 0, nurse_completed: 0, lab_completed: 0, pharmacy_dispensed: 0 },
  });

  // Statistical Insights State
  const [statsData, setStatsData] = useState({
    diagnosis_analytics: [],
    financial_analytics: {
      total_revenue: 0,
      payment_methods: [],
      department_revenue: [],
    },
  });

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  // Fetch Staff Data
  const loadStaffData = async () => {
    try {
      setLoading(true);
      const res = await api.getStaffUsers();
      setStaffList(res.staff || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Online Users
  const loadOnlineUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getOnlineUsers();
      setOnlineUsers(res.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Activity Logs
  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getActivityLogs();
      setActivityLogs(res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Activity Dashboard
  const loadActivityDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getActivityDashboard();
      setActivityDashboard(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Verified Staff
  const loadVerifiedStaff = async () => {
    try {
      setLoading(true);
      const res = await api.getVerifiedStaff();
      setVerifiedStaff(res.staff_ids || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Departments for Staff Creation
  const loadDepartments = async () => {
    try {
      const res = await api.getDepartments();
      setDepartments(res || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  // Create Staff Member Handler
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaffForm.username.trim()) {
      showAlert('Staff ID / Username is required.', 'danger');
      return;
    }
    if (!newStaffForm.fullname.trim()) {
      showAlert('Full Name is required.', 'danger');
      return;
    }
    if (!newStaffForm.department_id) {
      showAlert('Please assign a department to the staff member.', 'danger');
      return;
    }
    if (newStaffForm.password && newStaffForm.password !== newStaffForm.confirm_password) {
      showAlert('Passwords do not match.', 'danger');
      return;
    }

    try {
      setCreatingStaff(true);
      const res = await api.createStaffUser(newStaffForm);
      showAlert(res.detail || 'Staff account created successfully!', 'success');
      setNewStaffForm({
        username: '',
        fullname: '',
        email: '',
        phone_number: '',
        gender: 'Male',
        dob: '',
        address: '',
        department_id: '',
        password: '',
        confirm_password: '',
        pin: '1234',
      });
      await loadStaffData();
      setActiveSubSubmodule('manage_users');
    } catch (err) {
      showAlert(err.response?.data?.detail || 'Failed to create staff member.', 'danger');
    } finally {
      setCreatingStaff(false);
    }
  };

  // Create Department Handler
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) {
      showAlert('User category / Department name cannot be empty.', 'danger');
      return;
    }
    try {
      setSavingDepartment(true);
      const res = await api.createDepartment({ department: newDepartmentName.trim() });
      showAlert(res.detail || `Department "${newDepartmentName.trim()}" created successfully!`, 'success');
      setNewDepartmentName('');
      loadDepartments();
      if (onDepartmentsChanged) onDepartmentsChanged();
    } catch (err) {
      showAlert(err.response?.data?.detail || 'Failed to create department.', 'danger');
    } finally {
      setSavingDepartment(false);
    }
  };

  // Delete Department Handler
  const handleDeleteDepartment = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete user category / department "${dept.department}"?`)) return;
    try {
      const res = await api.deleteDepartment(dept.id);
      showAlert(res.detail || `Department "${dept.department}" deleted.`, 'success');
      loadDepartments();
      if (onDepartmentsChanged) onDepartmentsChanged();
    } catch (err) {
      showAlert(err.response?.data?.detail || 'Failed to delete department.', 'danger');
    }
  };

  // Sync selectedModulesList when selected department changes or departments are reloaded
  useEffect(() => {
    if (departments.length > 0) {
      const activeDeptId = selectedDeptIdForModules || departments[0].id;
      if (!selectedDeptIdForModules) {
        setSelectedDeptIdForModules(activeDeptId);
      }
      const current = departments.find((d) => String(d.id) === String(activeDeptId));
      if (current) {
        if (Array.isArray(current.modules) && current.modules.length > 0) {
          setSelectedModulesList(current.modules);
        } else {
          setSelectedModulesList(getDefaultModulesForDepartment(current.department));
        }
      }
    }
  }, [departments, selectedDeptIdForModules]);

  const handleSelectDeptForModules = (deptId) => {
    setSelectedDeptIdForModules(deptId);
    const current = departments.find((d) => String(d.id) === String(deptId));
    if (current) {
      if (Array.isArray(current.modules) && current.modules.length > 0) {
        setSelectedModulesList(current.modules);
      } else {
        setSelectedModulesList(getDefaultModulesForDepartment(current.department));
      }
    }
  };

  const handleToggleModule = (modId) => {
    setSelectedModulesList((prev) => {
      if (prev.includes(modId)) {
        return prev.filter((id) => id !== modId);
      } else {
        return [...prev, modId];
      }
    });
  };

  const handleSelectAllModules = () => {
    setSelectedModulesList(AVAILABLE_MODULES.map((m) => m.id));
  };

  const handleClearAllModules = () => {
    setSelectedModulesList([]);
  };

  const handleResetDefaultModules = () => {
    const current = departments.find((d) => String(d.id) === String(selectedDeptIdForModules));
    if (current) {
      setSelectedModulesList(getDefaultModulesForDepartment(current.department));
    }
  };

  const handleSaveDepartmentModules = async () => {
    if (!selectedDeptIdForModules) {
      showAlert('Please choose a department to configure.', 'danger');
      return;
    }
    const current = departments.find((d) => String(d.id) === String(selectedDeptIdForModules));
    const deptName = current ? current.department : 'Department';

    try {
      setSavingModules(true);
      const res = await api.updateDepartmentModules(selectedDeptIdForModules, selectedModulesList);
      showAlert(res.detail || `Module permissions for "${deptName}" saved successfully!`, 'success');
      await loadDepartments();
      if (onDepartmentsChanged) onDepartmentsChanged();
    } catch (err) {
      showAlert(err.response?.data?.detail || 'Failed to update department modules.', 'danger');
    } finally {
      setSavingModules(false);
    }
  };

  // Fetch Queue Monitor
  const loadQueueStats = async () => {
    try {
      setLoading(true);
      const res = await api.getQueueMonitorStats();
      setQueueStats(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Statistical Insights
  const loadStatisticalInsights = async () => {
    try {
      setLoading(true);
      const res = await api.getStatisticalInsights();
      setStatsData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load relevant data whenever active tab changes
  useEffect(() => {
    if (activeSubmodule === 'staff') {
      if (activeSubSubmodule === 'manage_users') loadStaffData();
      else if (activeSubSubmodule === 'online_users') loadOnlineUsers();
      else if (activeSubSubmodule === 'activity_logs') loadActivityLogs();
      else if (activeSubSubmodule === 'activity_dashboard') loadActivityDashboard();
      else if (activeSubSubmodule === 'verify_staff') loadVerifiedStaff();
      else if (activeSubSubmodule === 'create_staff') loadDepartments();
      else if (activeSubSubmodule === 'departments') loadDepartments();
    } else if (activeSubmodule === 'queue') {
      loadQueueStats();
    } else if (activeSubmodule === 'stats') {
      loadStatisticalInsights();
    }
  }, [activeSubmodule, activeSubSubmodule]);

  // Load departments initially so they're immediately ready
  useEffect(() => {
    loadDepartments();
  }, []);

  // Action Handlers
  const openActionModal = (action, user) => {
    let title = '';
    if (action === 'reset_pin') title = `Reset Security PIN for ${user.fullname || user.username}?`;
    else if (action === 'reset_password') title = `Reset Password for ${user.fullname || user.username}?`;
    else if (action === 'toggle_status') {
      title = user.active === '1'
        ? `Deactivate Account for ${user.fullname || user.username}?`
        : `Activate Account for ${user.fullname || user.username}?`;
    }

    setActionModal({
      open: true,
      action,
      targetUser: user,
      title,
      pinCode: '',
      showPin: false,
    });
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!actionModal.pinCode) {
      showAlert('Please enter your Admin PIN to authorize this change.', 'danger');
      return;
    }

    try {
      const res = await api.staffAction(
        actionModal.action,
        actionModal.targetUser.id,
        actionModal.pinCode
      );
      showAlert(res.detail || 'Action completed successfully.', 'success');
      setActionModal({ open: false, action: '', targetUser: null, title: '', pinCode: '', showPin: false });
      loadStaffData();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Action authorization failed. Check Admin PIN.';
      showAlert(msg, 'danger');
    }
  };

  const handleForceLogout = async (userId, fullname) => {
    if (!window.confirm(`Are you sure you want to forcefully log out ${fullname}?`)) return;
    try {
      await api.forceLogout(userId);
      showAlert(`User ${fullname} has been forcefully logged out.`, 'success');
      loadOnlineUsers();
    } catch (err) {
      showAlert('Failed to force logout user.', 'danger');
    }
  };

  const handleAddVerifiedStaff = async (e) => {
    e.preventDefault();
    if (!newStaffId.trim()) return;
    try {
      await api.addVerifiedStaff(newStaffId.trim());
      showAlert(`Staff ID "${newStaffId.trim()}" authenticated successfully!`, 'success');
      setNewStaffId('');
      loadVerifiedStaff();
    } catch (err) {
      showAlert(err.response?.data?.detail || 'Failed to authenticate Staff ID.', 'danger');
    }
  };

  const handleDeleteVerifiedStaff = async (id, staffId) => {
    if (!window.confirm(`Revoke authentication for Staff ID "${staffId}"?`)) return;
    try {
      await api.deleteVerifiedStaff(id);
      showAlert(`Staff ID "${staffId}" removed.`, 'success');
      loadVerifiedStaff();
    } catch (err) {
      showAlert('Failed to remove Staff ID.', 'danger');
    }
  };

  // Staff list filtering
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      (s.fullname && s.fullname.toLowerCase().includes(userSearch.toLowerCase())) ||
      (s.username && s.username.toLowerCase().includes(userSearch.toLowerCase())) ||
      (s.department_name && s.department_name.toLowerCase().includes(userSearch.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'ACTIVE') return s.active === '1';
    if (statusFilter === 'INACTIVE') return s.active === '0';
    return true;
  });

  return (
    <div className="container-fluid py-4">
      {/* Alert Banner */}
      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show shadow-sm mb-4`} role="alert">
          <i className={`fas fa-${alert.type === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2`}></i>
          {alert.message}
          <button type="button" className="close" onClick={() => setAlert(null)}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {/* Top Header & Breadcrumb */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800 font-weight-bold">
            <i className="fas fa-tasks text-primary mr-2"></i>
            Task Manager
          </h1>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb bg-transparent p-0 mb-0 small text-muted">
              <li className="breadcrumb-item">Administration</li>
              <li className="breadcrumb-item active text-capitalize">
                {activeSubmodule === 'staff'
                  ? 'Staff Management'
                  : activeSubmodule === 'queue'
                  ? 'Queue Monitor'
                  : 'Statistical Insights'}
              </li>
              <li className="breadcrumb-item active font-weight-bold text-primary text-capitalize">
                {activeSubSubmodule.replace('_', ' ')}
              </li>
            </ol>
          </nav>
        </div>

        {/* Global Refresh Button */}
        <div>
          <button
            className="btn btn-sm btn-outline-primary shadow-sm"
            onClick={() => {
              if (activeSubmodule === 'staff') {
                if (activeSubSubmodule === 'manage_users') loadStaffData();
                else if (activeSubSubmodule === 'online_users') loadOnlineUsers();
                else if (activeSubSubmodule === 'activity_logs') loadActivityLogs();
                else if (activeSubSubmodule === 'activity_dashboard') loadActivityDashboard();
                else if (activeSubSubmodule === 'verify_staff') loadVerifiedStaff();
              } else if (activeSubmodule === 'queue') loadQueueStats();
              else if (activeSubmodule === 'stats') loadStatisticalInsights();
            }}
          >
            <i className={`fas fa-sync-alt mr-1 ${loading ? 'fa-spin' : ''}`}></i> Refresh Data
          </button>
        </div>
      </div>

      {/* Primary Submodule Navigation Pills */}
      <div className="card shadow mb-4">
        <div className="card-header py-2 bg-white">
          <ul className="nav nav-pills nav-fill card-header-pills font-weight-bold">
            <li className="nav-item">
              <a
                className={`nav-link cursor-pointer ${
                  activeSubmodule === 'staff' ? 'active bg-primary text-white shadow-sm' : 'text-gray-700'
                }`}
                onClick={() => {
                  setActiveSubmodule('staff');
                  setActiveSubSubmodule('manage_users');
                }}
              >
                <i className="fas fa-users-cog mr-2"></i>
                Staff Management
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link cursor-pointer ${
                  activeSubmodule === 'queue' ? 'active bg-info text-white shadow-sm' : 'text-gray-700'
                }`}
                onClick={() => {
                  setActiveSubmodule('queue');
                  setActiveSubSubmodule('waiting_list');
                }}
              >
                <i className="fas fa-user-clock mr-2"></i>
                Queue Monitor
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link cursor-pointer ${
                  activeSubmodule === 'stats' ? 'active bg-success text-white shadow-sm' : 'text-gray-700'
                }`}
                onClick={() => {
                  setActiveSubmodule('stats');
                  setActiveSubSubmodule('diagnosis');
                }}
              >
                <i className="fas fa-chart-line mr-2"></i>
                Statistical Insights
              </a>
            </li>
          </ul>
        </div>

        {/* Secondary Sub-submodule Sub-Navbar */}
        <div className="card-body bg-light border-bottom py-2">
          {activeSubmodule === 'staff' && (
            <div className="d-flex flex-wrap gap-2">
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'manage_users' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('manage_users')}
              >
                <i className="fas fa-user-friends mr-1"></i> Manage Users
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'online_users' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('online_users')}
              >
                <i className="fas fa-globe mr-1"></i> View Online Users
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'activity_logs' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('activity_logs')}
              >
                <i className="fas fa-history mr-1"></i> User Activity Logs
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'activity_dashboard' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('activity_dashboard')}
              >
                <i className="fas fa-tachometer-alt mr-1"></i> Activities Dashboard
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'verify_staff' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('verify_staff')}
              >
                <i className="fas fa-id-card mr-1"></i> Authenticate Users ID
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'create_staff' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('create_staff')}
              >
                <i className="fas fa-user-plus mr-1"></i> Create Staff
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'departments' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('departments')}
              >
                <i className="fas fa-sitemap mr-1"></i> User Categories (Departments)
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'assign_modules' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('assign_modules')}
              >
                <i className="fas fa-cubes mr-1"></i> Assign Modules
              </button>
            </div>
          )}

          {activeSubmodule === 'queue' && (
            <div className="d-flex flex-wrap gap-2">
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'waiting_list' ? 'btn-info text-white font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('waiting_list')}
              >
                <i className="fas fa-hourglass-half mr-1"></i> Waiting List
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'completed_list' ? 'btn-info text-white font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('completed_list')}
              >
                <i className="fas fa-check-double mr-1"></i> Completed List
              </button>
            </div>
          )}

          {activeSubmodule === 'stats' && (
            <div className="d-flex flex-wrap gap-2">
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'diagnosis' ? 'btn-success text-white font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('diagnosis')}
              >
                <i className="fas fa-stethoscope mr-1"></i> Medical Diagnosis
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'financial' ? 'btn-success text-white font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('financial')}
              >
                <i className="fas fa-file-invoice-dollar mr-1"></i> Financial Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUBMODULE 1: STAFF MANAGEMENT                           */}
      {/* ======================================================== */}

      {/* 1.1 MANAGE USERS */}
      {activeSubmodule === 'staff' && activeSubSubmodule === 'manage_users' && (
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
            <h6 className="m-0 font-weight-bold text-primary">
              <i className="fas fa-users mr-1"></i> Staff Directory & Account Management ({filteredStaff.length})
            </h6>
            <div className="d-flex gap-2">
              <select
                className="form-control form-control-sm mr-2"
                style={{ width: '130px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Deactivated</option>
              </select>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search staff..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ width: '200px' }}
              />
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th>#</th>
                    <th>Staff User</th>
                    <th>Department</th>
                    <th>Contact</th>
                    <th>Security PIN</th>
                    <th>Status</th>
                    <th className="text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        No staff members found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((u, idx) => (
                      <tr key={u.id}>
                        <td className="font-weight-bold text-muted">{idx + 1}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div
                              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center font-weight-bold mr-2"
                              style={{ width: '36px', height: '36px', minWidth: '36px', fontSize: '13px' }}
                            >
                              {(u.fullname || u.username).substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-weight-bold text-dark">{u.fullname || u.username}</div>
                              <small className="text-muted">@{u.username}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-light border text-dark font-weight-normal px-2 py-1">
                            {u.department_name}
                          </span>
                        </td>
                        <td>
                          <div className="small">
                            <div><i className="fas fa-phone-alt text-muted mr-1"></i>{u.phone_number || 'N/A'}</div>
                            <div><i className="fas fa-envelope text-muted mr-1"></i>{u.email || 'N/A'}</div>
                          </div>
                        </td>
                        <td>
                          {u.has_pin ? (
                            <span className="badge badge-success px-2 py-1">
                              <i className="fas fa-check mr-1"></i> Configured
                            </span>
                          ) : (
                            <span className="badge badge-warning text-dark px-2 py-1">
                              <i className="fas fa-exclamation-triangle mr-1"></i> Not Set
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge badge-${
                              u.active === '1' ? 'success' : 'danger'
                            } px-2 py-1`}
                          >
                            {u.active === '1' ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="btn-group btn-group-sm">
                            {/* Toggle Status */}
                            <button
                              className={`btn ${u.active === '1' ? 'btn-outline-danger' : 'btn-outline-success'}`}
                              title={u.active === '1' ? 'Deactivate Account' : 'Activate Account'}
                              onClick={() => openActionModal('toggle_status', u)}
                            >
                              <i className={`fas fa-${u.active === '1' ? 'user-slash' : 'user-check'} mr-1`}></i>
                              {u.active === '1' ? 'Deactivate' : 'Activate'}
                            </button>
                            {/* Reset PIN */}
                            <button
                              className="btn btn-outline-info"
                              title="Reset Security PIN to default (1234)"
                              onClick={() => openActionModal('reset_pin', u)}
                            >
                              <i className="fas fa-key mr-1"></i> Reset PIN
                            </button>
                            {/* Reset Password */}
                            <button
                              className="btn btn-outline-warning text-dark"
                              title="Reset Password to password123"
                              onClick={() => openActionModal('reset_password', u)}
                            >
                              <i className="fas fa-lock mr-1"></i> Reset Pwd
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1.2 VIEW ONLINE USERS */}
      {activeSubmodule === 'staff' && activeSubSubmodule === 'online_users' && (
        <div>
          {/* Online Stats Summary Cards */}
          <div className="row mb-4">
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-success shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                        Active Online Now
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{onlineUsers.length}</div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-signal fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Desktop Sessions
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {onlineUsers.filter((u) => (u.device || '').toLowerCase().includes('desktop')).length || onlineUsers.length}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-desktop fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-info shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                        Session Timeout
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">15 Minutes</div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-stopwatch fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-warning shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                        Security Status
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">Protected</div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-shield-alt fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow mb-4">
            <div className="card-header py-3 d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-circle text-success mr-2"></i>
                Active Connected Sessions
              </h6>
              <span className="badge badge-success px-3 py-1 font-weight-normal">
                Live Polling (Every 15 min window)
              </span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="thead-light">
                    <tr>
                      <th>User</th>
                      <th>Department</th>
                      <th>IP Address</th>
                      <th>Client / OS</th>
                      <th>Device</th>
                      <th>Last Heartbeat</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onlineUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">
                          No users actively logged in currently.
                        </td>
                      </tr>
                    ) : (
                      onlineUsers.map((u) => (
                        <tr key={u.id || u.user_id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div
                                className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center font-weight-bold mr-2"
                                style={{ width: '34px', height: '34px', fontSize: '13px' }}
                              >
                                {(u.fullname || u.username).substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-weight-bold text-dark">{u.fullname || u.username}</div>
                                <small className="text-muted">@{u.username}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-light border text-dark">{u.department}</span>
                          </td>
                          <td>
                            <code className="text-dark bg-light px-2 py-1 rounded">{u.ip_address}</code>
                          </td>
                          <td>
                            <div className="small font-weight-bold text-dark">{u.browser}</div>
                            <div className="small text-muted">{u.os}</div>
                          </td>
                          <td>
                            <span className="badge badge-secondary">{u.device || 'Desktop'}</span>
                          </td>
                          <td>
                            <span className="text-success font-weight-bold small">
                              <i className="fas fa-dot-circle mr-1"></i>
                              {u.last_activity ? new Date(u.last_activity).toLocaleTimeString() : 'Active'}
                            </span>
                          </td>
                          <td className="text-right">
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleForceLogout(u.user_id, u.fullname || u.username)}
                            >
                              <i className="fas fa-sign-out-alt mr-1"></i> Force Logout
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1.3 USER ACTIVITY LOGS */}
      {activeSubmodule === 'staff' && activeSubSubmodule === 'activity_logs' && (
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-primary">
              <i className="fas fa-clipboard-list mr-1"></i> Audit Trail & User Activity Logs ({activityLogs.length})
            </h6>
            <button className="btn btn-sm btn-outline-primary" onClick={loadActivityLogs}>
              <i className="fas fa-sync-alt mr-1"></i> Refresh Logs
            </button>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Activity Type</th>
                    <th>Description</th>
                    <th>IP Address</th>
                    <th>Client Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted">
                        No activity records found.
                      </td>
                    </tr>
                  ) : (
                    activityLogs.map((log) => {
                      let typeBadge = 'badge-secondary';
                      if (log.activity_type?.includes('LOGIN')) typeBadge = 'badge-success';
                      else if (log.activity_type?.includes('CREATE')) typeBadge = 'badge-primary';
                      else if (log.activity_type?.includes('RESET')) typeBadge = 'badge-warning text-dark';
                      else if (log.activity_type?.includes('DEACTIVATE')) typeBadge = 'badge-danger';
                      else if (log.activity_type?.includes('INVOICE')) typeBadge = 'badge-info';

                      return (
                        <tr key={log.id}>
                          <td className="small text-muted font-weight-bold">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td>
                            <div className="font-weight-bold text-dark">{log.fullname || log.username}</div>
                            <small className="text-muted">@{log.username}</small>
                          </td>
                          <td>
                            <span className={`badge ${typeBadge} px-2 py-1`}>{log.activity_type}</span>
                          </td>
                          <td className="small text-dark font-weight-500">{log.description || '-'}</td>
                          <td>
                            <code className="small text-dark">{log.ip_address}</code>
                          </td>
                          <td className="small text-muted">{log.browser || log.os}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1.4 ACTIVITIES DASHBOARD */}
      {activeSubmodule === 'staff' && activeSubSubmodule === 'activity_dashboard' && (
        <div>
          {/* Top Metric Cards */}
          <div className="row mb-4">
            <div className="col-xl-4 col-md-6 mb-4">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Total System Events Logged
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {activityDashboard?.total_logs || 0}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-database fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-4 col-md-6 mb-4">
              <div className="card border-left-success shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                        Today's Activities
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {activityDashboard?.today_logs || 0}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-calendar-check fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-4 col-md-6 mb-4">
              <div className="card border-left-info shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                        Monitored Staff Pool
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{staffList.length || 3} Users</div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-user-shield fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Chart / Table */}
          <div className="row">
            <div className="col-lg-6 mb-4">
              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <i className="fas fa-chart-pie mr-1"></i> Activity Types Distribution
                  </h6>
                </div>
                <div className="card-body">
                  {activityDashboard?.type_breakdown?.length === 0 ? (
                    <div className="text-muted text-center py-4">No activity breakdown data yet.</div>
                  ) : (
                    activityDashboard?.type_breakdown?.map((item, idx) => {
                      const total = activityDashboard.total_logs || 1;
                      const pct = Math.min(100, Math.round((item.count / total) * 100));
                      const colors = ['bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger'];
                      const colorClass = colors[idx % colors.length];

                      return (
                        <div key={item.activity_type} className="mb-3">
                          <div className="d-flex justify-content-between mb-1 small font-weight-bold">
                            <span>{item.activity_type}</span>
                            <span>{item.count} events ({pct}%)</span>
                          </div>
                          <div className="progress progress-sm">
                            <div
                              className={`progress-bar ${colorClass}`}
                              role="progressbar"
                              style={{ width: `${pct}%` }}
                              aria-valuenow={pct}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-6 mb-4">
              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <i className="fas fa-user-check mr-1"></i> System Security Recommendations
                  </h6>
                </div>
                <div className="card-body">
                  <div className="list-group list-group-flush">
                    <div className="list-group-item d-flex align-items-center px-0">
                      <div className="badge badge-success mr-3 p-2">
                        <i className="fas fa-lock"></i>
                      </div>
                      <div>
                        <div className="font-weight-bold text-dark">Default PIN Resets</div>
                        <small className="text-muted">Staff with reset PINs must update their PIN upon next login.</small>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center px-0">
                      <div className="badge badge-info mr-3 p-2">
                        <i className="fas fa-clock"></i>
                      </div>
                      <div>
                        <div className="font-weight-bold text-dark">Automatic Session Inactivity Timeout</div>
                        <small className="text-muted">Sessions are automatically terminated after 15 minutes of inactivity.</small>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center px-0">
                      <div className="badge badge-warning mr-3 p-2">
                        <i className="fas fa-id-badge"></i>
                      </div>
                      <div>
                        <div className="font-weight-bold text-dark">Staff ID Authentication</div>
                        <small className="text-muted">Self-registration requires a pre-authenticated Hospital Staff ID.</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1.5 AUTHENTICATE USERS ID */}
      {activeSubmodule === 'staff' && activeSubSubmodule === 'verify_staff' && (
        <div className="row">
          <div className="col-lg-4 mb-4">
            <div className="card shadow">
              <div className="card-header py-3 bg-white">
                <h6 className="m-0 font-weight-bold text-primary">
                  <i className="fas fa-plus-circle mr-1"></i> Authenticate New Staff ID
                </h6>
              </div>
              <div className="card-body">
                <p className="small text-muted mb-3">
                  Authorized Staff IDs allow newly recruited hospital staff to sign up and establish their account credentials on the portal.
                </p>
                <form onSubmit={handleAddVerifiedStaff}>
                  <div className="form-group">
                    <label className="font-weight-bold small text-dark">Staff ID / Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. DOC-01 or 1638"
                      value={newStaffId}
                      onChange={(e) => setNewStaffId(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block font-weight-bold">
                    <i className="fas fa-check mr-1"></i> Authorize Staff ID
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-8 mb-4">
            <div className="card shadow">
              <div className="card-header py-3 d-flex justify-content-between align-items-center bg-white">
                <h6 className="m-0 font-weight-bold text-primary">
                  <i className="fas fa-list-check mr-1"></i> Authorized Staff IDs ({verifiedStaff.length})
                </h6>
                <button className="btn btn-sm btn-outline-primary" onClick={loadVerifiedStaff}>
                  <i className="fas fa-sync-alt mr-1"></i> Refresh
                </button>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover table-striped mb-0 align-middle">
                    <thead className="thead-light">
                      <tr>
                        <th>#</th>
                        <th>Authorized Staff ID</th>
                        <th>Registration Status</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedStaff.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-4 text-muted">
                            No Staff IDs registered yet.
                          </td>
                        </tr>
                      ) : (
                        verifiedStaff.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="text-muted font-weight-bold">{idx + 1}</td>
                            <td>
                              <span className="badge badge-primary px-3 py-2 font-weight-bold" style={{ fontSize: '13px' }}>
                                {item.staff_id}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-success px-2 py-1">
                                <i className="fas fa-check mr-1"></i> Eligible for Registration
                              </span>
                            </td>
                            <td className="text-right">
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteVerifiedStaff(item.id, item.staff_id)}
                              >
                                <i className="fas fa-trash-alt mr-1"></i> Revoke
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1.6 CREATE STAFF */}
      {activeSubmodule === 'staff' && activeSubSubmodule === 'create_staff' && (
        <div>
          {/* Header Bar */}
          <div className="d-sm-flex align-items-center justify-content-between mb-4">
            <div>
              <h1 className="h4 mb-1 text-gray-800 font-weight-bold">
                <i className="fas fa-user-plus text-primary mr-2"></i>
                Create Hospital Staff Account
              </h1>
              <p className="text-muted small mb-0">
                Register a new staff member with credentials, department assignment, and security privileges
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary shadow-sm font-weight-bold mt-2 mt-sm-0"
              onClick={() => setActiveSubSubmodule('manage_users')}
            >
              <i className="fas fa-arrow-left mr-1"></i> Back to Staff Directory
            </button>
          </div>

          <form onSubmit={handleCreateStaff}>
            <div className="row">
              {/* Left Column: Staff Demographics & Contact */}
              <div className="col-lg-6 mb-4">
                <div className="card shadow h-100">
                  <div className="card-header py-3 bg-white border-bottom d-flex align-items-center justify-content-between">
                    <h6 className="m-0 font-weight-bold text-primary">
                      <i className="fas fa-id-card mr-2"></i>
                      Staff Demographics &amp; Contact Details
                    </h6>
                    <span className="badge badge-light border text-muted">Step 1</span>
                  </div>

                  <div className="card-body">
                    {/* Staff ID */}
                    <div className="form-group mb-3">
                      <label className="font-weight-bold small text-gray-700">
                        Staff ID / Login Username <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text bg-light border-right-0 text-muted">
                            <i className="fas fa-hashtag"></i>
                          </span>
                        </div>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. DOC-01 or 1408 or ISL/NUR/24"
                          value={newStaffForm.username}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, username: e.target.value })}
                          required
                        />
                      </div>
                      <small className="form-text text-muted">
                        Unique employee identifier used to sign in to the portal.
                      </small>
                    </div>

                    {/* Full Name */}
                    <div className="form-group mb-3">
                      <label className="font-weight-bold small text-gray-700">
                        Full Name <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text bg-light border-right-0 text-muted">
                            <i className="fas fa-user"></i>
                          </span>
                        </div>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Dr. Adebayo Uche Ciroma"
                          value={newStaffForm.fullname}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, fullname: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div className="form-group mb-3">
                      <label className="font-weight-bold small text-gray-700">Email Address</label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text bg-light border-right-0 text-muted">
                            <i className="fas fa-envelope"></i>
                          </span>
                        </div>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="e.g. staff.member@isaluhospitals.com"
                          value={newStaffForm.email}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="form-group mb-3">
                      <label className="font-weight-bold small text-gray-700">Phone Number</label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text bg-light border-right-0 text-muted">
                            <i className="fas fa-phone"></i>
                          </span>
                        </div>
                        <input
                          type="tel"
                          className="form-control"
                          placeholder="e.g. 08012345678"
                          value={newStaffForm.phone_number}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, phone_number: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Gender & DOB */}
                    <div className="form-row mb-3">
                      <div className="col-md-6 form-group mb-0">
                        <label className="font-weight-bold small text-gray-700">Gender</label>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text bg-light border-right-0 text-muted">
                              <i className="fas fa-venus-mars"></i>
                            </span>
                          </div>
                          <select
                            className="form-control"
                            value={newStaffForm.gender}
                            onChange={(e) => setNewStaffForm({ ...newStaffForm, gender: e.target.value })}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                      </div>

                      <div className="col-md-6 form-group mb-0">
                        <label className="font-weight-bold small text-gray-700">Date of Birth</label>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text bg-light border-right-0 text-muted">
                              <i className="fas fa-calendar-alt"></i>
                            </span>
                          </div>
                          <input
                            type="date"
                            className="form-control"
                            value={newStaffForm.dob}
                            onChange={(e) => setNewStaffForm({ ...newStaffForm, dob: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Home Address */}
                    <div className="form-group mb-0">
                      <label className="font-weight-bold small text-gray-700">Residential Address</label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text bg-light border-right-0 text-muted">
                            <i className="fas fa-map-marker-alt"></i>
                          </span>
                        </div>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter residential address"
                          value={newStaffForm.address}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Department Assignment & Credentials */}
              <div className="col-lg-6 mb-4">
                <div className="card shadow h-100 d-flex flex-column">
                  <div className="card-header py-3 bg-white border-bottom d-flex align-items-center justify-content-between">
                    <h6 className="m-0 font-weight-bold text-primary">
                      <i className="fas fa-shield-alt mr-2"></i>
                      Department &amp; Security Credentials
                    </h6>
                    <span className="badge badge-light border text-muted">Step 2</span>
                  </div>

                  <div className="card-body d-flex flex-column justify-content-between">
                    <div>
                      {/* Department Assignment */}
                      <div className="form-group mb-3">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <label className="font-weight-bold small text-gray-700 mb-0">
                            Hospital Department Assignment <span className="text-danger">*</span>
                          </label>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-primary font-weight-bold small"
                            onClick={() => setActiveSubSubmodule('departments')}
                            title="Open User Categories / Department configuration"
                          >
                            + Manage Categories
                          </button>
                        </div>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text bg-light border-right-0 text-muted">
                              <i className="fas fa-building"></i>
                            </span>
                          </div>
                          <select
                            className="form-control font-weight-bold text-gray-800"
                            value={newStaffForm.department_id}
                            onChange={(e) => setNewStaffForm({ ...newStaffForm, department_id: e.target.value })}
                            required
                          >
                            <option value="">-- Choose Assigned Department --</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.department}
                              </option>
                            ))}
                          </select>
                        </div>
                        <small className="form-text text-muted">
                          Determines the default dashboard and permission views for this user.
                        </small>
                      </div>

                      {/* Password */}
                      <div className="form-group mb-3">
                        <label className="font-weight-bold small text-gray-700">Initial Password</label>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text bg-light border-right-0 text-muted">
                              <i className="fas fa-lock"></i>
                            </span>
                          </div>
                          <input
                            type="password"
                            className="form-control"
                            placeholder="Defaults to password123 if left blank"
                            value={newStaffForm.password}
                            onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                          />
                        </div>
                        <small className="form-text text-muted">
                          Default is <code>password123</code>. Staff can change it after login.
                        </small>
                      </div>

                      {/* Confirm Password */}
                      <div className="form-group mb-3">
                        <label className="font-weight-bold small text-gray-700">Confirm Initial Password</label>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text bg-light border-right-0 text-muted">
                              <i className="fas fa-check-double"></i>
                            </span>
                          </div>
                          <input
                            type="password"
                            className="form-control"
                            placeholder="Re-enter password to confirm"
                            value={newStaffForm.confirm_password}
                            onChange={(e) => setNewStaffForm({ ...newStaffForm, confirm_password: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Security PIN */}
                      <div className="form-group mb-3">
                        <label className="font-weight-bold small text-gray-700">
                          Security PIN (4 Digits)
                        </label>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text bg-light border-right-0 text-muted">
                              <i className="fas fa-key"></i>
                            </span>
                          </div>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="1234"
                            value={newStaffForm.pin}
                            onChange={(e) => setNewStaffForm({ ...newStaffForm, pin: e.target.value })}
                          />
                        </div>
                        <small className="form-text text-muted">
                          Used for clinical authorizations and cashier overrides (default: <code>1234</code>).
                        </small>
                      </div>

                      {/* Information Callout */}
                      <div className="alert alert-info py-2 px-3 small border-0 mt-3 d-flex align-items-center">
                        <i className="fas fa-info-circle fa-lg mr-2 text-info"></i>
                        <span>
                          Creating this account will automatically register and authorize the Staff ID in the hospital authentication database.
                        </span>
                      </div>
                    </div>

                    {/* Action buttons inside the right card */}
                    <div className="border-top pt-3 mt-4 d-flex align-items-center justify-content-end">
                      <button
                        type="button"
                        className="btn btn-light border mr-2 font-weight-bold"
                        onClick={() =>
                          setNewStaffForm({
                            username: '',
                            fullname: '',
                            email: '',
                            phone_number: '',
                            gender: 'Male',
                            dob: '',
                            address: '',
                            department_id: '',
                            password: '',
                            confirm_password: '',
                            pin: '1234',
                          })
                        }
                      >
                        <i className="fas fa-undo mr-1"></i> Reset Fields
                      </button>

                      <button
                        type="submit"
                        className="btn btn-primary font-weight-bold px-4 shadow-sm"
                        disabled={creatingStaff}
                      >
                        {creatingStaff ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-1"></i> Creating Account...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-user-plus mr-1"></i> Register Staff Member
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 1.7 USER CATEGORIES (DEPARTMENTS) */}
      {activeSubmodule === 'staff' && activeSubSubmodule === 'departments' && (
        <div>
          <div className="d-sm-flex align-items-center justify-content-between mb-4">
            <div>
              <h1 className="h4 mb-1 text-gray-800 font-weight-bold">
                <i className="fas fa-sitemap text-primary mr-2"></i>
                User Categories (Hospital Departments)
              </h1>
              <p className="text-muted small mb-0">
                Configure hospital departments and user classifications for staff assignment and system routing
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary shadow-sm font-weight-bold mt-2 mt-sm-0"
              onClick={() => setActiveSubSubmodule('create_staff')}
            >
              <i className="fas fa-user-plus mr-1"></i> Register Staff Member
            </button>
          </div>

          <div className="row">
            {/* Form Column: Create New User Category */}
            <div className="col-lg-4 mb-4">
              <div className="card shadow mb-4">
                <div className="card-header py-3 bg-white border-bottom">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <i className="fas fa-plus-circle mr-1"></i> Add New Category
                  </h6>
                </div>
                <div className="card-body">
                  <p className="small text-muted mb-3">
                    Each category corresponds to a hospital department (e.g. Front Desk, Nursing, Clinical, Pharmacy, Laboratory). Newly registered staff can be assigned to these categories.
                  </p>

                  <form onSubmit={handleCreateDepartment}>
                    <div className="form-group mb-3">
                      <label className="font-weight-bold small text-gray-700">
                        Category / Department Name <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text bg-light text-muted">
                            <i className="fas fa-building"></i>
                          </span>
                        </div>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Dental Unit, Intensive Care"
                          value={newDepartmentName}
                          onChange={(e) => setNewDepartmentName(e.target.value)}
                          required
                        />
                      </div>
                      <small className="form-text text-muted">
                        Must be a unique department name in the hospital.
                      </small>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-block font-weight-bold py-2 shadow-sm"
                      disabled={savingDepartment}
                    >
                      {savingDepartment ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-1"></i> Creating Category...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check-circle mr-1"></i> Create User Category
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* List Column: Existing User Categories */}
            <div className="col-lg-8 mb-4">
              <div className="card shadow mb-4">
                <div className="card-header py-3 bg-white border-bottom d-flex align-items-center justify-content-between">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <i className="fas fa-list-ul mr-1"></i>
                    Configured User Categories ({departments.length})
                  </h6>
                  <button
                    className="btn btn-sm btn-outline-primary font-weight-bold"
                    onClick={loadDepartments}
                    title="Refresh departments list"
                  >
                    <i className="fas fa-sync-alt mr-1"></i> Refresh
                  </button>
                </div>

                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover table-striped mb-0 align-middle">
                      <thead className="thead-light">
                        <tr>
                          <th style={{ width: '60px' }}>#</th>
                          <th>Category (Department) Name</th>
                          <th>Assigned Staff</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-center py-4 text-muted">
                              <i className="fas fa-folder-open fa-2x text-gray-300 d-block mb-2"></i>
                              No user categories configured yet. Add your first department using the form on the left.
                            </td>
                          </tr>
                        ) : (
                          departments.map((dept, idx) => (
                            <tr key={dept.id || idx}>
                              <td className="text-muted small font-weight-bold">{idx + 1}</td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="avatar-initials bg-primary text-white mr-2" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                                    <i className="fas fa-hospital"></i>
                                  </div>
                                  <span className="font-weight-bold text-gray-900">
                                    {dept.department}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="badge badge-light border text-dark px-2 py-1 font-weight-bold mr-1">
                                  <i className="fas fa-users text-primary mr-1"></i>
                                  {dept.staff_count ?? 0} staff
                                </span>
                                <span className={`badge ${dept.modules && dept.modules.length > 0 ? 'badge-info' : 'badge-secondary'} px-2 py-1 font-weight-bold`}>
                                  <i className="fas fa-cubes mr-1"></i>
                                  {dept.modules?.length || 0} module{dept.modules?.length === 1 ? '' : 's'}
                                </span>
                              </td>
                              <td className="text-right">
                                <button
                                  className="btn btn-sm btn-outline-primary py-1 px-2 mr-2"
                                  onClick={() => {
                                    handleSelectDeptForModules(dept.id);
                                    setActiveSubSubmodule('assign_modules');
                                  }}
                                  title={`Configure allowed modules for ${dept.department}`}
                                >
                                  <i className="fas fa-cubes mr-1"></i> Assign Modules
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger py-1 px-2"
                                  onClick={() => handleDeleteDepartment(dept)}
                                  title={`Delete department ${dept.department}`}
                                >
                                  <i className="fas fa-trash-alt mr-1"></i> Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1.8 ASSIGN MODULES TO DEPARTMENT */}
      {activeSubmodule === 'staff' && activeSubSubmodule === 'assign_modules' && (
        <div>
          {/* Header */}
          <div className="d-sm-flex align-items-center justify-content-between mb-4">
            <div>
              <h1 className="h4 mb-1 text-gray-800 font-weight-bold">
                <i className="fas fa-cubes text-primary mr-2"></i>
                Department Module Access &amp; RBAC Control
              </h1>
              <p className="text-muted small mb-0">
                Assign modules to hospital departments. Staff members belonging to a department will only see and access the modules granted below.
              </p>
            </div>
            <div className="mt-2 mt-sm-0">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary font-weight-bold mr-2 shadow-sm"
                onClick={() => setActiveSubSubmodule('departments')}
              >
                <i className="fas fa-sitemap mr-1"></i> Categories Listing
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary font-weight-bold shadow-sm"
                onClick={handleSaveDepartmentModules}
                disabled={savingModules || !selectedDeptIdForModules}
              >
                {savingModules ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-1"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-1"></i> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Department Selector & Quick Actions Card */}
          <div className="card shadow mb-4 border-left-primary">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-lg-5 mb-3 mb-lg-0">
                  <label className="font-weight-bold text-gray-800 small mb-1">
                    <i className="fas fa-building text-primary mr-1"></i> Select Department to Configure:
                  </label>
                  <select
                    className="custom-select custom-select-lg font-weight-bold text-dark border-primary"
                    value={selectedDeptIdForModules}
                    onChange={(e) => handleSelectDeptForModules(e.target.value)}
                  >
                    {departments.length === 0 ? (
                      <option value="">No departments available</option>
                    ) : (
                      departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.department} ({d.staff_count ?? 0} staff assigned)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="col-lg-7">
                  <div className="d-flex flex-wrap align-items-center justify-content-lg-end gap-2">
                    <div className="mr-3 text-lg-right mb-2 mb-lg-0">
                      <span className="badge badge-primary px-3 py-2 font-weight-bold mr-2" style={{ fontSize: '0.85rem' }}>
                        <i className="fas fa-check-circle mr-1"></i>
                        {selectedModulesList.length} of {AVAILABLE_MODULES.length} Modules Allowed
                      </span>
                      {selectedDeptIdForModules && (
                        <span className="badge badge-light border text-muted px-2 py-2" style={{ fontSize: '0.85rem' }}>
                          <i className="fas fa-users mr-1"></i>
                          {departments.find((d) => String(d.id) === String(selectedDeptIdForModules))?.staff_count ?? 0} Staff Impacted
                        </span>
                      )}
                    </div>
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className="btn btn-outline-success font-weight-bold"
                        onClick={handleSelectAllModules}
                        title="Grant access to all 13 hospital modules"
                      >
                        <i className="fas fa-check-double mr-1"></i> Grant All
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger font-weight-bold"
                        onClick={handleClearAllModules}
                        title="Revoke access to all modules"
                      >
                        <i className="fas fa-times-circle mr-1"></i> Clear All
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary font-weight-bold"
                        onClick={handleResetDefaultModules}
                        title="Reset to recommended standard defaults for this department"
                      >
                        <i className="fas fa-undo mr-1"></i> Standard Defaults
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Module Cards Grid */}
          <div className="row">
            {AVAILABLE_MODULES.map((mod) => {
              const isChecked = selectedModulesList.includes(mod.id);
              return (
                <div className="col-xl-4 col-md-6 mb-4" key={mod.id}>
                  <div
                    className={`card h-100 shadow-sm transition-all cursor-pointer ${
                      isChecked
                        ? 'border-left-success border-success'
                        : 'border-left-secondary text-muted'
                    }`}
                    style={{
                      transition: 'all 0.2s ease',
                      backgroundColor: isChecked ? '#f8fdf9' : '#ffffff',
                      borderWidth: isChecked ? '1.5px' : '1px',
                    }}
                    onClick={() => handleToggleModule(mod.id)}
                  >
                    <div className="card-body d-flex flex-column justify-content-between p-3">
                      <div>
                        {/* Header: Icon, Name & Checkbox */}
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center mr-2 text-white shadow-sm"
                              style={{
                                width: '38px',
                                height: '38px',
                                backgroundColor: isChecked ? mod.color : '#6c757d',
                                fontSize: '15px',
                              }}
                            >
                              <i className={`fas ${mod.icon}`}></i>
                            </div>
                            <div>
                              <h6
                                className={`font-weight-bold mb-0 ${
                                  isChecked ? 'text-dark' : 'text-muted'
                                }`}
                                style={{ fontSize: '0.95rem' }}
                              >
                                {mod.name}
                              </h6>
                              <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                                Key: <code>{mod.id}</code>
                              </small>
                            </div>
                          </div>
                          <div className="custom-control custom-switch" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="custom-control-input"
                              id={`switch-${mod.id}`}
                              checked={isChecked}
                              onChange={() => handleToggleModule(mod.id)}
                            />
                            <label className="custom-control-label cursor-pointer" htmlFor={`switch-${mod.id}`}></label>
                          </div>
                        </div>

                        {/* Description */}
                        <p
                          className="small text-muted mb-3"
                          style={{ minHeight: '38px', lineHeight: '1.35', fontSize: '0.8rem' }}
                        >
                          {mod.description}
                        </p>
                      </div>

                      {/* Footer tags */}
                      <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                        <span className="badge badge-light border text-muted" style={{ fontSize: '0.7rem' }}>
                          Primary Tab: <strong>{mod.primaryTab}</strong>
                        </span>
                        <span
                          className={`badge font-weight-bold px-2 py-1 ${
                            isChecked ? 'badge-success' : 'badge-light border text-muted'
                          }`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {isChecked ? (
                            <>
                              <i className="fas fa-check mr-1"></i> Visible to Staff
                            </>
                          ) : (
                            <>
                              <i className="fas fa-ban mr-1"></i> Restricted
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Save Bar */}
          <div className="card shadow mb-4 bg-light">
            <div className="card-body py-3 d-flex flex-column flex-sm-row align-items-center justify-content-between">
              <div className="d-flex align-items-center mb-2 mb-sm-0">
                <i className="fas fa-info-circle fa-lg text-primary mr-2"></i>
                <small className="text-muted">
                  Saving these module permissions will immediately restrict or permit access for all staff members assigned to this department across the sidebar navigation and hospital workspaces.
                </small>
              </div>
              <button
                type="button"
                className="btn btn-primary font-weight-bold px-4 shadow-sm"
                onClick={handleSaveDepartmentModules}
                disabled={savingModules || !selectedDeptIdForModules}
              >
                {savingModules ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-1"></i> Saving Changes...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-1"></i> Save Module Permissions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBMODULE 2: QUEUE MONITOR                              */}
      {/* ======================================================== */}
      {activeSubmodule === 'queue' && (
        <div>
          {/* Waiting List view */}
          {activeSubSubmodule === 'waiting_list' && (
            <div>
              <div className="row mb-4">
                <div className="col-xl-3 col-md-6 mb-4">
                  <div className="card border-left-warning shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                            Doctor Waiting Queue
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            {queueStats.waiting?.doctor_waiting || 0} Patients
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-user-md fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-md-6 mb-4">
                  <div className="card border-left-info shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                            Nurse Triage Waiting
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            {queueStats.waiting?.nurse_waiting || 0} Patients
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-user-nurse fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-md-6 mb-4">
                  <div className="card border-left-primary shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                            Laboratory Queue
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            {queueStats.waiting?.lab_waiting || 0} Pending
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-flask fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-md-6 mb-4">
                  <div className="card border-left-danger shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                            Pharmacy Dispensing
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            {queueStats.waiting?.pharmacy_waiting || 0} Orders
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-pills fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Queues Details Card */}
              <div className="card shadow mb-4">
                <div className="card-header py-3 bg-white d-flex justify-content-between align-items-center">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <i className="fas fa-stream mr-1"></i> Active Waiting Queues Real-Time Feed
                  </h6>
                  <span className="badge badge-warning text-dark px-3 py-1">Live Queue</span>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                      <thead className="thead-light">
                        <tr>
                          <th>Queue Department</th>
                          <th>Waiting Patients</th>
                          <th>Average Wait Time</th>
                          <th>Status</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <div className="font-weight-bold text-dark">
                              <i className="fas fa-user-md text-warning mr-2"></i> Doctor Consultation
                            </div>
                            <small className="text-muted">General Outpatient Department (GOPD)</small>
                          </td>
                          <td>
                            <span className="badge badge-warning text-dark px-2 py-1 font-weight-bold">
                              {queueStats.waiting?.doctor_waiting || 2} waiting
                            </span>
                          </td>
                          <td className="small text-muted font-weight-bold">~15 mins</td>
                          <td>
                            <span className="badge badge-success px-2 py-1">Active Room 1 & 2</span>
                          </td>
                          <td className="text-right">
                            <button className="btn btn-sm btn-outline-primary" onClick={loadQueueStats}>
                              <i className="fas fa-eye mr-1"></i> Inspect Queue
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <div className="font-weight-bold text-dark">
                              <i className="fas fa-user-nurse text-info mr-2"></i> Nurse Station / Vitals
                            </div>
                            <small className="text-muted">Triage and Clinical Vital Signs Assessment</small>
                          </td>
                          <td>
                            <span className="badge badge-info px-2 py-1 font-weight-bold">
                              {queueStats.waiting?.nurse_waiting || 0} waiting
                            </span>
                          </td>
                          <td className="small text-muted font-weight-bold">~5 mins</td>
                          <td>
                            <span className="badge badge-success px-2 py-1">Station Active</span>
                          </td>
                          <td className="text-right">
                            <button className="btn btn-sm btn-outline-primary" onClick={loadQueueStats}>
                              <i className="fas fa-eye mr-1"></i> Inspect Queue
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <div className="font-weight-bold text-dark">
                              <i className="fas fa-flask text-primary mr-2"></i> Diagnostic Laboratory
                            </div>
                            <small className="text-muted">Sample Collection & Processing</small>
                          </td>
                          <td>
                            <span className="badge badge-primary px-2 py-1 font-weight-bold">
                              {queueStats.waiting?.lab_waiting || 1} pending
                            </span>
                          </td>
                          <td className="small text-muted font-weight-bold">~25 mins</td>
                          <td>
                            <span className="badge badge-success px-2 py-1">Lab Open</span>
                          </td>
                          <td className="text-right">
                            <button className="btn btn-sm btn-outline-primary" onClick={loadQueueStats}>
                              <i className="fas fa-eye mr-1"></i> Inspect Queue
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Completed List view */}
          {activeSubSubmodule === 'completed_list' && (
            <div className="card shadow mb-4">
              <div className="card-header py-3 bg-white d-flex justify-content-between align-items-center">
                <h6 className="m-0 font-weight-bold text-success">
                  <i className="fas fa-check-circle mr-1"></i> Cleared & Completed Encounters Today
                </h6>
                <button className="btn btn-sm btn-outline-success" onClick={loadQueueStats}>
                  <i className="fas fa-sync-alt mr-1"></i> Refresh Completed
                </button>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0 align-middle">
                    <thead className="thead-light">
                      <tr>
                        <th>Department</th>
                        <th>Completed Encounters Today</th>
                        <th>Efficiency Metric</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <div className="font-weight-bold text-dark">
                            <i className="fas fa-user-nurse text-success mr-2"></i> Nursing Triage Complete
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-success px-2 py-1 font-weight-bold">
                            {queueStats.completed?.nurse_completed || 12} Cleared
                          </span>
                        </td>
                        <td className="small text-muted font-weight-bold">100% on-time</td>
                        <td><span className="badge badge-light border">Completed</span></td>
                      </tr>
                      <tr>
                        <td>
                          <div className="font-weight-bold text-dark">
                            <i className="fas fa-user-md text-success mr-2"></i> Doctor Consultations Complete
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-success px-2 py-1 font-weight-bold">
                            {queueStats.completed?.doctor_completed || 5} Consulted
                          </span>
                        </td>
                        <td className="small text-muted font-weight-bold">Avg 18 mins / consult</td>
                        <td><span className="badge badge-light border">Completed</span></td>
                      </tr>
                      <tr>
                        <td>
                          <div className="font-weight-bold text-dark">
                            <i className="fas fa-pills text-success mr-2"></i> Pharmacy Prescriptions Dispensed
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-success px-2 py-1 font-weight-bold">
                            {queueStats.completed?.pharmacy_dispensed || 18} Dispensed
                          </span>
                        </td>
                        <td className="small text-muted font-weight-bold">Fast-track processed</td>
                        <td><span className="badge badge-light border">Completed</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBMODULE 3: STATISTICAL INSIGHTS                       */}
      {/* ======================================================== */}
      {activeSubmodule === 'stats' && (
        <div>
          {/* 3.1 Medical Diagnosis Analytics */}
          {activeSubSubmodule === 'diagnosis' && (
            <div className="row">
              <div className="col-lg-8 mb-4">
                <div className="card shadow mb-4">
                  <div className="card-header py-3 bg-white">
                    <h6 className="m-0 font-weight-bold text-primary">
                      <i className="fas fa-stethoscope mr-1"></i> Top Diagnosed Conditions & Disease Frequencies
                    </h6>
                  </div>
                  <div className="card-body">
                    {statsData.diagnosis_analytics?.length === 0 ? (
                      <div className="text-center py-4 text-muted">No diagnosis records compiled yet.</div>
                    ) : (
                      statsData.diagnosis_analytics?.map((item, idx) => {
                        const colors = ['bg-danger', 'bg-warning', 'bg-info', 'bg-primary', 'bg-success'];
                        const colorClass = colors[idx % colors.length];

                        return (
                          <div key={item.diagnosis} className="mb-4">
                            <div className="d-flex justify-content-between mb-1">
                              <span className="font-weight-bold text-dark">{item.diagnosis}</span>
                              <span className="font-weight-bold text-muted">
                                {item.cases} cases ({item.percentage}%)
                              </span>
                            </div>
                            <div className="progress progress-sm">
                              <div
                                className={`progress-bar ${colorClass}`}
                                role="progressbar"
                                style={{ width: `${item.percentage}%` }}
                                aria-valuenow={item.percentage}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="col-lg-4 mb-4">
                <div className="card shadow mb-4">
                  <div className="card-header py-3 bg-white">
                    <h6 className="m-0 font-weight-bold text-primary">
                      <i className="fas fa-info-circle mr-1"></i> Clinical Epidemiology Summary
                    </h6>
                  </div>
                  <div className="card-body">
                    <p className="small text-muted">
                      Clinical pattern analysis shows highest clinical encounter volume centered on tropical infectious diseases (Malaria) and chronic cardiovascular hypertension management.
                    </p>
                    <div className="alert alert-warning small mb-0">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      <strong>Public Health Alert:</strong> Consistent seasonal spike observed for Plasmodium Falciparum. Preventive counselling recommended during antenatal and outpatient encounters.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3.2 Financial Data Analytics */}
          {activeSubSubmodule === 'financial' && (
            <div>
              {/* Financial KPI Cards */}
              <div className="row mb-4">
                <div className="col-xl-4 col-md-6 mb-4">
                  <div className="card border-left-success shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                            Total Processed Revenue
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            ₦{(statsData.financial_analytics?.total_revenue || 450000).toLocaleString()}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-coins fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xl-4 col-md-6 mb-4">
                  <div className="card border-left-primary shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                            Primary Payment Method
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">POS Terminal (63%)</div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-credit-card fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xl-4 col-md-6 mb-4">
                  <div className="card border-left-info shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                            Audited Receipts
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">42 Transactions</div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-receipt fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdown Tables */}
              <div className="row">
                <div className="col-lg-6 mb-4">
                  <div className="card shadow mb-4">
                    <div className="card-header py-3 bg-white">
                      <h6 className="m-0 font-weight-bold text-primary">
                        <i className="fas fa-wallet mr-1"></i> Revenue by Payment Method
                      </h6>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                          <thead className="thead-light">
                            <tr>
                              <th>Method</th>
                              <th>Transactions</th>
                              <th className="text-right">Total Collected</th>
                            </tr>
                          </thead>
                          <tbody>
                            {statsData.financial_analytics?.payment_methods?.map((pm) => (
                              <tr key={pm.payment_type}>
                                <td className="font-weight-bold text-dark">
                                  <i className="fas fa-money-check-alt text-muted mr-2"></i>
                                  {pm.payment_type}
                                </td>
                                <td>{pm.count} txns</td>
                                <td className="text-right font-weight-bold text-success">
                                  ₦{(pm.total || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6 mb-4">
                  <div className="card shadow mb-4">
                    <div className="card-header py-3 bg-white">
                      <h6 className="m-0 font-weight-bold text-primary">
                        <i className="fas fa-hospital mr-1"></i> Department Revenue Contributions
                      </h6>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                          <thead className="thead-light">
                            <tr>
                              <th>Department</th>
                              <th className="text-right">Revenue Contributed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {statsData.financial_analytics?.department_revenue?.map((dr) => (
                              <tr key={dr.department}>
                                <td className="font-weight-bold text-dark">
                                  <i className="fas fa-clinic-medical text-primary mr-2"></i>
                                  {dr.department}
                                </td>
                                <td className="text-right font-weight-bold text-primary">
                                  ₦{(dr.amount || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ADMIN PIN VERIFICATION MODAL                             */}
      {/* ======================================================== */}
      {actionModal.open && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title font-weight-bold">
                  <i className="fas fa-shield-alt mr-2"></i> Admin Security Verification
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => setActionModal({ ...actionModal, open: false })}
                >
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleConfirmAction}>
                <div className="modal-body p-4">
                  <div className="alert alert-warning mb-3 small">
                    <i className="fas fa-info-circle mr-1"></i>
                    <strong>Action:</strong> {actionModal.title}
                  </div>

                  <div className="form-group mb-3">
                    <label className="font-weight-bold text-dark small">Enter Your 4-Digit Admin PIN</label>
                    <div className="input-group">
                      <input
                        type={actionModal.showPin ? 'text' : 'password'}
                        className="form-control"
                        placeholder="••••"
                        maxLength="6"
                        value={actionModal.pinCode}
                        onChange={(e) => setActionModal({ ...actionModal, pinCode: e.target.value })}
                        required
                        autoFocus
                      />
                      <div className="input-group-append">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setActionModal({ ...actionModal, showPin: !actionModal.showPin })}
                          title={actionModal.showPin ? 'Hide PIN' : 'Show PIN'}
                        >
                          <i className={`fas fa-${actionModal.showPin ? 'eye-slash' : 'eye'}`}></i>
                        </button>
                      </div>
                    </div>
                    <small className="form-text text-muted">
                      Your PIN is required to authorize critical user modifications.
                    </small>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActionModal({ ...actionModal, open: false })}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary font-weight-bold">
                    <i className="fas fa-check-circle mr-1"></i> Authorize & Execute
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
