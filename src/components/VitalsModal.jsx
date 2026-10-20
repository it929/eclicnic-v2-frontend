import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { showToast } from './Toast';

export default function VitalsModal({
  isOpen,
  patient,
  queueItem = null,
  onClose,
  onVitalsSaved,
}) {
  const [formData, setFormData] = useState({
    temperature: '',
    bp_systolic: '',
    bp_diastolic: '',
    pulse: '',
    respiratory_rate: '',
    sp_02: '',
    weight: '',
    height: '',
    unit: 'cm',
    blood_glucose: '',
    urine_ph: '',
    urine_protein: '',
    urine_glucose: '',
    comment: '',
    pin_code: '',
  });

  const [saving, setSaving] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(null);

  const currentStaffUser = useMemo(() => {
    try {
      const userStr = localStorage.getItem('clinic365_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (_) {
      return null;
    }
  }, []);

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        temperature: '',
        bp_systolic: '',
        bp_diastolic: '',
        pulse: '',
        respiratory_rate: '',
        sp_02: '',
        weight: '',
        height: '',
        unit: 'cm',
        blood_glucose: '',
        urine_ph: '',
        urine_protein: '',
        urine_glucose: '',
        comment: '',
        pin_code: '',
      });
      setShowPin(false);
      setError(null);
    }
  }, [isOpen]);

  // Live BMI Calculation
  const bmiInfo = useMemo(() => {
    const w = parseFloat(formData.weight);
    const h = parseFloat(formData.height);
    if (!w || !h || w <= 0 || h <= 0) return null;

    let heightInMeters = h;
    if (formData.unit === 'cm') {
      heightInMeters = h / 100;
    }

    if (heightInMeters <= 0) return null;
    const bmiVal = (w / (heightInMeters * heightInMeters)).toFixed(2);
    const num = parseFloat(bmiVal);

    let category = 'Normal';
    let badgeClass = 'badge-success';

    if (num < 18.5) {
      category = 'Underweight';
      badgeClass = 'badge-info';
    } else if (num < 25.0) {
      category = 'Healthy / Normal';
      badgeClass = 'badge-success';
    } else if (num < 30.0) {
      category = 'Overweight';
      badgeClass = 'badge-warning';
    } else {
      category = 'Obese';
      badgeClass = 'badge-danger';
    }

    return { value: bmiVal, category, badgeClass };
  }, [formData.weight, formData.height, formData.unit]);

  // Blood Pressure interpretation
  const bpInterpretation = useMemo(() => {
    const sys = parseInt(formData.bp_systolic, 10);
    const dia = parseInt(formData.bp_diastolic, 10);
    if (!sys && !dia) return null;

    if (sys >= 140 || dia >= 90) {
      return { text: 'High BP (Stage 2 Hypertension)', badge: 'badge-danger' };
    }
    if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
      return { text: 'High BP (Stage 1 Hypertension)', badge: 'badge-warning text-dark' };
    }
    if (sys >= 120 && sys <= 129 && dia < 80) {
      return { text: 'Elevated BP', badge: 'badge-warning text-dark' };
    }
    if (sys < 90 || dia < 60) {
      return { text: 'Low BP (Hypotension)', badge: 'badge-info' };
    }
    return { text: 'Normal BP', badge: 'badge-success' };
  }, [formData.bp_systolic, formData.bp_diastolic]);

  if (!isOpen || !patient) return null;

  const patientId =
    (queueItem && typeof queueItem.patient === 'number' ? queueItem.patient : (queueItem?.patient?.id || null)) ||
    (patient && typeof patient.patient === 'number' ? patient.patient : null) ||
    (patient && typeof patient.patient === 'object' && patient.patient?.id ? patient.patient.id : null) ||
    patient?.patient_id ||
    patient?.id;

  const patientName =
    (patient.surname ? `${patient.surname} ${patient.first_name || ''} ${patient.other_name || ''}`.trim() : null) ||
    patient.patient_name ||
    queueItem?.patient_name ||
    'Patient';
  const hospitalNum = patient.hospital_number || queueItem?.hospital_number || 'N/A';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!formData.temperature && !formData.bp_systolic && !formData.pulse && !formData.weight) {
      setError('Please record at least one core vital sign (e.g. Temperature, Blood Pressure, Pulse, or Weight).');
      return;
    }

    // PIN Authorization validation
    if (!formData.pin_code || !formData.pin_code.trim()) {
      setError('Security PIN is required. Please enter your PIN to authorize this action as the performing staff member.');
      return;
    }

    try {
      setSaving(true);

      let bpStr = null;
      if (formData.bp_systolic || formData.bp_diastolic) {
        bpStr = `${formData.bp_systolic || '0'}/${formData.bp_diastolic || '0'}`;
      }

      const queueRowId =
        (queueItem && queueItem.waiting_status !== undefined ? queueItem.id : null) ||
        (patient && patient.waiting_status !== undefined ? patient.id : null) ||
        queueItem?.id ||
        null;

      const payload = {
        patient: Number(patientId),
        queue_id: queueRowId,
        staff_id: currentStaffUser?.id,
        staff_username: currentStaffUser?.username,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        bp: bpStr,
        pulse: formData.pulse ? parseInt(formData.pulse, 10) : null,
        respiratory_rate: formData.respiratory_rate ? parseFloat(formData.respiratory_rate) : null,
        sp_02: formData.sp_02 ? parseFloat(formData.sp_02) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        unit: formData.unit,
        blood_glucose: formData.blood_glucose ? parseFloat(formData.blood_glucose) : null,
        urine_ph: formData.urine_ph ? parseFloat(formData.urine_ph) : null,
        urine_protein: formData.urine_protein ? parseFloat(formData.urine_protein) : null,
        urine_glucose: formData.urine_glucose ? parseFloat(formData.urine_glucose) : null,
        purpose: queueItem?.purpose || patient?.purpose || 'General Consultation',
        comment: formData.comment?.trim() || null,
        pin_code: formData.pin_code.trim(),
      };

      const res = await api.recordVitals(payload);
      const performer = res?.authorized_by || res?.staff_name || currentStaffUser?.fullname || '';

      showToast(
        `Vital signs recorded for ${patientName}${performer ? ` (Authorized by ${performer})` : ''}! Patient forwarded to Doctor Consultation queue.`,
        'success',
        'Vitals Recorded & Authorized'
      );

      if (onVitalsSaved) onVitalsSaved();
      onClose();
    } catch (err) {
      console.error('Error saving vitals:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to save vital signs.';
      setError(msg);
      showToast(msg, 'danger', 'Authorization Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop-custom" onClick={saving ? undefined : onClose}></div>

      <div className="card shadow modal-custom" style={{ maxWidth: '820px' }}>
        {/* Header */}
        <div className="card-header py-3 bg-gradient-primary text-white d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <i className="fas fa-heartbeat mr-2 fa-lg text-white-50"></i>
            <div>
              <h6 className="m-0 font-weight-bold text-white">Record Patient Vital Signs</h6>
              <span className="small text-white-50">Nursing Triage & Clinical Assessment</span>
            </div>
          </div>

          <div className="d-flex align-items-center">
            <span className="hospital-badge mr-3 bg-white text-primary border-0 font-weight-bold">
              {hospitalNum}
            </span>
            <button
              type="button"
              className="close text-white"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
              style={{ opacity: 0.9 }}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        </div>

        {/* Patient Subheader Banner */}
        <div className="p-3 bg-light border-bottom d-flex align-items-center justify-content-between flex-wrap">
          <div className="d-flex align-items-center mb-1 mb-md-0">
            <div
              className="rounded-circle bg-primary text-white font-weight-bold mr-3 d-inline-flex align-items-center justify-content-center"
              style={{ width: '42px', height: '42px', fontSize: '1rem' }}
            >
              <i className="fas fa-user"></i>
            </div>
            <div>
              <h5 className="mb-0 font-weight-bold text-gray-800">{patientName}</h5>
              <div className="small text-muted mt-1">
                <span className="badge badge-primary mr-2">
                  {patient.category_name || 'Standard'}
                </span>
                <span className="badge badge-info mr-2">
                  {patient.plan_name || 'General Plan'}
                </span>
                {patient.gender && <span className="mr-2">Gender: <strong>{patient.gender}</strong></span>}
                {patient.age && <span>Age: <strong>{patient.age} yrs</strong></span>}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="badge badge-warning px-2 py-1 text-dark font-weight-bold">
              <i className="fas fa-stethoscope mr-1"></i> {queueItem?.purpose || 'Vital Signs Triage'}
            </span>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div className="card-body p-4" style={{ maxHeight: 'calc(85vh - 210px)', overflowY: 'auto' }}>
            {error && (
              <div className="alert alert-danger py-2 px-3 small d-flex align-items-center shadow-sm mb-3" role="alert">
                <i className="fas fa-exclamation-triangle mr-2 text-danger"></i>
                <div className="flex-grow-1">{error}</div>
                <button type="button" className="close ml-2" onClick={() => setError(null)}>
                  <span>&times;</span>
                </button>
              </div>
            )}

            {/* Core Vitals Card */}
            <div className="card border-left-danger shadow-sm mb-3">
              <div className="card-body py-3">
                <h6 className="font-weight-bold text-danger mb-3 small text-uppercase d-flex align-items-center">
                  <i className="fas fa-heartbeat mr-1"></i> Core Vital Signs
                </h6>

                <div className="row">
                  {/* Temperature */}
                  <div className="col-md-4 form-group">
                    <label className="small font-weight-bold text-gray-700">
                      Temperature (°C)
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        step="0.1"
                        min="30"
                        max="45"
                        name="temperature"
                        placeholder="e.g. 36.8"
                        className="form-control form-control-sm font-weight-bold"
                        value={formData.temperature}
                        onChange={handleChange}
                      />
                      <div className="input-group-append">
                        <span className="input-group-text">°C</span>
                      </div>
                    </div>
                    {parseFloat(formData.temperature) > 37.5 && (
                      <small className="text-danger font-weight-bold mt-1 d-block">
                        <i className="fas fa-fire mr-1"></i> Fever Alert (&gt;37.5°C)
                      </small>
                    )}
                  </div>

                  {/* Blood Pressure (Systolic / Diastolic) */}
                  <div className="col-md-5 form-group">
                    <label className="small font-weight-bold text-gray-700 d-flex justify-content-between align-items-center">
                      <span>Blood Pressure (mmHg)</span>
                      {bpInterpretation && (
                        <span className={`badge ${bpInterpretation.badge} py-0 px-2`} style={{ fontSize: '0.68rem' }}>
                          {bpInterpretation.text}
                        </span>
                      )}
                    </label>
                    <div className="d-flex align-items-center">
                      <input
                        type="number"
                        name="bp_systolic"
                        placeholder="Sys (120)"
                        className="form-control form-control-sm font-weight-bold mr-1"
                        value={formData.bp_systolic}
                        onChange={handleChange}
                      />
                      <span className="font-weight-bold text-muted mx-1">/</span>
                      <input
                        type="number"
                        name="bp_diastolic"
                        placeholder="Dia (80)"
                        className="form-control form-control-sm font-weight-bold ml-1 mr-1"
                        value={formData.bp_diastolic}
                        onChange={handleChange}
                      />
                      <span className="small text-muted font-weight-bold">mmHg</span>
                    </div>
                  </div>

                  {/* Pulse */}
                  <div className="col-md-3 form-group">
                    <label className="small font-weight-bold text-gray-700">
                      Pulse Rate (BPM)
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        name="pulse"
                        placeholder="e.g. 72"
                        className="form-control form-control-sm font-weight-bold"
                        value={formData.pulse}
                        onChange={handleChange}
                      />
                      <div className="input-group-append">
                        <span className="input-group-text">bpm</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row">
                  {/* Respiratory Rate */}
                  <div className="col-md-4 form-group">
                    <label className="small font-weight-bold text-gray-700">
                      Respiratory Rate
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        name="respiratory_rate"
                        placeholder="e.g. 18"
                        className="form-control form-control-sm font-weight-bold"
                        value={formData.respiratory_rate}
                        onChange={handleChange}
                      />
                      <div className="input-group-append">
                        <span className="input-group-text">cpm</span>
                      </div>
                    </div>
                  </div>

                  {/* SpO2 Oxygen Saturation */}
                  <div className="col-md-4 form-group">
                    <label className="small font-weight-bold text-gray-700">
                      Oxygen Saturation (SpO₂)
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        name="sp_02"
                        placeholder="e.g. 98"
                        min="50"
                        max="100"
                        className="form-control form-control-sm font-weight-bold"
                        value={formData.sp_02}
                        onChange={handleChange}
                      />
                      <div className="input-group-append">
                        <span className="input-group-text">%</span>
                      </div>
                    </div>
                    {parseFloat(formData.sp_02) < 95 && parseFloat(formData.sp_02) > 0 && (
                      <small className="text-danger font-weight-bold mt-1 d-block">
                        <i className="fas fa-exclamation-triangle mr-1"></i> Low SpO₂ (&lt;95%)
                      </small>
                    )}
                  </div>

                  {/* Blood Glucose */}
                  <div className="col-md-4 form-group">
                    <label className="small font-weight-bold text-gray-700">
                      Blood Glucose (RBG)
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        step="0.1"
                        name="blood_glucose"
                        placeholder="e.g. 95"
                        className="form-control form-control-sm"
                        value={formData.blood_glucose}
                        onChange={handleChange}
                      />
                      <div className="input-group-append">
                        <span className="input-group-text">mg/dL</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Anthropometry & Body Mass Index */}
            <div className="card border-left-info shadow-sm mb-3">
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="font-weight-bold text-info mb-0 small text-uppercase">
                    <i className="fas fa-weight mr-1"></i> Anthropometry & Body Mass Index (BMI)
                  </h6>
                  {bmiInfo && (
                    <div className="d-flex align-items-center">
                      <span className="mr-2 font-weight-bold text-dark small">
                        BMI: <strong className="text-primary">{bmiInfo.value}</strong> kg/m²
                      </span>
                      <span className={`badge ${bmiInfo.badgeClass} px-2 py-1 font-weight-bold`}>
                        {bmiInfo.category}
                      </span>
                    </div>
                  )}
                </div>

                <div className="row">
                  {/* Weight */}
                  <div className="col-md-4 form-group">
                    <label className="small font-weight-bold text-gray-700">
                      Weight (kg)
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        name="weight"
                        placeholder="e.g. 70.5"
                        className="form-control form-control-sm font-weight-bold"
                        value={formData.weight}
                        onChange={handleChange}
                      />
                      <div className="input-group-append">
                        <span className="input-group-text">kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Height */}
                  <div className="col-md-4 form-group">
                    <label className="small font-weight-bold text-gray-700">
                      Height ({formData.unit})
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        step="0.1"
                        min="10"
                        name="height"
                        placeholder={formData.unit === 'cm' ? 'e.g. 175' : 'e.g. 1.75'}
                        className="form-control form-control-sm font-weight-bold"
                        value={formData.height}
                        onChange={handleChange}
                      />
                      <div className="input-group-append">
                        <select
                          name="unit"
                          className="custom-select custom-select-sm border-left-0"
                          style={{ width: '60px' }}
                          value={formData.unit}
                          onChange={handleChange}
                        >
                          <option value="cm">cm</option>
                          <option value="m">m</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Calculated BMI Display */}
                  <div className="col-md-4 form-group">
                    <label className="small font-weight-bold text-gray-700">
                      Calculated BMI Status
                    </label>
                    <div className="form-control form-control-sm bg-light font-weight-bold d-flex align-items-center justify-content-between">
                      {bmiInfo ? (
                        <>
                          <span>{bmiInfo.value} kg/m²</span>
                          <span className={`badge ${bmiInfo.badgeClass} ml-2 py-1 px-2`}>
                            {bmiInfo.category}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted small">Enter height & weight</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Urinalysis & Nurse Observation */}
            <div className="card border-left-secondary shadow-sm mb-2">
              <div className="card-body py-3">
                <h6 className="font-weight-bold text-secondary mb-3 small text-uppercase">
                  <i className="fas fa-notes-medical mr-1"></i> Urinalysis & Nurse Observations
                </h6>

                <div className="row">
                  <div className="col-md-4 form-group">
                    <label className="small font-weight-bold text-gray-700">
                      Urine pH
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="urine_ph"
                      placeholder="e.g. 6.5"
                      className="form-control form-control-sm"
                      value={formData.urine_ph}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4 form-group">
                    <label className="small font-weight-bold text-gray-700">
                      Urine Protein
                    </label>
                    <input
                      type="text"
                      name="urine_protein"
                      placeholder="e.g. Negative / Nil"
                      className="form-control form-control-sm"
                      value={formData.urine_protein}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4 form-group">
                    <label className="small font-weight-bold text-gray-700">
                      Urine Glucose
                    </label>
                    <input
                      type="text"
                      name="urine_glucose"
                      placeholder="e.g. Nil / Normal"
                      className="form-control form-control-sm"
                      value={formData.urine_glucose}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group mb-0">
                  <label className="small font-weight-bold text-gray-700">
                    Nurse Clinical Notes / Patient Complaints
                  </label>
                  <textarea
                    rows="2"
                    name="comment"
                    placeholder="e.g. Patient presents with mild headache and fatigue. Alert and oriented."
                    className="form-control form-control-sm"
                    value={formData.comment}
                    onChange={handleChange}
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Staff PIN Authorization Card */}
            <div
              className="card border-left-warning shadow-sm mb-2"
              style={{ backgroundColor: '#fffdf6', borderColor: '#f6c23e' }}
            >
              <div className="card-body py-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="font-weight-bold text-dark mb-0 small text-uppercase d-flex align-items-center">
                    <i className="fas fa-user-shield text-warning mr-2 fa-lg"></i>
                    Staff PIN Authorization <span className="text-danger ml-1">*</span>
                  </h6>
                  {currentStaffUser && (
                    <span className="badge badge-light border text-primary small px-2 py-1 font-weight-bold">
                      <i className="fas fa-user-circle mr-1"></i>
                      {currentStaffUser.fullname || currentStaffUser.username}
                    </span>
                  )}
                </div>

                <p className="text-muted small mb-2" style={{ fontSize: '0.82rem' }}>
                  Enter your 4-digit security PIN to authorize and sign this vitals record as the attending staff member.
                </p>

                <div className="row align-items-center">
                  <div className="col-md-6 form-group mb-0">
                    <label className="small font-weight-bold text-gray-700 mb-1">
                      Attending Staff Security PIN <span className="text-danger">*</span>
                    </label>
                    <div className="input-group input-group-sm">
                      <div className="input-group-prepend">
                        <span className="input-group-text bg-white text-warning">
                          <i className="fas fa-key"></i>
                        </span>
                      </div>
                      <input
                        type={showPin ? 'text' : 'password'}
                        name="pin_code"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength="8"
                        placeholder="Enter 4-digit PIN"
                        className="form-control form-control-sm font-weight-bold"
                        value={formData.pin_code}
                        onChange={handleChange}
                        required
                        autoComplete="off"
                      />
                      <div className="input-group-append">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowPin((prev) => !prev)}
                          title={showPin ? 'Hide PIN' : 'Show PIN'}
                          tabIndex="-1"
                        >
                          <i className={`fas fa-${showPin ? 'eye-slash' : 'eye'}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6 mb-0 mt-2 mt-md-0">
                    <div className="p-2 rounded bg-white border small text-muted">
                      <i className="fas fa-shield-alt text-success mr-1"></i>
                      <strong>Clinical Authorization:</strong> This securely records your staff identity as the clinician who performed and authorized these vitals.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="card-footer bg-white d-flex justify-content-between align-items-center">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary btn-sm px-4 shadow-sm font-weight-bold"
              disabled={saving}
            >
              {saving ? (
                <span>
                  <i className="fas fa-spinner fa-spin mr-1"></i> Authorizing & Forwarding...
                </span>
              ) : (
                <span>
                  <i className="fas fa-check-circle mr-1"></i> Authorize & Send to Doctor
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
