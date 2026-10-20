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
  onClose,
  onAppointmentScheduled,
  defaultVisitType = 'New-case',
}) {
  const getTodayDateStr = () => new Date().toISOString().split('T')[0];

  // Auto-generate exact current time (HH:MM), which user can then change to another time
  const getCurrentTimeStr = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const [activePatient, setActivePatient] = useState(patient || null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [timeManuallyChanged, setTimeManuallyChanged] = useState(false);

  const [formData, setFormData] = useState({
    arrival_date: getTodayDateStr(),
    arrival_time: getCurrentTimeStr(),
    visit_type: defaultVisitType,
    criticality: 'critic', // Defaults to '-- Criticality --' placeholder matching screenshot
    purpose: '',
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

  // Sync state whenever modal opens or patient changes
  useEffect(() => {
    if (isOpen) {
      setActivePatient(patient || null);
      setPatientSearchQuery('');
      setPatientSearchResults([]);
      setTimeManuallyChanged(false);
      setFormData({
        arrival_date: getTodayDateStr(),
        arrival_time: getCurrentTimeStr(),
        visit_type: defaultVisitType,
        criticality: 'critic',
        purpose: '',
        custom_purpose: '',
        queue_today: false,
      });
      setError(null);

      // Load visit purposes strictly from database
      const loadPurposes = async () => {
        try {
          if (typeof api.getVisitPurposes === 'function') {
            const res = await api.getVisitPurposes();
            const list = Array.isArray(res) ? res : (res?.results || []);
            setPurposesList(list);
            if (list.length > 0) {
              setFormData((prev) => ({
                ...prev,
                purpose: prev.purpose || list[0].purpose,
              }));
            }
          }
        } catch (err) {
          console.warn('Could not load visit purposes from database:', err);
        }
      };
      loadPurposes();
    }
  }, [isOpen, patient, defaultVisitType]);

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

  if (!isOpen) return null;

  const patientName = activePatient
    ? ((activePatient.surname ? `${activePatient.surname} ${activePatient.first_name || ''} ${activePatient.other_name || ''}`.trim() : null) || activePatient.patient_name || 'Patient')
    : '';

  const isToday = formData.arrival_date === getTodayDateStr();

  const handleDateShortcut = (daysToAdd) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setFormData((prev) => ({
      ...prev,
      arrival_date: d.toISOString().split('T')[0],
      queue_today: daysToAdd === 0 ? prev.queue_today : false,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activePatient || !activePatient.id) {
      setError('Please select a patient before scheduling the appointment.');
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
    if (formData.criticality === 'critic') {
      setError('Please select the level of Criticality.');
      return;
    }

    const finalPurpose = (formData.purpose || '').trim();

    if (!finalPurpose) {
      setError('Please select a Purpose of Appointment from the database list.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const critObj = CRITICALITY_CHOICES.find((c) => c.value === formData.criticality);
      const critLabel = critObj && critObj.value !== 'critic' ? critObj.label : 'General Request';
      const critNum = Number(formData.criticality === 'critic' ? 0 : formData.criticality);

      const payload = {
        patient: activePatient.id,
        arrival_date: formData.arrival_date,
        arrival_time: formData.arrival_time,
        visit_type: formData.visit_type || 'New-case',
        purpose: finalPurpose,
        provider: null,
        clinician: `General Pool (${critLabel})`,
        comment: `Criticality: ${critLabel}`,
      };

      const result = await api.createAppointment(payload);

      // If requested to queue immediately for today
      if (formData.queue_today && isToday) {
        try {
          await api.createQueue({
            patient: activePatient.id,
            purpose: finalPurpose,
            visit_type: formData.visit_type || 'New-case',
            critical_request: critNum,
          });
          showToast(
            `Appointment scheduled and ${patientName} queued for consultation (${critLabel})!`,
            'success',
            'Appointment & Queue'
          );
        } catch (queueErr) {
          console.warn('Queue error after appointment:', queueErr);
          showToast(
            `Appointment scheduled! (Queue registration: ${queueErr.message})`,
            'info',
            'Appointment Booked'
          );
        }
      } else {
        showToast(
          `Appointment successfully scheduled for ${patientName} on ${formData.arrival_date} at ${formData.arrival_time}!`,
          'success',
          'Appointment Confirmed'
        );
      }

      if (onAppointmentScheduled) {
        onAppointmentScheduled(result);
      }
      onClose();
    } catch (err) {
      console.error('Error creating appointment:', err);
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to schedule appointment';
      setError(msg);
      showToast(msg, 'danger', 'Scheduling Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* High z-index backdrop to prevent overlapping behind other modals */}
      <div
        className="modal-backdrop-custom"
        onClick={onClose}
        style={{ zIndex: 1060 }}
      ></div>

      <div
        className="card shadow modal-custom"
        style={{ maxWidth: '780px', width: '92%', zIndex: 1070 }}
      >
        {/* Header */}
        <div className="card-header py-3 bg-gradient-primary text-white d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <div
              className="bg-white text-primary rounded-circle p-2 mr-3 d-flex align-items-center justify-content-center"
              style={{ width: '42px', height: '42px' }}
            >
              <i className="fas fa-calendar-check fa-lg"></i>
            </div>
            <div>
              <h5 className="m-0 font-weight-bold text-white">Schedule Patient Appointment</h5>
              <div className="text-white-50 small">Book a medical consultation, review, or specialty clinic visit</div>
            </div>
          </div>
          <button
            type="button"
            className="close text-white"
            onClick={onClose}
            aria-label="Close"
            style={{ opacity: 0.9 }}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        {/* Body */}
        <div className="card-body" style={{ maxHeight: 'calc(88vh - 120px)', overflowY: 'auto' }}>
          {error && (
            <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3 shadow-sm" role="alert">
              <i className="fas fa-exclamation-triangle fa-lg text-danger mr-2"></i>
              <div className="flex-grow-1 small">{error}</div>
              <button type="button" className="close ml-2" onClick={() => setError(null)}>
                <span>&times;</span>
              </button>
            </div>
          )}

          {/* Patient Selection / Summary Card */}
          {activePatient ? (
            <div className="p-3 mb-3 rounded border bg-light d-flex flex-wrap align-items-center justify-content-between">
              <div className="d-flex align-items-center mb-2 mb-md-0">
                <div
                  className="rounded-circle bg-primary text-white font-weight-bold d-flex align-items-center justify-content-center mr-3 shadow-sm"
                  style={{ width: '48px', height: '48px', fontSize: '18px' }}
                >
                  {activePatient.first_name ? activePatient.first_name.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <h6 className="mb-0 font-weight-bold text-gray-900">{patientName}</h6>
                  <div className="small text-muted d-flex align-items-center flex-wrap mt-1">
                    <span className="badge badge-danger mr-2">MRN: {activePatient.hospital_number || 'N/A'}</span>
                    <span className="badge badge-secondary mr-2">{activePatient.gender || '-'} / {activePatient.age ? `${activePatient.age} yrs` : '-'}</span>
                    {activePatient.category_name && <span className="badge badge-info mr-2">{activePatient.category_name}</span>}
                    {activePatient.phone_number && (
                      <span className="text-muted mr-2">
                        <i className="fas fa-phone-alt fa-xs mr-1 text-primary"></i>{activePatient.phone_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <button
                  type="button"
                  className="btn btn-xs btn-outline-secondary font-weight-bold"
                  onClick={() => setActivePatient(null)}
                  title="Search and select another patient"
                >
                  <i className="fas fa-exchange-alt mr-1"></i> Change Patient
                </button>
              </div>
            </div>
          ) : (
            <div className="card border-left-warning mb-3 p-3 bg-light">
              <label className="font-weight-bold text-gray-900 small mb-1">
                <i className="fas fa-search text-warning mr-1"></i> Search & Select Patient for Appointment:
              </label>
              <div className="input-group mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type patient name, phone number, or MRN (e.g. John, 0801..., ISL-1024)..."
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

              {/* Patient Search Results */}
              {patientSearchResults.length > 0 && (
                <div className="list-group shadow-sm mt-1" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {patientSearchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2 px-3"
                      onClick={() => {
                        setActivePatient(p);
                        setPatientSearchQuery('');
                        setPatientSearchResults([]);
                      }}
                    >
                      <div>
                        <strong className="text-primary">{p.surname ? `${p.surname} ${p.first_name} ${p.other_name || ''}`.trim() : (p.patient_name || 'Patient')}</strong>
                        <span className="badge badge-danger ml-2">{p.hospital_number}</span>
                        <span className="small text-muted ml-2">{p.phone_number}</span>
                      </div>
                      <span className="badge badge-primary px-2 py-1">Select</span>
                    </button>
                  ))}
                </div>
              )}
              {patientSearchQuery.length >= 2 && patientSearchResults.length === 0 && !searchingPatients && (
                <small className="text-danger">No patients found matching "{patientSearchQuery}".</small>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Appointment Date */}
              <div className="col-md-6 mb-3">
                <label className="font-weight-bold text-gray-800 small mb-1">
                  <i className="fas fa-calendar-alt text-primary mr-1"></i> Appointment Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.arrival_date}
                  min={getTodayDateStr()}
                  onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                  required
                />
                {/* Date Shortcut Chips */}
                <div className="d-flex flex-wrap mt-2" style={{ gap: '4px' }}>
                  <button
                    type="button"
                    className={`btn btn-xs py-0 px-2 rounded-pill font-weight-bold ${formData.arrival_date === getTodayDateStr() ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => handleDateShortcut(0)}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs py-0 px-2 rounded-pill btn-outline-secondary font-weight-bold"
                    onClick={() => handleDateShortcut(1)}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs py-0 px-2 rounded-pill btn-outline-secondary font-weight-bold"
                    onClick={() => handleDateShortcut(3)}
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs py-0 px-2 rounded-pill btn-outline-secondary font-weight-bold"
                    onClick={() => handleDateShortcut(7)}
                  >
                    +1 Week
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs py-0 px-2 rounded-pill btn-outline-secondary font-weight-bold"
                    onClick={() => handleDateShortcut(14)}
                  >
                    +2 Weeks
                  </button>
                </div>
              </div>

              {/* Expected Arrival Time (Auto-updates to current time, user can change to another time) */}
              <div className="col-md-6 mb-3">
                <label className="font-weight-bold text-gray-800 small mb-1">
                  <i className="fas fa-clock text-primary mr-1"></i> Expected Arrival Time <span className="text-danger">*</span>
                </label>
                <input
                  type="time"
                  className="form-control"
                  value={formData.arrival_time}
                  onChange={(e) => {
                    setTimeManuallyChanged(true);
                    setFormData({ ...formData, arrival_time: e.target.value });
                  }}
                  required
                />
                <small className="text-muted d-block mt-1">
                  <i className="fas fa-magic text-info mr-1"></i> Auto-updates to current time. You can choose another time whenever needed.
                </small>
              </div>
            </div>

            <div className="row">
              {/* Visit Type */}
              <div className="col-md-6 mb-3">
                <label className="font-weight-bold text-gray-800 small mb-1">
                  <i className="fas fa-tag text-primary mr-1"></i> Visit Type <span className="text-danger">*</span>
                </label>
                <select
                  className="custom-select"
                  value={formData.visit_type}
                  onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
                  required
                >
                  {VISIT_TYPES.map((vt) => (
                    <option key={vt.value} value={vt.value}>
                      {vt.label}
                    </option>
                  ))}
                </select>
                <small className="text-muted">Classification of this clinic visit</small>
              </div>

              {/* Select Criticality Field (matching user requirement) */}
              <div className="col-md-6 mb-3">
                <label className="font-weight-bold text-gray-800 small mb-1">
                  Select Criticality: <span className="text-danger">*</span>
                </label>
                <select
                  className="custom-select"
                  value={formData.criticality}
                  onChange={(e) => setFormData({ ...formData, criticality: e.target.value })}
                  required
                >
                  {CRITICALITY_CHOICES.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
                <small className="text-muted">Level of urgency for this appointment request</small>
              </div>
            </div>

            {/* Purpose of Appointment (Loaded from Database Only) */}
            <div className="mb-3">
              <label className="font-weight-bold text-gray-800 small mb-1">
                <i className="fas fa-stethoscope text-primary mr-1"></i> Purpose of Appointment <span className="text-danger">*</span>
              </label>

              <select
                className="custom-select"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                required
              >
                <option value="">-- Select Purpose of Appointment --</option>
                {purposesList.map((vp) => (
                  <option key={`vp-${vp.id}`} value={vp.purpose}>
                    {vp.purpose} {Number(vp.price) > 0 ? `(₦${Number(vp.price).toLocaleString()})` : '(Free)'}
                  </option>
                ))}
              </select>

              {purposesList.length === 0 && (
                <small className="text-danger d-block mt-1">
                  <i className="fas fa-exclamation-triangle mr-1"></i> No purposes found in database. Please configure them in <strong>Visit Purposes Setup</strong>.
                </small>
              )}
            </div>

            {/* If appointment is for today: offer direct queueing */}
            {isToday && (
              <div className="card bg-light border-left-success p-3 mb-3">
                <div className="custom-control custom-checkbox">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="queueTodayCheckbox"
                    checked={formData.queue_today}
                    onChange={(e) => setFormData({ ...formData, queue_today: e.target.checked })}
                  />
                  <label className="custom-control-label font-weight-bold text-success cursor-pointer" htmlFor="queueTodayCheckbox">
                    <i className="fas fa-list-ol mr-1"></i> Also add patient to today's active Consultation Queue immediately
                  </label>
                  <div className="small text-muted ml-4">
                    Patient is scheduled for today. Checking this will immediately place the patient on the Nurse / Doctor waiting list.
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-2">
              <button
                type="button"
                className="btn btn-secondary font-weight-bold"
                onClick={onClose}
                disabled={saving}
              >
                <i className="fas fa-times mr-1"></i> Cancel / Close
              </button>

              <button
                type="submit"
                className="btn btn-primary font-weight-bold shadow-sm px-4"
                disabled={saving || (!activePatient && !patient)}
              >
                {saving ? (
                  <span>
                    <i className="fas fa-spinner fa-spin mr-2"></i> Scheduling Appointment...
                  </span>
                ) : (
                  <span>
                    <i className="fas fa-calendar-check mr-2"></i> Confirm & Schedule Appointment
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
