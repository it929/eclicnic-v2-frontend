import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

const RELATIONSHIP_OPTIONS = [
  { value: 'Principal', label: 'Principal / Head of Family' },
  { value: 'Spouse', label: 'Spouse / Wife / Husband' },
  { value: 'Child', label: 'Child / Son / Daughter' },
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Sibling', label: 'Sibling / Brother / Sister' },
  { value: 'Dependent', label: 'Dependent' },
  { value: 'Other', label: 'Other Relative' },
];

const NEXT_OF_KIN_RELATIONSHIPS = [
  'Spouse',
  'Husband',
  'Wife',
  'Father',
  'Mother',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Child',
  'Parent',
  'Sibling',
  'Guardian',
  'Uncle',
  'Aunt',
  'Cousin',
  'Nephew',
  'Niece',
  'Friend',
  'Colleague / Employer',
  'Other Relative',
  'Other',
];

export default function FamilyFoldersView({
  onSelectPatient,
  onScheduleAppointment,
  onOpenNewPatient,
  currentRole = 'Front Desk',
}) {
  // Data states
  const [families, setFamilies] = useState([]);
  const [stats, setStats] = useState({
    total_families: 0,
    private_folders: 0,
    hmo_groups: 0,
    total_members: 0,
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [sponsors, setSponsors] = useState([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all' | 'private_folder' | 'hmo_group'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedSponsorFilter, setSelectedSponsorFilter] = useState('');

  // Selected Family Drawer/Modal
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [loadingSelected, setLoadingSelected] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createPresetType, setCreatePresetType] = useState('private_folder'); // 'private_folder' | 'hmo_group'
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Alert/Message states
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'danger', text: '' }

  // -------------------------------------------------------------
  // Load Families & Metadata
  // -------------------------------------------------------------
  const loadStats = useCallback(async () => {
    try {
      const data = await api.getFamilyStats();
      if (data) setStats(data);
    } catch (err) {
      console.error('Failed to load family stats:', err);
    }
  }, []);

  const loadFamilies = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (activeFilterTab !== 'all') params.folder_type = activeFilterTab;
      if (selectedCategoryFilter) params.category = selectedCategoryFilter;
      if (selectedSponsorFilter) params.sponsor = selectedSponsorFilter;

      const res = await api.getFamilyFolders(params);
      const list = res.results || (Array.isArray(res) ? res : []);
      setFamilies(list);
    } catch (err) {
      console.error('Failed to load family folders:', err);
      setFeedback({ type: 'danger', text: 'Error fetching family folders. Please check connection.' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilterTab, selectedCategoryFilter, selectedSponsorFilter]);

  const loadInitialMetadata = useCallback(async () => {
    try {
      const [cats, sps] = await Promise.all([
        api.getCategories(),
        api.getSponsors(),
      ]);
      if (cats) setCategories(cats);
      if (sps) setSponsors(sps);
    } catch (err) {
      console.error('Failed to load metadata in FamilyFoldersView:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialMetadata();
    loadStats();
  }, [loadInitialMetadata, loadStats]);

  useEffect(() => {
    loadFamilies();
  }, [loadFamilies]);

  // Reload selected family when updated
  const refreshSelectedFamily = async (folderId) => {
    try {
      setLoadingSelected(true);
      const data = await api.getFamilyFolder(folderId);
      setSelectedFamily(data);
      loadFamilies();
      loadStats();
    } catch (err) {
      console.error('Error refreshing family:', err);
    } finally {
      setLoadingSelected(false);
    }
  };

  // Auto clear feedback after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Open Create Modal with Preset
  const handleOpenCreateModal = (type = 'private_folder') => {
    setCreatePresetType(type);
    setIsCreateModalOpen(true);
  };

  // Open Selected Family
  const handleOpenFamily = async (fam) => {
    try {
      setLoadingSelected(true);
      setSelectedFamily(fam);
      const fresh = await api.getFamilyFolder(fam.id);
      setSelectedFamily(fresh);
    } catch (err) {
      console.error('Failed to fetch family detail:', err);
    } finally {
      setLoadingSelected(false);
    }
  };

  // Handle Delete Family
  const handleDeleteFamily = async (familyId, famName) => {
    if (!window.confirm(`Are you sure you want to delete "${famName}"? Member hospital numbers will be restored to their original MRNs.`)) {
      return;
    }
    try {
      await api.deleteFamilyFolder(familyId);
      setFeedback({ type: 'success', text: `Family folder "${famName}" deleted successfully.` });
      if (selectedFamily?.id === familyId) setSelectedFamily(null);
      loadFamilies();
      loadStats();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.detail || 'Failed to delete family folder.' });
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Page Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
        <div>
          <span className="badge badge-light border text-primary px-2 py-1 mb-1 font-weight-bold" style={{ fontSize: '0.75rem' }}>
            <i className="fas fa-hospital-user mr-1"></i> Front Desk &bull; Records Management
          </span>
          <h1 className="h4 mb-0 text-gray-800 font-weight-bold d-flex align-items-center">
            <i className="fas fa-folder-open text-primary mr-2"></i>
            Family Folders &amp; Patient Groups
          </h1>
          <p className="text-muted small mb-0 mt-0.5">
            Physical folder archiving for <strong>Private Families</strong> (with shelf/rack locations) &bull; Virtual grouping for <strong>HMO Families</strong> &bull; Automatic <strong>ABCD</strong> member hospital numbering (e.g. <code>F/ISLH/ISL-4572-A</code>)
          </p>
        </div>

        <div className="d-flex align-items-center flex-wrap gap-2 mt-2 mt-sm-0">
          <button
            type="button"
            className="btn btn-primary btn-sm font-weight-bold shadow-sm mr-2"
            onClick={() => handleOpenCreateModal('private_folder')}
          >
            <i className="fas fa-folder-plus mr-1"></i> New Private Folder
          </button>
          <button
            type="button"
            className="btn btn-info btn-sm font-weight-bold shadow-sm mr-2"
            onClick={() => handleOpenCreateModal('hmo_group')}
          >
            <i className="fas fa-users mr-1"></i> New HMO Group
          </button>
          <button
            type="button"
            className="btn btn-light border btn-sm shadow-sm"
            onClick={() => {
              loadFamilies();
              loadStats();
            }}
            title="Refresh list"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin text-primary' : 'text-muted'}`}></i>
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {feedback && (
        <div className={`alert alert-${feedback.type} alert-dismissible fade show py-2 mb-3 shadow-sm`} role="alert">
          <i className={`fas fa-${feedback.type === 'success' ? 'check-circle' : 'exclamation-triangle'} mr-2`}></i>
          {feedback.text}
          <button type="button" className="close py-2" onClick={() => setFeedback(null)}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {/* 4 Stats Cards */}
      <div className="row mb-3">
        {/* Total Families */}
        <div className="col-xl-3 col-md-6 mb-2">
          <div className="card border-left-primary shadow-sm h-100 py-1">
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Families
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats.total_families || 0}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Folders &amp; Groups combined
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-folder-open fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Private Folders */}
        <div className="col-xl-3 col-md-6 mb-2">
          <div className="card border-left-warning shadow-sm h-100 py-1">
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    📁 Private Family Folders
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats.private_folders || 0}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Physical folders in records archive
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-archive fa-2x text-warning opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HMO Groups */}
        <div className="col-xl-3 col-md-6 mb-2">
          <div className="card border-left-info shadow-sm h-100 py-1">
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    👥 HMO Family Groups
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats.hmo_groups || 0}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Corporate &amp; HMO sponsored
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-users-cog fa-2x text-info opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Members */}
        <div className="col-xl-3 col-md-6 mb-2">
          <div className="card border-left-success shadow-sm h-100 py-1">
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Family Members
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats.total_members || 0}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Assigned ABCD hospital numbers
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-id-card-alt fa-2x text-success opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="row">
        {/* Left Side: Families Directory & Filter */}
        <div className={selectedFamily ? 'col-lg-7' : 'col-12'}>
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-2.5 d-flex flex-wrap align-items-center justify-content-between border-bottom">
              {/* Filter Tabs */}
              <ul className="nav nav-pills card-header-pills" style={{ fontSize: '0.85rem' }}>
                <li className="nav-item">
                  <button
                    className={`nav-link py-1 px-3 font-weight-bold ${activeFilterTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilterTab('all')}
                  >
                    All Families ({stats.total_families || families.length})
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link py-1 px-3 font-weight-bold ${activeFilterTab === 'private_folder' ? 'active' : ''}`}
                    onClick={() => setActiveFilterTab('private_folder')}
                  >
                    <i className="fas fa-folder mr-1 text-warning"></i>
                    Private Folders ({stats.private_folders || 0})
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link py-1 px-3 font-weight-bold ${activeFilterTab === 'hmo_group' ? 'active' : ''}`}
                    onClick={() => setActiveFilterTab('hmo_group')}
                  >
                    <i className="fas fa-users mr-1 text-info"></i>
                    HMO Groups ({stats.hmo_groups || 0})
                  </button>
                </li>
              </ul>

              <div className="text-muted small mt-1 mt-md-0">
                Found: <strong>{families.length}</strong> record{families.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="card-body bg-light py-2 border-bottom">
              <div className="row align-items-center">
                <div className="col-md-5 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0">
                        <i className="fas fa-search text-muted"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0"
                      placeholder="Search family name, number (F/...), MRN, principal, shelf..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <div className="input-group-append">
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          onClick={() => setSearchQuery('')}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-md-3 mb-2 mb-md-0">
                  <select
                    className="custom-select custom-select-sm"
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  >
                    <option value="">-- All Categories --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <select
                    className="custom-select custom-select-sm"
                    value={selectedSponsorFilter}
                    onChange={(e) => setSelectedSponsorFilter(e.target.value)}
                  >
                    <option value="">-- All Sponsors / HMOs --</option>
                    {sponsors.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name} {sp.code ? `(${sp.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Family List Table */}
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <div className="text-muted small mt-2">Loading family folders...</div>
                </div>
              ) : families.length === 0 ? (
                <div className="text-center py-5">
                  <div className="mb-2">
                    <i className="fas fa-folder-open fa-3x text-gray-300"></i>
                  </div>
                  <h6 className="font-weight-bold text-dark mb-1">No Family Folders Found</h6>
                  <p className="text-muted small mb-3">
                    {searchQuery || selectedCategoryFilter || selectedSponsorFilter
                      ? 'No families matched your current search filters.'
                      : 'Get started by creating a Private Family Folder or an HMO Family Group.'}
                  </p>
                  <div className="d-flex justify-content-center gap-2">
                    <button
                      className="btn btn-primary btn-sm font-weight-bold mr-2"
                      onClick={() => handleOpenCreateModal('private_folder')}
                    >
                      <i className="fas fa-folder-plus mr-1"></i> New Private Folder
                    </button>
                    <button
                      className="btn btn-info btn-sm font-weight-bold"
                      onClick={() => handleOpenCreateModal('hmo_group')}
                    >
                      <i className="fas fa-users mr-1"></i> New HMO Group
                    </button>
                  </div>
                </div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '680px', overflowY: 'auto' }}>
                  <table className="table table-hover table-striped mb-0" style={{ fontSize: '0.85rem' }}>
                    <thead className="thead-light sticky-top" style={{ zIndex: 1 }}>
                      <tr>
                        <th style={{ width: '22%' }}>Family Number</th>
                        <th style={{ width: '25%' }}>Family Name &amp; Type</th>
                        <th style={{ width: '23%' }}>Principal Member</th>
                        <th style={{ width: '12%' }} className="text-center">Members</th>
                        <th style={{ width: '18%' }} className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {families.map((fam) => {
                        const isSelected = selectedFamily?.id === fam.id;
                        const isPrivate = fam.folder_type === 'private_folder';
                        return (
                          <tr
                            key={fam.id}
                            className={`cursor-pointer ${isSelected ? 'table-primary font-weight-bold' : ''}`}
                            onClick={() => handleOpenFamily(fam)}
                          >
                            <td>
                              <div className="d-flex align-items-center">
                                <span className={`badge ${isPrivate ? 'badge-primary' : 'badge-info'} px-2 py-1 font-weight-bold mr-2`} style={{ letterSpacing: '0.5px' }}>
                                  <i className={`fas fa-${isPrivate ? 'folder' : 'users'} mr-1`}></i>
                                  {fam.family_number}
                                </span>
                              </div>
                              {isPrivate && fam.physical_folder_number && (
                                <div className="text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
                                  <i className="fas fa-tag mr-1 text-warning"></i>
                                  Jacket: <strong>{fam.physical_folder_number}</strong>
                                </div>
                              )}
                              {isPrivate && fam.storage_location && (
                                <div className="text-success small" style={{ fontSize: '0.7rem' }}>
                                  <i className="fas fa-archive mr-1"></i>
                                  {fam.storage_location}
                                </div>
                              )}
                            </td>

                            <td>
                              <div className="font-weight-bold text-dark text-truncate" style={{ maxWidth: '220px' }}>
                                {fam.family_name}
                              </div>
                              <div className="mt-0.5">
                                {isPrivate ? (
                                  <span className="badge badge-warning text-dark px-1.5 py-0.5" style={{ fontSize: '0.7rem' }}>
                                    📁 Private Family Folder
                                  </span>
                                ) : (
                                  <span className="badge badge-info px-1.5 py-0.5" style={{ fontSize: '0.7rem' }}>
                                    👥 HMO Family Group
                                  </span>
                                )}
                                {fam.sponsor_name && (
                                  <span className="text-muted small ml-1 text-truncate" style={{ fontSize: '0.72rem', maxWidth: '120px' }}>
                                    &bull; {fam.sponsor_name}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td>
                              {fam.principal_patient_name ? (
                                <div>
                                  <div className="font-weight-bold text-dark text-truncate" style={{ maxWidth: '180px' }}>
                                    {fam.principal_patient_name}
                                  </div>
                                  <div className="text-danger small font-weight-bold" style={{ fontSize: '0.72rem' }}>
                                    <i className="fas fa-barcode mr-1"></i>
                                    {fam.principal_patient_hospital_number || 'No MRN'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted font-italic small">No principal assigned</span>
                              )}
                            </td>

                            <td className="text-center align-middle">
                              <span className="badge badge-pill badge-light border text-dark font-weight-bold px-2 py-1" style={{ fontSize: '0.8rem' }}>
                                <i className="fas fa-user-friends mr-1 text-primary"></i>
                                {fam.member_count || 0}
                              </span>
                            </td>

                            <td className="text-right align-middle" onClick={(e) => e.stopPropagation()}>
                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => handleOpenFamily(fam)}
                                  title="View family members and folder details"
                                >
                                  <i className="fas fa-folder-open"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-success btn-sm"
                                  onClick={() => {
                                    handleOpenFamily(fam);
                                    setIsAddMemberModalOpen(true);
                                  }}
                                  title="Add new member to this family"
                                >
                                  <i className="fas fa-user-plus"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => {
                                    setSelectedFamily(fam);
                                    setIsPrintModalOpen(true);
                                  }}
                                  title="Print Family Folder Sheet / Label"
                                >
                                  <i className="fas fa-print"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleDeleteFamily(fam.id, fam.family_name)}
                                  title="Delete Family Folder"
                                >
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Selected Family Detailed View & Member Roster */}
        {selectedFamily && (
          <div className="col-lg-5">
            <div className="card shadow-sm border-0 mb-4 sticky-top" style={{ top: '1rem', zIndex: 5 }}>
              {/* Family Header */}
              <div
                className={`card-header py-3 text-white ${
                  selectedFamily.folder_type === 'private_folder' ? 'bg-gradient-primary' : 'bg-gradient-info'
                } d-flex align-items-center justify-content-between`}
              >
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge badge-light text-dark font-weight-bold px-2 py-1">
                      {selectedFamily.family_number}
                    </span>
                    <span className="badge badge-warning text-dark font-weight-bold px-2 py-1">
                      {selectedFamily.folder_type === 'private_folder' ? '📁 Physical Folder' : '👥 Virtual HMO Group'}
                    </span>
                  </div>
                  <h5 className="font-weight-bold text-white mb-0 mt-1">
                    {selectedFamily.family_name}
                  </h5>
                </div>
                <div className="d-flex align-items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-light btn-sm font-weight-bold text-primary mr-1"
                    onClick={() => setIsPrintModalOpen(true)}
                    title="Print Folder Label / Summary Sheet"
                  >
                    <i className="fas fa-print mr-1"></i> Print
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm border-0"
                    onClick={() => setSelectedFamily(null)}
                    title="Close Drawer"
                  >
                    <i className="fas fa-times fa-lg"></i>
                  </button>
                </div>
              </div>

              {/* Physical Storage & Meta Details */}
              <div className="card-body bg-light border-bottom py-2.5">
                <div className="row small">
                  {selectedFamily.folder_type === 'private_folder' ? (
                    <>
                      <div className="col-6 mb-1">
                        <span className="text-muted d-block">Physical Folder No:</span>
                        <strong className="text-primary font-weight-bold">
                          {selectedFamily.physical_folder_number || selectedFamily.family_number}
                        </strong>
                      </div>
                      <div className="col-6 mb-1">
                        <span className="text-muted d-block">Storage / Shelf Location:</span>
                        <strong className="text-success font-weight-bold">
                          {selectedFamily.storage_location || 'Not specified (Records Shelf)'}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-6 mb-1">
                        <span className="text-muted d-block">HMO Sponsor:</span>
                        <strong className="text-info font-weight-bold">
                          {selectedFamily.sponsor_name || 'HMO Plan'}
                        </strong>
                      </div>
                      <div className="col-6 mb-1">
                        <span className="text-muted d-block">HMO Group Code:</span>
                        <strong className="text-dark font-weight-bold">
                          {selectedFamily.sponsor_code || 'Standard'}
                        </strong>
                      </div>
                    </>
                  )}

                  <div className="col-6 mb-1">
                    <span className="text-muted d-block">Family Contact Phone:</span>
                    <strong>{selectedFamily.phone_number || 'N/A'}</strong>
                  </div>
                  <div className="col-6 mb-1">
                    <span className="text-muted d-block">Residential Address:</span>
                    <span className="text-truncate d-block" title={selectedFamily.address}>
                      {selectedFamily.address || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                  <span className="small text-muted">
                    Created: <strong>{new Date(selectedFamily.created_date).toLocaleDateString()}</strong>
                    {selectedFamily.created_by_name ? ` by ${selectedFamily.created_by_name}` : ''}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm py-0 px-2"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setIsEditFolderModalOpen(true)}
                  >
                    <i className="fas fa-edit mr-1"></i> Edit Details
                  </button>
                </div>
              </div>

              {/* Family Members Header */}
              <div className="card-header bg-white py-2 d-flex align-items-center justify-content-between border-bottom">
                <div className="font-weight-bold text-dark small d-flex align-items-center">
                  <i className="fas fa-users mr-1.5 text-primary"></i>
                  Enrolled Family Members ({selectedFamily.members?.length || 0})
                </div>
                <button
                  type="button"
                  className="btn btn-success btn-sm font-weight-bold py-0.5 px-2"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => setIsAddMemberModalOpen(true)}
                >
                  <i className="fas fa-plus-circle mr-1"></i> Add Member
                </button>
              </div>

              {/* Members Roster List */}
              <div className="card-body p-0" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                {loadingSelected ? (
                  <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                  </div>
                ) : !selectedFamily.members || selectedFamily.members.length === 0 ? (
                  <div className="text-center py-4 text-muted small">
                    <i className="fas fa-user-plus fa-2x text-gray-300 mb-2 d-block"></i>
                    No members enrolled in this family yet.
                    <div className="mt-2">
                      <button
                        className="btn btn-sm btn-outline-success font-weight-bold"
                        onClick={() => setIsAddMemberModalOpen(true)}
                      >
                        <i className="fas fa-plus mr-1"></i> Add First Member (Suffix A)
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="list-group list-group-flush">
                    {selectedFamily.members.map((mem) => {
                      const isPrincipal = mem.is_principal || selectedFamily.principal_patient_id === mem.patient;
                      return (
                        <li
                          key={mem.id}
                          className={`list-group-item p-2.5 d-flex align-items-start justify-content-between ${
                            isPrincipal ? 'bg-light-primary border-left-primary' : ''
                          }`}
                        >
                          <div className="d-flex align-items-start" style={{ minWidth: 0 }}>
                            {/* Letter Suffix Badge (A, B, C...) */}
                            <div className="mr-2.5 text-center" style={{ minWidth: '36px' }}>
                              <span
                                className={`badge ${
                                  isPrincipal ? 'badge-danger' : 'badge-primary'
                                } d-flex align-items-center justify-content-center`}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  fontSize: '0.9rem',
                                  fontWeight: 'bold',
                                }}
                                title={`Family Suffix Letter: ${mem.letter_suffix}`}
                              >
                                {mem.letter_suffix}
                              </span>
                              {isPrincipal && (
                                <span className="badge badge-warning text-dark font-weight-bold mt-1" style={{ fontSize: '0.62rem' }}>
                                  Head
                                </span>
                              )}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div className="d-flex align-items-center flex-wrap gap-1">
                                <a
                                  className="font-weight-bold text-dark cursor-pointer text-decoration-none mr-1"
                                  onClick={() => onSelectPatient && onSelectPatient({ id: mem.patient, surname: mem.patient_surname, first_name: mem.patient_first_name })}
                                  title="View full patient profile"
                                >
                                  {mem.patient_name || `${mem.patient_surname} ${mem.patient_first_name}`}
                                </a>
                                <span className="badge badge-light border text-muted small">
                                  {mem.relationship}
                                </span>
                              </div>

                              {/* Hospital Number (F/...-A) */}
                              <div className="d-flex align-items-center mt-0.5">
                                <span className="badge badge-danger font-weight-bold mr-2" style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>
                                  <i className="fas fa-barcode mr-1"></i>
                                  {mem.assigned_hospital_number}
                                </span>
                                {mem.original_hospital_number && (
                                  <span className="text-muted small" style={{ fontSize: '0.72rem' }} title="Original Hospital Number before joining family">
                                    Orig: <s>{mem.original_hospital_number}</s>
                                  </span>
                                )}
                              </div>

                              <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                                {mem.patient_age !== null && mem.patient_age !== undefined && `${mem.patient_age} yrs`}
                                {mem.patient_gender && ` • ${mem.patient_gender}`}
                                {mem.patient_phone && ` • 📞 ${mem.patient_phone}`}
                              </div>

                              {/* Inherited Sponsor & Plan */}
                              <div className="d-flex align-items-center flex-wrap gap-1 mt-1">
                                {mem.patient_sponsor_name && (
                                  <span className="badge badge-light border text-primary font-weight-bold mr-1" style={{ fontSize: '0.68rem' }} title="Family Sponsor">
                                    <i className="fas fa-building mr-1"></i>
                                    {mem.patient_sponsor_name}
                                  </span>
                                )}
                                {mem.patient_plan_name && (
                                  <span className="badge badge-light border border-success text-success font-weight-bold mr-1" style={{ fontSize: '0.68rem' }} title="Inherited Principal Plan">
                                    <i className="fas fa-layer-group mr-1"></i>
                                    {mem.patient_plan_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Member Action Menu */}
                          <div className="dropdown ml-2">
                            <button
                              className="btn btn-light btn-sm border-0 py-1 px-2 text-muted"
                              type="button"
                              data-toggle="dropdown"
                              title="Member Options"
                            >
                              <i className="fas fa-ellipsis-v"></i>
                            </button>
                            <div className="dropdown-menu dropdown-menu-right shadow-sm" style={{ fontSize: '0.8rem' }}>
                              <button
                                className="dropdown-item cursor-pointer text-primary"
                                onClick={() =>
                                  onScheduleAppointment &&
                                  onScheduleAppointment({
                                    id: mem.patient,
                                    surname: mem.patient_surname,
                                    first_name: mem.patient_first_name,
                                    hospital_number: mem.assigned_hospital_number,
                                    phone_number: mem.patient_phone,
                                  })
                                }
                              >
                                <i className="fas fa-calendar-plus mr-2 text-primary"></i>
                                Schedule Appointment
                              </button>

                              {!isPrincipal && (
                                <button
                                  className="dropdown-item cursor-pointer text-warning font-weight-bold"
                                  onClick={async () => {
                                    try {
                                      await api.setFamilyPrincipal(selectedFamily.id, mem.patient);
                                      setFeedback({ type: 'success', text: `${mem.patient_name} is now the Family Principal.` });
                                      refreshSelectedFamily(selectedFamily.id);
                                    } catch (err) {
                                      setFeedback({ type: 'danger', text: err.response?.data?.detail || 'Failed to update principal.' });
                                    }
                                  }}
                                >
                                  <i className="fas fa-crown mr-2 text-warning"></i>
                                  Set as Head of Family
                                </button>
                              )}

                              <div className="dropdown-divider"></div>

                              <button
                                className="dropdown-item cursor-pointer text-danger"
                                onClick={async () => {
                                  if (!window.confirm(`Remove ${mem.patient_name} from this family? Their hospital number will be restored to their original MRN.`)) {
                                    return;
                                  }
                                  try {
                                    await api.removeFamilyMember(selectedFamily.id, { member_id: mem.id, restore_hospital_number: true });
                                    setFeedback({ type: 'success', text: `${mem.patient_name} removed from family.` });
                                    refreshSelectedFamily(selectedFamily.id);
                                  } catch (err) {
                                    setFeedback({ type: 'danger', text: err.response?.data?.detail || 'Failed to remove member.' });
                                  }
                                }}
                              >
                                <i className="fas fa-user-minus mr-2 text-danger"></i>
                                Remove from Family
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. CREATE FAMILY FOLDER / GROUP MODAL                     */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <CreateFamilyFolderModal
          isOpen={isCreateModalOpen}
          initialFolderType={createPresetType}
          categories={categories}
          sponsors={sponsors}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(newFolder) => {
            setIsCreateModalOpen(false);
            setFeedback({ type: 'success', text: `Family Folder "${newFolder.family_name}" (${newFolder.family_number}) created successfully!` });
            loadFamilies();
            loadStats();
            handleOpenFamily(newFolder);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 2. ADD MEMBER TO FAMILY MODAL                             */}
      {/* ======================================================== */}
      {isAddMemberModalOpen && selectedFamily && (
        <AddFamilyMemberModal
          isOpen={isAddMemberModalOpen}
          family={selectedFamily}
          onClose={() => setIsAddMemberModalOpen(false)}
          onMemberAdded={(updatedFolder) => {
            setIsAddMemberModalOpen(false);
            setSelectedFamily(updatedFolder);
            setFeedback({ type: 'success', text: `New member added to family with hospital number!` });
            loadFamilies();
            loadStats();
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 3. EDIT FAMILY DETAILS MODAL                              */}
      {/* ======================================================== */}
      {isEditFolderModalOpen && selectedFamily && (
        <EditFamilyFolderModal
          isOpen={isEditFolderModalOpen}
          family={selectedFamily}
          onClose={() => setIsEditFolderModalOpen(false)}
          onSaved={(updated) => {
            setIsEditFolderModalOpen(false);
            setSelectedFamily(updated);
            setFeedback({ type: 'success', text: 'Family details updated successfully!' });
            loadFamilies();
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 4. PRINT FAMILY SUMMARY / LABEL MODAL                     */}
      {/* ======================================================== */}
      {isPrintModalOpen && selectedFamily && (
        <PrintFamilySheetModal
          isOpen={isPrintModalOpen}
          family={selectedFamily}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: CreateFamilyFolderModal
// =========================================================================
function CreateFamilyFolderModal({
  isOpen,
  initialFolderType = 'private_folder',
  categories = [],
  sponsors = [],
  onClose,
  onCreated,
}) {
  const [folderType, setFolderType] = useState(initialFolderType);
  const [familyName, setFamilyName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sponsorId, setSponsorId] = useState('');
  const [familyNumber, setFamilyNumber] = useState('');
  const [physicalFolderNumber, setPhysicalFolderNumber] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Principal Patient Selection Option
  const [startWithPrincipal, setStartWithPrincipal] = useState(true);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPrincipalPatient, setSelectedPrincipalPatient] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Sync default category according to folder type (only if no principal patient is selected)
  useEffect(() => {
    if (selectedPrincipalPatient) return;
    if (folderType === 'private_folder') {
      const privCat = categories.find((c) => c.category?.toLowerCase() === 'private');
      if (privCat) setCategoryId(String(privCat.id));
      setSponsorId('');
    } else {
      const hmoCat = categories.find((c) => c.category?.toLowerCase() === 'hmo');
      if (hmoCat) setCategoryId(String(hmoCat.id));
    }
  }, [folderType, categories, selectedPrincipalPatient]);

  // Search existing patients when typing
  useEffect(() => {
    if (!patientSearchQuery.trim() || patientSearchQuery.length < 2) {
      setPatientSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingPatients(true);
        const res = await api.getPatients({ search: patientSearchQuery.trim(), page_size: 8 });
        const list = res.results || (Array.isArray(res) ? res : []);
        setPatientSearchResults(list);
      } catch (err) {
        console.error('Patient search error:', err);
      } finally {
        setSearchingPatients(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [patientSearchQuery]);

  // When principal patient is selected, preview family number and determine Private vs HMO by Patient Category
  const handleSelectPrincipal = async (p) => {
    setSelectedPrincipalPatient(p);
    setPatientSearchQuery('');
    setPatientSearchResults([]);

    // Auto-generate family name
    if (!familyName && p.surname) {
      setFamilyName(`${p.surname} Family`);
    }
    if (p.phone_number && !phoneNumber) {
      setPhoneNumber(p.phone_number);
    }
    if (p.address && !address) {
      setAddress(p.address);
    }

    // Determine category directly from patientprofile category_id:
    // In database: ID 1 is 'Private', ID 2 is 'HMO'
    const catId = p.category_id || p.category;
    const catObj = categories.find((c) => String(c.id) === String(catId));
    const catName = (p.category_name || catObj?.category || '').trim().toLowerCase();

    // Check directly by Category ID and Category Name:
    const isHmo = Number(catId) === 2 || catName === 'hmo' || catName.includes('hmo');

    if (catId) {
      setCategoryId(String(catId));
    }
    if (p.sponsor_id || p.sponsor) {
      setSponsorId(String(p.sponsor_id || p.sponsor));
    } else {
      setSponsorId('');
    }

    // Differentiate: If category is HMO (ID 2) -> hmo_group; If Private (ID 1) -> private_folder
    if (isHmo) {
      setFolderType('hmo_group');
    } else {
      setFolderType('private_folder');
    }

    try {
      const preview = await api.previewFamilyNumber({ patient_id: p.id });
      if (preview?.family_number) {
        setFamilyNumber(preview.family_number);
        setPhysicalFolderNumber(preview.family_number);
      }
      if (preview?.category_id) {
        setCategoryId(String(preview.category_id));
        const prevCatName = (preview.category_name || '').toLowerCase();
        if (Number(preview.category_id) === 2 || prevCatName.includes('hmo')) {
          setFolderType('hmo_group');
        } else {
          setFolderType('private_folder');
        }
      }
    } catch (err) {
      console.error('Preview error:', err);
    }
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setCategoryId(val);
    const catObj = categories.find((c) => String(c.id) === String(val));
    const catName = (catObj?.category || '').trim().toLowerCase();
    if (catName.includes('hmo')) {
      setFolderType('hmo_group');
    } else if (catName.includes('private')) {
      setFolderType('private_folder');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!familyName.trim()) {
      setError('Family Name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        family_name: familyName.trim(),
        folder_type: folderType,
        category: categoryId || null,
        sponsor: sponsorId || null,
        family_number: familyNumber.trim() || undefined,
        physical_folder_number: folderType === 'private_folder' ? (physicalFolderNumber.trim() || undefined) : null,
        storage_location: folderType === 'private_folder' ? (storageLocation.trim() || undefined) : null,
        phone_number: phoneNumber.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        principal_patient_id: selectedPrincipalPatient ? selectedPrincipalPatient.id : undefined,
      };

      const res = await api.createFamilyFolder(payload);
      onCreated(res);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create family folder. Please check inputs.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1050 }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: '820px' }}>
        <div
          className="modal-content border-0 shadow-2xl"
          style={{
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Header with Gradient */}
          <div
            className="modal-header py-3 px-4 text-white d-flex align-items-center justify-content-between flex-shrink-0"
            style={{
              background:
                folderType === 'private_folder'
                  ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'
                  : 'linear-gradient(135deg, #0083B0 0%, #00B4DB 100%)',
            }}
          >
            <div>
              <div className="d-flex align-items-center">
                <span
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mr-2.5"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <i className={`fas fa-${folderType === 'private_folder' ? 'folder-plus' : 'users'}`}></i>
                </span>
                <h5 className="modal-title font-weight-bold mb-0" style={{ fontSize: '1.1rem', letterSpacing: '0.2px' }}>
                  {folderType === 'private_folder' ? 'Create Private Family Folder (Physical)' : 'Create HMO Family Group (Virtual)'}
                </h5>
                <span
                  className="badge ml-2.5 px-2 py-0.5 text-uppercase font-weight-bold"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    color: '#fff',
                    fontSize: '0.7rem',
                    letterSpacing: '0.6px',
                  }}
                >
                  {folderType === 'private_folder' ? 'Physical Archive' : 'Virtual HMO'}
                </span>
              </div>
              <div className="text-white-50 small mt-1" style={{ fontSize: '0.78rem' }}>
                Organize patient records into a shared family unit with auto-generated A, B, C suffixes.
              </div>
            </div>
            <button
              type="button"
              className="close text-white opacity-75 hover-opacity-100 p-2"
              onClick={onClose}
              style={{ textShadow: 'none', outline: 'none' }}
              aria-label="Close"
            >
              <span aria-hidden="true" style={{ fontSize: '1.4rem' }}>&times;</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Scrollable Body */}
            <div className="modal-body p-4" style={{ overflowY: 'auto', flex: 1 }}>
              {error && (
                <div className="alert alert-danger py-2 px-3 small mb-3 border-left-danger shadow-sm d-flex align-items-center">
                  <i className="fas fa-exclamation-triangle fa-lg mr-2 text-danger"></i>
                  <span className="font-weight-medium">{error}</span>
                </div>
              )}

              {/* 1. Classification Switcher: Modern Visual Cards */}
              <div className="mb-3">
                <label className="small font-weight-bold text-muted text-uppercase mb-1.5" style={{ letterSpacing: '0.5px' }}>
                  Select Family Classification
                </label>
                <div className="row no-gutters p-1 bg-light rounded-lg border" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="col-6 pr-1">
                    <button
                      type="button"
                      className={`btn btn-block text-left p-2.5 rounded transition-all ${
                        folderType === 'private_folder'
                          ? 'bg-white shadow-sm font-weight-bold'
                          : 'btn-light border-0 text-muted'
                      }`}
                      style={{
                        border: folderType === 'private_folder' ? '2px solid #2a5298' : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setFolderType('private_folder')}
                    >
                      <div className="d-flex align-items-center">
                        <div
                          className="rounded mr-2.5 d-flex align-items-center justify-content-center"
                          style={{
                            width: '36px',
                            height: '36px',
                            backgroundColor: folderType === 'private_folder' ? '#e8f0fe' : '#e2e8f0',
                            color: folderType === 'private_folder' ? '#1e3c72' : '#64748b',
                          }}
                        >
                          <i className="fas fa-folder fa-lg"></i>
                        </div>
                        <div>
                          <div
                            className="font-weight-bold"
                            style={{
                              fontSize: '0.88rem',
                              color: folderType === 'private_folder' ? '#1e3c72' : '#334155',
                            }}
                          >
                            Private Family Folder
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            Physical jacket &amp; archive rack location
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                  <div className="col-6 pl-1">
                    <button
                      type="button"
                      className={`btn btn-block text-left p-2.5 rounded transition-all ${
                        folderType === 'hmo_group'
                          ? 'bg-white shadow-sm font-weight-bold'
                          : 'btn-light border-0 text-muted'
                      }`}
                      style={{
                        border: folderType === 'hmo_group' ? '2px solid #0083B0' : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setFolderType('hmo_group')}
                    >
                      <div className="d-flex align-items-center">
                        <div
                          className="rounded mr-2.5 d-flex align-items-center justify-content-center"
                          style={{
                            width: '36px',
                            height: '36px',
                            backgroundColor: folderType === 'hmo_group' ? '#e0f7fa' : '#e2e8f0',
                            color: folderType === 'hmo_group' ? '#0083B0' : '#64748b',
                          }}
                        >
                          <i className="fas fa-users fa-lg"></i>
                        </div>
                        <div>
                          <div
                            className="font-weight-bold"
                            style={{
                              fontSize: '0.88rem',
                              color: folderType === 'hmo_group' ? '#0083B0' : '#334155',
                            }}
                          >
                            HMO Family Group
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            Virtual policy grouping under HMO sponsor
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Micro Info Callout */}
              <div
                className="p-2.5 px-3 rounded mb-3 small d-flex align-items-center"
                style={{
                  backgroundColor: folderType === 'private_folder' ? '#fffbeb' : '#f0fdf4',
                  border: `1px solid ${folderType === 'private_folder' ? '#fde68a' : '#bbf7d0'}`,
                  color: folderType === 'private_folder' ? '#92400e' : '#166534',
                }}
              >
                <i
                  className={`fas fa-${folderType === 'private_folder' ? 'info-circle' : 'shield-alt'} fa-lg mr-2`}
                  style={{ color: folderType === 'private_folder' ? '#d97706' : '#16a34a' }}
                ></i>
                <div style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                  {folderType === 'private_folder' ? (
                    <span>
                      <strong>Private Folder Requirement:</strong> A physical folder jacket will be prepared in the records room. Members are assigned suffix letters: <code>-A</code> for Head, <code>-B</code>, <code>-C</code> for dependents.
                    </span>
                  ) : (
                    <span>
                      <strong>HMO Policy Group:</strong> No physical jacket needed. Patients are grouped virtually under their HMO retainer. Suffixes <code>-A</code>, <code>-B</code> identify enrolled dependents.
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Section: Principal Member Selection */}
              <div className="card border-0 mb-3 shadow-xs" style={{ backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="font-weight-bold small text-dark mb-0 d-flex align-items-center">
                      <i className="fas fa-user-tie text-primary mr-1.5"></i>
                      Principal Member / Head of Family (Optional)
                    </label>
                    <div className="custom-control custom-checkbox small">
                      <input
                        type="checkbox"
                        className="custom-control-input"
                        id="startWithPrincipalCheck"
                        checked={startWithPrincipal}
                        onChange={(e) => {
                          setStartWithPrincipal(e.target.checked);
                          if (!e.target.checked) setSelectedPrincipalPatient(null);
                        }}
                      />
                      <label className="custom-control-label text-muted" htmlFor="startWithPrincipalCheck" style={{ cursor: 'pointer' }}>
                        Link existing patient as Principal
                      </label>
                    </div>
                  </div>

                  {startWithPrincipal && !selectedPrincipalPatient && (
                    <div>
                      <div className="input-group input-group-sm">
                        <div className="input-group-prepend">
                          <span className="input-group-text bg-white border-right-0">
                            <i className="fas fa-search text-muted"></i>
                          </span>
                        </div>
                        <input
                          type="text"
                          className="form-control border-left-0"
                          placeholder="Search patient by surname, first name, phone, or MRN (e.g. ISLH/ISL-2810)..."
                          value={patientSearchQuery}
                          onChange={(e) => setPatientSearchQuery(e.target.value)}
                        />
                        {searchingPatients && (
                          <div className="input-group-append">
                            <span className="input-group-text bg-white">
                              <i className="fas fa-spinner fa-spin text-primary"></i>
                            </span>
                          </div>
                        )}
                      </div>

                      {patientSearchResults.length > 0 && (
                        <div
                          className="list-group list-group-flush border rounded mt-1 bg-white shadow-sm"
                          style={{ maxHeight: '180px', overflowY: 'auto' }}
                        >
                          {patientSearchResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="list-group-item list-group-item-action py-2 px-3 d-flex justify-content-between align-items-center small"
                              onClick={() => handleSelectPrincipal(p)}
                            >
                              <div>
                                <strong className="text-dark">{p.surname} {p.first_name}</strong>
                                <span className="mx-1">&bull;</span>
                                <span className="text-danger font-weight-bold">{p.hospital_number || 'No MRN'}</span>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                  📞 {p.phone_number || 'No Phone'} &bull; Category: <span className="badge badge-light border">{p.category_name || 'Private'}</span>
                                </div>
                              </div>
                              <span className="btn btn-outline-primary btn-sm py-0.5 px-2.5 font-weight-bold" style={{ fontSize: '0.72rem' }}>
                                Select
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedPrincipalPatient && (
                    <div
                      className="bg-white p-3 rounded-lg border d-flex justify-content-between align-items-center shadow-xs"
                      style={{ borderLeft: '4px solid #4e73df' }}
                    >
                      <div className="d-flex align-items-center">
                        <div
                          className="rounded-circle mr-3 d-flex align-items-center justify-content-center text-white"
                          style={{
                            width: '42px',
                            height: '42px',
                            background: 'linear-gradient(135deg, #4e73df 0%, #224abe 100%)',
                            boxShadow: '0 2px 5px rgba(78, 115, 223, 0.3)',
                          }}
                        >
                          <i className="fas fa-crown"></i>
                        </div>
                        <div>
                          <div className="font-weight-bold text-dark h6 mb-1">
                            {selectedPrincipalPatient.surname} {selectedPrincipalPatient.first_name}
                          </div>
                          <div className="d-flex flex-wrap align-items-center gap-1.5 mb-1" style={{ gap: '6px' }}>
                            <span className="badge badge-light border text-dark font-weight-normal px-2 py-0.5">
                              MRN: <strong className="text-danger">{selectedPrincipalPatient.hospital_number}</strong>
                            </span>
                            <span className="badge badge-light border text-muted font-weight-normal px-2 py-0.5">
                              📞 {selectedPrincipalPatient.phone_number || 'No phone'}
                            </span>
                            <span className="badge badge-info-subtle border text-info px-2 py-0.5 font-weight-bold">
                              {selectedPrincipalPatient.category_name || (folderType === 'private_folder' ? 'Private' : 'HMO')}
                            </span>
                          </div>
                          <div className="small font-weight-bold" style={{ color: '#059669', fontSize: '0.78rem' }}>
                            <i className="fas fa-tag mr-1"></i>
                            Will be assigned:{' '}
                            <code className="text-success font-weight-bold" style={{ fontSize: '0.82rem' }}>
                              {familyNumber ? `${familyNumber}-A` : 'F/...-A'}
                            </code>{' '}
                            (First Member / Principal)
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm px-2.5 py-1 text-muted hover-text-dark"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => setSelectedPrincipalPatient(null)}
                      >
                        <i className="fas fa-sync-alt mr-1"></i> Change
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Section: Family Identifiers */}
              <div className="row">
                <div className="col-md-7 form-group mb-3">
                  <label className="small font-weight-bold text-dark mb-1">
                    Family Name / Household Title <span className="text-danger">*</span>
                  </label>
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-light text-muted">
                        <i className="fas fa-signature"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. Adebayo Family, Mr. & Mrs. Johnson"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-md-5 form-group mb-3">
                  <label className="small font-weight-bold text-dark mb-1">
                    Family Number (Prefix F/...)
                  </label>
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-light font-weight-bold text-primary">
                        <i className="fas fa-barcode"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control font-weight-bold text-primary"
                      placeholder="e.g. F/ISLH/ISL-2810"
                      value={familyNumber}
                      onChange={(e) => setFamilyNumber(e.target.value)}
                    />
                  </div>
                  <small className="text-muted d-block mt-0.5" style={{ fontSize: '0.71rem' }}>
                    Leave blank to auto-generate from principal MRN
                  </small>
                </div>
              </div>

              {/* 5. Section: Category & Sponsor */}
              <div className="row">
                <div className="col-md-6 form-group mb-3">
                  <label className="small font-weight-bold text-dark mb-1">Patient Category</label>
                  <select
                    className="custom-select custom-select-sm"
                    value={categoryId}
                    onChange={handleCategoryChange}
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6 form-group mb-3">
                  <label className="small font-weight-bold text-dark mb-1">
                    {folderType === 'private_folder' ? (
                      <>Hospital Affiliation / Sponsor <span className="text-muted font-weight-normal">(Optional)</span></>
                    ) : (
                      <>HMO Provider / Corporate Sponsor <span className="text-danger">*</span></>
                    )}
                  </label>
                  <select
                    className="custom-select custom-select-sm"
                    value={sponsorId}
                    onChange={(e) => setSponsorId(e.target.value)}
                    required={folderType === 'hmo_group'}
                  >
                    <option value="">
                      {folderType === 'private_folder' ? '-- None (Self-Pay / Private) --' : '-- Select HMO Sponsor --'}
                    </option>
                    {sponsors.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name} {sp.code ? `(${sp.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 6. Section: Physical Folder Storage (For Private Folders) */}
              {folderType === 'private_folder' && (
                <div
                  className="card border-0 mb-3 shadow-xs"
                  style={{
                    backgroundColor: '#fffdf5',
                    border: '1px solid #fef3c7',
                    borderLeft: '4px solid #f59e0b',
                    borderRadius: '8px',
                  }}
                >
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-archive mr-2" style={{ color: '#d97706' }}></i>
                      <span className="font-weight-bold small text-dark">
                        Physical Archive &amp; Records Room Details
                      </span>
                      <span className="badge badge-warning ml-2 px-2 py-0.5 font-weight-normal" style={{ fontSize: '0.7rem' }}>
                        Private Requirement
                      </span>
                    </div>

                    <div className="row">
                      <div className="col-md-6 form-group mb-0">
                        <label className="small font-weight-bold text-muted mb-1">
                          Physical Folder / Jacket No.
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. PF-0045 or F/ISLH/ISL-2810"
                          value={physicalFolderNumber}
                          onChange={(e) => setPhysicalFolderNumber(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6 form-group mb-0">
                        <label className="small font-weight-bold text-muted mb-1">
                          Shelf / Cabinet / Rack Location
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Records Room A, Rack 3, Shelf B"
                          value={storageLocation}
                          onChange={(e) => setStorageLocation(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. Section: Contact & Residential Details */}
              <div className="row">
                <div className="col-md-6 form-group mb-3">
                  <label className="small font-weight-bold text-dark mb-1">Family Contact Phone</label>
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-light text-muted">
                        <i className="fas fa-phone"></i>
                      </span>
                    </div>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 08031234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6 form-group mb-3">
                  <label className="small font-weight-bold text-dark mb-1">Residential Address</label>
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-light text-muted">
                        <i className="fas fa-map-marker-alt"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Street, City, State"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 8. Remarks */}
              <div className="form-group mb-1">
                <label className="small font-weight-bold text-dark mb-1">Folder Remarks / Instructions</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="2"
                  placeholder="Special instructions, family billing preferences, doctor recommendations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>
            </div>

            {/* Sticky Modern Footer */}
            <div className="modal-footer bg-light py-2.5 px-4 flex-shrink-0 d-flex justify-content-between align-items-center border-top">
              <div className="small text-muted d-none d-sm-block">
                {familyNumber ? (
                  <span>
                    Assigned: <strong className="text-primary">{familyNumber}</strong> &bull; Suffix: <strong className="text-success">-A</strong>
                  </span>
                ) : (
                  <span>Fill in the details to create family unit</span>
                )}
              </div>
              <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-light btn-sm px-3 text-secondary border font-weight-medium"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm font-weight-bold px-3 py-1.5 shadow-sm text-white"
                  style={{
                    background:
                      folderType === 'private_folder'
                        ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'
                        : 'linear-gradient(135deg, #0083B0 0%, #00B4DB 100%)',
                    border: 'none',
                    borderRadius: '6px',
                  }}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-1.5"></i> Creating Folder...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle mr-1.5"></i> Create Family Folder
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: AddFamilyMemberModal
// =========================================================================
function AddFamilyMemberModal({ isOpen, family, onClose, onMemberAdded }) {
  const [activeTab, setActiveTab] = useState('existing'); // 'existing' | 'new'

  // Tab 1: Existing Patient Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Tab 2: New Patient Registration Form
  const [newPatientForm, setNewPatientForm] = useState({
    surname: family?.family_name?.replace(/ Family$/i, '') || '',
    first_name: '',
    other_name: '',
    dob: '',
    gender: 'Female',
    patient_type: 'Single',
    phone_number: family?.phone_number || '',
    email_address: '',
    address: family?.address || '',
    next_of_kin_name: '',
    next_of_kin_relationship: '',
    next_of_kin_phone: '',
    allergies: '',
  });

  const [relationship, setRelationship] = useState('Dependent');
  const [isPrincipal, setIsPrincipal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Compute next letter suffix preview
  const nextSuffix = useMemo(() => {
    if (!family?.members) return 'A';
    const used = new Set(family.members.map((m) => m.letter_suffix));
    let index = 0;
    while (true) {
      let suffix = '';
      let n = index;
      while (n >= 0) {
        suffix = String.fromCharCode((n % 26) + 65) + suffix;
        n = Math.floor(n / 26) - 1;
      }
      if (!used.has(suffix)) return suffix;
      index++;
    }
  }, [family]);

  const assignedPreviewNumber = `${family?.family_number}-${nextSuffix}`;

  // Search existing patients
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.getPatients({ search: searchQuery.trim(), page_size: 8 });
        const list = res.results || (Array.isArray(res) ? res : []);
        setSearchResults(list);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (activeTab === 'existing' && !selectedPatient) {
      setError('Please select an existing registered patient.');
      return;
    }

    if (activeTab === 'new') {
      if (!newPatientForm.surname.trim() || !newPatientForm.first_name.trim()) {
        setError('Surname and First Name are required.');
        return;
      }
      if (!newPatientForm.dob) {
        setError('Date of Birth is required.');
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        relationship,
        is_principal: isPrincipal,
      };

      if (activeTab === 'existing') {
        payload.patient_id = selectedPatient.id;
      } else {
        payload.new_patient_data = newPatientForm;
      }

      const updated = await api.addFamilyMember(family.id, payload);
      onMemberAdded(updated);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add member to family.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1060 }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: '820px' }}>
        <div
          className="modal-content border-0 shadow-2xl"
          style={{
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="modal-header py-3 px-4 text-white d-flex align-items-center justify-content-between flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            }}
          >
            <div>
              <div className="d-flex align-items-center">
                <span
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mr-2.5"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  }}
                >
                  <i className="fas fa-user-plus"></i>
                </span>
                <h5 className="modal-title font-weight-bold mb-0" style={{ fontSize: '1.1rem' }}>
                  Add Member to {family.family_name}
                </h5>
                <span
                  className="badge ml-2.5 px-2 py-0.5 font-weight-bold"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#fff',
                    fontSize: '0.75rem',
                  }}
                >
                  {family.family_number}
                </span>
              </div>
              <div className="text-white-50 small mt-1" style={{ fontSize: '0.78rem' }}>
                Enroll an existing patient or register a new family member under this folder.
              </div>
            </div>
            <button
              type="button"
              className="close text-white opacity-75 hover-opacity-100 p-2"
              onClick={onClose}
              style={{ textShadow: 'none', outline: 'none' }}
              aria-label="Close"
            >
              <span aria-hidden="true" style={{ fontSize: '1.4rem' }}>&times;</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="modal-body p-4" style={{ overflowY: 'auto', flex: 1 }}>
              {error && (
                <div className="alert alert-danger py-2 px-3 small mb-3 border-left-danger shadow-sm d-flex align-items-center">
                  <i className="fas fa-exclamation-triangle fa-lg mr-2 text-danger"></i>
                  <span className="font-weight-medium">{error}</span>
                </div>
              )}

              {/* Number Preview Badge */}
              <div
                className="p-3 mb-3 rounded-lg border d-flex align-items-center justify-content-between shadow-xs"
                style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}
              >
                <div>
                  <span className="text-muted small d-block font-weight-medium mb-1">
                    <i className="fas fa-id-card-alt text-success mr-1"></i> Assigned Family Hospital Number
                  </span>
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="badge badge-success font-weight-bold px-3 py-1.5"
                      style={{ fontSize: '1rem', letterSpacing: '0.5px' }}
                    >
                      <i className="fas fa-barcode mr-1.5"></i>
                      {assignedPreviewNumber}
                    </span>
                    <span className="text-muted small ml-2">
                      (Next available family sequence)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="badge badge-white border text-dark font-weight-bold px-2.5 py-1.5 shadow-xs" style={{ fontSize: '0.85rem' }}>
                    Suffix: <strong className="text-success">{nextSuffix}</strong>
                  </span>
                </div>
              </div>

              {/* Mode Tabs */}
              <div className="row no-gutters p-1 bg-light rounded-lg border mb-3">
                <div className="col-6 pr-1">
                  <button
                    type="button"
                    className={`btn btn-block p-2 text-center rounded font-weight-bold transition-all ${
                      activeTab === 'existing'
                        ? 'bg-white shadow-sm text-primary'
                        : 'btn-light border-0 text-muted'
                    }`}
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => setActiveTab('existing')}
                  >
                    <i className="fas fa-search mr-1.5"></i> 1. Link Existing Patient
                  </button>
                </div>
                <div className="col-6 pl-1">
                  <button
                    type="button"
                    className={`btn btn-block p-2 text-center rounded font-weight-bold transition-all ${
                      activeTab === 'new'
                        ? 'bg-white shadow-sm text-success'
                        : 'btn-light border-0 text-muted'
                    }`}
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => setActiveTab('new')}
                  >
                    <i className="fas fa-user-plus mr-1.5"></i> 2. Register New Patient
                  </button>
                </div>
              </div>

              {/* Tab 1: Existing Patient */}
              {activeTab === 'existing' && (
                <div>
                  <label className="small font-weight-bold text-dark mb-1">
                    Search Patient Records
                  </label>
                  <div className="input-group input-group-sm mb-2">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0 text-muted">
                        <i className="fas fa-search"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0"
                      placeholder="Type patient surname, first name, phone, or current hospital number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searching && (
                      <div className="input-group-append">
                        <span className="input-group-text bg-white">
                          <i className="fas fa-spinner fa-spin text-primary"></i>
                        </span>
                      </div>
                    )}
                  </div>

                  {searchResults.length > 0 && !selectedPatient && (
                    <div
                      className="list-group list-group-flush border rounded mb-3 bg-white shadow-sm"
                      style={{ maxHeight: '200px', overflowY: 'auto' }}
                    >
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="list-group-item list-group-item-action py-2 px-3 d-flex justify-content-between align-items-center small"
                          onClick={() => {
                            setSelectedPatient(p);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                        >
                          <div>
                            <strong className="text-dark">{p.surname} {p.first_name}</strong>
                            <span className="mx-1">&bull;</span>
                            <span className="text-danger font-weight-bold">{p.hospital_number || 'No MRN'}</span>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              Age: {p.age || 'N/A'} • Gender: {p.gender} • 📞 {p.phone_number || 'N/A'}
                            </div>
                          </div>
                          <span className="badge badge-primary px-2.5 py-1 font-weight-bold">Select</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedPatient && (
                    <div
                      className="bg-white p-3 rounded-lg border mb-3 d-flex justify-content-between align-items-center shadow-xs"
                      style={{ borderLeft: '4px solid #10b981' }}
                    >
                      <div>
                        <div className="font-weight-bold text-dark h6 mb-1">
                          {selectedPatient.surname} {selectedPatient.first_name}
                        </div>
                        <div className="small text-muted mb-1">
                          Current Hospital No: <strong className="text-danger">{selectedPatient.hospital_number}</strong> • Age: {selectedPatient.age || 'N/A'} • Gender: {selectedPatient.gender}
                        </div>
                        <div className="small text-success font-weight-bold mb-1">
                          <i className="fas fa-check-circle mr-1"></i>
                          Hospital Number will update to: <code>{assignedPreviewNumber}</code>
                        </div>
                        <div className="small text-primary font-weight-bold">
                          <i className="fas fa-layer-group mr-1"></i>
                          Will maintain Principal Plan: <strong>{family.principal_patient_plan || 'Same as Principal'}</strong> ({family.principal_patient_sponsor || family.sponsor_name || 'Private'})
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm px-2.5 py-1"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => setSelectedPatient(null)}
                      >
                        <i className="fas fa-sync-alt mr-1"></i> Change
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: New Patient Registration */}
              {activeTab === 'new' && (
                <div>
                  <div className="row">
                    <div className="col-md-6 form-group mb-2.5">
                      <label className="small font-weight-bold text-dark mb-1">Surname <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        value={newPatientForm.surname}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, surname: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 form-group mb-2.5">
                      <label className="small font-weight-bold text-dark mb-1">First Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        value={newPatientForm.first_name}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, first_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 form-group mb-2.5">
                      <label className="small font-weight-bold text-dark mb-1">Other Name</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={newPatientForm.other_name}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, other_name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4 form-group mb-2.5">
                      <label className="small font-weight-bold text-dark mb-1">Date of Birth <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        required
                        value={newPatientForm.dob}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, dob: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4 form-group mb-2.5">
                      <label className="small font-weight-bold text-dark mb-1">Gender <span className="text-danger">*</span></label>
                      <select
                        className="custom-select custom-select-sm"
                        value={newPatientForm.gender}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value })}
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 form-group mb-2.5">
                      <label className="small font-weight-bold text-dark mb-1">
                        Phone Number <span className="text-muted font-weight-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        className="form-control form-control-sm"
                        placeholder="e.g. 08134657895"
                        value={newPatientForm.phone_number}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, phone_number: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 form-group mb-2.5">
                      <label className="small font-weight-bold text-dark mb-1">
                        Email Address <span className="text-muted font-weight-normal">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        placeholder="e.g. member@example.com (optional)"
                        value={newPatientForm.email_address}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, email_address: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group mb-2.5">
                    <label className="small font-weight-bold text-dark mb-1">
                      Residential Address <span className="text-muted font-weight-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Street, area, city..."
                      value={newPatientForm.address}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, address: e.target.value })}
                    />
                  </div>

                  {/* Next of Kin (Optional) */}
                  <div className="p-3 bg-light rounded border mb-2 mt-2">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="small font-weight-bold text-dark text-uppercase" style={{ letterSpacing: '0.5px' }}>
                        <i className="fas fa-user-shield text-primary mr-1"></i> Next of Kin / Emergency Contact
                      </span>
                      <span className="badge badge-light border text-muted small">Optional</span>
                    </div>
                    <div className="row">
                      <div className="col-md-5 form-group mb-2 mb-md-0">
                        <label className="small text-muted mb-1">Next of Kin Name</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Full name (optional)"
                          value={newPatientForm.next_of_kin_name}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, next_of_kin_name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-3 form-group mb-2 mb-md-0">
                        <label className="small text-muted mb-1">Relationship</label>
                        <select
                          className="custom-select custom-select-sm"
                          value={newPatientForm.next_of_kin_relationship}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, next_of_kin_relationship: e.target.value })}
                        >
                          <option value="">-- Optional --</option>
                          {NEXT_OF_KIN_RELATIONSHIPS.map((rel) => (
                            <option key={rel} value={rel}>{rel}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4 form-group mb-0">
                        <label className="small text-muted mb-1">Next of Kin Phone</label>
                        <input
                          type="tel"
                          className="form-control form-control-sm"
                          placeholder="Phone number (optional)"
                          value={newPatientForm.next_of_kin_phone}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, next_of_kin_phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Relationship & Head options */}
              <div className="border-top pt-3 mt-3">
                <div className="row align-items-center">
                  <div className="col-md-6 form-group mb-0">
                    <label className="small font-weight-bold text-dark mb-1">
                      Relationship to Family Head <span className="text-danger">*</span>
                    </label>
                    <select
                      className="custom-select custom-select-sm"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                    >
                      {RELATIONSHIP_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 pt-3">
                    <div className="custom-control custom-checkbox small">
                      <input
                        type="checkbox"
                        className="custom-control-input"
                        id="isPrincipalCheck"
                        checked={isPrincipal}
                        onChange={(e) => setIsPrincipal(e.target.checked)}
                      />
                      <label className="custom-control-label font-weight-bold text-dark" htmlFor="isPrincipalCheck" style={{ cursor: 'pointer' }}>
                        Mark as Principal / Head of Family
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="modal-footer bg-light py-2.5 px-4 flex-shrink-0 d-flex justify-content-between align-items-center border-top">
              <div className="small text-muted">
                Hospital Number: <strong className="text-success">{assignedPreviewNumber}</strong>
              </div>
              <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-light btn-sm px-3 text-secondary border font-weight-medium"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm font-weight-bold px-3 py-1.5 shadow-sm text-white"
                  style={{
                    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                    border: 'none',
                    borderRadius: '6px',
                  }}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-1.5"></i> Enrolling...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle mr-1.5"></i> Enroll Member ({assignedPreviewNumber})
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: EditFamilyFolderModal
// =========================================================================
function EditFamilyFolderModal({ isOpen, family, onClose, onSaved }) {
  const [familyName, setFamilyName] = useState(family?.family_name || '');
  const [physicalFolderNumber, setPhysicalFolderNumber] = useState(family?.physical_folder_number || '');
  const [storageLocation, setStorageLocation] = useState(family?.storage_location || '');
  const [phoneNumber, setPhoneNumber] = useState(family?.phone_number || '');
  const [address, setAddress] = useState(family?.address || '');
  const [notes, setNotes] = useState(family?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await api.updateFamilyFolder(family.id, {
        family_name: familyName.trim(),
        physical_folder_number: physicalFolderNumber.trim() || null,
        storage_location: storageLocation.trim() || null,
        phone_number: phoneNumber.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      onSaved(res);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update family details.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1060 }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '600px' }}>
        <div
          className="modal-content border-0 shadow-2xl"
          style={{
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            className="modal-header py-3 px-4 text-white d-flex align-items-center justify-content-between flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            }}
          >
            <div>
              <div className="d-flex align-items-center">
                <span
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mr-2.5"
                  style={{
                    width: '30px',
                    height: '30px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <i className="fas fa-edit"></i>
                </span>
                <h5 className="modal-title font-weight-bold mb-0" style={{ fontSize: '1.05rem' }}>
                  Edit Family Details
                </h5>
                <span
                  className="badge ml-2 px-2 py-0.5 font-weight-bold"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    color: '#fff',
                    fontSize: '0.75rem',
                  }}
                >
                  {family.family_number}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="close text-white opacity-75 hover-opacity-100 p-2"
              onClick={onClose}
              style={{ textShadow: 'none', outline: 'none' }}
              aria-label="Close"
            >
              <span aria-hidden="true" style={{ fontSize: '1.4rem' }}>&times;</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="modal-body p-4" style={{ overflowY: 'auto', flex: 1 }}>
              {error && (
                <div className="alert alert-danger py-2 px-3 small mb-3 border-left-danger shadow-sm">
                  <i className="fas fa-exclamation-triangle mr-1.5"></i> {error}
                </div>
              )}

              <div className="form-group mb-3">
                <label className="small font-weight-bold text-dark mb-1">Family Name *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  required
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                />
              </div>

              {family.folder_type === 'private_folder' && (
                <div
                  className="p-3 mb-3 rounded-lg border shadow-xs"
                  style={{ backgroundColor: '#fffdf5', borderColor: '#fef3c7', borderLeft: '4px solid #f59e0b' }}
                >
                  <span className="small font-weight-bold text-dark d-block mb-2">
                    <i className="fas fa-archive mr-1.5 text-warning"></i> Physical Archive Location
                  </span>
                  <div className="row">
                    <div className="col-md-6 form-group mb-0">
                      <label className="small font-weight-bold text-muted mb-1">Physical Folder No.</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={physicalFolderNumber}
                        onChange={(e) => setPhysicalFolderNumber(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6 form-group mb-0">
                      <label className="small font-weight-bold text-muted mb-1">Shelf / Storage Location</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={storageLocation}
                        onChange={(e) => setStorageLocation(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="row">
                <div className="col-md-6 form-group mb-3">
                  <label className="small font-weight-bold text-dark mb-1">Family Contact Phone</label>
                  <input
                    type="tel"
                    className="form-control form-control-sm"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="col-md-6 form-group mb-3">
                  <label className="small font-weight-bold text-dark mb-1">Residential Address</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="small font-weight-bold text-dark mb-1">Notes / Special Instructions</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="modal-footer bg-light py-2.5 px-4 flex-shrink-0 d-flex justify-content-end align-items-center border-top" style={{ gap: '8px' }}>
              <button type="button" className="btn btn-light btn-sm px-3 text-secondary border font-weight-medium" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-sm font-weight-bold px-3.5 py-1.5 shadow-sm text-white"
                style={{
                  background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                  border: 'none',
                  borderRadius: '6px',
                }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-1.5"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-1.5"></i> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: PrintFamilySheetModal
// =========================================================================
function PrintFamilySheetModal({ isOpen, family, onClose }) {
  if (!isOpen || !family) return null;

  const handlePrint = () => {
    const printableEl = document.getElementById('printableFamilySheet');
    if (!printableEl) {
      window.print();
      return;
    }

    try {
      const oldIframe = document.getElementById('clinic365_family_print_frame');
      if (oldIframe && document.body.contains(oldIframe)) {
        document.body.removeChild(oldIframe);
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'clinic365_family_print_frame';
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
      const processedHtml = printableEl.innerHTML.split('src="/admin-img/').join(`src="${origin}/admin-img/`);

      const hostStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((el) => el.outerHTML)
        .join('\n');

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Family Folder - ${family.family_number || ''}</title>
            ${hostStyles}
            <style>
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 6px !important;
                background: #ffffff !important;
                color: #0f172a !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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
    } catch (err) {
      window.print();
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1070 }} tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-dark text-white py-2.5 d-print-none">
            <h5 className="modal-title font-weight-bold" style={{ fontSize: '1rem' }}>
              <i className="fas fa-print mr-2"></i> Print Family Folder Label &amp; Roster Sheet
            </h5>
            <div className="d-flex align-items-center gap-2">
              <button type="button" className="btn btn-success btn-sm font-weight-bold mr-2" onClick={handlePrint}>
                <i className="fas fa-print mr-1"></i> Print Now
              </button>
              <button type="button" className="close text-white" onClick={onClose}>
                <span>&times;</span>
              </button>
            </div>
          </div>

          <div className="modal-body p-4 bg-white" id="printableFamilySheet">
            {/* Hospital Branding Header */}
            <div className="text-center pb-3 border-bottom mb-3">
              <img
                src="/admin-img/isalu-emblem-transparent.png"
                alt="Isalu Hospitals"
                style={{ height: '48px', objectFit: 'contain' }}
                className="mb-1"
              />
              <h4 className="font-weight-bold mb-0" style={{ letterSpacing: '1px' }}>
                ISALU HOSPITALS LIMITED
              </h4>
              <div className="text-muted small">
                Records Management &bull; Medical Records Department (MRD)
              </div>
            </div>

            {/* Folder Header Banner */}
            <div className="p-3 mb-3 border rounded bg-light">
              <div className="row align-items-center">
                <div className="col-8">
                  <span className="badge badge-dark px-2 py-1 mb-1 font-weight-bold" style={{ fontSize: '0.8rem' }}>
                    {family.folder_type === 'private_folder' ? '📁 PRIVATE FAMILY FOLDER' : '👥 HMO FAMILY GROUP'}
                  </span>
                  <h3 className="font-weight-bold text-dark mb-0">
                    {family.family_name}
                  </h3>
                  <div className="small text-muted mt-1">
                    Phone: <strong>{family.phone_number || 'N/A'}</strong> &bull; Address: <strong>{family.address || 'N/A'}</strong>
                  </div>
                </div>

                <div className="col-4 text-right">
                  <div className="font-weight-bold text-muted small">FAMILY NUMBER:</div>
                  <div className="h4 font-weight-bold text-danger mb-0 font-monospace" style={{ letterSpacing: '1px' }}>
                    {family.family_number}
                  </div>
                  {family.folder_type === 'private_folder' && family.storage_location && (
                    <div className="badge badge-success mt-1 px-2 py-1">
                      Archive Location: {family.storage_location}
                    </div>
                  )}
                  {family.sponsor_name && (
                    <div className="badge badge-info mt-1 px-2 py-1">
                      Sponsor: {family.sponsor_name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Member Roster Table */}
            <h6 className="font-weight-bold text-dark border-bottom pb-1 mb-2">
              <i className="fas fa-list-ol mr-1"></i> ENROLLED FAMILY MEMBERS ROSTER
            </h6>

            <table className="table table-bordered table-sm mb-3" style={{ fontSize: '0.85rem' }}>
              <thead className="thead-light">
                <tr>
                  <th style={{ width: '8%' }} className="text-center">Code</th>
                  <th style={{ width: '25%' }}>Hospital Number (MRN)</th>
                  <th style={{ width: '32%' }}>Member Full Name</th>
                  <th style={{ width: '15%' }}>Relationship</th>
                  <th style={{ width: '10%' }}>Age/Gender</th>
                  <th style={{ width: '10%' }}>Original MRN</th>
                </tr>
              </thead>
              <tbody>
                {family.members && family.members.length > 0 ? (
                  family.members.map((mem) => (
                    <tr key={mem.id}>
                      <td className="text-center font-weight-bold bg-light">
                        {mem.letter_suffix}
                      </td>
                      <td className="font-weight-bold text-danger">
                        {mem.assigned_hospital_number}
                      </td>
                      <td className="font-weight-bold">
                        {mem.patient_name || `${mem.patient_surname} ${mem.patient_first_name}`}
                        {mem.is_principal && (
                          <span className="badge badge-warning text-dark ml-1" style={{ fontSize: '0.65rem' }}>
                            Head
                          </span>
                        )}
                      </td>
                      <td>{mem.relationship}</td>
                      <td>
                        {mem.patient_age !== null ? `${mem.patient_age}y` : '-'} / {mem.patient_gender?.[0] || '-'}
                      </td>
                      <td className="text-muted small">
                        {mem.original_hospital_number || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-2">
                      No members enrolled in this folder.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Remarks / Archival Sign-off */}
            <div className="row mt-4 pt-3 border-top small text-muted">
              <div className="col-6">
                <div>Folder Remarks: {family.notes || 'None recorded'}</div>
                <div className="mt-1">Date Created: {new Date(family.created_date).toLocaleString()}</div>
              </div>
              <div className="col-6 text-right">
                <div style={{ minHeight: '30px' }}></div>
                <div className="border-top d-inline-block pt-1" style={{ minWidth: '180px' }}>
                  Medical Records Officer Signature
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer bg-light py-2 d-print-none">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn-success btn-sm font-weight-bold" onClick={handlePrint}>
              <i className="fas fa-print mr-1"></i> Print Sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
