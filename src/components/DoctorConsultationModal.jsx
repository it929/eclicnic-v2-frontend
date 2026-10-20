import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../services/api';
import { showToast } from './Toast';

const COMMON_COMPLAINTS = [
  'Fever / Chills',
  'Headache',
  'Cough',
  'Abdominal Pain',
  'Chest Pain',
  'Body Aches / Fatigue',
  'Sore Throat',
  'Dizziness',
  'Nausea / Vomiting',
  'Joint Pain',
];

const COMMON_DIAGNOSES = [
  'Malaria (Uncomplicated)',
  'Acute Upper Respiratory Tract Infection (URTI)',
  'Essential Hypertension',
  'Acute Gastroenteritis',
  'Peptic Ulcer Disease (PUD)',
  'Enteric Fever (Typhoid)',
  'Bronchitis',
  'Urinary Tract Infection (UTI)',
  'Diabetes Mellitus Type 2',
  'Tension Headache',
];

// Standard commercial liquid dispensing bottle sizes in hospital pharmacy
export const STANDARD_HOSPITAL_BOTTLE_SIZES = ['15', '30', '50', '60', '100', '120', '150', '200'];

// Comprehensive mapping of Dosage Form to Route of Administration
export const DOSAGE_FORM_ROUTES_MAP = {
  Tablet: {
    defaultRoute: 'Oral',
    routes: ['Oral', 'Sublingual', 'Buccal'],
  },
  Caplet: {
    defaultRoute: 'Oral',
    routes: ['Oral', 'Sublingual'],
  },
  Capsule: {
    defaultRoute: 'Oral',
    routes: ['Oral'],
  },
  Syrup: {
    defaultRoute: 'Oral',
    routes: ['Oral'],
  },
  Suspension: {
    defaultRoute: 'Oral',
    routes: ['Oral'],
  },
  Drops: {
    defaultRoute: 'Oral',
    routes: ['Oral', 'Ophthalmic (Eye)', 'Otic (Ear)', 'Nasal'],
  },
  Injection: {
    defaultRoute: 'Intravenous',
    routes: ['Intravenous', 'Intramuscular', 'Subcutaneous', 'Intradermal', 'IV Infusion'],
  },
  Suppository: {
    defaultRoute: 'Rectal',
    routes: ['Rectal', 'Vaginal'],
  },
  Inhaler: {
    defaultRoute: 'Inhalation',
    routes: ['Inhalation', 'Nasal'],
  },
  Ointment: {
    defaultRoute: 'Topical',
    routes: ['Topical', 'Transdermal', 'Ophthalmic (Eye)', 'Rectal'],
  },
  Sachet: {
    defaultRoute: 'Oral',
    routes: ['Oral'],
  },
};

export const ALL_COMMON_ROUTES = [
  'Oral',
  'Intravenous',
  'Intramuscular',
  'Subcutaneous',
  'IV Infusion',
  'Intradermal',
  'Topical',
  'Inhalation',
  'Sublingual',
  'Buccal',
  'Rectal',
  'Vaginal',
  'Ophthalmic (Eye)',
  'Otic (Ear)',
  'Nasal',
  'Transdermal',
];

export const getOptimalRouteForDrug = (name = '', form = 'Tablet') => {
  const n = (name || '').toLowerCase();
  if (form === 'Injection') {
    if (n.includes('im ') || n.includes('intramuscular') || n.includes(' im') || n.includes('(im)')) return 'Intramuscular';
    if (n.includes('sc ') || n.includes('subcutaneous') || n.includes('(sc)')) return 'Subcutaneous';
    if (n.includes('infusion')) return 'IV Infusion';
    return 'Intravenous';
  }
  if (form === 'Drops') {
    if (n.includes('eye') || n.includes('ophth')) return 'Ophthalmic (Eye)';
    if (n.includes('ear') || n.includes('otic')) return 'Otic (Ear)';
    if (n.includes('nasal') || n.includes('nose')) return 'Nasal';
    return 'Oral';
  }
  if (form === 'Ointment') {
    if (n.includes('eye') || n.includes('ophth')) return 'Ophthalmic (Eye)';
    if (n.includes('rectal') || n.includes('anus')) return 'Rectal';
    return 'Topical';
  }
  if (form === 'Suppository') {
    if (n.includes('pessary') || n.includes('vag')) return 'Vaginal';
    return 'Rectal';
  }
  if (form === 'Tablet' || form === 'Caplet') {
    if (n.includes('sublingual') || n.includes('sl ')) return 'Sublingual';
    if (n.includes('buccal')) return 'Buccal';
    return 'Oral';
  }
  return DOSAGE_FORM_ROUTES_MAP[form]?.defaultRoute || 'Oral';
};

/**
 * Automatically determine the optimal hospital bottle size to dispense:
 * 1. Checks if the drug product name explicitly specifies a bottle size (e.g. "100ml", "60ml", "150ml")
 *    while avoiding dosage concentration (e.g. 120mg/5ml).
 * 2. Calculates required treatment volume (Qty/Dose * times/day * days).
 * 3. Matches against standard commercial hospital bottle sizes (15ml, 30ml, 50ml, 60ml, 100ml, 120ml, 150ml, 200ml).
 */
export const getOptimalBottleSize = (name = '', form = 'Syrup', qty = 10, freq = '', durVal = 5, durUnit = 'Day(s)') => {
  if (form === 'Drops') {
    return '15';
  }

  // 1. Look for packaging bottle volume inside drug name (e.g. "60ml", "100ml", "120ml", "150ml", "200ml", "30ml", "50ml")
  // Make sure not to capture concentration like "120mg/5ml" or "125mg-5ml"
  const cleanName = (name || '').trim();
  if (cleanName) {
    const matches = [...cleanName.matchAll(/(?<!\d+\s*(?:mg|g|mcg|iu)\s*[\/-])\b(\d+)\s*ml\b/gi)];
    for (const m of matches) {
      const vol = parseInt(m[1], 10);
      if ([15, 30, 50, 60, 100, 120, 150, 200, 250, 300, 500].includes(vol)) {
        return String(vol);
      }
    }
  }

  // 2. Calculate required treatment course volume
  let timesPerDay = 1;
  const f = (freq || '').toLowerCase();
  if (f.includes('bd') || f.includes('twice') || f.includes('12 hourly') || f.includes('12-hourly')) timesPerDay = 2;
  else if (f.includes('tds') || f.includes('three') || f.includes('8 hourly') || f.includes('8-hourly')) timesPerDay = 3;
  else if (f.includes('qds') || f.includes('four') || f.includes('6 hourly') || f.includes('6-hourly')) timesPerDay = 4;
  else if (f.includes('q4h') || f.includes('4 hourly') || f.includes('every 4 hours')) timesPerDay = 6;
  else if (f.includes('q2h') || f.includes('2 hourly')) timesPerDay = 12;
  else if (f.includes('hourly')) timesPerDay = 24;
  else if (f.includes('alt die') || f.includes('other day')) timesPerDay = 0.5;
  else if (f.includes('weekly')) timesPerDay = 1 / 7;
  else if (f.includes('stat') || f.includes('single')) timesPerDay = 1;

  const dVal = Math.max(1, Number(durVal) || 1);
  let dayMultiplier = 1;
  if (durUnit === 'Week(s)') dayMultiplier = 7;
  else if (durUnit === 'Month(s)') dayMultiplier = 30;

  const totalDays = f.includes('stat') ? 1 : Math.round(dVal * dayMultiplier);
  const numDose = Math.max(0.1, Number(qty) || 1);
  const totalVolume = Math.round(numDose * timesPerDay * totalDays);

  // 3. Match against standard hospital sizes:
  if (totalVolume <= 15) return '15';
  if (totalVolume <= 30) return '30';
  if (totalVolume <= 50) return '50';
  if (totalVolume <= 60) return '60';
  if (totalVolume <= 100) return '100';
  if (totalVolume <= 120) return '120';
  if (totalVolume <= 150) return '150';
  if (totalVolume <= 200) return '200';

  // If > 200ml (e.g. 240ml -> 120ml [2 bottles], 300ml -> 150ml [2 bottles] or 100ml [3 bottles], 400ml -> 200ml)
  if (totalVolume % 150 === 0) return '150';
  if (totalVolume % 120 === 0) return '120';
  if (totalVolume % 100 === 0) return '100';
  if (totalVolume % 200 === 0) return '200';
  if (totalVolume % 60 === 0) return '60';

  return '100';
};

export default function DoctorConsultationModal({
  isOpen,
  patient,
  appointment,
  onClose,
  onConsultationFinished,
  onNavigate,
}) {
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'orders' | 'history' | 'legacy'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Consultation Documentation Fields
  const [selectedComplaints, setSelectedComplaints] = useState([]);
  const [customComplaint, setCustomComplaint] = useState('');
  const [historyOfIllness, setHistoryOfIllness] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState('');
  const [diagnosisError, setDiagnosisError] = useState(false);
  const [diagnosisComments, setDiagnosisComments] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Clinical Medication Prescription state
  const [prescriptions, setPrescriptions] = useState([]);
  const [drugName, setDrugName] = useState('');
  const [dosageForm, setDosageForm] = useState('Tablet'); // 'Tablet', 'Syrup', 'Caplet', 'Capsule', 'Drops', 'Suspension', 'Injection', 'Suppository', 'Inhaler', 'Ointment', 'Sachet'
  const [medRoute, setMedRoute] = useState('Oral');
  const [strength, setStrength] = useState('500mg');
  const [doseUnit, setDoseUnit] = useState('tab');
  const [qtyDose, setQtyDose] = useState('1');
  const [frequency, setFrequency] = useState('Twice daily (bd)');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationVal, setDurationVal] = useState('5');
  const [durationUnit, setDurationUnit] = useState('Day(s)');
  const [medComment, setMedComment] = useState('');
  const [syrupBottleSize, setSyrupBottleSize] = useState('100');
  const [isBottleSizeManual, setIsBottleSizeManual] = useState(false);

  // Covered Medication Tariffs for Patient's Sponsor & Plan
  const [patientDetails, setPatientDetails] = useState(patient || null);
  const [coveredMedications, setCoveredMedications] = useState([]);
  const [generalMedications, setGeneralMedications] = useState([]);
  const [tariffMode, setTariffMode] = useState('covered'); // 'covered' | 'general'
  const [loadingCoveredMeds, setLoadingCoveredMeds] = useState(false);
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);
  const [selectedMedTariff, setSelectedMedTariff] = useState(null);
  const [selectedDrugIndex, setSelectedDrugIndex] = useState(0);
  const drugDropdownRef = useRef(null);
  const drugSearchTimeoutRef = useRef(null);

  // Standalone Orders Section Tab ('prescriptions' | 'lab' | 'radiology' | 'other_services' | 'overview')
  const [orderSectionTab, setOrderSectionTab] = useState('prescriptions');

  // Standalone 1: Laboratory Orders
  const [labOrders, setLabOrders] = useState([]);
  const [labTestName, setLabTestName] = useState('');
  const [coveredLabTariffs, setCoveredLabTariffs] = useState([]);
  const [generalLabTariffs, setGeneralLabTariffs] = useState([]);
  const [labTariffMode, setLabTariffMode] = useState('covered'); // 'covered' | 'general'
  const [loadingCoveredLabs, setLoadingCoveredLabs] = useState(false);
  const [showLabDropdown, setShowLabDropdown] = useState(false);
  const [selectedLabTariff, setSelectedLabTariff] = useState(null);
  const [selectedLabIndex, setSelectedLabIndex] = useState(0);
  const labDropdownRef = useRef(null);
  const labSearchTimeoutRef = useRef(null);

  // Standalone 2: Radiology & Scans Orders
  const [radiologyOrders, setRadiologyOrders] = useState([]);
  const [radiologyScanName, setRadiologyScanName] = useState('');
  const [coveredRadiologyTariffs, setCoveredRadiologyTariffs] = useState([]);
  const [loadingCoveredRadiology, setLoadingCoveredRadiology] = useState(false);
  const [showRadiologyDropdown, setShowRadiologyDropdown] = useState(false);
  const [selectedRadiologyTariff, setSelectedRadiologyTariff] = useState(null);
  const [selectedRadiologyIndex, setSelectedRadiologyIndex] = useState(0);
  const radiologyDropdownRef = useRef(null);
  const radiologySearchTimeoutRef = useRef(null);

  // Standalone 3: Other Clinical Services & Procedures
  const [otherServiceOrders, setOtherServiceOrders] = useState([]);
  const [otherServiceName, setOtherServiceName] = useState('');
  const [otherServiceNotes, setOtherServiceNotes] = useState('');
  const [coveredOtherServices, setCoveredOtherServices] = useState([]);
  const [loadingCoveredOtherServices, setLoadingCoveredOtherServices] = useState(false);
  const [showOtherServiceDropdown, setShowOtherServiceDropdown] = useState(false);
  const [selectedOtherServiceTariff, setSelectedOtherServiceTariff] = useState(null);
  const [selectedOtherServiceIndex, setSelectedOtherServiceIndex] = useState(0);
  const otherServiceDropdownRef = useRef(null);
  const otherServiceSearchTimeoutRef = useRef(null);

  // Legacy investigation alias for backward compatibility
  const [investigations, setInvestigations] = useState([]);
  const [investigationName, setInvestigationName] = useState('');

  // Past encounters
  const [pastEncounters, setPastEncounters] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Vitals
  const [vitals, setVitals] = useState(appointment?.today_vitals || null);

  // Presenting Complaints Autocomplete & Directory Search
  const [complaintsList, setComplaintsList] = useState(
    COMMON_COMPLAINTS.map((c) => ({ id: c, name: c, category: 'General' }))
  );
  const [showComplaintDropdown, setShowComplaintDropdown] = useState(false);
  const [searchingComplaints, setSearchingComplaints] = useState(false);
  const [isAddingNewComplaint, setIsAddingNewComplaint] = useState(false);
  const [selectedComplaintIndex, setSelectedComplaintIndex] = useState(0);
  const complaintDropdownRef = useRef(null);
  const complaintTimeoutRef = useRef(null);

  // Diagnosis Autocomplete & Directory Search
  const [diagnosesList, setDiagnosesList] = useState(COMMON_DIAGNOSES);
  const [showDiagnosisDropdown, setShowDiagnosisDropdown] = useState(false);
  const [searchingDiagnoses, setSearchingDiagnoses] = useState(false);
  const [isAddingNewDiagnosis, setIsAddingNewDiagnosis] = useState(false);
  const diagnosisDropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // WHO ICD-11 Integration State
  const [icd11Code, setIcd11Code] = useState('');
  const [icd11SearchResults, setIcd11SearchResults] = useState([]);
  const [showIcd11Dropdown, setShowIcd11Dropdown] = useState(false);
  const [searchingIcd11, setSearchingIcd11] = useState(false);
  const [isImportingIcd11, setIsImportingIcd11] = useState(false);
  const [selectedIcd11Index, setSelectedIcd11Index] = useState(0);
  const [selectedDiagnosisIndex, setSelectedDiagnosisIndex] = useState(0);
  const icd11DropdownRef = useRef(null);
  const icd11TimeoutRef = useRef(null);

  const iframeRef = useRef(null);

  const patientId = patient?.id || patient?.patient_id || patient?.patient || appointment?.patient;
  const token = localStorage.getItem('clinic365_token');
  const legacyConsultationUrl = patientId
    ? token
      ? `/doctor-consultation/${patientId}/?token=${token}`
      : `/doctor-consultation/${patientId}/`
    : '';

  useEffect(() => {
    if (isOpen && patientId) {
      loadPatientConsultationData();
    }
  }, [isOpen, patientId]);

  // Load available presenting complaints library from database
  const loadComplaints = async (search = '') => {
    try {
      setSearchingComplaints(true);
      const data = await api.getComplaints(search ? { search } : {});
      const list = Array.isArray(data) ? data : (data?.results || []);
      if (list.length > 0) {
        setComplaintsList((prev) => {
          const prevNames = new Set(prev.map((c) => (typeof c === 'string' ? c.toLowerCase() : c.name?.toLowerCase())));
          const newItems = list.filter((item) => {
            const name = typeof item === 'string' ? item : item.name;
            return name && !prevNames.has(name.toLowerCase());
          });
          return [...prev, ...newItems];
        });
      }
    } catch (err) {
      console.error('Error fetching complaints library:', err);
    } finally {
      setSearchingComplaints(false);
    }
  };

  // Load available diagnoses library
  const loadDiagnoses = async (search = '') => {
    try {
      setSearchingDiagnoses(true);
      const data = await api.getDiagnoses(search ? { search } : {});
      const list = Array.isArray(data) ? data : (data?.results || []);
      const descriptions = list
        .map((d) => (typeof d === 'string' ? d : d.description))
        .filter(Boolean);
      setDiagnosesList((prev) => {
        const merged = Array.from(new Set([...prev, ...descriptions]));
        return merged;
      });
    } catch (err) {
      console.error('Error fetching diagnoses library:', err);
    } finally {
      setSearchingDiagnoses(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDiagnoses();
      loadComplaints();
    }
  }, [isOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (complaintDropdownRef.current && !complaintDropdownRef.current.contains(e.target)) {
        setShowComplaintDropdown(false);
      }
      if (diagnosisDropdownRef.current && !diagnosisDropdownRef.current.contains(e.target)) {
        setShowDiagnosisDropdown(false);
      }
      if (icd11DropdownRef.current && !icd11DropdownRef.current.contains(e.target)) {
        setShowIcd11Dropdown(false);
      }
      if (drugDropdownRef.current && !drugDropdownRef.current.contains(e.target)) {
        setShowDrugDropdown(false);
      }
      if (labDropdownRef.current && !labDropdownRef.current.contains(e.target)) {
        setShowLabDropdown(false);
      }
      if (radiologyDropdownRef.current && !radiologyDropdownRef.current.contains(e.target)) {
        setShowRadiologyDropdown(false);
      }
      if (otherServiceDropdownRef.current && !otherServiceDropdownRef.current.contains(e.target)) {
        setShowOtherServiceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleDiagnosisChange = (val) => {
    setPrimaryDiagnosis(val);
    if (val.trim()) setDiagnosisError(false);
    setSelectedDiagnosisIndex(0);
    const query = val.trim();
    if (query.length >= 2) {
      setShowDiagnosisDropdown(true);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        loadDiagnoses(query);
      }, 250);
    } else {
      setShowDiagnosisDropdown(false);
    }
  };

  const handleAddNewDiagnosis = async (diagName) => {
    const name = (diagName || primaryDiagnosis).trim();
    if (!name) return;
    try {
      setIsAddingNewDiagnosis(true);
      await api.createDiagnosis({
        description: name,
        category: 'General',
        icd11_code: icd11Code.trim(),
      });
      setDiagnosesList((prev) => (prev.includes(name) ? prev : [name, ...prev]));
      setPrimaryDiagnosis(name);
      setDiagnosisError(false);
      setShowDiagnosisDropdown(false);
      showToast(`Added "${name}" to diagnoses library and selected!`, 'success', 'Diagnosis Added');
    } catch (err) {
      // Keep in local list even if offline/fallback
      setDiagnosesList((prev) => (prev.includes(name) ? prev : [name, ...prev]));
      setPrimaryDiagnosis(name);
      setDiagnosisError(false);
      setShowDiagnosisDropdown(false);
      showToast(`Selected "${name}" as primary diagnosis`, 'info', 'Diagnosis Selected');
    } finally {
      setIsAddingNewDiagnosis(false);
    }
  };

  const handleSelectDiagnosis = (name) => {
    setPrimaryDiagnosis(name);
    setDiagnosisError(false);
    setShowDiagnosisDropdown(false);
  };

  // WHO ICD-11 Search handler
  const handleIcd11Change = (val) => {
    setIcd11Code(val);
    setSelectedIcd11Index(0);
    const query = val.trim();
    if (query.length >= 2) {
      setShowIcd11Dropdown(true);
      if (icd11TimeoutRef.current) clearTimeout(icd11TimeoutRef.current);
      icd11TimeoutRef.current = setTimeout(async () => {
        try {
          setSearchingIcd11(true);
          const results = await api.searchWhoIcd11(query);
          setIcd11SearchResults(results || []);
          setSelectedIcd11Index(0);
        } catch (err) {
          console.error('Error querying WHO ICD-11:', err);
        } finally {
          setSearchingIcd11(false);
        }
      }, 250);
    } else {
      setShowIcd11Dropdown(false);
      setIcd11SearchResults([]);
    }
  };

  // Doctor picks diagnosis from WHO ICD-11
  const handleSelectIcd11Item = async (item) => {
    if (!item) return;
    const code = item.code || '';
    const title = item.title || '';

    // Immediately reflect in UI
    setPrimaryDiagnosis(title);
    setDiagnosisError(false);
    setIcd11Code(code);
    setShowIcd11Dropdown(false);

    try {
      setIsImportingIcd11(true);
      // Persist to local hospital database if not already local
      if (!item.is_local) {
        await api.importIcd11Diagnosis({
          code: code,
          title: title,
          category: item.category || 'WHO ICD-11',
        });
      }
      setDiagnosesList((prev) => (prev.includes(title) ? prev : [title, ...prev]));
      showToast(`Selected "${title}" (ICD-11: ${code}) & saved to directory`, 'success', 'WHO ICD-11 Linked');
    } catch (err) {
      console.error('Error importing ICD-11 item:', err);
      showToast(`Selected "${title}" (ICD-11: ${code})`, 'info', 'Diagnosis Selected');
    } finally {
      setIsImportingIcd11(false);
    }
  };

  // Active patient coverage information
  const currentSponsorName =
    patientDetails?.sponsor_name ||
    patient?.sponsor_name ||
    appointment?.sponsor_name ||
    (typeof patientDetails?.sponsor === 'object' ? patientDetails?.sponsor?.name : '') ||
    '';
  const currentPlanName =
    patientDetails?.plan_name ||
    patient?.plan_name ||
    appointment?.plan_name ||
    (typeof patientDetails?.plan === 'object' ? patientDetails?.plan?.plan : '') ||
    '';

  const patientCategory = (
    patientDetails?.category_name ||
    (typeof patientDetails?.category === 'object' ? patientDetails?.category?.category : '') ||
    patient?.category_name ||
    appointment?.category_name ||
    ''
  ).toLowerCase();

  const sponsorCategory = (
    patientDetails?.sponsor_category ||
    (typeof patientDetails?.sponsor === 'object' && patientDetails?.sponsor?.category
      ? (typeof patientDetails?.sponsor?.category === 'object'
          ? patientDetails?.sponsor?.category?.category
          : patientDetails?.sponsor?.category)
      : '') ||
    patient?.sponsor_category ||
    appointment?.sponsor_category ||
    ''
  ).toLowerCase();

  const isPrivatePatient = Boolean(
    !currentSponsorName ||
    patientCategory.includes('private') ||
    sponsorCategory.includes('private') ||
    currentSponsorName.toLowerCase().includes('private') ||
    currentSponsorName.toLowerCase().includes('self')
  );

  const isHmoPatient = !isPrivatePatient && Boolean(currentSponsorName);

  // Load covered medications attached to this patient's Sponsor and Plan AND general out-of-pocket prices
  const loadPatientMedicationTariffs = async (pId, sId, plId, searchQuery = '') => {
    try {
      setLoadingCoveredMeds(true);
      const coveredParams = { tariff_type: 'covered' };
      if (pId) coveredParams.patient = pId;
      if (sId) coveredParams.sponsor = sId;
      if (plId) coveredParams.plan = plId;
      if (searchQuery) coveredParams.search = searchQuery;

      const [coveredRes, generalRes] = await Promise.all([
        api.getMedicationFees(coveredParams).catch(() => ({ medications: [] })),
        api.getMedicationFees({ tariff_type: 'general', search: searchQuery }).catch(() => ({ medications: [] })),
      ]);

      const coveredList = Array.isArray(coveredRes) ? coveredRes : (coveredRes?.medications || coveredRes?.results || []);
      const generalList = Array.isArray(generalRes) ? generalRes : (generalRes?.medications || generalRes?.results || []);

      setCoveredMedications(coveredList);
      setGeneralMedications(generalList);

      // Auto-set tariffMode: Private patients always default to General Price; HMO patients default to covered
      if (isPrivatePatient) {
        setTariffMode('general');
      } else {
        setTariffMode('covered');
      }
    } catch (err) {
      console.error('Error loading medication tariffs for sponsor/plan & general:', err);
    } finally {
      setLoadingCoveredMeds(false);
    }
  };

  // 1. Load covered laboratory investigation charges attached to this patient's Sponsor and Plan AND general prices
  const loadPatientLabTariffs = async (pId, sId, plId, searchQuery = '') => {
    try {
      setLoadingCoveredLabs(true);
      const coveredParams = { tariff_type: 'covered' };
      if (pId) coveredParams.patient = pId;
      if (sId) coveredParams.sponsor = sId;
      if (plId) coveredParams.plan = plId;
      if (searchQuery) coveredParams.search = searchQuery;

      const [coveredRes, generalRes] = await Promise.all([
        api.getLabCharges(coveredParams).catch(() => ({ charges: [] })),
        api.getLabCharges({ tariff_type: 'general', search: searchQuery }).catch(() => ({ charges: [] })),
      ]);

      const coveredList = Array.isArray(coveredRes) ? coveredRes : (coveredRes?.charges || coveredRes?.results || []);
      const generalList = Array.isArray(generalRes) ? generalRes : (generalRes?.charges || generalRes?.results || []);

      setCoveredLabTariffs(coveredList);
      setGeneralLabTariffs(generalList);

      if (isPrivatePatient) {
        setLabTariffMode('general');
      } else {
        setLabTariffMode('covered');
      }
    } catch (err) {
      console.error('Error loading covered laboratory tariffs for sponsor/plan & general:', err);
    } finally {
      setLoadingCoveredLabs(false);
    }
  };

  // 2. Load covered radiology investigation charges attached to this patient's Sponsor and Plan
  const loadPatientRadiologyTariffs = async (pId, sId, plId, searchQuery = '') => {
    try {
      setLoadingCoveredRadiology(true);
      const params = {};
      if (pId) params.patient = pId;
      if (sId) params.sponsor = sId;
      if (plId) params.plan = plId;
      if (searchQuery) params.search = searchQuery;

      const radRes = await api.getRadiologyCharges(params).catch(() => ({ charges: [] }));
      const radList = radRes?.charges || (Array.isArray(radRes) ? radRes : []);
      setCoveredRadiologyTariffs(radList);
    } catch (err) {
      console.error('Error loading covered radiology tariffs for sponsor/plan:', err);
    } finally {
      setLoadingCoveredRadiology(false);
    }
  };

  // 3. Load covered other clinical services attached to this patient's Sponsor and Plan
  const loadPatientOtherServices = async (pId, sId, plId, searchQuery = '') => {
    try {
      setLoadingCoveredOtherServices(true);
      const params = {};
      if (pId) params.patient = pId;
      if (sId) params.sponsor = sId;
      if (plId) params.plan = plId;
      if (searchQuery) params.search = searchQuery;

      const sRes = await api.getOtherServices(params).catch(() => ({ services: [] }));
      const sList = sRes?.services || sRes?.results || (Array.isArray(sRes) ? sRes : []);
      setCoveredOtherServices(sList);
    } catch (err) {
      console.error('Error loading covered other clinical services for sponsor/plan:', err);
    } finally {
      setLoadingCoveredOtherServices(false);
    }
  };

  const loadPatientConsultationData = async () => {
    try {
      setLoading(true);
      let activePatient = patient;
      try {
        const pRes = await api.getPatient(patientId);
        if (pRes) {
          activePatient = { ...patient, ...pRes };
          setPatientDetails(activePatient);
        }
      } catch (err) {
        console.error('Error fetching patient profile:', err);
      }

      const sponsorId =
        activePatient?.sponsor?.id ||
        (typeof activePatient?.sponsor === 'number' ? activePatient?.sponsor : null) ||
        appointment?.sponsor;
      const planId =
        activePatient?.plan?.id ||
        (typeof activePatient?.plan === 'number' ? activePatient?.plan : null) ||
        appointment?.plan;

      // Concurrently load all 4 departments: medications, lab, radiology & other clinical services
      await Promise.all([
        loadPatientMedicationTariffs(patientId, sponsorId, planId),
        loadPatientLabTariffs(patientId, sponsorId, planId),
        loadPatientRadiologyTariffs(patientId, sponsorId, planId),
        loadPatientOtherServices(patientId, sponsorId, planId),
      ]);

      // Fetch latest vitals if not already attached
      if (!vitals) {
        try {
          const vRes = await api.getVitals({ patient: patientId });
          const list = vRes?.results || vRes || [];
          if (list.length > 0) {
            setVitals(list[0]);
          }
        } catch (_) {}
      }

      // Fetch past encounters
      try {
        setLoadingHistory(true);
        const encRes = await api.getEncounters({ patient: patientId });
        setPastEncounters(encRes?.results || encRes || []);
      } catch (_) {} finally {
        setLoadingHistory(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter covered medications for real-time fast autocomplete
  const activeMedicationsList = tariffMode === 'general' ? generalMedications : coveredMedications;

  const filteredCoveredMeds = useMemo(() => {
    if (!drugName.trim()) return activeMedicationsList;
    const q = drugName.trim().toLowerCase();
    return activeMedicationsList.filter(
      (m) =>
        m.product_name?.toLowerCase().includes(q) ||
        (m.product_id && String(m.product_id).toLowerCase().includes(q)) ||
        (m.sku && String(m.sku).toLowerCase().includes(q)) ||
        (m.product_code && String(m.product_code).toLowerCase().includes(q))
    );
  }, [activeMedicationsList, drugName]);

  const handleDrugInputChange = (val) => {
    setDrugName(val);
    setSelectedMedTariff(null);
    setShowDrugDropdown(true);
    setSelectedDrugIndex(0);

    if (val.trim().length >= 2) {
      if (drugSearchTimeoutRef.current) clearTimeout(drugSearchTimeoutRef.current);
      drugSearchTimeoutRef.current = setTimeout(() => {
        const sponsorId =
          patientDetails?.sponsor?.id ||
          (typeof patientDetails?.sponsor === 'number' ? patientDetails?.sponsor : null) ||
          appointment?.sponsor;
        const planId =
          patientDetails?.plan?.id ||
          (typeof patientDetails?.plan === 'number' ? patientDetails?.plan : null) ||
          appointment?.plan;
        loadPatientMedicationTariffs(patientId, sponsorId, planId, val.trim());
      }, 300);
    }
  };

  const handleDosageFormChange = (newForm) => {
    setDosageForm(newForm);
    const mappedRoute = getOptimalRouteForDrug(drugName, newForm);
    setMedRoute(mappedRoute);
    if (newForm === 'Tablet') {
      setDoseUnit('tab');
      setQtyDose('1');
      setStrength('500mg');
    } else if (newForm === 'Caplet') {
      setDoseUnit('caplet');
      setQtyDose('1');
      setStrength('500mg');
    } else if (newForm === 'Capsule') {
      setDoseUnit('cap');
      setQtyDose('1');
      setStrength('500mg');
    } else if (newForm === 'Syrup' || newForm === 'Suspension') {
      setDoseUnit('ml');
      setQtyDose('10');
      setStrength('120mg - 5ml');
      setIsBottleSizeManual(false);
      const autoSize = getOptimalBottleSize(drugName, newForm, '10', frequency, durationVal, durationUnit);
      setSyrupBottleSize(String(autoSize));
    } else if (newForm === 'Drops') {
      setDoseUnit('drops');
      setQtyDose('3');
      setStrength('100mg - 1ml');
      setIsBottleSizeManual(false);
      setSyrupBottleSize('15');
    } else if (newForm === 'Suppository') {
      setDoseUnit('supp');
      setQtyDose('1');
      setStrength('125mg');
    } else if (newForm === 'Inhaler') {
      setDoseUnit('puffs');
      setQtyDose('2');
      setStrength('100mcg');
    } else if (newForm === 'Sachet') {
      setDoseUnit('sachet');
      setQtyDose('1');
      setStrength('Standard');
    } else if (newForm === 'Injection') {
      setDoseUnit('vial');
      setQtyDose('1');
      setStrength('500mg - 2ml');
    } else if (newForm === 'Ointment') {
      setDoseUnit('tube');
      setQtyDose('1');
      setStrength('15g');
    }
  };

  const handleSelectCoveredDrug = (med) => {
    if (!med) return;
    const name = med.product_name || med.item || '';
    setDrugName(name);
    const isGeneral = tariffMode === 'general' || med.is_general || (!med.sponsor_id && !med.plan_id);
    setSelectedMedTariff({
      ...med,
      is_pay_from_purse: isGeneral,
      payment_source: isGeneral ? 'pay_from_purse' : 'plan_covered',
      payment_label: isGeneral ? 'Pay from your purse' : (med.plan_name || 'Covered Plan'),
    });
    setShowDrugDropdown(false);

    const n = name.toLowerCase();
    const uom = (med.minimum_UoM || med.uom || med.unit || '').toLowerCase();

    // 1. Identify Dosage Form from Database Unit of Measure (UoM) or Drug Name keywords
    let detectedForm = 'Tablet';
    if (uom === 'bottles' || n.includes('syp') || n.includes('syrup') || n.includes('susp') || n.includes('liquid') || n.includes('elixir')) {
      detectedForm = 'Syrup';
    } else if (uom === 'drops' || n.includes('drop') || n.includes('gutt')) {
      detectedForm = 'Drops';
    } else if (uom === 'capsules' || n.includes('capsule') || (n.includes('cap ') && !n.includes('caplet')) || n.endsWith(' cap')) {
      detectedForm = 'Capsule';
    } else if (n.includes('caplet')) {
      detectedForm = 'Caplet';
    } else if (uom === 'sachets' || n.includes('sachet') || n.includes('powder') || n.includes('ors')) {
      detectedForm = 'Sachet';
    } else if (uom === 'suppository' || n.includes('supp') || n.includes('pessary')) {
      detectedForm = 'Suppository';
    } else if (uom === 'ampoules' || uom === 'vial' || uom === 'syringes' || n.includes('inj') || n.includes('iv ') || n.includes('im ') || n.includes('infusion')) {
      detectedForm = 'Injection';
    } else if (uom === 'puffs' || n.includes('inhal') || n.includes('puff') || n.includes('rotahaler')) {
      detectedForm = 'Inhaler';
    } else if (uom === 'tubes' || n.includes('ointment') || n.includes('cream') || n.includes('gel')) {
      detectedForm = 'Ointment';
    } else {
      detectedForm = 'Tablet';
    }

    handleDosageFormChange(detectedForm);
    const optimalRoute = getOptimalRouteForDrug(name, detectedForm);
    setMedRoute(optimalRoute);
    setIsBottleSizeManual(false);

    // 2. Intelligently extract Strength from the drug name if present
    // Matches e.g. "120mg/5ml", "250mg - 5ml", "500mg", "625mg", "1g", "50mcg", "15g", "10ml"
    const strengthMatch = name.match(/(\d+(?:\.\d+)?\s*(?:mg|g|mcg|iu|%)\s*(?:[\/-]\s*\d+\s*ml)?|\d+\s*ml)/i);
    if (strengthMatch) {
      const cleanStrength = strengthMatch[1].replace('/', ' - ').replace(/\s+/g, ' ').trim();
      setStrength(cleanStrength);
    } else {
      // Default standard strength per form if not found in name
      if (detectedForm === 'Syrup') setStrength('120mg - 5ml');
      else if (detectedForm === 'Drops') setStrength('100mg - 1ml');
      else if (detectedForm === 'Inhaler') setStrength('100mcg');
      else if (detectedForm === 'Suppository') setStrength('125mg');
      else if (detectedForm === 'Injection') setStrength('500mg - 2ml');
      else if (detectedForm === 'Ointment') setStrength('15g');
      else if (detectedForm === 'Sachet') setStrength('Standard');
      else setStrength('500mg');
    }

    // 3. Automatically determine and set the optimal hospital bottle size to dispense
    if (['Syrup', 'Suspension', 'Drops'].includes(detectedForm)) {
      const autoSize = getOptimalBottleSize(name, detectedForm, qtyDose, frequency, durationVal, durationUnit);
      setSyrupBottleSize(String(autoSize));
    }
  };

  const handleDrugKeyDown = (e) => {
    if (!showDrugDropdown || filteredCoveredMeds.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedDrugIndex((prev) => (prev < filteredCoveredMeds.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedDrugIndex((prev) => (prev > 0 ? prev - 1 : filteredCoveredMeds.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCoveredMeds[selectedDrugIndex]) {
        handleSelectCoveredDrug(filteredCoveredMeds[selectedDrugIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDrugDropdown(false);
    }
  };

  // 1. Filter active laboratory charges for real-time fast autocomplete
  const activeLabTariffList = labTariffMode === 'general' ? generalLabTariffs : coveredLabTariffs;

  const filteredCoveredLabs = useMemo(() => {
    const query = (labTestName || investigationName).trim().toLowerCase();
    if (!query) return activeLabTariffList;
    return activeLabTariffList.filter(
      (l) =>
        l.item?.toLowerCase().includes(query) ||
        (l.item_id && l.item_id.toLowerCase().includes(query))
    );
  }, [activeLabTariffList, labTestName, investigationName]);

  const handleLabInputChange = (val) => {
    setLabTestName(val);
    setInvestigationName(val);
    setSelectedLabTariff(null);
    setShowLabDropdown(true);
    setSelectedLabIndex(0);

    if (val.trim().length >= 2) {
      if (labSearchTimeoutRef.current) clearTimeout(labSearchTimeoutRef.current);
      labSearchTimeoutRef.current = setTimeout(() => {
        const sponsorId =
          patientDetails?.sponsor?.id ||
          (typeof patientDetails?.sponsor === 'number' ? patientDetails?.sponsor : null) ||
          appointment?.sponsor;
        const planId =
          patientDetails?.plan?.id ||
          (typeof patientDetails?.plan === 'number' ? patientDetails?.plan : null) ||
          appointment?.plan;
        loadPatientLabTariffs(patientId, sponsorId, planId, val.trim());
      }, 300);
    }
  };

  const handleSelectCoveredLab = (lab) => {
    if (!lab) return;
    setLabTestName(lab.item);
    setInvestigationName(lab.item);
    const isGeneral = labTariffMode === 'general' || lab.is_general || (!lab.sponsor_id && !lab.plan_id);
    setSelectedLabTariff({
      ...lab,
      is_pay_from_purse: isGeneral,
      payment_source: isGeneral ? 'pay_from_purse' : 'plan_covered',
      payment_label: isGeneral ? 'Pay from your purse' : (lab.plan_name || 'Covered Plan'),
    });
    setShowLabDropdown(false);
  };

  const handleLabKeyDown = (e) => {
    if (!showLabDropdown || filteredCoveredLabs.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedLabIndex((prev) => (prev < filteredCoveredLabs.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedLabIndex((prev) => (prev > 0 ? prev - 1 : filteredCoveredLabs.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCoveredLabs[selectedLabIndex]) {
        handleSelectCoveredLab(filteredCoveredLabs[selectedLabIndex]);
      } else {
        handleAddLabOrder();
      }
    } else if (e.key === 'Escape') {
      setShowLabDropdown(false);
    }
  };

  // 2. Filter covered radiology charges for real-time fast autocomplete
  const filteredCoveredRadiology = useMemo(() => {
    const query = radiologyScanName.trim().toLowerCase();
    if (!query) return coveredRadiologyTariffs;
    return coveredRadiologyTariffs.filter(
      (r) =>
        r.item?.toLowerCase().includes(query) ||
        (r.item_id && r.item_id.toLowerCase().includes(query))
    );
  }, [coveredRadiologyTariffs, radiologyScanName]);

  const handleRadiologyInputChange = (val) => {
    setRadiologyScanName(val);
    setSelectedRadiologyTariff(null);
    setShowRadiologyDropdown(true);
    setSelectedRadiologyIndex(0);

    if (val.trim().length >= 2) {
      if (radiologySearchTimeoutRef.current) clearTimeout(radiologySearchTimeoutRef.current);
      radiologySearchTimeoutRef.current = setTimeout(() => {
        const sponsorId =
          patientDetails?.sponsor?.id ||
          (typeof patientDetails?.sponsor === 'number' ? patientDetails?.sponsor : null) ||
          appointment?.sponsor;
        const planId =
          patientDetails?.plan?.id ||
          (typeof patientDetails?.plan === 'number' ? patientDetails?.plan : null) ||
          appointment?.plan;
        loadPatientRadiologyTariffs(patientId, sponsorId, planId, val.trim());
      }, 300);
    }
  };

  const handleSelectCoveredRadiology = (rad) => {
    if (!rad) return;
    setRadiologyScanName(rad.item);
    setSelectedRadiologyTariff(rad);
    setShowRadiologyDropdown(false);
  };

  const handleRadiologyKeyDown = (e) => {
    if (!showRadiologyDropdown || filteredCoveredRadiology.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedRadiologyIndex((prev) => (prev < filteredCoveredRadiology.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedRadiologyIndex((prev) => (prev > 0 ? prev - 1 : filteredCoveredRadiology.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCoveredRadiology[selectedRadiologyIndex]) {
        handleSelectCoveredRadiology(filteredCoveredRadiology[selectedRadiologyIndex]);
      } else {
        handleAddRadiologyOrder();
      }
    } else if (e.key === 'Escape') {
      setShowRadiologyDropdown(false);
    }
  };

  // 3. Filter covered other clinical services for real-time fast autocomplete
  const filteredCoveredOtherServices = useMemo(() => {
    const query = otherServiceName.trim().toLowerCase();
    if (!query) return coveredOtherServices;
    return coveredOtherServices.filter(
      (s) =>
        (s.service || s.item)?.toLowerCase().includes(query) ||
        ((s.service_id || s.item_id) && (s.service_id || s.item_id).toLowerCase().includes(query))
    );
  }, [coveredOtherServices, otherServiceName]);

  // Total consultation bill amount across all 4 departments (Drugs, Lab, Radiology, Other Services)
  const totalConsultationBill = useMemo(() => {
    let sum = 0;
    prescriptions.forEach((p) => {
      const q = Number(p.dispense_quantity || 1);
      const r = Number(p.tariff_rate || 0);
      sum += (q * r);
    });
    labOrders.forEach((l) => {
      sum += Number(l.tariff_rate || 0);
    });
    radiologyOrders.forEach((r) => {
      sum += Number(r.tariff_rate || 0);
    });
    otherServiceOrders.forEach((s) => {
      sum += Number(s.tariff_rate || 0);
    });
    return sum;
  }, [prescriptions, labOrders, radiologyOrders, otherServiceOrders]);

  const totalBillableCount = prescriptions.length + labOrders.length + radiologyOrders.length + otherServiceOrders.length;

  const handleOtherServiceInputChange = (val) => {
    setOtherServiceName(val);
    setSelectedOtherServiceTariff(null);
    setShowOtherServiceDropdown(true);
    setSelectedOtherServiceIndex(0);

    if (val.trim().length >= 2) {
      if (otherServiceSearchTimeoutRef.current) clearTimeout(otherServiceSearchTimeoutRef.current);
      otherServiceSearchTimeoutRef.current = setTimeout(() => {
        const sponsorId =
          patientDetails?.sponsor?.id ||
          (typeof patientDetails?.sponsor === 'number' ? patientDetails?.sponsor : null) ||
          appointment?.sponsor;
        const planId =
          patientDetails?.plan?.id ||
          (typeof patientDetails?.plan === 'number' ? patientDetails?.plan : null) ||
          appointment?.plan;
        loadPatientOtherServices(patientId, sponsorId, planId, val.trim());
      }, 300);
    }
  };

  const handleSelectCoveredOtherService = (service) => {
    if (!service) return;
    setOtherServiceName(service.service || service.item);
    setSelectedOtherServiceTariff(service);
    setShowOtherServiceDropdown(false);
  };

  const handleOtherServiceKeyDown = (e) => {
    if (!showOtherServiceDropdown || filteredCoveredOtherServices.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedOtherServiceIndex((prev) => (prev < filteredCoveredOtherServices.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedOtherServiceIndex((prev) => (prev > 0 ? prev - 1 : filteredCoveredOtherServices.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCoveredOtherServices[selectedOtherServiceIndex]) {
        handleSelectCoveredOtherService(filteredCoveredOtherServices[selectedOtherServiceIndex]);
      } else {
        handleAddOtherServiceOrder();
      }
    } else if (e.key === 'Escape') {
      setShowOtherServiceDropdown(false);
    }
  };

  const handleComplaintChange = (val) => {
    setCustomComplaint(val);
    setSelectedComplaintIndex(0);
    const query = val.trim();
    if (query.length >= 1) {
      setShowComplaintDropdown(true);
      if (complaintTimeoutRef.current) clearTimeout(complaintTimeoutRef.current);
      complaintTimeoutRef.current = setTimeout(() => {
        loadComplaints(query);
      }, 250);
    } else {
      setShowComplaintDropdown(true);
    }
  };

  const handleSelectComplaintItem = (item) => {
    const name = typeof item === 'string' ? item : item.name;
    if (!name) return;
    const trimmed = name.trim();
    if (!selectedComplaints.includes(trimmed)) {
      setSelectedComplaints((prev) => [...prev, trimmed]);
    }
    setCustomComplaint('');
    setShowComplaintDropdown(false);
  };

  const handleAddNewComplaint = async (compName) => {
    const name = (compName || customComplaint).trim();
    if (!name) return;

    if (selectedComplaints.includes(name)) {
      setCustomComplaint('');
      setShowComplaintDropdown(false);
      return;
    }

    try {
      setIsAddingNewComplaint(true);
      const res = await api.createComplaint({
        name: name,
        category: 'general',
      });
      const createdItem = res?.data || res || { name, category: 'General' };
      setComplaintsList((prev) => [
        createdItem,
        ...prev.filter((c) => (typeof c === 'string' ? c : c.name)?.toLowerCase() !== name.toLowerCase()),
      ]);
      setSelectedComplaints((prev) => (prev.includes(name) ? prev : [...prev, name]));
      setCustomComplaint('');
      setShowComplaintDropdown(false);
      showToast(`Added "${name}" to hospital complaints database & selected!`, 'success', 'Complaint Saved');
    } catch (err) {
      console.error('Error saving complaint to database:', err);
      setSelectedComplaints((prev) => (prev.includes(name) ? prev : [...prev, name]));
      setComplaintsList((prev) => [{ name, category: 'General' }, ...prev]);
      setCustomComplaint('');
      setShowComplaintDropdown(false);
      showToast(`Selected "${name}"`, 'info', 'Complaint Selected');
    } finally {
      setIsAddingNewComplaint(false);
    }
  };

  const handleAddComplaint = (comp) => {
    if (!comp || !comp.trim()) return;
    const trimmed = comp.trim();
    if (!selectedComplaints.includes(trimmed)) {
      setSelectedComplaints([...selectedComplaints, trimmed]);
    }
    setCustomComplaint('');
    setShowComplaintDropdown(false);
  };

  const handleRemoveComplaint = (comp) => {
    setSelectedComplaints(selectedComplaints.filter((c) => c !== comp));
  };

  // Automatically calculate & pick optimal Hospital Bottle Size for syrups, suspensions, drops
  useEffect(() => {
    if (['Syrup', 'Suspension', 'Drops'].includes(dosageForm) && !isBottleSizeManual) {
      const autoSize = getOptimalBottleSize(drugName, dosageForm, qtyDose, frequency, durationVal, durationUnit);
      if (autoSize && String(syrupBottleSize) !== String(autoSize)) {
        setSyrupBottleSize(String(autoSize));
      }
    }
  }, [drugName, dosageForm, qtyDose, frequency, durationVal, durationUnit, isBottleSizeManual]);

  // Real-time Pharmacy Dispensing Calculator
  const calculateDispense = () => {
    let timesPerDay = 1;
    const freqLower = (frequency || '').toLowerCase();
    if (freqLower.includes('bd') || freqLower.includes('twice') || freqLower.includes('12 hourly') || freqLower.includes('12-hourly')) {
      timesPerDay = 2;
    } else if (freqLower.includes('tds') || freqLower.includes('three') || freqLower.includes('8 hourly') || freqLower.includes('8-hourly')) {
      timesPerDay = 3;
    } else if (freqLower.includes('qds') || freqLower.includes('four') || freqLower.includes('6 hourly') || freqLower.includes('6-hourly')) {
      timesPerDay = 4;
    } else if (freqLower.includes('q4h') || freqLower.includes('4 hourly') || freqLower.includes('every 4 hours')) {
      timesPerDay = 6;
    } else if (freqLower.includes('q2h') || freqLower.includes('2 hourly')) {
      timesPerDay = 12;
    } else if (freqLower.includes('hourly')) {
      timesPerDay = 24;
    } else if (freqLower.includes('alt die') || freqLower.includes('other day')) {
      timesPerDay = 0.5;
    } else if (freqLower.includes('weekly')) {
      timesPerDay = 1 / 7;
    } else if (freqLower.includes('stat') || freqLower.includes('single')) {
      timesPerDay = 1;
    } else {
      timesPerDay = 1;
    }

    const durVal = Math.max(1, Number(durationVal) || 1);
    let dayMultiplier = 1;
    if (durationUnit === 'Week(s)') dayMultiplier = 7;
    else if (durationUnit === 'Month(s)') dayMultiplier = 30;

    const totalDays = freqLower.includes('stat') ? 1 : Math.round(durVal * dayMultiplier);
    const numDose = Math.max(0.1, Number(qtyDose) || 1);

    const isLiquid = ['Syrup', 'Suspension', 'Solution', 'Elixir'].includes(dosageForm);
    const isDrops = dosageForm === 'Drops';

    if (isLiquid) {
      const totalVolumeMl = Math.round(numDose * timesPerDay * totalDays);
      const bSize = Math.max(1, Number(syrupBottleSize) || 100);
      const bottlesNeeded = Math.max(1, Math.ceil(totalVolumeMl / bSize));
      return {
        type: 'liquid',
        totalVolumeMl,
        bottleSize: bSize,
        bottlesNeeded,
        dispenseQuantity: bottlesNeeded,
        dispenseUnit: 'Bottles',
        dispenseText: `${totalVolumeMl} ml (${bottlesNeeded} x ${bSize}ml Bottle${bottlesNeeded > 1 ? 's' : ''})`,
        instructionDetail: `Total volume: ${totalVolumeMl}ml. Dispense ${bottlesNeeded} bottle(s) of ${bSize}ml to patient.`,
        timesPerDay,
        totalDays,
      };
    } else if (isDrops) {
      const totalDrops = Math.round(numDose * timesPerDay * totalDays);
      const bSize = Math.max(1, Number(syrupBottleSize) || 15);
      const bottlesNeeded = Math.max(1, Math.ceil(totalDrops / (bSize * 20)));
      return {
        type: 'drops',
        totalDrops,
        bottleSize: bSize,
        bottlesNeeded,
        dispenseQuantity: bottlesNeeded,
        dispenseUnit: 'Bottles',
        dispenseText: `${bottlesNeeded} x ${bSize}ml Bottle${bottlesNeeded > 1 ? 's' : ''} (${totalDrops} drops)`,
        instructionDetail: `Total drops: ${totalDrops}. Dispense ${bottlesNeeded} bottle(s)`,
        timesPerDay,
        totalDays,
      };
    } else {
      // Solid forms: Tablets, Caplets, Capsules, Suppositories, Sachets
      const totalPieces = Math.ceil(numDose * timesPerDay * totalDays);
      const pieceLabel =
        dosageForm === 'Capsule'
          ? 'Capsules'
          : dosageForm === 'Caplet'
          ? 'Caplets'
          : dosageForm === 'Suppository'
          ? 'Suppositories'
          : dosageForm === 'Sachet'
          ? 'Sachets'
          : 'Tablets';
      return {
        type: 'pieces',
        totalPieces,
        dispenseQuantity: totalPieces,
        dispenseUnit: 'Pieces',
        dispenseText: `${totalPieces} ${pieceLabel} (Pieces)`,
        instructionDetail: `Dispense ${totalPieces} pieces (${pieceLabel}) to patient.`,
        timesPerDay,
        totalDays,
      };
    }
  };

  const handleAddPrescription = () => {
    if (!drugName.trim()) {
      showToast('Please select or enter a medication name', 'warning');
      return;
    }

    // Match if selectedMedTariff or match by name in active med list or general list
    const matchedTariff =
      selectedMedTariff ||
      (tariffMode === 'general' ? generalMedications : coveredMedications).find(
        (m) => m.product_name?.toLowerCase() === drugName.trim().toLowerCase()
      ) ||
      generalMedications.find(
        (m) => m.product_name?.toLowerCase() === drugName.trim().toLowerCase()
      );

    const isPayFromPurse = Boolean(
      selectedMedTariff?.is_pay_from_purse ||
      tariffMode === 'general' ||
      matchedTariff?.is_general ||
      (!matchedTariff?.sponsor_id && !matchedTariff?.plan_id)
    );

    const calc = calculateDispense();
    const durationText = `${durationVal} ${durationUnit}`;
    const cleanDose = `${qtyDose} ${doseUnit}${strength ? ` (${strength})` : ''}`;

    setPrescriptions([
      ...prescriptions,
      {
        id: Date.now(),
        drug: drugName.trim(),
        dosage_form: dosageForm,
        route: medRoute || 'Oral',
        strength: strength.trim(),
        dose_qty: qtyDose,
        dose_unit: doseUnit,
        dosage: cleanDose,
        frequency,
        duration: durationText,
        duration_val: durationVal,
        duration_unit: durationUnit,
        start_date: startDate,
        comment: medComment.trim(),
        dispense_type: calc.type,
        dispense_unit: calc.dispenseUnit,
        dispense_quantity: calc.dispenseQuantity,
        dispense_detail: calc.dispenseText,
        dispense_summary: calc.instructionDetail,
        tariff_rate: matchedTariff ? matchedTariff.rate : null,
        plan_name: isPayFromPurse ? 'General Tariff' : (matchedTariff ? matchedTariff.plan_name : null),
        sponsor_name: isPayFromPurse ? 'Self-Pay' : (matchedTariff ? matchedTariff.sponsor_name : null),
        sku: matchedTariff ? (matchedTariff.sku || matchedTariff.product_id) : null,
        is_covered: !isPayFromPurse && Boolean(matchedTariff),
        is_pay_from_purse: isPayFromPurse,
        payment_mode: isPayFromPurse ? 'pay_from_purse' : 'covered',
        payment_label: isPayFromPurse ? 'Pay from your purse' : 'Covered Plan',
      },
    ]);
    setDrugName('');
    setSelectedMedTariff(null);
    setMedComment('');
    setIsBottleSizeManual(false);
    setMedRoute(DOSAGE_FORM_ROUTES_MAP[dosageForm]?.defaultRoute || 'Oral');
    showToast(`Added ${drugName.trim()} to prescription (${calc.dispenseText})`, 'success');
  };

  const handleRemovePrescription = (id) => {
    setPrescriptions(prescriptions.filter((p) => p.id !== id));
  };

  // 1. Standalone Laboratory Order handlers
  const handleAddLabOrder = (testItem = null) => {
    const activeList = labTariffMode === 'general' ? generalLabTariffs : coveredLabTariffs;
    const matchedTariff =
      testItem ||
      selectedLabTariff ||
      activeList.find(
        (l) => l.item?.toLowerCase() === (testItem?.item || labTestName || investigationName).trim().toLowerCase()
      ) ||
      generalLabTariffs.find(
        (l) => l.item?.toLowerCase() === (testItem?.item || labTestName || investigationName).trim().toLowerCase()
      );

    const testName = (testItem?.item || matchedTariff?.item || labTestName || investigationName).trim();
    if (!testName) {
      showToast('Please select or enter a laboratory investigation test', 'warning');
      return;
    }

    if (labOrders.some((inv) => inv.test.toLowerCase() === testName.toLowerCase())) {
      showToast(`"${testName}" is already in ordered laboratory tests.`, 'info');
      setLabTestName('');
      setInvestigationName('');
      setSelectedLabTariff(null);
      setShowLabDropdown(false);
      return;
    }

    const isPayFromPurse = Boolean(
      selectedLabTariff?.is_pay_from_purse ||
      labTariffMode === 'general' ||
      matchedTariff?.is_general ||
      (!matchedTariff?.sponsor_id && !matchedTariff?.plan_id && matchedTariff)
    );

    const newOrder = {
      id: Date.now(),
      test: testName,
      item_id: matchedTariff ? matchedTariff.item_id : null,
      tariff_rate: matchedTariff ? matchedTariff.rate : null,
      plan_name: isPayFromPurse ? 'General Tariff' : (matchedTariff ? matchedTariff.plan_name : null),
      sponsor_name: isPayFromPurse ? 'Self-Pay' : (matchedTariff ? matchedTariff.sponsor_name : null),
      is_covered: !isPayFromPurse && Boolean(matchedTariff),
      is_pay_from_purse: isPayFromPurse,
      payment_mode: isPayFromPurse ? 'pay_from_purse' : 'covered',
      payment_label: isPayFromPurse ? 'Pay from your purse' : (matchedTariff?.plan_name || 'Covered Plan'),
      comment: isPayFromPurse ? '[Pay from your purse]' : '',
    };

    setLabOrders((prev) => [...prev, newOrder]);
    setInvestigations((prev) => [...prev, { ...newOrder, categoryType: 'lab' }]);
    setLabTestName('');
    setInvestigationName('');
    setSelectedLabTariff(null);
    setShowLabDropdown(false);
  };

  const handleRemoveLabOrder = (id) => {
    setLabOrders((prev) => prev.filter((i) => i.id !== id));
    setInvestigations((prev) => prev.filter((i) => i.id !== id));
  };

  // 2. Standalone Radiology & Scans Order handlers
  const handleAddRadiologyOrder = (scanItem = null) => {
    const matchedTariff =
      scanItem ||
      selectedRadiologyTariff ||
      coveredRadiologyTariffs.find(
        (r) => r.item?.toLowerCase() === (scanItem?.item || radiologyScanName).trim().toLowerCase()
      );

    const scanName = (scanItem?.item || matchedTariff?.item || radiologyScanName).trim();
    if (!scanName) {
      showToast('Please select or enter a radiology scan or imaging investigation', 'warning');
      return;
    }

    if (radiologyOrders.some((r) => r.scan.toLowerCase() === scanName.toLowerCase())) {
      showToast(`"${scanName}" is already in ordered radiology scans.`, 'info');
      setRadiologyScanName('');
      setSelectedRadiologyTariff(null);
      setShowRadiologyDropdown(false);
      return;
    }

    const newOrder = {
      id: Date.now(),
      scan: scanName,
      item_id: matchedTariff ? matchedTariff.item_id : null,
      tariff_rate: matchedTariff ? matchedTariff.rate : null,
      plan_name: matchedTariff ? matchedTariff.plan_name : null,
      sponsor_name: matchedTariff ? matchedTariff.sponsor_name : null,
      is_covered: Boolean(matchedTariff),
    };

    setRadiologyOrders((prev) => [...prev, newOrder]);
    setRadiologyScanName('');
    setSelectedRadiologyTariff(null);
    setShowRadiologyDropdown(false);
  };

  const handleRemoveRadiologyOrder = (id) => {
    setRadiologyOrders((prev) => prev.filter((r) => r.id !== id));
  };

  // 3. Standalone Other Clinical Services Order handlers
  const handleAddOtherServiceOrder = (serviceItem = null) => {
    const matchedTariff =
      serviceItem ||
      selectedOtherServiceTariff ||
      coveredOtherServices.find(
        (s) => (s.service || s.item)?.toLowerCase() === (serviceItem?.service || serviceItem?.item || otherServiceName).trim().toLowerCase()
      );

    const serviceName = (
      serviceItem?.service ||
      serviceItem?.item ||
      matchedTariff?.service ||
      matchedTariff?.item ||
      otherServiceName
    ).trim();

    if (!serviceName) {
      showToast('Please select or enter a clinical service or procedure', 'warning');
      return;
    }

    if (otherServiceOrders.some((s) => s.service.toLowerCase() === serviceName.toLowerCase())) {
      showToast(`"${serviceName}" is already in ordered clinical services.`, 'info');
      setOtherServiceName('');
      setOtherServiceNotes('');
      setSelectedOtherServiceTariff(null);
      setShowOtherServiceDropdown(false);
      return;
    }

    const newOrder = {
      id: Date.now(),
      service: serviceName,
      service_id: matchedTariff ? (matchedTariff.service_id || matchedTariff.item_id) : null,
      tariff_rate: matchedTariff ? matchedTariff.rate : null,
      plan_name: matchedTariff ? matchedTariff.plan_name : null,
      sponsor_name: matchedTariff ? matchedTariff.sponsor_name : null,
      notes: otherServiceNotes.trim(),
      is_covered: Boolean(matchedTariff),
    };

    setOtherServiceOrders((prev) => [...prev, newOrder]);
    setOtherServiceName('');
    setOtherServiceNotes('');
    setSelectedOtherServiceTariff(null);
    setShowOtherServiceDropdown(false);
  };

  const handleRemoveOtherServiceOrder = (id) => {
    setOtherServiceOrders((prev) => prev.filter((s) => s.id !== id));
  };

  // Legacy aliases
  const handleAddInvestigation = handleAddLabOrder;
  const handleRemoveInvestigation = handleRemoveLabOrder;

  const handleSaveConsultation = async (isCompleting = false) => {
    if (!primaryDiagnosis.trim()) {
      setDiagnosisError(true);
      if (activeTab !== 'notes') {
        setActiveTab('notes');
      }
      showToast(
        'Primary Diagnosis is compulsory! Please select or enter a diagnosis to proceed.',
        'warning',
        'Diagnosis Compulsory'
      );
      if (diagnosisDropdownRef.current) {
        const input = diagnosisDropdownRef.current.querySelector('input');
        if (input) input.focus();
      }
      return;
    }
    setDiagnosisError(false);

    try {
      setSaving(true);
      const complaintsString = selectedComplaints.join(', ');
      const combinedHistory = [
        historyOfIllness ? `HPI: ${historyOfIllness}` : '',
        physicalExam ? `EXAMINATION: ${physicalExam}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const combinedComments = [
        diagnosisComments ? `DIAGNOSIS NOTES: ${diagnosisComments}` : '',
        treatmentPlan ? `TREATMENT PLAN: ${treatmentPlan}` : '',
        followUpDate ? `FOLLOW-UP: ${followUpDate}` : '',
        prescriptions.length > 0
          ? `PRESCRIPTIONS:\n${prescriptions
              .map((p, i) => {
                const planTag = p.is_covered
                  ? ` [Covered: ₦${Number(p.tariff_rate).toLocaleString()} under ${p.plan_name || 'HMO Plan'}]`
                  : ' [Out-of-Pocket / Non-Tariff]';
                const disp = p.dispense_detail ? ` - Dispense: ${p.dispense_detail}` : '';
                const cmt = p.comment ? ` (Note: ${p.comment})` : '';
                const routeTag = p.route ? ` via ${p.route}` : '';
                return `${i + 1}. ${p.drug} [${p.dosage_form || 'Tablet'}${p.strength ? ` ${p.strength}` : ''}${routeTag}] - ${p.dosage}, ${p.frequency}, ${p.duration}${cmt}${disp}${planTag}`;
              })
              .join('\n')}`
          : '',
        labOrders.length > 0
          ? `LABORATORY ORDERS:\n${labOrders
              .map((l, i) => {
                const tag = l.is_covered
                  ? ` [Covered: ₦${Number(l.tariff_rate).toLocaleString()} under ${l.plan_name || 'HMO Plan'}]`
                  : ' [Out-of-Pocket]';
                return `${i + 1}. ${l.test}${l.item_id ? ` (${l.item_id})` : ''}${tag}`;
              })
              .join('\n')}`
          : '',
        radiologyOrders.length > 0
          ? `RADIOLOGY & IMAGING ORDERS:\n${radiologyOrders
              .map((r, i) => {
                const tag = r.is_covered
                  ? ` [Covered: ₦${Number(r.tariff_rate).toLocaleString()} under ${r.plan_name || 'HMO Plan'}]`
                  : ' [Out-of-Pocket]';
                return `${i + 1}. ${r.scan}${r.item_id ? ` (${r.item_id})` : ''}${tag}`;
              })
              .join('\n')}`
          : '',
        otherServiceOrders.length > 0
          ? `OTHER CLINICAL SERVICES:\n${otherServiceOrders
              .map((s, i) => {
                const tag = s.is_covered
                  ? ` [Covered: ₦${Number(s.tariff_rate).toLocaleString()} under ${s.plan_name || 'HMO Plan'}]`
                  : ' [Out-of-Pocket]';
                const notesTag = s.notes ? ` - Instructions: ${s.notes}` : '';
                return `${i + 1}. ${s.service}${s.service_id ? ` (${s.service_id})` : ''}${notesTag}${tag}`;
              })
              .join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const finalDiagnosis = primaryDiagnosis.trim()
        ? (icd11Code.trim() ? `${primaryDiagnosis.trim()} [ICD-11: ${icd11Code.trim()}]` : primaryDiagnosis.trim())
        : '';

      await api.createEncounter({
        patient: patientId,
        chief_complaint: complaintsString,
        history_of_present_illness: combinedHistory,
        diagnosis: finalDiagnosis,
        comments_on_diagnosis: combinedComments,
      });

      // Also persist structured prescriptions to database so Pharmacy Queue immediately has the exact pieces/bottles!
      if (prescriptions.length > 0) {
        try {
          await api.bulkSavePrescriptions({
            patient_id: patientId,
            prescriptions: prescriptions.map((p) => ({
              drug: p.drug,
              dosage_form: p.dosage_form,
              route: p.route || 'Oral',
              strength: p.strength,
              dose_qty: p.dose_qty,
              dose_unit: p.dose_unit,
              frequency: p.frequency,
              duration: p.duration_val || p.duration,
              duration_unit: p.duration_unit,
              dispense_unit: p.dispense_unit,
              dispense_quantity: p.dispense_quantity,
              dispense_detail: p.dispense_detail,
              comment: p.comment,
              start_date: p.start_date,
              instruction: `${p.dose_qty} ${p.dose_unit} via ${p.route || 'Oral'}, ${p.frequency} for ${p.duration}${p.comment ? ` - ${p.comment}` : ''}`,
            })),
          });
        } catch (rxErr) {
          console.warn('Prescriptions saved in consultation notes, error syncing to pharmacy queue:', rxErr);
        }
      }

      // Route all prescribed drugs, lab tests, radiology scans & other clinical services to Billings for payment!
      const hasBillableItems =
        prescriptions.length > 0 ||
        labOrders.length > 0 ||
        radiologyOrders.length > 0 ||
        otherServiceOrders.length > 0;

      let billResult = null;
      if (hasBillableItems) {
        try {
          billResult = await api.saveConsultationOrders({
            patient_id: patientId,
            prescriptions,
            lab_orders: labOrders,
            radiology_orders: radiologyOrders,
            other_service_orders: otherServiceOrders,
          });
          console.log('Consultation orders routed to Encounters Billing:', billResult);
        } catch (billErr) {
          console.error('Error routing consultation orders to billing:', billErr);
        }
      }

      // If completing, also complete the appointment if appointment ID exists
      if (isCompleting && appointment?.id) {
        try {
          await api.completeAppointment(appointment.id);
        } catch (_) {}
      }

      const billMsg = billResult && billResult.total_items
        ? ` (${billResult.total_items} clinical item(s) routed to Billing Queue for cashier)`
        : '';

      showToast(
        isCompleting
          ? `Doctor Consultation for ${patientName} completed successfully!${billMsg}`
          : `Consultation clinical notes saved successfully!${billMsg}`,
        'success',
        isCompleting ? 'Consultation Completed & Routed to Billing' : 'Encounter Saved'
      );

      if (onConsultationFinished) {
        onConsultationFinished();
      }

      if (isCompleting) {
        onClose();
      }
    } catch (err) {
      console.error('Error saving consultation:', err);
      showToast(err.response?.data?.detail || err.message || 'Error saving consultation', 'danger', 'Save Error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !patient) return null;

  const patientName =
    (patient.surname ? `${patient.surname} ${patient.first_name || ''} ${patient.other_name || ''}`.trim() : null) ||
    patient.patient_name ||
    'Patient';
  const hospitalNumber = patient.hospital_number || 'N/A';

  return (
    <>
      <div className="modal-backdrop-custom" style={{ zIndex: 1060 }} onClick={onClose} />
      <div
        className="card shadow-lg modal-custom"
        style={{
          zIndex: 1070,
          maxWidth: '1240px',
          width: '96vw',
          height: '92vh',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '12px',
        }}
      >
        {/* Header */}
        <div
          className="card-header py-3 px-4 text-white d-flex justify-content-between align-items-center flex-shrink-0 flex-wrap"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #1e3a8a 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 18px rgba(15, 23, 42, 0.25)',
            gap: '12px',
          }}
        >
          <div className="d-flex align-items-center flex-wrap" style={{ gap: '14px' }}>
            <div
              className="d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.35) 0%, rgba(37, 99, 235, 0.5) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#60a5fa',
                fontSize: '1.25rem',
              }}
            >
              <i className="fas fa-user-md text-white"></i>
            </div>
            <div>
              <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                <h5 className="m-0 font-weight-bold text-white" style={{ fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                  Doctor Consultation Room <span className="text-white-50 font-weight-normal">&mdash;</span> {patientName}
                </h5>
                <span
                  className="badge shadow-sm"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.14)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.74rem',
                    padding: '4px 9px',
                    borderRadius: '6px',
                    letterSpacing: '0.02em',
                  }}
                >
                  <i className="fas fa-id-badge mr-1.5 text-info"></i>
                  {hospitalNumber}
                </span>
                <span
                  className="badge shadow-sm d-inline-flex align-items-center"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.18)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    fontWeight: 600,
                    fontSize: '0.74rem',
                    padding: '4px 10px',
                    borderRadius: '20px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      marginRight: '6px',
                      boxShadow: '0 0 6px #10b981',
                    }}
                  ></span>
                  Active Consultation
                </span>
              </div>

              <div
                className="small mt-1 d-flex align-items-center flex-wrap"
                style={{ gap: '8px', color: 'rgba(226, 232, 240, 0.85)', fontSize: '0.80rem' }}
              >
                <span>
                  <i className="fas fa-venus-mars mr-1 text-info opacity-75"></i>
                  {patient.gender || appointment?.patient_gender || 'Gender: N/A'}
                </span>
                <span className="text-white-50">&bull;</span>
                <span>
                  <i className="fas fa-birthday-cake mr-1 text-warning opacity-75"></i>
                  {patient.age || appointment?.patient_age || 'Age: N/A'} yrs
                </span>
                <span className="text-white-50">&bull;</span>
                <span>
                  <i className="fas fa-tag mr-1 text-success opacity-75"></i>
                  {patient.category_name || appointment?.category_name || 'Private / Standard'}
                </span>
                {patient.phone_number && (
                  <>
                    <span className="text-white-50">&bull;</span>
                    <span>
                      <i className="fas fa-phone-alt mr-1 text-cyan opacity-75"></i>
                      {patient.phone_number}
                    </span>
                  </>
                )}
                {(currentSponsorName || currentPlanName) && (
                  <span
                    className="badge font-weight-bold ml-1 shadow-sm d-inline-flex align-items-center"
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.18)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fef3c7',
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                    }}
                  >
                    <i className="fas fa-shield-alt mr-1.5 text-warning"></i>
                    {currentSponsorName}{currentPlanName ? ` — ${currentPlanName}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center" style={{ gap: '10px' }}>
            {/* View Tabs - Segmented Pill Bar with NO WRAP and Smooth Transitions */}
            <div
              className="d-flex align-items-center p-1 shadow-sm"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.55)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.25)',
                gap: '3px',
              }}
            >
              <button
                type="button"
                className="btn btn-sm d-inline-flex align-items-center shadow-none"
                style={{
                  border: 'none',
                  borderRadius: '7px',
                  padding: '7px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeTab === 'notes' ? '#ffffff' : 'transparent',
                  color: activeTab === 'notes' ? '#0f172a' : 'rgba(241, 245, 249, 0.85)',
                  boxShadow: activeTab === 'notes' ? '0 2px 6px rgba(0,0,0,0.18)' : 'none',
                }}
                onClick={() => setActiveTab('notes')}
              >
                <i className={`fas fa-file-medical-alt mr-1.5 ${activeTab === 'notes' ? 'text-primary' : 'text-white-50'}`}></i>
                Clinical Notes
              </button>

              <button
                type="button"
                className="btn btn-sm d-inline-flex align-items-center shadow-none"
                style={{
                  border: 'none',
                  borderRadius: '7px',
                  padding: '7px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeTab === 'orders' ? '#ffffff' : 'transparent',
                  color: activeTab === 'orders' ? '#0f172a' : 'rgba(241, 245, 249, 0.85)',
                  boxShadow: activeTab === 'orders' ? '0 2px 6px rgba(0,0,0,0.18)' : 'none',
                }}
                onClick={() => setActiveTab('orders')}
              >
                <i className={`fas fa-pills mr-1.5 ${activeTab === 'orders' ? 'text-primary' : 'text-warning'}`}></i>
                Orders &amp; Rx
                {(prescriptions.length + labOrders.length + radiologyOrders.length + otherServiceOrders.length) > 0 && (
                  <span
                    className="badge ml-2 font-weight-bold shadow-sm"
                    style={{
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.70rem',
                      borderRadius: '10px',
                      padding: '2px 7px',
                    }}
                  >
                    {prescriptions.length + labOrders.length + radiologyOrders.length + otherServiceOrders.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="btn btn-sm d-inline-flex align-items-center shadow-none"
                style={{
                  border: 'none',
                  borderRadius: '7px',
                  padding: '7px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeTab === 'history' ? '#ffffff' : 'transparent',
                  color: activeTab === 'history' ? '#0f172a' : 'rgba(241, 245, 249, 0.85)',
                  boxShadow: activeTab === 'history' ? '0 2px 6px rgba(0,0,0,0.18)' : 'none',
                }}
                onClick={() => setActiveTab('history')}
              >
                <i className={`fas fa-history mr-1.5 ${activeTab === 'history' ? 'text-primary' : 'text-info'}`}></i>
                History
                <span
                  className="badge ml-1.5 font-weight-bold"
                  style={{
                    backgroundColor: activeTab === 'history' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.18)',
                    color: activeTab === 'history' ? '#334155' : '#ffffff',
                    fontSize: '0.70rem',
                    borderRadius: '10px',
                    padding: '2px 6px',
                  }}
                >
                  {pastEncounters.length}
                </span>
              </button>

              <button
                type="button"
                className="btn btn-sm d-inline-flex align-items-center shadow-none"
                style={{
                  border: 'none',
                  borderRadius: '7px',
                  padding: '7px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeTab === 'legacy' ? '#ffffff' : 'transparent',
                  color: activeTab === 'legacy' ? '#0f172a' : 'rgba(241, 245, 249, 0.85)',
                  boxShadow: activeTab === 'legacy' ? '0 2px 6px rgba(0,0,0,0.18)' : 'none',
                }}
                onClick={() => setActiveTab('legacy')}
              >
                <i className={`fas fa-desktop mr-1.5 ${activeTab === 'legacy' ? 'text-primary' : 'text-white-50'}`}></i>
                EMR Workspace
              </button>
            </div>

            {/* Polished Glass Close Button */}
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center justify-content-center shadow-sm"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: 0,
                transition: 'all 0.15s ease',
              }}
              onClick={onClose}
              title="Close Consultation Modal"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
                e.currentTarget.style.borderColor = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <i className="fas fa-times" style={{ fontSize: '0.90rem' }}></i>
            </button>
          </div>
        </div>

        {/* Top Vitals Ribbon */}
        {vitals && (
          <div
            className="px-4 py-2 border-bottom d-flex align-items-center justify-content-between flex-wrap"
            style={{
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '0.80rem',
              gap: '10px',
            }}
          >
            <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
              <span className="text-muted font-weight-bold d-inline-flex align-items-center mr-1" style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <i className="fas fa-heartbeat text-danger mr-1.5"></i> Vitals:
              </span>

              <div
                className="d-inline-flex align-items-center px-2 py-1 rounded bg-white shadow-sm border"
                style={{ borderColor: '#e2e8f0', gap: '4px' }}
              >
                <i className="fas fa-stethoscope text-primary opacity-75" style={{ fontSize: '0.75rem' }}></i>
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>BP</span>
                <span className="font-weight-bold text-dark ml-1">{vitals.bp || 'N/A'}</span>
                <span className="text-muted" style={{ fontSize: '0.68rem' }}>mmHg</span>
              </div>

              <div
                className="d-inline-flex align-items-center px-2 py-1 rounded bg-white shadow-sm border"
                style={{ borderColor: '#e2e8f0', gap: '4px' }}
              >
                <i className="fas fa-heart text-danger opacity-75" style={{ fontSize: '0.75rem' }}></i>
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>Pulse</span>
                <span className="font-weight-bold text-dark ml-1">{vitals.pulse ? `${vitals.pulse}` : '-'}</span>
                <span className="text-muted" style={{ fontSize: '0.68rem' }}>bpm</span>
              </div>

              <div
                className="d-inline-flex align-items-center px-2 py-1 rounded bg-white shadow-sm border"
                style={{ borderColor: '#e2e8f0', gap: '4px' }}
              >
                <i className="fas fa-thermometer-half text-warning opacity-75" style={{ fontSize: '0.75rem' }}></i>
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>Temp</span>
                <span className="font-weight-bold text-dark ml-1">{vitals.temperature ? `${vitals.temperature}` : '-'}</span>
                <span className="text-muted" style={{ fontSize: '0.68rem' }}>°C</span>
              </div>

              <div
                className="d-inline-flex align-items-center px-2 py-1 rounded bg-white shadow-sm border"
                style={{ borderColor: '#e2e8f0', gap: '4px' }}
              >
                <i className="fas fa-lungs text-info opacity-75" style={{ fontSize: '0.75rem' }}></i>
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>SpO₂</span>
                <span className="font-weight-bold text-dark ml-1">{vitals.sp_02 ? `${vitals.sp_02}%` : '-'}</span>
              </div>

              <div
                className="d-inline-flex align-items-center px-2 py-1 rounded bg-white shadow-sm border"
                style={{ borderColor: '#e2e8f0', gap: '4px' }}
              >
                <i className="fas fa-wind text-secondary opacity-75" style={{ fontSize: '0.75rem' }}></i>
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>Resp</span>
                <span className="font-weight-bold text-dark ml-1">{vitals.respiratory_rate ? `${vitals.respiratory_rate}` : '-'}</span>
                <span className="text-muted" style={{ fontSize: '0.68rem' }}>cpm</span>
              </div>

              <div
                className="d-inline-flex align-items-center px-2 py-1 rounded bg-white shadow-sm border"
                style={{ borderColor: '#e2e8f0', gap: '4px' }}
              >
                <i className="fas fa-weight text-muted opacity-75" style={{ fontSize: '0.75rem' }}></i>
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>Wt/Ht</span>
                <span className="font-weight-bold text-dark ml-1">
                  {vitals.weight ? `${vitals.weight}kg` : '-'} / {vitals.height ? `${vitals.height}${vitals.unit || 'cm'}` : '-'}
                </span>
              </div>

              {vitals.bmi && (
                <div
                  className="d-inline-flex align-items-center px-2 py-1 rounded bg-white shadow-sm border"
                  style={{ borderColor: '#e2e8f0', gap: '4px' }}
                >
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>BMI</span>
                  <span className="badge badge-primary px-1.5 py-0.5 ml-1 font-weight-bold" style={{ fontSize: '0.72rem', borderRadius: '4px' }}>
                    {vitals.bmi}
                  </span>
                </div>
              )}
            </div>

            <div className="text-muted small d-inline-flex align-items-center">
              <i className="fas fa-user-nurse text-success mr-1.5"></i>
              <span>Recorded by <strong>{vitals.staff_name || 'Nursing'}</strong> ({vitals.time || 'Today'})</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4" style={{ flex: 1, overflowY: 'auto', backgroundColor: '#fcfcfd' }}>
          {/* TAB 1: Clinical Notes & Encounter Form */}
          {activeTab === 'notes' && (
            <div className="row">
              {/* Left Column: Complaints & History */}
              <div className="col-lg-6 mb-3">
                {/* Presenting Complaints */}
                <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div
                    className="card-header bg-white py-2.5 px-3 border-bottom d-flex justify-content-between align-items-center"
                    style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}
                  >
                    <div className="d-flex align-items-center">
                      <span
                        className="d-inline-flex align-items-center justify-content-center mr-2 rounded-circle"
                        style={{ width: '28px', height: '28px', backgroundColor: '#e0f2fe', color: '#0284c7' }}
                      >
                        <i className="fas fa-clipboard-list" style={{ fontSize: '0.85rem' }}></i>
                      </span>
                      <strong className="text-gray-800" style={{ fontSize: '0.90rem' }}>
                        Presenting Complaints
                      </strong>
                    </div>

                    <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                      <span className="badge badge-light border text-muted px-2 py-1" style={{ fontSize: '0.74rem' }}>
                        {selectedComplaints.length} selected
                      </span>
                      {onNavigate && (
                        <button
                          type="button"
                          className="btn btn-sm btn-light border text-primary font-weight-bold py-1 px-2.5 d-inline-flex align-items-center shadow-none"
                          style={{ fontSize: '0.75rem', borderRadius: '6px' }}
                          onClick={() => {
                            onClose();
                            onNavigate('complaints-setup');
                          }}
                          title="Manage hospital presenting complaints directory or bulk upload"
                        >
                          <i className="fas fa-database text-primary mr-1.5"></i>
                          <span>Directory</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="card-body p-3">
                    {/* Selected Tags */}
                    {selectedComplaints.length > 0 && (
                      <div className="mb-3 d-flex flex-wrap" style={{ gap: '6px' }}>
                        {selectedComplaints.map((c) => (
                          <span
                            key={c}
                            className="badge badge-primary px-2.5 py-1.5 d-inline-flex align-items-center shadow-sm"
                            style={{ fontSize: '0.82rem', borderRadius: '16px', fontWeight: 500 }}
                          >
                            <span>{c}</span>
                            <button
                              type="button"
                              className="btn btn-link p-0 ml-1.5 text-white"
                              style={{ textDecoration: 'none', lineHeight: 1 }}
                              onClick={() => handleRemoveComplaint(c)}
                              title="Remove complaint"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Live Type-Search Input & Database Dropdown */}
                    <div className="position-relative" ref={complaintDropdownRef}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="font-weight-bold text-gray-700 mb-0" style={{ fontSize: '0.78rem' }}>
                          Search or Add Complaint
                        </label>
                        <span className="text-muted" style={{ fontSize: '0.70rem' }}>
                          <i className="fas fa-search mr-1 text-primary"></i> Type to search database
                        </span>
                      </div>

                      <div className="input-group">
                        <div className="position-relative flex-grow-1">
                          <i
                            className="fas fa-search text-muted position-absolute"
                            style={{
                              left: '11px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '0.82rem',
                              zIndex: 4,
                            }}
                          ></i>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Type complaint (e.g. Headache, Dysuria, Left knee swelling)..."
                            value={customComplaint}
                            onChange={(e) => handleComplaintChange(e.target.value)}
                            onFocus={() => {
                              setShowComplaintDropdown(true);
                              if (complaintsList.length <= COMMON_COMPLAINTS.length) {
                                loadComplaints('');
                              }
                            }}
                            onKeyDown={(e) => {
                              const query = customComplaint.trim().toLowerCase();
                              const matches = complaintsList.filter((c) => {
                                const name = typeof c === 'string' ? c : c.name;
                                return name && name.toLowerCase().includes(query);
                              });
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                if (!showComplaintDropdown && matches.length > 0) {
                                  setShowComplaintDropdown(true);
                                } else if (matches.length > 0) {
                                  setSelectedComplaintIndex((prev) => Math.min(prev + 1, matches.length - 1));
                                }
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (matches.length > 0) {
                                  setSelectedComplaintIndex((prev) => Math.max(prev - 1, 0));
                                }
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (showComplaintDropdown && matches.length > 0 && matches[selectedComplaintIndex]) {
                                  handleSelectComplaintItem(matches[selectedComplaintIndex]);
                                } else if (customComplaint.trim()) {
                                  handleAddNewComplaint(customComplaint);
                                }
                              } else if (e.key === 'Escape') {
                                setShowComplaintDropdown(false);
                              }
                            }}
                            style={{
                              fontSize: '0.86rem',
                              borderRadius: '8px 0 0 8px',
                              paddingLeft: '32px',
                              paddingRight: customComplaint ? '30px' : '12px',
                              height: '38px',
                              borderColor: showComplaintDropdown ? '#2563eb' : '#cbd5e1',
                              boxShadow: showComplaintDropdown ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none',
                            }}
                          />
                          {customComplaint && (
                            <button
                              type="button"
                              className="btn btn-sm btn-link position-absolute text-muted p-0 shadow-none"
                              style={{
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                textDecoration: 'none',
                                zIndex: 5,
                              }}
                              onClick={() => {
                                setCustomComplaint('');
                                setShowComplaintDropdown(false);
                              }}
                              title="Clear input"
                            >
                              <i className="fas fa-times-circle text-gray-400"></i>
                            </button>
                          )}
                        </div>
                        <div className="input-group-append">
                          <button
                            type="button"
                            className="btn btn-primary d-inline-flex align-items-center"
                            style={{ borderRadius: '0 8px 8px 0', fontSize: '0.85rem', fontWeight: 600, height: '38px' }}
                            disabled={!customComplaint.trim() || isAddingNewComplaint}
                            onClick={() => handleAddNewComplaint(customComplaint)}
                            title="Add to database and select"
                          >
                            {isAddingNewComplaint ? (
                              <>
                                <i className="fas fa-spinner fa-spin mr-1"></i> Saving...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-plus mr-1"></i> Add
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Dropdown with live database matches & '+ Add new to database' */}
                      {showComplaintDropdown && customComplaint.trim().length >= 1 && (
                        <div
                          className="position-absolute bg-white border rounded shadow-lg"
                          style={{
                            top: 'calc(100% + 6px)',
                            left: 0,
                            right: 0,
                            zIndex: 1070,
                            maxHeight: '320px',
                            overflowY: 'auto',
                            borderColor: '#93c5fd',
                            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.16), 0 10px 10px -5px rgba(15, 23, 42, 0.08)',
                            borderRadius: '12px',
                          }}
                        >
                          <div
                            className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center"
                            style={{ backgroundColor: '#f0f9ff', fontSize: '0.76rem' }}
                          >
                            <span className="text-primary font-weight-bold d-flex align-items-center">
                              <i className="fas fa-database mr-1.5 text-primary"></i>
                              <span>Hospital Complaints Database</span>
                              {searchingComplaints && <i className="fas fa-spinner fa-spin ml-2 text-primary"></i>}
                            </span>
                            <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                              <span className="text-muted d-none d-sm-inline" style={{ fontSize: '0.68rem' }}>
                                Use <kbd className="bg-white text-dark border px-1">↑</kbd> <kbd className="bg-white text-dark border px-1">↓</kbd> <kbd className="bg-white text-dark border px-1">Enter</kbd>
                              </span>
                              <button
                                type="button"
                                className="btn btn-link btn-xs text-muted p-0"
                                onClick={() => setShowComplaintDropdown(false)}
                                title="Close"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          </div>

                          {(() => {
                            const query = customComplaint.trim().toLowerCase();
                            const matches = complaintsList.filter((c) => {
                              const name = typeof c === 'string' ? c : c.name;
                              return name && name.toLowerCase().includes(query);
                            });
                            const exactMatch = complaintsList.some((c) => {
                              const name = typeof c === 'string' ? c : c.name;
                              return name && name.toLowerCase() === query;
                            });

                            return (
                              <>
                                {matches.length > 0 ? (
                                  matches.map((item, idx) => {
                                    const name = typeof item === 'string' ? item : item.name;
                                    const category = typeof item === 'object' && item.category_display ? item.category_display : (item.category || 'General');
                                    const isSelected = selectedComplaintIndex === idx;
                                    const isAlreadyPicked = selectedComplaints.includes(name);

                                    return (
                                      <div
                                        key={item.id || name || idx}
                                        className="px-3 py-2.5 border-bottom d-flex align-items-center justify-content-between"
                                        style={{
                                          cursor: 'pointer',
                                          fontSize: '0.86rem',
                                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                          borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                                          transition: 'all 0.12s ease-in-out',
                                        }}
                                        onMouseEnter={(e) => {
                                          setSelectedComplaintIndex(idx);
                                          e.currentTarget.style.backgroundColor = '#eff6ff';
                                          e.currentTarget.style.borderLeftColor = '#2563eb';
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isSelected) {
                                            e.currentTarget.style.backgroundColor = '#ffffff';
                                            e.currentTarget.style.borderLeftColor = 'transparent';
                                          }
                                        }}
                                        onClick={() => handleSelectComplaintItem(item)}
                                      >
                                        <div className="d-flex align-items-center mr-3" style={{ minWidth: 0, flex: 1 }}>
                                          <div
                                            className="mr-2.5 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                            style={{
                                              width: '28px',
                                              height: '28px',
                                              backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9',
                                              color: '#0284c7',
                                              fontSize: '0.78rem',
                                            }}
                                          >
                                            <i className="fas fa-clipboard-list"></i>
                                          </div>
                                          <div className="d-flex flex-column">
                                            <span className="font-weight-bold text-gray-900" style={{ fontSize: '0.88rem' }}>
                                              {name}
                                            </span>
                                            {category && (
                                              <span className="text-muted text-capitalize" style={{ fontSize: '0.70rem' }}>
                                                <i className="fas fa-tag mr-1 text-gray-400"></i>
                                                {category}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div>
                                          {isAlreadyPicked ? (
                                            <span
                                              className="badge badge-success font-weight-bold px-2 py-1"
                                              style={{ fontSize: '0.72rem', borderRadius: '12px' }}
                                            >
                                              <i className="fas fa-check mr-1"></i> Added
                                            </span>
                                          ) : (
                                            <span
                                              className="badge font-weight-bold px-2.5 py-1"
                                              style={{
                                                fontSize: '0.74rem',
                                                backgroundColor: isSelected ? '#2563eb' : '#f1f5f9',
                                                color: isSelected ? '#ffffff' : '#475569',
                                                borderRadius: '14px',
                                              }}
                                            >
                                              Select
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="p-3 text-center text-muted small">
                                    <i className="fas fa-info-circle mr-1 text-secondary"></i>
                                    No database complaint matching "<strong>{customComplaint.trim()}</strong>".
                                  </div>
                                )}

                                {/* Add New Complaint to Database Option */}
                                {!exactMatch && (
                                  <div
                                    className="px-3 py-2.5 border-top"
                                    style={{
                                      cursor: 'pointer',
                                      backgroundColor: '#f0fdf4',
                                      transition: 'background-color 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#dcfce7';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = '#f0fdf4';
                                    }}
                                    onClick={() => handleAddNewComplaint(customComplaint)}
                                  >
                                    <div className="d-flex align-items-center justify-content-between">
                                      <div className="d-flex align-items-center">
                                        <i className="fas fa-plus-circle text-success mr-2" style={{ fontSize: '1rem' }}></i>
                                        <div className="d-flex flex-column">
                                          <span className="font-weight-bold text-success" style={{ fontSize: '0.84rem' }}>
                                            Add "{customComplaint.trim()}" to Hospital Database
                                          </span>
                                          <span className="text-muted" style={{ fontSize: '0.70rem' }}>
                                            Saves to clinical database so all doctors can pick it in the future
                                          </span>
                                        </div>
                                      </div>
                                      <span className="badge badge-success font-weight-bold px-2.5 py-1" style={{ fontSize: '0.74rem', borderRadius: '12px' }}>
                                        {isAddingNewComplaint ? 'Saving...' : '+ Save & Pick'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* History of Present Illness (HPI) */}
                <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '10px' }}>
                  <div className="card-header bg-white py-2 px-3 border-bottom">
                    <strong className="text-gray-800" style={{ fontSize: '0.88rem' }}>
                      <i className="fas fa-history text-info mr-2"></i> History of Present Illness (HPI)
                    </strong>
                  </div>
                  <div className="card-body p-3">
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Detail onset, duration, severity, progression, relieving/aggravating factors, previous medications taken..."
                      value={historyOfIllness}
                      onChange={(e) => setHistoryOfIllness(e.target.value)}
                      style={{ fontSize: '0.86rem' }}
                    ></textarea>
                  </div>
                </div>

                {/* Physical Examination & Clinical Findings */}
                <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '10px' }}>
                  <div className="card-header bg-white py-2 px-3 border-bottom">
                    <strong className="text-gray-800" style={{ fontSize: '0.88rem' }}>
                      <i className="fas fa-search-plus text-success mr-2"></i> Physical Examination & Systemic Findings
                    </strong>
                  </div>
                  <div className="card-body p-3">
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="General condition (febrile, pale, icteric, dehydrated). Systemic exam: Chest (breath sounds), CVS (heart sounds), Abdomen (soft, tender), CNS..."
                      value={physicalExam}
                      onChange={(e) => setPhysicalExam(e.target.value)}
                      style={{ fontSize: '0.86rem' }}
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Right Column: Diagnosis & Treatment Plan */}
              <div className="col-lg-6 mb-3">
                {/* Working Diagnosis & WHO Clinical Coding */}
                <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div
                    className="card-header bg-white py-2.5 px-3 border-bottom d-flex justify-content-between align-items-center"
                    style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}
                  >
                    <div className="d-flex align-items-center">
                      <span
                        className="d-inline-flex align-items-center justify-content-center mr-2 rounded-circle"
                        style={{ width: '28px', height: '28px', backgroundColor: '#fee2e2', color: '#dc2626' }}
                      >
                        <i className="fas fa-stethoscope" style={{ fontSize: '0.85rem' }}></i>
                      </span>
                      <strong className="text-gray-800 mr-2" style={{ fontSize: '0.90rem' }}>
                        Clinical Diagnosis &amp; Impression
                      </strong>
                      <span className="badge badge-danger font-weight-bold px-2 py-0.5" style={{ fontSize: '0.68rem', borderRadius: '10px' }}>
                        * Compulsory
                      </span>
                    </div>

                    {onNavigate && (
                      <button
                        type="button"
                        className="btn btn-sm btn-light border text-primary font-weight-bold py-1 px-2.5 d-inline-flex align-items-center shadow-none"
                        style={{ fontSize: '0.75rem', borderRadius: '6px' }}
                        onClick={() => {
                          onClose();
                          onNavigate('diagnoses-setup');
                        }}
                        title="Manage hospital diagnoses directory or bulk upload"
                      >
                        <i className="fas fa-database text-primary mr-1.5"></i>
                        <span>Directory</span>
                      </button>
                    )}
                  </div>

                  <div className="card-body p-3">
                    {/* Unified Dual Diagnosis Row (Primary Search + ICD-11 WHO Code) */}
                    <div className="row mb-2">
                      {/* Left: Primary Diagnosis Name */}
                      <div className="col-md-7 mb-2 mb-md-0 position-relative" ref={diagnosisDropdownRef}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="font-weight-bold text-gray-800 mb-0 d-flex align-items-center" style={{ fontSize: '0.78rem' }}>
                            <span>Primary Diagnosis</span>
                            <span className="text-danger ml-1 font-weight-bold" title="Compulsory field">*</span>
                            <span className="badge badge-light border border-danger text-danger ml-1.5 px-1.5 py-0" style={{ fontSize: '0.65rem', borderRadius: '4px' }}>
                              Required
                            </span>
                          </label>
                          <span className="text-muted" style={{ fontSize: '0.70rem' }}>
                            <i className="fas fa-search mr-1 text-primary"></i> Type 2-3 letters
                          </span>
                        </div>

                        <div className="position-relative">
                          <i
                            className="fas fa-notes-medical text-muted position-absolute"
                            style={{
                              left: '11px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '0.82rem',
                              zIndex: 4,
                            }}
                          ></i>
                          <input
                            type="text"
                            required
                            className={`form-control font-weight-bold text-gray-900 ${diagnosisError ? 'is-invalid border-danger' : ''}`}
                            placeholder="Type diagnosis (e.g. Malaria, Gastritis)... *"
                            value={primaryDiagnosis}
                            onChange={(e) => handleDiagnosisChange(e.target.value)}
                            onFocus={() => {
                              if (primaryDiagnosis.trim().length >= 2) {
                                setShowDiagnosisDropdown(true);
                              }
                            }}
                            onKeyDown={(e) => {
                              const query = primaryDiagnosis.trim().toLowerCase();
                              const matches = diagnosesList.filter((d) => d.toLowerCase().includes(query));
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                if (!showDiagnosisDropdown && matches.length > 0) {
                                  setShowDiagnosisDropdown(true);
                                } else if (matches.length > 0) {
                                  setSelectedDiagnosisIndex((prev) => Math.min(prev + 1, matches.length - 1));
                                }
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (matches.length > 0) {
                                  setSelectedDiagnosisIndex((prev) => Math.max(prev - 1, 0));
                                }
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (showDiagnosisDropdown && matches.length > 0 && matches[selectedDiagnosisIndex]) {
                                  handleSelectDiagnosis(matches[selectedDiagnosisIndex]);
                                } else if (primaryDiagnosis.trim()) {
                                  handleAddNewDiagnosis(primaryDiagnosis);
                                }
                              } else if (e.key === 'Escape') {
                                setShowDiagnosisDropdown(false);
                              }
                            }}
                            style={{
                              fontSize: '0.86rem',
                              borderRadius: '8px',
                              paddingLeft: '32px',
                              paddingRight: primaryDiagnosis ? '30px' : '12px',
                              height: '38px',
                              borderColor: diagnosisError ? '#dc2626' : (showDiagnosisDropdown ? '#2563eb' : '#cbd5e1'),
                              boxShadow: diagnosisError
                                ? '0 0 0 3px rgba(220, 38, 38, 0.2)'
                                : (showDiagnosisDropdown ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none'),
                            }}
                          />
                          {primaryDiagnosis && (
                            <button
                              type="button"
                              className="btn btn-sm btn-link position-absolute text-muted p-0 shadow-none"
                              style={{
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                textDecoration: 'none',
                                zIndex: 5,
                              }}
                              onClick={() => {
                                setPrimaryDiagnosis('');
                                setShowDiagnosisDropdown(false);
                              }}
                              title="Clear diagnosis"
                            >
                              <i className="fas fa-times-circle text-gray-400"></i>
                            </button>
                          )}
                        </div>

                        {diagnosisError && (
                          <div className="text-danger font-weight-bold mt-1" style={{ fontSize: '0.74rem' }}>
                            <i className="fas fa-exclamation-circle mr-1"></i> Diagnosis is compulsory. Please pick or enter a diagnosis.
                          </div>
                        )}

                        {/* Primary Diagnosis Live Dropdown */}
                        {showDiagnosisDropdown && primaryDiagnosis.trim().length >= 2 && (
                          <div
                            className="position-absolute bg-white border rounded shadow-lg"
                            style={{
                              top: 'calc(100% + 6px)',
                              left: 0,
                              width: '560px',
                              maxWidth: 'calc(100vw - 40px)',
                              zIndex: 1070,
                              maxHeight: '320px',
                              overflowY: 'auto',
                              borderColor: '#93c5fd',
                              boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.16), 0 10px 10px -5px rgba(15, 23, 42, 0.08)',
                              borderRadius: '12px',
                            }}
                          >
                            <div
                              className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center"
                              style={{ backgroundColor: '#f0f9ff', fontSize: '0.76rem' }}
                            >
                              <span className="text-primary font-weight-bold d-flex align-items-center">
                                <i className="fas fa-database mr-1.5 text-primary"></i>
                                <span>Hospital Diagnoses Directory</span>
                              </span>
                              <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                                <span className="text-muted d-none d-sm-inline" style={{ fontSize: '0.68rem' }}>
                                  Use <kbd className="bg-white text-dark border px-1">↑</kbd> <kbd className="bg-white text-dark border px-1">↓</kbd> <kbd className="bg-white text-dark border px-1">Enter</kbd>
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-link btn-xs text-muted p-0"
                                  onClick={() => setShowDiagnosisDropdown(false)}
                                  title="Close"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            </div>

                            {(() => {
                              const query = primaryDiagnosis.trim().toLowerCase();
                              const matches = diagnosesList.filter((d) =>
                                d.toLowerCase().includes(query)
                              );
                              const exactMatch = diagnosesList.some(
                                (d) => d.toLowerCase() === query
                              );

                              return (
                                <>
                                  {matches.length > 0 ? (
                                    matches.map((diag, idx) => {
                                      const isSelected = selectedDiagnosisIndex === idx;
                                      return (
                                        <div
                                          key={diag}
                                          className="px-3 py-2.5 border-bottom d-flex align-items-center justify-content-between"
                                          style={{
                                            cursor: 'pointer',
                                            fontSize: '0.86rem',
                                            backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                            borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                                            transition: 'all 0.12s ease-in-out',
                                          }}
                                          onMouseEnter={(e) => {
                                            setSelectedDiagnosisIndex(idx);
                                            e.currentTarget.style.backgroundColor = '#eff6ff';
                                            e.currentTarget.style.borderLeftColor = '#2563eb';
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!isSelected) {
                                              e.currentTarget.style.backgroundColor = '#ffffff';
                                              e.currentTarget.style.borderLeftColor = 'transparent';
                                            }
                                          }}
                                          onClick={() => handleSelectDiagnosis(diag)}
                                        >
                                          <div className="d-flex align-items-center mr-3" style={{ minWidth: 0, flex: 1 }}>
                                            <div
                                              className="mr-2.5 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                              style={{
                                                width: '28px',
                                                height: '28px',
                                                backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9',
                                                color: '#2563eb',
                                                fontSize: '0.78rem',
                                              }}
                                            >
                                              <i className="fas fa-notes-medical"></i>
                                            </div>
                                            <span className="font-weight-bold text-gray-900" style={{ fontSize: '0.88rem' }}>
                                              {diag}
                                            </span>
                                          </div>
                                          <span
                                            className="badge font-weight-bold px-2.5 py-1"
                                            style={{
                                              fontSize: '0.74rem',
                                              backgroundColor: isSelected ? '#2563eb' : '#f1f5f9',
                                              color: isSelected ? '#ffffff' : '#475569',
                                              borderRadius: '14px',
                                            }}
                                          >
                                            Select
                                          </span>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="p-3 text-center text-muted small">
                                      <i className="fas fa-info-circle mr-1 text-secondary"></i>
                                      No exact hospital match for "<strong>{primaryDiagnosis.trim()}</strong>".
                                    </div>
                                  )}

                                  {/* Direct Lookup in WHO ICD-11 Banner */}
                                  <div
                                    className="px-3 py-2.5 border-top d-flex align-items-center justify-content-between"
                                    style={{
                                      fontSize: '0.82rem',
                                      cursor: 'pointer',
                                      backgroundColor: '#f8fafc',
                                      transition: 'background-color 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#f0f9ff';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = '#f8fafc';
                                    }}
                                    onClick={() => {
                                      setShowDiagnosisDropdown(false);
                                      handleIcd11Change(primaryDiagnosis.trim());
                                    }}
                                  >
                                    <div className="d-flex align-items-center text-primary">
                                      <i className="fas fa-globe mr-2 text-info"></i>
                                      <span>
                                        Search WHO ICD-11 directory for "<strong>{primaryDiagnosis.trim()}</strong>"
                                      </span>
                                    </div>
                                    <span className="badge badge-info px-2 py-0.5">
                                      Lookup ICD-11 <i className="fas fa-arrow-right ml-1"></i>
                                    </span>
                                  </div>

                                  {/* Add New Diagnosis to Directory */}
                                  {!exactMatch && (
                                    <div
                                      className="px-3 py-2 border-top"
                                      style={{ cursor: 'pointer', backgroundColor: '#f0fdf4' }}
                                      onClick={() => handleAddNewDiagnosis(primaryDiagnosis)}
                                    >
                                      <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center">
                                          <i className="fas fa-plus-circle text-success mr-2"></i>
                                          <span className="font-weight-bold text-success" style={{ fontSize: '0.82rem' }}>
                                            Add "{primaryDiagnosis.trim()}" to Hospital Directory
                                          </span>
                                        </div>
                                        <span className="badge badge-success font-weight-bold" style={{ fontSize: '0.72rem' }}>
                                          {isAddingNewDiagnosis ? 'Saving...' : '+ Save & Select'}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Right: ICD-11 WHO Code Input */}
                      <div className="col-md-5 position-relative" ref={icd11DropdownRef}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="font-weight-bold text-gray-700 mb-0 d-inline-flex align-items-center" style={{ fontSize: '0.78rem' }}>
                            <i className="fas fa-globe text-primary mr-1"></i>
                            <span>ICD-11 (WHO)</span>
                          </label>
                          <span className="badge badge-light border text-primary px-1.5 py-0.5" style={{ fontSize: '0.68rem' }}>
                            Official Standard
                          </span>
                        </div>

                        {/* Unified Input Box (Prevents disjointed borders) */}
                        <div
                          className="d-flex align-items-center bg-white rounded border"
                          style={{
                            height: '38px',
                            borderColor: showIcd11Dropdown ? '#2563eb' : '#cbd5e1',
                            boxShadow: showIcd11Dropdown ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none',
                            transition: 'all 0.15s ease-in-out',
                            overflow: 'hidden',
                          }}
                        >
                          <div className="pl-2.5 pr-1 text-muted" style={{ fontSize: '0.82rem' }}>
                            <i className="fas fa-barcode text-primary"></i>
                          </div>
                          <input
                            type="text"
                            className="form-control border-0 font-weight-bold text-primary shadow-none px-2"
                            placeholder="Code or name (e.g. 1F40, Malaria)..."
                            value={icd11Code}
                            onChange={(e) => handleIcd11Change(e.target.value)}
                            onFocus={() => {
                              if (icd11Code.trim().length >= 2 && icd11SearchResults.length > 0) {
                                setShowIcd11Dropdown(true);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                if (!showIcd11Dropdown && icd11SearchResults.length > 0) {
                                  setShowIcd11Dropdown(true);
                                } else if (icd11SearchResults.length > 0) {
                                  setSelectedIcd11Index((prev) => Math.min(prev + 1, icd11SearchResults.length - 1));
                                }
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (icd11SearchResults.length > 0) {
                                  setSelectedIcd11Index((prev) => Math.max(prev - 1, 0));
                                }
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (showIcd11Dropdown && icd11SearchResults.length > 0 && icd11SearchResults[selectedIcd11Index]) {
                                  handleSelectIcd11Item(icd11SearchResults[selectedIcd11Index]);
                                } else if (icd11Code.trim()) {
                                  handleIcd11Change(icd11Code);
                                }
                              } else if (e.key === 'Escape') {
                                setShowIcd11Dropdown(false);
                              }
                            }}
                            style={{
                              fontSize: '0.88rem',
                              height: '100%',
                              backgroundColor: 'transparent',
                            }}
                          />
                          {icd11Code && (
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-muted p-0 px-2 shadow-none"
                              onClick={() => {
                                setIcd11Code('');
                                setShowIcd11Dropdown(false);
                                setIcd11SearchResults([]);
                              }}
                              title="Clear code"
                            >
                              <i className="fas fa-times-circle text-gray-400"></i>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-light border-left font-weight-bold text-primary px-3 h-100 shadow-none d-flex align-items-center"
                            style={{
                              borderRadius: 0,
                              borderColor: '#e2e8f0',
                              fontSize: '0.80rem',
                              backgroundColor: '#f8fafc',
                              whiteSpace: 'nowrap',
                            }}
                            disabled={searchingIcd11 || !icd11Code.trim()}
                            onClick={() => handleIcd11Change(icd11Code)}
                            title="Query WHO ICD-11 classification directory"
                          >
                            {searchingIcd11 ? (
                              <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                              <>
                                <i className="fas fa-search mr-1.5 text-primary"></i>
                                <span>Lookup</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Wide Spacious Dropdown for WHO ICD-11 Results */}
                        {showIcd11Dropdown && (
                          <div
                            className="position-absolute bg-white border shadow-lg rounded"
                            style={{
                              top: 'calc(100% + 6px)',
                              right: 0,
                              left: 'auto',
                              width: '560px',
                              maxWidth: 'calc(100vw - 40px)',
                              zIndex: 1070,
                              maxHeight: '340px',
                              overflowY: 'auto',
                              borderColor: '#93c5fd',
                              boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.16), 0 10px 10px -5px rgba(15, 23, 42, 0.08)',
                              borderRadius: '12px',
                            }}
                          >
                            <div
                              className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center"
                              style={{ backgroundColor: '#f0f9ff', fontSize: '0.76rem' }}
                            >
                              <div className="d-flex align-items-center">
                                <div
                                  className="mr-2 rounded d-flex align-items-center justify-content-center text-white"
                                  style={{ width: '22px', height: '22px', backgroundColor: '#0284c7', fontSize: '0.72rem' }}
                                >
                                  <i className="fas fa-globe"></i>
                                </div>
                                <span className="text-primary font-weight-bold">
                                  WHO ICD-11 Results ({icd11SearchResults.length})
                                </span>
                              </div>
                              <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                                <span className="text-muted d-none d-sm-inline" style={{ fontSize: '0.68rem' }}>
                                  Use <kbd className="bg-white text-dark border px-1">↑</kbd> <kbd className="bg-white text-dark border px-1">↓</kbd> <kbd className="bg-white text-dark border px-1">Enter</kbd>
                                </span>
                                {searchingIcd11 && (
                                  <span className="text-muted">
                                    <i className="fas fa-spinner fa-spin mr-1 text-primary"></i> Searching...
                                  </span>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-link btn-xs text-muted p-0"
                                  onClick={() => setShowIcd11Dropdown(false)}
                                  title="Close"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            </div>

                            {searchingIcd11 && icd11SearchResults.length === 0 && (
                              <div className="p-4 text-center text-muted small">
                                <i className="fas fa-spinner fa-spin fa-2x text-primary mb-2 d-block"></i>
                                Searching WHO ICD-11 directory for "<strong>{icd11Code.trim()}</strong>"...
                              </div>
                            )}

                            {!searchingIcd11 && icd11SearchResults.length === 0 && (
                              <div className="p-4 text-center text-muted small">
                                <i className="fas fa-exclamation-circle text-warning mr-1"></i>
                                No matches for "<strong>{icd11Code.trim()}</strong>". Try a standard WHO code (e.g. <code>1F40</code>, <code>BA00</code>, <code>CA40</code>, <code>5A11</code>) or diagnosis name.
                              </div>
                            )}

                            {icd11SearchResults.map((item, idx) => {
                              const isSelected = selectedIcd11Index === idx;
                              return (
                                <div
                                  key={`${item.code}-${idx}`}
                                  className="px-3 py-2.5 border-bottom d-flex align-items-center justify-content-between"
                                  style={{
                                    cursor: 'pointer',
                                    fontSize: '0.86rem',
                                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                    borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                                    transition: 'all 0.12s ease-in-out',
                                  }}
                                  onMouseEnter={(e) => {
                                    setSelectedIcd11Index(idx);
                                    e.currentTarget.style.backgroundColor = '#eff6ff';
                                    e.currentTarget.style.borderLeftColor = '#2563eb';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.backgroundColor = '#ffffff';
                                      e.currentTarget.style.borderLeftColor = 'transparent';
                                    }
                                  }}
                                  onClick={() => handleSelectIcd11Item(item)}
                                >
                                  <div className="d-flex align-items-center mr-3" style={{ minWidth: 0, flex: 1 }}>
                                    <span
                                      className="badge font-weight-bold px-2.5 py-1.5 mr-3 flex-shrink-0 shadow-sm"
                                      style={{
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                        fontSize: '0.82rem',
                                        letterSpacing: '0.5px',
                                        backgroundColor: isSelected ? '#1d4ed8' : '#2563eb',
                                        color: '#ffffff',
                                        minWidth: '66px',
                                        textAlign: 'center',
                                        borderRadius: '6px',
                                      }}
                                    >
                                      {item.code}
                                    </span>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div
                                        className="font-weight-bold text-gray-900"
                                        style={{
                                          fontSize: '0.90rem',
                                          lineHeight: '1.35',
                                          whiteSpace: 'normal',
                                          wordBreak: 'break-word',
                                        }}
                                      >
                                        {item.title}
                                      </div>
                                      <div className="d-flex align-items-center flex-wrap mt-1" style={{ gap: '6px', fontSize: '0.70rem' }}>
                                        <span
                                          className="badge px-1.5 py-0.5 border"
                                          style={{
                                            backgroundColor: '#f1f5f9',
                                            color: '#475569',
                                            borderColor: '#cbd5e1',
                                            fontSize: '0.68rem',
                                            fontWeight: 500,
                                          }}
                                        >
                                          <i className="fas fa-tag mr-1 text-secondary"></i>
                                          {item.category || 'Clinical Diagnosis'}
                                        </span>
                                        <span className="text-muted d-inline-flex align-items-center">
                                          <i className="fas fa-check-circle text-success mr-1"></i>
                                          {item.source || 'WHO Official Standard'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="btn btn-sm font-weight-bold px-3 py-1 flex-shrink-0 shadow-sm d-flex align-items-center"
                                    style={{
                                      borderRadius: '20px',
                                      fontSize: '0.76rem',
                                      whiteSpace: 'nowrap',
                                      backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                                      color: isSelected ? '#ffffff' : '#2563eb',
                                      border: '1px solid #2563eb',
                                      transition: 'all 0.15s ease-in-out',
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectIcd11Item(item);
                                    }}
                                  >
                                    <i className="fas fa-check mr-1.5"></i>
                                    <span>Select</span>
                                  </button>
                                </div>
                              );
                            })}

                            <div
                              className="px-3 py-1.5 bg-light border-top d-flex justify-content-between align-items-center text-muted"
                              style={{ fontSize: '0.70rem' }}
                            >
                              <span>
                                <i className="fas fa-mouse-pointer mr-1 text-primary"></i> Click any row or press <strong>Enter</strong> to select
                              </span>
                              <span className="text-primary font-weight-500">
                                WHO ICD-11 Connected
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active Confirmed Diagnosis Ribbon */}
                    {primaryDiagnosis && (
                      <div
                        className="px-3 py-2.5 mb-2 rounded border d-flex align-items-center justify-content-between shadow-sm"
                        style={{
                          backgroundColor: '#f0fdf4',
                          borderColor: '#86efac',
                          borderRadius: '10px',
                        }}
                      >
                        <div className="d-flex align-items-center text-truncate mr-2">
                          <span
                            className="badge badge-success px-2.5 py-1 mr-2.5 d-inline-flex align-items-center font-weight-bold shadow-sm"
                            style={{ fontSize: '0.74rem', backgroundColor: '#16a34a' }}
                          >
                            <i className="fas fa-check-circle mr-1"></i> Confirmed Diagnosis
                          </span>
                          <span className="font-weight-bold text-gray-900 text-truncate" style={{ fontSize: '0.90rem' }}>
                            {primaryDiagnosis}
                          </span>
                          {icd11Code && (
                            <span
                              className="badge badge-info ml-2 px-2.5 py-1 font-weight-bold shadow-sm"
                              style={{ fontSize: '0.74rem', letterSpacing: '0.4px', backgroundColor: '#0284c7' }}
                              title="WHO ICD-11 Standard Code"
                            >
                              <i className="fas fa-globe mr-1"></i> ICD-11: {icd11Code}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger py-0.5 px-2.5 font-weight-bold shadow-none d-flex align-items-center"
                          style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', borderRadius: '14px' }}
                          onClick={() => {
                            setPrimaryDiagnosis('');
                            setIcd11Code('');
                          }}
                          title="Clear current diagnosis"
                        >
                          <i className="fas fa-times mr-1"></i> Clear
                        </button>
                      </div>
                    )}

                    {/* Micro Helper Tip */}
                    <div className="small text-muted mb-2.5 d-flex align-items-center" style={{ fontSize: '0.72rem' }}>
                      <i className="fas fa-info-circle text-primary mr-1"></i>
                      <span>
                        Search local directory by disease name, or enter WHO code (e.g. <code>1F40</code>) to auto-sync official clinical classifications.
                      </span>
                    </div>

                    {/* Differential / Additional Notes */}
                    <div className="form-group mb-0">
                      <label className="font-weight-bold text-gray-700 mb-1" style={{ fontSize: '0.78rem' }}>
                        Differential / Additional Diagnosis Notes:
                      </label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Secondary diagnoses, complications, or differential considerations..."
                        value={diagnosisComments}
                        onChange={(e) => setDiagnosisComments(e.target.value)}
                        style={{ fontSize: '0.84rem', borderRadius: '8px', borderColor: '#cbd5e1' }}
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* Treatment Plan & Management */}
                <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '10px' }}>
                  <div className="card-header bg-white py-2 px-3 border-bottom">
                    <strong className="text-gray-800" style={{ fontSize: '0.88rem' }}>
                      <i className="fas fa-notes-medical text-primary mr-2"></i> Treatment Plan & Doctor's Recommendations
                    </strong>
                  </div>
                  <div className="card-body p-3">
                    <textarea
                      className="form-control mb-3"
                      rows="4"
                      placeholder="Clinical management instructions, lifestyle advice, hydration, dietary counseling, return precautions..."
                      value={treatmentPlan}
                      onChange={(e) => setTreatmentPlan(e.target.value)}
                      style={{ fontSize: '0.86rem' }}
                    ></textarea>

                    <div className="row">
                      <div className="col-sm-6">
                        <label className="font-weight-bold small text-gray-700">Follow-up / Review Date:</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                        />
                      </div>
                      <div className="col-sm-6 d-flex align-items-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-info btn-block"
                          onClick={() => setActiveTab('orders')}
                        >
                          <i className="fas fa-pills mr-1"></i> Add Prescriptions / Orders &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Standalone Clinical Orders & Prescriptions */}
          {activeTab === 'orders' && (
            <div className="orders-container">
              {/* Top Department Switcher Pill Bar */}
              <div
                className="d-flex align-items-center justify-content-between flex-wrap p-2.5 mb-3 bg-white shadow-sm"
                style={{ borderRadius: '12px', border: '1px solid #e2e8f0', gap: '8px' }}
              >
                <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm d-inline-flex align-items-center font-weight-bold shadow-none ${
                      orderSectionTab === 'prescriptions'
                        ? 'btn-primary shadow-sm text-white'
                        : 'btn-light border text-gray-700'
                    }`}
                    style={{
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '0.84rem',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setOrderSectionTab('prescriptions')}
                  >
                    <i className="fas fa-prescription-bottle-alt mr-2 text-warning"></i>
                    Prescription Medications
                    <span
                      className={`badge ml-2 font-weight-bold ${
                        orderSectionTab === 'prescriptions' ? 'badge-light text-primary' : 'badge-primary text-white'
                      }`}
                      style={{ fontSize: '0.74rem' }}
                    >
                      {prescriptions.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm d-inline-flex align-items-center font-weight-bold shadow-none ${
                      orderSectionTab === 'lab'
                        ? 'btn-info shadow-sm text-white'
                        : 'btn-light border text-gray-700'
                    }`}
                    style={{
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '0.84rem',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setOrderSectionTab('lab')}
                  >
                    <i className="fas fa-vial mr-2 text-cyan"></i>
                    Laboratory Orders
                    <span
                      className={`badge ml-2 font-weight-bold ${
                        orderSectionTab === 'lab' ? 'badge-light text-info' : 'badge-info text-white'
                      }`}
                      style={{ fontSize: '0.74rem' }}
                    >
                      {labOrders.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm d-inline-flex align-items-center font-weight-bold shadow-none ${
                      orderSectionTab === 'radiology'
                        ? 'text-white shadow-sm'
                        : 'btn-light border text-gray-700'
                    }`}
                    style={{
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '0.84rem',
                      backgroundColor: orderSectionTab === 'radiology' ? '#7c3aed' : undefined,
                      borderColor: orderSectionTab === 'radiology' ? '#6d28d9' : undefined,
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setOrderSectionTab('radiology')}
                  >
                    <i className="fas fa-x-ray mr-2" style={{ color: orderSectionTab === 'radiology' ? '#ddd6fe' : '#7c3aed' }}></i>
                    Radiology Orders
                    <span
                      className="badge ml-2 font-weight-bold"
                      style={{
                        fontSize: '0.74rem',
                        backgroundColor: orderSectionTab === 'radiology' ? '#ede9fe' : '#7c3aed',
                        color: orderSectionTab === 'radiology' ? '#5b21b6' : '#ffffff',
                      }}
                    >
                      {radiologyOrders.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm d-inline-flex align-items-center font-weight-bold shadow-none ${
                      orderSectionTab === 'other_services'
                        ? 'text-white shadow-sm'
                        : 'btn-light border text-gray-700'
                    }`}
                    style={{
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '0.84rem',
                      backgroundColor: orderSectionTab === 'other_services' ? '#0d9488' : undefined,
                      borderColor: orderSectionTab === 'other_services' ? '#0f766e' : undefined,
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setOrderSectionTab('other_services')}
                  >
                    <i className="fas fa-hand-holding-medical mr-2" style={{ color: orderSectionTab === 'other_services' ? '#ccfbf1' : '#0d9488' }}></i>
                    Other Clinical Services
                    <span
                      className="badge ml-2 font-weight-bold"
                      style={{
                        fontSize: '0.74rem',
                        backgroundColor: orderSectionTab === 'other_services' ? '#ccfbf1' : '#0d9488',
                        color: orderSectionTab === 'other_services' ? '#115e59' : '#ffffff',
                      }}
                    >
                      {otherServiceOrders.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm d-inline-flex align-items-center font-weight-bold shadow-none ${
                      orderSectionTab === 'overview'
                        ? 'btn-dark shadow-sm text-white'
                        : 'btn-light border text-gray-700'
                    }`}
                    style={{
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '0.84rem',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setOrderSectionTab('overview')}
                  >
                    <i className="fas fa-layer-group mr-2 text-warning"></i>
                    All Orders Summary
                    <span
                      className={`badge ml-2 font-weight-bold ${
                        orderSectionTab === 'overview' ? 'badge-light text-dark' : 'badge-secondary text-white'
                      }`}
                      style={{ fontSize: '0.74rem' }}
                    >
                      {prescriptions.length + labOrders.length + radiologyOrders.length + otherServiceOrders.length}
                    </span>
                  </button>
                </div>

                <div className="d-flex align-items-center text-muted small">
                  {currentPlanName ? (
                    <span className="badge badge-light border text-primary px-2.5 py-1.5 font-weight-bold">
                      <i className="fas fa-shield-alt mr-1"></i> Patient Plan: {currentPlanName}
                    </span>
                  ) : (
                    <span className="badge badge-light border text-secondary px-2.5 py-1.5">
                      <i className="fas fa-user mr-1"></i> Private / Self-Pay
                    </span>
                  )}
                </div>
              </div>

              {/* Prescriptions Section (Stands On Its Own) */}
              {(orderSectionTab === 'prescriptions' || orderSectionTab === 'overview') && (
                <div className="w-100 mb-4">
                <div className="card shadow-sm border-0" style={{ borderRadius: '10px' }}>
                  <div className="card-header bg-white py-3 px-3 border-bottom d-flex justify-content-between align-items-center">
                    <strong className="text-gray-800" style={{ fontSize: '0.92rem' }}>
                      <i className="fas fa-prescription-bottle-alt text-primary mr-2"></i> Prescription Chart & Medications
                    </strong>
                    {onNavigate && (
                      <button
                        type="button"
                        className="btn btn-xs btn-outline-primary shadow-sm"
                        onClick={() => {
                          onNavigate('pharmacy');
                          showToast(`Opened Pharmacy chart for ${patientName}`, 'info');
                        }}
                      >
                        <i className="fas fa-external-link-alt mr-1"></i> Pharmacy Module
                      </button>
                    )}
                  </div>
                  <div className="card-body p-3">
                    {/* Patient Sponsor & Plan Coverage Banner */}
                    {isPrivatePatient ? (
                      <div
                        className="alert alert-secondary py-2 px-3 mb-3 d-flex align-items-center justify-content-between flex-wrap"
                        style={{
                          borderRadius: '8px',
                          borderLeft: '4px solid #10b981',
                          backgroundColor: '#ecfdf5',
                          borderColor: '#a7f3d0',
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div className="mr-3 text-success" style={{ fontSize: '1.4rem' }}>
                            <i className="fas fa-user-check"></i>
                          </div>
                          <div>
                            <div className="font-weight-bold text-dark small d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
                              <span>Private Patient &bull; General Pricing:</span>
                              <span className="text-success font-weight-bold">{currentSponsorName || 'Private / Cash'}</span>
                              {currentPlanName && (
                                <span className="badge badge-success px-2 py-0.5 font-weight-bold">
                                  {currentPlanName}
                                </span>
                              )}
                              <span className="badge badge-light border text-success font-weight-bold ml-1">
                                <i className="fas fa-coins mr-1"></i> Self-Pay (Cash / Purse)
                              </span>
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              Private sponsor patients maintain the standard General Price. No HMO approval required; billed directly to patient.
                            </div>
                          </div>
                        </div>
                        <span className="badge badge-success px-2.5 py-1.5 font-weight-bold">
                          <i className="fas fa-tag mr-1"></i> General Price Active ({generalMedications.length})
                        </span>
                      </div>
                    ) : (currentSponsorName || currentPlanName) ? (
                      <div
                        className="alert alert-info py-2 px-3 mb-3 d-flex align-items-center justify-content-between flex-wrap"
                        style={{
                          borderRadius: '8px',
                          borderLeft: '4px solid #0284c7',
                          backgroundColor: '#f0f9ff',
                          borderColor: '#bae6fd',
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div className="mr-3 text-primary" style={{ fontSize: '1.4rem' }}>
                            <i className="fas fa-shield-alt"></i>
                          </div>
                          <div>
                            <div className="font-weight-bold text-dark small d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
                              <span>HMO Sponsor Coverage (Claims):</span>
                              <span className="text-primary font-weight-bold">{currentSponsorName || 'HMO Sponsor'}</span>
                              {currentPlanName && (
                                <span className="badge badge-primary px-2 py-1 font-weight-bold">
                                  {currentPlanName}
                                </span>
                              )}
                              <span className="badge badge-light border text-primary font-weight-bold ml-1">
                                <i className="fas fa-file-medical mr-1"></i> Requires HMO Claim / Approval
                              </span>
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {loadingCoveredMeds ? (
                                <span><i className="fas fa-spinner fa-spin mr-1"></i> Loading HMO formulary medications...</span>
                              ) : coveredMedications.length > 0 ? (
                                <span>
                                  <i className="fas fa-check-circle text-success mr-1"></i>
                                  <strong>{coveredMedications.length}</strong> covered medication{coveredMedications.length > 1 ? 's' : ''} under HMO plan. If a drug is not covered, switch to <strong>General Tariff</strong> and patient will <strong>pay from purse</strong>.
                                </span>
                              ) : (
                                <span className="text-warning font-weight-bold">
                                  <i className="fas fa-info-circle mr-1"></i>
                                  No medication price tariffs added for {currentPlanName || currentSponsorName} yet. Switch to General Tariff to prescribe.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {coveredMedications.length > 0 && (
                          <span className="badge badge-light border text-primary font-weight-bold px-2 py-1 small">
                            <i className="fas fa-pills mr-1"></i> {coveredMedications.length} Plan Tariffs
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="alert alert-light border py-2 px-3 mb-3 d-flex align-items-center justify-content-between small text-muted">
                        <div>
                          <i className="fas fa-user mr-1 text-secondary"></i>
                          <strong>Private / Cash Patient:</strong> General prices apply. Billed as self-pay cash.
                        </div>
                        <span className="badge badge-secondary">General Price</span>
                      </div>
                    )}

                    {/* Professional Prescription Entry Form (Standard EMR) */}
                    <div className="p-3 bg-white rounded border mb-3 shadow-sm" style={{ border: '1px solid #cbd5e1' }}>
                      <div className="font-weight-bold small text-gray-800 mb-2.5 d-flex justify-content-between align-items-center border-bottom pb-2">
                        <span className="d-flex align-items-center">
                          <i className="fas fa-pills text-primary mr-2" style={{ fontSize: '1.1rem' }}></i>
                          <span style={{ fontSize: '0.92rem' }}>Medication Prescription & Dispensing Form</span>
                        </span>
                        <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                          {isHmoPatient ? (
                            <div className="btn-group btn-group-sm p-0.5 bg-light rounded border" role="group">
                              <button
                                type="button"
                                className={`btn btn-xs py-1 px-2.5 font-weight-bold ${
                                  tariffMode === 'covered' ? 'btn-primary shadow-xs' : 'btn-light text-secondary'
                                }`}
                                style={{ borderRadius: '5px', fontSize: '0.78rem' }}
                                onClick={() => {
                                  setTariffMode('covered');
                                  setSelectedMedTariff(null);
                                }}
                                title="Search drugs covered by patient HMO plan (Requires HMO Claim/Approval)"
                              >
                                <i className="fas fa-shield-alt mr-1"></i> HMO Formulary ({coveredMedications.length})
                              </button>
                              <button
                                type="button"
                                className={`btn btn-xs py-1 px-2.5 font-weight-bold ${
                                  tariffMode === 'general' ? 'btn-warning text-dark shadow-xs' : 'btn-light text-secondary'
                                }`}
                                style={{ borderRadius: '5px', fontSize: '0.78rem' }}
                                onClick={() => {
                                  setTariffMode('general');
                                  setSelectedMedTariff(null);
                                }}
                                title="HMO doesn't cover drug? Switch to General Tariff: drug will carry label 'Pay from your purse'"
                              >
                                <i className="fas fa-wallet mr-1"></i> Not Covered? Switch to General Tariff &bull; Pay from your purse ({generalMedications.length})
                              </button>
                            </div>
                          ) : (
                            <span className="badge badge-success px-2.5 py-1.5 font-weight-bold shadow-xs">
                              <i className="fas fa-wallet mr-1"></i> Private Patient &bull; General Price ({generalMedications.length || coveredMedications.length})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Header Labels matching standard EMR */}
                      <div className="row no-gutters mb-1 font-weight-bold text-gray-700" style={{ fontSize: '0.78rem' }}>
                        <div className="col-md-3 pr-1">Drug</div>
                        <div className="col-md-2 px-1">Dosage Form</div>
                        <div className="col-md-2 px-1">Strength</div>
                        <div className="col-md-1 px-1">Unit</div>
                        <div className="col-md-1 px-1">Qty/Dose</div>
                        <div className="col-md-2 px-1">How Often</div>
                        <div className="col-md-1 pl-1 text-center">Action</div>
                      </div>

                      {/* Primary Controls Row */}
                      <div className="row no-gutters mb-2">
                        {/* 1. Drug Search / Autocomplete */}
                        <div className="col-md-3 pr-1 position-relative" ref={drugDropdownRef}>
                          <div className="input-group input-group-sm">
                            <input
                              type="text"
                              className="form-control form-control-sm font-weight-bold text-dark"
                              placeholder={tariffMode === 'general' ? "Search general price drugs..." : "Type or select drug..."}
                              value={drugName}
                              onFocus={() => setShowDrugDropdown(true)}
                              onChange={(e) => handleDrugInputChange(e.target.value)}
                              onKeyDown={handleDrugKeyDown}
                              autoComplete="off"
                            />
                            {drugName ? (
                              <div className="input-group-append">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => {
                                    setDrugName('');
                                    setSelectedMedTariff(null);
                                    setShowDrugDropdown(true);
                                  }}
                                  title="Clear"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            ) : (
                              <div className="input-group-append">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => setShowDrugDropdown(!showDrugDropdown)}
                                >
                                  <i className="fas fa-chevron-down fa-xs"></i>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Autocomplete Dropdown */}
                          {showDrugDropdown && (
                            <div
                              className="dropdown-menu show w-100 shadow-lg p-0"
                              style={{
                                maxHeight: '320px',
                                overflowY: 'auto',
                                zIndex: 1050,
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              <div className="p-2 bg-light border-bottom d-flex justify-content-between align-items-center">
                                <span className="small font-weight-bold text-dark">
                                  {tariffMode === 'general' ? (
                                    <span className="text-warning font-weight-bold">
                                      <i className="fas fa-wallet mr-1"></i> General Tariff (Pay from your purse)
                                    </span>
                                  ) : (
                                    <span>Formulary: {currentPlanName || 'Medication Tariffs'}</span>
                                  )}
                                </span>
                                <span className="badge badge-secondary small">
                                  {filteredCoveredMeds.length} available
                                </span>
                              </div>

                              {loadingCoveredMeds ? (
                                <div className="p-3 text-center text-muted small">
                                  <i className="fas fa-spinner fa-spin mr-1"></i> Loading medications...
                                </div>
                              ) : filteredCoveredMeds.length > 0 ? (
                                <>
                                  {filteredCoveredMeds.map((med, idx) => (
                                    <button
                                      key={med.id || idx}
                                      type="button"
                                      className={`dropdown-item py-2 px-3 border-bottom text-wrap d-flex justify-content-between align-items-center ${
                                        selectedDrugIndex === idx ? 'bg-primary text-white' : ''
                                      }`}
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => handleSelectCoveredDrug(med)}
                                    >
                                      <div>
                                        <div className={`font-weight-bold ${selectedDrugIndex === idx ? 'text-white' : 'text-dark'}`}>
                                          {med.product_name}
                                        </div>
                                        <div className={`small ${selectedDrugIndex === idx ? 'text-white-50' : 'text-muted'}`}>
                                          {(med.sku || med.product_id) && <span className="mr-2">SKU: {med.sku || med.product_id}</span>}
                                          {med.stock !== undefined && (
                                            <span className="mr-2 font-weight-bold">Stock: {med.stock}</span>
                                          )}
                                          {med.is_general || tariffMode === 'general' ? (
                                            <span className="badge badge-warning text-dark font-weight-bold mr-1">
                                              Pay from your purse
                                            </span>
                                          ) : med.plan_name ? (
                                            <span className={`badge ${selectedDrugIndex === idx ? 'badge-light text-primary' : 'badge-info'} mr-1`}>
                                              {med.plan_name}
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                      <div className="text-right ml-2 flex-shrink-0">
                                        <span className={`badge ${selectedDrugIndex === idx ? 'badge-light text-success font-weight-bold' : 'badge-success'} px-2 py-1`}>
                                          ₦{Number(med.rate || 0).toLocaleString()}
                                        </span>
                                      </div>
                                    </button>
                                  ))}

                                  {/* Quick Switch Button at bottom of dropdown for HMO patients */}
                                  {isHmoPatient && (
                                    <div className="p-2 bg-light border-top text-center">
                                      <button
                                        type="button"
                                        className="btn btn-link btn-sm p-0 font-weight-bold"
                                        style={{ fontSize: '0.78rem', color: tariffMode === 'covered' ? '#b45309' : '#2563eb' }}
                                        onClick={() => {
                                          setTariffMode(tariffMode === 'covered' ? 'general' : 'covered');
                                          setShowDrugDropdown(true);
                                        }}
                                      >
                                        {tariffMode === 'covered' ? (
                                          <>
                                            <i className="fas fa-exchange-alt mr-1"></i> Drug not covered? Switch to <strong>General Tariff (Pay from your purse)</strong>
                                          </>
                                        ) : (
                                          <>
                                            <i className="fas fa-exchange-alt mr-1"></i> Switch back to <strong>HMO Formulary ({currentPlanName || currentSponsorName})</strong>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="p-3 text-center">
                                  <div className="text-muted small mb-2">
                                    {isHmoPatient && tariffMode === 'covered' ? (
                                      <>
                                        "<strong>{drugName}</strong>" is not covered in <strong>{currentPlanName || 'patient HMO plan'}</strong>.
                                      </>
                                    ) : (
                                      <>No medication found matching "<strong>{drugName}</strong>".</>
                                    )}
                                  </div>
                                  {isHmoPatient && tariffMode === 'covered' && (
                                    <div className="mb-2">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-warning font-weight-bold shadow-xs px-3"
                                        onClick={() => {
                                          setTariffMode('general');
                                          setShowDrugDropdown(true);
                                        }}
                                      >
                                        <i className="fas fa-wallet mr-1"></i> Switch to General Tariff (Pay from your purse)
                                      </button>
                                    </div>
                                  )}
                                  {drugName.trim() && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => setShowDrugDropdown(false)}
                                    >
                                      <i className="fas fa-check mr-1"></i> Use "{drugName.trim()}" (Standard)
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Stock and Coverage Tags under Drug Name */}
                          <div className="d-flex align-items-center mt-1 flex-wrap" style={{ gap: '4px', fontSize: '0.74rem' }}>
                            {selectedMedTariff?.stock !== undefined ? (
                              <span className={`badge ${selectedMedTariff.stock > 0 ? 'badge-light text-dark border' : 'badge-danger'}`}>
                                QoH: {Number(selectedMedTariff.stock).toFixed(2)}
                              </span>
                            ) : (
                              <span className="badge badge-light border text-muted">QoH: In Stock</span>
                            )}
                            {selectedMedTariff?.is_pay_from_purse || tariffMode === 'general' ? (
                              <span
                                className="badge px-2 py-1 font-weight-bold shadow-xs"
                                style={{
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e',
                                  border: '1px solid #fde68a',
                                }}
                              >
                                <i className="fas fa-wallet mr-1"></i> Pay from your purse &bull; ₦{Number(selectedMedTariff?.rate || 0).toLocaleString()}
                              </span>
                            ) : selectedMedTariff ? (
                              <span className="badge badge-info px-1.5 py-0.5">
                                Covered ({selectedMedTariff.plan_name || 'Primary'}) &bull; ₦{Number(selectedMedTariff.rate || 0).toLocaleString()}
                              </span>
                            ) : (
                              <span className="badge badge-secondary px-1.5 py-0.5">Standard Rate</span>
                            )}
                          </div>
                        </div>

                        {/* 2. Dosage Form */}
                        <div className="col-md-2 px-1">
                          <select
                            className="form-control form-control-sm font-weight-bold text-dark"
                            value={dosageForm}
                            onChange={(e) => handleDosageFormChange(e.target.value)}
                          >
                            <option value="Tablet">Tablet</option>
                            <option value="Caplet">Caplet</option>
                            <option value="Syrup">Syrup</option>
                            <option value="Suspension">Suspension</option>
                            <option value="Drops">Drops</option>
                            <option value="Capsule">Capsule</option>
                            <option value="Injection">Injection</option>
                            <option value="Suppository">Suppository</option>
                            <option value="Inhaler">Inhaler</option>
                            <option value="Ointment">Ointment / Cream</option>
                            <option value="Sachet">Sachet</option>
                          </select>
                        </div>

                        {/* 3. Strength */}
                        <div className="col-md-2 px-1">
                          {['Syrup', 'Suspension'].includes(dosageForm) ? (
                            <select
                              className="form-control form-control-sm font-weight-bold text-dark"
                              value={strength}
                              onChange={(e) => setStrength(e.target.value)}
                            >
                              <option value="120mg - 5ml">120mg - 5ml</option>
                              <option value="250mg - 5ml">250mg - 5ml</option>
                              <option value="100mg - 5ml">100mg - 5ml</option>
                              <option value="200mg - 5ml">200mg - 5ml</option>
                              <option value="5ml">5ml</option>
                              <option value="10ml">10ml</option>
                              <option value="15ml">15ml</option>
                              <option value="50mg - 1ml">50mg - 1ml</option>
                            </select>
                          ) : dosageForm === 'Drops' ? (
                            <select
                              className="form-control form-control-sm font-weight-bold text-dark"
                              value={strength}
                              onChange={(e) => setStrength(e.target.value)}
                            >
                              <option value="100mg - 1ml">100mg - 1ml</option>
                              <option value="50mg - 1ml">50mg - 1ml</option>
                              <option value="10mg - 1ml">10mg - 1ml</option>
                              <option value="15ml">15ml</option>
                            </select>
                          ) : (
                            <select
                              className="form-control form-control-sm font-weight-bold text-dark"
                              value={strength}
                              onChange={(e) => setStrength(e.target.value)}
                            >
                              <option value="500mg">500mg</option>
                              <option value="250mg">250mg</option>
                              <option value="100mg">100mg</option>
                              <option value="625mg">625mg</option>
                              <option value="1g">1g</option>
                              <option value="200mg">200mg</option>
                              <option value="50mg">50mg</option>
                              <option value="20mg">20mg</option>
                              <option value="10mg">10mg</option>
                              <option value="5mg">5mg</option>
                            </select>
                          )}
                        </div>

                        {/* 4. Unit */}
                        <div className="col-md-1 px-1">
                          <select
                            className="form-control form-control-sm"
                            value={doseUnit}
                            onChange={(e) => setDoseUnit(e.target.value)}
                          >
                            {['Syrup', 'Suspension'].includes(dosageForm) ? (
                              <>
                                <option value="ml">ml</option>
                                <option value="mg">mg</option>
                                <option value="tsp (5ml)">tsp (5ml)</option>
                                <option value="tbsp (15ml)">tbsp (15ml)</option>
                              </>
                            ) : dosageForm === 'Drops' ? (
                              <>
                                <option value="drops">drops</option>
                                <option value="ml">ml</option>
                              </>
                            ) : (
                              <>
                                <option value="tab">tab</option>
                                <option value="mg">mg</option>
                                <option value="caplet">caplet</option>
                                <option value="cap">cap</option>
                                <option value="sachet">sachet</option>
                                <option value="puffs">puffs</option>
                                <option value="supp">supp</option>
                                <option value="vial">vial</option>
                                <option value="g">g</option>
                              </>
                            )}
                          </select>
                        </div>

                        {/* 5. Qty/Dose */}
                        <div className="col-md-1 px-1">
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            className="form-control form-control-sm font-weight-bold text-center"
                            value={qtyDose}
                            onChange={(e) => setQtyDose(e.target.value)}
                          />
                        </div>

                        {/* 6. How Often (Frequency) */}
                        <div className="col-md-2 px-1">
                          <select
                            className="form-control form-control-sm font-weight-bold text-dark"
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                          >
                            <option value="Once daily (od)">Once Daily (od)</option>
                            <option value="Hourly">Hourly</option>
                            <option value="Twice daily (bd)">Bd (Twice daily)</option>
                            <option value="Three times daily (tds)">Tds (Three times daily)</option>
                            <option value="Four times daily (qid)">Qds (Four times daily)</option>
                            <option value="12 hourly">12 hourly</option>
                            <option value="8 hourly">8 hourly</option>
                            <option value="6 hourly">6 hourly</option>
                            <option value="Every 4 hours (q4h)">Every 4 hours (q4h)</option>
                            <option value="At bedtime / Night (nocte)">At Night (nocte)</option>
                            <option value="In the morning (mane)">Morning (mane)</option>
                            <option value="Every other day (alt die)">Every other day (alt die)</option>
                            <option value="Once weekly">Once weekly</option>
                            <option value="As needed (prn)">As needed (prn)</option>
                            <option value="Stat / Single dose">Stat (Single dose)</option>
                          </select>
                        </div>

                        {/* 7. Action Button */}
                        <div className="col-md-1 pl-1 text-center">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary btn-block font-weight-bold"
                            onClick={handleAddPrescription}
                            title="Add Medication to Prescription"
                          >
                            <i className="fas fa-plus"></i> Add
                          </button>
                        </div>
                      </div>

                      {/* Secondary Sub-row aligned directly with fields (Route under Dosage Form, Duration under Strength, Start Date, Comment) */}
                      <div className="row no-gutters mb-2 align-items-center" style={{ fontSize: '0.8rem' }}>
                        <div className="col-md-3 pr-1">
                          {/* Blank spacer aligning under Drug */}
                        </div>

                        {/* Route aligned directly under Dosage Form */}
                        <div className="col-md-2 px-1">
                          <select
                            className="form-control form-control-sm font-weight-bold text-dark border-primary"
                            value={medRoute}
                            onChange={(e) => setMedRoute(e.target.value)}
                            title="Route of Administration (mapped with Dosage Form)"
                          >
                            <optgroup label={`Mapped for ${dosageForm}`}>
                              {(DOSAGE_FORM_ROUTES_MAP[dosageForm]?.routes || ['Oral']).map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Other Routes">
                              {ALL_COMMON_ROUTES.filter(
                                (r) => !(DOSAGE_FORM_ROUTES_MAP[dosageForm]?.routes || []).includes(r)
                              ).map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        {/* Duration aligned under Strength */}
                        <div className="col-md-2 px-1">
                          <div className="input-group input-group-sm">
                            <input
                              type="number"
                              min="1"
                              className="form-control form-control-sm font-weight-bold text-center"
                              placeholder="Duration"
                              value={durationVal}
                              onChange={(e) => setDurationVal(e.target.value)}
                              title="Duration Number"
                              style={{ width: '45%' }}
                            />
                            <select
                              className="form-control form-control-sm font-weight-bold text-dark"
                              value={durationUnit}
                              onChange={(e) => setDurationUnit(e.target.value)}
                              title="Duration Unit"
                            >
                              <option value="Day(s)">Day(s)</option>
                              <option value="Week(s)">Week(s)</option>
                              <option value="Month(s)">Month(s)</option>
                            </select>
                          </div>
                        </div>

                        {/* Start Date aligned under Unit + Qty/Dose */}
                        <div className="col-md-2 px-1">
                          <div className="input-group input-group-sm">
                            <div className="input-group-prepend">
                              <span className="input-group-text bg-light text-muted px-1.5" style={{ fontSize: '0.75rem' }}>
                                <i className="far fa-calendar-alt"></i>
                              </span>
                            </div>
                            <input
                              type="date"
                              className="form-control form-control-sm px-1"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              title="Start Date"
                            />
                          </div>
                        </div>

                        {/* Comment aligned under How Often */}
                        <div className="col-md-2 px-1">
                          <div className="input-group input-group-sm">
                            <div className="input-group-prepend">
                              <span className="input-group-text bg-light text-muted px-1.5" style={{ fontSize: '0.75rem' }}>
                                <i className="fas fa-comment-medical"></i>
                              </span>
                            </div>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Comment (e.g. After meals)..."
                              value={medComment}
                              onChange={(e) => setMedComment(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Blank spacer aligning under Action button */}
                        <div className="col-md-1 pl-1 text-center"></div>
                      </div>

                      {/* If Syrup or Suspension: Bottle Size Selector (15ml, 30ml, 50ml, 60ml, 100ml, 120ml, 150ml, 200ml) */}
                      {['Syrup', 'Suspension', 'Drops'].includes(dosageForm) && (() => {
                        const autoRecSize = getOptimalBottleSize(drugName, dosageForm, qtyDose, frequency, durationVal, durationUnit);
                        return (
                          <div className="p-2 mb-2 bg-light rounded border d-flex align-items-center justify-content-between flex-wrap" style={{ fontSize: '0.8rem' }}>
                            <div className="d-flex align-items-center mb-1 mb-md-0 flex-wrap">
                              <i className="fas fa-prescription-bottle-alt text-info mr-2"></i>
                              <strong className="text-dark mr-2">Hospital Bottle Size to Dispense:</strong>
                              <div className="btn-group btn-group-sm mr-2" role="group">
                                {STANDARD_HOSPITAL_BOTTLE_SIZES.map((b) => (
                                  <button
                                    key={b}
                                    type="button"
                                    className={`btn btn-xs ${
                                      String(syrupBottleSize) === b ? 'btn-primary font-weight-bold shadow-sm' : 'btn-outline-secondary'
                                    }`}
                                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                    onClick={() => {
                                      setSyrupBottleSize(b);
                                      setIsBottleSizeManual(true);
                                    }}
                                    title={`Select ${b}ml bottle size`}
                                  >
                                    {b}ml
                                  </button>
                                ))}
                              </div>
                              {!isBottleSizeManual ? (
                                <span
                                  className="badge badge-success-light text-success border border-success mr-2 py-1 px-2"
                                  style={{ fontSize: '0.72rem', backgroundColor: '#ecfdf5', borderRadius: '4px' }}
                                  title="Automatically calculated and picked based on prescription regimen and package size"
                                >
                                  <i className="fas fa-magic mr-1"></i> Auto-selected
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline-info mr-2"
                                  style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                                  onClick={() => {
                                    setIsBottleSizeManual(false);
                                    setSyrupBottleSize(String(autoRecSize));
                                  }}
                                  title={`Reset to automatically calculated hospital bottle size (${autoRecSize}ml)`}
                                >
                                  <i className="fas fa-sync-alt mr-1"></i> Auto-pick ({autoRecSize}ml)
                                </button>
                              )}
                            </div>
                            <div className="d-flex align-items-center">
                              <span className="small text-muted mr-1">Custom:</span>
                              <input
                                type="number"
                                className="form-control form-control-sm font-weight-bold text-center"
                                style={{ width: '70px', height: '26px' }}
                                value={syrupBottleSize}
                                onChange={(e) => {
                                  setSyrupBottleSize(e.target.value);
                                  setIsBottleSizeManual(true);
                                }}
                                placeholder="ml"
                              />
                              <span className="small text-muted ml-1">ml bottle</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Real-time Pharmacy Dispensing Calculation Box */}
                      {(() => {
                        const preview = calculateDispense();
                        return (
                          <div
                            className={`p-2.5 rounded border d-flex align-items-center justify-content-between flex-wrap ${
                              preview.type === 'liquid'
                                ? 'bg-success-light border-success text-success'
                                : 'bg-primary-light border-primary text-primary'
                            }`}
                            style={{
                              backgroundColor: preview.type === 'liquid' ? '#ecfdf5' : '#eff6ff',
                              borderColor: preview.type === 'liquid' ? '#a7f3d0' : '#bfdbfe',
                            }}
                          >
                            <div className="d-flex align-items-center">
                              <span
                                className="mr-2 d-inline-flex align-items-center justify-content-center rounded-circle"
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  backgroundColor: preview.type === 'liquid' ? '#d1fae5' : '#dbeafe',
                                  color: preview.type === 'liquid' ? '#059669' : '#2563eb',
                                }}
                              >
                                <i className={`fas ${preview.type === 'liquid' ? 'fa-prescription-bottle' : 'fa-calculator'}`}></i>
                              </span>
                              <div>
                                <span className="font-weight-bold text-dark small mr-2">
                                  {preview.type === 'liquid' ? 'Pharmacy Dispense Calculation (Liquid / Syrup Bottles):' : 'Pharmacy Dispense Calculation (Solid Pieces):'}
                                </span>
                                <span className="small text-muted">
                                  {qtyDose} {doseUnit} × {frequency} ({preview.timesPerDay}x/day) × {durationVal} {durationUnit} ({preview.totalDays} day{preview.totalDays > 1 ? 's' : ''})
                                  {preview.type === 'liquid' && (
                                    <> &rarr; <strong>{preview.totalVolumeMl} ml</strong> Total Volume</>
                                  )}
                                </span>
                              </div>
                            </div>
                            <div>
                              <span
                                className={`badge px-3 py-1.5 font-weight-bold shadow-sm ${
                                  preview.type === 'liquid' ? 'badge-success' : 'badge-primary'
                                }`}
                                style={{ fontSize: '0.86rem' }}
                              >
                                <i className={`fas ${preview.type === 'liquid' ? 'fa-box-open' : 'fa-pills'} mr-1`}></i>
                                Pharmacy Dispense: {preview.dispenseText}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Prescriptions List Table */}
                    {prescriptions.length > 0 ? (
                      <div className="table-responsive shadow-sm rounded border">
                        <table className="table table-sm table-bordered table-hover mb-0">
                          <thead className="thead-light">
                            <tr style={{ fontSize: '0.8rem' }}>
                              <th style={{ width: '30px' }}>#</th>
                              <th>Medication &amp; Form</th>
                              <th>Strength / Unit</th>
                              <th>Clinical Regimen</th>
                              <th className="bg-light-primary text-primary font-weight-bold">
                                <i className="fas fa-hand-holding-medical mr-1"></i> Pharmacy Dispense to Patient
                              </th>
                              <th>Coverage / Tariff</th>
                              <th>Special Instructions</th>
                              <th>Start Date</th>
                              <th style={{ width: '40px' }} className="text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {prescriptions.map((p, idx) => (
                              <tr key={p.id} style={{ fontSize: '0.84rem' }}>
                                <td className="text-center font-weight-bold text-muted">{idx + 1}</td>
                                <td>
                                  <div className="d-flex align-items-center flex-wrap" style={{ gap: '4px' }}>
                                    <span className="font-weight-bold text-primary">{p.drug}</span>
                                    {p.is_pay_from_purse && (
                                      <span
                                        className="badge px-2 py-0.5 font-weight-bold shadow-xs"
                                        style={{
                                          backgroundColor: '#fef3c7',
                                          color: '#92400e',
                                          border: '1px solid #fde68a',
                                          fontSize: '0.72rem',
                                        }}
                                      >
                                        <i className="fas fa-wallet mr-1"></i> Pay from your purse
                                      </span>
                                    )}
                                  </div>
                                  <div className="small text-muted d-flex align-items-center flex-wrap" style={{ gap: '4px' }}>
                                    <span className="badge badge-light border">{p.dosage_form || 'Tablet'}</span>
                                    {p.route && (
                                      <span className="badge badge-light text-primary border font-weight-bold">
                                        <i className="fas fa-route mr-1"></i>{p.route}
                                      </span>
                                    )}
                                    {p.sku && <span>SKU: {p.sku}</span>}
                                  </div>
                                </td>
                                <td>
                                  <span className="font-weight-bold">{p.strength || '-'}</span>
                                  <span className="text-muted small d-block">{p.dose_qty} {p.dose_unit} / dose</span>
                                </td>
                                <td>
                                  <div className="font-weight-bold text-dark">{p.frequency}</div>
                                  <div className="small text-muted">
                                    {p.duration}{p.route ? ` • via ${p.route}` : ''}
                                  </div>
                                </td>
                                <td className="bg-light-primary">
                                  <span
                                    className={`badge px-2.5 py-1.5 font-weight-bold ${
                                      p.dispense_type === 'liquid' ? 'badge-success' : 'badge-primary'
                                    }`}
                                    style={{ fontSize: '0.82rem' }}
                                  >
                                    <i className={`fas ${p.dispense_type === 'liquid' ? 'fa-prescription-bottle' : 'fa-pills'} mr-1`}></i>
                                    {p.dispense_detail || `${p.dispense_quantity || 1} ${p.dispense_unit || 'units'}`}
                                  </span>
                                </td>
                                <td>
                                  {p.is_pay_from_purse ? (
                                    <div>
                                      <span
                                        className="badge px-2 py-1 font-weight-bold shadow-xs"
                                        style={{
                                          backgroundColor: '#fef3c7',
                                          color: '#92400e',
                                          border: '1px solid #fde68a',
                                        }}
                                      >
                                        <i className="fas fa-wallet mr-1"></i> Pay from your purse
                                      </span>
                                      <div className="font-weight-bold text-dark mt-1" style={{ fontSize: '0.85rem' }}>
                                        ₦{Number(p.tariff_rate || 0).toLocaleString()}
                                      </div>
                                      <div className="text-muted" style={{ fontSize: '0.70rem' }}>Out-of-Pocket / Self-Pay</div>
                                    </div>
                                  ) : p.tariff_rate ? (
                                    <span className="badge badge-success px-2 py-1 font-weight-bold">
                                      ₦{Number(p.tariff_rate).toLocaleString()} &bull; {p.plan_name || 'Covered Plan'}
                                    </span>
                                  ) : (
                                    <span className="badge badge-secondary px-2 py-1">
                                      Standard / Out-of-Pocket
                                    </span>
                                  )}
                                </td>
                                <td className="small text-muted">
                                  {p.comment ? (
                                    <span className="text-dark font-weight-bold">{p.comment}</span>
                                  ) : (
                                    <span className="text-muted font-italic">As directed</span>
                                  )}
                                </td>
                                <td className="small font-weight-bold text-muted">
                                  {p.start_date || 'Today'}
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm text-danger p-0"
                                    onClick={() => handleRemovePrescription(p.id)}
                                    title="Remove Prescription"
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted small bg-light rounded border">
                        <i className="fas fa-prescription-bottle-alt fa-2x text-gray-300 mb-2 d-block"></i>
                        No medications added yet for this consultation. Use the form above to add prescriptions.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* SECTION 2: LABORATORY ORDERS (STANDS ON ITS OWN) */}
              {(orderSectionTab === 'lab' || orderSectionTab === 'overview') && (
                <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div
                    className="card-header bg-white py-3 px-3.5 border-bottom d-flex justify-content-between align-items-center flex-wrap"
                    style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px', gap: '8px' }}
                  >
                    <div className="d-flex align-items-center">
                      <span
                        className="d-inline-flex align-items-center justify-content-center mr-2.5 rounded-circle"
                        style={{ width: '32px', height: '32px', backgroundColor: '#e0f2fe', color: '#0284c7' }}
                      >
                        <i className="fas fa-vial"></i>
                      </span>
                      <div>
                        <strong className="text-gray-900" style={{ fontSize: '0.96rem' }}>
                          Laboratory Orders &amp; Diagnostic Pathology
                        </strong>
                        <span className="text-muted small d-block">
                          Requisition clinical laboratory investigations, blood tests, swabs, and urinalysis
                        </span>
                      </div>
                    </div>
                    {onNavigate && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-info shadow-sm"
                        style={{ borderRadius: '6px' }}
                        onClick={() => {
                          onNavigate('lab');
                          showToast(`Opened Laboratory module for ${patientName}`, 'info');
                        }}
                      >
                        <i className="fas fa-external-link-alt mr-1.5"></i> Lab Module
                      </button>
                    )}
                  </div>

                  <div className="card-body p-3.5">
                    {/* Patient Sponsor & Plan Coverage Lab Tariffs Banner */}
                    {isPrivatePatient ? (
                      <div
                        className="alert alert-success py-2 px-3 mb-3 d-flex align-items-center justify-content-between flex-wrap"
                        style={{
                          borderRadius: '8px',
                          borderLeft: '4px solid #10b981',
                          backgroundColor: '#ecfdf5',
                          borderColor: '#a7f3d0',
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div className="mr-3 text-success" style={{ fontSize: '1.4rem' }}>
                            <i className="fas fa-flask"></i>
                          </div>
                          <div>
                            <div className="font-weight-bold text-dark small d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
                              <span>Private Patient &bull; General Pricing:</span>
                              <span className="text-success font-weight-bold">{currentSponsorName || 'Private / Cash'}</span>
                              {currentPlanName && (
                                <span className="badge badge-success px-2 py-0.5 font-weight-bold">
                                  {currentPlanName}
                                </span>
                              )}
                              <span className="badge badge-light border text-success font-weight-bold ml-1">
                                <i className="fas fa-coins mr-1"></i> Self-Pay (Cash / Purse)
                              </span>
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              Private sponsor patients maintain the standard General Price. No HMO approval required; billed directly to patient.
                            </div>
                          </div>
                        </div>
                        <span className="badge badge-success px-2.5 py-1.5 font-weight-bold">
                          <i className="fas fa-tag mr-1"></i> General Price Active ({generalLabTariffs.length})
                        </span>
                      </div>
                    ) : (currentSponsorName || currentPlanName) ? (
                      <div
                        className="alert alert-info py-2 px-3 mb-3 d-flex align-items-center justify-content-between flex-wrap"
                        style={{
                          borderRadius: '8px',
                          borderLeft: '4px solid #0284c7',
                          backgroundColor: '#f0f9ff',
                          borderColor: '#bae6fd',
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div className="mr-3 text-info" style={{ fontSize: '1.4rem' }}>
                            <i className="fas fa-shield-alt"></i>
                          </div>
                          <div>
                            <div className="font-weight-bold text-dark small d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
                              <span>HMO Sponsor Coverage (Claims):</span>
                              <span className="text-info font-weight-bold">{currentSponsorName || 'HMO Sponsor'}</span>
                              {currentPlanName && (
                                <span className="badge badge-info px-2 py-1 font-weight-bold">
                                  {currentPlanName}
                                </span>
                              )}
                              <span className="badge badge-light border text-info font-weight-bold ml-1">
                                <i className="fas fa-file-medical mr-1"></i> Requires HMO Claim / Approval
                              </span>
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {loadingCoveredLabs ? (
                                <span><i className="fas fa-spinner fa-spin mr-1"></i> Loading HMO covered lab investigations...</span>
                              ) : coveredLabTariffs.length > 0 ? (
                                <span>
                                  <i className="fas fa-check-circle text-success mr-1"></i>
                                  <strong>{coveredLabTariffs.length}</strong> covered test{coveredLabTariffs.length > 1 ? 's' : ''} under HMO plan. If a test is not covered, switch to <strong>General Tariff</strong> and patient will <strong>pay from purse</strong>.
                                </span>
                              ) : (
                                <span className="text-warning font-weight-bold">
                                  <i className="fas fa-info-circle mr-1"></i>
                                  No lab price tariffs added for {currentPlanName || currentSponsorName} yet. Switch to General Tariff to requisition.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {coveredLabTariffs.length > 0 && (
                          <span className="badge badge-light border text-info font-weight-bold px-2 py-1 small">
                            <i className="fas fa-vial mr-1"></i> {coveredLabTariffs.length} Plan Tariffs
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="alert alert-light border py-2 px-3 mb-3 d-flex align-items-center justify-content-between small text-muted">
                        <div>
                          <i className="fas fa-user mr-1 text-secondary"></i>
                          <strong>Private / Cash Patient:</strong> Standard general laboratory test tariffs apply.
                        </div>
                        <span className="badge badge-secondary">Private / Cash</span>
                      </div>
                    )}

                    {/* Lab Order Requisition Form */}
                    <div className="p-3 bg-light rounded border mb-3" style={{ borderColor: '#e2e8f0' }}>
                      <div className="d-flex justify-content-between align-items-center flex-wrap mb-2" style={{ gap: '8px' }}>
                        <div className="font-weight-bold small text-gray-800 d-flex align-items-center">
                          <i className="fas fa-plus-circle text-info mr-1.5"></i>
                          <span>Requisition Laboratory Test:</span>
                        </div>
                        <div>
                          {isHmoPatient ? (
                            <div className="btn-group btn-group-sm p-0.5 bg-light border" style={{ borderRadius: '6px' }}>
                              <button
                                type="button"
                                className={`btn btn-xs py-1 px-2.5 font-weight-bold ${
                                  labTariffMode === 'covered' ? 'btn-info text-white shadow-xs' : 'btn-light text-secondary'
                                }`}
                                style={{ borderRadius: '5px', fontSize: '0.78rem' }}
                                onClick={() => {
                                  setLabTariffMode('covered');
                                  setSelectedLabTariff(null);
                                }}
                                title="Search lab tests covered by patient HMO plan (Requires HMO Claim/Approval)"
                              >
                                <i className="fas fa-shield-alt mr-1"></i> HMO Covered ({coveredLabTariffs.length})
                              </button>
                              <button
                                type="button"
                                className={`btn btn-xs py-1 px-2.5 font-weight-bold ${
                                  labTariffMode === 'general' ? 'btn-warning text-dark shadow-xs' : 'btn-light text-secondary'
                                }`}
                                style={{ borderRadius: '5px', fontSize: '0.78rem' }}
                                onClick={() => {
                                  setLabTariffMode('general');
                                  setSelectedLabTariff(null);
                                }}
                                title="HMO doesn't cover test? Switch to General Tariff: test will carry label 'Pay from your purse'"
                              >
                                <i className="fas fa-wallet mr-1"></i> Not Covered? Switch to General Tariff &bull; Pay from your purse ({generalLabTariffs.length})
                              </button>
                            </div>
                          ) : (
                            <span className="badge badge-success px-2.5 py-1.5 font-weight-bold shadow-xs">
                              <i className="fas fa-wallet mr-1"></i> Private Patient &bull; General Price ({generalLabTariffs.length || coveredLabTariffs.length})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="position-relative" ref={labDropdownRef}>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text bg-white">
                              <i className="fas fa-microscope text-info"></i>
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={
                              labTariffMode === 'general'
                                ? 'Search general lab test (Pay from your purse)...'
                                : currentPlanName
                                ? `Search covered lab test for ${currentPlanName} (e.g. FBC, MP, PCV, Urinalysis, Widal)...`
                                : 'Search or type laboratory test (e.g. Full Blood Count, Malaria Parasite, Urinalysis)...'
                            }
                            value={labTestName}
                            onFocus={() => setShowLabDropdown(true)}
                            onChange={(e) => handleLabInputChange(e.target.value)}
                            onKeyDown={handleLabKeyDown}
                            autoComplete="off"
                          />
                          {labTestName && (
                            <div className="input-group-append">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                  setLabTestName('');
                                  setSelectedLabTariff(null);
                                  setShowLabDropdown(true);
                                }}
                                title="Clear search"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          )}
                          <div className="input-group-append">
                            <button
                              type="button"
                              className="btn btn-info font-weight-bold px-3"
                              onClick={() => handleAddLabOrder()}
                            >
                              <i className="fas fa-plus mr-1"></i> Order Lab Test
                            </button>
                          </div>
                        </div>

                        {/* Covered Lab Autocomplete Dropdown */}
                        {showLabDropdown && (
                          <div
                            className="dropdown-menu show w-100 shadow-lg p-0"
                            style={{
                              maxHeight: '280px',
                              overflowY: 'auto',
                              zIndex: 1050,
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            <div className="p-2 bg-light border-bottom d-flex justify-content-between align-items-center">
                              <span className="small font-weight-bold text-dark">
                                {labTariffMode === 'general' ? (
                                  <>
                                    <i className="fas fa-wallet text-warning mr-1"></i>
                                    General Tariff (Pay from your purse):
                                  </>
                                ) : currentPlanName ? (
                                  <>
                                    <i className="fas fa-shield-alt text-info mr-1"></i>
                                    Covered Lab Tariffs for {currentPlanName}:
                                  </>
                                ) : (
                                  'Hospital Laboratory Tests:'
                                )}
                              </span>
                              <span className="badge badge-secondary small">
                                {filteredCoveredLabs.length} available
                              </span>
                            </div>

                            {loadingCoveredLabs ? (
                              <div className="p-3 text-center text-muted small">
                                <i className="fas fa-spinner fa-spin mr-1"></i> Loading laboratory tests...
                              </div>
                            ) : filteredCoveredLabs.length > 0 ? (
                              filteredCoveredLabs.map((lab, idx) => (
                                <button
                                  key={lab.id || idx}
                                  type="button"
                                  className={`dropdown-item py-2 px-3 border-bottom text-wrap d-flex justify-content-between align-items-center ${
                                    selectedLabIndex === idx ? 'bg-info text-white' : ''
                                  }`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => handleSelectCoveredLab(lab)}
                                >
                                  <div>
                                    <div className="d-flex align-items-center">
                                      <i className="fas fa-vial text-info mr-2"></i>
                                      <span className={`font-weight-bold ${selectedLabIndex === idx ? 'text-white' : 'text-dark'}`}>
                                        {lab.item}
                                      </span>
                                      {(labTariffMode === 'general' || lab.is_general || (!lab.sponsor_id && !lab.plan_id)) && (
                                        <span className="badge badge-warning text-dark font-weight-bold ml-2 shadow-xs" style={{ fontSize: '0.70rem' }}>
                                          <i className="fas fa-wallet mr-1"></i> Pay from your purse
                                        </span>
                                      )}
                                    </div>
                                    <div className={`small ${selectedLabIndex === idx ? 'text-white-50' : 'text-muted'}`}>
                                      {lab.item_id && <span className="mr-2">Code: {lab.item_id}</span>}
                                      {lab.plan_name && (
                                        <span className={`badge ${selectedLabIndex === idx ? 'badge-light text-info' : 'badge-info'} mr-1`}>
                                          {lab.plan_name}
                                        </span>
                                      )}
                                      {lab.sponsor_name && (
                                        <span className="small">{lab.sponsor_name}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right ml-2 flex-shrink-0">
                                    <span className={`badge ${selectedLabIndex === idx ? 'badge-light text-success font-weight-bold' : 'badge-success'} px-2 py-1`}>
                                      ₦{Number(lab.rate || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center">
                                <div className="text-muted small mb-2">
                                  No {labTariffMode === 'general' ? 'general' : 'covered'} laboratory test found matching "<strong>{labTestName}</strong>"
                                  {labTariffMode === 'covered' && currentPlanName ? ` for ${currentPlanName}` : ''}.
                                </div>
                                {labTariffMode === 'covered' && generalLabTariffs.length > 0 && (
                                  <div className="mb-2">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-warning"
                                      onClick={() => {
                                        setLabTariffMode('general');
                                      }}
                                    >
                                      <i className="fas fa-wallet mr-1"></i> Test not covered? Switch to <strong>General Tariff (Pay from your purse)</strong>
                                    </button>
                                  </div>
                                )}
                                {labTestName.trim() && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-info"
                                    onClick={() => setShowLabDropdown(false)}
                                  >
                                    <i className="fas fa-check mr-1"></i> Order "{labTestName.trim()}" (Non-Tariff / Custom)
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Selected Lab Tariff Pill */}
                      {selectedLabTariff && (
                        <div className="d-flex align-items-center flex-wrap mt-2 small">
                          {selectedLabTariff.is_pay_from_purse || labTariffMode === 'general' ? (
                            <span className="badge badge-warning text-dark px-2.5 py-1 font-weight-bold shadow-xs mr-2">
                              <i className="fas fa-wallet mr-1"></i> Pay from your purse &bull; ₦{Number(selectedLabTariff.rate || 0).toLocaleString()}
                            </span>
                          ) : (
                            <span className="badge badge-success px-2.5 py-1 font-weight-bold shadow-xs mr-2">
                              <i className="fas fa-shield-alt mr-1"></i> HMO Covered &bull; ₦{Number(selectedLabTariff.rate || 0).toLocaleString()} ({selectedLabTariff.plan_name || 'Covered Plan'})
                            </span>
                          )}
                          <span className="text-dark font-weight-bold">
                            Selected: {selectedLabTariff.item}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ordered Laboratory Tests Table */}
                    {labOrders.length > 0 ? (
                      <div className="table-responsive border rounded" style={{ borderColor: '#e2e8f0' }}>
                        <table className="table table-sm table-hover mb-0">
                          <thead className="thead-light">
                            <tr>
                              <th style={{ width: '40px' }}>#</th>
                              <th>Laboratory Investigation</th>
                              <th>Test Code</th>
                              <th>Coverage / Tariff Rate</th>
                              <th>Status</th>
                              <th style={{ width: '50px' }} className="text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {labOrders.map((l, idx) => (
                              <tr key={l.id}>
                                <td className="text-muted font-weight-bold">{idx + 1}</td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <i className="fas fa-vial text-info mr-2"></i>
                                    <span className="font-weight-bold text-dark">{l.test}</span>
                                    {l.is_pay_from_purse && (
                                      <span className="badge badge-warning text-dark font-weight-bold ml-2 shadow-xs" style={{ fontSize: '0.68rem' }}>
                                        <i className="fas fa-wallet mr-1"></i> Pay from your purse
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span className="badge badge-light border text-muted">
                                    {l.item_id || 'LAB'}
                                  </span>
                                </td>
                                <td>
                                  {l.is_pay_from_purse ? (
                                    <div className="d-inline-flex align-items-center">
                                      <span className="badge badge-warning text-dark px-2 py-0.5 font-weight-bold mr-1">
                                        <i className="fas fa-wallet mr-1"></i> Pay from purse
                                      </span>
                                      <span className="font-weight-bold text-success" style={{ fontSize: '0.88rem' }}>
                                        ₦{Number(l.tariff_rate || 0).toLocaleString()}
                                      </span>
                                    </div>
                                  ) : l.tariff_rate ? (
                                    <span className="badge badge-success px-2 py-1 font-weight-bold">
                                      ₦{Number(l.tariff_rate).toLocaleString()} &bull; {l.plan_name || 'Covered Plan'}
                                    </span>
                                  ) : (
                                    <span className="badge badge-secondary px-2 py-1">
                                      Out-of-Pocket / Non-Tariff
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className="badge badge-warning px-2 py-0.5">
                                    <i className="fas fa-clock mr-1"></i> Requisitioned
                                  </span>
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger d-inline-flex align-items-center justify-content-center p-0"
                                    style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                                    onClick={() => handleRemoveLabOrder(l.id)}
                                    title="Remove Laboratory Test"
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted small bg-light rounded border">
                        <i className="fas fa-vial fa-2x text-gray-300 mb-2 d-block"></i>
                        No laboratory tests ordered yet for this consultation.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 3: RADIOLOGY ORDERS (STANDS ON ITS OWN) */}
              {(orderSectionTab === 'radiology' || orderSectionTab === 'overview') && (
                <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div
                    className="card-header bg-white py-3 px-3.5 border-bottom d-flex justify-content-between align-items-center flex-wrap"
                    style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px', gap: '8px' }}
                  >
                    <div className="d-flex align-items-center">
                      <span
                        className="d-inline-flex align-items-center justify-content-center mr-2.5 rounded-circle"
                        style={{ width: '32px', height: '32px', backgroundColor: '#f3e8ff', color: '#7c3aed' }}
                      >
                        <i className="fas fa-x-ray"></i>
                      </span>
                      <div>
                        <strong className="text-gray-900" style={{ fontSize: '0.96rem' }}>
                          Radiology &amp; Diagnostic Imaging Orders
                        </strong>
                        <span className="text-muted small d-block">
                          Order X-Rays, Ultrasounds, CT Scans, MRI, Echocardiography and Doppler studies
                        </span>
                      </div>
                    </div>
                    {onNavigate && (
                      <button
                        type="button"
                        className="btn btn-sm shadow-sm text-white"
                        style={{ borderRadius: '6px', backgroundColor: '#7c3aed' }}
                        onClick={() => {
                          onNavigate('radiology');
                          showToast(`Opened Radiology module for ${patientName}`, 'info');
                        }}
                      >
                        <i className="fas fa-external-link-alt mr-1.5"></i> Radiology Module
                      </button>
                    )}
                  </div>

                  <div className="card-body p-3.5">
                    {/* Patient Sponsor & Plan Coverage Radiology Tariffs Banner */}
                    {currentSponsorName || currentPlanName ? (
                      <div
                        className="alert alert-info py-2.5 px-3 mb-3 d-flex align-items-center justify-content-between flex-wrap"
                        style={{
                          borderRadius: '8px',
                          borderLeft: '4px solid #7c3aed',
                          backgroundColor: '#faf5ff',
                          borderColor: '#e9d5ff',
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div className="mr-3" style={{ fontSize: '1.4rem', color: '#7c3aed' }}>
                            <i className="fas fa-shield-alt"></i>
                          </div>
                          <div>
                            <div className="font-weight-bold text-dark small d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
                              <span>Active Radiology Tariff:</span>
                              <span className="font-weight-bold" style={{ color: '#7c3aed' }}>{currentSponsorName || 'HMO Sponsor'}</span>
                              {currentPlanName && (
                                <span className="badge px-2 py-0.5 font-weight-bold text-white" style={{ backgroundColor: '#7c3aed' }}>
                                  {currentPlanName}
                                </span>
                              )}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.76rem' }}>
                              {loadingCoveredRadiology ? (
                                <span><i className="fas fa-spinner fa-spin mr-1"></i> Loading covered radiology scans...</span>
                              ) : coveredRadiologyTariffs.length > 0 ? (
                                <span>
                                  <i className="fas fa-check-circle text-success mr-1"></i>
                                  <strong>{coveredRadiologyTariffs.length}</strong> radiology scan{coveredRadiologyTariffs.length > 1 ? 's' : ''} covered under this patient's plan tariff
                                </span>
                              ) : (
                                <span className="text-warning font-weight-bold">
                                  <i className="fas fa-info-circle mr-1"></i>
                                  No radiology tariffs configured for {currentPlanName || currentSponsorName} yet. Add in Billing &gt; Radiology Charges.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {coveredRadiologyTariffs.length > 0 && (
                          <span className="badge badge-light border font-weight-bold px-2 py-1 small" style={{ color: '#7c3aed' }}>
                            <i className="fas fa-x-ray mr-1"></i> {coveredRadiologyTariffs.length} Scans Available
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="alert alert-light border py-2 px-3 mb-3 d-flex align-items-center justify-content-between small text-muted">
                        <div>
                          <i className="fas fa-user mr-1 text-secondary"></i>
                          <strong>Private / Cash Patient:</strong> Standard radiology and scan tariffs apply.
                        </div>
                        <span className="badge badge-secondary">Private / Cash</span>
                      </div>
                    )}

                    {/* Radiology Order Requisition Form */}
                    <div className="p-3 bg-light rounded border mb-3" style={{ borderColor: '#e2e8f0' }}>
                      <div className="font-weight-bold small text-gray-800 mb-2 d-flex justify-content-between align-items-center">
                        <span>
                          <i className="fas fa-plus-circle mr-1.5" style={{ color: '#7c3aed' }}></i> Requisition Radiology Scan / Imaging:
                        </span>
                        {currentPlanName && (
                          <span className="small text-muted">
                            Tariff Filter: <strong style={{ color: '#7c3aed' }}>{currentPlanName}</strong>
                          </span>
                        )}
                      </div>

                      <div className="position-relative" ref={radiologyDropdownRef}>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text bg-white">
                              <i className="fas fa-x-ray" style={{ color: '#7c3aed' }}></i>
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={
                              currentPlanName
                                ? `Search radiology scan for ${currentPlanName} (e.g. Chest X-Ray, Pelvic Scan, Abdominal Ultrasound, CT Brain)...`
                                : 'Search or type radiology scan (e.g. Pelvic Ultrasound, Chest X-Ray PA, CT Scan)...'
                            }
                            value={radiologyScanName}
                            onFocus={() => setShowRadiologyDropdown(true)}
                            onChange={(e) => handleRadiologyInputChange(e.target.value)}
                            onKeyDown={handleRadiologyKeyDown}
                            autoComplete="off"
                          />
                          {radiologyScanName && (
                            <div className="input-group-append">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                  setRadiologyScanName('');
                                  setSelectedRadiologyTariff(null);
                                  setShowRadiologyDropdown(true);
                                }}
                                title="Clear search"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          )}
                          <div className="input-group-append">
                            <button
                              type="button"
                              className="btn font-weight-bold px-3 text-white"
                              style={{ backgroundColor: '#7c3aed' }}
                              onClick={() => handleAddRadiologyOrder()}
                            >
                              <i className="fas fa-plus mr-1"></i> Order Scan
                            </button>
                          </div>
                        </div>

                        {/* Covered Radiology Autocomplete Dropdown */}
                        {showRadiologyDropdown && (
                          <div
                            className="dropdown-menu show w-100 shadow-lg p-0"
                            style={{
                              maxHeight: '280px',
                              overflowY: 'auto',
                              zIndex: 1050,
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            <div className="p-2 bg-light border-bottom d-flex justify-content-between align-items-center">
                              <span className="small font-weight-bold text-dark">
                                {currentPlanName ? (
                                  <>
                                    <i className="fas fa-shield-alt mr-1" style={{ color: '#7c3aed' }}></i>
                                    Covered Radiology Tariffs for {currentPlanName}:
                                  </>
                                ) : (
                                  'Hospital Radiology &amp; Scans:'
                                )}
                              </span>
                              <span className="badge badge-secondary small">
                                {filteredCoveredRadiology.length} available
                              </span>
                            </div>

                            {loadingCoveredRadiology ? (
                              <div className="p-3 text-center text-muted small">
                                <i className="fas fa-spinner fa-spin mr-1"></i> Loading radiology scans...
                              </div>
                            ) : filteredCoveredRadiology.length > 0 ? (
                              filteredCoveredRadiology.map((rad, idx) => (
                                <button
                                  key={rad.id || idx}
                                  type="button"
                                  className={`dropdown-item py-2 px-3 border-bottom text-wrap d-flex justify-content-between align-items-center ${
                                    selectedRadiologyIndex === idx ? 'text-white' : ''
                                  }`}
                                  style={{
                                    cursor: 'pointer',
                                    backgroundColor: selectedRadiologyIndex === idx ? '#7c3aed' : undefined,
                                  }}
                                  onClick={() => handleSelectCoveredRadiology(rad)}
                                >
                                  <div>
                                    <div className="d-flex align-items-center">
                                      <i className="fas fa-x-ray mr-2" style={{ color: selectedRadiologyIndex === idx ? '#fff' : '#7c3aed' }}></i>
                                      <span className={`font-weight-bold ${selectedRadiologyIndex === idx ? 'text-white' : 'text-dark'}`}>
                                        {rad.item}
                                      </span>
                                    </div>
                                    <div className={`small ${selectedRadiologyIndex === idx ? 'text-white-50' : 'text-muted'}`}>
                                      {rad.item_id && <span className="mr-2">Code: {rad.item_id}</span>}
                                      {rad.plan_name && (
                                        <span className="badge badge-secondary mr-1">
                                          {rad.plan_name}
                                        </span>
                                      )}
                                      {rad.sponsor_name && (
                                        <span className="small">{rad.sponsor_name}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right ml-2 flex-shrink-0">
                                    <span className={`badge ${selectedRadiologyIndex === idx ? 'badge-light text-success font-weight-bold' : 'badge-success'} px-2 py-1`}>
                                      ₦{Number(rad.rate || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center">
                                <div className="text-muted small mb-2">
                                  No covered radiology scan found matching "<strong>{radiologyScanName}</strong>" for {currentPlanName || 'this patient'}.
                                </div>
                                {radiologyScanName.trim() && (
                                  <button
                                    type="button"
                                    className="btn btn-sm text-white"
                                    style={{ backgroundColor: '#7c3aed' }}
                                    onClick={() => setShowRadiologyDropdown(false)}
                                  >
                                    <i className="fas fa-check mr-1"></i> Order "{radiologyScanName.trim()}" (Non-Tariff / Custom)
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Selected Radiology Tariff Pill */}
                      {selectedRadiologyTariff && (
                        <div className="d-flex align-items-center flex-wrap mt-2 small" style={{ color: '#7c3aed' }}>
                          <i className="fas fa-check-circle mr-1"></i>
                          <span>
                            Selected Scan: <strong>{selectedRadiologyTariff.item}</strong> &bull;
                            <span className="badge badge-success ml-1 mr-1">₦{Number(selectedRadiologyTariff.rate).toLocaleString()}</span>
                            ({selectedRadiologyTariff.plan_name || 'Covered Plan'})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ordered Radiology Scans Table */}
                    {radiologyOrders.length > 0 ? (
                      <div className="table-responsive border rounded" style={{ borderColor: '#e2e8f0' }}>
                        <table className="table table-sm table-hover mb-0">
                          <thead className="thead-light">
                            <tr>
                              <th style={{ width: '40px' }}>#</th>
                              <th>Radiology / Imaging Requisition</th>
                              <th>Scan Code</th>
                              <th>Coverage / Tariff Rate</th>
                              <th>Status</th>
                              <th style={{ width: '50px' }} className="text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {radiologyOrders.map((r, idx) => (
                              <tr key={r.id}>
                                <td className="text-muted font-weight-bold">{idx + 1}</td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <i className="fas fa-x-ray mr-2" style={{ color: '#7c3aed' }}></i>
                                    <span className="font-weight-bold text-dark">{r.scan}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge badge-light border text-muted">
                                    {r.item_id || 'RAD'}
                                  </span>
                                </td>
                                <td>
                                  {r.tariff_rate ? (
                                    <span className="badge badge-success px-2 py-1 font-weight-bold">
                                      ₦{Number(r.tariff_rate).toLocaleString()} &bull; {r.plan_name || 'Covered Plan'}
                                    </span>
                                  ) : (
                                    <span className="badge badge-secondary px-2 py-1">
                                      Out-of-Pocket / Non-Tariff
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className="badge badge-warning px-2 py-0.5">
                                    <i className="fas fa-clock mr-1"></i> Requisitioned
                                  </span>
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger d-inline-flex align-items-center justify-content-center p-0"
                                    style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                                    onClick={() => handleRemoveRadiologyOrder(r.id)}
                                    title="Remove Radiology Scan"
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted small bg-light rounded border">
                        <i className="fas fa-x-ray fa-2x text-gray-300 mb-2 d-block"></i>
                        No radiology scans ordered yet for this consultation.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 4: OTHER CLINICAL SERVICES (STANDS ON ITS OWN) */}
              {(orderSectionTab === 'other_services' || orderSectionTab === 'overview') && (
                <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div
                    className="card-header bg-white py-3 px-3.5 border-bottom d-flex justify-content-between align-items-center flex-wrap"
                    style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px', gap: '8px' }}
                  >
                    <div className="d-flex align-items-center">
                      <span
                        className="d-inline-flex align-items-center justify-content-center mr-2.5 rounded-circle"
                        style={{ width: '32px', height: '32px', backgroundColor: '#ccfbf1', color: '#0d9488' }}
                      >
                        <i className="fas fa-hand-holding-medical"></i>
                      </span>
                      <div>
                        <strong className="text-gray-900" style={{ fontSize: '0.96rem' }}>
                          Other Clinical Services &amp; Hospital Procedures
                        </strong>
                        <span className="text-muted small d-block">
                          Requisition clinical procedures, nursing care, dressings, cannulation, nebulization, and hospital services
                        </span>
                      </div>
                    </div>
                    {onNavigate && (
                      <button
                        type="button"
                        className="btn btn-sm shadow-sm text-white"
                        style={{ borderRadius: '6px', backgroundColor: '#0d9488' }}
                        onClick={() => {
                          onNavigate('billing');
                          showToast(`Opened Billing & Services module for ${patientName}`, 'info');
                        }}
                      >
                        <i className="fas fa-external-link-alt mr-1.5"></i> Services Module
                      </button>
                    )}
                  </div>

                  <div className="card-body p-3.5">
                    {/* Patient Sponsor & Plan Coverage Services Tariffs Banner */}
                    {currentSponsorName || currentPlanName ? (
                      <div
                        className="alert alert-info py-2.5 px-3 mb-3 d-flex align-items-center justify-content-between flex-wrap"
                        style={{
                          borderRadius: '8px',
                          borderLeft: '4px solid #0d9488',
                          backgroundColor: '#f0fdfa',
                          borderColor: '#99f6e4',
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div className="mr-3" style={{ fontSize: '1.4rem', color: '#0d9488' }}>
                            <i className="fas fa-shield-alt"></i>
                          </div>
                          <div>
                            <div className="font-weight-bold text-dark small d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
                              <span>Active Clinical Services Tariff:</span>
                              <span className="font-weight-bold" style={{ color: '#0d9488' }}>{currentSponsorName || 'HMO Sponsor'}</span>
                              {currentPlanName && (
                                <span className="badge px-2 py-0.5 font-weight-bold text-white" style={{ backgroundColor: '#0d9488' }}>
                                  {currentPlanName}
                                </span>
                              )}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.76rem' }}>
                              {loadingCoveredOtherServices ? (
                                <span><i className="fas fa-spinner fa-spin mr-1"></i> Loading covered clinical services...</span>
                              ) : coveredOtherServices.length > 0 ? (
                                <span>
                                  <i className="fas fa-check-circle text-success mr-1"></i>
                                  <strong>{coveredOtherServices.length}</strong> clinical service{coveredOtherServices.length > 1 ? 's' : ''} loaded from active plan tariff
                                </span>
                              ) : (
                                <span className="text-warning font-weight-bold">
                                  <i className="fas fa-info-circle mr-1"></i>
                                  No clinical services configured for {currentPlanName || currentSponsorName} yet. Add in Billing &gt; Other Services.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {coveredOtherServices.length > 0 && (
                          <span className="badge badge-light border font-weight-bold px-2 py-1 small" style={{ color: '#0d9488' }}>
                            <i className="fas fa-stethoscope mr-1"></i> {coveredOtherServices.length} Services Available
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="alert alert-light border py-2 px-3 mb-3 d-flex align-items-center justify-content-between small text-muted">
                        <div>
                          <i className="fas fa-user mr-1 text-secondary"></i>
                          <strong>Private / Cash Patient:</strong> Standard hospital clinical service tariffs apply.
                        </div>
                        <span className="badge badge-secondary">Private / Cash</span>
                      </div>
                    )}

                    {/* Other Service Requisition Form */}
                    <div className="p-3 bg-light rounded border mb-3" style={{ borderColor: '#e2e8f0' }}>
                      <div className="font-weight-bold small text-gray-800 mb-2 d-flex justify-content-between align-items-center">
                        <span>
                          <i className="fas fa-plus-circle mr-1.5" style={{ color: '#0d9488' }}></i> Requisition Clinical Service / Procedure:
                        </span>
                        {currentPlanName && (
                          <span className="small text-muted">
                            Tariff Filter: <strong style={{ color: '#0d9488' }}>{currentPlanName}</strong>
                          </span>
                        )}
                      </div>

                      <div className="row no-gutters">
                        {/* Service Search with Autocomplete */}
                        <div className="col-lg-6 col-md-12 pr-lg-2 mb-2 mb-lg-0 position-relative" ref={otherServiceDropdownRef}>
                          <div className="input-group input-group-sm">
                            <div className="input-group-prepend">
                              <span className="input-group-text bg-white">
                                <i className="fas fa-hand-holding-medical" style={{ color: '#0d9488' }}></i>
                              </span>
                            </div>
                            <input
                              type="text"
                              className="form-control"
                              placeholder={
                                currentPlanName
                                  ? `Search clinical service for ${currentPlanName} (e.g. Wound Dressing, Catheterization, Cannula, Nebulization)...`
                                  : 'Clinical service (e.g. Wound Dressing, Injection Administration, Catheter Insertion)...'
                              }
                              value={otherServiceName}
                              onFocus={() => setShowOtherServiceDropdown(true)}
                              onChange={(e) => handleOtherServiceInputChange(e.target.value)}
                              onKeyDown={handleOtherServiceKeyDown}
                              autoComplete="off"
                            />
                            {otherServiceName && (
                              <div className="input-group-append">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => {
                                    setOtherServiceName('');
                                    setSelectedOtherServiceTariff(null);
                                    setShowOtherServiceDropdown(true);
                                  }}
                                  title="Clear search"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Covered Other Services Autocomplete Dropdown */}
                          {showOtherServiceDropdown && (
                            <div
                              className="dropdown-menu show w-100 shadow-lg p-0"
                              style={{
                                maxHeight: '280px',
                                overflowY: 'auto',
                                zIndex: 1050,
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              <div className="p-2 bg-light border-bottom d-flex justify-content-between align-items-center">
                                <span className="small font-weight-bold text-dark">
                                  {currentPlanName ? (
                                    <>
                                      <i className="fas fa-shield-alt mr-1" style={{ color: '#0d9488' }}></i>
                                      Covered Services for {currentPlanName}:
                                    </>
                                  ) : (
                                    'Hospital Clinical Services:'
                                  )}
                                </span>
                                <span className="badge badge-secondary small">
                                  {filteredCoveredOtherServices.length} available
                                </span>
                              </div>

                              {loadingCoveredOtherServices ? (
                                <div className="p-3 text-center text-muted small">
                                  <i className="fas fa-spinner fa-spin mr-1"></i> Loading clinical services...
                                </div>
                              ) : filteredCoveredOtherServices.length > 0 ? (
                                filteredCoveredOtherServices.map((service, idx) => (
                                  <button
                                    key={service.id || idx}
                                    type="button"
                                    className={`dropdown-item py-2 px-3 border-bottom text-wrap d-flex justify-content-between align-items-center ${
                                      selectedOtherServiceIndex === idx ? 'text-white' : ''
                                    }`}
                                    style={{
                                      cursor: 'pointer',
                                      backgroundColor: selectedOtherServiceIndex === idx ? '#0d9488' : undefined,
                                    }}
                                    onClick={() => handleSelectCoveredOtherService(service)}
                                  >
                                    <div>
                                      <div className="d-flex align-items-center">
                                        <i className="fas fa-stethoscope mr-2" style={{ color: selectedOtherServiceIndex === idx ? '#fff' : '#0d9488' }}></i>
                                        <span className={`font-weight-bold ${selectedOtherServiceIndex === idx ? 'text-white' : 'text-dark'}`}>
                                          {service.service || service.item}
                                        </span>
                                      </div>
                                      <div className={`small ${selectedOtherServiceIndex === idx ? 'text-white-50' : 'text-muted'}`}>
                                        {(service.service_id || service.item_id) && (
                                          <span className="mr-2">Code: {service.service_id || service.item_id}</span>
                                        )}
                                        {service.plan_name && (
                                          <span className="badge badge-secondary mr-1">
                                            {service.plan_name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right ml-2 flex-shrink-0">
                                      <span className={`badge ${selectedOtherServiceIndex === idx ? 'badge-light text-success font-weight-bold' : 'badge-success'} px-2 py-1`}>
                                        ₦{Number(service.rate || 0).toLocaleString()}
                                      </span>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="p-3 text-center">
                                  <div className="text-muted small mb-2">
                                    No covered service found matching "<strong>{otherServiceName}</strong>" for {currentPlanName || 'this patient'}.
                                  </div>
                                  {otherServiceName.trim() && (
                                    <button
                                      type="button"
                                      className="btn btn-sm text-white"
                                      style={{ backgroundColor: '#0d9488' }}
                                      onClick={() => setShowOtherServiceDropdown(false)}
                                    >
                                      <i className="fas fa-check mr-1"></i> Order "{otherServiceName.trim()}" (Non-Tariff / Custom)
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Optional Clinical Instructions / Notes */}
                        <div className="col-lg-4 col-md-8 pr-md-2 mb-2 mb-md-0">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Instructions (e.g. Stat, Dressing BD, 18G Cannula)..."
                            value={otherServiceNotes}
                            onChange={(e) => setOtherServiceNotes(e.target.value)}
                          />
                        </div>

                        {/* Order Button */}
                        <div className="col-lg-2 col-md-4">
                          <button
                            type="button"
                            className="btn btn-sm btn-block font-weight-bold text-white"
                            style={{ backgroundColor: '#0d9488' }}
                            onClick={() => handleAddOtherServiceOrder()}
                          >
                            <i className="fas fa-plus mr-1"></i> Order Service
                          </button>
                        </div>
                      </div>

                      {/* Selected Other Service Tariff Pill */}
                      {selectedOtherServiceTariff && (
                        <div className="d-flex align-items-center flex-wrap mt-2 small" style={{ color: '#0d9488' }}>
                          <i className="fas fa-check-circle mr-1"></i>
                          <span>
                            Selected Service: <strong>{selectedOtherServiceTariff.service || selectedOtherServiceTariff.item}</strong> &bull;
                            <span className="badge badge-success ml-1 mr-1">₦{Number(selectedOtherServiceTariff.rate).toLocaleString()}</span>
                            ({selectedOtherServiceTariff.plan_name || 'Covered Plan'})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ordered Other Clinical Services Table */}
                    {otherServiceOrders.length > 0 ? (
                      <div className="table-responsive border rounded" style={{ borderColor: '#e2e8f0' }}>
                        <table className="table table-sm table-hover mb-0">
                          <thead className="thead-light">
                            <tr>
                              <th style={{ width: '40px' }}>#</th>
                              <th>Clinical Service / Procedure</th>
                              <th>Service Code</th>
                              <th>Coverage / Tariff Rate</th>
                              <th>Clinical Instructions</th>
                              <th style={{ width: '50px' }} className="text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {otherServiceOrders.map((s, idx) => (
                              <tr key={s.id}>
                                <td className="text-muted font-weight-bold">{idx + 1}</td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <i className="fas fa-hand-holding-medical mr-2" style={{ color: '#0d9488' }}></i>
                                    <span className="font-weight-bold text-dark">{s.service}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge badge-light border text-muted">
                                    {s.service_id || 'SRV'}
                                  </span>
                                </td>
                                <td>
                                  {s.tariff_rate ? (
                                    <span className="badge badge-success px-2 py-1 font-weight-bold">
                                      ₦{Number(s.tariff_rate).toLocaleString()} &bull; {s.plan_name || 'Covered Plan'}
                                    </span>
                                  ) : (
                                    <span className="badge badge-secondary px-2 py-1">
                                      Out-of-Pocket / Non-Tariff
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className="small text-muted">{s.notes || 'Routine'}</span>
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger d-inline-flex align-items-center justify-content-center p-0"
                                    style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                                    onClick={() => handleRemoveOtherServiceOrder(s.id)}
                                    title="Remove Clinical Service"
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted small bg-light rounded border">
                        <i className="fas fa-hand-holding-medical fa-2x text-gray-300 mb-2 d-block"></i>
                        No other clinical services ordered yet for this consultation.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 5: ALL ORDERS SUMMARY CARDS (WHEN ON OVERVIEW TAB) */}
              {orderSectionTab === 'overview' && (
                <div className="card shadow-sm border-0 mb-4 bg-white" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div className="card-header bg-dark text-white py-3 px-3.5 border-bottom d-flex justify-content-between align-items-center" style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                    <div className="d-flex align-items-center">
                      <span
                        className="d-inline-flex align-items-center justify-content-center mr-2 rounded-circle"
                        style={{ width: '28px', height: '28px', backgroundColor: '#334155', color: '#f8fafc' }}
                      >
                        <i className="fas fa-file-invoice-dollar"></i>
                      </span>
                      <strong style={{ fontSize: '0.94rem' }}>Cumulative Consultation Orders &amp; Billing Summary</strong>
                    </div>
                    <span className="badge badge-primary px-3 py-1 font-weight-bold" style={{ fontSize: '0.82rem' }}>
                      Total Items: {prescriptions.length + labOrders.length + radiologyOrders.length + otherServiceOrders.length}
                    </span>
                  </div>

                  <div className="card-body p-3.5">
                    {/* KPI Metric Cards */}
                    <div className="row mb-3">
                      <div className="col-md-3 col-sm-6 mb-2">
                        <div className="p-3 bg-light rounded border text-center">
                          <div className="text-primary font-weight-bold mb-1" style={{ fontSize: '0.82rem' }}>
                            <i className="fas fa-pills mr-1"></i> Prescriptions
                          </div>
                          <div className="h4 font-weight-bold text-gray-900 mb-0">
                            {prescriptions.length}
                          </div>
                          <div className="small text-muted mt-1">
                            ₦{prescriptions.reduce((acc, p) => acc + (Number(p.tariff_rate) || 0), 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3 col-sm-6 mb-2">
                        <div className="p-3 bg-light rounded border text-center">
                          <div className="text-info font-weight-bold mb-1" style={{ fontSize: '0.82rem' }}>
                            <i className="fas fa-vial mr-1"></i> Laboratory
                          </div>
                          <div className="h4 font-weight-bold text-gray-900 mb-0">
                            {labOrders.length}
                          </div>
                          <div className="small text-muted mt-1">
                            ₦{labOrders.reduce((acc, l) => acc + (Number(l.tariff_rate) || 0), 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3 col-sm-6 mb-2">
                        <div className="p-3 bg-light rounded border text-center">
                          <div className="font-weight-bold mb-1" style={{ fontSize: '0.82rem', color: '#7c3aed' }}>
                            <i className="fas fa-x-ray mr-1"></i> Radiology
                          </div>
                          <div className="h4 font-weight-bold text-gray-900 mb-0">
                            {radiologyOrders.length}
                          </div>
                          <div className="small text-muted mt-1">
                            ₦{radiologyOrders.reduce((acc, r) => acc + (Number(r.tariff_rate) || 0), 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3 col-sm-6 mb-2">
                        <div className="p-3 bg-light rounded border text-center">
                          <div className="font-weight-bold mb-1" style={{ fontSize: '0.82rem', color: '#0d9488' }}>
                            <i className="fas fa-hand-holding-medical mr-1"></i> Other Services
                          </div>
                          <div className="h4 font-weight-bold text-gray-900 mb-0">
                            {otherServiceOrders.length}
                          </div>
                          <div className="small text-muted mt-1">
                            ₦{otherServiceOrders.reduce((acc, s) => acc + (Number(s.tariff_rate) || 0), 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Total Tariff Summary Banner */}
                    <div className="alert alert-success d-flex align-items-center justify-content-between p-3 mb-0" style={{ borderRadius: '8px' }}>
                      <div className="d-flex align-items-center">
                        <i className="fas fa-check-circle fa-2x text-success mr-3"></i>
                        <div>
                          <strong className="text-dark d-block">All Clinical Orders Synchronized</strong>
                          <span className="small text-muted">
                            Items are automatically coded with patient's sponsor/plan tariffs and recorded in encounter diagnosis comments upon save.
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="small text-muted d-block">Estimated Billable Value:</span>
                        <strong className="h4 font-weight-bold text-success mb-0">
                          ₦{(
                            prescriptions.reduce((acc, p) => acc + (Number(p.tariff_rate) || 0), 0) +
                            labOrders.reduce((acc, l) => acc + (Number(l.tariff_rate) || 0), 0) +
                            radiologyOrders.reduce((acc, r) => acc + (Number(r.tariff_rate) || 0), 0) +
                            otherServiceOrders.reduce((acc, s) => acc + (Number(s.tariff_rate) || 0), 0)
                          ).toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: History & Past Encounters */}
          {activeTab === 'history' && (
            <div>
              {loadingHistory ? (
                <div className="text-center py-5">
                  <i className="fas fa-spinner fa-spin fa-2x text-primary mb-2"></i>
                  <div>Loading past clinical encounters...</div>
                </div>
              ) : pastEncounters.length > 0 ? (
                <div className="timeline">
                  {pastEncounters.map((enc, idx) => (
                    <div key={enc.id || idx} className="card shadow-sm border-0 mb-3" style={{ borderRadius: '10px' }}>
                      <div className="card-header bg-light py-2 px-3 d-flex justify-content-between align-items-center">
                        <span className="font-weight-bold text-primary">
                          <i className="fas fa-user-md mr-2"></i>
                          {enc.provider_name || 'Dr. Attending Physician'}
                        </span>
                        <span className="text-muted small">
                          <i className="fas fa-clock mr-1"></i>
                          {enc.created_at ? new Date(enc.created_at).toLocaleString() : 'Past Encounter'}
                        </span>
                      </div>
                      <div className="card-body p-3" style={{ fontSize: '0.86rem' }}>
                        {enc.diagnosis && (
                          <div className="mb-2">
                            <span className="text-muted font-weight-bold">Diagnosis: </span>
                            <span className="badge badge-danger px-2 py-1 font-weight-bold">
                              {enc.diagnosis}
                            </span>
                          </div>
                        )}
                        {enc.chief_complaint && (
                          <div className="mb-2">
                            <span className="text-muted font-weight-bold">Chief Complaints: </span>
                            <span className="text-dark">{enc.chief_complaint}</span>
                          </div>
                        )}
                        {enc.history_of_present_illness && (
                          <div className="mb-2 bg-light p-2 rounded border">
                            <span className="text-muted font-weight-bold d-block small">History / Examination:</span>
                            <div style={{ whiteSpace: 'pre-line' }}>{enc.history_of_present_illness}</div>
                          </div>
                        )}
                        {enc.comments_on_diagnosis && (
                          <div className="bg-light p-2 rounded border">
                            <span className="text-muted font-weight-bold d-block small">Treatment Plan:</span>
                            <div style={{ whiteSpace: 'pre-line' }}>{enc.comments_on_diagnosis}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="fas fa-folder-open fa-3x text-gray-300 mb-3 d-block"></i>
                  <div className="font-weight-bold">No previous clinical encounters recorded for this patient.</div>
                  <div className="small mt-1">This consultation will be documented as the patient's record.</div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Legacy Consultation EMR */}
          {activeTab === 'legacy' && (
            <div style={{ width: '100%', height: 'calc(92vh - 210px)' }}>
              <iframe
                ref={iframeRef}
                src={legacyConsultationUrl}
                title="Full EMR Consultation Workspace"
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="card-footer py-3 px-4 bg-white border-top d-flex justify-content-between align-items-center flex-shrink-0"
          style={{
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div className="d-flex align-items-center flex-wrap">
            {totalBillableCount > 0 ? (
              <span className="badge badge-light border border-info text-info px-3 py-2 font-weight-bold mr-3 shadow-xs" style={{ fontSize: '0.84rem' }}>
                <i className="fas fa-file-invoice-dollar text-primary mr-1.5"></i>
                Billing Summary: <strong>{totalBillableCount} item{totalBillableCount > 1 ? 's' : ''}</strong> (₦{totalConsultationBill.toLocaleString()}) &rarr; <span className="text-success font-weight-bold">Routes to Billing for Payment</span>
              </span>
            ) : (
              <span className="text-muted small d-inline-flex align-items-center">
                <i className="fas fa-shield-alt text-primary mr-1.5 opacity-75"></i>
                Consultation notes &amp; orders are securely saved to the patient's permanent medical timeline.
              </span>
            )}
          </div>

          <div className="d-flex align-items-center" style={{ gap: '10px' }}>
            <button
              type="button"
              className="btn btn-light border px-3"
              style={{ borderRadius: '8px', fontWeight: 500 }}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-outline-primary px-3 shadow-sm d-inline-flex align-items-center"
              style={{ borderRadius: '8px', fontWeight: 600 }}
              onClick={() => handleSaveConsultation(false)}
              disabled={saving}
            >
              {saving ? <i className="fas fa-spinner fa-spin mr-1.5"></i> : <i className="fas fa-save mr-1.5"></i>}
              Save Draft
            </button>

            <button
              type="button"
              className="btn btn-success px-4 font-weight-bold shadow-sm d-inline-flex align-items-center"
              style={{
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
              }}
              onClick={() => handleSaveConsultation(true)}
              disabled={saving}
            >
              {saving ? <i className="fas fa-spinner fa-spin mr-1.5"></i> : <i className="fas fa-check-circle mr-1.5"></i>}
              Finish &amp; Complete Consultation
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
