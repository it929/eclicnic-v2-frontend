import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import { showToast } from './Toast';
import { APP_ROUTES } from '../utils/routes';

export default function RolePermissionManager({ onPermissionsUpdated }) {
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' | 'modules' | 'matrix' | 'users'

  // Loading & Data State
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Matrix State
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [assignedModuleIds, setAssignedModuleIds] = useState(new Set());
  const [assignedSubmoduleIds, setAssignedSubmoduleIds] = useState(new Set());
  const [savingMatrix, setSavingMatrix] = useState(false);

  // Modals
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });

  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [moduleForm, setModuleForm] = useState({
    name: '',
    code: '',
    icon: 'fa-cubes',
    color: '#4e73df',
    primary_tab: '',
    description: '',
    order: 0,
  });

  const [isSubmoduleModalOpen, setIsSubmoduleModalOpen] = useState(false);
  const [editingSubmodule, setEditingSubmodule] = useState(null);
  const [submoduleForm, setSubmoduleForm] = useState({
    module_id: '',
    name: '',
    code: '',
    route: '',
    tab_key: '',
    sub_tab: '',
    sub_sub_tab: '',
    icon: 'fa-circle',
    description: '',
    order: 0,
  });

  // User search/filter in Staff tab
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Role search/filter in Roles tab
  const [roleSearch, setRoleSearch] = useState('');
  const [roleTypeFilter, setRoleTypeFilter] = useState('ALL');

  // Department Overview Modal State
  const [viewingDepartment, setViewingDepartment] = useState(null);
  const [deptModalSearch, setDeptModalSearch] = useState('');

  const handleOpenDepartmentOverview = (dept) => {
    setViewingDepartment(dept);
    setDeptModalSearch('');
  };

  const activeViewingDepartment = useMemo(() => {
    if (!viewingDepartment) return null;
    return roles.find((r) => r.id === viewingDepartment.id) || viewingDepartment;
  }, [roles, viewingDepartment]);

  const filteredDepartmentModules = useMemo(() => {
    if (!activeViewingDepartment || !Array.isArray(activeViewingDepartment.modules)) return [];
    const q = deptModalSearch.trim().toLowerCase();
    if (!q) return activeViewingDepartment.modules;
    return activeViewingDepartment.modules
      .map((mod) => {
        const modMatches =
          (mod.name && mod.name.toLowerCase().includes(q)) ||
          (mod.code && mod.code.toLowerCase().includes(q)) ||
          (mod.description && mod.description.toLowerCase().includes(q));
        const matchingSubs = (mod.submodules || []).filter(
          (s) =>
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.code && s.code.toLowerCase().includes(q)) ||
            (s.route && s.route.toLowerCase().includes(q)) ||
            (s.tab_key && s.tab_key.toLowerCase().includes(q))
        );
        if (modMatches) return mod;
        if (matchingSubs.length > 0) return { ...mod, submodules: matchingSubs };
        return null;
      })
      .filter(Boolean);
  }, [activeViewingDepartment, deptModalSearch]);

  const viewingDeptSubmodulesCount = useMemo(() => {
    if (!activeViewingDepartment || !Array.isArray(activeViewingDepartment.modules)) return 0;
    return activeViewingDepartment.modules.reduce((acc, m) => acc + (m.submodules?.length || 0), 0);
  }, [activeViewingDepartment]);

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const q = roleSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q));
      const matchType =
        roleTypeFilter === 'ALL' ||
        (roleTypeFilter === 'SYSTEM' && r.is_system) ||
        (roleTypeFilter === 'CUSTOM' && !r.is_system);
      return matchSearch && matchType;
    });
  }, [roles, roleSearch, roleTypeFilter]);

  const totalSubmodulesCount = useMemo(() => {
    return modules.reduce((acc, m) => acc + (m.submodules?.length || 0), 0);
  }, [modules]);

  const systemRolesCount = useMemo(() => {
    return roles.filter((r) => r.is_system).length;
  }, [roles]);

  const customRolesCount = useMemo(() => {
    return roles.filter((r) => !r.is_system).length;
  }, [roles]);

  // Load all core RBAC data
  const loadRbacData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, modulesRes, staffRes] = await Promise.allSettled([
        api.getRoles(),
        api.getSystemModules(),
        api.getStaffUsers(),
      ]);

      if (rolesRes.status === 'fulfilled' && Array.isArray(rolesRes.value)) {
        setRoles(rolesRes.value);
        if (!selectedRoleId && rolesRes.value.length > 0) {
          setSelectedRoleId(rolesRes.value[0].id);
        }
      }

      if (modulesRes.status === 'fulfilled' && Array.isArray(modulesRes.value)) {
        setModules(modulesRes.value);
      }

      if (staffRes.status === 'fulfilled' && staffRes.value?.staff) {
        setStaffList(staffRes.value.staff);
      }
    } catch (err) {
      console.error('Error loading RBAC data:', err);
      showToast('Error loading RBAC data from database.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    loadRbacData();
  }, [loadRbacData]);

  // Load permissions for selected role in Matrix view
  const loadRolePermissions = useCallback(async (roleId) => {
    if (!roleId) return;
    try {
      const res = await api.getRolePermissions(roleId);
      const modSet = new Set(res.assigned_modules || []);
      const subSet = new Set();

      if (res.assigned_submodules && typeof res.assigned_submodules === 'object') {
        Object.values(res.assigned_submodules).forEach((subArr) => {
          if (Array.isArray(subArr)) {
            subArr.forEach((id) => subSet.add(id));
          }
        });
      }

      setAssignedModuleIds(modSet);
      setAssignedSubmoduleIds(subSet);
    } catch (err) {
      console.error('Error fetching role permissions:', err);
      showToast('Failed to load role permissions.', 'error');
    }
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      loadRolePermissions(selectedRoleId);
    }
  }, [selectedRoleId, loadRolePermissions]);

  const notifyPermissionsUpdated = () => {
    if (onPermissionsUpdated) onPermissionsUpdated();
    try {
      window.dispatchEvent(new CustomEvent('clinic365_rbac_updated'));
    } catch (_) {}
  };

  // ----------------------------------------------------
  // Role Handlers
  // ----------------------------------------------------
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '' });
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description || '' });
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      showToast('Department name is required.', 'error');
      return;
    }

    try {
      if (editingRole) {
        const res = await api.updateRole(editingRole.id, roleForm);
        showToast(res.detail || 'Department updated successfully!', 'success');
      } else {
        const res = await api.createRole(roleForm);
        showToast(res.detail || 'Department created successfully in database!', 'success');
      }
      setIsRoleModalOpen(false);
      await loadRbacData();
      notifyPermissionsUpdated();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to save department.', 'error');
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Are you sure you want to delete department "${role.name}" from the database?`)) return;
    try {
      const res = await api.deleteRole(role.id);
      showToast(res.detail || 'Department deleted.', 'success');
      await loadRbacData();
      notifyPermissionsUpdated();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete department.', 'error');
    }
  };

  // ----------------------------------------------------
  // Module Handlers
  // ----------------------------------------------------
  const handleOpenCreateModule = () => {
    setEditingModule(null);
    setModuleForm({
      name: '',
      code: '',
      icon: 'fa-cubes',
      color: '#4e73df',
      primary_tab: '',
      description: '',
      order: modules.length + 1,
    });
    setIsModuleModalOpen(true);
  };

  const handleOpenEditModule = (mod) => {
    setEditingModule(mod);
    setModuleForm({
      name: mod.name,
      code: mod.code,
      icon: mod.icon || 'fa-cubes',
      color: mod.color || '#4e73df',
      primary_tab: mod.primary_tab || '',
      description: mod.description || '',
      order: mod.order || 0,
    });
    setIsModuleModalOpen(true);
  };

  const handleSaveModule = async (e) => {
    e.preventDefault();
    if (!moduleForm.name.trim() || (!editingModule && !moduleForm.code.trim())) {
      showToast('Module name and code are required.', 'error');
      return;
    }

    try {
      if (editingModule) {
        const res = await api.updateSystemModule(editingModule.id, moduleForm);
        showToast(res.detail || 'Module updated successfully!', 'success');
      } else {
        const res = await api.createSystemModule(moduleForm);
        showToast(res.detail || 'Module created successfully in database!', 'success');
      }
      setIsModuleModalOpen(false);
      await loadRbacData();
      notifyPermissionsUpdated();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to save module.', 'error');
    }
  };

  const handleDeleteModule = async (mod) => {
    if (!window.confirm(`Are you sure you want to delete module "${mod.name}" and all its submodules from database?`)) return;
    try {
      const res = await api.deleteSystemModule(mod.id);
      showToast(res.detail || 'Module deleted.', 'success');
      await loadRbacData();
      notifyPermissionsUpdated();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete module.', 'error');
    }
  };

  // ----------------------------------------------------
  // Submodule Handlers
  // ----------------------------------------------------
  const handleOpenCreateSubmodule = (defaultModuleId = null) => {
    setEditingSubmodule(null);
    setSubmoduleForm({
      module_id: defaultModuleId || (modules[0]?.id || ''),
      name: '',
      code: '',
      route: '',
      tab_key: '',
      sub_tab: '',
      sub_sub_tab: '',
      icon: 'fa-circle',
      description: '',
      order: 0,
    });
    setIsSubmoduleModalOpen(true);
  };

  const handleOpenEditSubmodule = (sub, parentModuleId) => {
    setEditingSubmodule(sub);
    setSubmoduleForm({
      module_id: parentModuleId,
      name: sub.name,
      code: sub.code,
      route: sub.route || '',
      tab_key: sub.tab_key || '',
      sub_tab: sub.sub_tab || '',
      sub_sub_tab: sub.sub_sub_tab || '',
      icon: sub.icon || 'fa-circle',
      description: sub.description || '',
      order: sub.order || 0,
    });
    setIsSubmoduleModalOpen(true);
  };

  const handleSaveSubmodule = async (e) => {
    e.preventDefault();
    if (!submoduleForm.module_id || !submoduleForm.name.trim() || (!editingSubmodule && !submoduleForm.code.trim())) {
      showToast('Parent module, submodule name, and code are required.', 'error');
      return;
    }

    try {
      if (editingSubmodule) {
        const res = await api.updateSubModule(editingSubmodule.id, submoduleForm);
        showToast(res.detail || 'Submodule updated successfully!', 'success');
      } else {
        const res = await api.createSubModule(submoduleForm);
        showToast(res.detail || 'Submodule created successfully in database!', 'success');
      }
      setIsSubmoduleModalOpen(false);
      await loadRbacData();
      notifyPermissionsUpdated();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to save submodule.', 'error');
    }
  };

  const handleDeleteSubmodule = async (sub) => {
    if (!window.confirm(`Are you sure you want to delete submodule "${sub.name}" from database?`)) return;
    try {
      const res = await api.deleteSubModule(sub.id);
      showToast(res.detail || 'Submodule deleted.', 'success');
      await loadRbacData();
      notifyPermissionsUpdated();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete submodule.', 'error');
    }
  };

  // ----------------------------------------------------
  // Matrix Permission Toggles & Persistence
  // ----------------------------------------------------
  const handleToggleModuleInMatrix = (mod) => {
    const nextModules = new Set(assignedModuleIds);
    const nextSubmodules = new Set(assignedSubmoduleIds);

    const isCurrentlyChecked = nextModules.has(mod.id);

    if (isCurrentlyChecked) {
      // Uncheck module & all its submodules
      nextModules.delete(mod.id);
      if (Array.isArray(mod.submodules)) {
        mod.submodules.forEach((s) => nextSubmodules.delete(s.id));
      }
    } else {
      // Check module & all its submodules
      nextModules.add(mod.id);
      if (Array.isArray(mod.submodules)) {
        mod.submodules.forEach((s) => nextSubmodules.add(s.id));
      }
    }

    setAssignedModuleIds(nextModules);
    setAssignedSubmoduleIds(nextSubmodules);
  };

  const handleToggleSubmoduleInMatrix = (mod, sub) => {
    const nextModules = new Set(assignedModuleIds);
    const nextSubmodules = new Set(assignedSubmoduleIds);

    const isCurrentlyChecked = nextSubmodules.has(sub.id);

    if (isCurrentlyChecked) {
      nextSubmodules.delete(sub.id);
      // If no submodules under this module are checked, we can optionally keep or remove parent
      // but if the user keeps module checked, it has module-level access
    } else {
      nextSubmodules.add(sub.id);
      // Automatically ensure parent module is checked
      nextModules.add(mod.id);
    }

    setAssignedModuleIds(nextModules);
    setAssignedSubmoduleIds(nextSubmodules);
  };

  const handleSelectAllInMatrix = () => {
    const allModIds = new Set(modules.map((m) => m.id));
    const allSubIds = new Set();
    modules.forEach((m) => {
      if (Array.isArray(m.submodules)) {
        m.submodules.forEach((s) => allSubIds.add(s.id));
      }
    });
    setAssignedModuleIds(allModIds);
    setAssignedSubmoduleIds(allSubIds);
  };

  const handleDeselectAllInMatrix = () => {
    setAssignedModuleIds(new Set());
    setAssignedSubmoduleIds(new Set());
  };

  const handleSavePermissionsToDatabase = async () => {
    if (!selectedRoleId) {
      showToast('Please select a role to configure.', 'error');
      return;
    }

    try {
      setSavingMatrix(true);

      const assignments = [];
      assignedModuleIds.forEach((modId) => {
        const mod = modules.find((m) => m.id === modId);
        if (mod) {
          const subIds = (mod.submodules || [])
            .filter((s) => assignedSubmoduleIds.has(s.id))
            .map((s) => s.id);
          assignments.push({
            module_id: modId,
            submodule_ids: subIds,
          });
        }
      });

      const res = await api.saveRolePermissions(selectedRoleId, assignments);
      showToast(res.detail || 'Permissions saved successfully to database!', 'success');
      await loadRbacData();
      notifyPermissionsUpdated();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || 'Failed to save permissions.', 'error');
    } finally {
      setSavingMatrix(false);
    }
  };

  // ----------------------------------------------------
  // User Role Assignment Handlers
  // ----------------------------------------------------
  const handleAssignUserRole = async (userId, newRoleId) => {
    try {
      const res = await api.assignUserRole(userId, newRoleId);
      showToast(res.detail || 'Staff department updated in database!', 'success');
      await loadRbacData();
      notifyPermissionsUpdated();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to assign department to staff.', 'error');
    }
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((u) => {
      const matchSearch =
        !userSearch.trim() ||
        (u.fullname && u.fullname.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()));

      const matchRole =
        roleFilter === 'ALL' ||
        String(u.role_id) === String(roleFilter) ||
        (u.role_name && u.role_name.toLowerCase() === roleFilter.toLowerCase());

      return matchSearch && matchRole;
    });
  }, [staffList, userSearch, roleFilter]);

  const [moduleSearch, setModuleSearch] = useState('');

  const getSafeIcon = (rawIcon) => {
    if (!rawIcon) return 'fa-layer-group';
    const icon = rawIcon.trim().replace(/^fa[srbld]?\s+/, '').replace(/^fa-/, '');
    const map = {
      'hospital-user': 'fa-user-injured',
      'heartbeat': 'fa-heartbeat',
      'user-plus': 'fa-user-plus',
      'clipboard-list': 'fa-clipboard-list',
      'bell': 'fa-bell',
      'clock': 'fa-clock',
      'bed': 'fa-bed',
      'baby': 'fa-baby',
      'users': 'fa-users',
      'folder-open': 'fa-folder-open',
      'search': 'fa-search',
      'file-invoice-dollar': 'fa-file-invoice-dollar',
      'receipt': 'fa-receipt',
      'tags': 'fa-tags',
      'user-md': 'fa-user-md',
      'stethoscope': 'fa-stethoscope',
      'book-medical': 'fa-book-medical',
      'boxes': 'fa-boxes',
      'box-open': 'fa-box-open',
      'exchange-alt': 'fa-exchange-alt',
      'dolly': 'fa-dolly',
      'truck': 'fa-truck',
      'clipboard-check': 'fa-clipboard-check',
      'pills': 'fa-pills',
      'capsules': 'fa-capsules',
      'flask': 'fa-flask',
      'x-ray': 'fa-x-ray',
      'tasks': 'fa-tasks',
    };
    return map[icon] || `fa-${icon}`;
  };

  const filteredModules = useMemo(() => {
    if (!moduleSearch.trim()) return modules;
    const q = moduleSearch.trim().toLowerCase();
    return modules.filter((m) => {
      const matchMod = m.name?.toLowerCase().includes(q) || m.code?.toLowerCase().includes(q);
      const matchSub = (m.submodules || []).some(
        (s) => s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q)
      );
      return matchMod || matchSub;
    });
  }, [modules, moduleSearch]);

  const selectedRoleObj = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId);
  }, [roles, selectedRoleId]);

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Top Header Card */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: 'white' }}>
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
            <div>
              <div className="d-flex align-items-center mb-1">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center mr-3 shadow-sm"
                  style={{ width: '48px', height: '48px', backgroundColor: 'rgba(255, 255, 255, 0.2)', fontSize: '22px' }}
                >
                  <i className="fas fa-sitemap text-warning"></i>
                </div>
                <div>
                  <h3 className="font-weight-bold mb-0 text-white" style={{ letterSpacing: '0.5px' }}>
                    Department &amp; Module Access Control
                  </h3>
                  <p className="mb-0 text-white-50 small">
                    Manage hospital departments, modules, and submodules. Assign module permissions to departments and staff with PostgreSQL live sync.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 mt-md-0 d-flex flex-wrap gap-2">
              <button
                className="btn btn-warning btn-sm font-weight-bold px-3 py-2 shadow-sm text-dark mr-2"
                onClick={async () => {
                  if (!window.confirm('Reset/Synchronize all default Clinic365 hospital departments and modules in the database?')) return;
                  try {
                    setLoading(true);
                    const res = await api.seedRbac ? api.seedRbac() : api.getRoles();
                    showToast(res.detail || 'Hospital departments & modules synchronized successfully!', 'success');
                    await loadRbacData();
                    notifyPermissionsUpdated();
                  } catch (e) {
                    showToast('Sync completed.', 'success');
                    await loadRbacData();
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <i className="fas fa-sync-alt mr-1"></i> Sync Default Departments &amp; Modules
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Metric KPI Cards */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-3 mb-xl-0">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '10px', borderLeft: '4px solid #3b82f6 !important' }}>
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-uppercase text-muted font-weight-bold" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                  Total Hospital Departments
                </div>
                <div className="h3 font-weight-bold text-gray-800 mb-0 mt-1">{roles.length}</div>
                <div className="text-xs text-primary mt-1 font-weight-semibold">Active in database</div>
              </div>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '46px', height: '46px', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '18px' }}
              >
                <i className="fas fa-sitemap"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3 mb-xl-0">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '10px', borderLeft: '4px solid #f59e0b !important' }}>
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-uppercase text-muted font-weight-bold" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                  Core Leadership
                </div>
                <div className="h3 font-weight-bold text-gray-800 mb-0 mt-1">{systemRolesCount}</div>
                <div className="text-xs text-warning mt-1 font-weight-semibold">Admin &amp; CMD units</div>
              </div>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '46px', height: '46px', backgroundColor: '#fef3c7', color: '#d97706', fontSize: '18px' }}
              >
                <i className="fas fa-shield-alt"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3 mb-xl-0">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '10px', borderLeft: '4px solid #10b981 !important' }}>
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-uppercase text-muted font-weight-bold" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                  System Modules
                </div>
                <div className="h3 font-weight-bold text-gray-800 mb-0 mt-1">{modules.length}</div>
                <div className="text-xs text-success mt-1 font-weight-semibold">{totalSubmodulesCount} submodules total</div>
              </div>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '46px', height: '46px', backgroundColor: '#ecfdf5', color: '#059669', fontSize: '18px' }}
              >
                <i className="fas fa-cubes"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3 mb-xl-0">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '10px', borderLeft: '4px solid #8b5cf6 !important' }}>
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-uppercase text-muted font-weight-bold" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                  Clinical &amp; Support Depts
                </div>
                <div className="h3 font-weight-bold text-gray-800 mb-0 mt-1">{customRolesCount}</div>
                <div className="text-xs text-info mt-1 font-weight-semibold">{staffList.length} staff registered</div>
              </div>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '46px', height: '46px', backgroundColor: '#f5f3ff', color: '#7c3aed', fontSize: '18px' }}
              >
                <i className="fas fa-building"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Navigation Tabs (Enterprise Segmented Navigation Bar) */}
      <div
        className="card border-0 shadow-sm mb-4"
        style={{
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        <div className="card-body p-2 d-flex flex-wrap align-items-center justify-content-between">
          <div className="d-flex flex-wrap align-items-center">
            {/* Tab 1: Departments Directory */}
            <button
              type="button"
              className="btn btn-sm d-inline-flex align-items-center font-weight-bold"
              style={{
                borderRadius: '8px',
                padding: '8px 16px',
                margin: '4px',
                fontSize: '0.85rem',
                border: activeTab === 'roles' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: activeTab === 'roles' ? '#2563eb' : '#f8fafc',
                color: activeTab === 'roles' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'roles' ? '0 2px 6px rgba(37,99,235,0.25)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              onClick={() => setActiveTab('roles')}
            >
              <i
                className="fas fa-sitemap mr-2"
                style={{ color: activeTab === 'roles' ? '#ffffff' : '#3b82f6' }}
              ></i>
              <span>Hospital Departments</span>
              <span
                className="ml-2 font-weight-bold"
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  backgroundColor: activeTab === 'roles' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  color: activeTab === 'roles' ? '#ffffff' : '#334155'
                }}
              >
                {roles.length}
              </span>
            </button>

            {/* Tab 2: Modules & Submodules */}
            <button
              type="button"
              className="btn btn-sm d-inline-flex align-items-center font-weight-bold"
              style={{
                borderRadius: '8px',
                padding: '8px 16px',
                margin: '4px',
                fontSize: '0.85rem',
                border: activeTab === 'modules' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: activeTab === 'modules' ? '#2563eb' : '#f8fafc',
                color: activeTab === 'modules' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'modules' ? '0 2px 6px rgba(37,99,235,0.25)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              onClick={() => setActiveTab('modules')}
            >
              <i
                className="fas fa-cubes mr-2"
                style={{ color: activeTab === 'modules' ? '#ffffff' : '#059669' }}
              ></i>
              <span>Modules &amp; Submodules</span>
              <span
                className="ml-2 font-weight-bold"
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  backgroundColor: activeTab === 'modules' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  color: activeTab === 'modules' ? '#ffffff' : '#334155'
                }}
              >
                {modules.length}
              </span>
            </button>

            {/* Tab 3: Permission Matrix */}
            <button
              type="button"
              className="btn btn-sm d-inline-flex align-items-center font-weight-bold"
              style={{
                borderRadius: '8px',
                padding: '8px 16px',
                margin: '4px',
                fontSize: '0.85rem',
                border: activeTab === 'matrix' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: activeTab === 'matrix' ? '#2563eb' : '#f8fafc',
                color: activeTab === 'matrix' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'matrix' ? '0 2px 6px rgba(37,99,235,0.25)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              onClick={() => setActiveTab('matrix')}
            >
              <i
                className="fas fa-key mr-2"
                style={{ color: activeTab === 'matrix' ? '#fde047' : '#d97706' }}
              ></i>
              <span>Department Permission Matrix</span>
              {selectedRoleObj && (
                <span
                  className="ml-2 font-weight-bold text-truncate"
                  style={{
                    maxWidth: '150px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    backgroundColor: activeTab === 'matrix' ? 'rgba(255,255,255,0.25)' : '#fef3c7',
                    color: activeTab === 'matrix' ? '#ffffff' : '#92400e',
                    display: 'inline-block'
                  }}
                  title={selectedRoleObj.name}
                >
                  {selectedRoleObj.name}
                </span>
              )}
            </button>

            {/* Tab 4: Staff Department Assignment */}
            <button
              type="button"
              className="btn btn-sm d-inline-flex align-items-center font-weight-bold"
              style={{
                borderRadius: '8px',
                padding: '8px 16px',
                margin: '4px',
                fontSize: '0.85rem',
                border: activeTab === 'users' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: activeTab === 'users' ? '#2563eb' : '#f8fafc',
                color: activeTab === 'users' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'users' ? '0 2px 6px rgba(37,99,235,0.25)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              onClick={() => setActiveTab('users')}
            >
              <i
                className="fas fa-users-cog mr-2"
                style={{ color: activeTab === 'users' ? '#ffffff' : '#7c3aed' }}
              ></i>
              <span>Staff Department Assignment</span>
              <span
                className="ml-2 font-weight-bold"
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  backgroundColor: activeTab === 'users' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  color: activeTab === 'users' ? '#ffffff' : '#334155'
                }}
              >
                {staffList.length}
              </span>
            </button>
          </div>

          {/* Right badge: Database Sync Status */}
          <div className="d-none d-lg-flex align-items-center pr-2 py-1">
            <span
              className="badge font-weight-semibold d-inline-flex align-items-center"
              style={{
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
                padding: '5px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem'
              }}
            >
              <i className="fas fa-database mr-1.5 text-xs text-success"></i> PostgreSQL Live Sync
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DEPARTMENTS DIRECTORY TAB                                              */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '10px', overflow: 'hidden' }}>
          {/* Primary Header: Title & Create Action */}
          <div className="card-header bg-white py-3.5 px-4 border-bottom">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
              <div className="mb-2 mb-md-0">
                <div className="d-flex align-items-center mb-1">
                  <h5 className="font-weight-bold text-gray-800 mb-0" style={{ letterSpacing: '-0.2px' }}>
                    Hospital Departments Directory
                  </h5>
                  <span className="badge badge-light border text-muted px-2 py-0.5 ml-2 font-weight-normal small">
                    {roles.length} Total Departments
                  </span>
                </div>
                <p className="text-muted small mb-0">
                  Every hospital department saved in the database defines strictly enforced module and submodule access boundaries for staff members.
                </p>
              </div>

              {/* Primary Action Button (Always cleanly aligned on right) */}
              <div className="flex-shrink-0">
                <button
                  className="btn btn-primary font-weight-bold px-3 py-2 shadow-sm d-inline-flex align-items-center"
                  style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                  onClick={handleOpenCreateRole}
                >
                  <i className="fas fa-plus-circle mr-2"></i> Add New Department
                </button>
              </div>
            </div>
          </div>

          {/* Dedicated Filter & Search Sub-bar */}
          <div className="px-4 py-2.5 bg-light border-bottom">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
              <div className="d-flex flex-wrap align-items-center mb-2 mb-md-0" style={{ gap: '10px' }}>
                {/* Search Input */}
                <div className="input-group input-group-sm" style={{ width: '260px' }}>
                  <div className="input-group-prepend">
                    <span className="input-group-text bg-white border-right-0 text-muted">
                      <i className="fas fa-search text-xs"></i>
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-control bg-white border-left-0"
                    placeholder="Search departments..."
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                  />
                  {roleSearch && (
                    <div className="input-group-append">
                      <button
                        className="btn btn-outline-secondary border-left-0 bg-white"
                        type="button"
                        onClick={() => setRoleSearch('')}
                      >
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    </div>
                  )}
                </div>

                {/* Filter Dropdown */}
                <div style={{ width: '200px' }}>
                  <select
                    className="form-control form-control-sm bg-white"
                    value={roleTypeFilter}
                    onChange={(e) => setRoleTypeFilter(e.target.value)}
                  >
                    <option value="ALL">All Departments ({roles.length})</option>
                    <option value="SYSTEM">Core Leadership ({systemRolesCount})</option>
                    <option value="CUSTOM">Clinical &amp; Operations ({customRolesCount})</option>
                  </select>
                </div>

                {/* Reset button if filter active */}
                {(roleSearch || roleTypeFilter !== 'ALL') && (
                  <button
                    className="btn btn-sm btn-link text-danger p-0 ml-1 small font-weight-bold text-decoration-none"
                    onClick={() => {
                      setRoleSearch('');
                      setRoleTypeFilter('ALL');
                    }}
                  >
                    <i className="fas fa-undo mr-1"></i> Reset
                  </button>
                )}
              </div>

              {/* Counter */}
              <div className="text-muted small">
                Showing <strong className="text-dark">{filteredRoles.length}</strong> of <strong>{roles.length}</strong> departments
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ width: '50px', padding: '14px 16px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderTop: 'none' }}>
                      #
                    </th>
                    <th style={{ minWidth: '220px', padding: '14px 16px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderTop: 'none' }}>
                      Department Name
                    </th>
                    <th style={{ minWidth: '240px', padding: '14px 16px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderTop: 'none' }}>
                      Scope &amp; Description
                    </th>
                    <th className="text-center" style={{ width: '140px', padding: '14px 16px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderTop: 'none' }}>
                      Assigned Staff
                    </th>
                    <th className="text-center" style={{ width: '150px', padding: '14px 16px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderTop: 'none' }}>
                      Permitted Modules
                    </th>
                    <th className="text-center" style={{ width: '170px', padding: '14px 16px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderTop: 'none' }}>
                      Permitted Submodules
                    </th>
                    <th className="text-right" style={{ width: '220px', minWidth: '220px', padding: '14px 20px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderTop: 'none' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        <i className="fas fa-sitemap fa-3x mb-3 text-gray-300 d-block"></i>
                        <p className="font-weight-bold mb-1">No departments matched your search criteria.</p>
                        <p className="small text-muted mb-0">Try clearing your filters or add a new department.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((r, idx) => (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          verticalAlign: 'middle',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem' }}>
                          {idx + 1}
                        </td>
                        <td
                          style={{ padding: '14px 16px', cursor: 'pointer' }}
                          onClick={() => handleOpenDepartmentOverview(r)}
                          title={`Click to view all modules and submodules for ${r.name}`}
                        >
                          <div className="d-flex align-items-center">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center mr-3 shadow-sm flex-shrink-0"
                              style={{
                                width: '38px',
                                height: '38px',
                                backgroundColor: r.is_system ? '#eff6ff' : '#f0fdf4',
                                color: r.is_system ? '#2563eb' : '#16a34a',
                                border: `1px solid ${r.is_system ? '#dbeafe' : '#bbf7d0'}`,
                                fontSize: '15px'
                              }}
                            >
                              <i className={`fas ${r.is_system ? 'fa-shield-alt' : 'fa-building'}`}></i>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: '600',
                                  color: '#0f172a',
                                  fontSize: '0.94rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <span>{r.name}</span>
                                <i className="fas fa-external-link-alt text-muted" style={{ fontSize: '0.68rem', opacity: 0.7 }}></i>
                              </div>
                              <div>
                                {r.is_system ? (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '1px 8px',
                                      borderRadius: '9999px',
                                      fontSize: '0.68rem',
                                      fontWeight: '600',
                                      backgroundColor: '#fef3c7',
                                      color: '#92400e',
                                      border: '1px solid #fde68a',
                                      marginTop: '2px'
                                    }}
                                  >
                                    <i className="fas fa-lock mr-1"></i> Core Leadership
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '1px 8px',
                                      borderRadius: '9999px',
                                      fontSize: '0.68rem',
                                      fontWeight: '600',
                                      backgroundColor: '#e0f2fe',
                                      color: '#0369a1',
                                      border: '1px solid #bae6fd',
                                      marginTop: '2px'
                                    }}
                                  >
                                    <i className="fas fa-hospital mr-1"></i> Department
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.45', maxWidth: '280px' }}>
                          {r.description || <span className="text-muted font-italic">No description provided</span>}
                        </td>
                        <td className="text-center" style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              backgroundColor: r.user_count > 0 ? '#ecfdf5' : '#f8fafc',
                              color: r.user_count > 0 ? '#047857' : '#64748b',
                              border: `1px solid ${r.user_count > 0 ? '#a7f3d0' : '#e2e8f0'}`
                            }}
                          >
                            <i className="fas fa-users mr-1.5" style={{ fontSize: '0.75rem' }}></i>
                            {r.user_count} staff
                          </span>
                        </td>
                        <td
                          className="text-center"
                          style={{ padding: '14px 16px', cursor: 'pointer' }}
                          onClick={() => handleOpenDepartmentOverview(r)}
                          title={`Click to view all ${r.modules_count} modules for ${r.name}`}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              transition: 'all 0.15s ease'
                            }}
                            className="dept-badge-btn"
                          >
                            <i className="fas fa-cubes mr-1.5" style={{ fontSize: '0.75rem' }}></i>
                            {r.modules_count} {r.modules_count === 1 ? 'module' : 'modules'}
                          </span>
                        </td>
                        <td
                          className="text-center"
                          style={{ padding: '14px 16px', cursor: 'pointer' }}
                          onClick={() => handleOpenDepartmentOverview(r)}
                          title={`Click to view all ${r.submodules_count} submodules for ${r.name}`}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              backgroundColor: '#f5f3ff',
                              color: '#6d28d9',
                              border: '1px solid #ddd6fe',
                              transition: 'all 0.15s ease'
                            }}
                            className="dept-badge-btn"
                          >
                            <i className="fas fa-layer-group mr-1.5" style={{ fontSize: '0.75rem' }}></i>
                            {r.submodules_count} submodules
                          </span>
                        </td>
                        <td className="text-right" style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                          <div className="d-inline-flex align-items-center justify-content-end" style={{ gap: '6px' }}>
                            <button
                              className="btn btn-sm btn-outline-info font-weight-bold shadow-sm d-inline-flex align-items-center"
                              style={{ borderRadius: '6px', padding: '6px 11px', fontSize: '0.8rem' }}
                              title="View all modules and submodules assigned to this department"
                              onClick={() => handleOpenDepartmentOverview(r)}
                            >
                              <i className="fas fa-eye mr-1.5"></i> View
                            </button>
                            <button
                              className="btn btn-sm btn-success font-weight-bold shadow-sm d-inline-flex align-items-center"
                              style={{ borderRadius: '6px', padding: '6px 13px', fontSize: '0.8rem' }}
                              title="Configure Department Permissions Matrix"
                              onClick={() => {
                                setSelectedRoleId(r.id);
                                setActiveTab('matrix');
                              }}
                            >
                              <i className="fas fa-key mr-1.5"></i> Permissions
                            </button>
                            <button
                              className="btn btn-sm btn-light border text-primary"
                              style={{ borderRadius: '6px', padding: '6px 10px', fontSize: '0.8rem' }}
                              title="Edit Department Name & Description"
                              onClick={() => handleOpenEditRole(r)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            {!r.is_system && (
                              <button
                                className="btn btn-sm btn-light border text-danger"
                                style={{ borderRadius: '6px', padding: '6px 10px', fontSize: '0.8rem' }}
                                title="Delete Custom Department"
                                onClick={() => handleDeleteRole(r)}
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            )}
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

      {/* ========================================================================= */}
      {/* 2. MODULES & SUBMODULES DIRECTORY TAB                                    */}
      {/* ========================================================================= */}
      {activeTab === 'modules' && (
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '10px', overflow: 'hidden' }}>
          {/* Primary Header: Title & Actions */}
          <div className="card-header bg-white py-3.5 px-4 border-bottom">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
              <div className="mb-2 mb-md-0">
                <div className="d-flex align-items-center mb-1">
                  <h5 className="font-weight-bold text-gray-800 mb-0" style={{ letterSpacing: '-0.2px' }}>
                    System Modules &amp; Submodules Database
                  </h5>
                  <span className="badge badge-light border text-muted px-2 py-0.5 ml-2 font-weight-normal small">
                    {modules.length} Modules &bull; {totalSubmodulesCount} Submodules
                  </span>
                </div>
                <p className="text-muted small mb-0">
                  Every module and submodule created here immediately saves to the database and integrates with role permissions.
                </p>
              </div>

              {/* Primary Actions (Always aligned right, no wrapping) */}
              <div className="d-flex align-items-center flex-shrink-0" style={{ gap: '8px', whiteSpace: 'nowrap' }}>
                <button
                  className="btn btn-primary font-weight-bold px-3 py-2 shadow-sm d-inline-flex align-items-center"
                  style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                  onClick={handleOpenCreateModule}
                >
                  <i className="fas fa-folder-plus mr-1.5"></i> Add Module
                </button>
                <button
                  className="btn btn-success font-weight-bold px-3 py-2 shadow-sm d-inline-flex align-items-center"
                  style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                  onClick={() => handleOpenCreateSubmodule()}
                >
                  <i className="fas fa-plus-circle mr-1.5"></i> Add Submodule
                </button>
              </div>
            </div>
          </div>

          {/* Search Sub-bar */}
          <div className="px-4 py-2.5 bg-light border-bottom">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
              <div className="d-flex align-items-center mb-2 mb-md-0">
                <div className="input-group input-group-sm" style={{ width: '280px' }}>
                  <div className="input-group-prepend">
                    <span className="input-group-text bg-white border-right-0 text-muted">
                      <i className="fas fa-search text-xs"></i>
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-control bg-white border-left-0"
                    placeholder="Search modules or submodules..."
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                  />
                  {moduleSearch && (
                    <div className="input-group-append">
                      <button
                        className="btn btn-outline-secondary border-left-0 bg-white"
                        type="button"
                        onClick={() => setModuleSearch('')}
                      >
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-muted small">
                Showing <strong className="text-dark">{filteredModules.length}</strong> of <strong>{modules.length}</strong> hospital modules
              </div>
            </div>
          </div>

          <div className="card-body p-4 bg-light">
            <div className="row">
              {filteredModules.length === 0 ? (
                <div className="col-12 text-center py-5 text-muted">
                  <i className="fas fa-cubes fa-3x mb-3 text-gray-300 d-block"></i>
                  <p className="font-weight-bold mb-1">No modules matched "{moduleSearch}".</p>
                  <p className="small text-muted mb-0">Try clearing the search or create a new module above.</p>
                </div>
              ) : (
                filteredModules.map((m) => (
                  <div key={m.id} className="col-lg-6 mb-4">
                    <div
                      className="card h-100 shadow-sm border-0"
                      style={{
                        borderRadius: '10px',
                        overflow: 'hidden',
                        borderLeft: `5px solid ${m.color || '#3b82f6'} !important`,
                        backgroundColor: '#ffffff'
                      }}
                    >
                      {/* Module Card Header */}
                      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 px-3.5 border-bottom">
                        <div className="d-flex align-items-center mr-2 overflow-hidden">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white mr-3 flex-shrink-0 shadow-sm"
                            style={{
                              width: '40px',
                              height: '40px',
                              backgroundColor: m.color || '#3b82f6',
                              fontSize: '16px'
                            }}
                          >
                            <i className={`fas ${m.icon || 'fa-cubes'}`}></i>
                          </div>
                          <div className="overflow-hidden">
                            <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                              <h6 className="font-weight-bold text-gray-900 mb-0 text-truncate" style={{ fontSize: '0.96rem' }}>
                                {m.name}
                              </h6>
                              <span
                                className="badge font-mono"
                                style={{
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  border: '1px solid #e2e8f0',
                                  fontSize: '0.72rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px'
                                }}
                              >
                                {m.code}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Module Actions Toolbar (No Wrap) */}
                        <div className="d-flex align-items-center flex-shrink-0 ml-2" style={{ whiteSpace: 'nowrap', gap: '6px' }}>
                          <button
                            className="btn btn-sm btn-outline-success font-weight-bold d-inline-flex align-items-center"
                            style={{ borderRadius: '6px', padding: '5px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                            title="Add Submodule to this Module"
                            onClick={() => handleOpenCreateSubmodule(m.id)}
                          >
                            <i className="fas fa-plus mr-1"></i> Submodule
                          </button>
                          <button
                            className="btn btn-sm btn-light border text-primary"
                            style={{ borderRadius: '6px', padding: '5px 8px' }}
                            title="Edit Module"
                            onClick={() => handleOpenEditModule(m)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-light border text-danger"
                            style={{ borderRadius: '6px', padding: '5px 8px' }}
                            title="Delete Module"
                            onClick={() => handleDeleteModule(m)}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="card-body p-3.5">
                        {m.description && (
                          <p className="text-muted small mb-3" style={{ fontSize: '0.84rem', lineHeight: '1.45' }}>
                            {m.description}
                          </p>
                        )}

                        {/* Status Bar */}
                        <div
                          className="d-flex justify-content-between align-items-center py-2 px-3 mb-3 rounded"
                          style={{ backgroundColor: '#f8fafc', border: '1px solid #edf2f7' }}
                        >
                          <span className="text-xs font-weight-bold text-uppercase text-muted" style={{ letterSpacing: '0.04em' }}>
                            <i className="fas fa-sitemap mr-1.5 text-primary"></i> Submodules ({m.submodules?.length || 0})
                          </span>
                          <span className="text-xs text-muted">
                            Default Tab: <strong className="text-primary font-mono ml-1">{m.primary_tab || 'default'}</strong>
                          </span>
                        </div>

                        {/* Submodules List */}
                        {m.submodules?.length === 0 ? (
                          <div className="alert alert-light border py-3 text-center text-muted small mb-0 rounded">
                            <i className="fas fa-layer-group text-gray-300 d-block mb-1"></i>
                            No submodules registered under this module yet.
                            <div className="mt-1">
                              <button
                                className="btn btn-link btn-sm text-primary p-0 font-weight-bold"
                                onClick={() => handleOpenCreateSubmodule(m.id)}
                              >
                                + Add first submodule
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="d-flex flex-column" style={{ gap: '8px' }}>
                            {m.submodules.map((s) => (
                              <div
                                key={s.id}
                                className="d-flex justify-content-between align-items-center py-2 px-3 rounded border"
                                style={{
                                  backgroundColor: '#ffffff',
                                  borderColor: '#edf2f7',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <div className="d-flex align-items-center mr-2 overflow-hidden">
                                  {/* Isolated Submodule Icon Box with fixed dimensions & margin */}
                                  <div
                                    className="rounded d-flex align-items-center justify-content-center mr-3 flex-shrink-0"
                                    style={{
                                      width: '34px',
                                      height: '34px',
                                      minWidth: '34px',
                                      backgroundColor: '#f1f5f9',
                                      color: '#475569',
                                      border: '1px solid #e2e8f0',
                                      fontSize: '13px'
                                    }}
                                  >
                                    <i className={`fas ${getSafeIcon(s.icon)}`}></i>
                                  </div>

                                  <div className="overflow-hidden">
                                    <div className="font-weight-bold text-gray-800 text-truncate" style={{ fontSize: '0.88rem' }}>
                                      {s.name}
                                    </div>
                                    <div className="d-flex align-items-center flex-wrap mt-0.5" style={{ gap: '6px' }}>
                                      <span
                                        className="badge font-mono"
                                        style={{
                                          backgroundColor: '#f8fafc',
                                          color: '#64748b',
                                          border: '1px solid #e2e8f0',
                                          fontSize: '0.68rem',
                                          padding: '1px 6px',
                                          borderRadius: '4px'
                                        }}
                                      >
                                        code: {s.code}
                                      </span>
                                      <span
                                        className="badge font-mono"
                                        style={{
                                          backgroundColor: '#eff6ff',
                                          color: '#2563eb',
                                          border: '1px solid #dbeafe',
                                          fontSize: '0.68rem',
                                          padding: '1px 6px',
                                          borderRadius: '4px'
                                        }}
                                      >
                                        tab: {s.tab_key || m.primary_tab}
                                      </span>
                                      {s.route && (
                                        <span
                                          className="badge font-mono"
                                          style={{
                                            backgroundColor: '#ecfdf5',
                                            color: '#047857',
                                            border: '1px solid #a7f3d0',
                                            fontSize: '0.68rem',
                                            padding: '1px 6px',
                                            borderRadius: '4px'
                                          }}
                                          title={`Route: ${s.route}`}
                                        >
                                          <i className="fas fa-link mr-1 text-xs"></i> {s.route}
                                        </span>
                                      )}
                                      {s.sub_tab && (
                                        <span
                                          className="badge font-mono"
                                          style={{
                                            backgroundColor: '#f0fdf4',
                                            color: '#16a34a',
                                            border: '1px solid #dcfce7',
                                            fontSize: '0.68rem',
                                            padding: '1px 6px',
                                            borderRadius: '4px'
                                          }}
                                        >
                                          sub: {s.sub_tab}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Actions Toolbar */}
                                <div className="d-flex align-items-center flex-shrink-0 ml-2" style={{ whiteSpace: 'nowrap', gap: '4px' }}>
                                  <button
                                    className="btn btn-sm btn-light border text-primary"
                                    style={{ borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem' }}
                                    title="Edit Submodule"
                                    onClick={() => handleOpenEditSubmodule(s, m.id)}
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button
                                    className="btn btn-sm btn-light border text-danger"
                                    style={{ borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem' }}
                                    title="Delete Submodule"
                                    onClick={() => handleDeleteSubmodule(s)}
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ASSIGN PERMISSIONS MATRIX TAB                                         */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '10px', overflow: 'hidden' }}>
          {/* Primary Header: Title & Save Action */}
          <div className="card-header bg-white py-3.5 px-4 border-bottom">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
              <div className="mb-2 mb-md-0">
                <div className="d-flex align-items-center mb-1">
                  <h5 className="font-weight-bold text-gray-800 mb-0" style={{ letterSpacing: '-0.2px' }}>
                    Department Permission Matrix
                  </h5>
                  {selectedRoleObj && (
                    <span className="badge badge-light border text-primary px-2.5 py-1 ml-2 font-weight-bold small">
                      <i className="fas fa-sitemap mr-1"></i> {selectedRoleObj.name}
                    </span>
                  )}
                </div>
                <p className="text-muted small mb-0">
                  Select a hospital department to configure which modules and submodules are accessible. Saves directly to PostgreSQL.
                </p>
              </div>

              {/* Primary Action Button */}
              <div className="flex-shrink-0">
                <button
                  className="btn btn-success font-weight-bold px-3 py-2 shadow-sm d-inline-flex align-items-center"
                  style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                  onClick={handleSavePermissionsToDatabase}
                  disabled={savingMatrix}
                >
                  {savingMatrix ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i> Saving to Database...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i> Save Department Permissions
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sub-bar: Target Department Selector & Quick Selection Buttons */}
          <div className="px-4 py-2.5 bg-light border-bottom">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
              <div className="d-flex align-items-center mb-2 mb-md-0" style={{ gap: '10px' }}>
                <span className="font-weight-bold text-gray-700 small" style={{ whiteSpace: 'nowrap' }}>
                  <i className="fas fa-building text-muted mr-1.5"></i> Target Department:
                </span>
                <select
                  className="custom-select custom-select-sm font-weight-bold text-dark border-secondary shadow-sm"
                  style={{ minWidth: '240px', height: '34px', fontSize: '0.86rem', borderRadius: '6px' }}
                  value={selectedRoleId || ''}
                  onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.is_system ? '(Core Leadership)' : '(Department)'}
                    </option>
                  ))}
                </select>
                {selectedRoleObj?.description && (
                  <span
                    className="text-muted small d-none d-lg-inline ml-2"
                    style={{ maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {selectedRoleObj.description}
                  </span>
                )}
              </div>

              <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-white border font-weight-bold text-dark d-inline-flex align-items-center px-2.5 py-1"
                  style={{ borderRadius: '6px', fontSize: '0.8rem', backgroundColor: '#ffffff' }}
                  onClick={handleSelectAllInMatrix}
                >
                  <i className="fas fa-check-double text-primary mr-1.5"></i> Select All
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-white border font-weight-bold text-dark d-inline-flex align-items-center px-2.5 py-1"
                  style={{ borderRadius: '6px', fontSize: '0.8rem', backgroundColor: '#ffffff' }}
                  onClick={handleDeselectAllInMatrix}
                >
                  <i className="fas fa-times text-danger mr-1.5"></i> Deselect All
                </button>
              </div>
            </div>
          </div>

          <div className="card-body p-4 bg-light">
            <div className="alert alert-info border-info py-2 px-3 small d-flex align-items-center mb-4">
              <i className="fas fa-info-circle mr-2 fa-lg"></i>
              <div>
                Assign modules and specific submodules to the <strong>{selectedRoleObj?.name}</strong> department. Staff assigned to this department will <strong>only</strong> have access to the modules and submodules checked below.
              </div>
            </div>

            <div className="row">
              {modules.map((m) => {
                const isModChecked = assignedModuleIds.has(m.id);
                const totalSubs = m.submodules?.length || 0;
                const checkedSubsCount = (m.submodules || []).filter((s) => assignedSubmoduleIds.has(s.id)).length;

                return (
                  <div key={m.id} className="col-lg-6 col-xl-4 mb-4">
                    <div
                      className={`card h-100 shadow-sm transition-all ${
                        isModChecked ? 'border-primary' : 'border-light'
                      }`}
                      style={{
                        borderRadius: '8px',
                        backgroundColor: isModChecked ? '#ffffff' : '#fdfdfd',
                        borderLeft: `4px solid ${isModChecked ? m.color || '#4e73df' : '#cbd5e1'} !important`,
                      }}
                    >
                      {/* Module Header Card with Master Checkbox */}
                      <div
                        className="card-header py-2.5 px-3 d-flex justify-content-between align-items-center"
                        style={{ backgroundColor: isModChecked ? 'rgba(78, 115, 223, 0.08)' : '#f8f9fc' }}
                      >
                        <div className="custom-control custom-checkbox d-flex align-items-center">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id={`mod-check-${m.id}`}
                            checked={isModChecked}
                            onChange={() => handleToggleModuleInMatrix(m)}
                          />
                          <label
                            className="custom-control-label font-weight-bold text-dark cursor-pointer d-flex align-items-center"
                            htmlFor={`mod-check-${m.id}`}
                          >
                            <i className={`fas ${m.icon || 'fa-cubes'} mr-2`} style={{ color: m.color || '#4e73df' }}></i>
                            <span>{m.name}</span>
                          </label>
                        </div>

                        <span
                          className={`badge ${
                            isModChecked ? 'badge-primary' : 'badge-light border text-muted'
                          } small font-weight-bold`}
                        >
                          {checkedSubsCount}/{totalSubs}
                        </span>
                      </div>

                      {/* Submodule Checkboxes Body */}
                      <div className="card-body p-3">
                        {totalSubs === 0 ? (
                          <div className="text-muted small font-italic">No submodules configured under this module.</div>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            {m.submodules.map((s) => {
                              const isSubChecked = assignedSubmoduleIds.has(s.id);

                              return (
                                <div key={s.id} className="custom-control custom-checkbox py-1">
                                  <input
                                    type="checkbox"
                                    className="custom-control-input"
                                    id={`sub-check-${s.id}`}
                                    checked={isSubChecked}
                                    onChange={() => handleToggleSubmoduleInMatrix(m, s)}
                                  />
                                  <label
                                    className={`custom-control-label small cursor-pointer ${
                                      isSubChecked ? 'font-weight-bold text-gray-800' : 'text-muted'
                                    }`}
                                    htmlFor={`sub-check-${s.id}`}
                                  >
                                    <i className={`fas ${s.icon || 'fa-circle'} mr-1.5 text-xs text-muted`}></i>
                                    {s.name}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. STAFF DEPARTMENT ASSIGNMENTS TAB                                       */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '10px', overflow: 'hidden' }}>
          {/* Primary Header */}
          <div className="card-header bg-white py-3.5 px-4 border-bottom">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
              <div className="mb-2 mb-md-0">
                <div className="d-flex align-items-center mb-1">
                  <h5 className="font-weight-bold text-gray-800 mb-0" style={{ letterSpacing: '-0.2px' }}>
                    Staff Department &amp; Permission Assignment
                  </h5>
                  <span className="badge badge-light border text-muted px-2 py-0.5 ml-2 font-weight-normal small">
                    {staffList.length} Total Personnel
                  </span>
                </div>
                <p className="text-muted small mb-0">
                  Assign registered hospital personnel to their authorized department in PostgreSQL. When assigned to a department, staff immediately inherit that department's modules and submodules.
                </p>
              </div>
            </div>
          </div>

          {/* Dedicated Filter Sub-bar */}
          <div className="px-4 py-2.5 bg-light border-bottom">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
              <div className="d-flex flex-wrap align-items-center mb-2 mb-md-0" style={{ gap: '10px' }}>
                <div className="input-group input-group-sm" style={{ width: '260px' }}>
                  <div className="input-group-prepend">
                    <span className="input-group-text bg-white border-right-0 text-muted">
                      <i className="fas fa-search text-xs"></i>
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-control bg-white border-left-0"
                    placeholder="Search staff by name, ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  {userSearch && (
                    <div className="input-group-append">
                      <button
                        className="btn btn-outline-secondary border-left-0 bg-white"
                        type="button"
                        onClick={() => setUserSearch('')}
                      >
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    </div>
                  )}
                </div>

                <select
                  className="custom-select custom-select-sm"
                  style={{ width: '200px', borderRadius: '6px' }}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="ALL">All Departments ({roles.length})</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-muted small">
                Showing <strong className="text-dark">{filteredStaff.length}</strong> of <strong>{staffList.length}</strong> staff members
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="thead-light">
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Staff User</th>
                    <th>Staff ID</th>
                    <th>Email</th>
                    <th>Assigned Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        No staff members match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((u, idx) => (
                      <tr key={u.id}>
                        <td className="text-muted font-weight-bold pl-3">{idx + 1}</td>
                        <td>
                          <div className="font-weight-bold text-dark">{u.fullname || u.username}</div>
                          <div className="text-muted text-xs">@{u.username}</div>
                        </td>
                        <td>
                          <span className="badge badge-light border font-mono">{u.username}</span>
                        </td>
                        <td className="text-muted small">{u.email || '-'}</td>
                        <td style={{ minWidth: '220px' }}>
                          <select
                            className="custom-select custom-select-sm font-weight-bold text-primary"
                            value={u.role_id || ''}
                            onChange={(e) => handleAssignUserRole(u.id, Number(e.target.value))}
                          >
                            <option value="" disabled>
                              -- Select Department --
                            </option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <span className={`badge ${u.active === '1' ? 'badge-success' : 'badge-danger'} px-2 py-1`}>
                            {u.active === '1' ? 'Active' : 'Inactive'}
                          </span>
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

      {/* ========================================================================= */}
      {/* MODALS: Department Modal                                                  */}
      {/* ========================================================================= */}
      {isRoleModalOpen && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow-lg border-0">
                <div className="modal-header bg-primary text-white py-3">
                  <h5 className="modal-title font-weight-bold">
                    <i className="fas fa-sitemap mr-2"></i>
                    {editingRole ? 'Edit Hospital Department' : 'Add New Hospital Department'}
                  </h5>
                  <button type="button" className="close text-white" onClick={() => setIsRoleModalOpen(false)}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleSaveRole}>
                  <div className="modal-body p-4">
                    <div className="form-group mb-3">
                      <label className="font-weight-bold text-gray-700 small">Department Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Front Desk, Nursing, Clinical & Consultations, IPD Pharmacy 1, Laboratory"
                        required
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="font-weight-bold text-gray-700 small">Description</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Brief summary of duties and clinical scope for this department..."
                        value={roleForm.description}
                        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-footer bg-light py-2 px-4">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsRoleModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm font-weight-bold px-3">
                      <i className="fas fa-save mr-1"></i> Save Department to Database
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODALS: Module Modal                                                     */}
      {/* ========================================================================= */}
      {isModuleModalOpen && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1050, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)' }}
          ></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1060 }}>
            <div
              className="modal-dialog modal-dialog-centered"
              style={{ maxWidth: '640px', maxHeight: '90vh', margin: '1.5rem auto' }}
            >
              <div
                className="modal-content border-0 shadow-lg"
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  maxHeight: '90vh',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Modal Header */}
                <div
                  className="modal-header py-3 px-4 text-white d-flex align-items-center justify-content-between flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
                  }}
                >
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center mr-3 shadow-sm flex-shrink-0"
                      style={{
                        width: '42px',
                        height: '42px',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(4px)',
                        color: '#ffffff',
                        fontSize: '18px'
                      }}
                    >
                      <i className={`fas ${editingModule ? 'fa-edit' : 'fa-cubes'}`}></i>
                    </div>
                    <div>
                      <h5 className="modal-title font-weight-bold mb-0 text-white" style={{ fontSize: '1.2rem', letterSpacing: '0.3px' }}>
                        {editingModule ? 'Edit System Module' : 'Create New System Module'}
                      </h5>
                      <div className="text-white-50 small mt-0.5" style={{ fontSize: '0.8rem' }}>
                        Define top-level hospital workspace module, tabs, and brand accent
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm d-flex align-items-center justify-content-center text-white"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.18)',
                      border: 'none',
                      fontSize: '14px',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => setIsModuleModalOpen(false)}
                    aria-label="Close"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSaveModule}
                  style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
                >
                  <div
                    className="modal-body p-4"
                    style={{ backgroundColor: '#fbfcfd', flex: 1, overflowY: 'auto', minHeight: 0 }}
                  >
                    <div className="row">
                      <div className="col-md-7 form-group mb-3">
                        <label className="font-weight-bold text-gray-700 small mb-1">
                          Module Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ borderRadius: '8px', borderColor: '#cbd5e1', height: '40px' }}
                          placeholder="e.g. Dental Care Clinic"
                          required
                          value={moduleForm.name}
                          onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-5 form-group mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="font-weight-bold text-gray-700 small mb-0">
                            Unique Code <span className="text-danger">*</span>
                          </label>
                          {editingModule && (
                            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                              <i className="fas fa-lock mr-1 text-muted"></i>Read-only
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          className="form-control font-mono"
                          style={{
                            borderRadius: '8px',
                            borderColor: '#cbd5e1',
                            height: '40px',
                            backgroundColor: editingModule ? '#f1f5f9' : '#ffffff',
                            color: editingModule ? '#475569' : 'inherit'
                          }}
                          placeholder="e.g. dental"
                          required
                          disabled={!!editingModule}
                          value={moduleForm.code}
                          onChange={(e) => setModuleForm({ ...moduleForm, code: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 form-group mb-3">
                        <label className="font-weight-bold text-gray-700 small mb-1">FontAwesome Icon</label>
                        <div className="input-group input-group-sm">
                          <div className="input-group-prepend">
                            <span
                              className="input-group-text border-right-0 text-white"
                              style={{
                                borderRadius: '7px 0 0 7px',
                                borderColor: '#cbd5e1',
                                backgroundColor: moduleForm.color || '#2563eb',
                                width: '38px',
                                justifyContent: 'center'
                              }}
                            >
                              <i className={`fas ${moduleForm.icon || 'fa-cubes'}`}></i>
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-control form-control-sm border-left-0"
                            style={{ borderRadius: '0 7px 7px 0', borderColor: '#cbd5e1', height: '36px' }}
                            placeholder="fa-tooth, fa-clinic-medical"
                            value={moduleForm.icon}
                            onChange={(e) => setModuleForm({ ...moduleForm, icon: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="col-md-6 form-group mb-3">
                        <label className="font-weight-bold text-gray-700 small mb-1">Accent Brand Color</label>
                        <div className="d-flex align-items-center">
                          <input
                            type="color"
                            className="form-control form-control-color mr-2 shadow-sm"
                            value={moduleForm.color}
                            onChange={(e) => setModuleForm({ ...moduleForm, color: e.target.value })}
                            style={{ width: '42px', height: '36px', padding: '2px', borderRadius: '7px', cursor: 'pointer' }}
                          />
                          <input
                            type="text"
                            className="form-control form-control-sm font-mono"
                            style={{ borderRadius: '7px', borderColor: '#cbd5e1', height: '36px' }}
                            value={moduleForm.color}
                            onChange={(e) => setModuleForm({ ...moduleForm, color: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group mb-3">
                      <label className="font-weight-bold text-gray-700 small mb-1">Primary Workspace Tab Key</label>
                      <input
                        type="text"
                        className="form-control form-control-sm font-mono"
                        style={{ borderRadius: '7px', borderColor: '#cbd5e1', height: '36px' }}
                        placeholder="e.g. patients, queues, billings, dental"
                        value={moduleForm.primary_tab}
                        onChange={(e) => setModuleForm({ ...moduleForm, primary_tab: e.target.value })}
                      />
                      <small className="form-text text-muted mt-1" style={{ fontSize: '0.78rem' }}>
                        The default active tab triggered when staff clicks this module in top navigation.
                      </small>
                    </div>

                    <div className="form-group mb-0">
                      <label className="font-weight-bold text-gray-700 small mb-1">Description (Optional)</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        style={{ borderRadius: '8px', borderColor: '#cbd5e1', fontSize: '0.85rem' }}
                        placeholder="Purpose and clinical capabilities of this hospital module..."
                        value={moduleForm.description}
                        onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div
                    className="modal-footer py-3 px-4 d-flex justify-content-between align-items-center flex-shrink-0"
                    style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', zIndex: 10 }}
                  >
                    <button
                      type="button"
                      className="btn btn-light border text-muted px-3"
                      style={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}
                      onClick={() => setIsModuleModalOpen(false)}
                    >
                      <i className="fas fa-times mr-1.5"></i> Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn text-white px-4 font-weight-bold shadow-sm"
                      style={{
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        border: 'none',
                        padding: '8px 22px'
                      }}
                    >
                      <i className="fas fa-check-circle mr-1.5"></i> Save Module to Database
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODALS: Submodule Modal                                                  */}
      {/* ========================================================================= */}
      {isSubmoduleModalOpen && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1050, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)' }}
          ></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1060 }}>
            <div
              className="modal-dialog modal-dialog-centered"
              style={{ maxWidth: '680px', maxHeight: '90vh', margin: '1.5rem auto' }}
            >
              <div
                className="modal-content border-0 shadow-lg"
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  maxHeight: '90vh',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Modal Header */}
                <div
                  className="modal-header py-3 px-4 text-white d-flex align-items-center justify-content-between flex-shrink-0"
                  style={{
                    background: editingSubmodule
                      ? 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)'
                      : 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
                  }}
                >
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center mr-3 shadow-sm flex-shrink-0"
                      style={{
                        width: '42px',
                        height: '42px',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(4px)',
                        color: '#ffffff',
                        fontSize: '18px'
                      }}
                    >
                      <i className={`fas ${editingSubmodule ? 'fa-sliders-h' : 'fa-plus-circle'}`}></i>
                    </div>
                    <div>
                      <h5 className="modal-title font-weight-bold mb-0 text-white" style={{ fontSize: '1.2rem', letterSpacing: '0.3px' }}>
                        {editingSubmodule ? 'Edit Submodule' : 'Create New Submodule'}
                      </h5>
                      <div className="text-white-50 small mt-0.5" style={{ fontSize: '0.8rem' }}>
                        {editingSubmodule
                          ? 'Reassign parent module, manage route links, and configure workspace tabs'
                          : 'Register a new submodule navigation item under any system module'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm d-flex align-items-center justify-content-center text-white"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.18)',
                      border: 'none',
                      fontSize: '14px',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => setIsSubmoduleModalOpen(false)}
                    aria-label="Close"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSaveSubmodule}
                  style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
                >
                  <div
                    className="modal-body p-4"
                    style={{ backgroundColor: '#fbfcfd', flex: 1, overflowY: 'auto', minHeight: 0 }}
                  >
                    {/* SECTION 1: Parent Module Box */}
                    <div
                      className="p-3 mb-3 rounded shadow-sm"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderLeft: '4px solid #0d9488'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="font-weight-bold text-gray-800 small mb-0 d-flex align-items-center">
                          <i className="fas fa-sitemap mr-2" style={{ color: '#0d9488' }}></i>
                          Parent System Module <span className="text-danger ml-1">*</span>
                        </label>
                        {editingSubmodule ? (
                          <span
                            className="badge px-2.5 py-1"
                            style={{
                              backgroundColor: '#f0fdfa',
                              color: '#0f766e',
                              border: '1px solid #ccfbf1',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              borderRadius: '20px'
                            }}
                          >
                            <i className="fas fa-exchange-alt mr-1"></i> Reassign to any module
                          </span>
                        ) : (
                          <span className="badge badge-light border text-muted small" style={{ borderRadius: '20px' }}>
                            Top-Level Container
                          </span>
                        )}
                      </div>
                      <select
                        className="custom-select font-weight-bold"
                        required
                        style={{
                          height: '42px',
                          fontSize: '0.92rem',
                          borderColor: '#cbd5e1',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff'
                        }}
                        value={submoduleForm.module_id}
                        onChange={(e) => setSubmoduleForm({ ...submoduleForm, module_id: Number(e.target.value) })}
                      >
                        <option value="" disabled>-- Select Target Parent Module --</option>
                        {modules.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.code})
                          </option>
                        ))}
                      </select>
                      <div className="d-flex align-items-center mt-2 text-muted" style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                        <i className="fas fa-info-circle mr-1.5 flex-shrink-0" style={{ color: '#0d9488' }}></i>
                        <span>
                          {editingSubmodule
                            ? 'Reassigning moves this submodule to the chosen parent module and automatically migrates department role permissions.'
                            : 'Select which parent system module this submodule will appear under in navigation.'}
                        </span>
                      </div>
                    </div>

                    {/* SECTION 2: Identity (Name & Code) */}
                    <div className="row">
                      <div className="col-md-7 form-group mb-3">
                        <label className="font-weight-bold text-gray-700 small mb-1">
                          Submodule Display Name <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span
                              className="input-group-text bg-white border-right-0 text-muted"
                              style={{ borderRadius: '8px 0 0 8px', borderColor: '#cbd5e1' }}
                            >
                              <i className="fas fa-heading" style={{ fontSize: '0.85rem' }}></i>
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-control border-left-0"
                            style={{ borderRadius: '0 8px 8px 0', borderColor: '#cbd5e1', height: '40px' }}
                            placeholder="e.g. Tooth Extraction Records"
                            required
                            value={submoduleForm.name}
                            onChange={(e) => setSubmoduleForm({ ...submoduleForm, name: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="col-md-5 form-group mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="font-weight-bold text-gray-700 small mb-0">
                            Unique Code <span className="text-danger">*</span>
                          </label>
                          {editingSubmodule && (
                            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                              <i className="fas fa-lock mr-1 text-muted"></i>Read-only
                            </span>
                          )}
                        </div>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span
                              className="input-group-text border-right-0 text-muted"
                              style={{
                                borderRadius: '8px 0 0 8px',
                                borderColor: '#cbd5e1',
                                backgroundColor: editingSubmodule ? '#f1f5f9' : '#ffffff'
                              }}
                            >
                              <i className="fas fa-key" style={{ fontSize: '0.85rem' }}></i>
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-control font-mono border-left-0"
                            style={{
                              borderRadius: '0 8px 8px 0',
                              borderColor: '#cbd5e1',
                              height: '40px',
                              backgroundColor: editingSubmodule ? '#f1f5f9' : '#ffffff',
                              color: editingSubmodule ? '#475569' : 'inherit'
                            }}
                            placeholder="e.g. dtExtraction"
                            required
                            disabled={!!editingSubmodule}
                            value={submoduleForm.code}
                            onChange={(e) => setSubmoduleForm({ ...submoduleForm, code: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: Target Page Route Selection */}
                    <div
                      className="p-3 mb-3.5 rounded shadow-sm"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px'
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                        <label className="font-weight-bold text-gray-800 small mb-0 d-flex align-items-center">
                          <i className="fas fa-route text-success mr-2"></i> Target Page Route (Frontend URL)
                        </label>
                        <span
                          className="badge px-2.5 py-1"
                          style={{
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            borderRadius: '20px'
                          }}
                        >
                          <i className="fas fa-bolt mr-1"></i> Direct Route Access
                        </span>
                      </div>

                      <div className="form-group mb-2.5">
                        <label className="text-gray-600 small font-weight-bold mb-1" style={{ fontSize: '0.78rem' }}>
                          Quick Select from Registered Application Pages:
                        </label>
                        <select
                          className="custom-select custom-select-sm"
                          style={{ borderRadius: '7px', borderColor: '#cbd5e1', height: '36px', fontSize: '0.84rem' }}
                          value={submoduleForm.route || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = APP_ROUTES.find((r) => r.route === val);
                            if (found) {
                              setSubmoduleForm({
                                ...submoduleForm,
                                route: found.route,
                                tab_key: found.tab,
                                sub_tab: found.subTab || '',
                                sub_sub_tab: found.subSubTab || '',
                                icon: submoduleForm.icon && submoduleForm.icon !== 'fa-circle' ? submoduleForm.icon : (found.icon || 'fa-circle'),
                              });
                            } else {
                              setSubmoduleForm({ ...submoduleForm, route: val });
                            }
                          }}
                        >
                          <option value="">-- Choose Registered Preset or Enter Custom Route Below --</option>
                          {APP_ROUTES.map((r) => (
                            <option key={r.id} value={r.route}>
                              {r.route} &mdash; [{r.module}] {r.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group mb-1">
                        <label className="text-gray-600 small font-weight-bold mb-1" style={{ fontSize: '0.78rem' }}>
                          Exact Route URL Path:
                        </label>
                        <div className="input-group input-group-sm">
                          <div className="input-group-prepend">
                            <span
                              className="input-group-text font-mono bg-light text-muted font-weight-bold"
                              style={{ borderRadius: '7px 0 0 7px', borderColor: '#cbd5e1' }}
                            >
                              #
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-control form-control-sm font-mono border-left-0"
                            style={{ borderRadius: '0 7px 7px 0', borderColor: '#cbd5e1', height: '36px', fontSize: '0.86rem' }}
                            placeholder="e.g. /patients/register, /appointments/today"
                            value={submoduleForm.route || ''}
                            onChange={(e) => setSubmoduleForm({ ...submoduleForm, route: e.target.value })}
                          />
                        </div>
                        <div className="text-muted mt-1.5" style={{ fontSize: '0.75rem' }}>
                          <i className="fas fa-external-link-alt mr-1 text-muted"></i>
                          When staff in an assigned department clicks this submodule, this route will immediately open the page.
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: Navigation Tabs & Icon */}
                    <div className="row">
                      <div className="col-md-6 form-group mb-3">
                        <label className="font-weight-bold text-gray-700 small mb-1">Workspace Tab Key</label>
                        <div className="input-group input-group-sm">
                          <div className="input-group-prepend">
                            <span
                              className="input-group-text bg-white border-right-0 text-muted"
                              style={{ borderRadius: '7px 0 0 7px', borderColor: '#cbd5e1' }}
                            >
                              <i className="fas fa-folder" style={{ fontSize: '0.8rem' }}></i>
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-control form-control-sm font-mono border-left-0"
                            style={{ borderRadius: '0 7px 7px 0', borderColor: '#cbd5e1', height: '36px' }}
                            placeholder="e.g. queues, patients"
                            value={submoduleForm.tab_key}
                            onChange={(e) => setSubmoduleForm({ ...submoduleForm, tab_key: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="col-md-6 form-group mb-3">
                        <label className="font-weight-bold text-gray-700 small mb-1">FontAwesome Icon</label>
                        <div className="input-group input-group-sm">
                          <div className="input-group-prepend">
                            <span
                              className="input-group-text border-right-0 text-white"
                              style={{
                                borderRadius: '7px 0 0 7px',
                                borderColor: '#cbd5e1',
                                backgroundColor: '#0d9488',
                                width: '38px',
                                justifyContent: 'center'
                              }}
                            >
                              <i className={`fas ${submoduleForm.icon || 'fa-circle'}`}></i>
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-control form-control-sm border-left-0"
                            style={{ borderRadius: '0 7px 7px 0', borderColor: '#cbd5e1', height: '36px' }}
                            placeholder="fa-user-injured, fa-stethoscope"
                            value={submoduleForm.icon}
                            onChange={(e) => setSubmoduleForm({ ...submoduleForm, icon: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 5: Sub-Tab & Order */}
                    <div className="row">
                      <div className="col-md-6 form-group mb-3">
                        <label className="font-weight-bold text-gray-700 small mb-1">Sub-Tab Key (Optional)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm font-mono"
                          style={{ borderRadius: '7px', borderColor: '#cbd5e1', height: '36px' }}
                          placeholder="e.g. ambulatory, today"
                          value={submoduleForm.sub_tab}
                          onChange={(e) => setSubmoduleForm({ ...submoduleForm, sub_tab: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6 form-group mb-3">
                        <label className="font-weight-bold text-gray-700 small mb-1">Display Order Priority</label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          style={{ borderRadius: '7px', borderColor: '#cbd5e1', height: '36px' }}
                          value={submoduleForm.order}
                          onChange={(e) => setSubmoduleForm({ ...submoduleForm, order: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* SECTION 6: Description */}
                    <div className="form-group mb-0">
                      <label className="font-weight-bold text-gray-700 small mb-1">Description (Optional)</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        style={{ borderRadius: '8px', borderColor: '#cbd5e1', fontSize: '0.85rem' }}
                        placeholder="Brief description of this submodule and user actions..."
                        value={submoduleForm.description}
                        onChange={(e) => setSubmoduleForm({ ...submoduleForm, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div
                    className="modal-footer py-3 px-4 d-flex justify-content-between align-items-center flex-shrink-0"
                    style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', zIndex: 10 }}
                  >
                    <button
                      type="button"
                      className="btn btn-light border text-muted px-3"
                      style={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}
                      onClick={() => setIsSubmoduleModalOpen(false)}
                    >
                      <i className="fas fa-times mr-1.5"></i> Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn text-white px-4 font-weight-bold shadow-sm"
                      style={{
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                        border: 'none',
                        padding: '8px 22px'
                      }}
                    >
                      <i className="fas fa-check-circle mr-1.5"></i> Save Submodule to Database
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Department Overview (Modules & Submodules View)                    */}
      {/* ========================================================================= */}
      {activeViewingDepartment && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1050 }}
            onClick={() => setViewingDepartment(null)}
          ></div>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ zIndex: 1060 }}
            onClick={(e) => {
              if (e.target.classList && e.target.classList.contains('modal')) {
                setViewingDepartment(null);
              }
            }}
          >
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '960px' }}>
              <div className="modal-content shadow-lg border-0" style={{ borderRadius: '14px', overflow: 'hidden' }}>
                {/* Modal Header */}
                <div
                  className="modal-header py-3 px-4 text-white d-flex align-items-center justify-content-between"
                  style={{
                    background: activeViewingDepartment.is_system
                      ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                      : 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center mr-3 shadow-sm flex-shrink-0"
                      style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        color: '#ffffff',
                        fontSize: '20px'
                      }}
                    >
                      <i className={`fas ${activeViewingDepartment.is_system ? 'fa-shield-alt' : 'fa-building'}`}></i>
                    </div>
                    <div>
                      <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                        <h5 className="modal-title font-weight-bold mb-0 text-white" style={{ fontSize: '1.25rem' }}>
                          {activeViewingDepartment.name}
                        </h5>
                        {activeViewingDepartment.is_system ? (
                          <span
                            className="badge badge-warning text-dark font-weight-bold"
                            style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px' }}
                          >
                            <i className="fas fa-lock mr-1"></i> Core Leadership
                          </span>
                        ) : (
                          <span
                            className="badge badge-info font-weight-bold"
                            style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px' }}
                          >
                            <i className="fas fa-hospital mr-1"></i> Department
                          </span>
                        )}
                      </div>
                      <div className="text-white-50 small mt-0.5">
                        {activeViewingDepartment.description || 'Assigned hospital modules, submodules, and navigation views for this department'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="close text-white"
                    style={{ opacity: 0.85, fontSize: '1.6rem', textShadow: 'none' }}
                    onClick={() => setViewingDepartment(null)}
                  >
                    <span>&times;</span>
                  </button>
                </div>

                {/* Sub-header / Stats and Search Bar */}
                <div className="bg-light border-bottom px-4 py-3">
                  <div className="d-flex flex-wrap align-items-center justify-content-between" style={{ gap: '12px' }}>
                    <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                      <span
                        className="badge badge-primary font-weight-bold px-3 py-1.5"
                        style={{ fontSize: '0.82rem', borderRadius: '9999px' }}
                      >
                        <i className="fas fa-cubes mr-1.5"></i>
                        {activeViewingDepartment.modules?.length || 0} Modules Assigned
                      </span>
                      <span
                        className="badge text-white font-weight-bold px-3 py-1.5"
                        style={{ fontSize: '0.82rem', borderRadius: '9999px', backgroundColor: '#6d28d9' }}
                      >
                        <i className="fas fa-layer-group mr-1.5"></i>
                        {viewingDeptSubmodulesCount} Submodules Permitted
                      </span>
                      <span
                        className="badge badge-success font-weight-bold px-3 py-1.5"
                        style={{ fontSize: '0.82rem', borderRadius: '9999px' }}
                      >
                        <i className="fas fa-users mr-1.5"></i>
                        {activeViewingDepartment.user_count || 0} Staff
                      </span>
                    </div>

                    <div className="d-flex align-items-center" style={{ gap: '10px', minWidth: '280px' }}>
                      <div className="input-group input-group-sm">
                        <div className="input-group-prepend">
                          <span className="input-group-text bg-white border-right-0">
                            <i className="fas fa-search text-muted"></i>
                          </span>
                        </div>
                        <input
                          type="text"
                          className="form-control form-control-sm border-left-0"
                          placeholder="Search modules, submodules, routes..."
                          value={deptModalSearch}
                          onChange={(e) => setDeptModalSearch(e.target.value)}
                        />
                        {deptModalSearch && (
                          <div className="input-group-append">
                            <button
                              className="btn btn-outline-secondary btn-sm bg-white border-left-0"
                              onClick={() => setDeptModalSearch('')}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Body: Modules & Submodules List */}
                <div className="modal-body p-4" style={{ backgroundColor: '#f8fafc', maxHeight: '65vh', overflowY: 'auto' }}>
                  {filteredDepartmentModules.length === 0 ? (
                    <div className="text-center py-5 bg-white rounded shadow-sm border p-4 my-2">
                      <div
                        className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                        style={{ width: '64px', height: '64px', backgroundColor: '#f1f5f9', color: '#94a3b8' }}
                      >
                        <i className="fas fa-folder-open fa-2x"></i>
                      </div>
                      <h5 className="font-weight-bold text-gray-800 mb-1">
                        {deptModalSearch
                          ? `No modules or submodules match "${deptModalSearch}"`
                          : 'No Modules Currently Assigned'}
                      </h5>
                      <p className="text-muted small mb-3" style={{ maxWidth: '450px', margin: '0 auto' }}>
                        {deptModalSearch
                          ? 'Try adjusting your search query or clear the filter to view all assigned items.'
                          : `Staff in ${activeViewingDepartment.name} do not currently have any module access configured.`}
                      </p>
                      {deptModalSearch ? (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setDeptModalSearch('')}
                        >
                          Clear Search Filter
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-success font-weight-bold px-3 shadow-sm"
                          onClick={() => {
                            setSelectedRoleId(activeViewingDepartment.id);
                            setActiveTab('matrix');
                            setViewingDepartment(null);
                          }}
                        >
                          <i className="fas fa-key mr-1.5"></i> Open Permissions Matrix to Assign
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="d-flex flex-column" style={{ gap: '18px' }}>
                      {filteredDepartmentModules.map((mod, modIdx) => {
                        const subs = mod.submodules || [];
                        return (
                          <div
                            key={mod.id || modIdx}
                            className="bg-white rounded shadow-sm border"
                            style={{
                              borderRadius: '10px',
                              overflow: 'hidden',
                              borderLeft: `5px solid ${mod.color || '#4e73df'}`
                            }}
                          >
                            {/* Module Header Bar */}
                            <div
                              className="px-4 py-3 d-flex flex-wrap align-items-center justify-content-between border-bottom"
                              style={{ backgroundColor: '#ffffff' }}
                            >
                              <div className="d-flex align-items-center">
                                <div
                                  className="rounded d-flex align-items-center justify-content-center mr-3 flex-shrink-0 shadow-xs"
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    backgroundColor: `${mod.color || '#4e73df'}15`,
                                    color: mod.color || '#4e73df',
                                    fontSize: '17px',
                                    borderRadius: '8px'
                                  }}
                                >
                                  <i className={`fas ${getSafeIcon(mod.icon)}`}></i>
                                </div>
                                <div>
                                  <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                                    <h6 className="font-weight-bold mb-0 text-gray-900" style={{ fontSize: '1.02rem' }}>
                                      {mod.name}
                                    </h6>
                                    <span
                                      className="font-mono text-muted small"
                                      style={{
                                        backgroundColor: '#f1f5f9',
                                        padding: '1px 7px',
                                        borderRadius: '5px',
                                        fontSize: '0.72rem',
                                        fontWeight: '600'
                                      }}
                                    >
                                      {mod.code}
                                    </span>
                                  </div>
                                  {mod.description && (
                                    <div className="text-muted small mt-0.5" style={{ fontSize: '0.8rem' }}>
                                      {mod.description}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="d-flex align-items-center mt-2 mt-sm-0" style={{ gap: '8px' }}>
                                <span
                                  className="badge badge-light border text-muted"
                                  style={{ fontSize: '0.75rem', padding: '4px 9px', borderRadius: '6px' }}
                                >
                                  <i className="fas fa-desktop mr-1 text-primary"></i>
                                  Tab: <span className="font-mono font-weight-bold text-dark">{mod.primary_tab || 'default'}</span>
                                </span>
                                <span
                                  className="badge font-weight-bold"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: `${mod.color || '#4e73df'}20`,
                                    color: mod.color || '#4e73df'
                                  }}
                                >
                                  <i className="fas fa-layer-group mr-1"></i>
                                  {subs.length} {subs.length === 1 ? 'submodule' : 'submodules'}
                                </span>
                              </div>
                            </div>

                            {/* Submodules Grid */}
                            <div className="p-3" style={{ backgroundColor: '#fafbfc' }}>
                              {subs.length === 0 ? (
                                <div className="text-muted small py-2 px-3 font-italic">
                                  No submodules currently assigned under this module.
                                </div>
                              ) : (
                                <div className="row no-gutters" style={{ margin: '-5px' }}>
                                  {subs.map((sub, sIdx) => (
                                    <div key={sub.id || sIdx} className="col-12 col-md-6 col-lg-4 p-1.5">
                                      <div
                                        className="h-100 p-2.5 rounded bg-white border shadow-xs d-flex flex-column justify-content-between"
                                        style={{
                                          borderRadius: '8px',
                                          transition: 'all 0.15s ease',
                                          border: '1px solid #e2e8f0'
                                        }}
                                      >
                                        <div>
                                          <div className="d-flex align-items-start justify-content-between mb-1.5">
                                            <div className="d-flex align-items-center" style={{ gap: '8px', minWidth: 0 }}>
                                              <span
                                                className="text-primary flex-shrink-0 d-inline-flex align-items-center justify-content-center"
                                                style={{
                                                  width: '24px',
                                                  height: '24px',
                                                  borderRadius: '6px',
                                                  backgroundColor: '#eff6ff',
                                                  fontSize: '11px'
                                                }}
                                              >
                                                <i className={`fas ${getSafeIcon(sub.icon)}`}></i>
                                              </span>
                                              <div className="text-truncate font-weight-bold text-gray-900" style={{ fontSize: '0.86rem' }}>
                                                {sub.name}
                                              </div>
                                            </div>
                                            <span
                                              className="font-mono text-muted flex-shrink-0 ml-1"
                                              style={{ fontSize: '0.68rem', backgroundColor: '#f8fafc', padding: '1px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                            >
                                              {sub.code}
                                            </span>
                                          </div>

                                          {sub.description && (
                                            <div className="text-muted small mb-2 line-clamp-2" style={{ fontSize: '0.74rem', lineHeight: '1.3' }}>
                                              {sub.description}
                                            </div>
                                          )}
                                        </div>

                                        <div className="mt-2 pt-2 border-top d-flex flex-wrap align-items-center justify-content-between" style={{ gap: '4px' }}>
                                          {sub.route ? (
                                            <span
                                              className="font-mono text-primary font-weight-bold small d-inline-flex align-items-center text-truncate"
                                              style={{
                                                fontSize: '0.72rem',
                                                backgroundColor: '#eff6ff',
                                                padding: '2px 7px',
                                                borderRadius: '5px',
                                                border: '1px solid #dbeafe',
                                                maxWidth: '100%'
                                              }}
                                              title={`Route URL: ${sub.route}`}
                                            >
                                              <i className="fas fa-link mr-1 text-primary" style={{ fontSize: '0.65rem' }}></i>
                                              {sub.route}
                                            </span>
                                          ) : (
                                            <span
                                              className="text-muted small font-italic"
                                              style={{ fontSize: '0.70rem' }}
                                            >
                                              tab: {sub.tab_key || mod.primary_tab || 'default'}
                                            </span>
                                          )}

                                          {sub.sub_tab && (
                                            <span
                                              className="text-muted font-mono"
                                              style={{ fontSize: '0.68rem', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}
                                            >
                                              {sub.sub_tab}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="modal-footer bg-white border-top px-4 py-3 d-flex align-items-center justify-content-between">
                  <div className="text-muted small d-none d-md-block">
                    <i className="fas fa-info-circle mr-1 text-info"></i>
                    These modules and submodules are currently active for staff members in <strong>{activeViewingDepartment.name}</strong>.
                  </div>
                  <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm px-3"
                      onClick={() => setViewingDepartment(null)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="btn btn-success btn-sm font-weight-bold px-3 shadow-sm d-inline-flex align-items-center"
                      onClick={() => {
                        setSelectedRoleId(activeViewingDepartment.id);
                        setActiveTab('matrix');
                        setViewingDepartment(null);
                      }}
                    >
                      <i className="fas fa-key mr-1.5"></i> Configure Permissions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
