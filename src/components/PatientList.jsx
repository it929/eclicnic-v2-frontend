import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import { showToast } from './Toast';

export default function PatientList({
  patients: initialPatients = [],
  totalCount: initialTotalCount = 0,
  loading: initialLoading = false,
  searchQuery: parentSearchQuery = '',
  setSearchQuery: parentSetSearchQuery,
  selectedCategory: parentSelectedCategory = '',
  setSelectedCategory: parentSetSelectedCategory,
  categories: initialCategories = [],
  onOpenNewPatient,
  onSelectPatient,
  onEditPatient,
  onScheduleAppointment,
  onPatientQueued,
  onNavigateTab,
  currentRole = 'Admin',
  initialFilter = 'all',
}) {
  // Query & Pagination State
  const [search, setSearch] = useState(parentSearchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState(parentSelectedCategory || '');
  const [selectedSponsor, setSelectedSponsor] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(
    initialFilter === 'active' ? '1' : initialFilter === 'inactive' || initialFilter === 'deactivated' ? '0' : ''
  );
  const [todayOnly, setTodayOnly] = useState(initialFilter === 'today');
  const [hasFamilyFolder, setHasFamilyFolder] = useState(initialFilter === 'family' ? 'true' : '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeQuickTab, setActiveQuickTab] = useState(
    initialFilter === 'active'
      ? 'active'
      : initialFilter === 'inactive' || initialFilter === 'deactivated'
      ? 'inactive'
      : initialFilter || 'all'
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data State
  const [patientsList, setPatientsList] = useState(initialPatients);
  const [totalCount, setTotalCount] = useState(initialTotalCount || initialPatients.length);
  const [loading, setLoading] = useState(initialLoading);
  const [categoriesList, setCategoriesList] = useState(initialCategories);
  const [sponsorsList, setSponsorsList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Modals & Action State
  const [queueingId, setQueueingId] = useState(null);
  const [printCardPatient, setPrintCardPatient] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [toggleActiveTarget, setToggleActiveTarget] = useState(null);
  const [togglingActive, setTogglingActive] = useState(false);
  const [toggleReason, setToggleReason] = useState('');

  // Multi-Patient Selection for Bulk Scheduling
  const [selectedPatients, setSelectedPatients] = useState([]);

  const isPatientSelected = (patientId) => selectedPatients.some((p) => p.id === patientId);

  const handleTogglePatient = (patient, e) => {
    if (e) e.stopPropagation();
    setSelectedPatients((prev) => {
      const exists = prev.some((p) => p.id === patient.id);
      if (exists) {
        return prev.filter((p) => p.id !== patient.id);
      } else {
        return [...prev, patient];
      }
    });
  };

  const allPageSelected =
    patientsList.length > 0 &&
    patientsList.every((p) => selectedPatients.some((sp) => sp.id === p.id));
  const somePageSelected =
    patientsList.some((p) => selectedPatients.some((sp) => sp.id === p.id));

  const handleToggleSelectAll = (e) => {
    if (e) e.stopPropagation();
    if (allPageSelected) {
      const pageIds = new Set(patientsList.map((p) => p.id));
      setSelectedPatients((prev) => prev.filter((p) => !pageIds.has(p.id)));
    } else {
      setSelectedPatients((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newAdditions = patientsList.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newAdditions];
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedPatients([]);
  };

  const handleBulkSchedule = () => {
    if (selectedPatients.length === 0) return;
    if (onScheduleAppointment) {
      onScheduleAppointment(selectedPatients);
    }
  };

  // Fetch Metadata (Categories, Sponsors, Stats)
  const fetchMetadata = useCallback(async () => {
    try {
      setLoadingStats(true);
      const [statsRes, sponsorsRes, catsRes] = await Promise.allSettled([
        api.getPatientDirectoryStats(),
        api.getSponsors(),
        categoriesList.length === 0 ? api.getCategories() : Promise.resolve(categoriesList),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }
      if (sponsorsRes.status === 'fulfilled' && Array.isArray(sponsorsRes.value)) {
        setSponsorsList(sponsorsRes.value);
      }
      if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value) && catsRes.value.length > 0) {
        setCategoriesList(catsRes.value);
      }
    } catch (err) {
      console.error('Failed to load patient directory metadata:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [categoriesList.length]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Fetch Patients with all active filters & pagination
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        page_size: pageSize,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedCategory) params.category = selectedCategory;
      if (selectedSponsor) params.sponsor = selectedSponsor;
      if (selectedGender) params.gender = selectedGender;
      if (selectedStatus !== '') params.active = selectedStatus;
      if (todayOnly) params.today = '1';
      if (hasFamilyFolder) params.has_family_folder = hasFamilyFolder;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.getPatients(params);
      const list = res.results || (Array.isArray(res) ? res : []);
      const count = res.count !== undefined ? res.count : list.length;

      setPatientsList(list);
      setTotalCount(count);
    } catch (err) {
      console.error('Error loading patients list:', err);
      showToast('Failed to load patient directory records.', 'danger', 'Directory Error');
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    search,
    selectedCategory,
    selectedSponsor,
    selectedGender,
    selectedStatus,
    todayOnly,
    hasFamilyFolder,
    dateFrom,
    dateTo,
  ]);

  // Debounced search trigger & filter change trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 280);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  // Handle Quick Tab Switcher
  const handleQuickTabSelect = (tabKey) => {
    setActiveQuickTab(tabKey);
    setCurrentPage(1);

    switch (tabKey) {
      case 'active':
        setTodayOnly(false);
        setSelectedCategory('');
        setHasFamilyFolder('');
        setSelectedStatus('1');
        break;
      case 'inactive':
      case 'deactivated':
        setActiveQuickTab('inactive');
        setTodayOnly(false);
        setSelectedCategory('');
        setHasFamilyFolder('');
        setSelectedStatus('0');
        break;
      case 'today':
        setTodayOnly(true);
        setSelectedCategory('');
        setHasFamilyFolder('');
        setSelectedStatus('');
        break;
      case 'private':
        setTodayOnly(false);
        const privCat = categoriesList.find((c) => c.category?.toLowerCase() === 'private');
        setSelectedCategory(privCat ? String(privCat.id) : '');
        setHasFamilyFolder('');
        setSelectedStatus('');
        break;
      case 'hmo':
        setTodayOnly(false);
        const hmoCat = categoriesList.find((c) => c.category?.toLowerCase() === 'hmo');
        setSelectedCategory(hmoCat ? String(hmoCat.id) : '');
        setHasFamilyFolder('');
        setSelectedStatus('');
        break;
      case 'anc':
        setTodayOnly(false);
        const ancCat = categoriesList.find((c) => c.category?.toLowerCase() === 'anc');
        setSelectedCategory(ancCat ? String(ancCat.id) : '');
        setHasFamilyFolder('');
        setSelectedStatus('');
        break;
      case 'retainership':
        setTodayOnly(false);
        const retCat = categoriesList.find((c) => c.category?.toLowerCase() === 'retainership');
        setSelectedCategory(retCat ? String(retCat.id) : '');
        setHasFamilyFolder('');
        setSelectedStatus('');
        break;
      case 'family':
        setTodayOnly(false);
        setSelectedCategory('');
        setHasFamilyFolder('true');
        setSelectedStatus('');
        break;
      case 'all':
      default:
        setTodayOnly(false);
        setSelectedCategory('');
        setHasFamilyFolder('');
        setSelectedStatus('');
        break;
    }
  };

  // Sync with initialFilter prop if changed from parent
  useEffect(() => {
    if (initialFilter) {
      handleQuickTabSelect(initialFilter);
    }
  }, [initialFilter]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedSponsor('');
    setSelectedGender('');
    setSelectedStatus('');
    setTodayOnly(false);
    setHasFamilyFolder('');
    setDateFrom('');
    setDateTo('');
    setActiveQuickTab('all');
    setCurrentPage(1);
    if (parentSetSearchQuery) parentSetSearchQuery('');
    if (parentSetSelectedCategory) parentSetSelectedCategory('');
  };

  // Toggle Patient Active / Inactive Status
  const handleTogglePatientActive = async () => {
    if (!toggleActiveTarget) return;
    try {
      setTogglingActive(true);
      const res = await api.togglePatientActive(toggleActiveTarget.id);
      showToast(
        res.message || `Patient status updated successfully.`,
        res.active === 1 ? 'success' : 'warning',
        res.active === 1 ? 'Patient Activated' : 'Patient Deactivated'
      );
      setToggleActiveTarget(null);
      setToggleReason('');
      await fetchPatients();
      await fetchMetadata();
    } catch (err) {
      console.error('Error toggling patient active status:', err);
      showToast('Failed to update patient active status. Please try again.', 'danger', 'Operation Failed');
    } finally {
      setTogglingActive(false);
    }
  };

  // Queue Patient for Consultation
  const handleQueuePatient = async (patient) => {
    try {
      setQueueingId(patient.id);
      await api.createQueue({
        patient: patient.id,
        purpose: 'General Consultation',
        visit_type: 'New-case',
      });
      showToast(
        `Patient ${patient.surname} ${patient.first_name} added to Doctor's Waiting List!`,
        'success',
        'Consultation Queue'
      );
      if (onPatientQueued) onPatientQueued();
    } catch (err) {
      showToast(
        err.response?.data?.detail || err.message || 'Error queueing patient',
        'danger',
        'Queue Error'
      );
    } finally {
      setQueueingId(null);
    }
  };

  // Export Patients as CSV with Microsoft Excel UTF-8 BOM
  const handleExportCSV = () => {
    if (!patientsList || patientsList.length === 0) {
      showToast('No patient records available to export.', 'warning', 'Export');
      return;
    }

    const headers = [
      'Hospital MRN',
      'Surname',
      'First Name',
      'Other Name',
      'Gender',
      'Age',
      'Date of Birth',
      'Phone Number',
      'Email Address',
      'Address',
      'Category',
      'Sponsor / HMO',
      'Plan',
      'Insurance Policy ID',
      'Family Folder Number',
      'Family Suffix',
      'Next of Kin Name',
      'Next of Kin Relationship',
      'Emergency Contact Phone',
      'Status',
      'Registration Date',
    ];

    const rows = patientsList.map((p) => [
      `"${p.hospital_number || ''}"`,
      `"${p.surname || ''}"`,
      `"${p.first_name || ''}"`,
      `"${p.other_name || ''}"`,
      `"${p.gender || ''}"`,
      `"${p.age || ''}"`,
      `"${p.dob || ''}"`,
      `"${p.phone_number || ''}"`,
      `"${p.email_address || ''}"`,
      `"${(p.address || '').replace(/"/g, '""')}"`,
      `"${p.category_name || ''}"`,
      `"${p.sponsor_name || ''}"`,
      `"${p.plan_name || ''}"`,
      `"${p.insurance_policy_number || ''}"`,
      `"${p.family_number || ''}"`,
      `"${p.family_member_suffix || ''}"`,
      `"${p.next_of_kin_name || p.full_name || ''}"`,
      `"${p.next_of_kin_relationship || p.relationship_to_patient || ''}"`,
      `"${p.next_of_kin_phone || p.phone_numbers || ''}"`,
      `"${p.active === 1 ? 'Active' : 'Inactive'}"`,
      `"${p.created_date ? new Date(p.created_date).toLocaleDateString() : ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Patients_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Patient records exported successfully.', 'success', 'Export Complete');
  };

  // Pagination Math
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="container-fluid py-2">
      {/* 1. Header Banner */}
      <div className="d-sm-flex align-items-center justify-content-between mb-3 bg-white p-3 rounded-lg shadow-sm border">
        <div>
          <div className="d-flex align-items-center">
            <span
              className="rounded-circle mr-3 d-inline-flex align-items-center justify-content-center text-white"
              style={{
                width: '42px',
                height: '42px',
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                boxShadow: '0 3px 6px rgba(30, 60, 114, 0.3)',
              }}
            >
              <i className="fas fa-hospital-user fa-lg"></i>
            </span>
            <div>
              <h1 className="h4 mb-0 text-gray-800 font-weight-bold" style={{ letterSpacing: '0.2px' }}>
                Registered Patients Directory
              </h1>
              <p className="text-muted small mb-0 mt-0.5">
                Hospital Master Patient Index (MPI), electronic registration cards &amp; records management
              </p>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center flex-wrap gap-2 mt-2 mt-sm-0" style={{ gap: '8px' }}>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm shadow-xs"
            onClick={fetchPatients}
            disabled={loading}
            title="Refresh Directory"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} mr-1`}></i> Refresh
          </button>

          <button
            type="button"
            className="btn btn-outline-primary btn-sm shadow-xs"
            onClick={handleExportCSV}
            title="Download CSV"
          >
            <i className="fas fa-file-excel mr-1 text-success"></i> Export CSV
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm font-weight-bold shadow-sm"
            onClick={onOpenNewPatient}
            style={{
              background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
              border: 'none',
              padding: '0.45rem 1rem',
            }}
          >
            <i className="fas fa-user-plus mr-1.5"></i> Register New Patient
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards */}
      <div className="row mb-3">
        {/* Total Patients */}
        <div className="col-xl-2 col-md-4 col-sm-6 mb-2">
          <div
            className={`card border-left-primary shadow-sm h-100 py-2 cursor-pointer transition-all ${
              activeQuickTab === 'all' ? 'border-primary' : ''
            }`}
            onClick={() => handleQuickTabSelect('all')}
            style={{ backgroundColor: activeQuickTab === 'all' ? '#f8faff' : '#ffffff' }}
          >
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    All Patients
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats?.total ?? totalCount}
                  </div>
                  <div className="small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                    Total registered in EHR
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-users fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Patients */}
        <div className="col-xl-2 col-md-4 col-sm-6 mb-2">
          <div
            className={`card border-left-success shadow-sm h-100 py-2 cursor-pointer transition-all ${
              activeQuickTab === 'active' ? 'border-success' : ''
            }`}
            onClick={() => handleQuickTabSelect('active')}
            style={{ backgroundColor: activeQuickTab === 'active' ? '#f0fdf4' : '#ffffff' }}
          >
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Active Patients
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-success">
                    {stats?.active ?? totalCount}
                  </div>
                  <div className="small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                    <i className="fas fa-check-circle text-success mr-1"></i> Ready for Care
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-user-check fa-2x text-success" style={{ opacity: 0.4 }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deactivated Patients */}
        <div className="col-xl-2 col-md-4 col-sm-6 mb-2">
          <div
            className={`card border-left-danger shadow-sm h-100 py-2 cursor-pointer transition-all ${
              activeQuickTab === 'inactive' ? 'border-danger' : ''
            }`}
            onClick={() => handleQuickTabSelect('inactive')}
            style={{ backgroundColor: activeQuickTab === 'inactive' ? '#fef2f2' : '#ffffff' }}
          >
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                    Deactivated
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-danger">
                    {stats?.inactive ?? 0}
                  </div>
                  <div className="small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                    <i className="fas fa-ban text-danger mr-1"></i> Inactive accounts
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-user-slash fa-2x text-danger" style={{ opacity: 0.4 }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Registered Today */}
        <div className="col-xl-2 col-md-4 col-sm-6 mb-2">
          <div
            className={`card border-left-info shadow-sm h-100 py-2 cursor-pointer transition-all ${
              activeQuickTab === 'today' ? 'border-info' : ''
            }`}
            onClick={() => handleQuickTabSelect('today')}
            style={{ backgroundColor: activeQuickTab === 'today' ? '#f0f9ff' : '#ffffff' }}
          >
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Registered Today
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats?.registered_today ?? (todayOnly ? totalCount : '-')}
                  </div>
                  <div className="small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                    <span className="badge badge-info px-1.5 py-0">Today</span>
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar-day fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HMO / Corporate */}
        <div className="col-xl-2 col-md-4 col-sm-6 mb-2">
          <div
            className={`card border-left-warning shadow-sm h-100 py-2 cursor-pointer transition-all ${
              activeQuickTab === 'hmo' ? 'border-warning' : ''
            }`}
            onClick={() => handleQuickTabSelect('hmo')}
            style={{ backgroundColor: activeQuickTab === 'hmo' ? '#fffdf5' : '#ffffff' }}
          >
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    HMO / Corporate
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {(stats?.hmo ?? 0) + (stats?.retainership ?? 0)}
                  </div>
                  <div className="small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                    HMO ({stats?.hmo ?? 0}) &bull; Corp ({stats?.retainership ?? 0})
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-id-card-alt fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* In Family Folders */}
        <div className="col-xl-2 col-md-4 col-sm-6 mb-2">
          <div
            className={`card border-left-dark shadow-sm h-100 py-2 cursor-pointer transition-all ${
              activeQuickTab === 'family' ? 'border-dark' : ''
            }`}
            onClick={() => handleQuickTabSelect('family')}
            style={{ backgroundColor: activeQuickTab === 'family' ? '#f8fafc' : '#ffffff' }}
          >
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-dark text-uppercase mb-1">
                    Family Folders
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats?.in_family ?? '-'}
                  </div>
                  <div className="small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                    Linked to family files
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-folder-open fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Interactive Filter Controls */}
      <div className="card shadow-sm mb-3 border-0">
        <div className="card-body p-3">
          {/* Quick Filter Pill Buttons */}
          <div className="d-flex align-items-center flex-wrap gap-1.5 pb-2.5 mb-2.5 border-bottom" style={{ gap: '6px' }}>
            <span className="small text-muted font-weight-bold mr-1 text-uppercase" style={{ fontSize: '0.72rem' }}>
              Quick Filters:
            </span>
            <button
              type="button"
              className={`btn btn-sm px-2.5 py-1 rounded-pill ${
                activeQuickTab === 'all' ? 'btn-primary font-weight-bold shadow-xs' : 'btn-light border text-dark'
              }`}
              style={{ fontSize: '0.78rem' }}
              onClick={() => handleQuickTabSelect('all')}
            >
              All Records ({stats?.total ?? totalCount})
            </button>
            <button
              type="button"
              className={`btn btn-sm px-2.5 py-1 rounded-pill ${
                activeQuickTab === 'active' ? 'btn-success font-weight-bold shadow-xs' : 'btn-light border text-dark'
              }`}
              style={{ fontSize: '0.78rem' }}
              onClick={() => handleQuickTabSelect('active')}
            >
              <i className="fas fa-user-check mr-1 text-success"></i> Active Patients ({stats?.active ?? '-'})
            </button>
            <button
              type="button"
              className={`btn btn-sm px-2.5 py-1 rounded-pill ${
                activeQuickTab === 'inactive' ? 'btn-danger font-weight-bold shadow-xs' : 'btn-light border text-dark'
              }`}
              style={{ fontSize: '0.78rem' }}
              onClick={() => handleQuickTabSelect('inactive')}
            >
              <i className="fas fa-user-slash mr-1 text-danger"></i> Deactivated ({stats?.inactive ?? '-'})
            </button>
            <button
              type="button"
              className={`btn btn-sm px-2.5 py-1 rounded-pill ${
                activeQuickTab === 'today' ? 'btn-info font-weight-bold shadow-xs' : 'btn-light border text-dark'
              }`}
              style={{ fontSize: '0.78rem' }}
              onClick={() => handleQuickTabSelect('today')}
            >
              <i className="fas fa-calendar-day mr-1"></i> Registered Today
            </button>
            <button
              type="button"
              className={`btn btn-sm px-2.5 py-1 rounded-pill ${
                activeQuickTab === 'private' ? 'btn-secondary font-weight-bold shadow-xs' : 'btn-light border text-dark'
              }`}
              style={{ fontSize: '0.78rem' }}
              onClick={() => handleQuickTabSelect('private')}
            >
              <i className="fas fa-folder mr-1"></i> Private
            </button>
            <button
              type="button"
              className={`btn btn-sm px-2.5 py-1 rounded-pill ${
                activeQuickTab === 'hmo' ? 'btn-warning text-dark font-weight-bold shadow-xs' : 'btn-light border text-dark'
              }`}
              style={{ fontSize: '0.78rem' }}
              onClick={() => handleQuickTabSelect('hmo')}
            >
              <i className="fas fa-shield-alt mr-1"></i> HMO
            </button>
            <button
              type="button"
              className={`btn btn-sm px-2.5 py-1 rounded-pill ${
                activeQuickTab === 'anc' ? 'btn-danger font-weight-bold shadow-xs' : 'btn-light border text-dark'
              }`}
              style={{ fontSize: '0.78rem' }}
              onClick={() => handleQuickTabSelect('anc')}
            >
              <i className="fas fa-female mr-1"></i> ANC
            </button>
            <button
              type="button"
              className={`btn btn-sm px-2.5 py-1 rounded-pill ${
                activeQuickTab === 'family' ? 'btn-dark font-weight-bold shadow-xs' : 'btn-light border text-dark'
              }`}
              style={{ fontSize: '0.78rem' }}
              onClick={() => handleQuickTabSelect('family')}
            >
              <i className="fas fa-users mr-1"></i> In Family Folder
            </button>
          </div>

          {/* Search Row */}
          <div className="row align-items-center">
            <div className="col-lg-5 col-md-6 mb-2 mb-md-0">
              <div className="input-group input-group-sm">
                <div className="input-group-prepend">
                  <span className="input-group-text bg-white border-right-0 text-muted">
                    <i className="fas fa-search"></i>
                  </span>
                </div>
                <input
                  type="text"
                  className="form-control border-left-0"
                  placeholder="Search MRN (e.g. ISLH/ISL-2810), name, phone, next of kin, or family number..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                {search && (
                  <div className="input-group-append">
                    <button
                      className="btn btn-outline-secondary border-left-0"
                      type="button"
                      onClick={() => setSearch('')}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="col-lg-7 col-md-6 d-flex align-items-center justify-content-md-end flex-wrap gap-2" style={{ gap: '8px' }}>
              {/* Category Filter */}
              <select
                className="custom-select custom-select-sm"
                style={{ width: '150px' }}
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Categories</option>
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                className="custom-select custom-select-sm"
                style={{ width: '120px' }}
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>

              {/* Advanced Filter Toggle Button */}
              <button
                type="button"
                className={`btn btn-sm ${
                  showAdvancedFilters || selectedSponsor || selectedGender || dateFrom || dateTo
                    ? 'btn-primary'
                    : 'btn-outline-secondary'
                }`}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                title="More Filters"
              >
                <i className="fas fa-sliders-h mr-1"></i> More Filters
                {(selectedSponsor || selectedGender || dateFrom || dateTo) && (
                  <span className="badge badge-light text-dark ml-1">&bull;</span>
                )}
              </button>

              {/* Reset button if any filter active */}
              {(search || selectedCategory || selectedSponsor || selectedGender || selectedStatus !== '' || todayOnly || hasFamilyFolder || dateFrom || dateTo) && (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleResetFilters}
                  title="Clear all filters"
                >
                  <i className="fas fa-undo-alt mr-1"></i> Reset
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filter Drawer */}
          {showAdvancedFilters && (
            <div className="mt-3 p-3 bg-light rounded border">
              <div className="row align-items-center">
                <div className="col-md-3 form-group mb-2 mb-md-0">
                  <label className="small font-weight-bold text-muted mb-1">HMO / Sponsor</label>
                  <select
                    className="custom-select custom-select-sm"
                    value={selectedSponsor}
                    onChange={(e) => {
                      setSelectedSponsor(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Sponsors</option>
                    {sponsorsList.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name} {sp.code ? `(${sp.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-2 form-group mb-2 mb-md-0">
                  <label className="small font-weight-bold text-muted mb-1">Gender</label>
                  <select
                    className="custom-select custom-select-sm"
                    value={selectedGender}
                    onChange={(e) => {
                      setSelectedGender(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="col-md-2 form-group mb-2 mb-md-0">
                  <label className="small font-weight-bold text-muted mb-1">Family Status</label>
                  <select
                    className="custom-select custom-select-sm"
                    value={hasFamilyFolder}
                    onChange={(e) => {
                      setHasFamilyFolder(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Patients</option>
                    <option value="true">Enrolled in Family</option>
                    <option value="false">Individual Patient</option>
                  </select>
                </div>

                <div className="col-md-5 form-group mb-0">
                  <label className="small font-weight-bold text-muted mb-1">Registration Date Range</label>
                  <div className="d-flex align-items-center gap-1.5" style={{ gap: '6px' }}>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setCurrentPage(1);
                      }}
                      title="Date From"
                    />
                    <span className="text-muted small">to</span>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setCurrentPage(1);
                      }}
                      title="Date To"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Main Patients Table Card */}
      <div className="card shadow mb-4 border-0">
        <div className="card-header py-2.5 px-3 bg-white d-flex flex-wrap align-items-center justify-content-between border-bottom">
          <div className="d-flex align-items-center flex-wrap gap-2" style={{ gap: '10px' }}>
            <span
              className="badge badge-primary px-2.5 py-1 font-weight-bold shadow-xs"
              style={{ fontSize: '0.85rem' }}
            >
              {totalCount}
            </span>
            <span className="font-weight-bold text-dark">
              Patient Records Found
            </span>
            {loading && <i className="fas fa-spinner fa-spin text-primary ml-1"></i>}

            {selectedPatients.length > 0 && (
              <div className="d-inline-flex align-items-center ml-2 pl-2 border-left gap-2" style={{ gap: '8px' }}>
                <span className="badge badge-success px-2.5 py-1 font-weight-bold shadow-xs" style={{ fontSize: '0.82rem' }}>
                  <i className="fas fa-check-double mr-1"></i>
                  {selectedPatients.length} Selected
                </span>

                {onScheduleAppointment && (
                  <button
                    type="button"
                    className="btn btn-success btn-sm font-weight-bold shadow-sm d-inline-flex align-items-center py-1 px-2.5"
                    onClick={handleBulkSchedule}
                    title="Schedule appointment for all selected patients"
                  >
                    <i className="fas fa-calendar-plus mr-1.5"></i>
                    Schedule ({selectedPatients.length})
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm py-1 px-2"
                  onClick={handleClearSelection}
                  title="Deselect all patients"
                >
                  <i className="fas fa-times mr-1"></i> Clear
                </button>
              </div>
            )}
          </div>

          <div className="d-flex align-items-center gap-2" style={{ gap: '8px' }}>
            <span className="text-muted small d-none d-sm-inline">Rows per page:</span>
            <select
              className="custom-select custom-select-sm"
              style={{ width: '80px' }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="15">15</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive" style={{ minHeight: '320px' }}>
            <table className="table table-hover table-bordered mb-0 align-middle">
              <thead className="thead-light">
                <tr className="small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                  <th style={{ width: '40px' }} className="text-center align-middle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      style={{ cursor: 'pointer', width: '16px', height: '16px', verticalAlign: 'middle' }}
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allPageSelected && somePageSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      title={allPageSelected ? 'Deselect all on this page' : 'Select all on this page'}
                    />
                  </th>
                  <th style={{ width: '45px' }} className="text-center">#</th>
                  <th style={{ minWidth: '220px' }}>Patient Full Name</th>
                  <th style={{ minWidth: '130px' }}>Contact Details</th>
                  <th style={{ minWidth: '150px' }}>Category &amp; Sponsor</th>
                  <th style={{ minWidth: '160px' }}>Family Unit</th>
                  <th style={{ minWidth: '210px' }}>Next of Kin &amp; Relationship</th>
                  <th style={{ minWidth: '100px' }}>Reg. Date</th>
                  <th style={{ minWidth: '90px' }} className="text-center">Status</th>
                  <th style={{ minWidth: '180px' }} className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5">
                      <div className="spinner-border text-primary mb-2" role="status">
                        <span className="sr-only">Loading records...</span>
                      </div>
                      <div className="text-muted small">Retrieving patient database records...</div>
                    </td>
                  </tr>
                ) : patientsList.length > 0 ? (
                  patientsList.map((p, idx) => {
                    const rowNumber = startItem + idx;
                    const nextOfKinName = p.next_of_kin_name || p.full_name || '';
                    const nextOfKinRel = p.next_of_kin_relationship || p.relationship_to_patient || '';
                    const nextOfKinPhone = p.next_of_kin_phone || p.phone_numbers || '';

                    const selected = isPatientSelected(p.id);

                    return (
                      <tr
                        key={p.id}
                        className="cursor-pointer"
                        style={selected ? { backgroundColor: '#f0f9ff' } : {}}
                        onClick={() => onSelectPatient && onSelectPatient(p)}
                      >
                        {/* 0. Selection Checkbox */}
                        <td
                          className="text-center align-middle"
                          style={{ width: '40px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            style={{ cursor: 'pointer', width: '16px', height: '16px', verticalAlign: 'middle' }}
                            checked={selected}
                            onChange={(e) => handleTogglePatient(p, e)}
                            title={selected ? 'Deselect patient' : 'Select patient for scheduling'}
                          />
                        </td>

                        {/* 1. # */}
                        <td className="text-center text-muted small align-middle">
                          {rowNumber}
                        </td>

                        {/* 2. Patient Full Name & Age/Gender */}
                        <td className="align-middle">
                          <div className="d-flex align-items-center">
                            <div
                              className="rounded-circle mr-2.5 d-flex align-items-center justify-content-center text-white font-weight-bold shadow-xs flex-shrink-0"
                              style={{
                                width: '36px',
                                height: '36px',
                                background:
                                  p.gender === 'Female'
                                    ? 'linear-gradient(135deg, #e83e8c 0%, #d63384 100%)'
                                    : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                                fontSize: '0.85rem',
                              }}
                            >
                              {p.surname?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <div className="font-weight-bold text-dark" style={{ fontSize: '0.92rem' }}>
                                {p.surname} {p.first_name} {p.other_name || ''}
                              </div>
                              <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                                <i className={`fas fa-${p.gender === 'Female' ? 'venus text-danger' : 'mars text-primary'} mr-1`}></i>
                                {p.gender || 'Unknown'} &bull;{' '}
                                <strong className="text-dark">{p.age ? `${p.age} yrs` : 'N/A'}</strong>
                                {p.dob && <span className="ml-1 text-muted">({p.dob})</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 4. Contact Details */}
                        <td className="align-middle small">
                          <div className="font-weight-bold text-dark">
                            <i className="fas fa-phone-alt text-muted mr-1"></i>
                            {p.phone_number || '-'}
                          </div>
                          {p.email_address && (
                            <div className="text-muted text-truncate" style={{ maxWidth: '160px', fontSize: '0.72rem' }}>
                              <i className="fas fa-envelope mr-1"></i>
                              {p.email_address}
                            </div>
                          )}
                        </td>

                        {/* 5. Category & Sponsor */}
                        <td className="align-middle">
                          <div>
                            <span
                              className={`badge px-2 py-0.5 font-weight-bold mr-1 ${
                                p.category_name?.toLowerCase().includes('hmo')
                                  ? 'badge-warning text-dark'
                                  : p.category_name?.toLowerCase().includes('private')
                                  ? 'badge-info'
                                  : p.category_name?.toLowerCase().includes('anc')
                                  ? 'badge-danger'
                                  : 'badge-secondary'
                              }`}
                              style={{ fontSize: '0.72rem' }}
                            >
                              {p.category_name || 'Private'}
                            </span>
                          </div>
                          {p.sponsor_name && p.sponsor_name !== 'None' && (
                            <div className="small text-muted font-weight-medium mt-0.5" style={{ fontSize: '0.74rem' }}>
                              <i className="fas fa-building mr-1 text-secondary"></i>
                              {p.sponsor_name}
                            </div>
                          )}
                          {p.plan_name && (
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                              Plan: {p.plan_name}
                            </div>
                          )}
                        </td>

                        {/* 6. Family Unit */}
                        <td className="align-middle">
                          {p.family_number ? (
                            <div>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onNavigateTab) onNavigateTab('family-folders');
                                }}
                                className="badge badge-light border border-primary text-primary px-2 py-1 shadow-xs font-weight-bold"
                                style={{ cursor: 'pointer', fontSize: '0.78rem' }}
                                title="Click to view Family Folder"
                              >
                                <i className="fas fa-folder-open text-warning mr-1"></i>
                                {p.family_number}
                                {p.family_member_suffix && (
                                  <span className="badge badge-primary ml-1 px-1.5 py-0 text-white font-weight-bold">
                                    {p.family_member_suffix}
                                  </span>
                                )}
                              </div>
                              {p.hospital_number && (
                                <div className="mt-1">
                                  <span
                                    className="badge badge-light border text-danger font-weight-bold px-1.5 py-0.5 shadow-xs font-mono"
                                    style={{ fontSize: '0.72rem', letterSpacing: '0.4px' }}
                                    title="Individual Hospital Number"
                                  >
                                    <i className="fas fa-id-badge text-muted mr-1"></i>
                                    {p.hospital_number}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>
                                <i className="fas fa-user mr-1 text-gray-400"></i> Individual
                              </span>
                              {p.hospital_number && (
                                <span
                                  className="badge badge-light border text-danger font-weight-bold px-1.5 py-0.5 mt-1 d-inline-block font-mono shadow-xs"
                                  style={{ fontSize: '0.75rem', letterSpacing: '0.4px' }}
                                  title="Individual Hospital Number"
                                >
                                  <i className="fas fa-id-badge text-muted mr-1"></i>
                                  {p.hospital_number}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 7. Next of Kin & Relationship (Our New Feature!) */}
                        <td className="align-middle small">
                          {nextOfKinName ? (
                            <div>
                              <div className="font-weight-bold text-dark">
                                <i className="fas fa-user-shield text-warning mr-1"></i>
                                {nextOfKinName}
                              </div>
                              <div className="d-flex align-items-center gap-1 mt-0.5" style={{ gap: '4px' }}>
                                {nextOfKinRel && (
                                  <span className="badge badge-light border text-muted px-1.5 py-0" style={{ fontSize: '0.7rem' }}>
                                    {nextOfKinRel}
                                  </span>
                                )}
                                {nextOfKinPhone && (
                                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                    📞 {nextOfKinPhone}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted small">- Not provided -</span>
                          )}
                        </td>

                        {/* 8. Registration Date */}
                        <td className="align-middle small text-muted">
                          {p.created_date ? (
                            <div>
                              <span className="font-weight-medium text-dark">
                                {new Date(p.created_date).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* 9. Status */}
                        <td className="align-middle text-center">
                          {p.active === 1 || p.active === undefined ? (
                            <span className="badge badge-success px-2 py-1 font-weight-bold" style={{ fontSize: '0.72rem' }}>
                              <i className="fas fa-check-circle mr-1"></i> Active
                            </span>
                          ) : (
                            <span
                              className="badge badge-danger px-2 py-1 font-weight-bold"
                              style={{ fontSize: '0.72rem' }}
                              title={p.deactivated_date ? `Deactivated: ${new Date(p.deactivated_date).toLocaleDateString()}` : 'Deactivated'}
                            >
                              <i className="fas fa-ban mr-1"></i> Deactivated
                            </span>
                          )}
                        </td>

                        {/* 10. Actions */}
                        <td className="align-middle text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="btn-group btn-group-sm shadow-xs">
                            {/* View Profile */}
                            <button
                              type="button"
                              className="btn btn-outline-info py-1 px-2"
                              onClick={() => onSelectPatient && onSelectPatient(p)}
                              title="View Patient Record Profile"
                            >
                              <i className="fas fa-eye"></i>
                            </button>

                            {/* Edit Patient */}
                            {onEditPatient && (
                              <button
                                type="button"
                                className="btn btn-outline-warning py-1 px-2"
                                onClick={() => onEditPatient(p)}
                                title="Edit Patient Info"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                            )}

                            {/* Schedule Appointment */}
                            {onScheduleAppointment && (
                              <button
                                type="button"
                                className="btn btn-outline-success py-1 px-2"
                                onClick={() => onScheduleAppointment(p)}
                                title={p.active === 0 ? 'Patient deactivated' : 'Schedule Appointment'}
                                disabled={p.active === 0}
                              >
                                <i className="fas fa-calendar-plus"></i>
                              </button>
                            )}

                            {/* Print Registration Card */}
                            <button
                              type="button"
                              className="btn btn-outline-secondary py-1 px-2"
                              onClick={() => setPrintCardPatient(p)}
                              title="Print Registration Slip / Card"
                            >
                              <i className="fas fa-print"></i>
                            </button>

                            {/* Deactivate / Reactivate Action */}
                            {p.active === 1 || p.active === undefined ? (
                              <button
                                type="button"
                                className="btn btn-outline-danger py-1 px-2"
                                onClick={() => {
                                  setToggleActiveTarget(p);
                                  setToggleReason('');
                                }}
                                title="Deactivate Patient"
                              >
                                <i className="fas fa-user-slash"></i>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-outline-success py-1 px-2"
                                onClick={() => {
                                  setToggleActiveTarget(p);
                                  setToggleReason('');
                                }}
                                title="Reactivate Patient"
                              >
                                <i className="fas fa-user-check"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" className="text-center py-5">
                      <div className="py-4">
                        <i className="fas fa-user-slash fa-3x text-gray-300 mb-3 d-block"></i>
                        <h6 className="font-weight-bold text-gray-700">No Patient Records Found</h6>
                        <p className="text-muted small mb-3">
                          No registered patients match your current filter criteria or search query.
                        </p>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm mr-2"
                          onClick={handleResetFilters}
                        >
                          <i className="fas fa-undo mr-1"></i> Clear All Filters
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm font-weight-bold"
                          onClick={onOpenNewPatient}
                        >
                          <i className="fas fa-user-plus mr-1"></i> Register New Patient
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Pagination Footer */}
        <div className="card-footer bg-white py-2.5 px-3 border-top d-flex flex-wrap align-items-center justify-content-between">
          <div className="small text-muted mb-2 mb-sm-0">
            Showing <strong className="text-dark">{startItem}</strong> to <strong className="text-dark">{endItem}</strong> of{' '}
            <strong className="text-primary">{totalCount}</strong> registered patients
          </div>

          <div className="d-flex align-items-center gap-1.5" style={{ gap: '6px' }}>
            <button
              type="button"
              className="btn btn-light btn-sm border px-2.5 text-muted"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1 || loading}
              title="First Page"
            >
              <i className="fas fa-angle-double-left"></i>
            </button>

            <button
              type="button"
              className="btn btn-light btn-sm border px-2.5 font-weight-medium"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1 || loading}
            >
              <i className="fas fa-chevron-left mr-1"></i> Prev
            </button>

            <span className="badge badge-light border px-2.5 py-1.5 font-weight-bold text-primary mx-1" style={{ fontSize: '0.85rem' }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              className="btn btn-light btn-sm border px-2.5 font-weight-medium"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages || loading}
            >
              Next <i className="fas fa-chevron-right ml-1"></i>
            </button>

            <button
              type="button"
              className="btn btn-light btn-sm border px-2.5 text-muted"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages || loading}
              title="Last Page"
            >
              <i className="fas fa-angle-double-right"></i>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Printable Registration Card Modal */}
      {printCardPatient && (
        <PrintPatientCardModal
          patient={printCardPatient}
          onClose={() => setPrintCardPatient(null)}
        />
      )}

      {/* 7. Deactivate / Reactivate Patient Confirmation Modal */}
      {toggleActiveTarget && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1060 }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered" role="document" style={{ maxWidth: '480px' }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              {/* Header */}
              <div
                className={`modal-header py-3 px-4 ${
                  toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined
                    ? 'bg-danger text-white'
                    : 'bg-success text-white'
                }`}
              >
                <h5 className="modal-title font-weight-bold" style={{ fontSize: '1.05rem' }}>
                  <i
                    className={`fas ${
                      toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined
                        ? 'fa-user-slash'
                        : 'fa-user-check'
                    } mr-2`}
                  ></i>
                  {toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined
                    ? 'Deactivate Patient Record'
                    : 'Reactivate Patient Record'}
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => !togglingActive && setToggleActiveTarget(null)}
                  disabled={togglingActive}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              {/* Body */}
              <div className="modal-body p-4 bg-white">
                {/* Patient Summary Card */}
                <div
                  className="p-3 mb-3 rounded"
                  style={{
                    backgroundColor:
                      toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined
                        ? '#fff5f5'
                        : '#f0fdf4',
                    border: `1px solid ${
                      toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined
                        ? '#fed7d7'
                        : '#bbf7d0'
                    }`,
                  }}
                >
                  <div className="d-flex align-items-center mb-2">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white mr-3 font-weight-bold flex-shrink-0"
                      style={{
                        width: '42px',
                        height: '42px',
                        backgroundColor:
                          toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined
                            ? '#e53e3e'
                            : '#16a34a',
                        fontSize: '16px',
                      }}
                    >
                      {(toggleActiveTarget.surname || 'P')[0]}
                    </div>
                    <div>
                      <h6 className="font-weight-bold text-dark mb-0">
                        {toggleActiveTarget.patient_name ||
                          `${toggleActiveTarget.surname} ${toggleActiveTarget.first_name}`}
                      </h6>
                      <div className="small font-mono text-muted">
                        Hospital No: <strong className="text-primary">{toggleActiveTarget.hospital_number}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between small text-muted pt-2 border-top">
                    <span>
                      Category: <strong>{toggleActiveTarget.category_name || 'General'}</strong>
                    </span>
                    <span>
                      Status:{' '}
                      <strong
                        className={
                          toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined
                            ? 'text-success'
                            : 'text-danger'
                        }
                      >
                        {toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined
                          ? 'Active'
                          : 'Deactivated'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Notice Alert */}
                {toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined ? (
                  <div
                    className="alert alert-warning border-0 small mb-3 py-2 px-3"
                    style={{ backgroundColor: '#fffbeb', color: '#92400e' }}
                  >
                    <i className="fas fa-exclamation-triangle mr-1.5 font-weight-bold"></i>
                    <strong>Notice:</strong> Deactivating this patient will mark their hospital account as inactive. They will no longer be available for appointment bookings or waiting queue consultations. Their medical history, bills, and folders remain preserved.
                  </div>
                ) : (
                  <div
                    className="alert alert-info border-0 small mb-3 py-2 px-3"
                    style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}
                  >
                    <i className="fas fa-info-circle mr-1.5 font-weight-bold"></i>
                    <strong>Notice:</strong> Reactivating this patient will restore active hospital access immediately, allowing new consultations, appointments, and services across all clinic departments.
                  </div>
                )}

                {/* Optional Note / Reason Input */}
                <div className="form-group mb-0">
                  <label className="font-weight-bold small text-gray-700">
                    {toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined
                      ? 'Reason for Deactivation (Optional):'
                      : 'Reactivation Note (Optional):'}
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={
                      toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined
                        ? 'e.g. Relocated out of state, duplicate record, deceased, requested...'
                        : 'e.g. Account reinstated by admin...'
                    }
                    value={toggleReason}
                    onChange={(e) => setToggleReason(e.target.value)}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3 font-weight-bold"
                  onClick={() => setToggleActiveTarget(null)}
                  disabled={togglingActive}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn btn-sm px-4 font-weight-bold shadow-sm ${
                    toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined
                      ? 'btn-danger'
                      : 'btn-success'
                  }`}
                  onClick={handleTogglePatientActive}
                  disabled={togglingActive}
                >
                  {togglingActive ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-1.5"></i> Updating...
                    </>
                  ) : toggleActiveTarget.active === 1 || toggleActiveTarget.active === undefined ? (
                    <>
                      <i className="fas fa-user-slash mr-1.5"></i> Confirm Deactivation
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user-check mr-1.5"></i> Confirm Reactivation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Floating Bottom Bulk Action Pill */}
      {selectedPatients.length > 0 && (
        <div
          className="shadow-lg border d-flex align-items-center justify-content-between px-3 py-2 text-white"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1050,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '9999px',
            minWidth: '380px',
            maxWidth: '92vw',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="d-flex align-items-center mr-3">
            <span
              className="badge badge-success rounded-circle d-inline-flex align-items-center justify-content-center mr-2 font-weight-bold"
              style={{ width: '28px', height: '28px', fontSize: '0.85rem' }}
            >
              {selectedPatients.length}
            </span>
            <div>
              <div className="font-weight-bold text-white small" style={{ lineHeight: 1.2 }}>
                {selectedPatients.length} {selectedPatients.length === 1 ? 'Patient' : 'Patients'} Selected
              </div>
              <div className="text-light text-truncate" style={{ fontSize: '0.72rem', maxWidth: '240px', opacity: 0.85 }}>
                {selectedPatients.map((p) => `${p.surname} ${p.first_name?.charAt(0) || ''}.`).join(', ')}
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2" style={{ gap: '8px' }}>
            {onScheduleAppointment && (
              <button
                type="button"
                className="btn btn-success btn-sm font-weight-bold px-3 d-flex align-items-center shadow-sm"
                style={{ borderRadius: '20px' }}
                onClick={handleBulkSchedule}
              >
                <i className="fas fa-calendar-plus mr-1.5"></i>
                Schedule Appointments ({selectedPatients.length})
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-light btn-sm px-2.5"
              style={{ borderRadius: '20px', fontSize: '0.78rem' }}
              onClick={handleClearSelection}
              title="Clear Selection"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: BarcodeSVG Generator
// =========================================================================
function BarcodeSVG({ value, height = 34 }) {
  if (!value) return null;
  const bars = [];
  let x = 0;

  // Start guard
  bars.push(<rect key="s1" x={x} y={0} width={2.2} height={height} fill="#0f172a" />);
  x += 3.2;
  bars.push(<rect key="s2" x={x} y={0} width={1.2} height={height} fill="#0f172a" />);
  x += 2.8;

  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    const pattern = [(c % 3) + 1, ((c >> 1) % 2) + 1, ((c >> 2) % 3) + 1, 1];
    pattern.forEach((w, idx) => {
      if (idx % 2 === 0) {
        bars.push(<rect key={`b-${i}-${idx}`} x={x} y={0} width={w * 1.5} height={height} fill="#0f172a" />);
      }
      x += w * 1.5 + 1.2;
    });
  }

  // Stop guard
  bars.push(<rect key="e1" x={x} y={0} width={1.4} height={height} fill="#0f172a" />);
  x += 2.6;
  bars.push(<rect key="e2" x={x} y={0} width={2.2} height={height} fill="#0f172a" />);
  x += 3.2;

  return (
    <svg width={Math.max(x, 150)} height={height} viewBox={`0 0 ${x} ${height}`} className="d-block mx-auto">
      {bars}
    </svg>
  );
}

// =========================================================================
// SUB-COMPONENT: PrintPatientCardModal (Professional Hospital Standard)
// =========================================================================
function PrintPatientCardModal({ patient, onClose }) {
  const [cardFormat, setCardFormat] = useState('slip'); // 'slip' | 'pvc'

  if (!patient) return null;

  const handlePrint = () => {
    const printableEl = document.getElementById('printablePatientCard');
    if (!printableEl) {
      window.print();
      return;
    }

    try {
      // Remove any previously leftover print iframes
      const oldIframe = document.getElementById('clinic365_patient_card_print_frame');
      if (oldIframe && document.body.contains(oldIframe)) {
        document.body.removeChild(oldIframe);
      }

      // Create an isolated iframe with actual viewport dimensions so Chrome paints all content
      const iframe = document.createElement('iframe');
      iframe.id = 'clinic365_patient_card_print_frame';
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.border = 'none';
      iframe.style.opacity = '0.01';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-99999';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      const origin = window.location.origin;
      // Ensure local image paths have absolute origin
      const processedHtml = printableEl.innerHTML.split('src="/admin-img/').join(`src="${origin}/admin-img/`);

      // Copy all page stylesheets and fonts from main window
      const hostStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((el) => el.outerHTML)
        .join('\n');

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Patient Registration Card - ${patient.hospital_number || ''}</title>
            ${hostStyles}
            <style>
              @page {
                size: ${cardFormat === 'slip' ? 'A4 portrait' : 'auto'};
                margin: ${cardFormat === 'slip' ? '8mm' : '4mm'};
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: ${cardFormat === 'slip' ? '8px' : '4px'} !important;
                background: #ffffff !important;
                color: #0f172a !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              }
              .clinical-slip-container {
                border: 1.5px solid #cbd5e1 !important;
                border-radius: 8px !important;
                padding: 18px !important;
                background: #ffffff !important;
              }
              .d-print-none {
                display: none !important;
              }
            </style>
          </head>
          <body>
            ${processedHtml}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          window.print();
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }, 400);
    } catch (printErr) {
      console.warn('Iframe printing encountered an issue, falling back to window.print():', printErr);
      window.print();
    }
  };

  const patientFullName =
    `${patient.surname || ''} ${patient.first_name || ''} ${patient.other_name || ''}`.trim() ||
    patient.patient_name ||
    'Unnamed Patient';

  const nextOfKinName = patient.next_of_kin_name || patient.full_name || 'Not Provided';
  const nextOfKinRel = patient.next_of_kin_relationship || patient.relationship_to_patient || '';
  const nextOfKinPhone = patient.next_of_kin_phone || patient.phone_numbers || '';
  const patientEmail = patient.email_address && String(patient.email_address).toLowerCase() !== 'none'
    ? patient.email_address
    : 'Not Provided';

  return (
    <div
      className="modal fade show d-block"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 1070,
        overflowY: 'auto',
      }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered my-4" style={{ maxWidth: cardFormat === 'slip' ? '720px' : '620px', transition: 'max-width 0.25s ease' }}>
        <div
          className="modal-content border-0 shadow-2xl rounded-xl overflow-hidden"
          style={{
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.45)',
          }}
        >
          {/* Robust Screen / Ctrl+P Print Stylesheet */}
          <style>{`
            @media print {
              html, body {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .modal {
                position: static !important;
                display: block !important;
                background: transparent !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                height: auto !important;
              }
              .modal-dialog {
                max-width: 100% !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                transform: none !important;
              }
              .modal-content {
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                background: #ffffff !important;
              }
              .modal-header, .modal-footer, .d-print-none {
                display: none !important;
              }
              #printablePatientCard {
                display: block !important;
                position: static !important;
                padding: 5mm !important;
                margin: 0 !important;
                width: 100% !important;
                background: #ffffff !important;
                box-shadow: none !important;
                border: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @page {
                margin: 8mm;
                size: auto;
              }
            }
          `}</style>

          {/* Modal Header */}
          <div
            className="modal-header text-white py-3 px-4 d-print-none d-flex justify-content-between align-items-center"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="d-flex align-items-center">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mr-3 shadow-sm"
                style={{ width: '40px', height: '40px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)' }}
              >
                <i className="fas fa-id-card text-info" style={{ fontSize: '1.1rem' }}></i>
              </div>
              <div>
                <h5 className="modal-title font-weight-bold mb-0 text-white" style={{ fontSize: '1.02rem', letterSpacing: '0.3px' }}>
                  Patient Identity &amp; Registration Document
                </h5>
                <span className="small text-white-50" style={{ fontSize: '0.74rem' }}>
                  Isalu Hospitals Master Patient Index &bull; MRN: <strong>{patient.hospital_number}</strong>
                </span>
              </div>
            </div>

            <div className="d-flex align-items-center" style={{ gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm font-weight-bold px-3 py-1.5 shadow-sm d-flex align-items-center"
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                }}
                onClick={handlePrint}
              >
                <i className="fas fa-print mr-1.5"></i> Print Document
              </button>
              <button
                type="button"
                className="close text-white-50 hover-text-white ml-2"
                style={{ opacity: 0.85, fontSize: '1.4rem' }}
                onClick={onClose}
              >
                <span>&times;</span>
              </button>
            </div>
          </div>

          {/* Format Selector Bar */}
          <div
            className="d-print-none px-4 py-2 bg-light border-bottom d-flex justify-content-between align-items-center"
            style={{ fontSize: '0.8rem' }}
          >
            <div className="d-flex align-items-center text-muted">
              <span className="font-weight-bold mr-2 text-dark">
                <i className="fas fa-sliders-h mr-1 text-primary"></i> Document Layout:
              </span>
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn py-1 px-3 font-weight-bold ${cardFormat === 'slip' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ borderRadius: '6px 0 0 6px', fontSize: '0.76rem' }}
                  onClick={() => setCardFormat('slip')}
                >
                  <i className="fas fa-file-invoice mr-1"></i> Clinical Registration Slip (Folder Insert)
                </button>
                <button
                  type="button"
                  className={`btn py-1 px-3 font-weight-bold ${cardFormat === 'pvc' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ borderRadius: '0 6px 6px 0', fontSize: '0.76rem' }}
                  onClick={() => setCardFormat('pvc')}
                >
                  <i className="fas fa-id-badge mr-1"></i> Patient Hospital ID Card (PVC Format)
                </button>
              </div>
            </div>

            <span className="badge badge-light border text-muted px-2 py-1">
              <i className="fas fa-check-circle text-success mr-1"></i> High-Resolution Print Ready
            </span>
          </div>

          {/* ========================================================================= */}
          {/* PRINTABLE BODY CONTAINER */}
          {/* ========================================================================= */}
          <div className="modal-body p-4 bg-white" id="printablePatientCard" style={{ minHeight: '480px' }}>
            {/* ------------------------------------------------------------- */}
            {/* FORMAT 1: CLINICAL REGISTRATION SLIP (FOLDER INSERT)         */}
            {/* ------------------------------------------------------------- */}
            {cardFormat === 'slip' && (
              <div
                className="clinical-slip-container p-4 rounded-lg"
                style={{
                  border: '2px solid #e2e8f0',
                  background: '#ffffff',
                  position: 'relative',
                }}
              >
                {/* Official Hospital Header */}
                <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-3">
                  <div className="d-flex align-items-center">
                    <img
                      src="/admin-img/isalu-emblem-transparent.png"
                      alt="Isalu Hospitals Emblem"
                      style={{ height: '54px', width: 'auto', objectFit: 'contain' }}
                      className="mr-3"
                    />
                    <div>
                      <h4
                        className="font-weight-bold mb-0 text-dark"
                        style={{
                          letterSpacing: '1px',
                          fontSize: '1.25rem',
                          fontFamily: 'inherit',
                          color: '#0f172a',
                        }}
                      >
                        ISALU HOSPITALS LIMITED
                      </h4>
                      <div className="text-muted small" style={{ fontSize: '0.76rem', letterSpacing: '0.4px' }}>
                        RC: 502112 &bull; Centre for Medical &amp; Clinical Excellence
                      </div>
                      <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                        46, Ijaiye Road, Ogba, Ikeja, Lagos &bull; Tel: 0813-465-7895 &bull; info@isaluhospitals.com
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className="badge badge-primary px-2.5 py-1 text-uppercase font-weight-bold mb-1 shadow-xs"
                      style={{ fontSize: '0.68rem', letterSpacing: '0.8px', background: '#1e3a8a' }}
                    >
                      Patient Master Record
                    </div>
                    <div className="text-muted small font-mono" style={{ fontSize: '0.7rem' }}>
                      FORM MRD-01 / REV.2026
                    </div>
                  </div>
                </div>

                {/* Patient Primary Identification Banner */}
                <div
                  className="p-3 mb-3 rounded-lg border shadow-xs d-flex justify-content-between align-items-center"
                  style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 50%, #eff6ff 100%)',
                    borderColor: '#cbd5e1',
                  }}
                >
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white font-weight-bold mr-3 shadow-xs flex-shrink-0"
                      style={{
                        width: '56px',
                        height: '56px',
                        background:
                          patient.gender === 'Female'
                            ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)'
                            : 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                        fontSize: '1.25rem',
                        border: '3px solid #ffffff',
                      }}
                    >
                      {patient.surname?.charAt(0) || 'P'}
                    </div>

                    <div>
                      <div className="d-flex align-items-center gap-2 mb-0.5">
                        <span className="badge badge-light border text-primary font-weight-bold" style={{ fontSize: '0.68rem' }}>
                          OFFICIAL PATIENT CARD
                        </span>
                        {patient.family_number && (
                          <span className="badge badge-warning text-dark font-weight-bold" style={{ fontSize: '0.68rem' }}>
                            <i className="fas fa-folder-open mr-1"></i> Family Member {patient.family_member_suffix || 'A'}
                          </span>
                        )}
                      </div>

                      <h3
                        className="font-weight-bold text-dark mb-0"
                        style={{ fontSize: '1.35rem', letterSpacing: '-0.3px', color: '#0f172a' }}
                      >
                        {patientFullName}
                      </h3>

                      <div className="text-muted small mt-0.5" style={{ fontSize: '0.78rem' }}>
                        Gender: <strong className="text-dark">{patient.gender || 'Unknown'}</strong> &bull; Age:{' '}
                        <strong className="text-dark">{patient.age ? `${patient.age} yrs` : 'N/A'}</strong> (DOB:{' '}
                        {patient.dob || 'N/A'})
                      </div>
                    </div>
                  </div>

                  {/* MRN & Barcode Box */}
                  <div
                    className="text-right p-2.5 rounded bg-white border shadow-xs"
                    style={{ minWidth: '190px', borderColor: '#e2e8f0' }}
                  >
                    <span className="text-muted small font-weight-bold d-block text-uppercase" style={{ fontSize: '0.65rem' }}>
                      Hospital MRN:
                    </span>
                    <span
                      className="badge badge-danger font-weight-bold px-2 py-0.5 mb-1.5 shadow-xs"
                      style={{ fontSize: '0.98rem', letterSpacing: '0.6px', fontFamily: 'monospace' }}
                    >
                      {patient.hospital_number || 'NO MRN'}
                    </span>
                    <BarcodeSVG value={patient.hospital_number || 'ISL-0000'} height={28} />
                    <span className="d-block text-muted text-center font-mono" style={{ fontSize: '0.62rem', letterSpacing: '2px' }}>
                      *{patient.hospital_number}*
                    </span>
                  </div>
                </div>

                {/* 3-Column Clinical Specifications Grid */}
                <div className="row g-3 small mb-3">
                  {/* Column 1: Medical & Coverage Details */}
                  <div className="col-md-4 mb-2">
                    <div className="p-2.5 bg-light rounded border h-100" style={{ borderColor: '#e2e8f0' }}>
                      <h6
                        className="font-weight-bold text-primary text-uppercase mb-2 pb-1 border-bottom"
                        style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}
                      >
                        <i className="fas fa-shield-alt mr-1"></i> Coverage &amp; Plan
                      </h6>

                      <div className="mb-1.5">
                        <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Patient Category:</span>
                        <span className="badge badge-light border text-dark font-weight-bold" style={{ fontSize: '0.75rem' }}>
                          {patient.category_name || 'Private / General'}
                        </span>
                      </div>

                      <div className="mb-1.5">
                        <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Sponsor / HMO:</span>
                        <strong className="text-dark d-block text-truncate" title={patient.sponsor_name}>
                          {patient.sponsor_name || 'Self-Pay (Private)'}
                        </strong>
                      </div>

                      <div className="mb-1">
                        <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Tariff Pricelist:</span>
                        <strong className="text-success font-weight-bold d-block text-truncate" title={patient.plan_name}>
                          <i className="fas fa-layer-group mr-1 text-success"></i>
                          {patient.plan_name || 'Standard Hospital Tariff'}
                        </strong>
                      </div>

                      {patient.insurance_policy_number && (
                        <div className="mt-1 pt-1 border-top">
                          <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Policy / Enrollee ID:</span>
                          <span className="font-mono text-dark font-weight-bold">{patient.insurance_policy_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Contact & Demographics */}
                  <div className="col-md-4 mb-2">
                    <div className="p-2.5 bg-light rounded border h-100" style={{ borderColor: '#e2e8f0' }}>
                      <h6
                        className="font-weight-bold text-primary text-uppercase mb-2 pb-1 border-bottom"
                        style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}
                      >
                        <i className="fas fa-address-book mr-1"></i> Contact Information
                      </h6>

                      <div className="mb-1.5">
                        <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Primary Phone:</span>
                        <strong className="text-dark">
                          <i className="fas fa-phone-alt mr-1 text-muted"></i>
                          {patient.phone_number || 'Not Provided'}
                        </strong>
                      </div>

                      <div className="mb-1.5">
                        <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Email Address:</span>
                        <span className="text-dark text-truncate d-block" title={patientEmail}>
                          <i className="fas fa-envelope mr-1 text-muted"></i>
                          {patientEmail}
                        </span>
                      </div>

                      <div className="mb-1">
                        <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Residential Address:</span>
                        <span className="text-dark d-block text-truncate" title={patient.address || 'Not Provided'}>
                          <i className="fas fa-map-marker-alt mr-1 text-muted"></i>
                          {patient.address || 'Not Provided'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Emergency & Family */}
                  <div className="col-md-4 mb-2">
                    <div className="p-2.5 bg-light rounded border h-100" style={{ borderColor: '#e2e8f0' }}>
                      <h6
                        className="font-weight-bold text-primary text-uppercase mb-2 pb-1 border-bottom"
                        style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}
                      >
                        <i className="fas fa-heartbeat mr-1 text-danger"></i> Emergency &amp; Family
                      </h6>

                      <div className="mb-1.5">
                        <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Next of Kin:</span>
                        <strong className="text-dark d-block text-truncate">{nextOfKinName}</strong>
                        {nextOfKinRel && (
                          <span className="badge badge-light border text-muted mt-0.5" style={{ fontSize: '0.68rem' }}>
                            {nextOfKinRel}
                          </span>
                        )}
                      </div>

                      {nextOfKinPhone && (
                        <div className="mb-1.5">
                          <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Kin Phone Number:</span>
                          <span className="text-primary font-weight-bold">
                            <i className="fas fa-phone mr-1"></i> {nextOfKinPhone}
                          </span>
                        </div>
                      )}

                      {patient.family_number && (
                        <div className="mt-1 pt-1 border-top">
                          <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Family Folder No:</span>
                          <span className="badge badge-warning text-dark font-weight-bold" style={{ fontSize: '0.74rem' }}>
                            📁 {patient.family_number}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification Notice & Validation Footer */}
                <div
                  className="p-2.5 rounded border mb-3 d-flex justify-content-between align-items-center"
                  style={{ background: '#f8fafc', borderColor: '#e2e8f0', fontSize: '0.74rem' }}
                >
                  <div className="d-flex align-items-center">
                    <i className="fas fa-info-circle text-primary fa-lg mr-2"></i>
                    <div className="text-muted">
                      <strong>Patient Instruction:</strong> Please present this official hospital slip or card at Reception, Nursing Triage, Consultation, Laboratory, and Pharmacy at every visit.
                    </div>
                  </div>
                  <div className="text-right text-muted pl-3 flex-shrink-0" style={{ fontSize: '0.7rem' }}>
                    Registration Date: <strong className="text-dark">{patient.created_date ? new Date(patient.created_date).toLocaleDateString() : 'Today'}</strong>
                  </div>
                </div>

                {/* Sign-off & Audit Signature Block */}
                <div className="row pt-2 border-top text-muted small align-items-end" style={{ fontSize: '0.72rem' }}>
                  <div className="col-4">
                    <span className="d-block text-muted mb-4">Registration Officer:</span>
                    <div className="border-bottom pb-1 font-weight-bold text-dark">
                      {patient.created_by_name || 'Front Desk Medical Records'}
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.65rem' }}>Signature &amp; Date</span>
                  </div>

                  <div className="col-4 text-center">
                    <div
                      className="border border-dashed rounded p-2 mx-auto d-inline-block text-muted"
                      style={{ borderColor: '#cbd5e1', minWidth: '120px' }}
                    >
                      <i className="fas fa-stamp fa-lg text-gray-400 d-block mb-1"></i>
                      <span style={{ fontSize: '0.65rem' }}>OFFICIAL EMR STAMP</span>
                    </div>
                  </div>

                  <div className="col-4 text-right">
                    <span className="d-block text-muted mb-4">Medical Records Officer:</span>
                    <div className="border-bottom pb-1 font-weight-bold text-dark">
                      Authorized MRD Verifier
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.65rem' }}>Authorized Signature</span>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* FORMAT 2: PATIENT HOSPITAL ID CARD (PVC WALLET FORMAT)        */}
            {/* ------------------------------------------------------------- */}
            {cardFormat === 'pvc' && (
              <div className="d-flex flex-column align-items-center justify-content-center py-2">
                {/* PVC Card Front */}
                <div
                  className="pvc-card-front shadow-lg rounded-xl overflow-hidden mb-4"
                  style={{
                    width: '460px',
                    height: '275px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0369a1 100%)',
                    color: '#ffffff',
                    position: 'relative',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  {/* Subtle Background Watermark */}
                  <img
                    src="/admin-img/isalu-emblem-transparent.png"
                    alt=""
                    style={{
                      position: 'absolute',
                      right: '-20px',
                      bottom: '-20px',
                      width: '180px',
                      height: '180px',
                      opacity: 0.08,
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Card Header Strip */}
                  <div
                    className="p-3 d-flex justify-content-between align-items-center"
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}
                  >
                    <div className="d-flex align-items-center">
                      <img
                        src="/admin-img/isalu-emblem-transparent.png"
                        alt="Emblem"
                        style={{ height: '32px', width: 'auto' }}
                        className="mr-2"
                      />
                      <div>
                        <div className="font-weight-bold text-white" style={{ fontSize: '0.88rem', letterSpacing: '0.8px' }}>
                          ISALU HOSPITALS LIMITED
                        </div>
                        <div className="text-white-50" style={{ fontSize: '0.62rem', letterSpacing: '0.3px' }}>
                          RC: 502112 &bull; LAGOS, NIGERIA
                        </div>
                      </div>
                    </div>

                    <span
                      className="badge px-2 py-0.5 text-uppercase font-weight-bold"
                      style={{
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        fontSize: '0.65rem',
                      }}
                    >
                      PATIENT CARD
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 d-flex align-items-center">
                    {/* Patient Photo Frame */}
                    <div
                      className="rounded-lg mr-3 d-flex align-items-center justify-content-center text-white font-weight-bold shadow-md flex-shrink-0"
                      style={{
                        width: '74px',
                        height: '88px',
                        borderRadius: '10px',
                        background:
                          patient.gender === 'Female'
                            ? 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)'
                            : 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
                        border: '2px solid rgba(255, 255, 255, 0.6)',
                        fontSize: '2rem',
                      }}
                    >
                      {patient.surname?.charAt(0) || 'P'}
                    </div>

                    {/* Patient Core Credentials */}
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="text-warning font-weight-bold text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                        {patient.category_name || 'Private Patient'}
                      </div>
                      <h4
                        className="font-weight-bold text-white mb-0 text-truncate"
                        style={{ fontSize: '1.15rem', letterSpacing: '-0.2px' }}
                      >
                        {patientFullName}
                      </h4>

                      <div className="text-white-50 small mt-0.5" style={{ fontSize: '0.74rem' }}>
                        Gender: <strong className="text-white">{patient.gender}</strong> &bull; Age:{' '}
                        <strong className="text-white">{patient.age ? `${patient.age} yrs` : 'N/A'}</strong>
                      </div>

                      <div className="d-flex align-items-center mt-1">
                        <span
                          className="badge badge-danger font-weight-bold px-2 py-0.5 mr-2 font-mono"
                          style={{ fontSize: '0.82rem', letterSpacing: '0.6px' }}
                        >
                          MRN: {patient.hospital_number}
                        </span>
                        {patient.family_number && (
                          <span
                            className="badge font-weight-bold px-1.5 py-0.5"
                            style={{ background: '#f59e0b', color: '#111827', fontSize: '0.65rem' }}
                          >
                            Fam: {patient.family_member_suffix || 'A'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Bar with Barcode */}
                  <div
                    className="px-3 py-1.5 d-flex justify-content-between align-items-center"
                    style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                    }}
                  >
                    <div className="text-white-50" style={{ fontSize: '0.65rem' }}>
                      <i className="fas fa-phone-alt text-info mr-1"></i> {patient.phone_number || '0813-465-7895'}
                    </div>

                    <div className="text-right">
                      <span className="text-white font-mono" style={{ fontSize: '0.68rem', letterSpacing: '1px' }}>
                        ISALU-EMR-CERTIFIED
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-muted small text-center">
                  <i className="fas fa-info-circle mr-1 text-primary"></i> Standard CR80 PVC Card Dimensions (85.60 mm &times; 53.98 mm) for thermal card printer integration.
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            className="modal-footer bg-light py-2.5 px-4 d-print-none d-flex justify-content-between align-items-center"
            style={{ borderTop: '1px solid #e2e8f0' }}
          >
            <div className="text-muted small">
              <i className="fas fa-shield-alt text-success mr-1"></i> Official Electronic Health Record (EHR) Document
            </div>

            <div className="d-flex align-items-center" style={{ gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3 font-weight-bold"
                onClick={onClose}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm font-weight-bold px-4 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', border: 'none' }}
                onClick={handlePrint}
              >
                <i className="fas fa-print mr-1.5"></i> Print Document (Ctrl + P)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
