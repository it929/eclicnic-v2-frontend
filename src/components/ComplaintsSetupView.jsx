import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { showToast } from './Toast';

const CATEGORY_CHOICES = [
  { value: 'general', label: 'General / Constitutional', color: '#3b82f6' },
  { value: 'neurological', label: 'Neurological', color: '#8b5cf6' },
  { value: 'cardiovascular', label: 'Cardiovascular & Respiratory', color: '#ef4444' },
  { value: 'gastrointestinal', label: 'Gastrointestinal', color: '#f59e0b' },
  { value: 'musculoskeletal', label: 'Musculoskeletal', color: '#10b981' },
  { value: 'genitourinary', label: 'Genitourinary & Gynecological', color: '#ec4899' },
  { value: 'ent', label: 'ENT & Dental', color: '#06b6d4' },
  { value: 'dermatological', label: 'Dermatological', color: '#84cc16' },
  { value: 'psychiatric', label: 'Psychiatric / Behavioral Health', color: '#6366f1' },
  { value: 'eye', label: 'Eye & Vision', color: '#14b8a6' },
  { value: 'endocrine', label: 'Endocrine / Metabolic', color: '#f97316' },
  { value: 'pediatric', label: 'Pediatric-Specific', color: '#a855f7' },
  { value: 'administrative', label: 'Administrative / Non-Acute', color: '#64748b' },
];

export default function ComplaintsSetupView({ onBack }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Bulk Upload Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getComplaints({ all: 'true' });
      const list = Array.isArray(res) ? res : (res?.results || []);
      setComplaints(list);
    } catch (err) {
      console.error('Failed to load complaints directory:', err);
      showToast('Could not load complaints from database', 'error', 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'general',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'general',
      is_active: item.is_active !== false,
    });
    setIsModalOpen(true);
  };

  // Save single complaint
  const handleSaveComplaint = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a complaint name.', 'warning', 'Validation');
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        await api.updateComplaint(editingItem.id, {
          name: formData.name.trim(),
          category: formData.category,
          is_active: formData.is_active,
        });
        showToast('Complaint updated successfully!', 'success', 'Saved');
      } else {
        await api.createComplaint({
          name: formData.name.trim(),
          category: formData.category,
          is_active: formData.is_active,
        });
        showToast('New complaint added to directory!', 'success', 'Created');
      }
      setIsModalOpen(false);
      fetchComplaints();
    } catch (err) {
      console.error('Save complaint failed:', err);
      showToast('Failed to save complaint. Please try again.', 'error', 'Error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (item) => {
    try {
      await api.updateComplaint(item.id, { is_active: !item.is_active });
      setComplaints((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_active: !c.is_active } : c))
      );
      showToast(
        `Complaint "${item.name}" is now ${!item.is_active ? 'Active' : 'Inactive'}`,
        'info',
        'Status Updated'
      );
    } catch (err) {
      console.error('Toggle status failed:', err);
      showToast('Failed to update status', 'error', 'Error');
    }
  };

  // Delete complaint
  const handleDeleteComplaint = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}" from the complaints directory?`)) {
      return;
    }
    try {
      await api.deleteComplaint(item.id);
      setComplaints((prev) => prev.filter((c) => c.id !== item.id));
      showToast(`Deleted "${item.name}" from directory`, 'success', 'Deleted');
    } catch (err) {
      console.error('Delete failed:', err);
      showToast('Failed to delete complaint', 'error', 'Error');
    }
  };

  // Bulk Upload File Handler
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      showToast('Please choose an Excel (.xlsx) or CSV file to upload.', 'warning');
      return;
    }

    try {
      setUploadingBulk(true);
      setBulkResult(null);
      const fd = new FormData();
      fd.append('file', bulkFile);

      const res = await api.bulkImportComplaints(fd);
      setBulkResult(res);
      showToast(res.message || 'Bulk import completed successfully!', 'success', 'Import Success');
      fetchComplaints();
    } catch (err) {
      console.error('Bulk import error:', err);
      const detail = err.response?.data?.detail || 'Import failed. Check file format.';
      showToast(detail, 'error', 'Import Failed');
    } finally {
      setUploadingBulk(false);
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = async () => {
    try {
      const blob = await api.downloadComplaintsTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'presenting_complaints_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Template downloaded! Fill in your complaints and upload.', 'info', 'Template');
    } catch (err) {
      console.error('Download template failed:', err);
      showToast('Failed to download template', 'error');
    }
  };

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      searchTerm === '' ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category_display?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ||
      c.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage) || 1;
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeCount = complaints.filter((c) => c.is_active).length;
  const categoriesCount = new Set(complaints.map((c) => c.category)).size;

  const getCategoryColor = (catKey) => {
    const match = CATEGORY_CHOICES.find((c) => c.value === catKey?.toLowerCase());
    return match ? match.color : '#64748b';
  };

  return (
    <div className="container-fluid px-4 py-3">
      {/* Header Bar */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap" style={{ gap: '12px' }}>
        <div className="d-flex align-items-center">
          {onBack && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm mr-3 shadow-sm d-flex align-items-center"
              onClick={onBack}
              title="Return to previous screen"
            >
              <i className="fas fa-arrow-left mr-1.5"></i> Back
            </button>
          )}
          <div>
            <h1 className="h4 text-gray-800 mb-0 font-weight-bold d-flex align-items-center">
              <i className="fas fa-clipboard-list text-primary mr-2"></i>
              <span>Presenting Complaints Directory</span>
            </h1>
            <p className="text-muted small mb-0">
              Manage clinical complaints, symptom categories, and bulk import directory records.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary shadow-sm font-weight-bold"
            onClick={fetchComplaints}
            title="Reload directory"
          >
            <i className={`fas fa-sync-alt mr-1.5 ${loading ? 'fa-spin' : ''}`}></i> Refresh
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-info shadow-sm font-weight-bold"
            onClick={handleDownloadTemplate}
            title="Download CSV template"
          >
            <i className="fas fa-file-download mr-1.5"></i> Template
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-success shadow-sm font-weight-bold"
            onClick={() => {
              setBulkFile(null);
              setBulkResult(null);
              setIsBulkModalOpen(true);
            }}
            title="Bulk import from Excel or CSV"
          >
            <i className="fas fa-file-excel mr-1.5"></i> Bulk Upload
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary shadow-sm font-weight-bold d-flex align-items-center"
            onClick={handleOpenCreateModal}
          >
            <i className="fas fa-plus mr-1.5"></i> Add Complaint
          </button>
        </div>
      </div>

      {/* Stats KPI Ribbon */}
      <div className="row mb-3">
        <div className="col-md-4 mb-2 mb-md-0">
          <div className="card border-0 shadow-sm rounded-lg" style={{ borderLeft: '4px solid #2563eb' }}>
            <div className="card-body py-2.5 px-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small font-weight-bold text-uppercase">Total Complaints</div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">{complaints.length}</div>
              </div>
              <div className="rounded-circle p-2 bg-light text-primary">
                <i className="fas fa-clipboard-check fa-lg"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-2 mb-md-0">
          <div className="card border-0 shadow-sm rounded-lg" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="card-body py-2.5 px-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small font-weight-bold text-uppercase">Active in Consultations</div>
                <div className="h5 mb-0 font-weight-bold text-success">{activeCount}</div>
              </div>
              <div className="rounded-circle p-2 bg-light text-success">
                <i className="fas fa-heartbeat fa-lg"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-lg" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <div className="card-body py-2.5 px-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small font-weight-bold text-uppercase">Clinical Systems</div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">{categoriesCount} Categories</div>
              </div>
              <div className="rounded-circle p-2 bg-light text-purple" style={{ color: '#8b5cf6' }}>
                <i className="fas fa-tags fa-lg"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card shadow-sm border-0 rounded-lg">
        {/* Search & Filter Toolbar */}
        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap" style={{ gap: '12px' }}>
          <div className="d-flex align-items-center flex-grow-1" style={{ maxWidth: '400px' }}>
            <div className="input-group input-group-sm">
              <div className="input-group-prepend">
                <span className="input-group-text bg-light border-right-0">
                  <i className="fas fa-search text-muted"></i>
                </span>
              </div>
              <input
                type="text"
                className="form-control border-left-0"
                placeholder="Search complaints by name or category..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <div className="input-group-append">
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setSearchTerm('')}
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="d-flex align-items-center" style={{ gap: '10px' }}>
            <div className="d-flex align-items-center">
              <label className="small text-muted mb-0 mr-2 font-weight-bold">System:</label>
              <select
                className="custom-select custom-select-sm"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: '220px' }}
              >
                <option value="all">All Clinical Systems ({complaints.length})</option>
                {CATEGORY_CHOICES.map((c) => {
                  const count = complaints.filter((item) => item.category?.toLowerCase() === c.value).length;
                  return (
                    <option key={c.value} value={c.value}>
                      {c.label} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.86rem' }}>
              <thead className="thead-light">
                <tr>
                  <th style={{ width: '60px' }} className="text-center">#</th>
                  <th>Complaint Name</th>
                  <th style={{ width: '260px' }}>Clinical Category / System</th>
                  <th style={{ width: '120px' }} className="text-center">Status</th>
                  <th style={{ width: '130px' }} className="text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && complaints.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      <i className="fas fa-spinner fa-spin fa-2x text-primary mb-2 d-block"></i>
                      Loading presenting complaints directory...
                    </td>
                  </tr>
                ) : paginatedComplaints.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      <i className="fas fa-search fa-2x text-gray-300 mb-2 d-block"></i>
                      No complaints found matching "{searchTerm}".
                      <div className="mt-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={handleOpenCreateModal}
                        >
                          <i className="fas fa-plus mr-1"></i> Add "{searchTerm}" to Directory
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedComplaints.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    const catColor = getCategoryColor(item.category);
                    return (
                      <tr key={item.id} className={!item.is_active ? 'table-light text-muted' : ''}>
                        <td className="text-center text-muted font-weight-500">{rowNumber}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <i className="fas fa-notes-medical text-primary mr-2" style={{ fontSize: '0.80rem' }}></i>
                            <span className="font-weight-bold text-gray-900">{item.name}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge px-2.5 py-1 text-white font-weight-bold shadow-sm"
                            style={{
                              backgroundColor: catColor,
                              fontSize: '0.74rem',
                              borderRadius: '12px',
                            }}
                          >
                            {item.category_display || item.category || 'General'}
                          </span>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className={`btn btn-xs py-0.5 px-2 font-weight-bold shadow-none ${item.is_active ? 'btn-success' : 'btn-secondary'}`}
                            style={{ borderRadius: '12px', fontSize: '0.70rem' }}
                            onClick={() => handleToggleActive(item)}
                            title="Click to toggle Active status"
                          >
                            <i className={`fas fa-${item.is_active ? 'check' : 'ban'} mr-1`}></i>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="text-right pr-4">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-light btn-sm text-primary shadow-none"
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit complaint"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-light btn-sm text-danger shadow-none"
                              onClick={() => handleDeleteComplaint(item)}
                              title="Delete complaint"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Footer */}
        {filteredComplaints.length > itemsPerPage && (
          <div className="card-footer bg-white border-top py-2.5 px-3 d-flex align-items-center justify-content-between flex-wrap">
            <span className="small text-muted">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredComplaints.length)} of{' '}
              {filteredComplaints.length} entries
            </span>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  Previous
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && (
                        <li className="page-item disabled">
                          <span className="page-link">&hellip;</span>
                        </li>
                      )}
                      <li className={`page-item ${currentPage === p ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(p)}>
                          {p}
                        </button>
                      </li>
                    </React.Fragment>
                  );
                })}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                >
                  Next
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Add / Edit Complaint Modal */}
      {isModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-lg">
              <div className="modal-header bg-light py-2.5 px-3">
                <h5 className="modal-title font-weight-bold text-gray-800" style={{ fontSize: '0.98rem' }}>
                  <i className={`fas fa-${editingItem ? 'edit text-warning' : 'plus-circle text-primary'} mr-2`}></i>
                  {editingItem ? 'Edit Presenting Complaint' : 'Add New Clinical Complaint'}
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setIsModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleSaveComplaint}>
                <div className="modal-body p-4">
                  <div className="form-group mb-3">
                    <label className="font-weight-bold small text-gray-700">
                      Complaint Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Acute Throbbing Headache, Dysuria, Left Knee Swelling..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      autoFocus
                    />
                    <small className="form-text text-muted">
                      Standard medical or patient-reported presenting complaint.
                    </small>
                  </div>

                  <div className="form-group mb-3">
                    <label className="font-weight-bold small text-gray-700">
                      Clinical Category / System <span className="text-danger">*</span>
                    </label>
                    <select
                      className="custom-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      {CATEGORY_CHOICES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="custom-control custom-checkbox mt-3">
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id="complaintActiveCheck"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <label className="custom-control-label font-weight-bold small" htmlFor="complaintActiveCheck">
                      Active (Available for doctors during consultations)
                    </label>
                  </div>
                </div>

                <div className="modal-footer bg-light py-2 px-3">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsModalOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm font-weight-bold"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-1"></i> Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check mr-1"></i> {editingItem ? 'Save Changes' : 'Create Complaint'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {isBulkModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-lg">
              <div className="modal-header bg-success text-white py-2.5 px-3">
                <h5 className="modal-title font-weight-bold" style={{ fontSize: '0.98rem' }}>
                  <i className="fas fa-file-excel mr-2"></i> Bulk Import Presenting Complaints
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => setIsBulkModalOpen(false)}
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleBulkUpload}>
                <div className="modal-body p-4">
                  <div className="alert alert-info py-2 px-3 small d-flex align-items-center mb-3">
                    <i className="fas fa-info-circle mr-2 fa-lg"></i>
                    <div>
                      Upload an Excel (<code>.xlsx</code>, <code>.xls</code>) or <code>.csv</code> file containing columns: <strong>name</strong> and <strong>category</strong>.
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="small text-muted font-weight-bold">Need the standard spreadsheet format?</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-info"
                      onClick={handleDownloadTemplate}
                    >
                      <i className="fas fa-download mr-1"></i> Download Sample CSV
                    </button>
                  </div>

                  {/* File Dropzone / Picker */}
                  <div
                    className="border border-dashed rounded p-4 text-center"
                    style={{
                      borderColor: '#cbd5e1',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                    }}
                    onClick={() => document.getElementById('bulkComplaintFileInput').click()}
                  >
                    <i className="fas fa-cloud-upload-alt fa-3x text-primary mb-2 d-block"></i>
                    <h6 className="font-weight-bold text-gray-800 mb-1">
                      {bulkFile ? bulkFile.name : 'Click to select Excel or CSV file'}
                    </h6>
                    <p className="text-muted small mb-0">
                      {bulkFile
                        ? `${(bulkFile.size / 1024).toFixed(1)} KB selected`
                        : 'Supports .xlsx, .xls, .csv files with header row'}
                    </p>
                    <input
                      id="bulkComplaintFileInput"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setBulkFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>

                  {/* Result Summary */}
                  {bulkResult && (
                    <div className="alert alert-success mt-3 py-2 px-3 small">
                      <div className="font-weight-bold">
                        <i className="fas fa-check-circle mr-1"></i> {bulkResult.message}
                      </div>
                      <div className="mt-1">
                        Added: <strong>{bulkResult.created_count}</strong> | Updated: <strong>{bulkResult.updated_count}</strong>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer bg-light py-2 px-3">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsBulkModalOpen(false)}
                    disabled={uploadingBulk}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success btn-sm font-weight-bold"
                    disabled={uploadingBulk || !bulkFile}
                  >
                    {uploadingBulk ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-1"></i> Uploading & Processing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload mr-1"></i> Start Import
                      </>
                    )}
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
