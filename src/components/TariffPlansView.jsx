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

  // Sponsors & HMO Plans state
  const [sponsors, setSponsors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sponsorCategoryFilter, setSponsorCategoryFilter] = useState('');
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [sponsorForm, setSponsorForm] = useState({ name: '', code: '', category: '' });
  const [importingSponsors, setImportingSponsors] = useState(false);
  const [sponsorSaving, setSponsorSaving] = useState(false);

  // Plans under Sponsors state
  const [plans, setPlans] = useState([]);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ plan: '', code: '', sponsor: '', category: '' });
  const [planSaving, setPlanSaving] = useState(false);
  const [selectedPlanSponsorFilter, setSelectedPlanSponsorFilter] = useState('');
  const [planCategoryFilter, setPlanCategoryFilter] = useState('');

  // Professional Delete Dialog State
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    type: '',
    id: null,
    name: '',
    title: '',
    message: '',
    loading: false,
  });

  const [syncExcelModalOpen, setSyncExcelModalOpen] = useState(false);

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

  const loadSponsors = async () => {
    try {
      setLoading(true);
      const [sponsorsRes, catsRes] = await Promise.all([
        api.getSponsors(),
        api.getCategories(),
      ]);
      setSponsors(Array.isArray(sponsorsRes) ? sponsorsRes : []);
      setCategories(Array.isArray(catsRes) ? catsRes : []);
    } catch (err) {
      console.error(err);
      showAlert('Failed to load sponsors.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      const [plansRes, sponsorsRes, catsRes] = await Promise.all([
        api.getPlans(),
        api.getSponsors(),
        api.getCategories(),
      ]);
      setPlans(Array.isArray(plansRes) ? plansRes : []);
      setSponsors(Array.isArray(sponsorsRes) ? sponsorsRes : []);
      setCategories(Array.isArray(catsRes) ? catsRes : []);
    } catch (err) {
      console.error(err);
      showAlert('Failed to load plans.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Reload current data whenever active submodule/sub-submodule changes
  useEffect(() => {
    setSearchTerm('');
    if (activeSubmodule === 'sponsors') {
      loadSponsors();
    } else if (activeSubmodule === 'plans') {
      loadPlans();
    } else if (activeSubmodule === 'service') {
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
    if (activeSubmodule === 'sponsors') {
      loadSponsors();
    } else if (activeSubmodule === 'plans') {
      loadPlans();
    } else if (activeSubmodule === 'service') {
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
  // Sponsor Modal Handlers (Create & Edit & Import)
  // ========================================================
  const openSponsorModal = (mode, item = null) => {
    if (mode === 'edit' && item) {
      setEditingSponsor(item);
      setSponsorForm({
        name: item.name || item.plan || '',
        code: item.code || '',
        category: item.category || '',
      });
    } else {
      setEditingSponsor(null);
      const hmoCat = categories.find((c) => c.category?.toLowerCase() === 'hmo');
      setSponsorForm({
        name: '',
        code: '',
        category: hmoCat ? hmoCat.id : (categories[0]?.id || ''),
      });
    }
    setSponsorModalOpen(true);
  };

  const closeSponsorModal = () => {
    setSponsorModalOpen(false);
    setEditingSponsor(null);
  };

  const handleSaveSponsor = async (e) => {
    e.preventDefault();
    if (!sponsorForm.name.trim()) {
      showAlert('Sponsor Name is required.', 'warning');
      return;
    }
    try {
      setSponsorSaving(true);
      const payload = {
        name: sponsorForm.name.trim(),
        code: sponsorForm.code ? sponsorForm.code.trim().toUpperCase() : '',
        category: sponsorForm.category ? Number(sponsorForm.category) : null,
      };
      if (editingSponsor) {
        await api.updateSponsor(editingSponsor.id, payload);
        showAlert(`Sponsor "${payload.name}" updated successfully.`);
      } else {
        await api.createSponsor(payload);
        showAlert(`Sponsor "${payload.name}" (${payload.code || 'No code'}) created successfully.`);
      }
      closeSponsorModal();
      loadSponsors();
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.detail || 'Failed to save sponsor.', 'danger');
    } finally {
      setSponsorSaving(false);
    }
  };

  // ========================================================
  // Professional Delete & Confirmation Handlers
  // ========================================================
  const confirmDelete = (type, id, name) => {
    let typeLabel = 'Item';
    if (type === 'sponsor') typeLabel = 'Sponsor';
    else if (type === 'plan') typeLabel = 'Tariff Plan';
    else if (type === 'reg_fee') typeLabel = 'Registration Fee';
    else if (type === 'lab') typeLabel = 'Laboratory Test Charge';
    else if (type === 'radiology') typeLabel = 'Radiology Test Charge';
    else if (type === 'ward') typeLabel = 'Admission / Ward Fee';
    else if (type === 'other') typeLabel = 'Hospital Service';
    else if (type === 'medication') typeLabel = 'Medication Fee';
    else if (type === 'package') typeLabel = 'Care Package';
    else if (type === 'package_item') typeLabel = 'Package Item';

    setDeleteDialog({
      isOpen: true,
      type,
      id,
      name,
      title: `Delete ${typeLabel}`,
      message: `Are you sure you want to permanently delete "${name}"?`,
      loading: false,
    });
  };

  const closeDeleteDialog = () => {
    if (deleteDialog.loading) return;
    setDeleteDialog({
      isOpen: false,
      type: '',
      id: null,
      name: '',
      title: '',
      message: '',
      loading: false,
    });
  };

  const handleExecuteDelete = async () => {
    const { type, id, name } = deleteDialog;
    try {
      setDeleteDialog((prev) => ({ ...prev, loading: true }));
      if (type === 'sponsor') {
        await api.deleteSponsor(id);
        showAlert(`Sponsor "${name}" removed successfully.`);
        loadSponsors();
      } else if (type === 'plan') {
        await api.deletePlan(id);
        showAlert(`Plan "${name}" removed successfully.`);
        loadPlans();
      } else if (type === 'reg_fee') {
        const res = await api.deleteRegistrationFee(id);
        showAlert(res.detail || 'Plan deleted.');
        loadRegFees();
      } else if (type === 'lab') {
        const res = await api.deleteLabCharge(id);
        showAlert(res.detail || 'Lab test charge deleted.');
        loadLabCharges();
      } else if (type === 'radiology') {
        const res = await api.deleteRadiologyCharge(id);
        showAlert(res.detail || 'Radiology test charge deleted.');
        loadRadiologyCharges();
      } else if (type === 'ward') {
        const res = await api.deleteAdmissionFee(id);
        showAlert(res.detail || 'Ward fee deleted.');
        loadAdmissionFees();
      } else if (type === 'other') {
        const res = await api.deleteOtherService(id);
        showAlert(res.detail || 'Service deleted.');
        loadOtherServices();
      } else if (type === 'medication') {
        const res = await api.deleteMedicationFee(id);
        showAlert(res.detail || 'Medication tariff deleted.');
        loadMedicationFees();
      } else if (type === 'package') {
        const res = await api.deletePackage(id);
        showAlert(res.detail || 'Package deleted.');
        loadPackages();
      } else if (type === 'package_item') {
        const res = await api.deletePackageData(id);
        showAlert(res.detail || 'Package item deleted.');
        loadPackageData(selectedPackageId);
      }
      closeDeleteDialog();
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.detail || 'Failed to delete item.', 'danger');
      setDeleteDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteSponsor = (id, name) => {
    confirmDelete('sponsor', id, name);
  };

  const handleImportFromExcel = () => {
    setSyncExcelModalOpen(true);
  };

  const executeImportFromExcel = async () => {
    try {
      setImportingSponsors(true);
      const res = await api.importSponsors();
      showAlert(res.message || 'Sponsors synced successfully from Sponsor.xlsx!');
      setSyncExcelModalOpen(false);
      loadSponsors();
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.detail || 'Failed to import sponsors from Sponsor.xlsx.', 'danger');
    } finally {
      setImportingSponsors(false);
    }
  };

  // ========================================================
  // Plan Modal Handlers (Create & Edit Plans for Sponsors)
  // ========================================================
  const openPlanModal = (mode, item = null, defaultSponsorId = null) => {
    if (mode === 'edit' && item) {
      setEditingPlan(item);
      setPlanForm({
        plan: item.plan || '',
        code: item.code || '',
        sponsor: item.sponsor || '',
        category: item.category || '',
      });
    } else {
      setEditingPlan(null);
      const targetSponsorId = defaultSponsorId || selectedPlanSponsorFilter || (sponsors[0]?.id || '');
      const targetSponsor = sponsors.find((s) => String(s.id) === String(targetSponsorId));
      setPlanForm({
        plan: '',
        code: '',
        sponsor: targetSponsorId,
        category: targetSponsor?.category || (categories[0]?.id || ''),
      });
    }
    setPlanModalOpen(true);
  };

  const closePlanModal = () => {
    setPlanModalOpen(false);
    setEditingPlan(null);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!planForm.plan.trim()) {
      showAlert('Plan Name is required.', 'warning');
      return;
    }
    if (!planForm.sponsor) {
      showAlert('Please select a Sponsor for this plan.', 'warning');
      return;
    }
    try {
      setPlanSaving(true);
      const selectedSp = sponsors.find((s) => String(s.id) === String(planForm.sponsor));
      const payload = {
        plan: planForm.plan.trim(),
        code: planForm.code ? planForm.code.trim().toUpperCase() : '',
        sponsor: Number(planForm.sponsor),
        category: (selectedSp?.category || planForm.category) ? Number(selectedSp?.category || planForm.category) : null,
      };
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, payload);
        showAlert(`Plan "${payload.plan}" updated successfully.`);
      } else {
        await api.createPlan(payload);
        showAlert(`Plan "${payload.plan}" created successfully.`);
      }
      closePlanModal();
      loadPlans();
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.detail || 'Failed to save plan.', 'danger');
    } finally {
      setPlanSaving(false);
    }
  };

  const handleDeletePlan = (id, name) => {
    confirmDelete('plan', id, name);
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
  const handleDelete = (entityType, id, name) => {
    confirmDelete(entityType, id, name);
  };


  const filteredSponsors = sponsors.filter((item) => {
    const term = searchTerm.toLowerCase();
    const name = item.name || item.plan || '';
    const matchesSearch =
      name.toLowerCase().includes(term) ||
      (item.code || '').toLowerCase().includes(term) ||
      (item.category_name || '').toLowerCase().includes(term);
    const matchesCategory = sponsorCategoryFilter
      ? String(item.category) === String(sponsorCategoryFilter)
      : true;
    return matchesSearch && matchesCategory;
  });

  const filteredPlans = plans.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (item.plan || '').toLowerCase().includes(term) ||
      (item.code || '').toLowerCase().includes(term) ||
      (item.sponsor_name || '').toLowerCase().includes(term);
    const matchesSponsor = selectedPlanSponsorFilter
      ? String(item.sponsor) === String(selectedPlanSponsorFilter)
      : true;
    return matchesSearch && matchesSponsor;
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
            <i className="fas fa-upload text-primary mr-2"></i>
            Manage Tariff Plans
          </h1>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb bg-transparent p-0 mb-0 small text-muted">
              <li className="breadcrumb-item">Billing Administration</li>
              <li className="breadcrumb-item text-capitalize">
                {activeSubmodule === 'sponsors'
                  ? 'Sponsors'
                  : activeSubmodule === 'service'
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
                  activeSubmodule === 'sponsors' ? 'active bg-primary text-white shadow-sm' : 'text-gray-700'
                }`}
                onClick={() => {
                  setActiveSubmodule('sponsors');
                  setActiveSubSubmodule('manage_sponsors');
                }}
              >
                <i className="fas fa-building mr-2"></i>
                Sponsors
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link cursor-pointer ${
                  activeSubmodule === 'plans' ? 'active bg-primary text-white shadow-sm' : 'text-gray-700'
                }`}
                onClick={() => {
                  setActiveSubmodule('plans');
                  setActiveSubSubmodule('manage_plans');
                }}
              >
                <i className="fas fa-layer-group mr-2"></i>
                Plans
              </a>
            </li>
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
          {activeSubmodule === 'sponsors' && (
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
              <div className="d-flex flex-wrap gap-2">
                <button
                  className={`btn btn-sm ${
                    activeSubSubmodule === 'manage_sponsors' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                  } mr-2 mb-1`}
                  onClick={() => setActiveSubSubmodule('manage_sponsors')}
                >
                  <i className="fas fa-list mr-1"></i> All Sponsors ({sponsors.length})
                </button>
                <button
                  className="btn btn-sm btn-outline-info font-weight-bold mr-2 mb-1"
                  onClick={() => {
                    setActiveSubmodule('plans');
                    setActiveSubSubmodule('manage_plans');
                  }}
                >
                  <i className="fas fa-layer-group mr-1"></i> Go to Plans ({plans.length})
                </button>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <button
                  className="btn btn-sm btn-outline-success font-weight-bold mr-2 mb-1"
                  onClick={handleImportFromExcel}
                  disabled={importingSponsors}
                  title="Import and synchronize all 64 HMO sponsors from Sponsor.xlsx"
                >
                  <i className={`fas fa-file-excel mr-1 ${importingSponsors ? 'fa-spin' : ''}`}></i>
                  {importingSponsors ? 'Syncing...' : 'Sync from Sponsor.xlsx'}
                </button>
                <button
                  className="btn btn-sm btn-primary font-weight-bold mb-1"
                  onClick={() => openSponsorModal('create')}
                >
                  <i className="fas fa-plus-circle mr-1"></i> Add New Sponsor & Code
                </button>
              </div>
            </div>
          )}

          {activeSubmodule === 'plans' && (
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
              <div className="d-flex flex-wrap gap-2">
                <button
                  className={`btn btn-sm ${
                    activeSubSubmodule === 'manage_plans' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'
                  } mr-2 mb-1`}
                  onClick={() => setActiveSubSubmodule('manage_plans')}
                >
                  <i className="fas fa-list mr-1"></i> All Plans ({plans.length})
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary font-weight-bold mr-2 mb-1"
                  onClick={() => {
                    setActiveSubmodule('sponsors');
                    setActiveSubSubmodule('manage_sponsors');
                  }}
                >
                  <i className="fas fa-building mr-1"></i> Manage Sponsors ({sponsors.length})
                </button>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <button
                  className="btn btn-sm btn-primary font-weight-bold mb-1"
                  onClick={() => openPlanModal('create')}
                >
                  <i className="fas fa-plus-circle mr-1"></i> Create Plan for Sponsor
                </button>
              </div>
            </div>
          )}

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
      {/* 0. SPONSORS & HMO CODES SUBMODULE (from Sponsor.xlsx)    */}
      {/* ======================================================== */}
      {activeSubmodule === 'sponsors' && (
        <div>
          {/* Quick Stats Cards */}
          <div className="row mb-4">
            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card border-left-primary shadow-sm h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Total Configured Sponsors
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{sponsors.length}</div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-building fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card border-left-success shadow-sm h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                        HMO Insurance Schemes
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {sponsors.filter((s) => s.category_name?.toLowerCase().includes('hmo')).length}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-shield-alt fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card border-left-info shadow-sm h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                        Retainers & Private
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {sponsors.filter((s) => !s.category_name?.toLowerCase().includes('hmo')).length}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-handshake fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card border-left-warning shadow-sm h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                        Enrolled Patients
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {sponsors.reduce((acc, curr) => acc + (curr.patient_count || 0), 0)}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-users fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sponsors Table Card */}
          <div className="card shadow mb-4">
            <div className="card-header py-3 d-flex flex-wrap align-items-center justify-content-between bg-white">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-building mr-1"></i> Hospital Sponsors ({filteredSponsors.length})
              </h6>
              <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mt-md-0">
                <select
                  className="custom-select custom-select-sm mr-2"
                  style={{ width: '160px' }}
                  value={sponsorCategoryFilter}
                  onChange={(e) => setSponsorCategoryFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  className="form-control form-control-sm mr-2"
                  placeholder="Search name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '190px' }}
                />

                <button
                  className="btn btn-sm btn-outline-success font-weight-bold mr-2"
                  onClick={handleImportFromExcel}
                  disabled={importingSponsors}
                  title="Import from Sponsor.xlsx in root"
                >
                  <i className={`fas fa-file-excel mr-1 ${importingSponsors ? 'fa-spin' : ''}`}></i>
                  {importingSponsors ? 'Syncing...' : 'Sync Sponsor.xlsx'}
                </button>

                <button
                  className="btn btn-sm btn-primary font-weight-bold"
                  onClick={() => openSponsorModal('create')}
                >
                  <i className="fas fa-plus mr-1"></i> Add Sponsor
                </button>
              </div>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover table-striped mb-0 align-middle">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>Sponsor / HMO Name</th>
                      <th>Sponsor Code</th>
                      <th>Category</th>
                      <th>Plans</th>
                      <th>Enrollees</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSponsors.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="font-weight-bold text-muted">{idx + 1}</td>
                        <td className="font-weight-bold text-dark">
                          <i className="fas fa-shield-alt text-primary mr-2"></i>
                          {item.name || item.plan}
                        </td>
                        <td>
                          <span className="badge badge-light border text-primary font-mono px-2 py-1 font-weight-bold" style={{ fontSize: '0.85rem' }}>
                            {item.code || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${item.category_name?.toLowerCase().includes('hmo') ? 'badge-primary' : 'badge-secondary'} px-2 py-1`}>
                            {item.category_name || 'Standard'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-xs btn-light border text-primary font-weight-bold px-2 py-1"
                            onClick={() => {
                              setSelectedPlanSponsorFilter(String(item.id));
                              setActiveSubmodule('plans');
                            }}
                            title="View all plans for this sponsor"
                          >
                            <i className="fas fa-layer-group mr-1"></i> {item.plans_count || 0} plans
                          </button>
                        </td>
                        <td>
                          <span className="badge badge-light border text-dark px-2 py-1">
                            <i className="fas fa-user-injured text-info mr-1"></i> {item.patient_count || 0} patients
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            className="btn btn-sm btn-outline-primary mr-1"
                            onClick={() => {
                              setActiveSubmodule('plans');
                              openPlanModal('create', null, item.id);
                            }}
                            title="Create a new plan for this sponsor"
                          >
                            <i className="fas fa-plus mr-1"></i> Add Plan
                          </button>
                          <button
                            className="btn btn-sm btn-outline-info mr-1"
                            onClick={() => openSponsorModal('edit', item)}
                            title="Edit sponsor & code"
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteSponsor(item.id, item.name || item.plan)}
                            title="Delete sponsor"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredSponsors.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-5 text-muted">
                          <i className="fas fa-building fa-2x mb-2 text-gray-300 d-block"></i>
                          No sponsors found matching your criteria.
                          <div className="mt-2">
                            <button className="btn btn-sm btn-primary mr-2" onClick={() => openSponsorModal('create')}>
                              <i className="fas fa-plus mr-1"></i> Add New Sponsor
                            </button>
                            <button className="btn btn-sm btn-success" onClick={handleImportFromExcel}>
                              <i className="fas fa-file-excel mr-1"></i> Import from Sponsor.xlsx
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 0.1 PLANS (UNDER SPONSORS) SUBMODULE                     */}
      {/* ======================================================== */}
      {activeSubmodule === 'plans' && (
        <div>
          {/* Quick Stats Cards */}
          <div className="row mb-4">
            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card border-left-primary shadow-sm h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Total Configured Plans
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{plans.length}</div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-layer-group fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card border-left-success shadow-sm h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                        Active Sponsors
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{sponsors.length}</div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-building fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card border-left-info shadow-sm h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                        Filtered Plans
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{filteredPlans.length}</div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-filter fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card border-left-warning shadow-sm h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                        Enrolled Patients
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {plans.reduce((acc, curr) => acc + (curr.patient_count || 0), 0)}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-users fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Plans Table Card */}
          <div className="card shadow mb-4">
            <div className="card-header py-3 d-flex flex-wrap align-items-center justify-content-between bg-white">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-layer-group mr-1"></i> Tariff Plans for Sponsors ({filteredPlans.length})
              </h6>
              <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mt-md-0">
                {/* Filter by Sponsor */}
                <select
                  className="custom-select custom-select-sm mr-2"
                  style={{ maxWidth: '240px' }}
                  value={selectedPlanSponsorFilter}
                  onChange={(e) => setSelectedPlanSponsorFilter(e.target.value)}
                >
                  <option value="">All Sponsors ({sponsors.length})</option>
                  {sponsors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.plan} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  className="form-control form-control-sm mr-2"
                  placeholder="Search plan or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '200px' }}
                />

                <button
                  className="btn btn-sm btn-primary font-weight-bold"
                  onClick={() => openPlanModal('create')}
                >
                  <i className="fas fa-plus mr-1"></i> Add Plan
                </button>
              </div>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover table-striped mb-0 align-middle">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>Plan Name</th>
                      <th>Sponsor</th>
                      <th>Plan Code</th>
                      <th>Enrollees</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="font-weight-bold text-muted">{idx + 1}</td>
                        <td className="font-weight-bold text-dark">
                          <i className="fas fa-layer-group text-primary mr-2"></i>
                          {item.plan}
                        </td>
                        <td>
                          {item.sponsor_name ? (
                            <span className="badge badge-light border text-dark px-2 py-1 font-weight-bold">
                              <i className="fas fa-building text-primary mr-1"></i>
                              {item.sponsor_name} {item.sponsor_code ? `(${item.sponsor_code})` : ''}
                            </span>
                          ) : (
                            <span className="text-muted small">Standard / General</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-light border text-primary font-mono px-2 py-1 font-weight-bold" style={{ fontSize: '0.85rem' }}>
                            {item.code || '—'}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-light border text-dark px-2 py-1">
                            <i className="fas fa-user-injured text-info mr-1"></i> {item.patient_count || 0} patients
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            className="btn btn-sm btn-outline-info mr-1"
                            onClick={() => openPlanModal('edit', item)}
                            title="Edit plan"
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeletePlan(item.id, item.plan)}
                            title="Delete plan"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredPlans.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-5 text-muted">
                          <i className="fas fa-layer-group fa-2x mb-2 text-gray-300 d-block"></i>
                          No plans found matching your criteria.
                          <div className="mt-2">
                            <button className="btn btn-sm btn-primary" onClick={() => openPlanModal('create')}>
                              <i className="fas fa-plus mr-1"></i> Add Plan for Sponsor
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* ======================================================== */}
      {/* SPONSOR & HMO CODE CREATE / EDIT MODAL                   */}
      {/* ======================================================== */}
      {sponsorModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-gradient-primary text-white py-3">
                <h5 className="modal-title font-weight-bold text-white mb-0">
                  <i className="fas fa-shield-alt mr-2 text-warning"></i>
                  {editingSponsor ? 'Edit Sponsor & Code' : 'Create New Sponsor & Code'}
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  aria-label="Close"
                  onClick={closeSponsorModal}
                  style={{ textShadow: 'none', opacity: 0.9 }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <form onSubmit={handleSaveSponsor}>
                <div className="modal-body p-4">
                  <div className="alert alert-light border small text-muted mb-3">
                    <i className="fas fa-info-circle text-primary mr-1"></i>
                    Configure hospital sponsors (HMOs, private retainers, corporate schemes) and their billing codes.
                  </div>

                  <div className="form-group mb-3">
                    <label className="small font-weight-bold text-dark">
                      Sponsor / HMO Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. AIICO MULTISHIELD, AVON HMO, RELIANCE HMO"
                      value={sponsorForm.name}
                      onChange={(e) =>
                        setSponsorForm({ ...sponsorForm, name: e.target.value })
                      }
                      required
                      autoFocus
                    />
                    <small className="form-text text-muted">
                      Full official title of the insurance company, company retainer, or sponsor.
                    </small>
                  </div>

                  <div className="form-group mb-3">
                    <label className="small font-weight-bold text-dark">
                      Sponsor Billing Code <span className="text-muted">(Short Code)</span>
                    </label>
                    <div className="input-group">
                      <div className="input-group-prepend">
                        <span className="input-group-text bg-light font-weight-bold text-muted">#</span>
                      </div>
                      <input
                        type="text"
                        className="form-control font-mono font-weight-bold text-uppercase"
                        placeholder="e.g. AMH, AVO, REL, HYG"
                        value={sponsorForm.code}
                        onChange={(e) =>
                          setSponsorForm({ ...sponsorForm, code: e.target.value.toUpperCase() })
                        }
                        maxLength={20}
                      />
                    </div>
                    <small className="form-text text-muted">
                      Unique identifier matching standard HMO billing shortcodes (as in Sponsor.xlsx).
                    </small>
                  </div>

                  <div className="form-group mb-3">
                    <label className="small font-weight-bold text-dark">
                      Coverage Category <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={sponsorForm.category}
                      onChange={(e) =>
                        setSponsorForm({ ...sponsorForm, category: e.target.value })
                      }
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.category}
                        </option>
                      ))}
                      {categories.length === 0 && (
                        <option value="">No categories found (Default HMO will be applied)</option>
                      )}
                    </select>
                    <small className="form-text text-muted">
                      Classification determining billing tariff tier and authorization workflow.
                    </small>
                  </div>
                </div>

                <div className="modal-footer bg-light py-2">
                  <button
                    type="button"
                    className="btn btn-secondary font-weight-bold"
                    onClick={closeSponsorModal}
                    disabled={sponsorSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary font-weight-bold"
                    disabled={sponsorSaving}
                  >
                    {sponsorSaving ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-1"></i> Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-1"></i> {editingSponsor ? 'Update Sponsor' : 'Save Sponsor'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TARIFF PLAN CREATE / EDIT MODAL (SELECT SPONSOR)         */}
      {/* ======================================================== */}
      {planModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1056 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px', margin: '1.75rem auto' }}>
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: '10px', overflow: 'hidden' }}>
              <div className="modal-header bg-gradient-primary text-white py-3 px-4 align-items-center">
                <h5 className="modal-title font-weight-bold text-white mb-0 d-flex align-items-center">
                  <i className="fas fa-layer-group mr-2 text-warning"></i>
                  {editingPlan ? 'Edit Tariff Plan' : 'Create Plan for Sponsor'}
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  aria-label="Close"
                  onClick={closePlanModal}
                  style={{ textShadow: 'none', opacity: 0.9, fontSize: '1.4rem' }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <form onSubmit={handleSavePlan}>
                <div className="modal-body p-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                  <div className="alert alert-light border small text-muted mb-3 d-flex align-items-center">
                    <i className="fas fa-info-circle text-primary mr-2" style={{ fontSize: '1.1rem' }}></i>
                    <span>
                      Select the sponsor, then define the plan name and optional short code.
                    </span>
                  </div>

                  {/* 1. SELECT SPONSOR */}
                  <div className="form-group mb-3">
                    <label className="small font-weight-bold text-dark d-flex justify-content-between align-items-center mb-1">
                      <span>Select Sponsor <span className="text-danger">*</span></span>
                      {planForm.sponsor && (
                        <span className="badge badge-light border text-primary font-weight-bold">
                          Code: {sponsors.find((s) => String(s.id) === String(planForm.sponsor))?.code || 'None'}
                        </span>
                      )}
                    </label>
                    <select
                      className="form-control font-weight-bold"
                      value={planForm.sponsor}
                      onChange={(e) => {
                        const sId = e.target.value;
                        const selectedSp = sponsors.find((s) => String(s.id) === String(sId));
                        setPlanForm({
                          ...planForm,
                          sponsor: sId,
                          category: selectedSp?.category || planForm.category,
                        });
                      }}
                      required
                      autoFocus
                    >
                      <option value="">-- Choose Sponsor (e.g. AIICO, AVON HMO, RELIANCE) --</option>
                      {sponsors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.plan} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))}
                    </select>
                    <small className="form-text text-muted">
                      Every plan belongs directly to an HMO or corporate retainer.
                    </small>
                  </div>

                  {/* 2. PLAN NAME */}
                  <div className="form-group mb-3">
                    <label className="small font-weight-bold text-dark mb-1">
                      Plan Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Gold Plan, Silver Tier, Executive, Family, Comprehensive"
                      value={planForm.plan}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, plan: e.target.value })
                      }
                      required
                    />
                    <small className="form-text text-muted">
                      The name of the benefit plan, tier, or insurance package.
                    </small>
                  </div>

                  {/* 3. PLAN CODE */}
                  <div className="form-group mb-1">
                    <label className="small font-weight-bold text-dark mb-1">
                      Plan Code <span className="text-muted">(Optional)</span>
                    </label>
                    <div className="input-group">
                      <div className="input-group-prepend">
                        <span className="input-group-text bg-light font-weight-bold text-muted">#</span>
                      </div>
                      <input
                        type="text"
                        className="form-control font-mono font-weight-bold text-uppercase"
                        placeholder="e.g. GLD, SLV, EXE, FAM"
                        value={planForm.code}
                        onChange={(e) =>
                          setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })
                        }
                        maxLength={20}
                      />
                    </div>
                    <small className="form-text text-muted">
                      Optional short code for electronic claims and billing categorization.
                    </small>
                  </div>
                </div>

                <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-end border-top">
                  <button
                    type="button"
                    className="btn btn-secondary font-weight-bold px-3 mr-2"
                    onClick={closePlanModal}
                    disabled={planSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary font-weight-bold px-4 shadow-sm"
                    disabled={planSaving}
                  >
                    {planSaving ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-1"></i> Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check-circle mr-1"></i> {editingPlan ? 'Update Plan' : 'Save Plan'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PROFESSIONAL DELETE CONFIRMATION MODAL                   */}
      {/* ======================================================== */}
      {deleteDialog.isOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px', margin: '1.75rem auto' }}>
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <div className="modal-header bg-gradient-danger text-white py-3 px-4 align-items-center">
                <h5 className="modal-title font-weight-bold text-white mb-0 d-flex align-items-center">
                  <i className="fas fa-exclamation-triangle mr-2 text-warning"></i>
                  {deleteDialog.title || 'Confirm Deletion'}
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  aria-label="Close"
                  onClick={closeDeleteDialog}
                  disabled={deleteDialog.loading}
                  style={{ textShadow: 'none', opacity: 0.9, fontSize: '1.4rem' }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body p-4 text-center">
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
                <h5 className="font-weight-bold text-dark mb-2">Are you sure?</h5>
                <p className="text-muted small mb-0 px-2" style={{ lineHeight: '1.5' }}>
                  {deleteDialog.message}
                </p>
                <div className="alert alert-warning border text-left small mt-3 mb-0 py-2 px-3">
                  <i className="fas fa-info-circle mr-1 text-warning"></i>
                  This record will be permanently deleted from the database.
                </div>
              </div>

              <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-end border-top">
                <button
                  type="button"
                  className="btn btn-secondary font-weight-bold px-3 mr-2"
                  onClick={closeDeleteDialog}
                  disabled={deleteDialog.loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger font-weight-bold px-4 shadow-sm"
                  onClick={handleExecuteDelete}
                  disabled={deleteDialog.loading}
                >
                  {deleteDialog.loading ? (
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
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SYNC EXCEL CONFIRMATION MODAL                            */}
      {/* ======================================================== */}
      {syncExcelModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '480px', margin: '1.75rem auto' }}>
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <div className="modal-header bg-success text-white py-3 px-4 align-items-center">
                <h5 className="modal-title font-weight-bold text-white mb-0 d-flex align-items-center">
                  <i className="fas fa-file-excel mr-2 text-warning"></i>
                  Sync Sponsors from Sponsor.xlsx
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  aria-label="Close"
                  onClick={() => setSyncExcelModalOpen(false)}
                  disabled={importingSponsors}
                  style={{ textShadow: 'none', opacity: 0.9, fontSize: '1.4rem' }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body p-4 text-center">
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3 shadow-sm"
                  style={{
                    width: '68px',
                    height: '68px',
                    backgroundColor: '#e6f7ef',
                    color: '#1cc88a',
                    border: '2px solid #b7eb8f',
                  }}
                >
                  <i className="fas fa-sync-alt fa-2x"></i>
                </div>
                <h5 className="font-weight-bold text-dark mb-2">Synchronize HMO Sponsors?</h5>
                <p className="text-muted small mb-0 px-2" style={{ lineHeight: '1.5' }}>
                  This will import and update all 64 HMO sponsors and their official billing codes from <strong>Sponsor.xlsx</strong> into the database.
                </p>
              </div>

              <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-end border-top">
                <button
                  type="button"
                  className="btn btn-secondary font-weight-bold px-3 mr-2"
                  onClick={() => setSyncExcelModalOpen(false)}
                  disabled={importingSponsors}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success font-weight-bold px-4 shadow-sm"
                  onClick={executeImportFromExcel}
                  disabled={importingSponsors}
                >
                  {importingSponsors ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-1"></i> Syncing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check mr-1"></i> Proceed &amp; Sync
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



