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

  // Categories state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ category: '' });
  const [categorySaving, setCategorySaving] = useState(false);

  // Plans under Sponsors state
  const [plans, setPlans] = useState([]);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ plan: '', code: '', sponsor: '', category: '' });
  const [planSaving, setPlanSaving] = useState(false);
  const [selectedPlanSponsorFilter, setSelectedPlanSponsorFilter] = useState('');
  const [planCategoryFilter, setPlanCategoryFilter] = useState('');
  const [medicationSponsorFilter, setMedicationSponsorFilter] = useState('');
  const [medicationPlanFilter, setMedicationPlanFilter] = useState('');
  const [labSponsorFilter, setLabSponsorFilter] = useState('');
  const [labPlanFilter, setLabPlanFilter] = useState('');
  const [radiologySponsorFilter, setRadiologySponsorFilter] = useState('');
  const [radiologyPlanFilter, setRadiologyPlanFilter] = useState('');

  // Bulk Upload State for Tariffs (Medication & Laboratory & Radiology)
  const [bulkUploadType, setBulkUploadType] = useState('medication'); // 'medication' | 'lab' | 'radiology'
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadSponsor, setBulkUploadSponsor] = useState('');
  const [bulkUploadPlan, setBulkUploadPlan] = useState('');
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkPreviewRows, setBulkPreviewRows] = useState([]);
  const [bulkDownloadingTemplate, setBulkDownloadingTemplate] = useState(false);
  const [bulkUploadDragOver, setBulkUploadDragOver] = useState(false);
  const [loadingGeneralPrices, setLoadingGeneralPrices] = useState(false);

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

  // Download CSV Template for Medication Tariffs
  const handleDownloadTemplate = async (sponsorId = null, planId = null) => {
    try {
      setBulkDownloadingTemplate(true);
      const sId = sponsorId || bulkUploadSponsor || medicationSponsorFilter;
      const pId = planId || bulkUploadPlan || medicationPlanFilter;
      const params = {};
      if (sId) params.sponsor = sId;
      if (pId) params.plan = pId;

      const blobData = await api.downloadMedicationFeesTemplate(params);
      const url = window.URL.createObjectURL(new Blob([blobData], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `medication_tariffs_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      showAlert('Medication tariffs CSV template downloaded successfully.', 'success');
    } catch (err) {
      console.error('Error downloading template:', err);
      showAlert('Failed to download template. Please try again.', 'danger');
    } finally {
      setBulkDownloadingTemplate(false);
    }
  };

  // Download CSV Template for Laboratory Investigation Charges
  const handleDownloadLabTemplate = async (sponsorId = null, planId = null) => {
    try {
      setBulkDownloadingTemplate(true);
      const sId = sponsorId !== null ? sponsorId : (bulkUploadSponsor || labSponsorFilter);
      const pId = planId !== null ? planId : (bulkUploadPlan || labPlanFilter);
      const params = {};
      if (sId) params.sponsor = sId;
      if (pId) params.plan = pId;

      const blobData = await api.downloadLabChargesTemplate(params);
      const url = window.URL.createObjectURL(new Blob([blobData], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      const filename = sId === 'general' ? 'lab_tariffs_template_general.csv' : 'lab_tariffs_template.csv';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      showAlert(
        sId === 'general'
          ? 'General Laboratory Tariffs CSV template downloaded successfully.'
          : 'Laboratory tariffs CSV template downloaded successfully.',
        'success'
      );
    } catch (err) {
      console.error('Error downloading lab template:', err);
      showAlert('Failed to download lab template. Please try again.', 'danger');
    } finally {
      setBulkDownloadingTemplate(false);
    }
  };

  // Load / Initialize General Medication Prices from Pharmacy Formulary & Inventory
  const handleLoadGeneralPrices = async () => {
    try {
      setLoadingGeneralPrices(true);
      const res = await api.loadGeneralMedicationPrices();
      showAlert(res.detail || 'General medication prices loaded successfully!', 'success');
      await loadMedicationFees();
    } catch (err) {
      console.error('Error loading general medication prices:', err);
      showAlert(err.response?.data?.detail || 'Failed to load general medication prices.', 'danger');
    } finally {
      setLoadingGeneralPrices(false);
    }
  };

  // Load / Initialize General Laboratory Prices
  const handleLoadGeneralLabPrices = async () => {
    try {
      setLoadingGeneralPrices(true);
      const res = await api.loadGeneralLabPrices();
      showAlert(res.detail || 'General laboratory prices loaded successfully!', 'success');
      await loadLabCharges();
    } catch (err) {
      console.error('Error loading general lab prices:', err);
      showAlert(err.response?.data?.detail || 'Failed to load general laboratory prices.', 'danger');
    } finally {
      setLoadingGeneralPrices(false);
    }
  };

  // Load / Initialize General Radiology Prices
  const handleLoadGeneralRadiologyPrices = async () => {
    try {
      setLoadingGeneralPrices(true);
      const res = await api.loadGeneralRadiologyPrices();
      showAlert(res.detail || 'General radiology prices loaded successfully!', 'success');
      await loadRadiologyCharges();
    } catch (err) {
      console.error('Error loading general radiology prices:', err);
      showAlert(err.response?.data?.detail || 'Failed to load general radiology prices.', 'danger');
    } finally {
      setLoadingGeneralPrices(false);
    }
  };

  // Download CSV Template for Radiology & Scan Charges
  const handleDownloadRadiologyTemplate = async (sponsorId = null, planId = null) => {
    try {
      setBulkDownloadingTemplate(true);
      const sId = sponsorId || bulkUploadSponsor || radiologySponsorFilter;
      const pId = planId || bulkUploadPlan || radiologyPlanFilter;
      const params = {};
      if (sId) params.sponsor = sId;
      if (pId) params.plan = pId;

      const blobData = await api.downloadRadiologyChargesTemplate(params);
      const url = window.URL.createObjectURL(new Blob([blobData], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      const filename = sId === 'general' ? 'radiology_tariffs_template_general.csv' : 'radiology_tariffs_template.csv';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      showAlert('Radiology tariffs CSV template downloaded successfully.', 'success');
    } catch (err) {
      console.error('Error downloading radiology template:', err);
      showAlert('Failed to download radiology template. Please try again.', 'danger');
    } finally {
      setBulkDownloadingTemplate(false);
    }
  };

  // Handle Bulk Upload file selection and preview
  const handleBulkFileChange = (file) => {
    if (!file) {
      setBulkUploadFile(null);
      setBulkPreviewRows([]);
      return;
    }
    setBulkUploadFile(file);

    if (file.name.toLowerCase().endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length > 1) {
            const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
            const preview = [];
            for (let i = 1; i < Math.min(lines.length, 6); i++) {
              const cols = lines[i].split(',').map((c) => c.trim());
              const rowObj = {};
              headers.forEach((h, idx) => {
                rowObj[h] = cols[idx] || '';
              });
              preview.push(rowObj);
            }
            setBulkPreviewRows(preview);
          }
        } catch (_) {}
      };
      reader.readAsText(file);
    } else {
      setBulkPreviewRows([]);
    }
  };

  // Submit Bulk Upload
  const handleExecuteBulkUpload = async (e) => {
    if (e) e.preventDefault();
    if (!bulkUploadFile) {
      showAlert('Please select or drop a CSV or Excel file to upload.', 'warning');
      return;
    }

    try {
      setBulkUploadLoading(true);
      const formData = new FormData();
      formData.append('file', bulkUploadFile);
      if (bulkUploadSponsor) {
        formData.append('sponsor_id', bulkUploadSponsor);
      }
      if (bulkUploadPlan) {
        formData.append('plan_id', bulkUploadPlan);
      }

      if (bulkUploadType === 'lab') {
        const res = await api.bulkImportLabCharges(formData);
        showAlert(res.detail || 'Bulk laboratory tariffs imported successfully!', 'success');
        setIsBulkUploadModalOpen(false);
        setBulkUploadFile(null);
        setBulkPreviewRows([]);
        loadLabCharges();
      } else if (bulkUploadType === 'radiology') {
        const res = await api.bulkImportRadiologyCharges(formData);
        showAlert(res.detail || 'Bulk radiology tariffs imported successfully!', 'success');
        setIsBulkUploadModalOpen(false);
        setBulkUploadFile(null);
        setBulkPreviewRows([]);
        loadRadiologyCharges();
      } else {
        const res = await api.bulkImportMedicationFees(formData);
        showAlert(res.detail || 'Bulk medication tariffs imported successfully!', 'success');
        setIsBulkUploadModalOpen(false);
        setBulkUploadFile(null);
        setBulkPreviewRows([]);
        loadMedicationFees();
      }
    } catch (err) {
      console.error('Error during bulk import:', err);
      showAlert(err.response?.data?.detail || 'Failed to bulk import tariffs. Please check file format.', 'danger');
    } finally {
      setBulkUploadLoading(false);
    }
  };

  // Open Bulk Upload Modal with guaranteed sponsors and plans loaded
  const openBulkUploadModal = async (type = 'medication') => {
    setBulkUploadType(type);
    let currentSponsors = sponsors;
    let currentPlans = plans;

    if (currentSponsors.length === 0 || currentPlans.length === 0) {
      try {
        const [spRes, plRes] = await Promise.all([
          currentSponsors.length === 0 ? api.getSponsors() : Promise.resolve(currentSponsors),
          currentPlans.length === 0 ? api.getPlans() : Promise.resolve(currentPlans),
        ]);
        if (Array.isArray(spRes) && spRes.length > 0) {
          currentSponsors = spRes;
          setSponsors(spRes);
        }
        if (Array.isArray(plRes) && plRes.length > 0) {
          currentPlans = plRes;
          setPlans(plRes);
        }
      } catch (err) {
        console.error('Error prefetching sponsors/plans for bulk upload modal:', err);
      }
    }

    const defaultSponsor = type === 'lab'
      ? (labSponsorFilter || (currentSponsors.length > 0 ? currentSponsors[0].id : ''))
      : type === 'radiology'
      ? (radiologySponsorFilter || (currentSponsors.length > 0 ? currentSponsors[0].id : ''))
      : (medicationSponsorFilter || (currentSponsors.length > 0 ? currentSponsors[0].id : ''));

    const defaultPlan = type === 'lab'
      ? (labPlanFilter || '')
      : type === 'radiology'
      ? (radiologyPlanFilter || '')
      : (medicationPlanFilter || '');

    setBulkUploadSponsor(defaultSponsor);
    setBulkUploadPlan(defaultPlan);
    setBulkUploadFile(null);
    setBulkPreviewRows([]);
    setIsBulkUploadModalOpen(true);
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
      const [res, spRes, plRes] = await Promise.all([
        api.getLabCharges(),
        sponsors.length === 0 ? api.getSponsors() : Promise.resolve(sponsors),
        plans.length === 0 ? api.getPlans() : Promise.resolve(plans),
      ]);
      setLabCharges(res.charges || []);
      if (Array.isArray(spRes) && spRes.length > 0) setSponsors(spRes);
      if (Array.isArray(plRes) && plRes.length > 0) setPlans(plRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRadiologyCharges = async () => {
    try {
      setLoading(true);
      const [res, spRes, plRes] = await Promise.all([
        api.getRadiologyCharges(),
        sponsors.length === 0 ? api.getSponsors() : Promise.resolve(sponsors),
        plans.length === 0 ? api.getPlans() : Promise.resolve(plans),
      ]);
      setRadiologyCharges(res.charges || []);
      if (Array.isArray(spRes) && spRes.length > 0) setSponsors(spRes);
      if (Array.isArray(plRes) && plRes.length > 0) setPlans(plRes);
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
      const [res, spRes, plRes] = await Promise.all([
        api.getMedicationFees(),
        sponsors.length === 0 ? api.getSponsors() : Promise.resolve(sponsors),
        plans.length === 0 ? api.getPlans() : Promise.resolve(plans),
      ]);
      setMedicationFees(res.medications || []);
      if (Array.isArray(spRes) && spRes.length > 0) setSponsors(spRes);
      if (Array.isArray(plRes) && plRes.length > 0) setPlans(plRes);
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

  // Pre-load sponsors, plans, and categories on initial mount so all tabs and modals have data immediately
  useEffect(() => {
    let isMounted = true;
    const prefetchData = async () => {
      try {
        const [sponsorsRes, plansRes, catsRes] = await Promise.all([
          api.getSponsors(),
          api.getPlans(),
          api.getCategories(),
        ]);
        if (isMounted) {
          if (Array.isArray(sponsorsRes)) setSponsors(sponsorsRes);
          if (Array.isArray(plansRes)) setPlans(plansRes);
          if (Array.isArray(catsRes)) setCategories(catsRes);
        }
      } catch (err) {
        console.error('Initial prefetch error:', err);
      }
    };
    prefetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Reload current data whenever active submodule/sub-submodule changes
  useEffect(() => {
    setSearchTerm('');
    if (activeSubmodule === 'sponsors') {
      loadSponsors();
    } else if (activeSubmodule === 'plans') {
      loadPlans();
    } else if (activeSubmodule === 'categories') {
      loadCategories();
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
    } else if (activeSubmodule === 'categories') {
      loadCategories();
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
    else if (type === 'category') typeLabel = 'Billing Category';
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
      } else if (type === 'category') {
        await api.deleteCategory(id);
        showAlert(`Category "${name}" removed successfully.`);
        loadCategories();
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

  const [sponsorUploadFile, setSponsorUploadFile] = useState(null);
  const [sponsorUploadCategory, setSponsorUploadCategory] = useState('');
  const [downloadingSponsorTemplate, setDownloadingSponsorTemplate] = useState(false);
  const [sponsorDragOver, setSponsorDragOver] = useState(false);

  const handleImportFromExcel = () => {
    setSponsorUploadFile(null);
    setSponsorUploadCategory(sponsorCategoryFilter || '');
    setSyncExcelModalOpen(true);
  };

  const handleDownloadSponsorTemplate = async () => {
    try {
      setDownloadingSponsorTemplate(true);
      const blobData = await api.downloadSponsorsTemplate();
      const url = window.URL.createObjectURL(new Blob([blobData], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sponsors_bulk_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      showAlert('Sponsors bulk upload Excel template downloaded successfully!', 'success');
    } catch (err) {
      console.error('Error downloading sponsor template:', err);
      showAlert('Failed to download sponsor template. Please try again.', 'danger');
    } finally {
      setDownloadingSponsorTemplate(false);
    }
  };

  const executeImportFromExcel = async () => {
    try {
      setImportingSponsors(true);
      let res;
      if (sponsorUploadFile) {
        const formData = new FormData();
        formData.append('file', sponsorUploadFile);
        if (sponsorUploadCategory) {
          formData.append('category_id', sponsorUploadCategory);
        }
        res = await api.importSponsors(formData);
      } else {
        res = await api.importSponsors();
      }
      showAlert(res.message || 'Sponsors imported and synchronized successfully!');
      setSyncExcelModalOpen(false);
      setSponsorUploadFile(null);
      loadSponsors();
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.detail || err.response?.data?.message || 'Failed to import sponsors.', 'danger');
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
  // Category Modal Handlers (Create & Edit & Delete)
  // ========================================================
  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await api.getCategories();
      setCategories(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
      showAlert('Failed to load categories.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const openCategoryModal = (mode = 'create', item = null) => {
    if (mode === 'edit' && item) {
      setEditingCategory(item);
      setCategoryForm({
        category: item.category || '',
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        category: '',
      });
    }
    setCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryForm({ category: '' });
  };

  const handleSaveCategory = async (e) => {
    if (e) e.preventDefault();
    if (!categoryForm.category.trim()) {
      showAlert('Category name is required (e.g. Corporate Retainer, Family Retainer, NHIS, Private, HMO).', 'warning');
      return;
    }
    try {
      setCategorySaving(true);
      const payload = {
        category: categoryForm.category.trim(),
      };
      let savedCat = null;
      if (editingCategory) {
        savedCat = await api.updateCategory(editingCategory.id, payload);
        showAlert(`Category "${payload.category}" updated successfully.`);
      } else {
        savedCat = await api.createCategory(payload);
        showAlert(`Category "${payload.category}" created successfully.`);
      }
      closeCategoryModal();
      await loadCategories();
      if (savedCat?.id) {
        setSponsorForm((prev) => ({ ...prev, category: savedCat.id }));
        setPlanForm((prev) => ({ ...prev, category: savedCat.id }));
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.category?.[0] || err.response?.data?.detail || 'Failed to save category.';
      showAlert(detail, 'danger');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = (cat) => {
    confirmDelete('category', cat.id, cat.category);
  };


  // ========================================================
  // Modal Handlers (Create & Edit)
  // ========================================================
  const openModal = async (entityType, mode, item = null) => {
    let title = '';
    let formData = {};
    let currentSponsors = sponsors;
    let currentPlans = plans;

    if ((entityType === 'lab' || entityType === 'medication' || entityType === 'radiology') && (currentSponsors.length === 0 || currentPlans.length === 0)) {
      try {
        const [spRes, plRes] = await Promise.all([
          currentSponsors.length === 0 ? api.getSponsors() : Promise.resolve(currentSponsors),
          currentPlans.length === 0 ? api.getPlans() : Promise.resolve(currentPlans),
        ]);
        if (Array.isArray(spRes) && spRes.length > 0) {
          currentSponsors = spRes;
          setSponsors(spRes);
        }
        if (Array.isArray(plRes) && plRes.length > 0) {
          currentPlans = plRes;
          setPlans(plRes);
        }
      } catch (err) {
        console.error('Error prefetching sponsors/plans for modal:', err);
      }
    }

    if (entityType === 'reg_fee') {
      title = mode === 'create' ? 'Add New Registration Plan Fee' : 'Update Registration Plan Fee';
      formData = item ? { plan_name: item.plan_name, price: item.price } : { plan_name: '', price: '' };
    } else if (entityType === 'lab') {
      title = mode === 'create' ? 'Add Laboratory Investigation Charge' : 'Update Laboratory Charge';
      const isItemGeneral = item && (item.is_general || (!item.sponsor_id && !item.plan_id));
      formData = item
        ? {
            item: item.item,
            item_id: item.item_id,
            rate: item.rate,
            sponsor_id: isItemGeneral ? 'general' : (item.sponsor_id || ''),
            plan_id: isItemGeneral ? '' : (item.plan_id || ''),
          }
        : {
            item: '',
            item_id: '',
            rate: '',
            sponsor_id: labSponsorFilter || (currentSponsors.length > 0 ? currentSponsors[0].id : ''),
            plan_id: labPlanFilter || '',
          };
    } else if (entityType === 'radiology') {
      title = mode === 'create' ? 'Add Radiology / Scan Investigation Charge' : 'Update Radiology Charge';
      const isGeneralItem = item && (item.is_general || (!item.sponsor_id && !item.plan_id));
      formData = item
        ? {
            item: item.item,
            item_id: item.item_id,
            rate: item.rate,
            sponsor_id: isGeneralItem ? 'general' : (item.sponsor_id || ''),
            plan_id: isGeneralItem ? '' : (item.plan_id || ''),
          }
        : {
            item: '',
            item_id: '',
            rate: '',
            sponsor_id: radiologySponsorFilter || (currentSponsors.length > 0 ? currentSponsors[0].id : ''),
            plan_id: radiologyPlanFilter || '',
          };
    } else if (entityType === 'ward') {
      title = mode === 'create' ? 'Add Hospital Ward Admission Fee' : 'Update Ward Admission Fee';
      formData = item ? { ward_name: item.ward_name, price: item.price } : { ward_name: '', price: '' };
    } else if (entityType === 'other') {
      title = mode === 'create' ? 'Add Hospital Service Fee' : 'Update Hospital Service Fee';
      formData = item ? { service: item.service, service_id: item.service_id, rate: item.rate } : { service: '', service_id: '', rate: '' };
    } else if (entityType === 'medication') {
      title = mode === 'create' ? 'Add Medication Price Tariff' : 'Update Medication Tariff';
      formData = item
        ? {
            product_name: item.product_name,
            product_id: item.product_id,
            rate: item.rate,
            sponsor_id: item.sponsor_id || '',
            plan_id: item.plan_id || '',
          }
        : {
            product_name: '',
            product_id: '',
            rate: '',
            sponsor_id: medicationSponsorFilter || (currentSponsors.length > 0 ? currentSponsors[0].id : ''),
            plan_id: medicationPlanFilter || '',
          };
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
        const payload = { ...formData };
        if (formData.sponsor_id === 'general') {
          payload.sponsor_id = '';
          payload.plan_id = '';
        } else {
          if (!payload.sponsor_id) {
            showAlert('Please select a Sponsor / HMO or General Tariff for this laboratory charge.', 'warning');
            return;
          }
          if (!payload.plan_id) {
            showAlert('Please select a Coverage Plan for this laboratory charge.', 'warning');
            return;
          }
        }
        if (mode === 'create') res = await api.createLabCharge(payload);
        else res = await api.updateLabCharge(id, payload);
        showAlert(res.detail || 'Laboratory investigation charge saved successfully!');
        loadLabCharges();
      } else if (entityType === 'radiology') {
        const isGeneral = formData.sponsor_id === 'general' || !formData.sponsor_id;
        const payload = {
          ...formData,
          sponsor_id: isGeneral ? '' : formData.sponsor_id,
          plan_id: isGeneral ? '' : formData.plan_id,
        };
        if (!isGeneral) {
          if (!formData.sponsor_id) {
            showAlert('Please select a Sponsor / HMO for this radiology tariff.', 'warning');
            return;
          }
          if (!formData.plan_id) {
            showAlert('Please select a Coverage Plan for this radiology tariff.', 'warning');
            return;
          }
        }
        if (mode === 'create') res = await api.createRadiologyCharge(payload);
        else res = await api.updateRadiologyCharge(id, payload);
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
        const isGeneral = formData.sponsor_id === 'general' || !formData.sponsor_id;
        const payload = {
          ...formData,
          sponsor_id: isGeneral ? '' : formData.sponsor_id,
          plan_id: isGeneral ? '' : formData.plan_id,
        };
        if (mode === 'create') res = await api.createMedicationFee(payload);
        else res = await api.updateMedicationFee(id, payload);
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

  const filteredCategories = categories.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (item.category || '').toLowerCase().includes(term);
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
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-4 pb-1" style={{ gap: '16px' }}>
        <div className="d-flex align-items-center" style={{ gap: '14px' }}>
          <div
            className="d-flex align-items-center justify-content-center flex-shrink-0 shadow-xs"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              color: '#2563eb',
            }}
          >
            <i className="fas fa-file-invoice-dollar" style={{ fontSize: '1.3rem' }}></i>
          </div>
          <div>
            <div className="d-flex align-items-center" style={{ gap: '10px' }}>
              <h1 className="h4 mb-0 font-weight-bold" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
                Manage Tariff Plans
              </h1>
              <span
                className="badge badge-light border d-none d-sm-inline-flex align-items-center font-weight-bold"
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  color: '#64748b',
                }}
              >
                Billing Administration
              </span>
            </div>
            {/* Breadcrumb path */}
            <nav aria-label="breadcrumb" className="mt-1">
              <ol className="breadcrumb bg-transparent p-0 mb-0 d-flex align-items-center" style={{ fontSize: '0.78rem', color: '#64748b', gap: '6px' }}>
                <li>Billing</li>
                <li><i className="fas fa-chevron-right text-muted" style={{ fontSize: '0.60rem' }}></i></li>
                <li className="text-capitalize">
                  {activeSubmodule === 'sponsors'
                    ? 'Sponsors'
                    : activeSubmodule === 'plans'
                    ? 'Plans'
                    : activeSubmodule === 'categories'
                    ? 'Categories'
                    : activeSubmodule === 'service'
                    ? 'Service Tariffs'
                    : activeSubmodule === 'product'
                    ? 'Product Tariffs'
                    : 'Manage Packages'}
                </li>
                <li><i className="fas fa-chevron-right text-muted" style={{ fontSize: '0.60rem' }}></i></li>
                <li className="font-weight-bold text-primary text-capitalize">
                  {activeSubSubmodule.replace('_', ' ')}
                </li>
              </ol>
            </nav>
          </div>
        </div>

        {/* Right action controls */}
        <div className="d-flex align-items-center" style={{ gap: '10px' }}>
          <div
            className="d-none d-lg-flex align-items-center px-3 py-1.5"
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#166534',
              fontWeight: 600,
            }}
          >
            <span className="rounded-circle bg-success mr-2" style={{ width: '7px', height: '7px', display: 'inline-block' }}></span>
            Billing Engine Active
          </div>
          <button
            className="btn btn-sm btn-white border font-weight-bold shadow-xs d-inline-flex align-items-center px-3"
            style={{
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              borderColor: '#cbd5e1',
              color: '#334155',
              fontSize: '0.82rem',
              transition: 'all 0.15s ease',
            }}
            onClick={handleRefresh}
            title="Reload all tariffs and coverage data"
          >
            <i className={`fas fa-sync-alt mr-2 text-primary ${loading ? 'fa-spin' : ''}`} style={{ fontSize: '0.84rem' }}></i>
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Primary Submodule Navigation & Secondary Sub-Navigation Card */}
      <div
        className="card border-0 shadow-sm mb-4"
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 18px -2px rgba(15, 23, 42, 0.05)',
        }}
      >
        {/* Level 1: Primary Module Tabs */}
        <div className="bg-white px-3 py-2 border-bottom" style={{ borderColor: '#e2e8f0' }}>
          <div className="d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
            {[
              {
                id: 'sponsors',
                label: 'Sponsors',
                icon: 'fas fa-building',
                count: sponsors.length,
                defaultSub: 'manage_sponsors',
              },
              {
                id: 'plans',
                label: 'Plans',
                icon: 'fas fa-layer-group',
                count: plans.length,
                defaultSub: 'manage_plans',
              },
              {
                id: 'categories',
                label: 'Categories',
                icon: 'fas fa-tags',
                count: categories.length,
                defaultSub: 'manage_categories',
              },
              {
                id: 'service',
                label: 'Service Tariffs',
                icon: 'fas fa-concierge-bell',
                count: regFees.length + labCharges.length + radiologyCharges.length + admissionFees.length + otherServices.length,
                defaultSub: 'reg_fees',
              },
              {
                id: 'product',
                label: 'Product Tariffs',
                icon: 'fas fa-capsules',
                count: medicationFees.length,
                defaultSub: 'medication_fees',
              },
              {
                id: 'packages',
                label: 'Manage Packages',
                icon: 'fas fa-box-open',
                count: packages.length,
                defaultSub: 'upload_packages',
              },
            ].map((tab) => {
              const isActive = activeSubmodule === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="btn btn-sm d-inline-flex align-items-center font-weight-bold px-3 py-1.5 cursor-pointer"
                  style={{
                    backgroundColor: isActive ? '#eff6ff' : 'transparent',
                    color: isActive ? '#1d4ed8' : '#64748b',
                    border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    height: '36px',
                    transition: 'all 0.15s ease-in-out',
                    boxShadow: isActive ? '0 1px 3px rgba(37, 99, 235, 0.08)' : 'none',
                  }}
                  onClick={() => {
                    setActiveSubmodule(tab.id);
                    setActiveSubSubmodule(tab.defaultSub);
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.color = '#0f172a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#64748b';
                    }
                  }}
                >
                  <i className={tab.icon} style={{ marginRight: '8px', color: isActive ? '#2563eb' : '#94a3b8', fontSize: '0.88rem' }}></i>
                  <span>{tab.label}</span>
                  <span
                    className="badge font-weight-bold"
                    style={{
                      marginLeft: '8px',
                      backgroundColor: isActive ? '#2563eb' : '#f1f5f9',
                      color: isActive ? '#ffffff' : '#64748b',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Level 2: Secondary Sub-Navigation Toolbar */}
        <div className="py-2 px-3" style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', minHeight: '48px', display: 'flex', alignItems: 'center' }}>
          {/* Service Tariffs Sub-navigation */}
          {activeSubmodule === 'service' && (
            <div className="d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
              {[
                { id: 'reg_fees', label: 'Registration Fees', icon: 'fas fa-id-card', color: '#2563eb', count: regFees.length },
                { id: 'lab_charges', label: 'Laboratory Charges', icon: 'fas fa-flask', color: '#0284c7', count: labCharges.length },
                { id: 'radiology_charges', label: 'Radiology Charges', icon: 'fas fa-x-ray', color: '#7c3aed', count: radiologyCharges.length },
                { id: 'admission_fees', label: 'Admission Fees', icon: 'fas fa-bed', color: '#d97706', count: admissionFees.length },
                { id: 'other_services', label: 'Other Services Fees', icon: 'fas fa-hand-holding-medical', color: '#0d9488', count: otherServices.length },
              ].map((sub) => {
                const isSubActive = activeSubSubmodule === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    className="btn btn-sm d-inline-flex align-items-center px-3 py-1"
                    style={{
                      backgroundColor: isSubActive ? '#ffffff' : 'transparent',
                      color: isSubActive ? '#0f172a' : '#64748b',
                      border: isSubActive ? '1px solid #cbd5e1' : '1px solid transparent',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      height: '32px',
                      fontWeight: isSubActive ? 700 : 500,
                      boxShadow: isSubActive ? '0 1px 3px rgba(15, 23, 42, 0.06)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setActiveSubSubmodule(sub.id)}
                    onMouseEnter={(e) => {
                      if (!isSubActive) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.border = '1px solid #e2e8f0';
                        e.currentTarget.style.color = '#0f172a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.border = '1px solid transparent';
                        e.currentTarget.style.color = '#64748b';
                      }
                    }}
                  >
                    <i className={sub.icon} style={{ marginRight: '7px', color: isSubActive ? sub.color : '#94a3b8', fontSize: '0.84rem' }}></i>
                    <span>{sub.label}</span>
                    <span
                      className="badge font-weight-bold"
                      style={{
                        marginLeft: '7px',
                        backgroundColor: isSubActive ? '#eff6ff' : '#e2e8f0',
                        color: isSubActive ? '#1d4ed8' : '#64748b',
                        borderRadius: '999px',
                        fontSize: '0.70rem',
                        padding: '2px 6px',
                        border: isSubActive ? '1px solid #dbeafe' : 'none',
                      }}
                    >
                      {sub.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sponsors Sub-navigation */}
          {activeSubmodule === 'sponsors' && (
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between w-100">
              <div className="d-flex flex-wrap align-items-center" style={{ gap: '8px' }}>
                <div
                  className="d-inline-flex align-items-center px-3 py-1"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    height: '32px',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <i className="fas fa-building text-primary" style={{ marginRight: '8px', fontSize: '0.88rem' }}></i>
                  <span className="font-weight-bold" style={{ color: '#0f172a', fontSize: '0.82rem' }}>
                    Sponsors & HMOs
                  </span>
                  <span
                    className="badge font-weight-bold"
                    style={{
                      marginLeft: '8px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #dbeafe',
                      borderRadius: '999px',
                      fontSize: '0.70rem',
                      padding: '2px 7px',
                    }}
                  >
                    {sponsors.length}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm text-muted font-weight-bold d-inline-flex align-items-center"
                  style={{ fontSize: '0.80rem', background: 'transparent', border: 'none', height: '32px' }}
                  onClick={() => {
                    setActiveSubmodule('plans');
                    setActiveSubSubmodule('manage_plans');
                  }}
                >
                  <i className="fas fa-layer-group text-info" style={{ marginRight: '6px' }}></i>
                  View Plans ({plans.length}) &rarr;
                </button>
              </div>
              <div className="d-flex flex-wrap align-items-center" style={{ gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-white font-weight-bold d-inline-flex align-items-center shadow-xs px-3"
                  style={{
                    borderRadius: '6px',
                    fontSize: '0.80rem',
                    height: '32px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                  }}
                  onClick={handleDownloadSponsorTemplate}
                  disabled={downloadingSponsorTemplate}
                  title="Download Excel template for bulk sponsor upload"
                >
                  <i className={`fas fa-download mr-1 ${downloadingSponsorTemplate ? 'fa-spin' : ''}`}></i>
                  {downloadingSponsorTemplate ? 'Downloading...' : 'Download Template'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-white font-weight-bold d-inline-flex align-items-center shadow-xs px-3"
                  style={{
                    borderRadius: '6px',
                    fontSize: '0.80rem',
                    height: '32px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #10b981',
                    color: '#059669',
                  }}
                  onClick={handleImportFromExcel}
                  disabled={importingSponsors}
                  title="Bulk upload sponsors from Excel/CSV file or sync from Sponsor.xlsx"
                >
                  <i className={`fas fa-file-upload text-success ${importingSponsors ? 'fa-spin' : ''}`} style={{ marginRight: '6px' }}></i>
                  {importingSponsors ? 'Uploading...' : 'Bulk Upload Sponsors'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary font-weight-bold d-inline-flex align-items-center shadow-xs px-3"
                  style={{
                    borderRadius: '6px',
                    fontSize: '0.80rem',
                    height: '32px',
                    backgroundColor: '#2563eb',
                    borderColor: '#1d4ed8',
                  }}
                  onClick={() => openSponsorModal('create')}
                >
                  <i className="fas fa-plus-circle" style={{ marginRight: '6px' }}></i> Add New Sponsor
                </button>
              </div>
            </div>
          )}

          {/* Plans Sub-navigation */}
          {activeSubmodule === 'plans' && (
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between w-100">
              <div className="d-flex flex-wrap align-items-center" style={{ gap: '8px' }}>
                <div
                  className="d-inline-flex align-items-center px-3 py-1"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    height: '32px',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <i className="fas fa-layer-group text-primary" style={{ marginRight: '8px', fontSize: '0.88rem' }}></i>
                  <span className="font-weight-bold" style={{ color: '#0f172a', fontSize: '0.82rem' }}>
                    Coverage Plans
                  </span>
                  <span
                    className="badge font-weight-bold"
                    style={{
                      marginLeft: '8px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #dbeafe',
                      borderRadius: '999px',
                      fontSize: '0.70rem',
                      padding: '2px 7px',
                    }}
                  >
                    {plans.length}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm text-muted font-weight-bold d-inline-flex align-items-center"
                  style={{ fontSize: '0.80rem', background: 'transparent', border: 'none', height: '32px' }}
                  onClick={() => {
                    setActiveSubmodule('sponsors');
                    setActiveSubSubmodule('manage_sponsors');
                  }}
                >
                  <i className="fas fa-building text-primary" style={{ marginRight: '6px' }}></i>
                  Manage Sponsors ({sponsors.length}) &rarr;
                </button>
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary font-weight-bold d-inline-flex align-items-center shadow-xs px-3"
                  style={{
                    borderRadius: '6px',
                    fontSize: '0.80rem',
                    height: '32px',
                    backgroundColor: '#2563eb',
                    borderColor: '#1d4ed8',
                  }}
                  onClick={() => openPlanModal('create')}
                >
                  <i className="fas fa-plus-circle" style={{ marginRight: '6px' }}></i> Create Plan for Sponsor
                </button>
              </div>
            </div>
          )}

          {/* Categories Sub-navigation */}
          {activeSubmodule === 'categories' && (
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between w-100">
              <div className="d-flex flex-wrap align-items-center" style={{ gap: '8px' }}>
                <div
                  className="d-inline-flex align-items-center px-3 py-1"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    height: '32px',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <i className="fas fa-tags text-primary" style={{ marginRight: '8px', fontSize: '0.88rem' }}></i>
                  <span className="font-weight-bold" style={{ color: '#0f172a', fontSize: '0.82rem' }}>
                    Billing &amp; Coverage Categories
                  </span>
                  <span
                    className="badge font-weight-bold"
                    style={{
                      marginLeft: '8px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #dbeafe',
                      borderRadius: '999px',
                      fontSize: '0.70rem',
                      padding: '2px 7px',
                    }}
                  >
                    {categories.length}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm text-muted font-weight-bold d-inline-flex align-items-center"
                  style={{ fontSize: '0.80rem', background: 'transparent', border: 'none', height: '32px' }}
                  onClick={() => {
                    setActiveSubmodule('sponsors');
                    setActiveSubSubmodule('manage_sponsors');
                  }}
                >
                  <i className="fas fa-building text-primary" style={{ marginRight: '6px' }}></i>
                  View Sponsors ({sponsors.length}) &rarr;
                </button>
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary font-weight-bold d-inline-flex align-items-center shadow-xs px-3"
                  style={{
                    borderRadius: '6px',
                    fontSize: '0.80rem',
                    height: '32px',
                    backgroundColor: '#2563eb',
                    borderColor: '#1d4ed8',
                  }}
                  onClick={() => openCategoryModal('create')}
                >
                  <i className="fas fa-plus-circle" style={{ marginRight: '6px' }}></i> Add New Category
                </button>
              </div>
            </div>
          )}

          {/* Product Tariffs Sub-navigation */}
          {activeSubmodule === 'product' && (
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between w-100">
              <div className="d-flex flex-wrap align-items-center" style={{ gap: '8px' }}>
                <div
                  className="d-inline-flex align-items-center px-3 py-1"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    height: '32px',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <i className="fas fa-pills text-primary" style={{ marginRight: '8px', fontSize: '0.88rem' }}></i>
                  <span className="font-weight-bold" style={{ color: '#0f172a', fontSize: '0.82rem' }}>
                    Medication Price Tariffs
                  </span>
                  <span
                    className="badge font-weight-bold"
                    style={{
                      marginLeft: '8px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #dbeafe',
                      borderRadius: '999px',
                      fontSize: '0.70rem',
                      padding: '2px 7px',
                    }}
                  >
                    {medicationFees.length}
                  </span>
                </div>
              </div>
              <div className="d-flex flex-wrap align-items-center" style={{ gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success font-weight-bold d-inline-flex align-items-center shadow-xs px-3"
                  style={{
                    borderRadius: '6px',
                    fontSize: '0.80rem',
                    height: '32px',
                    backgroundColor: '#ffffff',
                    borderColor: '#10b981',
                    color: '#059669',
                  }}
                  onClick={handleLoadGeneralPrices}
                  disabled={loadingGeneralPrices}
                  title="Initialize / load general price tariffs from hospital pharmacy formulary"
                >
                  <i className={`fas ${loadingGeneralPrices ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} style={{ marginRight: '6px' }}></i>
                  Load General Prices
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-white font-weight-bold d-inline-flex align-items-center shadow-xs px-3"
                  style={{
                    borderRadius: '6px',
                    fontSize: '0.80rem',
                    height: '32px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                  }}
                  onClick={() => handleDownloadTemplate()}
                  disabled={bulkDownloadingTemplate}
                >
                  <i className="fas fa-download text-primary" style={{ marginRight: '6px' }}></i> Download Template
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary font-weight-bold d-inline-flex align-items-center shadow-xs px-3"
                  style={{
                    borderRadius: '6px',
                    fontSize: '0.80rem',
                    height: '32px',
                    backgroundColor: '#ffffff',
                    borderColor: '#3b82f6',
                    color: '#2563eb',
                  }}
                  onClick={() => openBulkUploadModal('medication')}
                >
                  <i className="fas fa-file-upload" style={{ marginRight: '6px' }}></i> Bulk Upload Tariffs
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary font-weight-bold d-inline-flex align-items-center shadow-xs px-3"
                  style={{
                    borderRadius: '6px',
                    fontSize: '0.80rem',
                    height: '32px',
                    backgroundColor: '#2563eb',
                    borderColor: '#1d4ed8',
                    color: '#ffffff',
                  }}
                  onClick={() => openModal('medication', 'create')}
                >
                  <i className="fas fa-plus-circle" style={{ marginRight: '6px' }}></i> Add Medication Tariff
                </button>
              </div>
            </div>
          )}

          {/* Packages Sub-navigation */}
          {activeSubmodule === 'packages' && (
            <div className="d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
              {[
                { id: 'upload_packages', label: 'Upload Packages', icon: 'fas fa-cubes', count: packages.length },
                { id: 'manage_package_data', label: 'Manage Package Data', icon: 'fas fa-list-alt' },
                { id: 'immunization_fees', label: 'Immunization Fees', icon: 'fas fa-syringe', count: immunizations.length },
              ].map((sub) => {
                const isSubActive = activeSubSubmodule === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    className="btn btn-sm d-inline-flex align-items-center px-3 py-1"
                    style={{
                      backgroundColor: isSubActive ? '#ffffff' : 'transparent',
                      color: isSubActive ? '#0f172a' : '#64748b',
                      border: isSubActive ? '1px solid #cbd5e1' : '1px solid transparent',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      height: '32px',
                      fontWeight: isSubActive ? 700 : 500,
                      boxShadow: isSubActive ? '0 1px 3px rgba(15, 23, 42, 0.05)' : 'none',
                    }}
                    onClick={() => setActiveSubSubmodule(sub.id)}
                  >
                    <i className={`${sub.icon} text-primary`} style={{ marginRight: '7px', fontSize: '0.84rem' }}></i>
                    <span>{sub.label}</span>
                    {sub.count !== undefined && (
                      <span
                        className="badge font-weight-bold"
                        style={{
                          marginLeft: '7px',
                          backgroundColor: isSubActive ? '#eff6ff' : '#e2e8f0',
                          color: isSubActive ? '#1d4ed8' : '#64748b',
                          borderRadius: '999px',
                          fontSize: '0.70rem',
                          padding: '2px 6px',
                          border: isSubActive ? '1px solid #dbeafe' : 'none',
                        }}
                      >
                        {sub.count}
                      </span>
                    )}
                  </button>
                );
              })}
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

                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary font-weight-bold mr-2 d-inline-flex align-items-center"
                  style={{ borderRadius: '6px' }}
                  onClick={() => openCategoryModal('create')}
                  title="Create new billing category"
                >
                  <i className="fas fa-plus mr-1"></i> Category
                </button>

                <input
                  type="text"
                  className="form-control form-control-sm mr-2"
                  placeholder="Search name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '180px' }}
                />

                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary font-weight-bold mr-2 d-inline-flex align-items-center"
                  style={{ borderRadius: '6px' }}
                  onClick={handleDownloadSponsorTemplate}
                  disabled={downloadingSponsorTemplate}
                  title="Download Excel template with sample format for bulk upload"
                >
                  <i className={`fas fa-download mr-1 ${downloadingSponsorTemplate ? 'fa-spin' : ''}`}></i>
                  {downloadingSponsorTemplate ? 'Downloading...' : 'Template'}
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-success font-weight-bold mr-2 d-inline-flex align-items-center"
                  style={{ borderRadius: '6px' }}
                  onClick={handleImportFromExcel}
                  disabled={importingSponsors}
                  title="Upload Excel/CSV file or sync from Sponsor.xlsx"
                >
                  <i className={`fas fa-file-upload mr-1 ${importingSponsors ? 'fa-spin' : ''}`}></i>
                  {importingSponsors ? 'Uploading...' : 'Bulk Upload'}
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
                        <td colSpan="6" className="text-center py-5 text-muted">
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
                  type="button"
                  className="btn btn-sm btn-outline-primary font-weight-bold mr-2 d-inline-flex align-items-center"
                  style={{ borderRadius: '6px' }}
                  onClick={() => openCategoryModal('create')}
                  title="Create new billing category"
                >
                  <i className="fas fa-plus mr-1"></i> Category
                </button>

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
      {/* 0.2 CATEGORIES (BILLING & COVERAGE CATEGORIES) SUBMODULE */}
      {/* ======================================================== */}
      {activeSubmodule === 'categories' && (
        <div>
          {/* Quick Stats Cards */}
          <div className="row mb-4">
            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderLeft: '4px solid #2563eb' }}>
                <div className="card-body p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-xs font-weight-bold text-uppercase mb-1" style={{ color: '#2563eb', letterSpacing: '0.05em' }}>
                        Total Categories
                      </div>
                      <div className="h4 mb-0 font-weight-bold text-gray-900">{categories.length}</div>
                      <small className="text-muted" style={{ fontSize: '0.72rem' }}>Hospital Billing Schemes</small>
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                      <i className="fas fa-tags"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderLeft: '4px solid #059669' }}>
                <div className="card-body p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-xs font-weight-bold text-uppercase mb-1" style={{ color: '#059669', letterSpacing: '0.05em' }}>
                        Linked Sponsors
                      </div>
                      <div className="h4 mb-0 font-weight-bold text-gray-900">
                        {categories.reduce((acc, curr) => acc + (curr.sponsors_count || 0), 0)}
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.72rem' }}>HMO &amp; Corporate Sponsors</small>
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                      <i className="fas fa-building"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderLeft: '4px solid #7c3aed' }}>
                <div className="card-body p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-xs font-weight-bold text-uppercase mb-1" style={{ color: '#7c3aed', letterSpacing: '0.05em' }}>
                        Coverage Plans
                      </div>
                      <div className="h4 mb-0 font-weight-bold text-gray-900">
                        {categories.reduce((acc, curr) => acc + (curr.plans_count || 0), 0)}
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.72rem' }}>Tiered Benefit Tariffs</small>
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                      <i className="fas fa-layer-group"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderLeft: '4px solid #d97706' }}>
                <div className="card-body p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-xs font-weight-bold text-uppercase mb-1" style={{ color: '#d97706', letterSpacing: '0.05em' }}>
                        Enrolled Patients
                      </div>
                      <div className="h4 mb-0 font-weight-bold text-gray-900">
                        {categories.reduce((acc, curr) => acc + (curr.patients_count || 0), 0)}
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.72rem' }}>Registered Patients</small>
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                      <i className="fas fa-users"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Categories Table Card */}
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '14px', overflow: 'hidden' }}>
            <div className="card-header bg-white py-3 px-4 border-bottom">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center" style={{ gap: '14px' }}>
                <div className="d-flex align-items-center">
                  <div
                    className="mr-3 d-flex align-items-center justify-content-center shadow-xs"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      color: '#2563eb',
                      fontSize: '1.25rem',
                      flexShrink: 0,
                    }}
                  >
                    <i className="fas fa-tags"></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                      <h5 className="m-0 font-weight-bold text-gray-900" style={{ fontSize: '1.08rem' }}>
                        Hospital Billing &amp; Coverage Categories
                      </h5>
                      <span
                        className="badge font-weight-bold px-2.5 py-1 shadow-xs"
                        style={{
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        {filteredCategories.length} {filteredCategories.length === 1 ? 'Category' : 'Categories'}
                      </span>
                    </div>
                    <div className="text-muted small mt-0.5" style={{ fontSize: '0.78rem' }}>
                      Classifications defining insurance tiers, direct private pricelists, and company retainership billing workflows.
                    </div>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                  <div className="input-group input-group-sm" style={{ width: '230px' }}>
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0 text-muted">
                        <i className="fas fa-search"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0 pl-0"
                      placeholder="Search categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    />
                    {searchTerm && (
                      <div className="input-group-append">
                        <button
                          className="btn btn-outline-secondary bg-white border"
                          type="button"
                          onClick={() => setSearchTerm('')}
                          title="Clear search"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-primary font-weight-bold shadow-sm d-inline-flex align-items-center px-3 py-1.5"
                    style={{
                      borderRadius: '8px',
                      fontSize: '0.84rem',
                      backgroundColor: '#2563eb',
                      borderColor: '#1d4ed8',
                    }}
                    onClick={() => openCategoryModal('create')}
                  >
                    <i className="fas fa-plus-circle mr-1.5"></i> Add New Category
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ width: '70px', fontSize: '0.74rem', letterSpacing: '0.05em' }} className="text-uppercase text-secondary font-weight-bold py-3 pl-4">#</th>
                      <th style={{ fontSize: '0.74rem', letterSpacing: '0.05em' }} className="text-uppercase text-secondary font-weight-bold py-3">Category Classification</th>
                      <th style={{ width: '230px', fontSize: '0.74rem', letterSpacing: '0.05em' }} className="text-uppercase text-secondary font-weight-bold py-3">Linked Sponsors</th>
                      <th style={{ width: '210px', fontSize: '0.74rem', letterSpacing: '0.05em' }} className="text-uppercase text-secondary font-weight-bold py-3">Coverage Plans</th>
                      <th style={{ width: '190px', fontSize: '0.74rem', letterSpacing: '0.05em' }} className="text-uppercase text-secondary font-weight-bold py-3">Enrolled Patients</th>
                      <th style={{ width: '190px', fontSize: '0.74rem', letterSpacing: '0.05em' }} className="text-uppercase text-secondary font-weight-bold py-3 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((cat, idx) => {
                      const lower = (cat.category || '').toLowerCase();
                      const isHmo = lower.includes('hmo');
                      const isPrivate = lower.includes('private') || lower.includes('self');
                      const isCorporate = lower.includes('corp') || lower.includes('retain');
                      const isNhis = lower.includes('nhis') || lower.includes('state') || lower.includes('scheme');

                      let iconClass = 'fa-tags';
                      let iconBg = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
                      let iconColor = '#475569';
                      let iconBorder = '#cbd5e1';
                      let badgeStyle = { backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' };
                      let subtitle = 'Hospital Patient Billing Category';

                      if (isHmo) {
                        iconClass = 'fa-shield-alt';
                        iconBg = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
                        iconColor = '#2563eb';
                        iconBorder = '#bfdbfe';
                        badgeStyle = { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
                        subtitle = 'Health Maintenance Organization • Claims & Approvals';
                      } else if (isPrivate) {
                        iconClass = 'fa-user-check';
                        iconBg = 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)';
                        iconColor = '#059669';
                        iconBorder = '#a7f3d0';
                        badgeStyle = { backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' };
                        subtitle = 'Hospital Private Tariff • Self-Pay / Purse Billed';
                      } else if (isCorporate) {
                        iconClass = 'fa-building';
                        iconBg = 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)';
                        iconColor = '#7c3aed';
                        iconBorder = '#ddd6fe';
                        badgeStyle = { backgroundColor: '#faf5ff', color: '#6d28d9', border: '1px solid #ddd6fe' };
                        subtitle = 'Corporate Retainership & Company Invoicing';
                      } else if (isNhis) {
                        iconClass = 'fa-landmark';
                        iconBg = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
                        iconColor = '#d97706';
                        iconBorder = '#fde68a';
                        badgeStyle = { backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };
                        subtitle = 'National / State Social Health Insurance Scheme';
                      }

                      return (
                        <tr key={cat.id || idx} style={{ transition: 'background-color 0.15s ease', borderBottom: '1px solid #f1f5f9' }}>
                          <td className="pl-4 align-middle">
                            <span
                              className="badge font-weight-bold px-2 py-1 shadow-xs"
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontFamily: 'monospace',
                                fontSize: '0.80rem',
                              }}
                            >
                              #{String(idx + 1).padStart(2, '0')}
                            </span>
                          </td>
                          <td className="align-middle">
                            <div className="d-flex align-items-center">
                              <div
                                className="shadow-xs mr-3 flex-shrink-0"
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '10px',
                                  background: iconBg,
                                  color: iconColor,
                                  border: `1px solid ${iconBorder}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1rem',
                                }}
                              >
                                <i className={`fas ${iconClass}`}></i>
                              </div>
                              <div>
                                <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                                  <span className="font-weight-bold text-gray-900" style={{ fontSize: '0.94rem' }}>
                                    {cat.category}
                                  </span>
                                  <span
                                    className="badge font-weight-bold px-2 py-0.5 ml-1"
                                    style={{
                                      borderRadius: '4px',
                                      fontSize: '0.70rem',
                                      ...badgeStyle,
                                    }}
                                  >
                                    {isHmo ? 'HMO Scheme' : isPrivate ? 'Private Tariff' : isCorporate ? 'Corporate' : 'Standard'}
                                  </span>
                                </div>
                                <div className="text-muted small mt-0.5" style={{ fontSize: '0.76rem' }}>
                                  {subtitle}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="align-middle">
                            <div
                              className="d-inline-flex align-items-center shadow-xs"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '5px 11px',
                                gap: '8px',
                              }}
                            >
                              <i className="fas fa-building text-primary" style={{ fontSize: '0.85rem' }}></i>
                              <div className="d-flex align-items-baseline" style={{ gap: '4px' }}>
                                <strong className="text-gray-900" style={{ fontSize: '0.88rem' }}>{cat.sponsors_count || 0}</strong>
                                <span className="text-muted" style={{ fontSize: '0.74rem' }}>{(cat.sponsors_count || 0) === 1 ? 'Sponsor' : 'Sponsors'}</span>
                              </div>
                              {(cat.sponsors_count || 0) > 0 && (
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline-primary font-weight-bold ml-1 py-0 px-1.5 shadow-none"
                                  style={{ fontSize: '0.70rem', borderRadius: '5px', height: '20px', lineHeight: '18px' }}
                                  onClick={() => {
                                    setSponsorCategoryFilter(String(cat.id));
                                    setActiveSubmodule('sponsors');
                                    setActiveSubSubmodule('manage_sponsors');
                                  }}
                                  title={`Filter sponsors by ${cat.category}`}
                                >
                                  View <i className="fas fa-arrow-right ml-0.5" style={{ fontSize: '0.62rem' }}></i>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="align-middle">
                            <div
                              className="d-inline-flex align-items-center shadow-xs"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '5px 11px',
                                gap: '8px',
                              }}
                            >
                              <i className="fas fa-layer-group text-info" style={{ fontSize: '0.85rem' }}></i>
                              <div className="d-flex align-items-baseline" style={{ gap: '4px' }}>
                                <strong className="text-gray-900" style={{ fontSize: '0.88rem' }}>{cat.plans_count || 0}</strong>
                                <span className="text-muted" style={{ fontSize: '0.74rem' }}>{(cat.plans_count || 0) === 1 ? 'Plan' : 'Plans'}</span>
                              </div>
                              {(cat.plans_count || 0) > 0 && (
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline-info font-weight-bold ml-1 py-0 px-1.5 shadow-none"
                                  style={{ fontSize: '0.70rem', borderRadius: '5px', height: '20px', lineHeight: '18px' }}
                                  onClick={() => {
                                    setActiveSubmodule('plans');
                                    setActiveSubSubmodule('manage_plans');
                                  }}
                                  title={`View plans under ${cat.category}`}
                                >
                                  View <i className="fas fa-arrow-right ml-0.5" style={{ fontSize: '0.62rem' }}></i>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="align-middle">
                            <div
                              className="d-inline-flex align-items-center shadow-xs"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '5px 11px',
                                gap: '8px',
                              }}
                            >
                              <i className="fas fa-users text-secondary" style={{ fontSize: '0.85rem' }}></i>
                              <div className="d-flex align-items-baseline" style={{ gap: '4px' }}>
                                <strong className="text-gray-900" style={{ fontSize: '0.88rem' }}>{cat.patients_count || 0}</strong>
                                <span className="text-muted" style={{ fontSize: '0.74rem' }}>{(cat.patients_count || 0) === 1 ? 'Patient' : 'Patients'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="align-middle text-right pr-4">
                            <div className="d-flex align-items-center justify-content-end" style={{ gap: '8px' }}>
                              <button
                                type="button"
                                className="btn btn-sm d-inline-flex align-items-center font-weight-bold shadow-xs"
                                style={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  color: '#1e40af',
                                  borderRadius: '7px',
                                  padding: '4px 12px',
                                  fontSize: '0.78rem',
                                  transition: 'all 0.15s ease',
                                }}
                                onClick={() => openCategoryModal('edit', cat)}
                                title="Edit Category Name"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#eff6ff';
                                  e.currentTarget.style.borderColor = '#93c5fd';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#ffffff';
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                              >
                                <i className="fas fa-edit mr-1.5 text-primary"></i> Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm d-inline-flex align-items-center font-weight-bold shadow-xs"
                                style={{
                                  backgroundColor: '#fff1f2',
                                  border: '1px solid #fecdd3',
                                  color: '#e11d48',
                                  borderRadius: '7px',
                                  padding: '4px 12px',
                                  fontSize: '0.78rem',
                                  transition: 'all 0.15s ease',
                                }}
                                onClick={() => handleDeleteCategory(cat)}
                                title="Delete Category"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#ffe4e6';
                                  e.currentTarget.style.borderColor = '#fda4af';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fff1f2';
                                  e.currentTarget.style.borderColor = '#fecdd3';
                                }}
                              >
                                <i className="fas fa-trash-alt mr-1.5 text-danger"></i> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCategories.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-5 text-muted">
                          <div
                            className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                            style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '50%',
                              backgroundColor: '#f1f5f9',
                              color: '#94a3b8',
                              fontSize: '1.6rem',
                            }}
                          >
                            <i className="fas fa-tags"></i>
                          </div>
                          <h6 className="font-weight-bold text-gray-800 mb-1">No Categories Found</h6>
                          <p className="small text-muted mb-3">
                            {searchTerm ? `No category matching "${searchTerm}". Try resetting search.` : 'Get started by creating your first hospital billing category.'}
                          </p>
                          <button
                            className="btn btn-sm btn-primary font-weight-bold shadow-sm px-3 py-1.5"
                            style={{ borderRadius: '8px' }}
                            onClick={() => {
                              if (searchTerm) setSearchTerm('');
                              else openCategoryModal('create');
                            }}
                          >
                            <i className={`fas ${searchTerm ? 'fa-undo mr-1.5' : 'fa-plus-circle mr-1.5'}`}></i>
                            {searchTerm ? 'Reset Search' : 'Add First Category'}
                          </button>
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
      {activeSubmodule === 'service' && activeSubSubmodule === 'reg_fees' && (() => {
        const filteredRegFees = regFees.filter((p) =>
          p.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            {/* Header with Title and Action Button */}
            <div className="card-header bg-white py-3 px-4 border-bottom">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                <div className="d-flex align-items-center mb-2 mb-md-0">
                  <div
                    className="mr-3 d-flex align-items-center justify-content-center shadow-xs"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)',
                      color: '#2563eb',
                      fontSize: '1.25rem',
                      flexShrink: 0,
                    }}
                  >
                    <i className="fas fa-id-card"></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                      <h5 className="m-0 font-weight-bold text-gray-800" style={{ fontSize: '1.1rem' }}>
                        Registration &amp; Consultation Tariff Plans
                      </h5>
                      <span className="badge badge-light border text-primary font-weight-bold px-2 py-1 shadow-sm" style={{ borderRadius: '6px' }}>
                        {filteredRegFees.length} {filteredRegFees.length === 1 ? 'Plan' : 'Plans'}
                      </span>
                    </div>
                    <div className="text-muted small mt-1">
                      Configure base hospital registration, patient folder creation, and initial outpatient consultation tariffs.
                    </div>
                  </div>
                </div>

                {/* Header Action Button */}
                <div className="mt-2 mt-md-0 flex-shrink-0">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary font-weight-bold shadow-sm d-inline-flex align-items-center px-3 py-2"
                    style={{ borderRadius: '8px', fontSize: '0.85rem' }}
                    onClick={() => openModal('reg_fee', 'create')}
                  >
                    <i className="fas fa-plus-circle mr-2"></i> Add Registration Plan
                  </button>
                </div>
              </div>
            </div>

            {/* Filter & Search Control Toolbar */}
            <div className="bg-light py-3 px-4 border-bottom">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-6 col-lg-5 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0 text-muted">
                        <i className="fas fa-search"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0 pl-0"
                      placeholder="Search registration plans..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    />
                    {searchTerm && (
                      <div className="input-group-append">
                        <button
                          className="btn btn-outline-secondary bg-white border"
                          type="button"
                          onClick={() => setSearchTerm('')}
                          title="Clear search"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-auto ml-md-auto d-flex align-items-center">
                  {searchTerm ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger font-weight-bold shadow-sm d-inline-flex align-items-center px-2.5 py-1 bg-white"
                      style={{ borderRadius: '6px', fontSize: '0.80rem' }}
                      onClick={() => setSearchTerm('')}
                    >
                      <i className="fas fa-undo-alt mr-1"></i> Reset Search
                    </button>
                  ) : (
                    <span className="text-muted small">
                      <i className="fas fa-check-circle text-success mr-1"></i> Active tariffs applicable at patient reception
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ width: '80px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3 pl-4">#</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Plan Name / Category</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Registration &amp; Consultation Charge</th>
                      <th style={{ width: '160px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Tariff Status</th>
                      <th style={{ width: '150px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegFees.map((item, idx) => (
                      <tr key={item.id} style={{ transition: 'background-color 0.15s ease' }}>
                        <td className="pl-4 align-middle">
                          <span
                            className="badge font-weight-bold px-2 py-1 shadow-xs"
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              fontSize: '0.80rem',
                            }}
                          >
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="align-middle">
                          <div className="d-flex align-items-center">
                            <div
                              className="d-flex align-items-center justify-content-center shadow-xs"
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                color: '#2563eb',
                                fontSize: '0.90rem',
                                flexShrink: 0,
                                marginRight: '12px',
                              }}
                            >
                              <i className="fas fa-hospital-user"></i>
                            </div>
                            <div>
                              <div className="font-weight-bold text-gray-900" style={{ fontSize: '0.94rem', lineHeight: 1.35 }}>
                                {item.plan_name}
                              </div>
                              <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                                Outpatient Registration &amp; Folder Fee
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="d-inline-flex flex-column">
                            <span
                              className="font-weight-bold"
                              style={{
                                color: '#047857',
                                fontSize: '1.05rem',
                                letterSpacing: '-0.02em',
                                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                              }}
                            >
                              ₦{Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Standard Base Rate
                            </span>
                          </div>
                        </td>
                        <td className="align-middle">
                          <span
                            className="badge px-2.5 py-1 font-weight-bold shadow-xs d-inline-flex align-items-center"
                            style={{
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              letterSpacing: '0.02em',
                            }}
                          >
                            <i className="fas fa-check-circle mr-1.5" style={{ fontSize: '0.72rem' }}></i> Active Tariff
                          </span>
                        </td>
                        <td className="text-right pr-4 align-middle">
                          <div className="btn-group btn-group-sm shadow-xs" role="group">
                            <button
                              type="button"
                              className="btn btn-outline-primary font-weight-bold px-2.5 py-1"
                              onClick={() => openModal('reg_fee', 'edit', item)}
                              title="Edit Plan Price"
                              style={{ borderRadius: '6px 0 0 6px', fontSize: '0.80rem' }}
                            >
                              <i className="fas fa-edit mr-1"></i> Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger px-2.5 py-1"
                              onClick={() => confirmDelete('reg_fee', item.id, item.plan_name)}
                              title="Delete Registration Plan"
                              style={{ borderRadius: '0 6px 6px 0', fontSize: '0.80rem' }}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRegFees.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-5">
                          {searchTerm ? (
                            <div className="py-3">
                              <i className="fas fa-search fa-3x text-gray-300 mb-3 d-block"></i>
                              <h6 className="font-weight-bold text-gray-700">No matching registration plans found</h6>
                              <p className="text-muted small mb-3">
                                No registration plans matched your search query "{searchTerm}".
                              </p>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary mr-2"
                                onClick={() => setSearchTerm('')}
                              >
                                Clear Search
                              </button>
                            </div>
                          ) : (
                            <div className="py-4">
                              <i className="fas fa-id-card fa-3x text-gray-300 mb-3 d-block"></i>
                              <h6 className="font-weight-bold text-gray-800">No registration tariff plans configured</h6>
                              <p className="text-muted small mb-3" style={{ maxWidth: '420px', margin: '0 auto' }}>
                                Add registration plans to establish standard fees charged to patients during initial intake and record creation.
                              </p>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => openModal('reg_fee', 'create')}
                              >
                                <i className="fas fa-plus mr-1"></i> Add Registration Plan
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1.2 LABORATORY INVESTIGATION CHARGES */}
      {activeSubmodule === 'service' && activeSubSubmodule === 'lab_charges' && (() => {
        const filteredLabCharges = labCharges.filter((l) => {
          const matchesSearch =
            !searchTerm ||
            l.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.item_id && l.item_id.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesSponsor =
            !labSponsorFilter ||
            (labSponsorFilter === 'general' ? (!l.sponsor_id && !l.plan_id) || l.is_general : String(l.sponsor_id) === String(labSponsorFilter));
          const matchesPlan = !labPlanFilter || String(l.plan_id) === String(labPlanFilter);
          return matchesSearch && matchesSponsor && matchesPlan;
        });

        const isLabFilterActive = Boolean(labSponsorFilter || labPlanFilter || searchTerm);
        const activeLabSponsorObj = labSponsorFilter === 'general'
          ? { id: 'general', name: 'General / Out-of-Pocket (Self Pay)', code: 'GENERAL' }
          : sponsors.find((s) => String(s.id) === String(labSponsorFilter));
        const activeLabPlanObj = plans.find((p) => String(p.id) === String(labPlanFilter));

        return (
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            {/* Main Card Header */}
            <div className="card-header bg-white py-3 px-4 border-bottom">
              <div className="row align-items-center">
                <div className="col-12 col-xl-6 mb-3 mb-xl-0">
                  <div className="d-flex align-items-center">
                    <div
                      className="mr-3 d-flex align-items-center justify-content-center shadow-xs"
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                        color: '#0284c7',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                      }}
                    >
                      <i className="fas fa-flask"></i>
                    </div>
                    <div>
                      <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                        <h5 className="m-0 font-weight-bold text-gray-900" style={{ fontSize: '1.15rem' }}>
                          Laboratory Investigation Charges
                        </h5>
                        <span
                          className="badge font-weight-bold shadow-xs"
                          style={{
                            borderRadius: '6px',
                            backgroundColor: '#f0f9ff',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            padding: '4px 8px',
                            fontSize: '0.74rem',
                          }}
                        >
                          {filteredLabCharges.length} {filteredLabCharges.length === 1 ? 'Tariff' : 'Tariffs'}
                        </span>
                      </div>
                      <div className="text-muted small mt-1">
                        Manage diagnostic test tariffs attached to HMO Sponsors, Coverage Plans, and General Out-of-Pocket pricing.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-xl-6 text-xl-right">
                  <div className="d-inline-flex flex-wrap align-items-center" style={{ gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-sm d-inline-flex align-items-center shadow-xs"
                      style={{
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        height: '36px',
                        padding: '0 14px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={handleLoadGeneralLabPrices}
                      disabled={loadingGeneralPrices}
                      title="Initialize baseline hospital laboratory charges for self-pay patients"
                    >
                      <i className={`fas ${loadingGeneralPrices ? 'fa-spinner fa-spin' : 'fa-magic'} mr-1.5 text-success`}></i>
                      Load General Prices
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm d-inline-flex align-items-center shadow-xs"
                      style={{
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        height: '36px',
                        padding: '0 14px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => handleDownloadLabTemplate()}
                      disabled={bulkDownloadingTemplate}
                      title="Download sample CSV template for laboratory investigation tariffs"
                    >
                      <i className={`fas ${bulkDownloadingTemplate ? 'fa-spinner fa-spin' : 'fa-download'} mr-1.5 text-info`}></i>
                      Download Template
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm d-inline-flex align-items-center shadow-xs"
                      style={{
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        height: '36px',
                        padding: '0 14px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0369a1',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => openBulkUploadModal('lab')}
                    >
                      <i className="fas fa-file-upload mr-1.5" style={{ color: '#0284c7' }}></i>
                      Bulk Upload Tariffs
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm font-weight-bold d-inline-flex align-items-center shadow-sm text-white"
                      style={{
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        height: '36px',
                        padding: '0 16px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                        border: 'none',
                        boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                      }}
                      onClick={() => openModal('lab', 'create')}
                    >
                      <i className="fas fa-plus-circle mr-1.5"></i> Add Lab Charge
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dedicated Filter & Search Control Toolbar */}
            <div className="bg-light py-3 px-4 border-bottom">
              <div className="row g-2 align-items-center">
                {/* Search Box */}
                <div className="col-12 col-md-5 col-lg-4 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0 text-muted">
                        <i className="fas fa-search"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0 pl-0"
                      placeholder="Search lab tests or item ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    />
                    {searchTerm && (
                      <div className="input-group-append">
                        <button
                          className="btn btn-outline-secondary bg-white border"
                          type="button"
                          onClick={() => setSearchTerm('')}
                          title="Clear search"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sponsor Selector */}
                <div className="col-12 col-md-3 col-lg-3 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white text-muted" title="Sponsor / HMO">
                        <i className="fas fa-shield-alt text-primary"></i>
                      </span>
                    </div>
                    <select
                      className="form-control custom-select"
                      value={labSponsorFilter}
                      onChange={(e) => {
                        setLabSponsorFilter(e.target.value);
                        setLabPlanFilter('');
                      }}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    >
                      <option value="">All Sponsors / HMOs ({sponsors.length})</option>
                      <option value="general">⭐ General / Out-of-Pocket (Self Pay - No HMO)</option>
                      {sponsors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Coverage Plan Selector */}
                <div className="col-12 col-md-3 col-lg-3 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white text-muted" title="Coverage Plan">
                        <i className="fas fa-layer-group text-info"></i>
                      </span>
                    </div>
                    <select
                      className="form-control custom-select"
                      value={labPlanFilter}
                      onChange={(e) => setLabPlanFilter(e.target.value)}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    >
                      <option value="">
                        {labSponsorFilter
                          ? `All Plans for ${activeLabSponsorObj?.code || 'Sponsor'}`
                          : `All Coverage Plans (${plans.length})`}
                      </option>
                      {(labSponsorFilter
                        ? plans.filter((p) => String(p.sponsor) === String(labSponsorFilter))
                        : plans
                      ).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.plan} {p.code ? `(${p.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Reset Filters / Filter State */}
                <div className="col-12 col-md-auto ml-md-auto d-flex align-items-center">
                  {isLabFilterActive ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger font-weight-bold shadow-sm d-inline-flex align-items-center px-2.5 py-1 bg-white"
                      style={{ borderRadius: '6px', fontSize: '0.80rem' }}
                      onClick={() => {
                        setLabSponsorFilter('');
                        setLabPlanFilter('');
                        setSearchTerm('');
                      }}
                    >
                      <i className="fas fa-undo-alt mr-1"></i> Reset Filters
                    </button>
                  ) : (
                    <span className="text-muted small">
                      <i className="fas fa-filter text-muted mr-1"></i> All tariffs
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Summary Ribbon */}
            {isLabFilterActive && (
              <div className="bg-light py-2 px-4 border-bottom d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                <span className="small text-muted font-weight-bold mr-1">Active Filters:</span>
                {labSponsorFilter && (
                  <span className="badge badge-primary px-2.5 py-1 font-weight-normal shadow-sm d-inline-flex align-items-center" style={{ borderRadius: '12px' }}>
                    <i className="fas fa-shield-alt mr-1"></i>
                    Sponsor: {activeLabSponsorObj?.name || 'Selected'}
                    <i
                      className="fas fa-times ml-1.5 cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setLabSponsorFilter('');
                        setLabPlanFilter('');
                      }}
                    ></i>
                  </span>
                )}
                {labPlanFilter && (
                  <span className="badge badge-info px-2.5 py-1 font-weight-normal shadow-sm d-inline-flex align-items-center" style={{ borderRadius: '12px' }}>
                    <i className="fas fa-layer-group mr-1"></i>
                    Plan: {activeLabPlanObj?.plan || 'Selected'}
                    <i
                      className="fas fa-times ml-1.5 cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setLabPlanFilter('')}
                    ></i>
                  </span>
                )}
                {searchTerm && (
                  <span className="badge badge-secondary px-2.5 py-1 font-weight-normal shadow-sm d-inline-flex align-items-center" style={{ borderRadius: '12px' }}>
                    <i className="fas fa-search mr-1"></i>
                    Search: "{searchTerm}"
                    <i
                      className="fas fa-times ml-1.5 cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSearchTerm('')}
                    ></i>
                  </span>
                )}
              </div>
            )}

            {/* Table Content */}
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ width: '130px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3 pl-4">Item ID</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Laboratory Investigation</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Sponsor / HMO Company</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Coverage Plan</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Tariff Fee Rate</th>
                      <th style={{ width: '150px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLabCharges.map((item) => (
                      <tr key={item.id} style={{ transition: 'background-color 0.15s ease' }}>
                        <td className="pl-4 align-middle">
                          <span
                            className="badge font-weight-bold px-2 py-1 shadow-xs"
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                              fontSize: '0.80rem',
                              letterSpacing: '0.03em',
                            }}
                          >
                            {item.item_id || `LAB-${item.id}`}
                          </span>
                        </td>
                        <td className="align-middle">
                          <div className="d-flex align-items-center">
                            <div
                              className="d-flex align-items-center justify-content-center shadow-xs"
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)',
                                color: '#0284c7',
                                fontSize: '0.88rem',
                                flexShrink: 0,
                                marginRight: '10px',
                              }}
                            >
                              <i className="fas fa-vial"></i>
                            </div>
                            <div>
                              <div className="font-weight-bold text-gray-900" style={{ fontSize: '0.92rem', lineHeight: 1.35 }}>
                                {item.item}
                              </div>
                              <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                                Diagnostic Investigation
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="align-middle">
                          {item.is_general || (!item.sponsor_id && !item.plan_id) || item.sponsor_name === 'General / Self' ? (
                            <div className="d-inline-flex flex-column align-items-start">
                              <span
                                className="badge px-2.5 py-1 font-weight-bold shadow-xs"
                                style={{
                                  backgroundColor: '#ecfdf5',
                                  color: '#065f46',
                                  border: '1px solid #a7f3d0',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                }}
                              >
                                <i className="fas fa-star mr-1 text-warning"></i> General / Out-of-Pocket
                              </span>
                              <span className="badge badge-light border text-success mt-1" style={{ fontSize: '0.70rem' }}>
                                <i className="fas fa-wallet mr-1"></i> Pay from your purse
                              </span>
                            </div>
                          ) : item.sponsor_name && item.sponsor_name !== 'General / Self' ? (
                            <div className="d-inline-flex flex-column align-items-start">
                              <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                                {item.sponsor_code && (
                                  <span
                                    className="badge font-weight-bold px-2 py-0.5 shadow-xs"
                                    style={{
                                      backgroundColor: '#e0e7ff',
                                      color: '#3730a3',
                                      border: '1px solid #c7d2fe',
                                      borderRadius: '5px',
                                      fontSize: '0.74rem',
                                      letterSpacing: '0.02em',
                                    }}
                                  >
                                    <i className="fas fa-shield-alt mr-1" style={{ fontSize: '0.68rem', opacity: 0.85 }}></i>
                                    {item.sponsor_code}
                                  </span>
                                )}
                                <span className="font-weight-bold text-gray-800" style={{ fontSize: '0.88rem' }}>
                                  {item.sponsor_name}
                                </span>
                              </div>
                              <div className="text-muted small mt-0.5" style={{ fontSize: '0.72rem' }}>
                                Corporate Sponsor / HMO
                              </div>
                            </div>
                          ) : (
                            <span
                              className="badge px-2.5 py-1 font-weight-bold shadow-xs"
                              style={{
                                backgroundColor: '#f8fafc',
                                color: '#64748b',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                              }}
                            >
                              <i className="fas fa-globe mr-1 text-muted"></i> General / All Sponsors
                            </span>
                          )}
                        </td>
                        <td className="align-middle">
                          {item.is_general || (!item.sponsor_id && !item.plan_id) ? (
                            <span
                              className="badge px-2.5 py-1 font-weight-bold shadow-xs text-muted border bg-light"
                              style={{ borderRadius: '6px', fontSize: '0.80rem' }}
                            >
                              General Tariff (All Patients)
                            </span>
                          ) : (
                            <span
                              className="badge px-2.5 py-1 font-weight-bold shadow-xs d-inline-flex align-items-center"
                              style={{
                                backgroundColor: '#ede9fe',
                                color: '#6d28d9',
                                border: '1px solid #ddd6fe',
                                borderRadius: '6px',
                                fontSize: '0.82rem',
                                letterSpacing: '0.01em',
                              }}
                            >
                              <i className="fas fa-layer-group mr-1.5" style={{ fontSize: '0.75rem', opacity: 0.85 }}></i>
                              {item.plan_name || 'All Covered Plans'}
                            </span>
                          )}
                        </td>
                        <td className="align-middle">
                          <div className="d-inline-flex flex-column">
                            <span
                              className="font-weight-bold"
                              style={{
                                color: '#047857',
                                fontSize: '1.02rem',
                                letterSpacing: '-0.02em',
                                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                              }}
                            >
                              ₦{Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Official Tariff
                            </span>
                          </div>
                        </td>
                        <td className="text-right pr-4 align-middle">
                          <div className="btn-group btn-group-sm shadow-xs" role="group">
                            <button
                              type="button"
                              className="btn btn-outline-primary font-weight-bold px-2.5 py-1"
                              onClick={() => openModal('lab', 'edit', item)}
                              title="Edit Laboratory Tariff"
                              style={{ borderRadius: '6px 0 0 6px', fontSize: '0.80rem' }}
                            >
                              <i className="fas fa-edit mr-1"></i> Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger px-2.5 py-1"
                              onClick={() => confirmDelete('lab', item.id, item.item)}
                              title="Delete Laboratory Tariff"
                              style={{ borderRadius: '0 6px 6px 0', fontSize: '0.80rem' }}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLabCharges.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          {isLabFilterActive ? (
                            <div className="py-3">
                              <i className="fas fa-filter fa-3x text-gray-300 mb-3 d-block"></i>
                              <h6 className="font-weight-bold text-gray-700">No matching laboratory tariffs found</h6>
                              <p className="text-muted small mb-3">
                                No tariffs found matching the selected sponsor, coverage plan, or search query.
                              </p>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary mr-2"
                                onClick={() => {
                                  setLabSponsorFilter('');
                                  setLabPlanFilter('');
                                  setSearchTerm('');
                                }}
                              >
                                Clear All Filters
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => openModal('lab', 'create')}
                              >
                                <i className="fas fa-plus mr-1"></i> Add Lab Charge
                              </button>
                            </div>
                          ) : (
                            <div className="py-4">
                              <i className="fas fa-flask fa-3x text-gray-300 mb-3 d-block"></i>
                              <h6 className="font-weight-bold text-gray-800">No laboratory tariffs recorded</h6>
                              <p className="text-muted small mb-3" style={{ maxWidth: '420px', margin: '0 auto' }}>
                                Attach laboratory investigation charges to HMO sponsors and plans to enable automated pricing and plan-based lab test availability during doctor consultations.
                              </p>
                              <div className="d-flex justify-content-center flex-wrap" style={{ gap: '8px' }}>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => handleDownloadLabTemplate()}
                                >
                                  <i className="fas fa-download mr-1 text-info"></i> Download Template
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-info"
                                  onClick={() => openBulkUploadModal('lab')}
                                >
                                  <i className="fas fa-file-upload mr-1"></i> Bulk Upload
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  onClick={() => openModal('lab', 'create')}
                                >
                                  <i className="fas fa-plus mr-1"></i> Add Lab Charge
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1.3 RADIOLOGY CHARGES */}
      {activeSubmodule === 'service' && activeSubSubmodule === 'radiology_charges' && (() => {
        const filteredRadiologyCharges = radiologyCharges.filter((item) => {
          const term = searchTerm.toLowerCase();
          const itemName = (item.item || '').toLowerCase();
          const itemId = (item.item_id || '').toLowerCase();
          const spName = (item.sponsor_name || '').toLowerCase();
          const spCode = (item.sponsor_code || '').toLowerCase();
          const plName = (item.plan_name || '').toLowerCase();

          const matchesSearch =
            itemName.includes(term) ||
            itemId.includes(term) ||
            spName.includes(term) ||
            spCode.includes(term) ||
            plName.includes(term);

          const matchesSponsor = radiologySponsorFilter === 'general'
            ? (item.is_general || (!item.sponsor_id && !item.plan_id))
            : (radiologySponsorFilter
                ? String(item.sponsor_id || item.sponsor) === String(radiologySponsorFilter)
                : true);

          const matchesPlan = radiologyPlanFilter
            ? String(item.plan_id || item.plan) === String(radiologyPlanFilter)
            : true;

          return matchesSearch && matchesSponsor && matchesPlan;
        });

        const activeRadSponsorObj = sponsors.find((s) => String(s.id) === String(radiologySponsorFilter));
        const activeRadPlanObj = plans.find((p) => String(p.id) === String(radiologyPlanFilter));
        const isRadFilterActive = Boolean(radiologySponsorFilter || radiologyPlanFilter || searchTerm);

        return (
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            {/* Header with Title and Quick Actions */}
            <div className="card-header bg-white py-3 px-4 border-bottom">
              <div className="row align-items-center">
                <div className="col-12 col-xl-6 mb-3 mb-xl-0">
                  <div className="d-flex align-items-center">
                    <div
                      className="mr-3 d-flex align-items-center justify-content-center shadow-xs"
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)',
                        color: '#7c3aed',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                      }}
                    >
                      <i className="fas fa-x-ray"></i>
                    </div>
                    <div>
                      <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                        <h5 className="m-0 font-weight-bold text-gray-900" style={{ fontSize: '1.15rem' }}>
                          Radiology &amp; Scan Charges
                        </h5>
                        <span
                          className="badge font-weight-bold shadow-xs"
                          style={{
                            borderRadius: '6px',
                            backgroundColor: '#f5f3ff',
                            color: '#6d28d9',
                            border: '1px solid #ddd6fe',
                            padding: '4px 8px',
                            fontSize: '0.74rem',
                          }}
                        >
                          {filteredRadiologyCharges.length} {filteredRadiologyCharges.length === 1 ? 'Tariff' : 'Tariffs'}
                        </span>
                      </div>
                      <div className="text-muted small mt-1">
                        Manage X-Ray, Ultrasound, CT Scan, and MRI tariffs for HMO Sponsors, Plans, and General Out-of-Pocket.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-xl-6 text-xl-right">
                  <div className="d-inline-flex flex-wrap align-items-center" style={{ gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-sm d-inline-flex align-items-center shadow-xs"
                      style={{
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        height: '36px',
                        padding: '0 14px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={handleLoadGeneralRadiologyPrices}
                      disabled={loadingGeneralPrices}
                      title="Initialize baseline hospital radiology & scan charges for self-pay patients"
                    >
                      <i className={`fas ${loadingGeneralPrices ? 'fa-spinner fa-spin' : 'fa-magic'} mr-1.5 text-success`}></i>
                      Load General Prices
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm d-inline-flex align-items-center shadow-xs"
                      style={{
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        height: '36px',
                        padding: '0 14px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => handleDownloadRadiologyTemplate()}
                      disabled={bulkDownloadingTemplate}
                      title="Download sample CSV template for radiology tariffs"
                    >
                      <i className={`fas ${bulkDownloadingTemplate ? 'fa-spinner fa-spin' : 'fa-download'} mr-1.5 text-primary`}></i>
                      Download Template
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm d-inline-flex align-items-center shadow-xs"
                      style={{
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        height: '36px',
                        padding: '0 14px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#4338ca',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => openBulkUploadModal('radiology')}
                    >
                      <i className="fas fa-file-upload mr-1.5" style={{ color: '#6366f1' }}></i>
                      Bulk Upload Tariffs
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm font-weight-bold d-inline-flex align-items-center shadow-sm text-white"
                      style={{
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        height: '36px',
                        padding: '0 16px',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                        border: 'none',
                        boxShadow: '0 2px 4px rgba(124, 58, 237, 0.25)',
                      }}
                      onClick={() => openModal('radiology', 'create')}
                    >
                      <i className="fas fa-plus-circle mr-1.5"></i> Add Radiology Charge
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dedicated Filter & Search Control Toolbar */}
            <div className="bg-light py-3 px-4 border-bottom">
              <div className="row g-2 align-items-center">
                {/* Search Box */}
                <div className="col-12 col-md-5 col-lg-4 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0 text-muted">
                        <i className="fas fa-search"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0 pl-0"
                      placeholder="Search scans, x-rays, or item ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    />
                    {searchTerm && (
                      <div className="input-group-append">
                        <button
                          className="btn btn-outline-secondary bg-white border"
                          type="button"
                          onClick={() => setSearchTerm('')}
                          title="Clear search"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sponsor Selector */}
                <div className="col-12 col-md-3 col-lg-3 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white text-muted" title="Sponsor / HMO">
                        <i className="fas fa-shield-alt text-primary"></i>
                      </span>
                    </div>
                    <select
                      className="form-control custom-select"
                      value={radiologySponsorFilter}
                      onChange={(e) => {
                        setRadiologySponsorFilter(e.target.value);
                        setRadiologyPlanFilter('');
                      }}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    >
                      <option value="">All Sponsors / HMOs ({sponsors.length})</option>
                      <option value="general">⭐ General / Out-of-Pocket (Self Pay - No HMO)</option>
                      {sponsors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Coverage Plan Selector */}
                <div className="col-12 col-md-3 col-lg-3 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white text-muted" title="Coverage Plan">
                        <i className="fas fa-layer-group text-info"></i>
                      </span>
                    </div>
                    <select
                      className="form-control custom-select"
                      value={radiologyPlanFilter}
                      onChange={(e) => setRadiologyPlanFilter(e.target.value)}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    >
                      <option value="">
                        {radiologySponsorFilter
                          ? `All Plans for ${activeRadSponsorObj?.code || 'Sponsor'}`
                          : `All Coverage Plans (${plans.length})`}
                      </option>
                      {(radiologySponsorFilter
                        ? plans.filter((p) => String(p.sponsor) === String(radiologySponsorFilter))
                        : plans
                      ).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.plan} {p.code ? `(${p.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Reset Filters / Filter State */}
                <div className="col-12 col-md-auto ml-md-auto d-flex align-items-center">
                  {isRadFilterActive ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger font-weight-bold shadow-sm d-inline-flex align-items-center px-2.5 py-1 bg-white"
                      style={{ borderRadius: '6px', fontSize: '0.80rem' }}
                      onClick={() => {
                        setRadiologySponsorFilter('');
                        setRadiologyPlanFilter('');
                        setSearchTerm('');
                      }}
                    >
                      <i className="fas fa-undo-alt mr-1"></i> Reset Filters
                    </button>
                  ) : (
                    <span className="text-muted small">
                      <i className="fas fa-filter text-muted mr-1"></i> All tariffs
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Summary Ribbon */}
            {isRadFilterActive && (
              <div className="bg-light py-2 px-4 border-bottom d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                <span className="small text-muted font-weight-bold mr-1">Active Filters:</span>
                {radiologySponsorFilter && (
                  radiologySponsorFilter === 'general' ? (
                    <span className="badge badge-warning text-dark px-2.5 py-1 font-weight-bold shadow-sm d-inline-flex align-items-center" style={{ borderRadius: '12px' }}>
                      <i className="fas fa-star text-warning mr-1"></i>
                      General / Out-of-Pocket (Self Pay)
                      <i
                        className="fas fa-times ml-1.5 cursor-pointer"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setRadiologySponsorFilter('');
                          setRadiologyPlanFilter('');
                        }}
                      ></i>
                    </span>
                  ) : (
                    <span className="badge badge-primary px-2.5 py-1 font-weight-normal shadow-sm d-inline-flex align-items-center" style={{ borderRadius: '12px' }}>
                      <i className="fas fa-shield-alt mr-1"></i>
                      Sponsor: {activeRadSponsorObj?.name || 'Selected'}
                      <i
                        className="fas fa-times ml-1.5 cursor-pointer"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setRadiologySponsorFilter('');
                          setRadiologyPlanFilter('');
                        }}
                      ></i>
                    </span>
                  )
                )}
                {radiologyPlanFilter && (
                  <span className="badge badge-info px-2.5 py-1 font-weight-normal shadow-sm d-inline-flex align-items-center" style={{ borderRadius: '12px' }}>
                    <i className="fas fa-layer-group mr-1"></i>
                    Plan: {activeRadPlanObj?.plan || 'Selected'}
                    <i
                      className="fas fa-times ml-1.5 cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setRadiologyPlanFilter('')}
                    ></i>
                  </span>
                )}
                {searchTerm && (
                  <span className="badge badge-secondary px-2.5 py-1 font-weight-normal shadow-sm d-inline-flex align-items-center" style={{ borderRadius: '12px' }}>
                    <i className="fas fa-search mr-1"></i>
                    Search: "{searchTerm}"
                    <i
                      className="fas fa-times ml-1.5 cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSearchTerm('')}
                    ></i>
                  </span>
                )}
              </div>
            )}

            {/* Table Content */}
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ width: '130px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3 pl-4">Item ID</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Scan / Radiology Procedure</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Sponsor / HMO Company</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Coverage Plan</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Tariff Fee Rate</th>
                      <th style={{ width: '150px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRadiologyCharges.map((item) => (
                      <tr key={item.id} style={{ transition: 'background-color 0.15s ease' }}>
                        <td className="pl-4 align-middle">
                          <span
                            className="badge font-weight-bold px-2 py-1 shadow-xs"
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                              fontSize: '0.80rem',
                              letterSpacing: '0.03em',
                            }}
                          >
                            {item.item_id || `RAD-${item.id}`}
                          </span>
                        </td>
                        <td className="align-middle">
                          <div className="d-flex align-items-center">
                            <div
                              className="d-flex align-items-center justify-content-center shadow-xs"
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)',
                                color: '#6366f1',
                                fontSize: '0.88rem',
                                flexShrink: 0,
                                marginRight: '10px',
                              }}
                            >
                              <i className="fas fa-x-ray"></i>
                            </div>
                            <div>
                              <div className="font-weight-bold text-gray-900" style={{ fontSize: '0.92rem', lineHeight: 1.35 }}>
                                {item.item}
                              </div>
                              <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                                Diagnostic Imaging Procedure
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="align-middle">
                          {item.is_general || (!item.sponsor_id && !item.plan_id) || item.sponsor_name === 'General / Self' ? (
                            <div className="d-inline-flex flex-column align-items-start">
                              <span
                                className="badge px-2.5 py-1 font-weight-bold shadow-xs"
                                style={{
                                  backgroundColor: '#ecfdf5',
                                  color: '#065f46',
                                  border: '1px solid #a7f3d0',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                }}
                              >
                                <i className="fas fa-star mr-1 text-warning"></i> General / Out-of-Pocket
                              </span>
                              <span className="badge badge-light border text-success mt-1" style={{ fontSize: '0.70rem' }}>
                                <i className="fas fa-wallet mr-1"></i> Pay from your purse
                              </span>
                            </div>
                          ) : item.sponsor_name && item.sponsor_name !== 'General / Self' ? (
                            <div className="d-inline-flex flex-column align-items-start">
                              <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                                {item.sponsor_code && (
                                  <span
                                    className="badge font-weight-bold px-2 py-0.5 shadow-xs"
                                    style={{
                                      backgroundColor: '#e0e7ff',
                                      color: '#3730a3',
                                      border: '1px solid #c7d2fe',
                                      borderRadius: '5px',
                                      fontSize: '0.74rem',
                                      letterSpacing: '0.02em',
                                    }}
                                  >
                                    <i className="fas fa-shield-alt mr-1" style={{ fontSize: '0.68rem', opacity: 0.85 }}></i>
                                    {item.sponsor_code}
                                  </span>
                                )}
                                <span className="font-weight-bold text-gray-800" style={{ fontSize: '0.88rem' }}>
                                  {item.sponsor_name}
                                </span>
                              </div>
                              <div className="text-muted small mt-0.5" style={{ fontSize: '0.72rem' }}>
                                Corporate Sponsor / HMO
                              </div>
                            </div>
                          ) : (
                            <span
                              className="badge px-2.5 py-1 font-weight-bold shadow-xs"
                              style={{
                                backgroundColor: '#f8fafc',
                                color: '#64748b',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                              }}
                            >
                              <i className="fas fa-globe mr-1 text-muted"></i> General / All Sponsors
                            </span>
                          )}
                        </td>
                        <td className="align-middle">
                          {item.is_general || (!item.sponsor_id && !item.plan_id) ? (
                            <span
                              className="badge px-2.5 py-1 font-weight-bold shadow-xs d-inline-flex align-items-center"
                              style={{
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                borderRadius: '6px',
                                fontSize: '0.80rem',
                              }}
                            >
                              <i className="fas fa-wallet mr-1.5" style={{ fontSize: '0.75rem' }}></i>
                              General Price (Pay from purse)
                            </span>
                          ) : (
                            <span
                              className="badge px-2.5 py-1 font-weight-bold shadow-xs d-inline-flex align-items-center"
                              style={{
                                backgroundColor: '#ede9fe',
                                color: '#6d28d9',
                                border: '1px solid #ddd6fe',
                                borderRadius: '6px',
                                fontSize: '0.82rem',
                                letterSpacing: '0.01em',
                              }}
                            >
                              <i className="fas fa-layer-group mr-1.5" style={{ fontSize: '0.75rem', opacity: 0.85 }}></i>
                              {item.plan_name || 'All Covered Plans'}
                            </span>
                          )}
                        </td>
                        <td className="align-middle">
                          <div className="d-inline-flex flex-column">
                            <span
                              className="font-weight-bold"
                              style={{
                                color: '#047857',
                                fontSize: '1.02rem',
                                letterSpacing: '-0.02em',
                                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                              }}
                            >
                              ₦{Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Official Tariff
                            </span>
                          </div>
                        </td>
                        <td className="text-right pr-4 align-middle">
                          <div className="btn-group btn-group-sm shadow-xs" role="group">
                            <button
                              type="button"
                              className="btn btn-outline-primary font-weight-bold px-2.5 py-1"
                              onClick={() => openModal('radiology', 'edit', item)}
                              title="Edit Radiology Tariff"
                              style={{ borderRadius: '6px 0 0 6px', fontSize: '0.80rem' }}
                            >
                              <i className="fas fa-edit mr-1"></i> Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger px-2.5 py-1"
                              onClick={() => confirmDelete('radiology', item.id, item.item)}
                              title="Delete Radiology Tariff"
                              style={{ borderRadius: '0 6px 6px 0', fontSize: '0.80rem' }}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRadiologyCharges.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          {isRadFilterActive ? (
                            <div className="py-3">
                              <i className="fas fa-filter fa-3x text-gray-300 mb-3 d-block"></i>
                              <h6 className="font-weight-bold text-gray-700">No matching radiology tariffs found</h6>
                              <p className="text-muted small mb-3">
                                No tariffs found matching the selected sponsor, coverage plan, or search query.
                              </p>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary mr-2"
                                onClick={() => {
                                  setRadiologySponsorFilter('');
                                  setRadiologyPlanFilter('');
                                  setSearchTerm('');
                                }}
                              >
                                Clear All Filters
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => openModal('radiology', 'create')}
                              >
                                <i className="fas fa-plus mr-1"></i> Add Radiology Charge
                              </button>
                            </div>
                          ) : (
                            <div className="py-4">
                              <i className="fas fa-x-ray fa-3x text-gray-300 mb-3 d-block"></i>
                              <h6 className="font-weight-bold text-gray-800">No radiology tariffs recorded</h6>
                              <p className="text-muted small mb-3" style={{ maxWidth: '420px', margin: '0 auto' }}>
                                Attach radiology and imaging scan charges to HMO sponsors and plans to enable automated pricing and plan-based scan availability during doctor consultations.
                              </p>
                              <div className="d-flex justify-content-center flex-wrap" style={{ gap: '8px' }}>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => handleDownloadRadiologyTemplate()}
                                >
                                  <i className="fas fa-download mr-1 text-primary"></i> Download Template
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => openBulkUploadModal('radiology')}
                                >
                                  <i className="fas fa-file-upload mr-1"></i> Bulk Upload
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  onClick={() => openModal('radiology', 'create')}
                                >
                                  <i className="fas fa-plus mr-1"></i> Add Radiology Charge
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1.4 ADMISSION FEES (WARDS) */}
      {activeSubmodule === 'service' && activeSubSubmodule === 'admission_fees' && (() => {
        const filteredAdmissionFees = admissionFees.filter((w) =>
          w.ward_name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            {/* Header with Title and Action Button */}
            <div className="card-header bg-white py-3 px-4 border-bottom">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                <div className="d-flex align-items-center mb-2 mb-md-0">
                  <div
                    className="mr-3 d-flex align-items-center justify-content-center shadow-xs"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                      color: '#d97706',
                      fontSize: '1.25rem',
                      flexShrink: 0,
                    }}
                  >
                    <i className="fas fa-bed"></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                      <h5 className="m-0 font-weight-bold text-gray-800" style={{ fontSize: '1.1rem' }}>
                        Ward Admission Fees &amp; Bed Charges
                      </h5>
                      <span className="badge badge-light border text-warning font-weight-bold px-2 py-1 shadow-sm" style={{ borderRadius: '6px' }}>
                        {filteredAdmissionFees.length} {filteredAdmissionFees.length === 1 ? 'Ward' : 'Wards'}
                      </span>
                    </div>
                    <div className="text-muted small mt-1">
                      Manage inpatient admission rates, daily bed occupancy fees, and ward accommodation charges.
                    </div>
                  </div>
                </div>

                {/* Header Action Button */}
                <div className="mt-2 mt-md-0 flex-shrink-0">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary font-weight-bold shadow-sm d-inline-flex align-items-center px-3 py-2"
                    style={{ borderRadius: '8px', fontSize: '0.85rem' }}
                    onClick={() => openModal('ward', 'create')}
                  >
                    <i className="fas fa-plus-circle mr-2"></i> Add Ward Fee
                  </button>
                </div>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-light py-3 px-4 border-bottom">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-6 col-lg-5 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0 text-muted">
                        <i className="fas fa-search"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0 pl-0"
                      placeholder="Search hospital wards..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    />
                    {searchTerm && (
                      <div className="input-group-append">
                        <button
                          className="btn btn-outline-secondary bg-white border"
                          type="button"
                          onClick={() => setSearchTerm('')}
                          title="Clear search"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-auto ml-md-auto d-flex align-items-center">
                  {searchTerm ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger font-weight-bold shadow-sm d-inline-flex align-items-center px-2.5 py-1 bg-white"
                      style={{ borderRadius: '6px', fontSize: '0.80rem' }}
                      onClick={() => setSearchTerm('')}
                    >
                      <i className="fas fa-undo-alt mr-1"></i> Reset Search
                    </button>
                  ) : (
                    <span className="text-muted small">
                      <i className="fas fa-bed text-warning mr-1"></i> Hospital ward &amp; inpatient rates
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ width: '80px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3 pl-4">#</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Hospital Ward &amp; Accommodation</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Daily Admission Rate</th>
                      <th style={{ width: '160px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Status</th>
                      <th style={{ width: '150px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdmissionFees.map((item, idx) => (
                      <tr key={item.id} style={{ transition: 'background-color 0.15s ease' }}>
                        <td className="pl-4 align-middle">
                          <span
                            className="badge font-weight-bold px-2 py-1 shadow-xs"
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              fontSize: '0.80rem',
                            }}
                          >
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="align-middle">
                          <div className="d-flex align-items-center">
                            <div
                              className="d-flex align-items-center justify-content-center shadow-xs"
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                                color: '#d97706',
                                fontSize: '0.90rem',
                                flexShrink: 0,
                                marginRight: '12px',
                              }}
                            >
                              <i className="fas fa-bed"></i>
                            </div>
                            <div>
                              <div className="font-weight-bold text-gray-900" style={{ fontSize: '0.94rem', lineHeight: 1.35 }}>
                                {item.ward_name}
                              </div>
                              <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                                Inpatient Bed Tariff
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="d-inline-flex flex-column">
                            <span
                              className="font-weight-bold"
                              style={{
                                color: '#047857',
                                fontSize: '1.05rem',
                                letterSpacing: '-0.02em',
                                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                              }}
                            >
                              ₦{Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Per Day Occupancy
                            </span>
                          </div>
                        </td>
                        <td className="align-middle">
                          <span
                            className="badge px-2.5 py-1 font-weight-bold shadow-xs d-inline-flex align-items-center"
                            style={{
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              letterSpacing: '0.02em',
                            }}
                          >
                            <i className="fas fa-check-circle mr-1.5" style={{ fontSize: '0.72rem' }}></i> Available
                          </span>
                        </td>
                        <td className="text-right pr-4 align-middle">
                          <div className="btn-group btn-group-sm shadow-xs" role="group">
                            <button
                              type="button"
                              className="btn btn-outline-primary font-weight-bold px-2.5 py-1"
                              onClick={() => openModal('ward', 'edit', item)}
                              title="Edit Ward Fee"
                              style={{ borderRadius: '6px 0 0 6px', fontSize: '0.80rem' }}
                            >
                              <i className="fas fa-edit mr-1"></i> Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger px-2.5 py-1"
                              onClick={() => confirmDelete('ward', item.id, item.ward_name)}
                              title="Delete Ward Fee"
                              style={{ borderRadius: '0 6px 6px 0', fontSize: '0.80rem' }}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAdmissionFees.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-5">
                          {searchTerm ? (
                            <div className="py-3">
                              <i className="fas fa-search fa-3x text-gray-300 mb-3 d-block"></i>
                              <h6 className="font-weight-bold text-gray-700">No matching wards found</h6>
                              <p className="text-muted small mb-3">
                                No hospital ward admission charges match "{searchTerm}".
                              </p>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary mr-2"
                                onClick={() => setSearchTerm('')}
                              >
                                Clear Search
                              </button>
                            </div>
                          ) : (
                            <div className="py-4">
                              <i className="fas fa-bed fa-3x text-gray-300 mb-3 d-block"></i>
                              <h6 className="font-weight-bold text-gray-800">No ward admission charges configured</h6>
                              <p className="text-muted small mb-3" style={{ maxWidth: '420px', margin: '0 auto' }}>
                                Add hospital wards and daily bed tariffs to charge patients admitted for inpatient care.
                              </p>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => openModal('ward', 'create')}
                              >
                                <i className="fas fa-plus mr-1"></i> Add Ward Fee
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1.5 OTHER SERVICES FEES */}
      {activeSubmodule === 'service' && activeSubSubmodule === 'other_services' && (() => {
        const filteredOtherServices = otherServices.filter((s) => {
          const term = searchTerm.toLowerCase();
          return (
            s.service.toLowerCase().includes(term) ||
            (s.service_id && s.service_id.toLowerCase().includes(term)) ||
            (s.plan_name && s.plan_name.toLowerCase().includes(term))
          );
        });

        return (
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            {/* Header with Title and Action Button */}
            <div className="card-header bg-white py-3 px-4 border-bottom">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                <div className="d-flex align-items-center mb-2 mb-md-0">
                  <div
                    className="mr-3 d-flex align-items-center justify-content-center shadow-xs"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
                      color: '#0d9488',
                      fontSize: '1.25rem',
                      flexShrink: 0,
                    }}
                  >
                    <i className="fas fa-hand-holding-medical"></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                      <h5 className="m-0 font-weight-bold text-gray-800" style={{ fontSize: '1.1rem' }}>
                        Miscellaneous Medical Services &amp; Procedures
                      </h5>
                      <span className="badge badge-light border text-teal font-weight-bold px-2 py-1 shadow-sm" style={{ borderRadius: '6px', color: '#0d9488' }}>
                        {filteredOtherServices.length} {filteredOtherServices.length === 1 ? 'Service' : 'Services'}
                      </span>
                    </div>
                    <div className="text-muted small mt-1">
                      Manage clinical service fees, wound dressings, minor procedures, nursing charges, and other care services.
                    </div>
                  </div>
                </div>

                {/* Header Action Button */}
                <div className="mt-2 mt-md-0 flex-shrink-0">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary font-weight-bold shadow-sm d-inline-flex align-items-center px-3 py-2"
                    style={{ borderRadius: '8px', fontSize: '0.85rem' }}
                    onClick={() => openModal('other', 'create')}
                  >
                    <i className="fas fa-plus-circle mr-2"></i> Add Service Fee
                  </button>
                </div>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-light py-3 px-4 border-bottom">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-6 col-lg-5 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0 text-muted">
                        <i className="fas fa-search"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0 pl-0"
                      placeholder="Search services or service ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    />
                    {searchTerm && (
                      <div className="input-group-append">
                        <button
                          className="btn btn-outline-secondary bg-white border"
                          type="button"
                          onClick={() => setSearchTerm('')}
                          title="Clear search"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-auto ml-md-auto d-flex align-items-center">
                  {searchTerm ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger font-weight-bold shadow-sm d-inline-flex align-items-center px-2.5 py-1 bg-white"
                      style={{ borderRadius: '6px', fontSize: '0.80rem' }}
                      onClick={() => setSearchTerm('')}
                    >
                      <i className="fas fa-undo-alt mr-1"></i> Reset Search
                    </button>
                  ) : (
                    <span className="text-muted small">
                      <i className="fas fa-briefcase-medical text-teal mr-1" style={{ color: '#0d9488' }}></i> Clinical procedures and hospital services
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ width: '130px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3 pl-4">Service ID</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Clinical Service / Procedure</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Applicable Plan</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Rate / Fee</th>
                      <th style={{ width: '150px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOtherServices.map((item) => (
                      <tr key={item.id} style={{ transition: 'background-color 0.15s ease' }}>
                        <td className="pl-4 align-middle">
                          <span
                            className="badge font-weight-bold px-2 py-1 shadow-xs"
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              fontSize: '0.80rem',
                            }}
                          >
                            {item.service_id || `SRV-${item.id}`}
                          </span>
                        </td>
                        <td className="align-middle">
                          <div className="d-flex align-items-center">
                            <div
                              className="d-flex align-items-center justify-content-center shadow-xs"
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
                                color: '#0d9488',
                                fontSize: '0.90rem',
                                flexShrink: 0,
                                marginRight: '12px',
                              }}
                            >
                              <i className="fas fa-hand-holding-medical"></i>
                            </div>
                            <div>
                              <div className="font-weight-bold text-gray-900" style={{ fontSize: '0.94rem', lineHeight: 1.35 }}>
                                {item.service}
                              </div>
                              <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                                Clinical Procedure &amp; Treatment
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="align-middle">
                          <span
                            className="badge px-2.5 py-1 font-weight-bold shadow-xs d-inline-flex align-items-center"
                            style={{
                              backgroundColor: '#ede9fe',
                              color: '#6d28d9',
                              border: '1px solid #ddd6fe',
                              borderRadius: '6px',
                              fontSize: '0.80rem',
                            }}
                          >
                            <i className="fas fa-layer-group mr-1.5" style={{ fontSize: '0.72rem' }}></i>
                            {item.plan_name || 'All Plans'}
                          </span>
                        </td>
                        <td className="align-middle">
                          <div className="d-inline-flex flex-column">
                            <span
                              className="font-weight-bold"
                              style={{
                                color: '#047857',
                                fontSize: '1.05rem',
                                letterSpacing: '-0.02em',
                                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                              }}
                            >
                              ₦{Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Service Tariff
                            </span>
                          </div>
                        </td>
                        <td className="text-right pr-4 align-middle">
                          <div className="btn-group btn-group-sm shadow-xs" role="group">
                            <button
                              type="button"
                              className="btn btn-outline-primary font-weight-bold px-2.5 py-1"
                              onClick={() => openModal('other', 'edit', item)}
                              title="Edit Service Fee"
                              style={{ borderRadius: '6px 0 0 6px', fontSize: '0.80rem' }}
                            >
                              <i className="fas fa-edit mr-1"></i> Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger px-2.5 py-1"
                              onClick={() => confirmDelete('other', item.id, item.service)}
                              title="Delete Service Fee"
                              style={{ borderRadius: '0 6px 6px 0', fontSize: '0.80rem' }}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredOtherServices.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-5">
                          {searchTerm ? (
                            <div className="py-3">
                              <i className="fas fa-search fa-3x text-gray-300 mb-3 d-block"></i>
                              <h6 className="font-weight-bold text-gray-700">No matching clinical services found</h6>
                              <p className="text-muted small mb-3">
                                No hospital service fees match "{searchTerm}".
                              </p>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary mr-2"
                                onClick={() => setSearchTerm('')}
                              >
                                Clear Search
                              </button>
                            </div>
                          ) : (
                            <div className="py-4">
                              <i className="fas fa-hand-holding-medical fa-3x text-gray-300 mb-3 d-block"></i>
                              <h6 className="font-weight-bold text-gray-800">No service charges configured</h6>
                              <p className="text-muted small mb-3" style={{ maxWidth: '420px', margin: '0 auto' }}>
                                Add clinical procedure fees, wound dressings, and auxiliary treatment tariffs.
                              </p>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => openModal('other', 'create')}
                              >
                                <i className="fas fa-plus mr-1"></i> Add Service Fee
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* 2. PRODUCT TARIFFS SUBMODULE                            */}
      {/* ======================================================== */}

      {/* 2.1 MEDICATION FEES */}
      {activeSubmodule === 'product' && activeSubSubmodule === 'medication_fees' && (() => {
        const filteredMedicationFees = medicationFees.filter((m) => {
          const matchesSearch =
            !searchTerm ||
            m.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.product_id && m.product_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (m.sku && m.sku.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesSponsor = !medicationSponsorFilter
            ? true
            : medicationSponsorFilter === 'general'
              ? (m.is_general || !m.sponsor_id)
              : String(m.sponsor_id) === String(medicationSponsorFilter);
          const matchesPlan = !medicationPlanFilter
            ? true
            : medicationPlanFilter === 'general'
              ? (!m.plan_id || m.is_general)
              : String(m.plan_id) === String(medicationPlanFilter);
          return matchesSearch && matchesSponsor && matchesPlan;
        });

        const isMedicationFilterActive = Boolean(medicationSponsorFilter || medicationPlanFilter || searchTerm);
        const activeSponsorObj = sponsors.find((s) => String(s.id) === String(medicationSponsorFilter));
        const activePlanObj = plans.find((p) => String(p.id) === String(medicationPlanFilter));

        return (
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            {/* Main Card Header */}
            <div className="card-header bg-white py-3 px-4 border-bottom">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                <div className="d-flex align-items-center">
                  <div
                    className="mr-3 d-flex align-items-center justify-content-center shadow-sm"
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      color: '#2563eb',
                      fontSize: '1.25rem',
                      flexShrink: 0,
                    }}
                  >
                    <i className="fas fa-pills"></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                      <h5 className="m-0 font-weight-bold text-gray-800" style={{ fontSize: '1.1rem' }}>
                        Pharmacy Medication Price Tariffs
                      </h5>
                      <span className="badge badge-light border text-primary font-weight-bold px-2 py-1 shadow-sm" style={{ borderRadius: '6px' }}>
                        {filteredMedicationFees.length} {filteredMedicationFees.length === 1 ? 'Tariff' : 'Tariffs'}
                      </span>
                    </div>
                    <div className="text-muted small mt-1">
                      Manage formulary medication rates attached to HMO Sponsors and Coverage Plans for clinical prescribing.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dedicated Filter & Search Control Toolbar */}
            <div className="bg-light py-3 px-4 border-bottom">
              <div className="row g-2 align-items-center">
                {/* Search Box */}
                <div className="col-12 col-md-5 col-lg-4 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0 text-muted">
                        <i className="fas fa-search"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0 pl-0"
                      placeholder="Search medication, strength, or SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    />
                    {searchTerm && (
                      <div className="input-group-append">
                        <button
                          className="btn btn-outline-secondary bg-white border"
                          type="button"
                          onClick={() => setSearchTerm('')}
                          title="Clear search"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sponsor Selector */}
                <div className="col-12 col-md-3 col-lg-3 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white text-muted" title="Sponsor / HMO">
                        <i className="fas fa-shield-alt text-primary"></i>
                      </span>
                    </div>
                    <select
                      className="form-control custom-select"
                      value={medicationSponsorFilter}
                      onChange={(e) => {
                        setMedicationSponsorFilter(e.target.value);
                        setMedicationPlanFilter('');
                      }}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    >
                      <option value="">All Sponsors / HMOs ({sponsors.length})</option>
                      <option value="general" className="font-weight-bold text-success">
                        ⭐ General / Out-of-Pocket (Self Pay)
                      </option>
                      {sponsors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Coverage Plan Selector */}
                <div className="col-12 col-md-3 col-lg-3 mb-2 mb-md-0">
                  <div className="input-group input-group-sm">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white text-muted" title="Coverage Plan">
                        <i className="fas fa-layer-group text-info"></i>
                      </span>
                    </div>
                    <select
                      className="form-control custom-select"
                      value={medicationPlanFilter}
                      onChange={(e) => setMedicationPlanFilter(e.target.value)}
                      style={{ borderRadius: '0 6px 6px 0' }}
                    >
                      <option value="">
                        {medicationSponsorFilter
                          ? `All Plans for ${activeSponsorObj?.code || 'Sponsor'}`
                          : `All Coverage Plans (${plans.length})`}
                      </option>
                      {(medicationSponsorFilter
                        ? plans.filter((p) => String(p.sponsor) === String(medicationSponsorFilter))
                        : plans
                      ).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.plan} {p.code ? `(${p.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Reset Filters / Filter State */}
                <div className="col-12 col-md-auto ml-md-auto d-flex align-items-center">
                  {isMedicationFilterActive ? (
                    <button
                      className="btn btn-sm btn-outline-danger shadow-sm d-inline-flex align-items-center"
                      style={{ borderRadius: '6px' }}
                      onClick={() => {
                        setMedicationSponsorFilter('');
                        setMedicationPlanFilter('');
                        setSearchTerm('');
                      }}
                      title="Reset all filters"
                    >
                      <i className="fas fa-undo mr-1"></i> Reset
                    </button>
                  ) : (
                    <span className="text-muted small">
                      <i className="fas fa-filter text-muted mr-1"></i> All tariffs
                    </span>
                  )}
                </div>
              </div>

              {/* Active Filter Chips */}
              {isMedicationFilterActive && (
                <div className="d-flex align-items-center flex-wrap mt-2 pt-2 border-top" style={{ gap: '6px' }}>
                  <span className="small text-muted font-weight-bold mr-1">Filtered by:</span>
                  {medicationSponsorFilter && (
                    <span className="badge badge-primary py-1 px-2 font-weight-normal shadow-sm d-inline-flex align-items-center" style={{ borderRadius: '12px' }}>
                      <i className="fas fa-shield-alt mr-1"></i> {activeSponsorObj?.name || 'Sponsor'}
                      <button
                        type="button"
                        className="close ml-2 text-white"
                        style={{ fontSize: '0.9rem', lineHeight: '1' }}
                        onClick={() => {
                          setMedicationSponsorFilter('');
                          setMedicationPlanFilter('');
                        }}
                      >
                        &times;
                      </button>
                    </span>
                  )}
                  {medicationPlanFilter && (
                    <span className="badge badge-info py-1 px-2 font-weight-normal shadow-sm d-inline-flex align-items-center" style={{ borderRadius: '12px' }}>
                      <i className="fas fa-layer-group mr-1"></i> {activePlanObj?.plan || 'Plan'}
                      <button
                        type="button"
                        className="close ml-2 text-white"
                        style={{ fontSize: '0.9rem', lineHeight: '1' }}
                        onClick={() => setMedicationPlanFilter('')}
                      >
                        &times;
                      </button>
                    </span>
                  )}
                  {searchTerm && (
                    <span className="badge badge-secondary py-1 px-2 font-weight-normal shadow-sm d-inline-flex align-items-center" style={{ borderRadius: '12px' }}>
                      <i className="fas fa-search mr-1"></i> "{searchTerm}"
                      <button
                        type="button"
                        className="close ml-2 text-white"
                        style={{ fontSize: '0.9rem', lineHeight: '1' }}
                        onClick={() => setSearchTerm('')}
                      >
                        &times;
                      </button>
                    </span>
                  )}
                  <span className="small text-muted ml-auto font-weight-bold">
                    Showing {filteredMedicationFees.length} of {medicationFees.length} total
                  </span>
                </div>
              )}
            </div>

            {/* Table Container */}
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover table-striped mb-0 align-middle">
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ width: '130px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3 pl-4">Product SKU</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Medication Name &amp; Strength</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Sponsor / HMO Company</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Coverage Plan</th>
                      <th style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3">Prescription Tariff Rate</th>
                      <th style={{ width: '140px', fontSize: '0.78rem', letterSpacing: '0.04em' }} className="text-uppercase text-secondary font-weight-bold py-3 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMedicationFees.map((item) => (
                      <tr key={item.id} style={{ transition: 'background-color 0.15s ease' }}>
                        <td className="pl-4">
                          <span className="badge badge-light border text-monospace text-dark font-weight-bold px-2 py-1">
                            {item.product_id || item.sku || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <i className="fas fa-tablets text-primary mr-2" style={{ opacity: 0.6 }}></i>
                            <span className="font-weight-bold text-dark" style={{ fontSize: '0.92rem' }}>
                              {item.product_name}
                            </span>
                          </div>
                        </td>
                        <td>
                          {item.is_general || !item.sponsor_id ? (
                            <span
                              className="badge px-2 py-1 font-weight-bold shadow-sm"
                              style={{
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                borderRadius: '6px',
                              }}
                            >
                              <i className="fas fa-wallet mr-1"></i>
                              General / Out-of-Pocket
                            </span>
                          ) : (
                            <span
                              className="badge px-2 py-1 font-weight-bold shadow-sm"
                              style={{
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                borderRadius: '6px',
                              }}
                            >
                              <i className="fas fa-shield-alt mr-1"></i>
                              {item.sponsor_name || 'General / Self'}
                            </span>
                          )}
                        </td>
                        <td>
                          {item.is_general || !item.plan_id ? (
                            <span
                              className="badge px-2 py-1 font-weight-bold shadow-sm"
                              style={{
                                backgroundColor: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                borderRadius: '6px',
                              }}
                            >
                              <i className="fas fa-tag mr-1"></i>
                              Pay from your purse
                            </span>
                          ) : (
                            <span
                              className="badge px-2 py-1 font-weight-bold shadow-sm"
                              style={{
                                backgroundColor: '#ede9fe',
                                color: '#6d28d9',
                                border: '1px solid #ddd6fe',
                                borderRadius: '6px',
                              }}
                            >
                              <i className="fas fa-file-contract mr-1"></i>
                              {item.plan_name || 'All Plans'}
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className="font-weight-bold text-success"
                            style={{
                              fontSize: '1rem',
                              letterSpacing: '-0.02em',
                            }}
                          >
                            ₦{Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="text-right pr-4">
                          <div className="btn-group btn-group-sm" role="group">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => openModal('medication', 'edit', item)}
                              title="Edit Medication Tariff"
                              style={{ borderRadius: '6px 0 0 6px' }}
                            >
                              <i className="fas fa-edit mr-1"></i> Edit
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDelete('medication', item.id, item.product_name)}
                              title="Delete Tariff"
                              style={{ borderRadius: '0 6px 6px 0' }}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredMedicationFees.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          <div className="py-4">
                            <div
                              className="mx-auto d-flex align-items-center justify-content-center mb-3"
                              style={{
                                width: '72px',
                                height: '72px',
                                borderRadius: '50%',
                                backgroundColor: '#eff6ff',
                                color: '#3b82f6',
                                fontSize: '2rem',
                              }}
                            >
                              <i className="fas fa-pills"></i>
                            </div>
                            {isMedicationFilterActive ? (
                              <>
                                <h6 className="font-weight-bold text-gray-800 mb-1">
                                  No Medication Tariffs Match Your Filter
                                </h6>
                                <p className="text-muted small mb-3" style={{ maxWidth: '420px', margin: '0 auto' }}>
                                  No tariffs found matching the selected sponsor, coverage plan, or search query.
                                </p>
                                <button
                                  className="btn btn-sm btn-outline-primary font-weight-bold px-3 py-1 shadow-sm"
                                  onClick={() => {
                                    setMedicationSponsorFilter('');
                                    setMedicationPlanFilter('');
                                    setSearchTerm('');
                                  }}
                                >
                                  <i className="fas fa-undo mr-1"></i> Clear Filters
                                </button>
                              </>
                            ) : (
                              <>
                                <h6 className="font-weight-bold text-gray-800 mb-1">
                                  No Medication Price Tariffs Recorded
                                </h6>
                                <p className="text-muted small mb-3" style={{ maxWidth: '460px', margin: '0 auto' }}>
                                  Attach medication price tariffs to HMO sponsors and plans to enable automated pricing and plan-based drug availability during doctor consultations.
                                </p>
                                <div className="d-flex align-items-center justify-content-center flex-wrap" style={{ gap: '8px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary font-weight-bold px-3 py-2 shadow-sm"
                                    onClick={() => openModal('medication', 'create')}
                                  >
                                    <i className="fas fa-plus mr-1"></i> Add Medication Tariff
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary font-weight-bold px-3 py-2 shadow-sm bg-white"
                                    onClick={() => openBulkUploadModal('medication')}
                                  >
                                    <i className="fas fa-file-upload mr-1"></i> Bulk Upload Tariffs
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary font-weight-bold px-3 py-2 shadow-sm bg-white"
                                    onClick={() => handleDownloadTemplate()}
                                    disabled={bulkDownloadingTemplate}
                                  >
                                    <i className={`fas ${bulkDownloadingTemplate ? 'fa-spinner fa-spin' : 'fa-download'} mr-1`}></i>
                                    Download Template
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

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
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1050, overflowY: 'auto' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px', margin: '1.75rem auto' }}>
            <div
              className="modal-content shadow-lg border-0"
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                maxHeight: 'calc(100vh - 3.5rem)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div className="modal-header bg-gradient-primary text-white py-3 px-4 d-flex align-items-center justify-content-between">
                <h5 className="modal-title font-weight-bold text-white mb-0 d-flex align-items-center">
                  <i className="fas fa-file-invoice-dollar mr-2 text-warning"></i> {modalState.title}
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  aria-label="Close"
                  onClick={closeModal}
                  style={{ textShadow: 'none', opacity: 0.9, fontSize: '1.4rem' }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <form
                onSubmit={handleModalSubmit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  flex: 1,
                  margin: 0,
                }}
              >
                <div className="modal-body p-4" style={{ overflowY: 'auto', flex: 1 }}>
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

                  {/* Laboratory Investigation Tariff Form */}
                  {modalState.entityType === 'lab' && (
                    <>
                      {/* Sponsor / HMO Selection */}
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark d-flex justify-content-between">
                          <span>
                            Sponsor / HMO Company <span className="text-danger">*</span>
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.72rem' }}>e.g. AIICO MULTISHIELD (AMH)</span>
                        </label>
                        <select
                          className="form-control"
                          value={modalState.formData.sponsor_id || ''}
                          onChange={(e) => {
                            const newSponsorId = e.target.value;
                            const matchingPlans = plans.filter((p) => String(p.sponsor) === String(newSponsorId));
                            const resetPlan = matchingPlans.some((p) => String(p.id) === String(modalState.formData.plan_id))
                              ? modalState.formData.plan_id
                              : (matchingPlans.length > 0 ? matchingPlans[0].id : '');
                            setModalState({
                              ...modalState,
                              formData: {
                                ...modalState.formData,
                                sponsor_id: newSponsorId,
                                plan_id: resetPlan,
                              },
                            });
                          }}
                          required
                        >
                          <option value="">-- Select Sponsor / HMO --</option>
                          <option value="general">⭐ General / Out-of-Pocket (Self Pay - No HMO)</option>
                          {sponsors.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.code ? `(${s.code})` : ''}
                            </option>
                          ))}
                        </select>
                        <small className="form-text text-muted">
                          Select the HMO or sponsor who covers this laboratory tariff rate, or select General / Out-of-Pocket.
                        </small>
                      </div>

                      {/* Coverage Plan Selection or General Info Notice */}
                      {modalState.formData.sponsor_id === 'general' ? (
                        <div
                          className="alert alert-info py-2.5 px-3 small mb-3 border-0 d-flex align-items-center"
                          style={{ borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
                        >
                          <i className="fas fa-info-circle mr-2 text-success" style={{ fontSize: '1rem' }}></i>
                          <div>
                            <strong>General Tariff (Pay from your purse):</strong> Baseline hospital rate for self-pay patients and when an HMO patient's plan does not cover this laboratory test.
                          </div>
                        </div>
                      ) : (
                        <div className="form-group mb-3">
                          <label className="small font-weight-bold text-dark d-flex justify-content-between">
                            <span>
                              Sponsor Coverage Plan <span className="text-danger">*</span>
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>e.g. AIICO SLIVER</span>
                          </label>
                          <select
                            className="form-control"
                            value={modalState.formData.plan_id || ''}
                            onChange={(e) =>
                              setModalState({
                                ...modalState,
                                formData: { ...modalState.formData, plan_id: e.target.value },
                              })
                            }
                            required
                          >
                            <option value="">
                              {modalState.formData.sponsor_id
                                ? '-- Select Coverage Plan --'
                                : '-- Select a Sponsor first --'}
                            </option>
                            {(modalState.formData.sponsor_id
                              ? plans.filter((p) => String(p.sponsor) === String(modalState.formData.sponsor_id))
                              : plans
                            ).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.plan} {p.code ? `(${p.code})` : ''}
                              </option>
                            ))}
                          </select>
                          <small className="form-text text-muted">
                            Select the specific plan that qualifies for this test investigation fee.
                          </small>
                        </div>
                      )}

                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">
                          Laboratory Test Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Full Blood Count (FBC) or Widal Test"
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
                        <label className="small font-weight-bold text-dark">Item ID / Test Code</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. LAB-001 (auto-generated if empty)"
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
                        <label className="small font-weight-bold text-dark">
                          Tariff Fee Rate (₦) <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder="3500.00"
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

                  {/* Radiology Form */}
                  {modalState.entityType === 'radiology' && (
                    <>
                      {/* Sponsor / HMO Selection */}
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark d-flex justify-content-between">
                          <span>
                            Sponsor / HMO Company <span className="text-danger">*</span>
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.72rem' }}>e.g. AIICO, AXA Mansard, NHIS</span>
                        </label>
                        <select
                          className="form-control"
                          value={modalState.formData.sponsor_id || ''}
                          onChange={(e) => {
                            const newSponsorId = e.target.value;
                            const matchingPlans = plans.filter((p) => String(p.sponsor) === String(newSponsorId));
                            const resetPlan = matchingPlans.some((p) => String(p.id) === String(modalState.formData.plan_id))
                              ? modalState.formData.plan_id
                              : (matchingPlans.length > 0 ? matchingPlans[0].id : '');
                            setModalState({
                              ...modalState,
                              formData: {
                                ...modalState.formData,
                                sponsor_id: newSponsorId,
                                plan_id: newSponsorId === 'general' ? '' : resetPlan,
                              },
                            });
                          }}
                          required
                        >
                          <option value="">-- Select Sponsor / HMO --</option>
                          <option value="general">⭐ General / Out-of-Pocket (Self Pay - No HMO)</option>
                          {sponsors.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.code ? `(${s.code})` : ''}
                            </option>
                          ))}
                        </select>
                        <small className="form-text text-muted">
                          Select the HMO or corporate sponsor who covers this radiology rate, or select General / Out-of-Pocket.
                        </small>
                      </div>

                      {/* Coverage Plan Selection or General Info Notice */}
                      {modalState.formData.sponsor_id === 'general' ? (
                        <div
                          className="alert alert-info py-2.5 px-3 small mb-3 border-0 d-flex align-items-center"
                          style={{ borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
                        >
                          <i className="fas fa-info-circle mr-2 text-success" style={{ fontSize: '1rem' }}></i>
                          <div>
                            <strong>General Tariff (Pay from your purse):</strong> Baseline hospital rate for self-pay patients and when an HMO patient's plan does not cover this scan / radiology procedure.
                          </div>
                        </div>
                      ) : (
                        <div className="form-group mb-3">
                          <label className="small font-weight-bold text-dark d-flex justify-content-between">
                            <span>
                              Sponsor Coverage Plan <span className="text-danger">*</span>
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>e.g. GOLD, SILVER, BRONZE</span>
                          </label>
                          <select
                            className="form-control"
                            value={modalState.formData.plan_id || ''}
                            onChange={(e) =>
                              setModalState({
                                ...modalState,
                                formData: { ...modalState.formData, plan_id: e.target.value },
                              })
                            }
                            required
                          >
                            <option value="">
                              {modalState.formData.sponsor_id
                                ? '-- Select Coverage Plan --'
                                : '-- Select a Sponsor first --'}
                            </option>
                            {(modalState.formData.sponsor_id
                              ? plans.filter((p) => String(p.sponsor) === String(modalState.formData.sponsor_id))
                              : plans
                            ).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.plan} {p.code ? `(${p.code})` : ''}
                              </option>
                            ))}
                          </select>
                          <small className="form-text text-muted">
                            Select the specific plan that qualifies for this scan / radiology procedure fee.
                          </small>
                        </div>
                      )}

                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">
                          Scan / Radiology Procedure Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Pelvic Ultrasound, Chest X-Ray, or Brain CT Scan"
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
                        <label className="small font-weight-bold text-dark">Item ID / Scan Code</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. RAD-001 (auto-generated if empty)"
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
                        <label className="small font-weight-bold text-dark">
                          Tariff Fee Rate (₦) <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder="4500.00"
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
                      {/* Sponsor / HMO Selection */}
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark d-flex justify-content-between">
                          <span>
                            Sponsor / HMO Company <span className="text-danger">*</span>
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.72rem' }}>e.g. AIICO MULTISHIELD (AMH)</span>
                        </label>
                        <select
                          className="form-control"
                          value={modalState.formData.sponsor_id || ''}
                          onChange={(e) => {
                            const newSponsorId = e.target.value;
                            const isGen = newSponsorId === 'general';
                            const matchingPlans = isGen ? [] : plans.filter((p) => String(p.sponsor) === String(newSponsorId));
                            const resetPlan = isGen ? 'general' : (matchingPlans.some((p) => String(p.id) === String(modalState.formData.plan_id))
                              ? modalState.formData.plan_id
                              : (matchingPlans.length > 0 ? matchingPlans[0].id : ''));
                            setModalState({
                              ...modalState,
                              formData: {
                                ...modalState.formData,
                                sponsor_id: newSponsorId,
                                plan_id: resetPlan,
                              },
                            });
                          }}
                          required
                        >
                          <option value="">-- Select Sponsor / HMO --</option>
                          <option value="general" className="font-weight-bold text-success">
                            ⭐ General / Out-of-Pocket (Self-Pay - No HMO)
                          </option>
                          {sponsors.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.code ? `(${s.code})` : ''}
                            </option>
                          ))}
                        </select>
                        <small className="form-text text-muted">
                          Select the HMO, company retainer, or General / Out-of-Pocket (Self-Pay).
                        </small>
                      </div>

                      {/* Coverage Plan Selection */}
                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark d-flex justify-content-between">
                          <span>
                            Sponsor Coverage Plan <span className="text-danger">*</span>
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.72rem' }}>e.g. AIICO SILVER or General</span>
                        </label>
                        <select
                          className="form-control"
                          value={modalState.formData.plan_id || ''}
                          disabled={modalState.formData.sponsor_id === 'general'}
                          onChange={(e) =>
                            setModalState({
                              ...modalState,
                              formData: { ...modalState.formData, plan_id: e.target.value },
                            })
                          }
                          required
                        >
                          {modalState.formData.sponsor_id === 'general' ? (
                            <option value="general">General Price (Pay from your purse)</option>
                          ) : (
                            <>
                              <option value="">
                                {modalState.formData.sponsor_id
                                  ? '-- Select Coverage Plan --'
                                  : '-- Select a Sponsor first --'}
                              </option>
                              {(modalState.formData.sponsor_id
                                ? plans.filter((p) => String(p.sponsor) === String(modalState.formData.sponsor_id))
                                : plans
                              ).map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.plan} {p.code ? `(${p.code})` : ''}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                        <small className="form-text text-muted">
                          {modalState.formData.sponsor_id === 'general'
                            ? 'General price applies to all self-pay patients paying from purse.'
                            : 'Select the specific tariff tier/plan (e.g. AIICO SILVER, AIICO GOLD, etc.).'}
                        </small>
                      </div>

                      <div className="form-group mb-3">
                        <label className="small font-weight-bold text-dark">
                          Medication Name &amp; Strength <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Amoxicillin 500mg, Tab Coartem, Inj Ceftriaxone 1g"
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
                      <div className="row">
                        <div className="col-md-6 form-group mb-3">
                          <label className="small font-weight-bold text-dark">SKU / Product ID</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. DRG-101 (Auto-generated if empty)"
                            value={modalState.formData.product_id || ''}
                            onChange={(e) =>
                              setModalState({
                                ...modalState,
                                formData: { ...modalState.formData, product_id: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="col-md-6 form-group mb-3">
                          <label className="small font-weight-bold text-dark">
                            Prescription Tariff Rate (₦) <span className="text-danger">*</span>
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="e.g. 1500"
                            value={modalState.formData.rate || ''}
                            onChange={(e) =>
                              setModalState({
                                ...modalState,
                                formData: { ...modalState.formData, rate: e.target.value },
                              })
                            }
                            required
                            min="0"
                            step="any"
                          />
                        </div>
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
                <div className="modal-footer bg-light py-3 px-4 border-top d-flex justify-content-end align-items-center">
                  <button type="button" className="btn btn-secondary font-weight-bold px-3 mr-2" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary font-weight-bold px-4">
                    <i className="fas fa-save mr-1"></i> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BULK UPLOAD MEDICATION TARIFFS MODAL                      */}
      {/* ======================================================== */}
      {isBulkUploadModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060, overflowY: 'auto' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !bulkUploadLoading) {
              setIsBulkUploadModalOpen(false);
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '640px', margin: '1.75rem auto' }}>
            <div
              className="modal-content shadow-lg border-0"
              style={{
                borderRadius: '14px',
                overflow: 'hidden',
                maxHeight: 'calc(100vh - 3.5rem)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Modal Header */}
              <div
                className="modal-header py-3 px-4 text-white d-flex align-items-center justify-content-between"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                }}
              >
                <div className="d-flex align-items-center">
                  <div
                    className="mr-3 d-flex align-items-center justify-content-center shadow-sm"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255,255,255,0.18)',
                      fontSize: '1.25rem',
                    }}
                  >
                    <i className={`fas ${bulkUploadType === 'radiology' ? 'fa-x-ray' : bulkUploadType === 'lab' ? 'fa-flask' : 'fa-file-excel'}`}></i>
                  </div>
                  <div>
                    <h5 className="modal-title font-weight-bold text-white mb-0" style={{ fontSize: '1.1rem' }}>
                      {bulkUploadType === 'radiology'
                        ? 'Bulk Upload Radiology & Scan Tariffs'
                        : bulkUploadType === 'lab'
                        ? 'Bulk Upload Laboratory Investigation Charges'
                        : 'Bulk Upload Medication Tariffs'}
                    </h5>
                    <div className="small text-white-50">
                      {bulkUploadType === 'radiology'
                        ? 'Import multiple radiology and imaging scan tariffs linked to HMO Sponsors and Plans'
                        : bulkUploadType === 'lab'
                        ? 'Import multiple laboratory test tariffs linked to HMO Sponsors and Plans'
                        : 'Import multiple medication prices linked to HMO Sponsors and Plans'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="close text-white"
                  aria-label="Close"
                  disabled={bulkUploadLoading}
                  onClick={() => setIsBulkUploadModalOpen(false)}
                  style={{ textShadow: 'none', opacity: 0.9, fontSize: '1.4rem' }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleExecuteBulkUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
                <div className="modal-body p-4" style={{ overflowY: 'auto', flex: 1 }}>
                  {/* Step 1: Default Sponsor and Plan */}
                  <div className="p-3 bg-light rounded border mb-3">
                    <div className="font-weight-bold text-gray-800 small mb-2 d-flex align-items-center">
                      <span className="badge badge-primary mr-2" style={{ borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                      Target Sponsor &amp; Coverage Plan (Default for rows in file):
                    </div>
                    <div className="row g-2">
                      <div className="col-md-6 form-group mb-2 mb-md-0">
                        <label className="small font-weight-bold text-muted mb-1">
                          Sponsor / HMO Company:
                        </label>
                        <select
                          className="form-control form-control-sm"
                          value={bulkUploadSponsor}
                          onChange={(e) => {
                            const newSponsorId = e.target.value;
                            setBulkUploadSponsor(newSponsorId);
                            if (newSponsorId === 'general') {
                              setBulkUploadPlan('');
                            } else {
                              const matchingPlans = plans.filter((p) => String(p.sponsor) === String(newSponsorId));
                              setBulkUploadPlan(matchingPlans.length > 0 ? matchingPlans[0].id : '');
                            }
                          }}
                        >
                          <option value="">
                            {sponsors.length === 0
                              ? '-- Loading sponsors or auto-detect --'
                              : '-- Auto-detect from file or select --'}
                          </option>
                          <option value="general">⭐ General / Out-of-Pocket (Self Pay - No HMO)</option>
                          {sponsors.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.code ? `(${s.code})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6 form-group mb-0">
                        <label className="small font-weight-bold text-muted mb-1">
                          Coverage Plan:
                        </label>
                        {bulkUploadSponsor === 'general' ? (
                          <select className="form-control form-control-sm bg-light" value="" disabled>
                            <option value="">-- Not Applicable (General Out-of-Pocket) --</option>
                          </select>
                        ) : (
                          <select
                            className="form-control form-control-sm"
                            value={bulkUploadPlan}
                            onChange={(e) => setBulkUploadPlan(e.target.value)}
                          >
                            <option value="">-- Auto-detect from file or select --</option>
                            {(bulkUploadSponsor
                              ? plans.filter((p) => String(p.sponsor) === String(bulkUploadSponsor))
                              : plans
                            ).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.plan} {p.code ? `(${p.code})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    {bulkUploadSponsor === 'general' ? (
                      <div className="alert alert-success py-2 px-3 small mt-2 mb-0 border-0" style={{ borderRadius: '6px' }}>
                        <i className="fas fa-check-circle mr-1.5 text-success"></i>
                        <strong>General Tariff Mode:</strong> Tariffs in this file will be uploaded as baseline hospital out-of-pocket prices for self-pay patients and when HMO patients choose <em>"Pay from your purse"</em>.
                      </div>
                    ) : (
                      <small className="form-text text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                        <i className="fas fa-info-circle mr-1 text-primary"></i>
                        If a row in your file leaves the <code>sponsor_code</code> or <code>plan_code</code> column empty, these selected defaults will be used.
                      </small>
                    )}
                  </div>

                  {/* Step 2: Download Template Card */}
                  <div className="p-3 rounded border mb-3" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div>
                        <div className="font-weight-bold text-success small d-flex align-items-center">
                          <span className="badge badge-success mr-2" style={{ borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                          Need the standard template?
                        </div>
                        <div className="text-muted small mt-1" style={{ fontSize: '0.78rem' }}>
                          {bulkUploadType === 'radiology'
                            ? 'Download our pre-formatted CSV template with sample radiology procedures and plan codes.'
                            : bulkUploadType === 'lab'
                            ? 'Download our pre-formatted CSV template with sample laboratory tests and plan codes.'
                            : 'Download our pre-formatted CSV template with sample drugs and plan codes.'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-success font-weight-bold px-3 py-1 shadow-sm d-inline-flex align-items-center"
                        style={{ borderRadius: '6px' }}
                        onClick={() => {
                          if (bulkUploadType === 'radiology') {
                            handleDownloadRadiologyTemplate(bulkUploadSponsor, bulkUploadPlan);
                          } else if (bulkUploadType === 'lab') {
                            handleDownloadLabTemplate(bulkUploadSponsor, bulkUploadPlan);
                          } else {
                            handleDownloadTemplate(bulkUploadSponsor, bulkUploadPlan);
                          }
                        }}
                        disabled={bulkDownloadingTemplate}
                      >
                        <i className={`fas ${bulkDownloadingTemplate ? 'fa-spinner fa-spin' : 'fa-download'} mr-2`}></i>
                        Download Template (.CSV)
                      </button>
                    </div>

                    <div className="mt-2 pt-2 border-top" style={{ borderColor: '#dcfce7' }}>
                      <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                        {bulkUploadType === 'radiology' ? (
                          <>
                            <strong>Required Columns:</strong> <code>item_name</code>, <code>rate</code> &bull; <strong>Optional:</strong> <code>procedure_code</code>, <code>sponsor_code</code>, <code>plan_code</code>, <code>notes</code>
                          </>
                        ) : bulkUploadType === 'lab' ? (
                          <>
                            <strong>Required Columns:</strong> <code>item_name</code>, <code>rate</code> &bull; <strong>Optional:</strong> <code>test_code</code>, <code>sponsor_code</code>, <code>plan_code</code>, <code>notes</code>
                          </>
                        ) : (
                          <>
                            <strong>Required Columns:</strong> <code>product_name</code>, <code>rate</code> &bull; <strong>Optional:</strong> <code>sku</code>, <code>sponsor_code</code>, <code>plan_code</code>, <code>notes</code>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Step 3: File Upload Area */}
                  <div className="form-group mb-3">
                    <label className="font-weight-bold text-gray-800 small mb-2 d-flex align-items-center">
                      <span className="badge badge-primary mr-2" style={{ borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                      Upload Spreadsheet File (.CSV, .XLSX, or .XLS): <span className="text-danger">*</span>
                    </label>

                    <div
                      className={`p-4 text-center border rounded ${bulkUploadDragOver ? 'border-primary bg-light' : 'border-dashed'}`}
                      style={{
                        borderStyle: 'dashed',
                        borderWidth: '2px',
                        cursor: 'pointer',
                        borderColor: bulkUploadDragOver ? '#2563eb' : '#cbd5e1',
                        backgroundColor: bulkUploadDragOver ? '#eff6ff' : '#fafafa',
                        borderRadius: '10px',
                        transition: 'all 0.2s ease',
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setBulkUploadDragOver(true);
                      }}
                      onDragLeave={() => setBulkUploadDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setBulkUploadDragOver(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleBulkFileChange(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => {
                        const fileInput = document.getElementById('medicationTariffBulkFileInput');
                        if (fileInput) fileInput.click();
                      }}
                    >
                      <input
                        id="medicationTariffBulkFileInput"
                        type="file"
                        accept=".csv, .xlsx, .xls"
                        className="d-none"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleBulkFileChange(e.target.files[0]);
                          }
                        }}
                      />
                      <i className="fas fa-cloud-upload-alt fa-2x text-primary mb-2 d-block"></i>
                      {bulkUploadFile ? (
                        <div>
                          <span className="badge badge-primary px-3 py-2 font-weight-bold" style={{ fontSize: '0.85rem' }}>
                            <i className="fas fa-file-alt mr-1"></i> {bulkUploadFile.name} ({(bulkUploadFile.size / 1024).toFixed(1)} KB)
                          </span>
                          <div className="small text-muted mt-2">Click or drag another file to replace</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-weight-bold text-dark small">
                            Click to select file or drag &amp; drop here
                          </div>
                          <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                            Supports CSV (.csv) or Microsoft Excel (.xlsx, .xls) up to 10MB
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview Table if CSV parsed */}
                  {bulkPreviewRows.length > 0 && (
                    <div className="mt-3">
                      <div className="font-weight-bold small text-gray-800 mb-1 d-flex justify-content-between align-items-center">
                        <span>
                          <i className="fas fa-eye text-primary mr-1"></i> File Preview (First {bulkPreviewRows.length} rows):
                        </span>
                        <span className="badge badge-light border small">Sample Rows</span>
                      </div>
                      <div className="table-responsive rounded border" style={{ maxHeight: '180px' }}>
                        <table className="table table-sm table-striped mb-0 small">
                          <thead className="thead-light">
                            <tr>
                              <th>{bulkUploadType === 'radiology' ? 'Scan / Radiology Procedure' : bulkUploadType === 'lab' ? 'Laboratory Test' : 'Medication'}</th>
                              <th>Rate (₦)</th>
                              <th>{bulkUploadType === 'radiology' ? 'Procedure Code' : bulkUploadType === 'lab' ? 'Test Code' : 'SKU'}</th>
                              <th>Sponsor</th>
                              <th>Plan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkPreviewRows.map((r, i) => (
                              <tr key={i}>
                                <td className="font-weight-bold text-dark">{r.item_name || r.procedure_name || r.product_name || r.name || r.item || '—'}</td>
                                <td className="text-success font-weight-bold">{r.rate || r.price || r.tariff || '—'}</td>
                                <td>{r.procedure_code || r.test_code || r.sku || r.item_id || 'Auto'}</td>
                                <td>{r.sponsor_code || r.sponsor || 'Default'}</td>
                                <td>{r.plan_code || r.plan || 'Default'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="modal-footer bg-light py-3 px-4 border-top d-flex justify-content-between align-items-center">
                  <button
                    type="button"
                    className="btn btn-secondary font-weight-bold px-3"
                    disabled={bulkUploadLoading}
                    onClick={() => {
                      setIsBulkUploadModalOpen(false);
                      setBulkUploadFile(null);
                      setBulkPreviewRows([]);
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary font-weight-bold px-4 shadow-sm"
                    disabled={bulkUploadLoading || !bulkUploadFile}
                  >
                    {bulkUploadLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i> Importing Tariffs...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check mr-2"></i> Upload &amp; Save Tariffs
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
      {/* SPONSOR & HMO CODE CREATE / EDIT MODAL                   */}
      {/* ======================================================== */}
      {sponsorModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1055, overflowY: 'auto' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSponsorModal();
          }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: '520px', margin: '1.75rem auto' }}
          >
            <div
              className="modal-content shadow-lg border-0"
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                maxHeight: 'calc(100vh - 3.5rem)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div className="modal-header bg-gradient-primary text-white py-3 px-4 d-flex align-items-center justify-content-between">
                <h5 className="modal-title font-weight-bold text-white mb-0 d-flex align-items-center">
                  <i className="fas fa-shield-alt mr-2 text-warning"></i>
                  {editingSponsor ? 'Edit Sponsor & Code' : 'Create New Sponsor & Code'}
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  aria-label="Close"
                  onClick={closeSponsorModal}
                  style={{ textShadow: 'none', opacity: 0.9, fontSize: '1.4rem' }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <form
                onSubmit={handleSaveSponsor}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  flex: 1,
                  margin: 0,
                }}
              >
                <div
                  className="modal-body p-4"
                  style={{ overflowY: 'auto', flex: 1 }}
                >
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

                  <div className="form-group mb-0">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="small font-weight-bold text-dark mb-0">
                        Coverage Category <span className="text-danger">*</span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 font-weight-bold text-primary"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => openCategoryModal('create')}
                      >
                        <i className="fas fa-plus-circle mr-1"></i> + New Category
                      </button>
                    </div>
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

                <div className="modal-footer bg-light py-3 px-4 border-top d-flex justify-content-end align-items-center">
                  <button
                    type="button"
                    className="btn btn-secondary font-weight-bold px-3 mr-2"
                    onClick={closeSponsorModal}
                    disabled={sponsorSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary font-weight-bold px-4"
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
      {/* BULK UPLOAD SPONSORS MODAL                                */}
      {/* ======================================================== */}
      {syncExcelModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '620px', margin: '1.75rem auto' }}>
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: '14px', overflow: 'hidden' }}>
              <div
                className="modal-header py-3 px-4 align-items-center text-white"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                }}
              >
                <div>
                  <h5 className="modal-title font-weight-bold text-white mb-0 d-flex align-items-center" style={{ fontSize: '1.15rem' }}>
                    <i className="fas fa-file-excel mr-2 text-warning"></i>
                    Bulk Upload Hospital Sponsors
                  </h5>
                  <p className="small text-white-50 mb-0 mt-1">
                    Upload an Excel (.xlsx) or CSV file containing your sponsors, billing codes, and categories.
                  </p>
                </div>
                <button
                  type="button"
                  className="close text-white"
                  aria-label="Close"
                  onClick={() => {
                    setSyncExcelModalOpen(false);
                    setSponsorUploadFile(null);
                  }}
                  disabled={importingSponsors}
                  style={{ textShadow: 'none', opacity: 0.9, fontSize: '1.4rem' }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body p-4">
                {/* Download Template Banner */}
                <div
                  className="p-3 mb-3 d-flex align-items-center justify-content-between rounded border"
                  style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}
                >
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center mr-3"
                      style={{ width: '40px', height: '40px', backgroundColor: '#dcfce7', color: '#16a34a' }}
                    >
                      <i className="fas fa-file-excel fa-lg"></i>
                    </div>
                    <div>
                      <div className="font-weight-bold text-dark" style={{ fontSize: '0.90rem' }}>
                        Need the official template?
                      </div>
                      <div className="text-muted small">
                        Download the pre-formatted Excel template with sample HMO &amp; Corporate sponsors.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-success font-weight-bold shadow-xs px-3 text-nowrap"
                    onClick={handleDownloadSponsorTemplate}
                    disabled={downloadingSponsorTemplate}
                    style={{ borderRadius: '6px' }}
                  >
                    <i className={`fas fa-download mr-1 ${downloadingSponsorTemplate ? 'fa-spin' : ''}`}></i>
                    {downloadingSponsorTemplate ? 'Downloading...' : 'Download Template'}
                  </button>
                </div>

                {/* Default Category selector */}
                <div className="form-group mb-3">
                  <label className="font-weight-bold text-dark small mb-1">
                    Default Category (for rows without Category column)
                  </label>
                  <select
                    className="custom-select custom-select-sm"
                    value={sponsorUploadCategory}
                    onChange={(e) => setSponsorUploadCategory(e.target.value)}
                  >
                    <option value="">HMO (Default)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category}
                      </option>
                    ))}
                  </select>
                  <small className="form-text text-muted">
                    If your file has a <code>Category</code> column, the category from the file will be used automatically.
                  </small>
                </div>

                {/* File Dropzone */}
                <div className="form-group mb-3">
                  <label className="font-weight-bold text-dark small mb-1">
                    Select File to Upload (.xlsx, .xls, .csv)
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setSponsorDragOver(true);
                    }}
                    onDragLeave={() => setSponsorDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setSponsorDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setSponsorUploadFile(e.dataTransfer.files[0]);
                      }
                    }}
                    style={{
                      border: sponsorDragOver ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                      borderRadius: '10px',
                      backgroundColor: sponsorDragOver ? '#eff6ff' : '#f8fafc',
                      padding: '24px 16px',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => document.getElementById('sponsor-bulk-file-input')?.click()}
                  >
                    <input
                      id="sponsor-bulk-file-input"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSponsorUploadFile(e.target.files[0]);
                        }
                      }}
                    />
                    {sponsorUploadFile ? (
                      <div>
                        <i className="fas fa-file-excel fa-3x text-success mb-2"></i>
                        <h6 className="font-weight-bold text-dark mb-1">{sponsorUploadFile.name}</h6>
                        <span className="badge badge-primary px-2 py-1">
                          {(sponsorUploadFile.size / 1024).toFixed(1)} KB
                        </span>
                        <div className="mt-2">
                          <button
                            type="button"
                            className="btn btn-xs btn-outline-danger font-weight-bold"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSponsorUploadFile(null);
                            }}
                          >
                            <i className="fas fa-times mr-1"></i> Remove File
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-2"></i>
                        <div className="font-weight-bold text-dark mb-1">
                          Click to browse or drag and drop your spreadsheet here
                        </div>
                        <p className="text-muted small mb-0">
                          Supports Microsoft Excel (<code>.xlsx</code>) and <code>.csv</code> files
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Default Server Sync Note if no file selected */}
                {!sponsorUploadFile && (
                  <div className="alert alert-light border small text-muted mb-0 d-flex align-items-center">
                    <i className="fas fa-info-circle text-info mr-2 fa-lg"></i>
                    <span>
                      If no file is selected, clicking <strong>"Upload Sponsors"</strong> will automatically synchronize all 64 HMO sponsors from the default <strong>Sponsor.xlsx</strong> file on the server.
                    </span>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-between border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary font-weight-bold px-3"
                  onClick={() => {
                    setSyncExcelModalOpen(false);
                    setSponsorUploadFile(null);
                  }}
                  disabled={importingSponsors}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary font-weight-bold px-4 shadow-sm"
                  onClick={executeImportFromExcel}
                  disabled={importingSponsors}
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                    borderColor: '#1d4ed8',
                  }}
                >
                  {importingSponsors ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-1"></i> Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle mr-1"></i>{' '}
                      {sponsorUploadFile ? 'Upload Sponsors' : 'Sync Sponsor.xlsx'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CATEGORY CREATE / EDIT MODAL                             */}
      {/* ======================================================== */}
      {categoryModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCategoryModal();
          }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '460px', margin: '1.75rem auto' }}>
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <div className="modal-header bg-gradient-primary text-white py-3 px-4 d-flex align-items-center justify-content-between">
                <h5 className="modal-title font-weight-bold text-white mb-0 d-flex align-items-center">
                  <i className="fas fa-tags mr-2 text-warning"></i>
                  {editingCategory ? 'Edit Billing Category' : 'Create Billing Category'}
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  aria-label="Close"
                  onClick={closeCategoryModal}
                  style={{ textShadow: 'none', opacity: 0.9, fontSize: '1.4rem' }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <form onSubmit={handleSaveCategory}>
                <div className="modal-body p-4">
                  <div className="alert alert-light border small text-muted mb-3 d-flex align-items-center">
                    <i className="fas fa-info-circle text-primary mr-2" style={{ fontSize: '1.2rem' }}></i>
                    <span>
                      Categories group hospital sponsors, coverage plans, and patients for billing and authorization workflows.
                    </span>
                  </div>

                  <div className="form-group mb-3">
                    <label className="small font-weight-bold text-dark mb-1">
                      Category Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control font-weight-bold"
                      placeholder="e.g. Corporate Retainer, Family Retainer, NHIS, Private, HMO"
                      value={categoryForm.category}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, category: e.target.value })
                      }
                      required
                      autoFocus
                    />
                    <small className="form-text text-muted">
                      Common standard examples: <strong>HMO</strong>, <strong>Private</strong>, <strong>Corporate</strong>, <strong>Retainer</strong>, <strong>NHIS</strong>, <strong>Family</strong>, <strong>Staff</strong>.
                    </small>
                  </div>
                </div>

                <div className="modal-footer bg-light py-3 px-4 border-top d-flex justify-content-end align-items-center">
                  <button
                    type="button"
                    className="btn btn-secondary font-weight-bold px-3 mr-2"
                    onClick={closeCategoryModal}
                    disabled={categorySaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary font-weight-bold px-4"
                    disabled={categorySaving}
                  >
                    {categorySaving ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-1"></i> Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-1"></i> {editingCategory ? 'Update Category' : 'Create Category'}
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



