import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function TariffPlansView({
  initialSubmodule = 'service',
  initialSubSubmodule = 'reg_fees',
}) {
  const [activeSubmodule, setActiveSubmodule] = useState(initialSubmodule);
  const [activeSubSubmodule, setActiveSubSubmodule] = useState(initialSubSubmodule);

  // Sync props from sidebar navigation
  useEffect(() => {
    if (initialSubmodule) setActiveSubmodule(initialSubmodule);
    if (initialSubSubmodule) setActiveSubSubmodule(initialSubSubmodule);
  }, [initialSubmodule, initialSubSubmodule]);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null); // { message, type }
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [regFees, setRegFees] = useState([]);
  const [labCharges, setLabCharges] = useState([]);
  const [radiologyCharges, setRadiologyCharges] = useState([]);
  const [admissionFees, setAdmissionFees] = useState([]);
  const [otherServices, setOtherServices] = useState([]);
  const [medicationFees, setMedicationFees] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [packageItems, setPackageItems] = useState([]);
  const [immunizations, setImmunizations] = useState([]);

  // Generic Edit/Create Modal state
  const [modalState, setModalState] = useState({
    open: false,
    mode: 'create', // 'create' | 'edit'
    entityType: '', // 'reg_fee' | 'lab' | 'radiology' | 'ward' | 'other' | 'medication' | 'package' | 'package_item'
    title: '',
    id: null,
    formData: {},
  });

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  // ========================================================
  // Data Fetching Functions
  // ========================================================
  const loadRegFees = async () => {
    try {
      setLoading(true);
      const res = await api.getRegistrationFees();
      setRegFees(res.plans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLabCharges = async () => {
    try {
      setLoading(true);
      const res = await api.getLabCharges();
      setLabCharges(res.charges || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRadiologyCharges = async () => {
    try {
      setLoading(true);
      const res = await api.getRadiologyCharges();
      setRadiologyCharges(res.charges || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmissionFees = async () => {
    try {
      setLoading(true);
      const res = await api.getAdmissionFees();
      setAdmissionFees(res.wards || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOtherServices = async () => {
    try {
      setLoading(true);
      const res = await api.getOtherServices();
      setOtherServices(res.services || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicationFees = async () => {
    try {
      setLoading(true);
      const res = await api.getMedicationFees();
      setMedicationFees(res.medications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      setLoading(true);
      const res = await api.getPackages();
      const list = res.packages || [];
      setPackages(list);
      if (list.length > 0 && !selectedPackageId) {
        setSelectedPackageId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPackageData = async (pkgId) => {
    try {
      setLoading(true);
      const res = await api.getPackageData(pkgId);
      setPackageItems(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadImmunizations = async () => {
    try {
      setLoading(true);
      const res = await api.getImmunizationFees();
      setImmunizations(res.immunizations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Reload current data whenever active submodule/sub-submodule changes
  useEffect(() => {
    setSearchTerm('');
    if (activeSubmodule === 'service') {
      if (activeSubSubmodule === 'reg_fees') loadRegFees();
      else if (activeSubSubmodule === 'lab_charges') loadLabCharges();
      else if (activeSubSubmodule === 'radiology_charges') loadRadiologyCharges();
      else if (activeSubSubmodule === 'admission_fees') loadAdmissionFees();
      else if (activeSubSubmodule === 'other_services') loadOtherServices();
    } else if (activeSubmodule === 'product') {
      if (activeSubSubmodule === 'medication_fees') loadMedicationFees();
    } else if (activeSubmodule === 'packages') {
      if (activeSubSubmodule === 'upload_packages') loadPackages();
      else if (activeSubSubmodule === 'manage_package_data') {
        loadPackages();
      } else if (activeSubSubmodule === 'immunization_fees') {
        loadImmunizations();
      }
    }
  }, [activeSubmodule, activeSubSubmodule]);

  // When selected package changes, reload its items
  useEffect(() => {
    if (activeSubmodule === 'packages' && activeSubSubmodule === 'manage_package_data' && selectedPackageId) {
      loadPackageData(selectedPackageId);
    }
  }, [selectedPackageId, activeSubmodule, activeSubSubmodule]);

  // Refresh current view button handler
  const handleRefresh = () => {
    if (activeSubmodule === 'service') {
      if (activeSubSubmodule === 'reg_fees') loadRegFees();
      else if (activeSubSubmodule === 'lab_charges') loadLabCharges();
      else if (activeSubSubmodule === 'radiology_charges') loadRadiologyCharges();
      else if (activeSubSubmodule === 'admission_fees') loadAdmissionFees();
      else if (activeSubSubmodule === 'other_services') loadOtherServices();
    } else if (activeSubmodule === 'product') {
      if (activeSubSubmodule === 'medication_fees') loadMedicationFees();
    } else if (activeSubmodule === 'packages') {
      if (activeSubSubmodule === 'upload_packages') loadPackages();
      else if (activeSubSubmodule === 'manage_package_data') {
        loadPackages();
        if (selectedPackageId) loadPackageData(selectedPackageId);
      } else if (activeSubSubmodule === 'immunization_fees') {
        loadImmunizations();
      }
    }
  };

  // ========================================================
  // Modal Handlers (Create & Edit)
  // ========================================================
  const openModal = (entityType, mode, item = null) => {
    let title = '';
    let formData = {};

    if (entityType === 'reg_fee') {
      title = mode === 'create' ? 'Add New Registration Plan Fee' : 'Update Registration Plan Fee';
      formData = item ? { plan_name: item.plan_name, price: item.price } : { plan_name: '', price: '' };
    } else if (entityType === 'lab') {
      title = mode === 'create' ? 'Add Laboratory Investigation Charge' : 'Update Lab Charge';
      formData = item ? { item: item.item, item_id: item.item_id, rate: item.rate } : { item: '', item_id: '', rate: '' };
    } else if (entityType === 'radiology') {
      title = mode === 'create' ? 'Add Radiology / Scan Investigation Charge' : 'Update Radiology Charge';
      formData = item ? { item: item.item, item_id: item.item_id, rate: item.rate } : { item: '', item_id: '', rate: '' };
    } else if (entityType === 'ward') {
      title = mode === 'create' ? 'Add Hospital Ward Admission Fee' : 'Update Ward Admission Fee';
      formData = item ? { ward_name: item.ward_name, price: item.price } : { ward_name: '', price: '' };
    } else if (entityType === 'other') {
      title = mode === 'create' ? 'Add Hospital Service Fee' : 'Update Hospital Service Fee';
      formData = item ? { service: item.service, service_id: item.service_id, rate: item.rate } : { service: '', service_id: '', rate: '' };
    } else if (entityType === 'medication') {
      title = mode === 'create' ? 'Add Medication Price Tariff' : 'Update Medication Tariff';
      formData = item ? { product_name: item.product_name, product_id: item.product_id, rate: item.rate } : { product_name: '', product_id: '', rate: '' };
    } else if (entityType === 'package') {
      title = mode === 'create' ? 'Create New Care Package' : 'Edit Package Name';
      formData = item ? { name: item.name } : { name: '' };
    } else if (entityType === 'package_item') {
      title = mode === 'create' ? 'Add Item to Package' : 'Update Package Item Rate';
      formData = item
        ? { item: item.item, type: item.type, rate: item.rate, package_id: item.package_id }
        : { item: '', type: 'SR', rate: '', package_id: selectedPackageId };
    }

    setModalState({
      open: true,
      mode,
      entityType,
      title,
      id: item ? item.id : null,
      formData,
    });
  };

  const closeModal = () => {
    setModalState({ open: false, mode: 'create', entityType: '', title: '', id: null, formData: {} });
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    try {
      const { entityType, mode, id, formData } = modalState;
      let res;

      if (entityType === 'reg_fee') {
        if (mode === 'create') res = await api.createRegistrationFee(formData);
        else res = await api.updateRegistrationFee(id, formData);
        showAlert(res.detail || 'Registration fee saved successfully!');
        loadRegFees();
      } else if (entityType === 'lab') {
        if (mode === 'create') res = await api.createLabCharge(formData);
        else res = await api.updateLabCharge(id, formData);
        showAlert(res.detail || 'Lab charge saved successfully!');
        loadLabCharges();
      } else if (entityType === 'radiology') {
        if (mode === 'create') res = await api.createRadiologyCharge(formData);
        else res = await api.updateRadiologyCharge(id, formData);
        showAlert(res.detail || 'Radiology charge saved successfully!');
        loadRadiologyCharges();
      } else if (entityType === 'ward') {
        if (mode === 'create') res = await api.createAdmissionFee(formData);
        else res = await api.updateAdmissionFee(id, formData);
        showAlert(res.detail || 'Ward fee saved successfully!');
        loadAdmissionFees();
      } else if (entityType === 'other') {
        if (mode === 'create') res = await api.createOtherService(formData);
        else res = await api.updateOtherService(id, formData);
        showAlert(res.detail || 'Other service fee saved successfully!');
        loadOtherServices();
      } else if (entityType === 'medication') {
        if (mode === 'create') res = await api.createMedicationFee(formData);
        else res = await api.updateMedicationFee(id, formData);
        showAlert(res.detail || 'Medication tariff saved successfully!');
        loadMedicationFees();
      } else if (entityType === 'package') {
        if (mode === 'create') res = await api.createPackage(formData);
        else res = await api.updatePackage(id, formData);
        showAlert(res.detail || 'Package saved successfully!');
        loadPackages();
      } else if (entityType === 'package_item') {
        if (mode === 'create') res = await api.createPackageData({ ...formData, package_id: selectedPackageId });
        else res = await api.updatePackageData(id, formData);
        showAlert(res.detail || 'Package item saved successfully!');
        loadPackageData(selectedPackageId);
      }

      closeModal();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Operation failed.';
      showAlert(msg, 'danger');
    }
  };

  // ========================================================
  // Delete Handlers
  // ========================================================
  const handleDelete = async (entityType, id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      let res;
      if (entityType === 'reg_fee') {
        res = await api.deleteRegistrationFee(id);
        showAlert(res.detail || 'Plan deleted.');
        loadRegFees();
      } else if (entityType === 'lab') {
        res = await api.deleteLabCharge(id);
        showAlert(res.detail || 'Lab test charge deleted.');
        loadLabCharges();
      } else if (entityType === 'radiology') {
        res = await api.deleteRadiologyCharge(id);
        showAlert(res.detail || 'Radiology test charge deleted.');
        loadRadiologyCharges();
      } else if (entityType === 'ward') {
        res = await api.deleteAdmissionFee(id);
        showAlert(res.detail || 'Ward fee deleted.');
        loadAdmissionFees();
      } else if (entityType === 'other') {
        res = await api.deleteOtherService(id);
        showAlert(res.detail || 'Service deleted.');
        loadOtherServices();
      } else if (entityType === 'medication') {
        res = await api.deleteMedicationFee(id);
        showAlert(res.detail || 'Medication tariff deleted.');
        loadMedicationFees();
      } else if (entityType === 'package') {
        res = await api.deletePackage(id);
        showAlert(res.detail || 'Package deleted.');
        loadPackages();
      } else if (entityType === 'package_item') {
        res = await api.deletePackageData(id);
        showAlert(res.detail || 'Package item deleted.');
        loadPackageData(selectedPackageId);
      }
    } catch (err) {
      showAlert('Failed to delete item.', 'danger');
    }
  };

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
            <i className="fas fa-upload text-primary mr-2"></i>
            Manage Tariff Plans
          </h1>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb bg-transparent p-0 mb-0 small text-muted">
              <li className="breadcrumb-item">Billing Administration</li>
              <li className="breadcrumb-item text-capitalize">
                {activeSubmodule === 'service'
                  ? 'Service Tariffs'
                  : activeSubmodule === 'product'
                  ? 'Product Tariffs'
                  : 'Manage Packages'}
              </li>
              <li className="breadcrumb-item active font-weight-bold text-primary text-capitalize">
                {activeSubSubmodule.replace('_', ' ')}
              </li>
            </ol>
          </nav>
        </div>

        <div>
          <button className="btn btn-sm btn-outline-primary shadow-sm" onClick={handleRefresh}>
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
                  activeSubmodule === 'service' ? 'active bg-info text-white shadow-sm' : 'text-gray-700'
                }`}
                onClick={() => {
                  setActiveSubmodule('service');
                  setActiveSubSubmodule('reg_fees');
                }}
              >
                <i className="fas fa-concierge-bell mr-2"></i>
                Service Tariffs
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link cursor-pointer ${
                  activeSubmodule === 'product' ? 'active bg-primary text-white shadow-sm' : 'text-gray-700'
                }`}
                onClick={() => {
                  setActiveSubmodule('product');
                  setActiveSubSubmodule('medication_fees');
                }}
              >
                <i className="fas fa-capsules mr-2"></i>
                Product Tariffs
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link cursor-pointer ${
                  activeSubmodule === 'packages' ? 'active bg-success text-white shadow-sm' : 'text-gray-700'
                }`}
                onClick={() => {
                  setActiveSubmodule('packages');
                  setActiveSubSubmodule('upload_packages');
                }}
              >
                <i className="fas fa-box-open mr-2"></i>
                Manage Packages
              </a>
            </li>
          </ul>
        </div>

        {/* Secondary Sub-submodule Navigation Bar */}
        <div className="card-body bg-light border-bottom py-2">
          {activeSubmodule === 'service' && (
            <div className="d-flex flex-wrap gap-2">
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'reg_fees' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('reg_fees')}
              >
                <i className="fas fa-id-card mr-1"></i> Registration Fees
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'lab_charges' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('lab_charges')}
              >
                <i className="fas fa-vial mr-1"></i> Laboratory Charges
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'radiology_charges' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('radiology_charges')}
              >
                <i className="fas fa-x-ray mr-1"></i> Radiology Charges
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'admission_fees' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('admission_fees')}
              >
                <i className="fas fa-bed mr-1"></i> Admission Fees
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'other_services' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('other_services')}
              >
                <i className="fas fa-hand-holding-medical mr-1"></i> Other Services Fees
              </button>
            </div>
          )}

          {activeSubmodule === 'product' && (
            <div className="d-flex flex-wrap gap-2">
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'medication_fees' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('medication_fees')}
              >
                <i className="fas fa-pills mr-1"></i> Medication Fees
              </button>
            </div>
          )}

          {activeSubmodule === 'packages' && (
            <div className="d-flex flex-wrap gap-2">
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'upload_packages' ? 'btn-success text-white font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('upload_packages')}
              >
                <i className="fas fa-cubes mr-1"></i> Upload Packages
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'manage_package_data' ? 'btn-success text-white font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('manage_package_data')}
              >
                <i className="fas fa-list-alt mr-1"></i> Manage Package Data
              </button>
              <button
                className={`btn btn-sm ${
                  activeSubSubmodule === 'immunization_fees' ? 'btn-success text-white font-weight-bold' : 'btn-outline-secondary'
                } mr-2 mb-1`}
                onClick={() => setActiveSubSubmodule('immunization_fees')}
              >
                <i className="fas fa-syringe mr-1"></i> Immunization Fees
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. SERVICE TARIFFS SUBMODULE                            */}
      {/* ======================================================== */}

      {/* 1.1 REGISTRATION FEES */}
      {activeSubmodule === 'service' && activeSubSubmodule === 'reg_fees' && (
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between bg-white">
            <h6 className="m-0 font-weight-bold text-primary">
              <i className="fas fa-id-card mr-1"></i> Registration & Consultation Tariff Plans ({regFees.length})
            </h6>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm mr-2"
                placeholder="Search plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '180px' }}
              />
              <button className="btn btn-sm btn-primary font-weight-bold" onClick={() => openModal('reg_fee', 'create')}>
                <i className="fas fa-plus mr-1"></i> Add Registration Plan
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th>#</th>
                    <th>Plan Name / Category</th>
                    <th>Registration Charge</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {regFees
                    .filter((p) => p.plan_name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((item, idx) => (
                      <tr key={item.id}>
                        <td className="font-weight-bold text-muted">{idx + 1}</td>
                        <td className="font-weight-bold text-dark">{item.plan_name}</td>
                        <td className="font-weight-bold text-primary">₦{Number(item.price).toLocaleString()}</td>
                        <td>
                          <span className="badge badge-success px-2 py-1">Active Tariff</span>
                        </td>
                        <td className="text-right">
                          <button
                            className="btn btn-sm btn-outline-info mr-1"
                            onClick={() => openModal('reg_fee', 'edit', item)}
                            title="Edit plan price"
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete('reg_fee', item.id, item.plan_name)}
                            title="Delete plan"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  {regFees.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No registration tariff plans configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1.2 LABORATORY CHARGES */}
      {activeSubmodule === 'service' && activeSubSubmodule === 'lab_charges' && (
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between bg-white">
            <h6 className="m-0 font-weight-bold text-primary">
              <i className="fas fa-vial mr-1"></i> Laboratory Investigation Charges ({labCharges.length})
            </h6>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm mr-2"
                placeholder="Search lab tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '180px' }}
              />
              <button className="btn btn-sm btn-primary font-weight-bold" onClick={() => openModal('lab', 'create')}>
                <i className="fas fa-plus mr-1"></i> Add Lab Charge
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th>Item ID</th>
                    <th>Laboratory Test</th>
                    <th>Applicable Plan</th>
                    <th>Rate / Fee</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {labCharges
                    .filter((l) => l.item.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="badge badge-light border text-dark font-weight-bold">{item.item_id}</span>
                        </td>
                        <td className="font-weight-bold text-dark">{item.item}</td>
                        <td>
                          <span className="badge badge-info px-2 py-1">{item.plan_name || 'Standard'}</span>
                        </td>
                        <td className="font-weight-bold text-primary">₦{Number(item.rate).toLocaleString()}</td>
                        <td className="text-right">
                          <button
                            className="btn btn-sm btn-outline-info mr-1"
                            onClick={() => openModal('lab', 'edit', item)}
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete('lab', item.id, item.item)}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  {labCharges.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No laboratory tariffs recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1.3 RADIOLOGY CHARGES */}
      {activeSubmodule === 'service' && activeSubSubmodule === 'radiology_charges' && (
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between bg-white">
            <h6 className="m-0 font-weight-bold text-primary">
              <i className="fas fa-x-ray mr-1"></i> Radiology & Scan Charges ({radiologyCharges.length})
            </h6>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm mr-2"
                placeholder="Search scans / x-rays..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '180px' }}
              />
              <button className="btn btn-sm btn-primary font-weight-bold" onClick={() => openModal('radiology', 'create')}>
                <i className="fas fa-plus mr-1"></i> Add Radiology Charge
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th>Item ID</th>
                    <th>Scan / Radiology Procedure</th>
                    <th>Applicable Plan</th>
                    <th>Rate / Fee</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {radiologyCharges
                    .filter((r) => r.item.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="badge badge-light border text-dark font-weight-bold">{item.item_id}</span>
                        </td>
                        <td className="font-weight-bold text-dark">{item.item}</td>
                        <td>
                          <span className="badge badge-info px-2 py-1">{item.plan_name || 'Standard'}</span>
                        </td>
                        <td className="font-weight-bold text-primary">₦{Number(item.rate).toLocaleString()}</td>
                        <td className="text-right">
                          <button
                            className="btn btn-sm btn-outline-info mr-1"
                            onClick={() => openModal('radiology', 'edit', item)}
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete('radiology', item.id, item.item)}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  {radiologyCharges.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No radiology tariffs recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1.4 ADMISSION FEES (WARDS) */}
      {activeSubmodule === 'service' && activeSubSubmodule === 'admission_fees' && (
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between bg-white">
            <h6 className="m-0 font-weight-bold text-primary">
              <i className="fas fa-bed mr-1"></i> Ward Admission Fees & Bed Charges ({admissionFees.length})
            </h6>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm mr-2"
                placeholder="Search wards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '180px' }}
              />
              <button className="btn btn-sm btn-primary font-weight-bold" onClick={() => openModal('ward', 'create')}>
                <i className="fas fa-plus mr-1"></i> Add Ward Fee
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th>#</th>
                    <th>Hospital Ward</th>
                    <th>Daily Admission Fee</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admissionFees
                    .filter((w) => w.ward_name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((item, idx) => (
                      <tr key={item.id}>
                        <td className="font-weight-bold text-muted">{idx + 1}</td>
                        <td className="font-weight-bold text-dark">{item.ward_name}</td>
                        <td className="font-weight-bold text-primary">₦{Number(item.price).toLocaleString()} / day</td>
                        <td>
                          <span className="badge badge-success px-2 py-1">Available</span>
                        </td>
                        <td className="text-right">
                          <button
                            className="btn btn-sm btn-outline-info mr-1"
                            onClick={() => openModal('ward', 'edit', item)}
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete('ward', item.id, item.ward_name)}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  {admissionFees.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No ward admission charges configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1.5 OTHER SERVICES FEES */}
      {activeSubmodule === 'service' && activeSubSubmodule === 'other_services' && (
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between bg-white">
            <h6 className="m-0 font-weight-bold text-primary">
              <i className="fas fa-hand-holding-medical mr-1"></i> Miscellaneous Medical Services & Procedures ({otherServices.length})
            </h6>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm mr-2"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '180px' }}
              />
              <button className="btn btn-sm btn-primary font-weight-bold" onClick={() => openModal('other', 'create')}>
                <i className="fas fa-plus mr-1"></i> Add Service Fee
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th>Service ID</th>
                    <th>Clinical Service / Procedure</th>
                    <th>Applicable Plan</th>
                    <th>Rate / Fee</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {otherServices
                    .filter((s) => s.service.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="badge badge-light border text-dark font-weight-bold">{item.service_id}</span>
                        </td>
                        <td className="font-weight-bold text-dark">{item.service}</td>
                        <td>
                          <span className="badge badge-secondary px-2 py-1">{item.plan_name || 'All Plans'}</span>
                        </td>
                        <td className="font-weight-bold text-primary">₦{Number(item.rate).toLocaleString()}</td>
                        <td className="text-right">
                          <button
                            className="btn btn-sm btn-outline-info mr-1"
                            onClick={() => openModal('other', 'edit', item)}
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete('other', item.id, item.service)}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  {otherServices.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No service charges configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. PRODUCT TARIFFS SUBMODULE                            */}
      {/* ======================================================== */}

      {/* 2.1 MEDICATION FEES */}
      {activeSubmodule === 'product' && activeSubSubmodule === 'medication_fees' && (
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between bg-white">
            <h6 className="m-0 font-weight-bold text-primary">
              <i className="fas fa-pills mr-1"></i> Pharmacy Medication Price Tariffs ({medicationFees.length})
            </h6>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm mr-2"
                placeholder="Search medication tariffs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '220px' }}
              />
              <button className="btn btn-sm btn-primary font-weight-bold" onClick={() => openModal('medication', 'create')}>
                <i className="fas fa-plus mr-1"></i> Add Medication Tariff
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th>Product SKU</th>
                    <th>Medication Name & Strength</th>
                    <th>Billing Plan</th>
                    <th>Prescription Tariff Rate</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {medicationFees
                    .filter((m) => m.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="badge badge-light border text-dark font-weight-bold">{item.product_id}</span>
                        </td>
                        <td className="font-weight-bold text-dark">{item.product_name}</td>
                        <td>
                          <span className="badge badge-info px-2 py-1">{item.plan_name || 'Standard'}</span>
                        </td>
                        <td className="font-weight-bold text-success">₦{Number(item.rate).toLocaleString()}</td>
                        <td className="text-right">
                          <button
                            className="btn btn-sm btn-outline-info mr-1"
                            onClick={() => openModal('medication', 'edit', item)}
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete('medication', item.id, item.product_name)}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  {medicationFees.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No medication price tariffs recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MANAGE PACKAGES SUBMODULE                            */}
      {/* ======================================================== */}

      {/* 3.1 UPLOAD PACKAGES */}
      {activeSubmodule === 'packages' && activeSubSubmodule === 'upload_packages' && (
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between bg-white">
            <h6 className="m-0 font-weight-bold text-primary">
              <i className="fas fa-cubes mr-1"></i> Health Care Service Packages & Bundles ({packages.length})
            </h6>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-success font-weight-bold" onClick={() => openModal('package', 'create')}>
                <i className="fas fa-plus mr-1"></i> Create Care Package
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th>#</th>
                    <th>Package Name</th>
                    <th>Bundled Items</th>
                    <th>Created By</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg, idx) => (
                    <tr key={pkg.id}>
                      <td className="font-weight-bold text-muted">{idx + 1}</td>
                      <td>
                        <div className="font-weight-bold text-dark">{pkg.name}</div>
                        <small className="text-muted">ID #{pkg.id}</small>
                      </td>
                      <td>
                        <span className="badge badge-primary px-2 py-1">
                          {pkg.items_count || 0} Included Services
                        </span>
                      </td>
                      <td>{pkg.staff_name || 'Admin'}</td>
                      <td className="text-right">
                        <button
                          className="btn btn-sm btn-outline-primary mr-1"
                          onClick={() => {
                            setSelectedPackageId(pkg.id);
                            setActiveSubSubmodule('manage_package_data');
                          }}
                        >
                          <i className="fas fa-list mr-1"></i> Manage Items
                        </button>
                        <button
                          className="btn btn-sm btn-outline-info mr-1"
                          onClick={() => openModal('package', 'edit', pkg)}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete('package', pkg.id, pkg.name)}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {packages.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No health packages configured yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3.2 MANAGE PACKAGE DATA */}
      {activeSubmodule === 'packages' && activeSubSubmodule === 'manage_package_data' && (
        <div className="card shadow mb-4">
          <div className="card-header py-3 bg-white">
            <div className="row align-items-center">
              <div className="col-md-6 mb-2 mb-md-0">
                <div className="d-flex align-items-center">
                  <label className="mr-2 mb-0 font-weight-bold text-dark text-nowrap">Selected Package:</label>
                  <select
                    className="form-control form-control-sm font-weight-bold text-primary"
                    value={selectedPackageId || ''}
                    onChange={(e) => setSelectedPackageId(Number(e.target.value))}
                  >
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-md-6 text-md-right">
                <button
                  className="btn btn-sm btn-primary font-weight-bold"
                  onClick={() => openModal('package_item', 'create')}
                  disabled={!selectedPackageId}
                >
                  <i className="fas fa-plus mr-1"></i> Add Service Item to Package
                </button>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th>#</th>
                    <th>Included Service / Investigation</th>
                    <th>Service Category Type</th>
                    <th>Negotiated Package Rate</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packageItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="font-weight-bold text-muted">{idx + 1}</td>
                      <td className="font-weight-bold text-dark">{item.item}</td>
                      <td>
                        <span className="badge badge-secondary px-2 py-1">{item.type}</span>
                      </td>
                      <td className="font-weight-bold text-success">₦{Number(item.rate).toLocaleString()}</td>
                      <td className="text-right">
                        <button
                          className="btn btn-sm btn-outline-info mr-1"
                          onClick={() => openModal('package_item', 'edit', item)}
                        >
                          <i className="fas fa-edit"></i> Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete('package_item', item.id, item.item)}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {packageItems.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No service items added to this package yet. Click "Add Service Item to Package" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3.3 IMMUNIZATION FEES */}
      {activeSubmodule === 'packages' && activeSubSubmodule === 'immunization_fees' && (
        <div className="card shadow mb-4">
          <div className="card-header py-3 bg-white d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-primary">
              <i className="fas fa-syringe mr-1"></i> Immunization & Vaccine Administration Tariffs ({immunizations.length})
            </h6>
            <button className="btn btn-sm btn-outline-primary" onClick={loadImmunizations}>
              <i className="fas fa-sync-alt mr-1"></i> Refresh
            </button>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0 align-middle">
                <thead className="thead-light">
                  <tr>
                    <th>#</th>
                    <th>Vaccine / Immunization</th>
                    <th>Target Patient Group</th>
                    <th>Standard Schedule</th>
                    <th>Administration Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {immunizations.map((v, idx) => (
                    <tr key={v.id}>
                      <td className="font-weight-bold text-muted">{idx + 1}</td>
                      <td className="font-weight-bold text-dark">{v.vaccine_name}</td>
                      <td>
                        <span className="badge badge-info px-2 py-1">{v.target}</span>
                      </td>
                      <td className="small text-muted font-weight-bold">{v.schedule}</td>
                      <td className="font-weight-bold text-success">₦{Number(v.fee).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* UNIVERSAL CREATE / EDIT TARIFF MODAL                     */}
      {/* ======================================================== */}
      {modalState.open && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title font-weight-bold">
                  <i className="fas fa-file-invoice-dollar mr-2"></i> {modalState.title}
                </h5>
                <button type="button" className="close text-white" onClick={closeModal}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleModalSubmit}>
                <div className="modal-body p-4">
                  {/* Registration Fee Form */}
                  {modalState.entityType === 'reg_fee' && (
                    <>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Plan Name / Description</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Single (General OPD) or Family Plan"
                          value={modalState.formData.plan_name || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, plan_name: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Registration Fee (₦)</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="2500"
                          value={modalState.formData.price || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, price: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Lab & Radiology Form */}
                  {(modalState.entityType === 'lab' || modalState.entityType === 'radiology') && (
                    <>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Test / Procedure Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Full Blood Count or Pelvic Ultrasound"
                          value={modalState.formData.item || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, item: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Item ID / Code</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. LAB-001 or SCN-002"
                          value={modalState.formData.item_id || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, item_id: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Tariff Fee Rate (₦)</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="4500"
                          value={modalState.formData.rate || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, rate: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Ward Admission Fee Form */}
                  {modalState.entityType === 'ward' && (
                    <>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Ward Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Private Executive Suite"
                          value={modalState.formData.ward_name || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, ward_name: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Daily Admission Rate (₦)</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="15000"
                          value={modalState.formData.price || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, price: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Other Services Form */}
                  {modalState.entityType === 'other' && (
                    <>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Service / Procedure Description</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Wound Dressing (Major)"
                          value={modalState.formData.service || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, service: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Service Code</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. SRV-001"
                          value={modalState.formData.service_id || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, service_id: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Rate (₦)</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="3500"
                          value={modalState.formData.rate || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, rate: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Medication Form */}
                  {modalState.entityType === 'medication' && (
                    <>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Product Name & Dosage</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Amoxicillin 500mg Tabs"
                          value={modalState.formData.product_name || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, product_name: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">SKU / Product ID</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. DRG-101"
                          value={modalState.formData.product_id || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, product_id: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Tariff Unit Price (₦)</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="1500"
                          value={modalState.formData.rate || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, rate: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Package Form */}
                  {modalState.entityType === 'package' && (
                    <div className="form-group mb-3">
                      <label className="small font-weight-bold text-dark">Package Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Senior Citizens Health Checkup"
                        value={modalState.formData.name || ''}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            formData: { ...modalState.formData, name: e.target.value },
                          })
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Package Item Form */}
                  {modalState.entityType === 'package_item' && (
                    <>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Service / Procedure Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Complete Blood Count"
                          value={modalState.formData.item || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, item: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Category Type</label>
                        <select
                          className="form-control"
                          value={modalState.formData.type || 'SR'}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, type: e.target.value },
                            })
                          }
                        >
                          <option value="LB">Laboratory (LB)</option>
                          <option value="RD">Radiology (RD)</option>
                          <option value="SR">Clinical Service (SR)</option>
                          <option value="PH">Pharmacy Item (PH)</option>
                        </select>
                      </div>
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">Negotiated Rate (₦)</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="4000"
                          value={modalState.formData.rate || ''}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, rate: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary font-weight-bold">
                    <i className="fas fa-save mr-1"></i> Save Changes
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
