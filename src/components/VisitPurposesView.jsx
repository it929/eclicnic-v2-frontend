import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { showToast } from './Toast';

const DEFAULT_SEED_PURPOSES = [
  { purpose: 'General Consultation', price: 2000, specialist_id: 0 },
  { purpose: 'Specialist Consultation', price: 5000, specialist_id: 1 },
  { purpose: 'Antenatal Clinic (ANC)', price: 3000, specialist_id: 0 },
  { purpose: 'Pediatric Review', price: 2500, specialist_id: 0 },
  { purpose: 'Immunization / Child Welfare', price: 1500, specialist_id: 0 },
  { purpose: 'Dental Examination', price: 4000, specialist_id: 2 },
  { purpose: 'Eye Clinic / Ophthalmology', price: 4000, specialist_id: 3 },
  { purpose: 'Surgical Review', price: 5000, specialist_id: 4 },
  { purpose: 'Cardiology Review', price: 6000, specialist_id: 5 },
  { purpose: 'Routine Health Checkup', price: 3500, specialist_id: 0 },
  { purpose: 'Post-Discharge Follow-up', price: 2000, specialist_id: 0 },
  { purpose: 'Dietary & Nutrition Counseling', price: 2500, specialist_id: 0 },
];

export default function VisitPurposesView({ onBack }) {
  const [purposes, setPurposes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [feeFilter, setFeeFilter] = useState('all'); // 'all' | 'free' | 'paid'

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    purpose: '',
    price: '',
    specialist_id: 0,
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
  const [seedModalOpen, setSeedModalOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Fetch all purposes
  const fetchPurposes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getVisitPurposes();
      const list = Array.isArray(res) ? res : (res?.results || []);
      setPurposes(list);
    } catch (err) {
      console.error('Error fetching visit purposes:', err);
      showToast('Could not load appointment purposes from database.', 'danger', 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurposes();
  }, [fetchPurposes]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ purpose: '', price: '0' });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      purpose: item.purpose || '',
      price: item.price !== undefined ? String(item.price) : '0',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Single Purpose (Create / Edit)
  const handleSubmitSingle = async (e) => {
    e.preventDefault();
    const cleanPurpose = formData.purpose.trim();
    if (!cleanPurpose) {
      setFormError('Purpose name is required.');
      return;
    }

    const priceNum = Math.max(0, parseInt(formData.price, 10) || 0);

    try {
      setSaving(true);
      setFormError(null);

      const payload = {
        purpose: cleanPurpose,
        price: priceNum,
        specialist_id: 0,
      };

      if (editingItem && editingItem.id) {
        await api.updateVisitPurpose(editingItem.id, payload);
        showToast(`Purpose "${cleanPurpose}" updated successfully!`, 'success', 'Purpose Updated');
      } else {
        await api.createVisitPurpose(payload);
        showToast(`Purpose "${cleanPurpose}" added to database!`, 'success', 'Purpose Added');
      }

      setIsModalOpen(false);
      fetchPurposes();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.purpose?.[0] || err.message || 'Failed to save purpose.';
      setFormError(msg);
      showToast(msg, 'danger', 'Error');
    } finally {
      setSaving(false);
    }
  };

  // Open Delete Alert Modal
  const openDeleteModal = (item) => {
    setDeleteModal({
      isOpen: true,
      item,
      loading: false,
    });
  };

  // Close Delete Alert Modal
  const closeDeleteModal = () => {
    if (deleteModal.loading) return;
    setDeleteModal({
      isOpen: false,
      item: null,
      loading: false,
    });
  };

  // Execute Delete from Modal
  const handleExecuteDelete = async () => {
    if (!deleteModal.item) return;

    try {
      setDeleteModal((prev) => ({ ...prev, loading: true }));
      await api.deleteVisitPurpose(deleteModal.item.id);
      showToast(`Purpose "${deleteModal.item.purpose}" deleted from database.`, 'warning', 'Purpose Deleted');
      closeDeleteModal();
      fetchPurposes();
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Failed to delete purpose.', 'danger', 'Error');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Download Bulk Import Template (CSV)
  const handleDownloadTemplate = () => {
    try {
      const csvContent =
        'purpose,price\r\n' +
        'General Consultation,2000\r\n' +
        'Specialist Consultation,5000\r\n' +
        'Antenatal Clinic (ANC),3000\r\n' +
        'Pediatric Review,2500\r\n' +
        'Dental Examination,4000\r\n' +
        'Eye Clinic / Ophthalmology,4000\r\n' +
        'Surgical Review,5000\r\n' +
        'Cardiology Review,6000\r\n' +
        'Routine Health Checkup,3500\r\n' +
        'Post-Discharge Follow-up,2000\r\n';

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'visit_purposes_bulk_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Template downloaded: visit_purposes_bulk_template.csv', 'info', 'Template Downloaded');
    } catch (err) {
      showToast('Error downloading template: ' + err.message, 'danger', 'Error');
    }
  };

  // Handle Bulk Upload
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

      const res = await api.bulkImportVisitPurposes(form);
      setBulkResult(res);
      showToast(res.message || 'Bulk purposes imported successfully!', 'success', 'Import Successful');
      setBulkFile(null);
      fetchPurposes();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to import bulk file.';
      setBulkError(msg);
      showToast(msg, 'danger', 'Import Error');
    } finally {
      setUploadingBulk(false);
    }
  };

  // Seed default purposes into database with 1 click
  const handleExecuteSeedDefaults = async () => {
    try {
      setSeeding(true);
      const res = await api.bulkImportVisitPurposes({ items: DEFAULT_SEED_PURPOSES });
      showToast(res.message || 'Standard clinic purposes loaded into database!', 'success', 'Database Initialized');
      setSeedModalOpen(false);
      fetchPurposes();
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Failed to seed purposes.', 'danger', 'Error');
    } finally {
      setSeeding(false);
    }
  };

  // Filter purposes
  const filteredPurposes = purposes.filter((p) => {
    const matchesSearch = !searchTerm || (p.purpose && p.purpose.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;

    if (feeFilter === 'free') return Number(p.price) === 0;
    if (feeFilter === 'paid') return Number(p.price) > 0;
    return true;
  });

  // Calculate statistics
  const totalCount = purposes.length;
  const paidCount = purposes.filter((p) => Number(p.price) > 0).length;
  const freeCount = totalCount - paidCount;
  const avgFee = totalCount > 0
    ? Math.round(purposes.reduce((sum, p) => sum + (Number(p.price) || 0), 0) / totalCount)
    : 0;

  return (
    <div className="container-fluid py-3">
      {/* Top Banner / Breadcrumb */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap">
        <div>
          <div className="d-flex align-items-center mb-1">
            {onBack && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary mr-2"
                onClick={onBack}
                title="Back"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
            )}
            <h1 className="h3 mb-0 text-gray-800 font-weight-bold">
              <i className="fas fa-stethoscope text-primary mr-2"></i>
              Appointment &amp; Visit Purposes Setup
            </h1>
          </div>
          <p className="text-muted small mb-0">
            Manage hospital consultation clinics and visit purposes. All entries are loaded dynamically into the appointment scheduler &amp; consultation queue.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="d-flex align-items-center flex-wrap mt-2 mt-md-0" style={{ gap: '8px' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline-success font-weight-bold shadow-sm"
            onClick={handleDownloadTemplate}
            title="Download CSV template to prepare bulk upload"
          >
            <i className="fas fa-download mr-1"></i> Download Template
          </button>

          <button
            type="button"
            className="btn btn-sm btn-info font-weight-bold shadow-sm text-white"
            onClick={() => {
              setBulkError(null);
              setBulkResult(null);
              setBulkFile(null);
              setIsBulkModalOpen(true);
            }}
          >
            <i className="fas fa-file-excel mr-1"></i> Bulk Upload (Excel/CSV)
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary font-weight-bold shadow-sm"
            onClick={handleOpenCreate}
          >
            <i className="fas fa-plus-circle mr-1"></i> Add Purpose (Single)
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-primary shadow-sm h-100 py-2">
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Configured Purposes
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{totalCount}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-list-alt fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-success shadow-sm h-100 py-2">
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Tariff Services (Paid)
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{paidCount}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-money-bill-wave fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-info shadow-sm h-100 py-2">
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Free / Non-Tariff Services
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{freeCount}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-hand-holding-heart fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-warning shadow-sm h-100 py-2">
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Average Consultation Fee
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">₦{avgFee.toLocaleString()}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calculator fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seed Helper Alert if table is empty */}
      {totalCount === 0 && !loading && (
        <div className="alert alert-warning border-left-warning shadow-sm d-flex flex-wrap align-items-center justify-content-between p-3 mb-4">
          <div className="d-flex align-items-center mb-2 mb-md-0">
            <i className="fas fa-info-circle fa-2x text-warning mr-3"></i>
            <div>
              <h6 className="font-weight-bold mb-1 text-gray-900">No Visit Purposes in Database</h6>
              <span className="small text-muted">
                Your database currently has 0 configured appointment purposes. You can add them one by one, upload an Excel file, or click below to populate standard clinic purposes automatically.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-warning text-dark font-weight-bold shadow-sm"
            onClick={() => setSeedModalOpen(true)}
            disabled={seeding}
          >
            <span><i className="fas fa-magic mr-1"></i> Load Standard Clinic Purposes</span>
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="card shadow mb-4">
        {/* Card Header & Search */}
        <div className="card-header py-3 bg-light d-flex flex-wrap align-items-center justify-content-between">
          <div className="d-flex align-items-center mb-2 mb-md-0">
            <h6 className="m-0 font-weight-bold text-primary mr-3">
              <i className="fas fa-database mr-1"></i> Database Purpose Records ({filteredPurposes.length})
            </h6>
            <button
              type="button"
              className="btn btn-xs btn-outline-secondary"
              onClick={fetchPurposes}
              disabled={loading}
              title="Refresh list"
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>

          <div className="d-flex align-items-center flex-wrap" style={{ gap: '10px' }}>
            {/* Search Input */}
            <div className="input-group input-group-sm" style={{ width: '260px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search purpose name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

            {/* Fee Filter */}
            <select
              className="custom-select custom-select-sm"
              style={{ width: '140px' }}
              value={feeFilter}
              onChange={(e) => setFeeFilter(e.target.value)}
            >
              <option value="all">All Fees</option>
              <option value="paid">Paid Services</option>
              <option value="free">Free Services</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        <div className="card-body p-0">
          {loading && purposes.length === 0 ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p className="mt-2 text-muted small">Loading visit purposes from database...</p>
            </div>
          ) : filteredPurposes.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-folder-open fa-3x text-gray-300 mb-3"></i>
              <h6>No visit purposes found</h6>
              <p className="small text-muted mb-3">
                {searchTerm || feeFilter !== 'all'
                  ? 'No records match your active search filters.'
                  : 'Start by adding a purpose or uploading an Excel/CSV file.'}
              </p>
              <div className="d-flex justify-content-center" style={{ gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleOpenCreate}
                >
                  <i className="fas fa-plus mr-1"></i> Add First Purpose
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-info"
                  onClick={() => setIsBulkModalOpen(true)}
                >
                  <i className="fas fa-file-excel mr-1"></i> Upload Bulk
                </button>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th style={{ width: '60px' }} className="text-center">#</th>
                    <th>Purpose of Appointment / Clinic Service</th>
                    <th style={{ width: '220px' }}>Consultation Fee</th>
                    <th style={{ width: '140px' }} className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurposes.map((p, index) => {
                    const price = Number(p.price) || 0;
                    return (
                      <tr key={p.id || index}>
                        <td className="text-center text-muted font-weight-bold small">
                          {index + 1}
                        </td>
                        <td>
                          <div className="font-weight-bold text-gray-900">
                            <i className="fas fa-chevron-right text-primary fa-xs mr-2"></i>
                            {p.purpose}
                          </div>
                          <small className="text-muted">
                            Active in Appointment Booking &amp; Nursing Queue
                          </small>
                        </td>
                        <td>
                          {price > 0 ? (
                            <span className="badge badge-success font-weight-bold px-2 py-1" style={{ fontSize: '0.85rem' }}>
                              ₦{price.toLocaleString()}
                            </span>
                          ) : (
                            <span className="badge badge-secondary px-2 py-1">
                              Free / ₦0
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary mr-1"
                            title="Edit Purpose"
                            onClick={() => handleOpenEdit(p)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            title="Delete Purpose"
                            onClick={() => openDeleteModal(p)}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
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

      {/* ============================================================== */}
      {/* MODAL 1: ADD / EDIT SINGLE PURPOSE                             */}
      {/* ============================================================== */}
      {isModalOpen && (
        <>
          <div
            className="modal-backdrop-custom"
            onClick={() => !saving && setIsModalOpen(false)}
            style={{ zIndex: 1060 }}
          ></div>
          <div
            className="card shadow modal-custom"
            style={{ maxWidth: '520px', width: '92%', zIndex: 1070 }}
          >
            <div className="card-header py-3 bg-gradient-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="m-0 font-weight-bold">
                <i className={`fas ${editingItem ? 'fa-edit' : 'fa-plus-circle'} mr-2`}></i>
                {editingItem ? 'Edit Visit Purpose' : 'Add New Visit Purpose'}
              </h5>
              <button
                type="button"
                className="close text-white"
                onClick={() => !saving && setIsModalOpen(false)}
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="card-body">
              {formError && (
                <div className="alert alert-danger py-2 px-3 small mb-3">
                  <i className="fas fa-exclamation-circle mr-1"></i> {formError}
                </div>
              )}

              <form onSubmit={handleSubmitSingle}>
                <div className="form-group mb-3">
                  <label className="font-weight-bold small text-gray-800">
                    Purpose / Clinic Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. General Consultation, Cardiology Review, ANC Clinic"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    required
                    autoFocus
                  />
                  <small className="text-muted">
                    The name that will appear in the "Purpose of Appointment" dropdown.
                  </small>
                </div>

                <div className="form-group mb-3">
                  <label className="font-weight-bold small text-gray-800">
                    Consultation Fee / Price (₦) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text font-weight-bold">₦</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="e.g. 2000"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <small className="text-muted">Enter 0 if the consultation is free.</small>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-secondary font-weight-bold"
                    onClick={() => setIsModalOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary font-weight-bold shadow-sm px-4"
                    disabled={saving}
                  >
                    {saving ? (
                      <span><i className="fas fa-spinner fa-spin mr-1"></i> Saving...</span>
                    ) : (
                      <span><i className="fas fa-save mr-1"></i> {editingItem ? 'Save Changes' : 'Add Purpose'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: BULK UPLOAD EXCEL / CSV                               */}
      {/* ============================================================== */}
      {isBulkModalOpen && (
        <>
          <div
            className="modal-backdrop-custom"
            onClick={() => !uploadingBulk && setIsBulkModalOpen(false)}
            style={{ zIndex: 1060 }}
          ></div>
          <div
            className="card shadow modal-custom"
            style={{ maxWidth: '620px', width: '92%', zIndex: 1070 }}
          >
            <div className="card-header py-3 bg-gradient-info text-white d-flex justify-content-between align-items-center">
              <h5 className="m-0 font-weight-bold">
                <i className="fas fa-file-upload mr-2"></i> Bulk Upload Visit Purposes
              </h5>
              <button
                type="button"
                className="close text-white"
                onClick={() => !uploadingBulk && setIsBulkModalOpen(false)}
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="card-body">
              {bulkError && (
                <div className="alert alert-danger py-2 px-3 small mb-3">
                  <i className="fas fa-exclamation-triangle mr-1"></i> {bulkError}
                </div>
              )}

              {bulkResult && (
                <div className="alert alert-success py-2 px-3 small mb-3">
                  <i className="fas fa-check-circle mr-1"></i> {bulkResult.message}
                </div>
              )}

              {/* Instructions and Template link */}
              <div className="bg-light p-3 rounded mb-3 border">
                <h6 className="font-weight-bold text-gray-900 mb-1">
                  <i className="fas fa-info-circle text-info mr-1"></i> Upload Guidelines:
                </h6>
                <p className="small text-muted mb-2">
                  Upload an Excel (<code>.xlsx</code>, <code>.xls</code>) or CSV (<code>.csv</code>) file with your hospital's consultation purposes.
                </p>
                <div className="small font-weight-bold text-dark mb-2">Required Columns:</div>
                <div className="table-responsive mb-2">
                  <table className="table table-bordered table-sm small mb-0 bg-white">
                    <thead className="thead-light">
                      <tr>
                        <th>purpose <span className="text-danger">*</span></th>
                        <th>price</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>General Consultation</td>
                        <td>2000</td>
                      </tr>
                      <tr>
                        <td>Specialist Consultation</td>
                        <td>5000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-success font-weight-bold"
                    onClick={handleDownloadTemplate}
                  >
                    <i className="fas fa-download mr-1"></i> Download CSV Template File
                  </button>
                </div>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleBulkUpload}>
                <div className="form-group mb-4">
                  <label className="font-weight-bold small text-gray-800">
                    Select File (.xlsx, .xls, .csv) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="file"
                    className="form-control-file border p-2 rounded bg-white w-100"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      setBulkFile(e.target.files[0] || null);
                      setBulkError(null);
                      setBulkResult(null);
                    }}
                    required
                  />
                  {bulkFile && (
                    <div className="mt-2 small text-success">
                      <i className="fas fa-check mr-1"></i> Selected: <strong>{bulkFile.name}</strong> ({(bulkFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-secondary font-weight-bold"
                    onClick={() => setIsBulkModalOpen(false)}
                    disabled={uploadingBulk}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn btn-info text-white font-weight-bold shadow-sm px-4"
                    disabled={uploadingBulk || !bulkFile}
                  >
                    {uploadingBulk ? (
                      <span><i className="fas fa-spinner fa-spin mr-1"></i> Uploading &amp; Processing...</span>
                    ) : (
                      <span><i className="fas fa-upload mr-1"></i> Upload &amp; Save to Database</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CONFIRM DELETE PURPOSE ALERT MODAL                    */}
      {/* ============================================================== */}
      {deleteModal.isOpen && deleteModal.item && (
        <>
          <div
            className="modal-backdrop-custom"
            onClick={closeDeleteModal}
            style={{ zIndex: 1080 }}
          ></div>
          <div
            className="card shadow-lg modal-custom"
            style={{
              maxWidth: '480px',
              width: '92%',
              zIndex: 1090,
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div className="card-header py-3 bg-danger text-white d-flex justify-content-between align-items-center">
              <h5 className="m-0 font-weight-bold text-white d-flex align-items-center">
                <i className="fas fa-trash-alt mr-2"></i> Delete Visit Purpose
              </h5>
              <button
                type="button"
                className="close text-white"
                onClick={closeDeleteModal}
                disabled={deleteModal.loading}
                aria-label="Close"
                style={{ opacity: 0.9 }}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            {/* Body */}
            <div className="card-body p-4 text-center">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3 shadow-sm"
                style={{
                  width: '68px',
                  height: '68px',
                  backgroundColor: '#fff1f0',
                  color: '#e74a3b',
                  border: '2px solid #ffa39e',
                }}
              >
                <i className="fas fa-trash-alt fa-2x"></i>
              </div>

              <h5 className="font-weight-bold text-gray-900 mb-2">Are you sure you want to delete?</h5>

              <p className="text-muted small mb-3">
                This will delete the visit purpose{' '}
                <strong className="text-danger font-weight-bold">
                  "{deleteModal.item.purpose}"
                </strong>{' '}
                {Number(deleteModal.item.price) > 0 ? (
                  <span>(Consultation Fee: ₦{Number(deleteModal.item.price).toLocaleString()})</span>
                ) : (
                  <span>(Free Service)</span>
                )}
                .
              </p>

              <div className="alert alert-warning border text-left small mb-0 py-2 px-3">
                <i className="fas fa-exclamation-triangle mr-1 text-warning"></i>
                This record will be permanently deleted from the database and will no longer appear when scheduling appointments.
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-end border-top">
              <button
                type="button"
                className="btn btn-secondary font-weight-bold px-3 mr-2"
                onClick={closeDeleteModal}
                disabled={deleteModal.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger font-weight-bold px-4 shadow-sm"
                onClick={handleExecuteDelete}
                disabled={deleteModal.loading}
              >
                {deleteModal.loading ? (
                  <span>
                    <i className="fas fa-spinner fa-spin mr-1"></i> Deleting...
                  </span>
                ) : (
                  <span>
                    <i className="fas fa-trash-alt mr-1"></i> Yes, Delete Purpose
                  </span>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CONFIRM SEED STANDARD CLINIC PURPOSES                 */}
      {/* ============================================================== */}
      {seedModalOpen && (
        <>
          <div
            className="modal-backdrop-custom"
            onClick={() => !seeding && setSeedModalOpen(false)}
            style={{ zIndex: 1080 }}
          ></div>
          <div
            className="card shadow-lg modal-custom"
            style={{
              maxWidth: '480px',
              width: '92%',
              zIndex: 1090,
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <div className="card-header py-3 bg-warning text-dark d-flex justify-content-between align-items-center">
              <h5 className="m-0 font-weight-bold d-flex align-items-center">
                <i className="fas fa-magic mr-2"></i> Load Standard Clinic Purposes?
              </h5>
              <button
                type="button"
                className="close text-dark"
                onClick={() => !seeding && setSeedModalOpen(false)}
                disabled={seeding}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="card-body p-4 text-center">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3 shadow-sm"
                style={{
                  width: '68px',
                  height: '68px',
                  backgroundColor: '#fffbe6',
                  color: '#faad14',
                  border: '2px solid #ffe58f',
                }}
              >
                <i className="fas fa-hospital fa-2x"></i>
              </div>

              <h5 className="font-weight-bold text-gray-900 mb-2">Populate Hospital Presets?</h5>
              <p className="text-muted small mb-0 px-2">
                This will automatically insert 12 standard clinic consultation services (General, ANC, Pediatrics, Dental, Eye, Surgical, Cardiology, etc.) into your database.
              </p>
            </div>

            <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-end border-top">
              <button
                type="button"
                className="btn btn-secondary font-weight-bold px-3 mr-2"
                onClick={() => setSeedModalOpen(false)}
                disabled={seeding}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-warning text-dark font-weight-bold px-4 shadow-sm"
                onClick={handleExecuteSeedDefaults}
                disabled={seeding}
              >
                {seeding ? (
                  <span><i className="fas fa-spinner fa-spin mr-1"></i> Loading...</span>
                ) : (
                  <span><i className="fas fa-check mr-1"></i> Proceed &amp; Load</span>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
