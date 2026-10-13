import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { showToast } from './Toast';

const COMMON_SEED_DIAGNOSES = [
  { description: 'Malaria (Uncomplicated)', category: 'General', icd10_code: 'B54' },
  { description: 'Acute Upper Respiratory Tract Infection (URTI)', category: 'Respiratory', icd10_code: 'J06.9' },
  { description: 'Essential Hypertension', category: 'Cardiovascular', icd10_code: 'I10' },
  { description: 'Acute Gastroenteritis', category: 'Gastrointestinal', icd10_code: 'A09' },
  { description: 'Peptic Ulcer Disease (PUD)', category: 'Gastrointestinal', icd10_code: 'K27' },
  { description: 'Enteric Fever (Typhoid)', category: 'Infectious', icd10_code: 'A01.0' },
  { description: 'Bronchitis', category: 'Respiratory', icd10_code: 'J40' },
  { description: 'Urinary Tract Infection (UTI)', category: 'Genitourinary', icd10_code: 'N39.0' },
  { description: 'Diabetes Mellitus Type 2', category: 'Endocrine', icd10_code: 'E11' },
  { description: 'Tension Headache', category: 'Neurological', icd10_code: 'G44.2' },
  { description: 'Bronchial Asthma', category: 'Respiratory', icd10_code: 'J45' },
  { description: 'Community-Acquired Pneumonia (CAP)', category: 'Respiratory', icd10_code: 'J18.9' },
  { description: 'Migraine without Aura', category: 'Neurological', icd10_code: 'G43.0' },
  { description: 'Acute Tonsillitis / Pharyngitis', category: 'ENT', icd10_code: 'J03.9' },
  { description: 'Otitis Media', category: 'ENT', icd10_code: 'H66.9' },
  { description: 'Skin Sepsis / Cellulitis', category: 'Dermatological', icd10_code: 'L03.9' },
  { description: 'Allergic Rhinitis / Conjunctivitis', category: 'Allergy', icd10_code: 'J30.9' },
  { description: 'Low Back Pain / Lumbago', category: 'Musculoskeletal', icd10_code: 'M54.5' },
  { description: 'Osteoarthritis', category: 'Musculoskeletal', icd10_code: 'M19.9' },
  { description: 'Pelvic Inflammatory Disease (PID)', category: 'Gynecological', icd10_code: 'N73.9' },
  { description: 'Vulvovaginal Candidiasis', category: 'Gynecological', icd10_code: 'B37.3' },
  { description: 'Gastroesophageal Reflux Disease (GERD)', category: 'Gastrointestinal', icd10_code: 'K21.9' },
  { description: 'Iron Deficiency Anemia', category: 'Hematology', icd10_code: 'D50.9' },
  { description: 'Sickle Cell Anemia / Crisis', category: 'Hematology', icd10_code: 'D57.0' },
  { description: 'Benign Prostatic Hyperplasia (BPH)', category: 'Genitourinary', icd10_code: 'N40' },
  { description: 'Acute Appendicitis', category: 'Surgical', icd10_code: 'K35.8' },
];

export default function DiagnosesSetupView({ onBack }) {
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Single Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    category: 'General',
    icd10_code: '',
    icd11_code: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Bulk Upload Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    item: null,
    loading: false,
  });

  // Fetch all diagnoses from database
  const fetchDiagnoses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getDiagnoses({ all: 'true' });
      const list = Array.isArray(res) ? res : (res?.results || []);
      setDiagnoses(list);
    } catch (err) {
      console.error('Error fetching diagnoses:', err);
      showToast('Could not load diagnoses from database.', 'danger', 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnoses();
  }, [fetchDiagnoses]);

  // Compute unique categories
  const categoriesList = Array.from(
    new Set(
      diagnoses
        .map((d) => d.category?.trim())
        .filter(Boolean)
    )
  ).sort();

  // Filter diagnoses
  const filteredDiagnoses = diagnoses.filter((d) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      (d.description && d.description.toLowerCase().includes(term)) ||
      (d.category && d.category.toLowerCase().includes(term)) ||
      (d.icd10_code && d.icd10_code.toLowerCase().includes(term)) ||
      (d.icd11_code && d.icd11_code.toLowerCase().includes(term));

    const matchesCategory =
      selectedCategory === 'all' ||
      (d.category && d.category.toLowerCase() === selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      description: '',
      category: 'General',
      icd10_code: '',
      icd11_code: '',
      is_active: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      description: item.description || '',
      category: item.category || 'General',
      icd10_code: item.icd10_code || '',
      icd11_code: item.icd11_code || '',
      is_active: item.is_active !== undefined ? item.is_active : true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Single Diagnosis (Create or Edit)
  const handleSubmitSingle = async (e) => {
    e.preventDefault();
    const cleanDesc = formData.description.trim();
    if (!cleanDesc) {
      setFormError('Diagnosis name / description is required.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload = {
        description: cleanDesc,
        category: formData.category.trim() || 'General',
        icd10_code: formData.icd10_code.trim(),
        is_active: formData.is_active,
      };

      if (editingItem) {
        await api.updateDiagnosis(editingItem.id, payload);
        showToast(`Diagnosis "${cleanDesc}" updated successfully!`, 'success', 'Diagnosis Updated');
      } else {
        await api.createDiagnosis(payload);
        showToast(`Diagnosis "${cleanDesc}" added to directory!`, 'success', 'Diagnosis Created');
      }

      setIsModalOpen(false);
      fetchDiagnoses();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to save diagnosis.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (item) => {
    try {
      await api.updateDiagnosis(item.id, { is_active: !item.is_active });
      showToast(
        `Diagnosis "${item.description}" marked as ${!item.is_active ? 'Active' : 'Inactive'}.`,
        'info'
      );
      fetchDiagnoses();
    } catch (err) {
      showToast('Could not update status.', 'danger', 'Error');
    }
  };

  // Open Delete Modal
  const openDeleteModal = (item) => {
    setDeleteModal({
      isOpen: true,
      item,
      loading: false,
    });
  };

  // Execute Delete
  const handleExecuteDelete = async () => {
    if (!deleteModal.item) return;
    try {
      setDeleteModal((prev) => ({ ...prev, loading: true }));
      await api.deleteDiagnosis(deleteModal.item.id);
      showToast(`Diagnosis "${deleteModal.item.description}" removed from directory.`, 'warning', 'Diagnosis Deleted');
      setDeleteModal({ isOpen: false, item: null, loading: false });
      fetchDiagnoses();
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Failed to delete diagnosis.', 'danger', 'Error');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Download CSV Template
  const handleDownloadTemplate = () => {
    try {
      const csvContent =
        'description,category,icd10_code\r\n' +
        'Malaria (Uncomplicated),General,B54\r\n' +
        'Essential Hypertension,Cardiovascular,I10\r\n' +
        'Acute Gastroenteritis,Gastrointestinal,A09\r\n' +
        'Type 2 Diabetes Mellitus,Endocrine,E11\r\n' +
        'Enteric Fever (Typhoid),Infectious,A01.0\r\n' +
        'Bronchial Asthma,Respiratory,J45\r\n' +
        'Peptic Ulcer Disease (PUD),Gastrointestinal,K27\r\n';

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'diagnoses_bulk_import_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Template downloaded: diagnoses_bulk_import_template.csv', 'info', 'Template Downloaded');
    } catch (err) {
      showToast('Error downloading template: ' + err.message, 'danger', 'Error');
    }
  };

  // Handle Bulk Upload File Submission
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      setBulkError('Please select an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    try {
      setUploadingBulk(true);
      setBulkError(null);
      setBulkResult(null);

      const form = new FormData();
      form.append('file', bulkFile);

      const res = await api.bulkImportDiagnoses(form);
      setBulkResult(res);
      showToast(res.message || 'Bulk diagnoses imported successfully!', 'success', 'Import Successful');
      setBulkFile(null);
      fetchDiagnoses();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to import bulk file.';
      setBulkError(msg);
    } finally {
      setUploadingBulk(false);
    }
  };

  // Seed Standard Diagnoses
  const handleSeedStandard = async () => {
    try {
      setUploadingBulk(true);
      const res = await api.bulkImportDiagnoses({ items: COMMON_SEED_DIAGNOSES });
      showToast(res.message || 'Standard clinical diagnoses loaded successfully!', 'success', 'Catalog Loaded');
      fetchDiagnoses();
      setIsBulkModalOpen(false);
    } catch (err) {
      showToast('Failed to seed standard diagnoses: ' + err.message, 'danger', 'Error');
    } finally {
      setUploadingBulk(false);
    }
  };

  return (
    <div className="container-fluid py-2">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 pb-2" style={{ gap: '16px' }}>
        <div className="d-flex align-items-center">
          {onBack && (
            <button
              type="button"
              className="btn btn-sm btn-white border shadow-sm mr-3 text-secondary d-flex align-items-center"
              style={{ borderRadius: '8px', height: '40px', padding: '0 14px' }}
              onClick={onBack}
              title="Return to Appointments / Dashboard"
            >
              <i className="fas fa-arrow-left mr-1.5"></i>
              <span>Back</span>
            </button>
          )}

          <div
            className="d-none d-sm-flex align-items-center justify-content-center mr-3 shadow-sm"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              fontSize: '1.25rem',
              flexShrink: 0,
            }}
          >
            <i className="fas fa-book-medical"></i>
          </div>

          <div>
            <h1 className="h3 mb-0 font-weight-bold text-gray-900" style={{ letterSpacing: '-0.02em', fontSize: '1.45rem' }}>
              Medical Diagnoses Directory &amp; Bulk Setup
            </h1>
            <p className="text-muted small mb-0 mt-1" style={{ fontSize: '0.84rem' }}>
              Master diagnoses catalog loaded directly from database &bull; Searchable during consultations &bull; Bulk import Excel/CSV
            </p>
          </div>
        </div>

        {/* Action Button Cluster */}
        <div className="d-flex align-items-center flex-wrap" style={{ gap: '10px' }}>
          <button
            type="button"
            className="btn btn-sm btn-white border shadow-sm font-weight-bold d-inline-flex align-items-center px-3"
            style={{
              height: '38px',
              borderRadius: '8px',
              borderColor: '#cbd5e1',
              color: '#334155',
              fontSize: '0.84rem',
              backgroundColor: '#ffffff',
            }}
            onClick={handleDownloadTemplate}
            title="Download formatted CSV template for bulk importing diagnoses"
          >
            <i className="fas fa-file-download text-success mr-2"></i>
            <span>Download Template</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-white border shadow-sm font-weight-bold d-inline-flex align-items-center px-3"
            style={{
              height: '38px',
              borderRadius: '8px',
              borderColor: '#cbd5e1',
              color: '#334155',
              fontSize: '0.84rem',
              backgroundColor: '#ffffff',
            }}
            onClick={() => {
              setBulkError(null);
              setBulkResult(null);
              setBulkFile(null);
              setIsBulkModalOpen(true);
            }}
            title="Bulk import diagnoses from Excel (.xlsx, .xls) or CSV"
          >
            <i className="fas fa-file-upload text-primary mr-2"></i>
            <span>Bulk Upload (Excel / CSV)</span>
          </button>

          <button
            type="button"
            className="btn btn-sm text-white font-weight-bold d-inline-flex align-items-center px-3 shadow"
            style={{
              height: '38px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              fontSize: '0.84rem',
            }}
            onClick={handleOpenCreate}
          >
            <i className="fas fa-plus mr-2"></i>
            <span>+ Add New Diagnosis</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="row mb-4">
        {/* Total Diagnoses */}
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-primary shadow-sm h-100 py-2">
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Diagnoses in Database
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">{diagnoses.length}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-database fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Diagnoses */}
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-success shadow-sm h-100 py-2">
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Active Catalog
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">
                    {diagnoses.filter((d) => d.is_active).length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-check-circle fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-info shadow-sm h-100 py-2">
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Clinical Categories
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">
                    {categoriesList.length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-tags fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Matches */}
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-warning shadow-sm h-100 py-2">
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Filtered / Matching
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">
                    {filteredDiagnoses.length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-filter fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card shadow mb-4">
        {/* Card Header & Controls */}
        <div className="card-header bg-white py-3 px-4 border-bottom">
          <div className="d-flex flex-wrap align-items-center justify-content-between" style={{ gap: '12px' }}>
            {/* Search Box */}
            <div className="position-relative" style={{ minWidth: '240px', maxWidth: '380px', flex: 1 }}>
              <i
                className="fas fa-search text-muted position-absolute"
                style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.84rem' }}
              ></i>
              <input
                type="text"
                className="form-control form-control-sm pl-4 pr-4"
                placeholder="Search diagnosis name, ICD-10, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  height: '38px',
                  borderRadius: '8px',
                  borderColor: '#cbd5e1',
                  fontSize: '0.84rem',
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-sm btn-link position-absolute text-muted p-0"
                  style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  onClick={() => setSearchTerm('')}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="d-flex align-items-center" style={{ gap: '8px' }}>
              <label className="small text-muted mb-0 font-weight-bold text-nowrap">Category:</label>
              <select
                className="form-control form-control-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  height: '38px',
                  borderRadius: '8px',
                  borderColor: '#cbd5e1',
                  fontSize: '0.84rem',
                  minWidth: '160px',
                }}
              >
                <option value="all">All Categories ({diagnoses.length})</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Refresh button */}
              <button
                type="button"
                className="btn btn-sm btn-white border shadow-sm font-weight-bold d-inline-flex align-items-center"
                style={{
                  height: '38px',
                  borderRadius: '8px',
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  padding: '0 12px',
                }}
                onClick={fetchDiagnoses}
                disabled={loading}
                title="Refresh from database"
              >
                <i className={`fas fa-sync-alt mr-1.5 ${loading ? 'fa-spin text-primary' : 'text-secondary'}`}></i>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card Body: Diagnoses Table */}
        <div className="card-body p-0">
          <div className="table-responsive" style={{ minHeight: '300px' }}>
            <table className="table table-hover table-bordered mb-0" width="100%" cellSpacing="0">
              <thead className="thead-light">
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Diagnosis Name &amp; Description</th>
                  <th style={{ width: '160px' }}>Clinical Category</th>
                  <th style={{ width: '120px' }}>ICD-10 Code</th>
                  <th style={{ width: '130px' }}>ICD-11 (WHO)</th>
                  <th style={{ width: '110px' }}>Status</th>
                  <th style={{ width: '130px' }} className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Loading diagnoses...</span>
                      </div>
                      <div className="mt-2 text-muted small">Loading diagnoses from database...</div>
                    </td>
                  </tr>
                ) : filteredDiagnoses.length > 0 ? (
                  filteredDiagnoses.map((item, idx) => (
                    <tr key={item.id} className={!item.is_active ? 'bg-light text-muted' : ''}>
                      <td className="align-middle text-center small text-muted">{idx + 1}</td>
                      <td className="align-middle">
                        <div className="d-flex align-items-center">
                          <span
                            className="d-inline-flex align-items-center justify-content-center mr-2 rounded"
                            style={{
                              width: '26px',
                              height: '26px',
                              backgroundColor: item.is_active ? '#eff6ff' : '#f1f5f9',
                              color: item.is_active ? '#2563eb' : '#94a3b8',
                              fontSize: '0.78rem',
                            }}
                          >
                            <i className="fas fa-stethoscope"></i>
                          </span>
                          <span className="font-weight-bold text-gray-900">{item.description}</span>
                        </div>
                      </td>
                      <td className="align-middle">
                        <span className="badge badge-light border text-secondary px-2 py-1 font-weight-normal" style={{ fontSize: '0.80rem' }}>
                          <i className="fas fa-folder-open mr-1 text-primary"></i>
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="align-middle">
                        {item.icd10_code ? (
                          <span className="badge badge-primary px-2 py-1 font-weight-bold" style={{ fontSize: '0.76rem', letterSpacing: '0.5px' }}>
                            {item.icd10_code}
                          </span>
                        ) : (
                          <span className="text-muted small italic">-</span>
                        )}
                      </td>
                      <td className="align-middle">
                        {item.icd11_code ? (
                          <span className="badge badge-info px-2 py-1 font-weight-bold" style={{ fontSize: '0.76rem', letterSpacing: '0.5px' }}>
                            <i className="fas fa-globe mr-1"></i>
                            {item.icd11_code}
                          </span>
                        ) : (
                          <span className="text-muted small italic">-</span>
                        )}
                      </td>
                      <td className="align-middle">
                        <button
                          type="button"
                          className={`badge ${item.is_active ? 'badge-success' : 'badge-secondary'} border-0 px-2 py-1 cursor-pointer`}
                          style={{ cursor: 'pointer', fontSize: '0.76rem' }}
                          onClick={() => handleToggleActive(item)}
                          title="Click to toggle Active / Inactive"
                        >
                          <i className={`fas fa-${item.is_active ? 'check' : 'ban'} mr-1`}></i>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="align-middle text-center">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit diagnosis details"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => openDeleteModal(item)}
                            title="Delete diagnosis"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <i className="fas fa-notes-medical fa-3x text-gray-300 mb-3 d-block"></i>
                      <div className="font-weight-bold">No diagnoses found matching this criteria</div>
                      <div className="small mt-1">
                        Use "+ Add New Diagnosis" or "Bulk Upload" to populate diagnoses into the database.
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary mr-2"
                          onClick={() => setIsBulkModalOpen(true)}
                        >
                          <i className="fas fa-file-upload mr-1"></i> Bulk Upload (Excel / CSV)
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={handleOpenCreate}
                        >
                          <i className="fas fa-plus mr-1"></i> Add Individual Diagnosis
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="card-footer bg-light py-2 px-4 d-flex justify-content-between align-items-center small text-muted">
          <span>
            Showing <strong>{filteredDiagnoses.length}</strong> of <strong>{diagnoses.length}</strong> total registered diagnoses.
          </span>
          <span>
            Directly synced with Doctor Consultation &bull; Clinic365 HIS
          </span>
        </div>
      </div>

      {/* ===================== MODALS ===================== */}

      {/* 1. Add / Edit Diagnosis Modal */}
      {isModalOpen && (
        <>
          <div
            className="modal-backdrop-custom"
            onClick={() => !saving && setIsModalOpen(false)}
            style={{ zIndex: 1060, backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
          ></div>
          <div
            className="card shadow-lg modal-custom"
            style={{
              maxWidth: '520px',
              width: '92%',
              zIndex: 1070,
              borderRadius: '16px',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
            }}
          >
            <div className="card-header py-3 px-4 bg-gradient-primary text-white d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <i className="fas fa-stethoscope fa-lg mr-2"></i>
                <h5 className="mb-0 font-weight-bold text-white" style={{ fontSize: '1.05rem' }}>
                  {editingItem ? 'Edit Diagnosis' : 'Add New Clinical Diagnosis'}
                </h5>
              </div>
              <button
                type="button"
                className="close text-white"
                disabled={saving}
                onClick={() => setIsModalOpen(false)}
                style={{ opacity: 0.9 }}
              >
                <span>&times;</span>
              </button>
            </div>

            <form onSubmit={handleSubmitSingle}>
              <div className="card-body p-4">
                {formError && (
                  <div className="alert alert-danger py-2 small mb-3">
                    <i className="fas fa-exclamation-circle mr-1"></i> {formError}
                  </div>
                )}

                <div className="form-group mb-3">
                  <label className="font-weight-bold small text-gray-700">
                    Diagnosis Name / Description <span className="text-danger">*</span>:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Acute Malaria, Hypertension, Peptic Ulcer Disease..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    style={{ borderRadius: '8px' }}
                  />
                  <small className="text-muted">
                    This is what clinicians will see and search for when typing in encounters.
                  </small>
                </div>

                <div className="form-row mb-3">
                  <div className="col-md-6">
                    <label className="font-weight-bold small text-gray-700">Clinical Category:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. General, Cardiovascular, Respiratory..."
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      list="categories-datalist"
                      style={{ borderRadius: '8px' }}
                    />
                    <datalist id="categories-datalist">
                      {categoriesList.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div className="col-md-3">
                    <label className="font-weight-bold small text-gray-700">ICD-10 Code:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. B54, I10"
                      value={formData.icd10_code}
                      onChange={(e) => setFormData({ ...formData, icd10_code: e.target.value })}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="font-weight-bold small text-gray-700">
                      <i className="fas fa-globe text-info mr-1"></i> ICD-11 (WHO):
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 1F40, BA00"
                      value={formData.icd11_code}
                      onChange={(e) => setFormData({ ...formData, icd11_code: e.target.value })}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                </div>

                <div className="form-group mb-0">
                  <div className="custom-control custom-checkbox">
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id="diagIsActive"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <label className="custom-control-label small font-weight-bold text-gray-700" htmlFor="diagIsActive">
                      Active (Display in doctor consultation search dropdown)
                    </label>
                  </div>
                </div>
              </div>

              <div className="card-footer bg-light py-3 px-4 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  disabled={saving}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary font-weight-bold px-4"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-1"></i> Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-1"></i> {editingItem ? 'Update Diagnosis' : 'Save Diagnosis'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 2. Bulk Upload Modal */}
      {isBulkModalOpen && (
        <>
          <div
            className="modal-backdrop-custom"
            onClick={() => !uploadingBulk && setIsBulkModalOpen(false)}
            style={{ zIndex: 1060, backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
          ></div>
          <div
            className="card shadow-lg modal-custom"
            style={{
              maxWidth: '580px',
              width: '92%',
              zIndex: 1070,
              borderRadius: '16px',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
            }}
          >
            <div className="card-header py-3 px-4 bg-gradient-primary text-white d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <i className="fas fa-file-upload fa-lg mr-2"></i>
                <h5 className="mb-0 font-weight-bold text-white" style={{ fontSize: '1.05rem' }}>
                  Bulk Upload Diagnoses (Excel / CSV)
                </h5>
              </div>
              <button
                type="button"
                className="close text-white"
                disabled={uploadingBulk}
                onClick={() => setIsBulkModalOpen(false)}
                style={{ opacity: 0.9 }}
              >
                <span>&times;</span>
              </button>
            </div>

            <form onSubmit={handleBulkUpload}>
              <div className="card-body p-4">
                {bulkError && (
                  <div className="alert alert-danger py-2 small mb-3">
                    <i className="fas fa-exclamation-circle mr-1"></i> {bulkError}
                  </div>
                )}

                {bulkResult && (
                  <div className="alert alert-success py-2 small mb-3">
                    <i className="fas fa-check-circle mr-1"></i> {bulkResult.message}
                  </div>
                )}

                {/* Instructions Box */}
                <div
                  className="p-3 mb-3 rounded"
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.84rem',
                    lineHeight: '1.5',
                  }}
                >
                  <div className="font-weight-bold text-dark mb-1">
                    <i className="fas fa-info-circle text-primary mr-1"></i> File Guidelines:
                  </div>
                  <div>Upload an Excel spreadsheet (<strong>.xlsx</strong>, <strong>.xls</strong>) or <strong>.csv</strong> file containing your diagnosis directory.</div>
                  <div className="mt-2 text-muted small">
                    Required column header: <code>description</code> (or <code>diagnosis</code> / <code>disease</code>).<br />
                    Optional columns: <code>category</code>, <code>icd10_code</code>.
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-primary py-1 px-2"
                      onClick={handleDownloadTemplate}
                    >
                      <i className="fas fa-download mr-1"></i> Download Sample CSV Template
                    </button>
                  </div>
                </div>

                {/* File Drop Area */}
                <div className="form-group mb-3">
                  <label className="font-weight-bold small text-gray-700">Choose Spreadsheet / CSV File:</label>
                  <input
                    type="file"
                    className="form-control-file p-2 border rounded"
                    accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={(e) => setBulkFile(e.target.files[0] || null)}
                    disabled={uploadingBulk}
                    style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1' }}
                  />
                  {bulkFile && (
                    <div className="mt-2 text-success small font-weight-bold">
                      <i className="fas fa-check-circle mr-1"></i> Selected: {bulkFile.name} ({(bulkFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                {/* Quick Seed Button Option */}
                <div className="pt-2 border-top text-center">
                  <div className="small text-muted mb-2">Or load our pre-configured standard hospital diagnoses list:</div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-3"
                    onClick={handleSeedStandard}
                    disabled={uploadingBulk}
                  >
                    <i className="fas fa-magic mr-1 text-primary"></i> Load Standard Clinical Diagnoses (30+ Diseases)
                  </button>
                </div>
              </div>

              <div className="card-footer bg-light py-3 px-4 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  disabled={uploadingBulk}
                  onClick={() => setIsBulkModalOpen(false)}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary font-weight-bold px-4"
                  disabled={uploadingBulk || !bulkFile}
                >
                  {uploadingBulk ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-1"></i> Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-cloud-upload-alt mr-1"></i> Upload &amp; Import
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 3. Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.item && (
        <>
          <div
            className="modal-backdrop-custom"
            onClick={() => !deleteModal.loading && setDeleteModal({ isOpen: false, item: null, loading: false })}
            style={{ zIndex: 1060, backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
          ></div>
          <div
            className="card shadow-lg modal-custom"
            style={{
              maxWidth: '460px',
              width: '92%',
              zIndex: 1070,
              borderRadius: '16px',
              border: '1px solid #fecaca',
              overflow: 'hidden',
            }}
          >
            <div
              className="py-3 px-4 d-flex justify-content-between align-items-center"
              style={{
                background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
                borderBottom: '1px solid #fecaca',
              }}
            >
              <div className="d-flex align-items-center">
                <div
                  className="d-flex align-items-center justify-content-center mr-2 rounded-circle"
                  style={{ width: '36px', height: '36px', backgroundColor: '#fee2e2', color: '#dc2626' }}
                >
                  <i className="fas fa-trash-alt"></i>
                </div>
                <h5 className="mb-0 font-weight-bold text-gray-900" style={{ fontSize: '1rem' }}>
                  Delete Diagnosis Record
                </h5>
              </div>
              <button
                type="button"
                className="close text-muted"
                disabled={deleteModal.loading}
                onClick={() => setDeleteModal({ isOpen: false, item: null, loading: false })}
              >
                <span>&times;</span>
              </button>
            </div>

            <div className="card-body p-4">
              <p className="mb-2" style={{ fontSize: '0.90rem' }}>
                Are you sure you want to delete this diagnosis from the master catalog?
              </p>
              <div className="p-3 rounded bg-light border mb-3">
                <div className="font-weight-bold text-danger">{deleteModal.item.description}</div>
                <div className="small text-muted">Category: {deleteModal.item.category || 'General'}</div>
                {deleteModal.item.icd10_code && (
                  <div className="small text-muted">ICD-10: {deleteModal.item.icd10_code}</div>
                )}
              </div>
              <div className="small text-muted">
                This item will no longer appear in the doctor's consultation auto-suggestions.
              </div>
            </div>

            <div className="card-footer bg-light py-3 px-4 d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={deleteModal.loading}
                onClick={() => setDeleteModal({ isOpen: false, item: null, loading: false })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger font-weight-bold px-3"
                disabled={deleteModal.loading}
                onClick={handleExecuteDelete}
              >
                {deleteModal.loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-1"></i> Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash-alt mr-1"></i> Yes, Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
