import React, { useState, useEffect, useRef } from 'react';
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
  const [diagnosisComments, setDiagnosisComments] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Quick Prescription list inside consultation
  const [prescriptions, setPrescriptions] = useState([]);
  const [drugName, setDrugName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Twice daily (bd)');
  const [duration, setDuration] = useState('5 days');

  // Quick Diagnostics list
  const [investigations, setInvestigations] = useState([]);
  const [investigationName, setInvestigationName] = useState('');

  // Past encounters
  const [pastEncounters, setPastEncounters] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Vitals
  const [vitals, setVitals] = useState(appointment?.today_vitals || null);

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

  const loadPatientConsultationData = async () => {
    try {
      setLoading(true);
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

  const handleAddComplaint = (comp) => {
    if (!comp || !comp.trim()) return;
    const trimmed = comp.trim();
    if (!selectedComplaints.includes(trimmed)) {
      setSelectedComplaints([...selectedComplaints, trimmed]);
    }
    setCustomComplaint('');
  };

  const handleRemoveComplaint = (comp) => {
    setSelectedComplaints(selectedComplaints.filter((c) => c !== comp));
  };

  const handleAddPrescription = () => {
    if (!drugName.trim()) {
      showToast('Please enter a medication name', 'warning');
      return;
    }
    setPrescriptions([
      ...prescriptions,
      {
        id: Date.now(),
        drug: drugName.trim(),
        dosage: dosage.trim() || 'Standard',
        frequency,
        duration,
      },
    ]);
    setDrugName('');
    setDosage('');
  };

  const handleRemovePrescription = (id) => {
    setPrescriptions(prescriptions.filter((p) => p.id !== id));
  };

  const handleAddInvestigation = () => {
    if (!investigationName.trim()) return;
    setInvestigations([
      ...investigations,
      { id: Date.now(), test: investigationName.trim() },
    ]);
    setInvestigationName('');
  };

  const handleRemoveInvestigation = (id) => {
    setInvestigations(investigations.filter((i) => i !== id));
  };

  const handleSaveConsultation = async (isCompleting = false) => {
    if (!primaryDiagnosis.trim() && selectedComplaints.length === 0 && !historyOfIllness.trim()) {
      showToast('Please record at least a chief complaint or diagnosis for this consultation.', 'warning', 'Form Incomplete');
      return;
    }

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
          ? `PRESCRIPTIONS: ${prescriptions.map((p) => `${p.drug} (${p.dosage}, ${p.frequency}, ${p.duration})`).join('; ')}`
          : '',
        investigations.length > 0
          ? `REQUESTED TESTS: ${investigations.map((i) => i.test).join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      await api.createEncounter({
        patient: patientId,
        chief_complaint: complaintsString,
        history_of_present_illness: combinedHistory,
        diagnosis: primaryDiagnosis.trim(),
        comments_on_diagnosis: combinedComments,
      });

      // If completing, also complete the appointment if appointment ID exists
      if (isCompleting && appointment?.id) {
        try {
          await api.completeAppointment(appointment.id);
        } catch (_) {}
      }

      showToast(
        isCompleting
          ? `Doctor Consultation for ${patientName} completed and documented successfully!`
          : `Consultation clinical notes saved successfully!`,
        'success',
        isCompleting ? 'Consultation Completed' : 'Encounter Saved'
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
    patient.full_name ||
    patient.patient_name ||
    `${patient.surname || ''} ${patient.first_name || ''}`.trim() ||
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
          className="card-header py-3 px-4 text-white d-flex justify-content-between align-items-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="d-flex align-items-center">
            <div
              className="mr-3 d-flex align-items-center justify-content-center shadow-sm"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                fontSize: '1.25rem',
              }}
            >
              <i className="fas fa-user-md"></i>
            </div>
            <div>
              <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                <h5 className="m-0 font-weight-bold text-white mr-2">
                  Doctor Consultation Room &mdash; {patientName}
                </h5>
                <span className="badge badge-light text-primary font-weight-bold px-2 py-1 shadow-sm">
                  <i className="fas fa-id-badge mr-1"></i>
                  {hospitalNumber}
                </span>
                <span className="badge badge-success px-2 py-1 font-weight-bold shadow-sm">
                  <i className="fas fa-stethoscope mr-1"></i> Active Consultation
                </span>
              </div>
              <div className="small text-white-50 mt-1">
                <span>{patient.gender || appointment?.patient_gender || 'Gender: N/A'}</span>
                <span> &bull; {patient.age || appointment?.patient_age || 'Age: N/A'} yrs</span>
                <span> &bull; {patient.category_name || appointment?.category_name || 'Standard'}</span>
                {patient.phone_number && <span> &bull; <i className="fas fa-phone-alt fa-xs"></i> {patient.phone_number}</span>}
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center" style={{ gap: '8px' }}>
            {/* View Tabs */}
            <div className="btn-group btn-group-sm shadow-sm" role="group">
              <button
                type="button"
                className={`btn ${activeTab === 'notes' ? 'btn-light font-weight-bold text-primary' : 'btn-outline-light text-white'}`}
                onClick={() => setActiveTab('notes')}
              >
                <i className="fas fa-file-medical-alt mr-1"></i> Clinical Notes
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'orders' ? 'btn-light font-weight-bold text-primary' : 'btn-outline-light text-white'}`}
                onClick={() => setActiveTab('orders')}
              >
                <i className="fas fa-pills mr-1"></i> Orders & Rx
                {prescriptions.length > 0 && (
                  <span className="badge badge-danger ml-1">{prescriptions.length}</span>
                )}
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'history' ? 'btn-light font-weight-bold text-primary' : 'btn-outline-light text-white'}`}
                onClick={() => setActiveTab('history')}
              >
                <i className="fas fa-history mr-1"></i> History ({pastEncounters.length})
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'legacy' ? 'btn-light font-weight-bold text-primary' : 'btn-outline-light text-white'}`}
                onClick={() => setActiveTab('legacy')}
              >
                <i className="fas fa-desktop mr-1"></i> EMR Workspace
              </button>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-light text-secondary rounded-circle shadow-sm"
              style={{ width: '32px', height: '32px', padding: 0 }}
              onClick={onClose}
              title="Close Consultation Modal"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Top Vitals Ribbon */}
        {vitals && (
          <div
            className="px-4 py-2 border-bottom d-flex align-items-center justify-content-between flex-wrap"
            style={{ backgroundColor: '#f8fafc', fontSize: '0.82rem' }}
          >
            <div className="d-flex align-items-center flex-wrap" style={{ gap: '14px' }}>
              <span className="text-muted font-weight-bold d-flex align-items-center">
                <i className="fas fa-heartbeat text-danger mr-1"></i> Recorded Vitals:
              </span>
              <span>
                <strong>BP:</strong>{' '}
                <span className="badge badge-light border text-dark font-weight-bold">
                  {vitals.bp || 'N/A'} mmHg
                </span>
              </span>
              <span>
                <strong>Pulse:</strong>{' '}
                <span className="text-dark font-weight-bold">{vitals.pulse ? `${vitals.pulse} bpm` : '-'}</span>
              </span>
              <span>
                <strong>Temp:</strong>{' '}
                <span className="text-dark font-weight-bold">{vitals.temperature ? `${vitals.temperature} °C` : '-'}</span>
              </span>
              <span>
                <strong>SpO₂:</strong>{' '}
                <span className="text-dark font-weight-bold">{vitals.sp_02 ? `${vitals.sp_02}%` : '-'}</span>
              </span>
              <span>
                <strong>Resp:</strong>{' '}
                <span className="text-dark font-weight-bold">{vitals.respiratory_rate ? `${vitals.respiratory_rate} cpm` : '-'}</span>
              </span>
              <span>
                <strong>Weight/Height:</strong>{' '}
                <span className="text-dark font-weight-bold">
                  {vitals.weight ? `${vitals.weight}kg` : '-'} / {vitals.height ? `${vitals.height}${vitals.unit || 'cm'}` : '-'}
                </span>
              </span>
              <span>
                <strong>BMI:</strong>{' '}
                <span className="badge badge-primary px-2 py-0 font-weight-bold">
                  {vitals.bmi || '-'}
                </span>
              </span>
            </div>
            <div className="text-muted small">
              <i className="fas fa-user-shield text-success mr-1"></i>
              Recorded by {vitals.staff_name || 'Nursing'} ({vitals.time || 'Today'})
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
                <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '10px' }}>
                  <div className="card-header bg-white py-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                    <strong className="text-gray-800" style={{ fontSize: '0.88rem' }}>
                      <i className="fas fa-clipboard-list text-primary mr-2"></i> Presenting Complaints
                    </strong>
                    <span className="text-muted small">{selectedComplaints.length} selected</span>
                  </div>
                  <div className="card-body p-3">
                    {/* Selected Tags */}
                    {selectedComplaints.length > 0 && (
                      <div className="mb-2 d-flex flex-wrap" style={{ gap: '6px' }}>
                        {selectedComplaints.map((c) => (
                          <span
                            key={c}
                            className="badge badge-primary px-2 py-1 d-inline-flex align-items-center shadow-sm"
                            style={{ fontSize: '0.82rem', borderRadius: '15px' }}
                          >
                            <span>{c}</span>
                            <button
                              type="button"
                              className="btn btn-link p-0 ml-1 text-white"
                              style={{ textDecoration: 'none' }}
                              onClick={() => handleRemoveComplaint(c)}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Common complaint chips */}
                    <div className="small text-muted mb-1">Common Clinical Complaints:</div>
                    <div className="d-flex flex-wrap mb-3" style={{ gap: '5px' }}>
                      {COMMON_COMPLAINTS.map((comp) => {
                        const isSelected = selectedComplaints.includes(comp);
                        return (
                          <button
                            key={comp}
                            type="button"
                            className={`btn btn-xs py-1 px-2 ${isSelected ? 'btn-primary' : 'btn-light border'} shadow-sm`}
                            style={{ fontSize: '0.74rem', borderRadius: '12px' }}
                            onClick={() => (isSelected ? handleRemoveComplaint(comp) : handleAddComplaint(comp))}
                          >
                            {isSelected ? <i className="fas fa-check mr-1"></i> : <i className="fas fa-plus mr-1 text-muted"></i>}
                            {comp}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom input */}
                    <div className="input-group input-group-sm">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Add specific complaint (e.g. Left knee swelling, Dysuria)..."
                        value={customComplaint}
                        onChange={(e) => setCustomComplaint(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddComplaint(customComplaint);
                          }
                        }}
                      />
                      <div className="input-group-append">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleAddComplaint(customComplaint)}
                        >
                          <i className="fas fa-plus"></i> Add
                        </button>
                      </div>
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
                {/* Working Diagnosis */}
                <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '10px' }}>
                  <div className="card-header bg-white py-2 px-3 border-bottom">
                    <strong className="text-gray-800" style={{ fontSize: '0.88rem' }}>
                      <i className="fas fa-stethoscope text-danger mr-2"></i> Clinical Diagnosis & Impression
                    </strong>
                  </div>
                  <div className="card-body p-3">
                    <div className="form-group mb-2">
                      <label className="font-weight-bold small text-gray-700">Primary Diagnosis:</label>
                      <input
                        type="text"
                        className="form-control font-weight-bold text-primary"
                        placeholder="e.g. Acute Malaria, Hypertension, Peptic Ulcer Disease..."
                        value={primaryDiagnosis}
                        onChange={(e) => setPrimaryDiagnosis(e.target.value)}
                        style={{ fontSize: '0.9rem' }}
                      />
                    </div>

                    {/* Common Diagnosis chips */}
                    <div className="small text-muted mb-1">Common Diagnoses:</div>
                    <div className="d-flex flex-wrap mb-3" style={{ gap: '5px' }}>
                      {COMMON_DIAGNOSES.map((diag) => (
                        <button
                          key={diag}
                          type="button"
                          className="btn btn-xs py-1 px-2 btn-light border shadow-sm"
                          style={{ fontSize: '0.73rem', borderRadius: '12px' }}
                          onClick={() => setPrimaryDiagnosis(diag)}
                        >
                          <i className="fas fa-tag mr-1 text-primary"></i>
                          {diag}
                        </button>
                      ))}
                    </div>

                    <div className="form-group mb-0">
                      <label className="font-weight-bold small text-gray-700">
                        Differential / Additional Diagnosis Notes:
                      </label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Secondary diagnoses, complications, or differential considerations..."
                        value={diagnosisComments}
                        onChange={(e) => setDiagnosisComments(e.target.value)}
                        style={{ fontSize: '0.86rem' }}
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

          {/* TAB 2: Orders & Prescriptions */}
          {activeTab === 'orders' && (
            <div className="row">
              {/* Prescriptions Section */}
              <div className="col-lg-7 mb-3">
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
                    {/* Add Medication Row */}
                    <div className="p-3 bg-light rounded border mb-3">
                      <div className="font-weight-bold small text-gray-800 mb-2">
                        <i className="fas fa-plus-circle text-success mr-1"></i> Add Medication to Prescription:
                      </div>
                      <div className="row no-gutters mb-2">
                        <div className="col-md-6 pr-md-1 mb-2 mb-md-0">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Drug name (e.g. Tab Coartem, Cap Amoxicillin 500mg)..."
                            value={drugName}
                            onChange={(e) => setDrugName(e.target.value)}
                          />
                        </div>
                        <div className="col-md-6 pl-md-1">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Dosage (e.g. 1 tab, 500mg, 10ml)..."
                            value={dosage}
                            onChange={(e) => setDosage(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="row no-gutters mb-2">
                        <div className="col-md-6 pr-md-1 mb-2 mb-md-0">
                          <select
                            className="form-control form-control-sm"
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                          >
                            <option value="Once daily (od)">Once daily (od)</option>
                            <option value="Twice daily (bd)">Twice daily (bd)</option>
                            <option value="Three times daily (tds)">Three times daily (tds)</option>
                            <option value="Four times daily (qid)">Four times daily (qid)</option>
                            <option value="As needed (prn)">As needed (prn)</option>
                            <option value="Stat / Single dose">Stat / Single dose</option>
                          </select>
                        </div>
                        <div className="col-md-4 px-md-1 mb-2 mb-md-0">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Duration (e.g. 3 days, 5 days, 1 month)..."
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                          />
                        </div>
                        <div className="col-md-2 pl-md-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-success btn-block"
                            onClick={handleAddPrescription}
                          >
                            <i className="fas fa-plus"></i> Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Prescriptions List Table */}
                    {prescriptions.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered mb-0">
                          <thead className="thead-light">
                            <tr>
                              <th>#</th>
                              <th>Medication</th>
                              <th>Dosage</th>
                              <th>Frequency</th>
                              <th>Duration</th>
                              <th style={{ width: '40px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {prescriptions.map((p, idx) => (
                              <tr key={p.id}>
                                <td>{idx + 1}</td>
                                <td className="font-weight-bold text-primary">{p.drug}</td>
                                <td>{p.dosage}</td>
                                <td>{p.frequency}</td>
                                <td>{p.duration}</td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm text-danger p-0"
                                    onClick={() => handleRemovePrescription(p.id)}
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
                      <div className="text-center py-4 text-muted small">
                        <i className="fas fa-prescription fa-2x text-gray-300 mb-2 d-block"></i>
                        No medications added yet for this consultation.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lab Tests & Diagnostic Orders */}
              <div className="col-lg-5 mb-3">
                <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '10px' }}>
                  <div className="card-header bg-white py-3 px-3 border-bottom d-flex justify-content-between align-items-center">
                    <strong className="text-gray-800" style={{ fontSize: '0.92rem' }}>
                      <i className="fas fa-flask text-info mr-2"></i> Laboratory & Radiology Orders
                    </strong>
                    {onNavigate && (
                      <button
                        type="button"
                        className="btn btn-xs btn-outline-info shadow-sm"
                        onClick={() => {
                          onNavigate('radiology');
                          showToast(`Opened Diagnostics for ${patientName}`, 'info');
                        }}
                      >
                        <i className="fas fa-external-link-alt mr-1"></i> Lab Module
                      </button>
                    )}
                  </div>
                  <div className="card-body p-3">
                    <div className="input-group input-group-sm mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Test requisition (e.g. FBC, MP, Widal, Urinalysis, Chest X-ray)..."
                        value={investigationName}
                        onChange={(e) => setInvestigationName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInvestigation();
                          }
                        }}
                      />
                      <div className="input-group-append">
                        <button type="button" className="btn btn-info" onClick={handleAddInvestigation}>
                          <i className="fas fa-plus"></i> Order
                        </button>
                      </div>
                    </div>

                    {/* Common Lab Tests Chips */}
                    <div className="small text-muted mb-1">Common Tests:</div>
                    <div className="d-flex flex-wrap mb-3" style={{ gap: '5px' }}>
                      {['Full Blood Count (FBC)', 'Malaria Parasite (MP)', 'Widal Test', 'Urinalysis', 'Blood Sugar (FBS/RBS)', 'Lipid Profile', 'Abdominal USS', 'Chest X-Ray'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          className="btn btn-xs py-1 px-2 btn-light border shadow-sm"
                          style={{ fontSize: '0.72rem', borderRadius: '12px' }}
                          onClick={() => {
                            if (!investigations.some((inv) => inv.test === t)) {
                              setInvestigations([...investigations, { id: Date.now(), test: t }]);
                            }
                          }}
                        >
                          + {t}
                        </button>
                      ))}
                    </div>

                    {investigations.length > 0 ? (
                      <ul className="list-group list-group-flush">
                        {investigations.map((inv) => (
                          <li
                            key={inv.id}
                            className="list-group-item px-2 py-2 d-flex justify-content-between align-items-center"
                          >
                            <span className="font-weight-bold text-dark small">
                              <i className="fas fa-vial text-info mr-2"></i>
                              {inv.test}
                            </span>
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-danger p-0"
                              onClick={() => handleRemoveInvestigation(inv.id)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-3 text-muted small">
                        No diagnostic investigations ordered yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
        >
          <div>
            <span className="text-muted small">
              <i className="fas fa-info-circle text-primary mr-1"></i>
              Consultation notes are stored in the patient's permanent clinical timeline.
            </span>
          </div>

          <div className="d-flex align-items-center" style={{ gap: '8px' }}>
            <button
              type="button"
              className="btn btn-light border px-3"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-outline-primary px-3 shadow-sm"
              onClick={() => handleSaveConsultation(false)}
              disabled={saving}
            >
              {saving ? <i className="fas fa-spinner fa-spin mr-1"></i> : <i className="fas fa-save mr-1"></i>}
              Save Notes
            </button>

            <button
              type="button"
              className="btn btn-success px-4 font-weight-bold shadow-sm"
              onClick={() => handleSaveConsultation(true)}
              disabled={saving}
            >
              {saving ? <i className="fas fa-spinner fa-spin mr-1"></i> : <i className="fas fa-check-circle mr-1"></i>}
              Finish &amp; Complete Consultation
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
