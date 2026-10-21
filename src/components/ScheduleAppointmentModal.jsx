import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { showToast } from './Toast';

const VISIT_TYPES = [
  { value: 'New-case', label: 'New Case' },
  { value: 'Follow-up', label: 'Follow-up' },
  { value: 'Review', label: 'Review' },
  { value: 'First visit after discharge', label: 'First visit after discharge' },
  { value: 'Drug-refill', label: 'Drug Refill' },
];

const CRITICALITY_CHOICES = [
  { value: 'critic', label: '-- Criticality --' },
  { value: '1', label: 'Emergency' },
  { value: '2', label: 'Review' },
  { value: '0', label: 'General Request' },
];

export default function ScheduleAppointmentModal({
  isOpen,
  patient = null,
  patients = null,
  onClose,
  onAppointmentScheduled,
  defaultVisitType = 'New-case',
}) {
  const getShortcutDateStr = (daysToAdd = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  const getTodayDateStr = () => getShortcutDateStr(0);

  // Auto-generate exact current time (HH:MM), which user can then change to another time
  const getCurrentTimeStr = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const [activePatients, setActivePatients] = useState([]);
  const [patientConfigs, setPatientConfigs] = useState({});
  const [showAddMorePatients, setShowAddMorePatients] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [timeManuallyChanged, setTimeManuallyChanged] = useState(false);

  const [formData, setFormData] = useState({
    arrival_date: getTodayDateStr(),
    arrival_time: getCurrentTimeStr(),
    visit_type: defaultVisitType,
    criticality: 'critic', // Defaults to '-- Criticality --' placeholder for single-patient mode
    purpose: '',
    purposes: [''],
    custom_purpose: '',
    queue_today: false,
  });

  const [purposesList, setPurposesList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Auto-update time continuously every second unless user manually changed/selected a specific time
  useEffect(() => {
    if (!isOpen || timeManuallyChanged) return;

    const interval = setInterval(() => {
      const current = getCurrentTimeStr();
      setFormData((prev) => {
        if (prev.arrival_time !== current) {
          return { ...prev, arrival_time: current };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timeManuallyChanged]);

  // Close modal when user presses Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync state whenever modal opens or patient/patients change
  useEffect(() => {
    if (isOpen) {
      let initialList = [];
      if (Array.isArray(patients) && patients.length > 0) {
        initialList = patients;
      } else if (patient) {
        initialList = [patient];
      }
      setActivePatients(initialList);
      setShowAddMorePatients(false);
      setPatientSearchQuery('');
      setPatientSearchResults([]);
      setTimeManuallyChanged(false);

      const existingPurps = initialList[0]?.existingPurposes || [];
      const defaultPurpose = purposesList.length > 0
        ? (purposesList.find((p) => !existingPurps.includes(p.purpose))?.purpose || purposesList[0].purpose)
        : '';
      setFormData({
        arrival_date: getTodayDateStr(),
        arrival_time: getCurrentTimeStr(),
        visit_type: defaultVisitType,
        criticality: 'critic',
        purpose: defaultPurpose,
        purposes: [defaultPurpose],
        custom_purpose: '',
        queue_today: false,
      });

      // Initialize individual configs for each selected patient
      const newConfigs = {};
      initialList.forEach((p) => {
        newConfigs[p.id] = {
          visit_type: defaultVisitType || 'New-case',
          criticality: '0', // Defaults to General Request
          purpose: defaultPurpose,
          purposes: [defaultPurpose],
        };
      });
      setPatientConfigs(newConfigs);
      setError(null);

      // Load visit purposes strictly from database
      const loadPurposes = async () => {
        try {
          if (typeof api.getVisitPurposes === 'function') {
            const res = await api.getVisitPurposes();
            const list = Array.isArray(res) ? res : (res?.results || []);
            setPurposesList(list);
            if (list.length > 0) {
              const freshPurp = list.find((item) => !existingPurps.includes(item.purpose))?.purpose || list[0].purpose;
              setFormData((prev) => ({
                ...prev,
                purpose: prev.purpose && prev.purpose !== defaultPurpose ? prev.purpose : freshPurp,
                purposes: (prev.purposes && prev.purposes[0] && prev.purposes[0] !== defaultPurpose) ? prev.purposes : [freshPurp],
              }));
              setPatientConfigs((prev) => {
                const updated = { ...prev };
                initialList.forEach((p) => {
                  const currPurps = updated[p.id]?.purposes;
                  if (!currPurps || currPurps.length === 0 || !currPurps[0]) {
                    updated[p.id] = {
                      ...(updated[p.id] || {
                        visit_type: defaultVisitType || 'New-case',
                        criticality: '0',
                      }),
                      purpose: freshPurp,
                      purposes: [freshPurp],
                    };
                  }
                });
                return updated;
              });
            }
          }
        } catch (err) {
          console.warn('Could not load visit purposes from database:', err);
        }
      };
      loadPurposes();
    }
  }, [isOpen, patient, patients, defaultVisitType]);

  // Handle patient searching
  const handleSearchPatient = async (query) => {
    setPatientSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setPatientSearchResults([]);
      return;
    }
    try {
      setSearchingPatients(true);
      const res = await api.getPatients({ search: query.trim(), active: 1 });
      setPatientSearchResults(res.results || res || []);
    } catch (err) {
      console.warn('Error searching patients:', err);
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleAddPatientToBatch = (p) => {
    if (!activePatients.some((x) => x.id === p.id)) {
      setActivePatients((prev) => [...prev, p]);
      const defaultPurp = purposesList.length > 0 ? purposesList[0].purpose : '';
      setPatientConfigs((prev) => ({
        ...prev,
        [p.id]: {
          visit_type: defaultVisitType || 'New-case',
          criticality: '0',
          purpose: defaultPurp,
          purposes: [defaultPurp],
        },
      }));
    }
    setPatientSearchQuery('');
    setPatientSearchResults([]);
    setShowAddMorePatients(false);
  };

  const handleRemovePatientFromBatch = (patientId) => {
    setActivePatients((prev) => prev.filter((p) => p.id !== patientId));
    setPatientConfigs((prev) => {
      const next = { ...prev };
      delete next[patientId];
      return next;
    });
  };

  const handleUpdatePatientConfig = (patientId, field, value) => {
    setPatientConfigs((prev) => ({
      ...prev,
      [patientId]: {
        ...(prev[patientId] || {
          visit_type: defaultVisitType || 'New-case',
          criticality: '0',
          purpose: purposesList[0]?.purpose || '',
          purposes: [purposesList[0]?.purpose || ''],
        }),
        [field]: value,
      },
    }));
  };

  const handleAddPatientPurpose = (patientId) => {
    const nextPurp = purposesList[0]?.purpose || '';
    setPatientConfigs((prev) => {
      const current = prev[patientId] || {};
      const currentList = current.purposes && current.purposes.length > 0
        ? current.purposes
        : [current.purpose || ''];
      return {
        ...prev,
        [patientId]: {
          ...current,
          purposes: [...currentList, nextPurp],
        },
      };
    });
  };

  const handleUpdatePatientPurpose = (patientId, index, value) => {
    setPatientConfigs((prev) => {
      const current = prev[patientId] || {};
      const currentList = [...(current.purposes && current.purposes.length > 0 ? current.purposes : [current.purpose || ''])];
      currentList[index] = value;
      return {
        ...prev,
        [patientId]: {
          ...current,
          purposes: currentList,
          purpose: currentList[0] || value,
        },
      };
    });
  };

  const handleRemovePatientPurpose = (patientId, index) => {
    setPatientConfigs((prev) => {
      const current = prev[patientId] || {};
      const currentList = [...(current.purposes && current.purposes.length > 0 ? current.purposes : [current.purpose || ''])];
      currentList.splice(index, 1);
      const updated = currentList.length > 0 ? currentList : [''];
      return {
        ...prev,
        [patientId]: {
          ...current,
          purposes: updated,
          purpose: updated[0] || '',
        },
      };
    });
  };

  // Single-Patient Purpose Handlers
  const handleAddSinglePurpose = () => {
    const nextPurp = purposesList[0]?.purpose || '';
    setFormData((prev) => {
      const currentList = prev.purposes && prev.purposes.length > 0 ? prev.purposes : [prev.purpose || ''];
      return {
        ...prev,
        purposes: [...currentList, nextPurp],
      };
    });
  };

  const handleUpdateSinglePurpose = (index, value) => {
    setFormData((prev) => {
      const currentList = [...(prev.purposes && prev.purposes.length > 0 ? prev.purposes : [prev.purpose || ''])];
      currentList[index] = value;
      return {
        ...prev,
        purposes: currentList,
        purpose: currentList[0] || value,
      };
    });
  };

  const handleRemoveSinglePurpose = (index) => {
    setFormData((prev) => {
      const currentList = [...(prev.purposes && prev.purposes.length > 0 ? prev.purposes : [prev.purpose || ''])];
      currentList.splice(index, 1);
      const updated = currentList.length > 0 ? currentList : [''];
      return {
        ...prev,
        purposes: updated,
        purpose: updated[0] || '',
      };
    });
  };

  const handleApplyFieldToAll = (field, value) => {
    if (!value) return;
    setPatientConfigs((prev) => {
      const next = { ...prev };
      activePatients.forEach((p) => {
        next[p.id] = {
          ...(next[p.id] || {
            visit_type: defaultVisitType || 'New-case',
            criticality: '0',
          }),
          [field]: value,
          ...(field === 'purpose' ? { purposes: [value] } : {}),
        };
      });
      return next;
    });
  };

  if (!isOpen) return null;

  const firstPatient = activePatients[0] || null;
  const singlePatientName = firstPatient
    ? ((firstPatient.surname ? `${firstPatient.surname} ${firstPatient.first_name || ''} ${firstPatient.other_name || ''}`.trim() : null) || firstPatient.patient_name || 'Patient')
    : '';

  const isToday = formData.arrival_date === getTodayDateStr();

  const handleDateShortcut = (daysToAdd) => {
    const dateStr = getShortcutDateStr(daysToAdd);
    setFormData((prev) => ({
      ...prev,
      arrival_date: dateStr,
      queue_today: daysToAdd === 0 ? prev.queue_today : false,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activePatients || activePatients.length === 0) {
      setError('Please select at least one patient before scheduling.');
      return;
    }
    if (!formData.arrival_date) {
      setError('Please select an appointment date.');
      return;
    }
    if (!formData.arrival_time) {
      setError('Please select an expected arrival time.');
      return;
    }

    // Validation
    if (activePatients.length > 1) {
      for (const p of activePatients) {
        const config = patientConfigs[p.id] || {};
        const pLabel = p.surname ? `${p.surname} ${p.first_name || ''}`.trim() : (p.patient_name || `Patient #${p.id}`);
        if (!config.visit_type) {
          setError(`Please select a Visit Type for ${pLabel}.`);
          return;
        }
        const pPurpList = (config.purposes && config.purposes.length > 0)
          ? config.purposes.filter((pr) => pr && pr.trim().length > 0)
          : (config.purpose ? [config.purpose] : []);
        if (pPurpList.length === 0) {
          setError(`Please select at least one Purpose of Appointment for ${pLabel}.`);
          return;
        }
      }
    } else {
      if (formData.criticality === 'critic') {
        setError('Please select the level of Criticality.');
        return;
      }
      const singlePurpList = (formData.purposes && formData.purposes.length > 0)
        ? formData.purposes.filter((pr) => pr && pr.trim().length > 0)
        : (formData.purpose ? [formData.purpose] : []);
      if (singlePurpList.length === 0) {
        setError('Please select at least one Purpose of Appointment from the database list.');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const scheduledResults = [];
      const failedPatients = [];

      for (const p of activePatients) {
        const config = activePatients.length > 1
          ? (patientConfigs[p.id] || {
              visit_type: defaultVisitType || 'New-case',
              criticality: '0',
              purpose: purposesList[0]?.purpose || '',
              purposes: [purposesList[0]?.purpose || ''],
            })
          : {
              visit_type: formData.visit_type,
              criticality: formData.criticality,
              purpose: formData.purpose,
              purposes: formData.purposes || [formData.purpose],
            };

        const critObj = CRITICALITY_CHOICES.find((c) => c.value === config.criticality);
        const critLabel = critObj && critObj.value !== 'critic' ? critObj.label : 'General Request';
        const critNum = Number(config.criticality === 'critic' ? 0 : config.criticality);

        const pPurposes = (config.purposes && config.purposes.length > 0)
          ? config.purposes.filter((pr) => pr && pr.trim().length > 0)
          : (config.purpose && config.purpose.trim().length > 0 ? [config.purpose.trim()] : []);

        for (const singlePurp of pPurposes) {
          try {
            const payload = {
              patient: p.id,
              arrival_date: formData.arrival_date,
              arrival_time: formData.arrival_time,
              visit_type: config.visit_type || 'New-case',
              purpose: singlePurp.trim(),
              provider: null,
              clinician: `General Pool (${critLabel})`,
              comment: `Criticality: ${critLabel}`,
            };

            const result = await api.createAppointment(payload);
            scheduledResults.push(result);

            // If requested to queue immediately for today
            if (formData.queue_today && isToday) {
              try {
                await api.createQueue({
                  patient: p.id,
                  purpose: singlePurp.trim(),
                  visit_type: config.visit_type || 'New-case',
                  critical_request: critNum,
                });
              } catch (queueErr) {
                console.warn(`Queue error for patient ${p.id} (${singlePurp}):`, queueErr);
              }
            }
          } catch (itemErr) {
            console.error(`Failed to schedule purpose "${singlePurp}" for patient ${p.id}:`, itemErr);
            const pLabel = p.surname ? `${p.surname} ${p.first_name || ''}`.trim() : (p.patient_name || `Patient #${p.id}`);
            failedPatients.push(`${pLabel} (${singlePurp})`);
          }
        }
      }

      if (failedPatients.length === 0) {
        if (scheduledResults.length > 1) {
          showToast(
            `Successfully scheduled ${scheduledResults.length} appointment purpose(s) on ${formData.arrival_date} at ${formData.arrival_time}!`,
            'success',
            'Appointments Scheduled'
          );
        } else {
          showToast(
            `Appointment successfully scheduled for ${singlePatientName} on ${formData.arrival_date} at ${formData.arrival_time}!`,
            'success',
            'Appointment Confirmed'
          );
        }
      } else {
        showToast(
          `Scheduled for ${scheduledResults.length} purpose(s). Failed for: ${failedPatients.join(', ')}`,
          'warning',
          'Partial Scheduling Result'
        );
      }

      if (onAppointmentScheduled) {
        onAppointmentScheduled(scheduledResults);
      }
      onClose();
    } catch (err) {
      console.error('Error during appointment scheduling:', err);
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to schedule appointment(s)';
      setError(msg);
      showToast(msg, 'danger', 'Scheduling Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="card shadow-2xl modal-custom border-0"
        style={{
          maxWidth: activePatients.length > 1 ? '920px' : '760px',
          width: '95%',
          zIndex: 1070,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
          margin: 0,
        }}
      >
        {/* Header */}
        <div
          className="py-3 px-4 text-white d-flex justify-content-between align-items-center"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div className="d-flex align-items-center" style={{ gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                flexShrink: 0,
              }}
            >
              <i className={`fas ${activePatients.length > 1 ? 'fa-users' : 'fa-calendar-check'}`}></i>
            </div>
            <div>
              <h5 className="m-0 font-weight-bold text-white" style={{ fontSize: '1.12rem', letterSpacing: '-0.01em' }}>
                {activePatients.length > 1
                  ? `Schedule Bulk Appointments (${activePatients.length} Patients)`
                  : 'Schedule Patient Appointment'}
              </h5>
              <div className="text-white-50 small mt-0.5" style={{ fontSize: '0.78rem' }}>
                {activePatients.length > 1
                  ? `Simultaneously book consultations or reviews for all ${activePatients.length} selected patients`
                  : 'Book a medical consultation, review, or specialty clinic visit'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm text-white rounded-circle d-flex align-items-center justify-content-center"
            style={{
              width: '32px',
              height: '32px',
              padding: 0,
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
            }}
            onClick={onClose}
            title="Close"
          >
            <i className="fas fa-times" style={{ fontSize: '1rem' }}></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 bg-white" style={{ maxHeight: 'calc(88vh - 120px)', overflowY: 'auto' }}>
          {error && (
            <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3 shadow-sm" role="alert">
              <i className="fas fa-exclamation-triangle fa-lg text-danger mr-2"></i>
              <div className="flex-grow-1 small">{error}</div>
              <button type="button" className="close ml-2" onClick={() => setError(null)}>
                <span>&times;</span>
              </button>
            </div>
          )}

          {/* PATIENT SELECTION / BATCH DISPLAY */}
          {activePatients.length > 1 ? (
            /* MULTI-PATIENT BATCH CARD */
            <div
              className="mb-3.5 shadow-sm p-3.5"
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2.5 pb-2 border-bottom" style={{ borderBottomColor: '#dcfce7' }}>
                <div className="d-flex align-items-center">
                  <span
                    className="badge font-weight-bold mr-2"
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                    }}
                  >
                    <i className="fas fa-check-double mr-1"></i> {activePatients.length} Patients Selected
                  </span>
                  <span className="small text-muted font-weight-medium">
                    All listed patients will be scheduled together for this session
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm font-weight-bold d-inline-flex align-items-center"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#15803d',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                  }}
                  onClick={() => setShowAddMorePatients(!showAddMorePatients)}
                >
                  <i className={`fas ${showAddMorePatients ? 'fa-minus' : 'fa-plus'} mr-1`}></i>
                  {showAddMorePatients ? 'Close Search' : 'Add Another Patient'}
                </button>
              </div>

                {/* Patient Chips List */}
                <div className="d-flex flex-wrap" style={{ gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                  {activePatients.map((p) => {
                    const pName = p.surname ? `${p.surname} ${p.first_name || ''}`.trim() : (p.patient_name || 'Patient');
                    return (
                      <div
                        key={p.id}
                        className="badge badge-light border d-inline-flex align-items-center py-1.5 px-2.5 shadow-xs"
                        style={{ fontSize: '0.82rem', borderRadius: '20px', backgroundColor: '#ffffff' }}
                      >
                        <span
                          className="rounded-circle bg-primary text-white mr-1.5 d-inline-flex align-items-center justify-content-center font-weight-bold"
                          style={{ width: '22px', height: '22px', fontSize: '11px' }}
                        >
                          {p.first_name ? p.first_name.charAt(0).toUpperCase() : 'P'}
                        </span>
                        <strong className="text-gray-900 mr-1">{pName}</strong>
                        <span className="badge badge-danger mr-1" style={{ fontSize: '0.7rem' }}>
                          {p.hospital_number || 'No MRN'}
                        </span>
                        {p.gender && (
                          <span className="text-muted mr-1" style={{ fontSize: '0.72rem' }}>
                            {p.gender.charAt(0)}
                          </span>
                        )}
                        <button
                          type="button"
                          className="close text-danger ml-1 p-0"
                          style={{ fontSize: '16px', lineHeight: 1 }}
                          onClick={() => handleRemovePatientFromBatch(p.id)}
                          title="Remove patient from this batch schedule"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Optional Search to Add More to Batch */}
                {showAddMorePatients && (
                  <div className="mt-3 pt-2 border-top">
                    <label className="font-weight-bold text-gray-800 small mb-1">
                      <i className="fas fa-search text-primary mr-1"></i> Search &amp; Add Another Patient to this Batch:
                    </label>
                    <div className="input-group input-group-sm mb-1">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Type name, MRN, or phone to add to batch..."
                        value={patientSearchQuery}
                        onChange={(e) => handleSearchPatient(e.target.value)}
                        autoFocus
                      />
                      <div className="input-group-append">
                        <span className="input-group-text bg-white">
                          <i className={`fas ${searchingPatients ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
                        </span>
                      </div>
                    </div>
                    {patientSearchResults.length > 0 && (
                      <div className="list-group shadow-sm mt-1" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                        {patientSearchResults.map((p) => {
                          const isAlready = activePatients.some((x) => x.id === p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between py-1.5 px-3 ${isAlready ? 'disabled bg-light' : ''}`}
                              onClick={() => !isAlready && handleAddPatientToBatch(p)}
                            >
                              <div className="small">
                                <strong className="text-primary mr-1">{p.surname ? `${p.surname} ${p.first_name}` : p.patient_name}</strong>
                                <span className="badge badge-danger mr-1">{p.hospital_number}</span>
                                <span className="text-muted">{p.phone_number}</span>
                              </div>
                              <span className={`badge ${isAlready ? 'badge-secondary' : 'badge-primary'} px-2 py-1`}>
                                {isAlready ? 'Already Added' : '+ Add to Batch'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
          ) : activePatients.length === 1 ? (
            /* SINGLE PATIENT CARD */
            <div
              className="p-3 mb-3.5 border d-flex flex-wrap align-items-center justify-content-between"
              style={{
                backgroundColor: '#f8fafc',
                borderColor: '#e2e8f0',
                borderRadius: '12px',
                gap: '12px',
              }}
            >
              <div className="d-flex align-items-center mb-1 mb-md-0" style={{ gap: '14px' }}>
                <div
                  className="rounded-circle text-white font-weight-bold d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: '46px',
                    height: '46px',
                    fontSize: '18px',
                    background: firstPatient.gender === 'Female'
                      ? 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
                      : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  {firstPatient.first_name ? firstPatient.first_name.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <h6 className="mb-0 font-weight-bold" style={{ fontSize: '1.08rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
                    {singlePatientName}
                  </h6>
                  <div className="d-flex align-items-center flex-wrap mt-1" style={{ gap: '6px' }}>
                    <span
                      className="badge font-mono font-weight-bold"
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.74rem',
                      }}
                    >
                      MRN: {firstPatient.hospital_number || 'N/A'}
                    </span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                      }}
                    >
                      {firstPatient.gender || '-'} / {firstPatient.age ? `${firstPatient.age} yrs` : '-'}
                    </span>
                    {firstPatient.category_name && (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: '#ccfbf1',
                          color: '#0f766e',
                          border: '1px solid #99f6e4',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                        }}
                      >
                        {firstPatient.category_name}
                      </span>
                    )}
                    {firstPatient.phone_number && (
                      <span className="text-muted d-inline-flex align-items-center" style={{ fontSize: '0.78rem', fontWeight: 500 }}>
                        <i className="fas fa-phone-alt mr-1 text-primary" style={{ fontSize: '0.7rem' }}></i>
                        {firstPatient.phone_number}
                      </span>
                    )}
                  </div>
                  {firstPatient?.existingPurposes && firstPatient.existingPurposes.length > 0 && (
                    <div className="mt-1.5 d-flex align-items-center flex-wrap" style={{ gap: '4px' }}>
                      <span className="text-muted small mr-1" style={{ fontSize: '0.74rem' }}>
                        <i className="fas fa-calendar-check text-primary mr-1"></i>Already scheduled:
                      </span>
                      {firstPatient.existingPurposes.map((ep, epIdx) => (
                        <span
                          key={epIdx}
                          className="badge"
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                          }}
                        >
                          {ep}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm d-inline-flex align-items-center font-weight-bold"
                  style={{
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                  }}
                  onClick={() => setShowAddMorePatients(!showAddMorePatients)}
                  title="Add more patients to schedule together in one batch"
                >
                  <i className="fas fa-user-plus mr-1.5"></i> Add Another Patient (Batch)
                </button>
                <button
                  type="button"
                  className="btn btn-sm d-inline-flex align-items-center font-weight-bold"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                  }}
                  onClick={() => setActivePatients([])}
                  title="Search and select another patient"
                >
                  <i className="fas fa-exchange-alt mr-1.5"></i> Change
                </button>
              </div>

              {/* Collapsible Search to Add Another Patient */}
              {showAddMorePatients && (
                <div className="w-100 mt-3 pt-2.5 border-top" style={{ borderTopColor: '#e2e8f0' }}>
                  <label className="font-weight-bold text-dark small mb-1.5 d-flex align-items-center">
                    <i className="fas fa-search text-success mr-1.5"></i> Search &amp; Add Patient to Schedule Together:
                  </label>
                  <div className="input-group input-group-sm mb-1">
                    <input
                      type="text"
                      className="form-control font-weight-bold"
                      style={{ height: '38px', borderRadius: '8px 0 0 8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                      placeholder="Type patient name, phone number, or MRN..."
                      value={patientSearchQuery}
                      onChange={(e) => handleSearchPatient(e.target.value)}
                      autoFocus
                    />
                    <div className="input-group-append">
                      <span className="input-group-text bg-white" style={{ borderRadius: '0 8px 8px 0', border: '1px solid #cbd5e1', borderLeft: 0 }}>
                        <i className={`fas ${searchingPatients ? 'fa-spinner fa-spin text-primary' : 'fa-search text-muted'}`}></i>
                      </span>
                    </div>
                  </div>
                  {patientSearchResults.length > 0 && (
                    <div className="list-group shadow-sm mt-1.5" style={{ maxHeight: '160px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {patientSearchResults.map((p) => {
                        const isAlready = activePatients.some((x) => x.id === p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2 px-3 ${isAlready ? 'disabled bg-light' : ''}`}
                            onClick={() => !isAlready && handleAddPatientToBatch(p)}
                          >
                            <div className="small">
                              <strong className="text-primary mr-1">{p.surname ? `${p.surname} ${p.first_name}` : p.patient_name}</strong>
                              <span className="badge badge-danger mr-1">{p.hospital_number}</span>
                              <span className="text-muted">{p.phone_number}</span>
                            </div>
                            <span className={`badge ${isAlready ? 'badge-secondary' : 'badge-success'} px-2.5 py-1 font-weight-bold`}>
                              {isAlready ? 'Already Selected' : '+ Add to Schedule'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* NO PATIENT SELECTED: SEARCH BOX */
            <div
              className="mb-3.5 p-3.5"
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
              }}
            >
              <label className="font-weight-bold small mb-1.5 d-flex align-items-center" style={{ color: '#92400e', fontSize: '0.84rem' }}>
                <i className="fas fa-search mr-1.5" style={{ color: '#d97706' }}></i> Search &amp; Select Patient for Appointment:
              </label>
              <div className="input-group mb-2">
                <input
                  type="text"
                  className="form-control font-weight-bold"
                  style={{
                    height: '42px',
                    borderRadius: '8px 0 0 8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.9rem',
                  }}
                  placeholder="Type patient name, phone number, or MRN (e.g. John, 0801..., ISL-1024)..."
                  value={patientSearchQuery}
                  onChange={(e) => handleSearchPatient(e.target.value)}
                  autoFocus
                />
                <div className="input-group-append">
                  <span className="input-group-text bg-white" style={{ borderRadius: '0 8px 8px 0', border: '1px solid #cbd5e1', borderLeft: 0 }}>
                    <i className={`fas ${searchingPatients ? 'fa-spinner fa-spin text-primary' : 'fa-search text-muted'}`}></i>
                  </span>
                </div>
              </div>

              {/* Patient Search Results */}
              {patientSearchResults.length > 0 && (
                <div className="list-group shadow-sm mt-1" style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {patientSearchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2 px-3"
                      onClick={() => handleAddPatientToBatch(p)}
                    >
                      <div>
                        <strong className="text-primary">{p.surname ? `${p.surname} ${p.first_name} ${p.other_name || ''}`.trim() : (p.patient_name || 'Patient')}</strong>
                        <span className="badge badge-danger ml-2">{p.hospital_number}</span>
                        <span className="small text-muted ml-2">{p.phone_number}</span>
                      </div>
                      <span className="badge badge-primary px-2.5 py-1 font-weight-bold">Select</span>
                    </button>
                  ))}
                </div>
              )}
              {patientSearchQuery.length >= 2 && patientSearchResults.length === 0 && !searchingPatients && (
                <div className="text-danger small mt-1">No patients found matching "{patientSearchQuery}".</div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Appointment Date */}
              <div className="col-md-6 form-group mb-3.5">
                <label className="font-weight-bold text-dark mb-1.5 d-flex align-items-center" style={{ fontSize: '0.82rem' }}>
                  <i className="fas fa-calendar-alt text-primary mr-1.5"></i> Appointment Date <span className="text-danger ml-0.5">*</span>
                </label>
                <input
                  type="date"
                  className="form-control font-weight-bold"
                  value={formData.arrival_date}
                  min={getTodayDateStr()}
                  onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                  style={{
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '0.92rem',
                    color: '#0f172a',
                  }}
                  required
                />
                {/* Date Shortcut Chips */}
                <div className="d-flex flex-wrap mt-2" style={{ gap: '6px' }}>
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Tomorrow', days: 1 },
                    { label: '+3 Days', days: 3 },
                    { label: '+1 Week', days: 7 },
                    { label: '+2 Weeks', days: 14 },
                  ].map((sc) => {
                    const isSelected = formData.arrival_date === getShortcutDateStr(sc.days);
                    return (
                      <button
                        key={sc.label}
                        type="button"
                        onClick={() => handleDateShortcut(sc.days)}
                        className="btn btn-sm font-weight-bold"
                        style={{
                          borderRadius: '20px',
                          padding: '3px 12px',
                          fontSize: '0.78rem',
                          backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#475569',
                          border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                          boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
                          transition: 'all 0.15s ease-in-out',
                        }}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expected Arrival Time (Auto-updates to current time, user can change to another time) */}
              <div className="col-md-6 form-group mb-3.5">
                <label className="font-weight-bold text-dark mb-1.5 d-flex align-items-center" style={{ fontSize: '0.82rem' }}>
                  <i className="fas fa-clock text-primary mr-1.5"></i> Expected Arrival Time <span className="text-danger ml-0.5">*</span>
                </label>
                <input
                  type="time"
                  className="form-control font-weight-bold"
                  value={formData.arrival_time}
                  onChange={(e) => {
                    setTimeManuallyChanged(true);
                    setFormData({ ...formData, arrival_time: e.target.value });
                  }}
                  style={{
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '1rem',
                    color: '#0f172a',
                  }}
                  required
                />
                <div
                  className="d-flex align-items-center mt-2 px-2.5 py-1.5 rounded-lg"
                  style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #dbeafe',
                    color: '#1e40af',
                    fontSize: '0.76rem',
                    lineHeight: '1.4',
                  }}
                >
                  <i className="fas fa-magic mr-1.5 text-primary"></i>
                  <span>Auto-updates to current time. You can choose another time whenever needed.</span>
                </div>
              </div>
            </div>

            {activePatients.length > 1 ? (
              /* MULTI-PATIENT: INDIVIDUAL VISIT TYPE, CRITICALITY, & PURPOSE PER PATIENT */
              <div className="mb-4">
                <div className="d-flex flex-wrap align-items-center justify-content-between mb-2.5 pb-2 border-bottom">
                  <div>
                    <h6 className="font-weight-bold text-gray-900 mb-0" style={{ fontSize: '0.96rem' }}>
                      <i className="fas fa-user-edit text-primary mr-1.5"></i>
                      Individual Appointment Details ({activePatients.length} Patients)
                    </h6>
                    <div className="text-muted small">
                      Each patient can have their own <strong>Visit Type</strong>, <strong>Criticality</strong>, and <strong>Purpose</strong>
                    </div>
                  </div>

                  {/* Quick Fill All Helper Toolbar */}
                  <div className="d-flex align-items-center flex-wrap gap-1 mt-2 mt-md-0" style={{ gap: '6px' }}>
                    <span className="small text-muted font-weight-bold mr-1">
                      <i className="fas fa-bolt text-warning mr-1"></i>Quick Fill All:
                    </span>
                    <select
                      className="custom-select custom-select-sm"
                      style={{ width: '135px', fontSize: '0.78rem' }}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleApplyFieldToAll('visit_type', e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      title="Set Visit Type for all patients"
                    >
                      <option value="" disabled>Set All Visit Types...</option>
                      {VISIT_TYPES.map((vt) => (
                        <option key={vt.value} value={vt.value}>{vt.label}</option>
                      ))}
                    </select>

                    <select
                      className="custom-select custom-select-sm"
                      style={{ width: '135px', fontSize: '0.78rem' }}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleApplyFieldToAll('criticality', e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      title="Set Criticality for all patients"
                    >
                      <option value="" disabled>Set All Criticality...</option>
                      {CRITICALITY_CHOICES.filter(c => c.value !== 'critic').map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>

                    <select
                      className="custom-select custom-select-sm"
                      style={{ width: '160px', fontSize: '0.78rem' }}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleApplyFieldToAll('purpose', e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      title="Set Purpose for all patients"
                    >
                      <option value="" disabled>Set All Purposes...</option>
                      {purposesList.map((vp) => (
                        <option key={`bulk-vp-${vp.id}`} value={vp.purpose}>{vp.purpose}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* List of Patient Configuration Cards */}
                <div className="d-flex flex-column gap-2" style={{ gap: '10px' }}>
                  {activePatients.map((p, idx) => {
                    const config = patientConfigs[p.id] || {
                      visit_type: defaultVisitType || 'New-case',
                      criticality: '0',
                      purpose: purposesList[0]?.purpose || '',
                    };
                    const pName = p.surname ? `${p.surname} ${p.first_name || ''} ${p.other_name || ''}`.trim() : (p.patient_name || 'Patient');

                    return (
                      <div
                        key={p.id}
                        className="card border shadow-xs"
                        style={{ borderRadius: '8px', overflow: 'hidden', borderColor: '#cbd5e1' }}
                      >
                        {/* Patient Identification Header */}
                        <div
                          className="py-1.5 px-3 d-flex align-items-center justify-content-between border-bottom"
                          style={{ backgroundColor: '#f8fafc' }}
                        >
                          <div className="d-flex align-items-center">
                            <span className="badge badge-secondary mr-2 font-weight-bold" style={{ fontSize: '0.75rem' }}>
                              #{idx + 1}
                            </span>
                            <div
                              className="rounded-circle mr-2 d-flex align-items-center justify-content-center text-white font-weight-bold shadow-xs flex-shrink-0"
                              style={{
                                width: '26px',
                                height: '26px',
                                fontSize: '11px',
                                background: p.gender === 'Female' ? 'linear-gradient(135deg, #e83e8c 0%, #d63384 100%)' : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'
                              }}
                            >
                              {p.first_name ? p.first_name.charAt(0).toUpperCase() : 'P'}
                            </div>
                            <div>
                              <strong className="text-gray-900 mr-2" style={{ fontSize: '0.9rem' }}>
                                {pName}
                              </strong>
                              <span className="badge badge-light border text-danger font-weight-bold mr-2 shadow-xs" style={{ fontSize: '0.74rem' }}>
                                <i className="fas fa-id-badge mr-1"></i>{p.hospital_number || 'NO MRN'}
                              </span>
                              <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                {p.gender || 'Unknown'} {p.age ? `• ${p.age} yrs` : ''} {p.category_name ? `• ${p.category_name}` : ''}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-outline-danger btn-xs py-0.5 px-2 font-weight-bold"
                            style={{ fontSize: '0.72rem' }}
                            onClick={() => handleRemovePatientFromBatch(p.id)}
                            title="Remove patient from this batch schedule"
                          >
                            <i className="fas fa-times mr-1"></i> Remove
                          </button>
                        </div>

                        {/* Individual Controls: Visit Type, Criticality, Purpose */}
                        <div className="card-body p-2.5 bg-white">
                          <div className="row align-items-center">
                            {/* Visit Type */}
                            <div className="col-md-4 mb-2 mb-md-0">
                              <label className="font-weight-bold small text-gray-700 mb-1 d-block" style={{ fontSize: '0.78rem' }}>
                                <i className="fas fa-tag text-primary mr-1"></i> Visit Type <span className="text-danger">*</span>
                              </label>
                              <select
                                className="custom-select custom-select-sm"
                                value={config.visit_type}
                                onChange={(e) => handleUpdatePatientConfig(p.id, 'visit_type', e.target.value)}
                                required
                              >
                                {VISIT_TYPES.map((vt) => (
                                  <option key={vt.value} value={vt.value}>{vt.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Criticality */}
                            <div className="col-md-4 mb-2 mb-md-0">
                              <label className="font-weight-bold small text-gray-700 mb-1 d-block" style={{ fontSize: '0.78rem' }}>
                                <i className="fas fa-exclamation-circle text-warning mr-1"></i> Criticality <span className="text-danger">*</span>
                              </label>
                              <select
                                className="custom-select custom-select-sm"
                                value={config.criticality}
                                onChange={(e) => handleUpdatePatientConfig(p.id, 'criticality', e.target.value)}
                                required
                              >
                                {CRITICALITY_CHOICES.filter(c => c.value !== 'critic').map((choice) => (
                                  <option key={choice.value} value={choice.value}>{choice.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Purpose */}
                            <div className="col-md-4 mb-0">
                              <div className="d-flex align-items-center justify-content-between mb-1">
                                <label className="font-weight-bold small text-gray-700 mb-0" style={{ fontSize: '0.78rem' }}>
                                  <i className="fas fa-stethoscope text-info mr-1"></i> Purpose <span className="text-danger">*</span>
                                </label>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-link text-primary p-0 font-weight-bold"
                                  style={{ fontSize: '0.72rem', textDecoration: 'none' }}
                                  onClick={() => handleAddPatientPurpose(p.id)}
                                  title="Add more purpose for this patient"
                                >
                                  <i className="fas fa-plus mr-0.5"></i> Add Purpose
                                </button>
                              </div>

                              {(config.purposes && config.purposes.length > 0 ? config.purposes : [config.purpose || '']).map((purp, purpIdx) => (
                                <div key={purpIdx} className="d-flex align-items-center gap-1 mb-1" style={{ gap: '4px' }}>
                                  <select
                                    className="custom-select custom-select-sm"
                                    value={purp}
                                    onChange={(e) => handleUpdatePatientPurpose(p.id, purpIdx, e.target.value)}
                                    required
                                  >
                                    <option value="">-- Purpose {config.purposes?.length > 1 ? `#${purpIdx + 1}` : ''} --</option>
                                    {purposesList.map((vp) => (
                                      <option key={`vp-${p.id}-${purpIdx}-${vp.id}`} value={vp.purpose}>
                                        {vp.purpose} {Number(vp.price) > 0 ? `(₦${Number(vp.price).toLocaleString()})` : '(Free)'}
                                      </option>
                                    ))}
                                  </select>

                                  {config.purposes && config.purposes.length > 1 && (
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-outline-danger py-0 px-1.5"
                                      onClick={() => handleRemovePatientPurpose(p.id, purpIdx)}
                                      title="Remove this purpose"
                                    >
                                      &times;
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* SINGLE PATIENT FORM: Standard Visit Type, Criticality, Purpose */
              <>
                <div className="row">
                  {/* Visit Type */}
                  <div className="col-md-6 form-group mb-3.5">
                    <label className="font-weight-bold text-dark mb-1.5 d-flex align-items-center" style={{ fontSize: '0.82rem' }}>
                      <i className="fas fa-tag text-primary mr-1.5"></i> Visit Type <span className="text-danger ml-0.5">*</span>
                    </label>
                    <select
                      className="form-control font-weight-bold"
                      value={formData.visit_type}
                      onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        fontSize: '0.88rem',
                        color: '#0f172a',
                      }}
                      required
                    >
                      {VISIT_TYPES.map((vt) => (
                        <option key={vt.value} value={vt.value}>
                          {vt.label}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                      Classification of this clinic visit
                    </small>
                  </div>

                  {/* Select Criticality Field */}
                  <div className="col-md-6 form-group mb-3.5">
                    <label className="font-weight-bold text-dark mb-1.5 d-flex align-items-center" style={{ fontSize: '0.82rem' }}>
                      <i className="fas fa-exclamation-circle text-warning mr-1.5"></i> Select Criticality <span className="text-danger ml-0.5">*</span>
                    </label>
                    <select
                      className="form-control font-weight-bold"
                      value={formData.criticality}
                      onChange={(e) => setFormData({ ...formData, criticality: e.target.value })}
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        fontSize: '0.88rem',
                        color: '#0f172a',
                      }}
                      required
                    >
                      {CRITICALITY_CHOICES.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                      Level of urgency for this appointment request
                    </small>
                  </div>
                </div>

                {/* Purpose(s) of Appointment */}
                <div className="mb-3.5">
                  <div className="d-flex align-items-center justify-content-between mb-1.5">
                    <label className="font-weight-bold text-dark mb-0 d-flex align-items-center" style={{ fontSize: '0.82rem' }}>
                      <i className="fas fa-stethoscope text-primary mr-1.5"></i> Purpose(s) of Appointment <span className="text-danger ml-0.5">*</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm d-inline-flex align-items-center font-weight-bold"
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: '20px',
                        padding: '3px 12px',
                        fontSize: '0.76rem',
                      }}
                      onClick={handleAddSinglePurpose}
                      title="Add more purpose to schedule for this patient"
                    >
                      <i className="fas fa-plus mr-1"></i> Add More Purpose
                    </button>
                  </div>

                  {(formData.purposes && formData.purposes.length > 0 ? formData.purposes : [formData.purpose || '']).map((purp, idx) => (
                    <div key={idx} className="d-flex align-items-center mb-2" style={{ gap: '8px' }}>
                      <select
                        className="form-control font-weight-bold"
                        value={purp}
                        onChange={(e) => handleUpdateSinglePurpose(idx, e.target.value)}
                        style={{
                          height: '42px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          fontSize: '0.88rem',
                          color: '#0f172a',
                        }}
                        required
                      >
                        <option value="">-- Select Purpose {formData.purposes?.length > 1 ? `#${idx + 1}` : ''} --</option>
                        {purposesList.map((vp) => (
                          <option key={`vp-${idx}-${vp.id}`} value={vp.purpose}>
                            {vp.purpose} {Number(vp.price) > 0 ? `(₦${Number(vp.price).toLocaleString()})` : '(Free)'}
                          </option>
                        ))}
                      </select>

                      {formData.purposes && formData.purposes.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm d-flex align-items-center justify-content-center"
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fff1f2',
                            color: '#e11d48',
                            flexShrink: 0,
                          }}
                          onClick={() => handleRemoveSinglePurpose(idx)}
                          title="Remove this purpose"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      )}
                    </div>
                  ))}

                  {purposesList.length === 0 && (
                    <div
                      className="p-2.5 rounded-lg text-danger d-flex align-items-center mt-1"
                      style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', fontSize: '0.8rem' }}
                    >
                      <i className="fas fa-exclamation-triangle mr-2"></i> No purposes found in database. Please configure them in <strong>Visit Purposes Setup</strong>.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* If appointment is for today: offer direct queueing */}
            {isToday && (
              <div
                className="p-3 mb-3.5 d-flex align-items-start"
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  gap: '12px',
                }}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    id="queueTodayCheckbox"
                    checked={formData.queue_today}
                    onChange={(e) => setFormData({ ...formData, queue_today: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="queueTodayCheckbox"
                    className="font-weight-bold mb-0 cursor-pointer d-block"
                    style={{ color: '#15803d', fontSize: '0.88rem' }}
                  >
                    <i className="fas fa-list-ol mr-1.5"></i>
                    {activePatients.length > 1
                      ? `Also add all ${activePatients.length} patients to today's active Consultation Queue immediately`
                      : "Also add patient to today's active Consultation Queue immediately"}
                  </label>
                  <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '2px', lineHeight: '1.4' }}>
                    {activePatients.length > 1
                      ? `Patients are scheduled for today. Checking this will immediately place all ${activePatients.length} patients on the Consultation Queue.`
                      : 'Patient is scheduled for today. Checking this will immediately place the patient on the Nurse / Doctor waiting list.'}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div
              className="d-flex justify-content-end align-items-center pt-3 border-top mt-3"
              style={{
                borderTopColor: '#e2e8f0',
                gap: '10px',
              }}
            >
              <button
                type="button"
                className="btn btn-light border px-4 font-weight-bold"
                style={{
                  borderRadius: '8px',
                  height: '42px',
                  color: '#475569',
                  borderColor: '#cbd5e1',
                }}
                onClick={onClose}
                disabled={saving}
              >
                Cancel / Close
              </button>

              <button
                type="submit"
                className="btn btn-primary px-4 shadow-sm font-weight-bold d-inline-flex align-items-center justify-content-center"
                style={{
                  borderRadius: '8px',
                  height: '42px',
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                }}
                disabled={saving || activePatients.length === 0}
              >
                {saving ? (
                  <span>
                    <i className="fas fa-spinner fa-spin mr-2"></i> {activePatients.length > 1 ? `Scheduling ${activePatients.length} Appointments...` : 'Scheduling Appointment...'}
                  </span>
                ) : (
                  <span>
                    <i className={`fas ${activePatients.length > 1 ? 'fa-users' : 'fa-calendar-check'} mr-2`}></i>
                    {activePatients.length > 1
                      ? `Confirm & Schedule All ${activePatients.length} Patients`
                      : 'Confirm & Schedule Appointment'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
