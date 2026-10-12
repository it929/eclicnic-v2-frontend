import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import ScheduleAppointmentModal from './ScheduleAppointmentModal';
import VitalsModal from './VitalsModal';
import PatientDetailModal from './PatientDetailModal';
import CaseNoteModal from './CaseNoteModal';
import DoctorConsultationModal from './DoctorConsultationModal';
import { showToast } from './Toast';

/**
 * VitalsBadgeWithPopover - Displays a "Vitals Taken" badge that reveals
 * the patient's recorded vital signs in a clinical popover card upon hovering.
 */
function VitalsBadgeWithPopover({ vitals, onOpenVitals }) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!vitals) {
    return (
      <button
        type="button"
        className="btn btn-xs btn-outline-info py-0 px-2 mt-1 shadow-sm d-inline-flex align-items-center"
        style={{ fontSize: '0.68rem', borderRadius: '12px' }}
        onClick={(e) => {
          e.stopPropagation();
          if (onOpenVitals) onOpenVitals();
        }}
        title="Record Vital Signs for this patient"
      >
        <i className="fas fa-plus mr-1 text-danger"></i> Take Vitals
      </button>
    );
  }

  return (
    <div
      className="position-relative d-inline-block mt-1"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="badge badge-success px-2 py-1 shadow-sm d-inline-flex align-items-center"
        style={{
          cursor: 'pointer',
          fontSize: '0.73rem',
          letterSpacing: '0.2px',
          backgroundColor: '#1cc88a',
          borderColor: '#17a673',
          color: '#fff',
        }}
        onClick={() => {
          if (onOpenVitals) onOpenVitals();
        }}
        title="Hover to view today's vitals, click to edit"
      >
        <i className="fas fa-heartbeat mr-1 text-white"></i> Vitals Taken
        <i className="fas fa-chevron-down ml-1 fa-xs text-white-50"></i>
      </span>

      {isOpen && (
        <div
          className="card shadow-lg position-absolute border-0"
          style={{
            top: '100%',
            right: '0',
            marginTop: '6px',
            width: '320px',
            zIndex: 1060,
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 0.5rem 1.75rem rgba(0,0,0,0.22)',
            backgroundColor: '#ffffff',
            textAlign: 'left',
            whiteSpace: 'normal',
            lineHeight: '1.4',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Card Header */}
          <div className="bg-gradient-success text-white px-3 py-2 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <i className="fas fa-heartbeat mr-2 fa-sm"></i>
              <strong style={{ fontSize: '0.82rem' }}>Today's Vital Signs</strong>
            </div>
            <span className="badge badge-light text-success font-weight-bold" style={{ fontSize: '0.72rem' }}>
              <i className="fas fa-clock mr-1"></i>
              {vitals.time || 'Today'}
            </span>
          </div>

          {/* Card Body */}
          <div className="p-3" style={{ fontSize: '0.78rem', backgroundColor: '#fdfdfe' }}>
            {/* Blood Pressure Header */}
            <div className="p-2 rounded bg-light border mb-2 d-flex justify-content-between align-items-center">
              <span className="text-muted font-weight-bold">
                <i className="fas fa-tachometer-alt text-danger mr-1"></i> Blood Pressure:
              </span>
              <span className="font-weight-bold text-dark" style={{ fontSize: '0.88rem' }}>
                {vitals.bp ? `${vitals.bp} mmHg` : 'N/A'}
              </span>
            </div>

            {/* Quick 3-Metric Row */}
            <div className="row no-gutters mb-2">
              <div className="col-4 pr-1">
                <div className="p-2 rounded bg-light border text-center">
                  <div className="text-muted small" style={{ fontSize: '0.68rem' }}>
                    <i className="fas fa-thermometer-half text-warning mr-1"></i> Temp
                  </div>
                  <div className="font-weight-bold text-dark">
                    {vitals.temperature ? `${vitals.temperature}°C` : '-'}
                  </div>
                </div>
              </div>

              <div className="col-4 px-1">
                <div className="p-2 rounded bg-light border text-center">
                  <div className="text-muted small" style={{ fontSize: '0.68rem' }}>
                    <i className="fas fa-heartbeat text-danger mr-1"></i> Pulse
                  </div>
                  <div className="font-weight-bold text-dark">
                    {vitals.pulse ? `${vitals.pulse} bpm` : '-'}
                  </div>
                </div>
              </div>

              <div className="col-4 pl-1">
                <div className="p-2 rounded bg-light border text-center">
                  <div className="text-muted small" style={{ fontSize: '0.68rem' }}>
                    <i className="fas fa-lungs text-info mr-1"></i> SpO₂
                  </div>
                  <div className="font-weight-bold text-dark">
                    {vitals.sp_02 ? `${vitals.sp_02}%` : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Anthropometry (Weight / Height / BMI) */}
            <div className="p-2 rounded bg-light border mb-2 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted">Weight / Ht: </span>
                <strong className="text-dark">
                  {vitals.weight ? `${vitals.weight}kg` : '-'} / {vitals.height ? `${vitals.height}${vitals.unit || 'cm'}` : '-'}
                </strong>
              </div>
              <div>
                <span className="text-muted">BMI: </span>
                <span className="badge badge-primary px-2 py-1 font-weight-bold">
                  {vitals.bmi || '-'}
                </span>
              </div>
            </div>

            {/* Other tests if present */}
            {(vitals.blood_glucose || vitals.urine_ph || vitals.respiratory_rate) && (
              <div className="p-2 rounded bg-light border mb-2 small d-flex justify-content-between flex-wrap">
                {vitals.respiratory_rate && (
                  <span className="mr-2">
                    <strong className="text-muted">Resp:</strong> {vitals.respiratory_rate} cpm
                  </span>
                )}
                {vitals.blood_glucose && (
                  <span className="mr-2">
                    <strong className="text-muted">Glucose:</strong> {vitals.blood_glucose} mg/dL
                  </span>
                )}
                {vitals.urine_ph && (
                  <span>
                    <strong className="text-muted">Urine pH:</strong> {vitals.urine_ph}
                  </span>
                )}
              </div>
            )}

            {/* Clinical Comment */}
            {vitals.comment && (
              <div className="mb-2 p-2 rounded bg-white border font-italic text-muted small" style={{ fontSize: '0.74rem' }}>
                <i className="fas fa-comment-medical text-primary mr-1"></i>
                "{vitals.comment}"
              </div>
            )}

            {/* Staff Authorization Footer */}
            <div className="pt-2 border-top d-flex justify-content-between align-items-center text-muted" style={{ fontSize: '0.72rem' }}>
              <span>
                <i className="fas fa-user-shield text-success mr-1"></i>
                {vitals.staff_name || 'Authorized Staff'}
              </span>
              <span className="badge badge-light border text-success font-weight-normal">
                <i className="fas fa-check-circle mr-1"></i> PIN Verified
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppointmentsView({
  initialFilter = 'today',
  onSelectPatient,
  onOpenNewPatient,
  onOpenVisitPurposes,
  onNavigate,
}) {
  const [activeFilter, setActiveFilter] = useState(initialFilter); // 'today' | 'upcoming' | 'completed' | 'cancelled' | 'expired' | 'all'
  const [appointments, setAppointments] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    today: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    expired: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Modal for scheduling appointment
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedPatientForSchedule, setSelectedPatientForSchedule] = useState(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showPatientPicker, setShowPatientPicker] = useState(false);

  // Modal for taking/viewing vitals
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState(null);

  // Modal for patient details
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState(null);

  // Modal for case notes
  const [selectedPatientForCaseNote, setSelectedPatientForCaseNote] = useState(null);
  const [isCaseNoteOpen, setIsCaseNoteOpen] = useState(false);

  // Doctor Consultation Encounter Modal
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [selectedPatientForConsultation, setSelectedPatientForConsultation] = useState(null);
  const [selectedAppointmentForConsultation, setSelectedAppointmentForConsultation] = useState(null);

  // Multi-tier Dropdown action state
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [activeSubmenu, setActiveSubmenu] = useState('encounter'); // 'encounter' | 'requests' | 'billing' | 'admin'
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdownId(null);
        setActiveSubmenu('encounter');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Sync initial filter prop if changed from sidebar
  useEffect(() => {
    if (initialFilter) {
      setActiveFilter(initialFilter);
    }
  }, [initialFilter]);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeFilter !== 'all') {
        params.status = activeFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      if (selectedDate) {
        params.date = selectedDate;
      }

      const [res, sumRes] = await Promise.all([
        api.getAppointments(params),
        api.getAppointmentSummary().catch(() => null),
      ]);

      setAppointments(res.results || res || []);
      if (sumRes) {
        setSummary(sumRes);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery, selectedDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Cancel Appointment
  const handleCancelAppointment = async (appt) => {
    if (!window.confirm(`Are you sure you want to cancel the appointment for ${appt.patient_name || 'this patient'}?`)) {
      return;
    }
    try {
      setActionLoadingId(appt.id);
      await api.cancelAppointment(appt.id);
      showToast('Appointment cancelled successfully.', 'warning', 'Appointment Cancelled');
      loadAppointments();
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Error cancelling appointment', 'danger', 'Error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Complete Appointment
  const handleCompleteAppointment = async (appt) => {
    try {
      setActionLoadingId(appt.id);
      await api.completeAppointment(appt.id);
      showToast('Appointment marked as completed.', 'success', 'Appointment Completed');
      loadAppointments();
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Error completing appointment', 'danger', 'Error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Send Patient to Consultation Queue from Appointment
  const handleQueueFromAppointment = async (appt) => {
    if (!appt.patient) return;
    try {
      setActionLoadingId(appt.id);
      await api.createQueue({
        patient: appt.patient,
        purpose: appt.purpose || 'General Consultation',
        visit_type: appt.visit_type || 'Follow-up',
      });
      showToast(
        `Patient ${appt.patient_name} admitted from appointment directly into Consultation Queue!`,
        'success',
        'Patient Queued'
      );
      loadAppointments();
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Error queueing patient', 'danger', 'Queue Error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Vitals Modal for patient in appointment
  const handleOpenVitals = (appt) => {
    if (!appt.patient) return;
    setSelectedPatientForVitals({
      id: appt.patient,
      patient: appt.patient,
      patient_id: appt.patient,
      patient_name: appt.patient_name,
      full_name: appt.patient_name,
      hospital_number: appt.hospital_number,
      category_name: appt.category_name,
      gender: appt.patient_gender,
      age: appt.patient_age,
      purpose: appt.purpose,
    });
    setIsVitalsModalOpen(true);
  };

  // Open Patient Details when clicking patient name
  const handlePatientClick = (appt) => {
    if (!appt.patient) return;
    const patObj = {
      id: appt.patient,
      patient_id: appt.patient,
      hospital_number: appt.hospital_number,
      full_name: appt.patient_name,
      patient_name: appt.patient_name,
      category_name: appt.category_name,
      gender: appt.patient_gender,
      age: appt.patient_age,
      phone_number: appt.patient_phone,
    };
    if (onSelectPatient) {
      onSelectPatient(patObj);
    } else {
      setSelectedPatientForDetail(patObj);
    }
  };

  // Patient search for scheduling
  const handleSearchPatients = async (query) => {
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
      console.warn('Patient search error:', err);
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleSelectPatientForBooking = (pat) => {
    setSelectedPatientForSchedule(pat);
    setShowPatientPicker(false);
    setPatientSearchQuery('');
    setPatientSearchResults([]);
    setIsScheduleModalOpen(true);
  };

  // Open clinical case note
  const handleOpenCaseNote = (appt) => {
    if (!appt.patient) return;
    setSelectedPatientForCaseNote({
      id: appt.patient,
      patient_id: appt.patient,
      patient: appt.patient,
      full_name: appt.patient_name,
      patient_name: appt.patient_name,
      hospital_number: appt.hospital_number,
      category_name: appt.category_name,
      gender: appt.patient_gender,
      age: appt.patient_age,
      phone_number: appt.patient_phone,
    });
    setIsCaseNoteOpen(true);
    setOpenDropdownId(null);
  };

  // Begin Doctor Consultation Encounter
  const handleBeginEncounter = async (appt) => {
    if (!appt.patient) return;
    const patObj = {
      id: appt.patient,
      patient_id: appt.patient,
      patient: appt.patient,
      full_name: appt.patient_name,
      patient_name: appt.patient_name,
      hospital_number: appt.hospital_number,
      category_name: appt.category_name,
      gender: appt.patient_gender,
      age: appt.patient_age,
      phone_number: appt.patient_phone,
    };
    setSelectedPatientForConsultation(patObj);
    setSelectedAppointmentForConsultation(appt);
    setIsConsultationModalOpen(true);
    setOpenDropdownId(null);

    // Queue / activate in consultation queue in background
    try {
      await api.createQueue({
        patient: appt.patient,
        purpose: appt.purpose || 'General Consultation',
        visit_type: appt.visit_type || 'Follow-up',
      });
    } catch (_) {}
  };

  // Reschedule Appointment
  const handleReschedule = (appt) => {
    setSelectedPatientForSchedule({
      id: appt.patient,
      patient_id: appt.patient,
      full_name: appt.patient_name,
      patient_name: appt.patient_name,
      hospital_number: appt.hospital_number,
      category_name: appt.category_name,
      gender: appt.patient_gender,
      age: appt.patient_age,
      phone_number: appt.patient_phone,
    });
    setIsScheduleModalOpen(true);
    setOpenDropdownId(null);
  };

  // Immunization Encounter
  const handleImmunizationEncounter = async (appt) => {
    if (!appt.patient) return;
    try {
      setActionLoadingId(appt.id);
      await api.createQueue({
        patient: appt.patient,
        purpose: 'Immunization Encounter',
        visit_type: appt.visit_type || 'Routine',
      });
      showToast(
        `Patient ${appt.patient_name} admitted to Immunization Clinic queue!`,
        'success',
        'Immunization Encounter'
      );
      loadAppointments();
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Error queueing patient', 'danger', 'Queue Error');
    } finally {
      setActionLoadingId(null);
      setOpenDropdownId(null);
    }
  };

  // Admit to Ward
  const handleWardAdmission = async (appt) => {
    if (!appt.patient) return;
    try {
      setActionLoadingId(appt.id);
      await api.createQueue({
        patient: appt.patient,
        purpose: 'Ward Admission',
        visit_type: appt.visit_type || 'In-Patient',
      });
      showToast(
        `Patient ${appt.patient_name} queued for In-Patient / Ward Admission!`,
        'success',
        'Ward Admission'
      );
      loadAppointments();
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Error admitting patient', 'danger', 'Admission Error');
    } finally {
      setActionLoadingId(null);
      setOpenDropdownId(null);
    }
  };

  // Render Submenu Item helper
  const renderSubmenuItem = (label, icon, onClickHandler, isDanger = false) => (
    <div
      className="px-3 py-2 mx-1 rounded d-flex align-items-center"
      style={{
        cursor: 'pointer',
        fontSize: '0.83rem',
        fontWeight: '500',
        color: isDanger ? '#dc2626' : '#334155',
        transition: 'all 0.12s ease',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isDanger ? '#fef2f2' : '#f1f5f9';
        e.currentTarget.style.color = isDanger ? '#b91c1c' : '#0f172a';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = isDanger ? '#dc2626' : '#334155';
      }}
      onClick={(e) => {
        e.stopPropagation();
        setOpenDropdownId(null);
        if (onClickHandler) onClickHandler();
      }}
    >
      {icon && <span style={{ width: '22px', display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{label}</span>
    </div>
  );

  const renderDivider = () => (
    <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 6px' }} />
  );

  return (
    <div className="container-fluid">
      {/* Executive Page Header */}
      <div className="d-flex flex-column flex-xl-row align-items-xl-center justify-content-between mb-4 pb-2" style={{ gap: '16px' }}>
        <div className="d-flex align-items-center">
          <div
            className="d-none d-sm-flex align-items-center justify-content-center mr-3 shadow-sm"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              fontSize: '1.25rem',
              flexShrink: 0,
            }}
          >
            <i className="fas fa-calendar-alt"></i>
          </div>
          <div>
            <h1 className="h3 mb-0 font-weight-bold text-gray-900" style={{ letterSpacing: '-0.02em', fontSize: '1.45rem' }}>
              Clinic Appointment Scheduling &amp; Directory
            </h1>
            <p className="text-muted small mb-0 mt-1" style={{ fontSize: '0.84rem' }}>
              Manage frontdesk appointment bookings, patient arrivals, doctor consultations, and reviews
            </p>
          </div>
        </div>

        {/* Action Button Cluster */}
        <div className="d-flex align-items-center flex-wrap" style={{ gap: '10px' }}>
          {onOpenVisitPurposes && (
            <button
              type="button"
              className="btn btn-sm btn-white border shadow-sm font-weight-bold d-inline-flex align-items-center px-3"
              style={{
                height: '38px',
                borderRadius: '8px',
                borderColor: '#cbd5e1',
                color: '#334155',
                fontSize: '0.84rem',
                backgroundColor: '#ffffff',
                transition: 'all 0.15s ease-in-out',
                whiteSpace: 'nowrap',
              }}
              onClick={onOpenVisitPurposes}
              title="Manage appointment consultation purposes, tariffs, and bulk upload"
            >
              <i className="fas fa-stethoscope text-info mr-2" style={{ fontSize: '0.85rem' }}></i>
              <span>Visit Purposes Setup</span>
            </button>
          )}

          {onOpenNewPatient && (
            <button
              type="button"
              className="btn btn-sm btn-white border shadow-sm font-weight-bold d-inline-flex align-items-center px-3"
              style={{
                height: '38px',
                borderRadius: '8px',
                borderColor: '#cbd5e1',
                color: '#334155',
                fontSize: '0.84rem',
                backgroundColor: '#ffffff',
                transition: 'all 0.15s ease-in-out',
                whiteSpace: 'nowrap',
              }}
              onClick={onOpenNewPatient}
              title="Register a new patient into the hospital directory"
            >
              <i className="fas fa-user-plus text-primary mr-2" style={{ fontSize: '0.85rem' }}></i>
              <span>Register Patient</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-sm text-white font-weight-bold d-inline-flex align-items-center px-3 shadow"
            style={{
              height: '38px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.35)',
              fontSize: '0.84rem',
              transition: 'all 0.15s ease-in-out',
              whiteSpace: 'nowrap',
            }}
            onClick={() => {
              setSelectedPatientForSchedule(null);
              setIsScheduleModalOpen(true);
            }}
          >
            <i className="fas fa-calendar-plus mr-2" style={{ fontSize: '0.85rem' }}></i>
            <span>Schedule Appointment</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="row mb-4">
        {/* Today's Appointments */}
        <div className="col-xl-3 col-md-6 mb-3">
          <div
            className={`card border-left-primary shadow-sm h-100 py-2 cursor-pointer transition-all ${activeFilter === 'today' ? 'bg-primary-soft border-2' : ''}`}
            onClick={() => { setActiveFilter('today'); setSelectedDate(''); }}
          >
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Today's Appointments
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">{summary.today}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar-check fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="col-xl-3 col-md-6 mb-3">
          <div
            className={`card border-left-info shadow-sm h-100 py-2 cursor-pointer transition-all ${activeFilter === 'upcoming' ? 'bg-info-soft border-2' : ''}`}
            onClick={() => { setActiveFilter('upcoming'); setSelectedDate(''); }}
          >
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Upcoming Bookings
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">{summary.upcoming}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-clock fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="col-xl-3 col-md-6 mb-3">
          <div
            className={`card border-left-success shadow-sm h-100 py-2 cursor-pointer transition-all ${activeFilter === 'completed' ? 'bg-success-soft border-2' : ''}`}
            onClick={() => { setActiveFilter('completed'); setSelectedDate(''); }}
          >
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Completed Consults
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">{summary.completed}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-check-double fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancelled / Expired */}
        <div className="col-xl-3 col-md-6 mb-3">
          <div
            className={`card border-left-danger shadow-sm h-100 py-2 cursor-pointer transition-all ${activeFilter === 'cancelled' ? 'bg-danger-soft border-2' : ''}`}
            onClick={() => { setActiveFilter('cancelled'); setSelectedDate(''); }}
          >
            <div className="card-body py-2">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                    Cancelled / Expired
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">
                    {summary.cancelled} <span className="text-muted small font-weight-normal">({summary.expired} exp)</span>
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar-times fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="card shadow mb-4">
        {/* Card Header & Filter Nav */}
        <div className="card-header bg-white py-3 px-4 border-bottom">
          {/* Top Tier: Segmented Status Control Tabs */}
          <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between pb-3 border-bottom" style={{ gap: '12px' }}>
            <div
              className="d-inline-flex align-items-center p-1 border"
              style={{
                borderRadius: '10px',
                backgroundColor: '#f1f5f9',
                borderColor: '#e2e8f0',
                overflowX: 'auto',
                maxWidth: '100%',
                gap: '2px',
              }}
            >
              {[
                { id: 'today', label: "Today's", icon: 'fa-calendar-check', badge: summary.today },
                { id: 'upcoming', label: 'Upcoming', icon: 'fa-calendar-alt', badge: summary.upcoming },
                { id: 'cancelled', label: 'Cancelled', icon: 'fa-times-circle', badge: summary.cancelled },
                { id: 'all', label: 'All Records', icon: 'fa-list-ul', badge: summary.total },
              ].map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className="btn btn-sm d-inline-flex align-items-center"
                    style={{
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      fontWeight: isActive ? '600' : '500',
                      backgroundColor: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? '#0f172a' : '#64748b',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease-in-out',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setActiveFilter(tab.id);
                      setSelectedDate('');
                    }}
                  >
                    <i
                      className={`fas ${tab.icon} mr-1`}
                      style={{
                        color: isActive ? '#2563eb' : '#94a3b8',
                        fontSize: '0.78rem',
                      }}
                    ></i>
                    <span className="mr-1">{tab.label}</span>
                    <span
                      className="badge ml-1 font-weight-bold"
                      style={{
                        borderRadius: '12px',
                        padding: '2px 7px',
                        fontSize: '0.72rem',
                        backgroundColor: isActive ? '#2563eb' : '#e2e8f0',
                        color: isActive ? '#ffffff' : '#475569',
                      }}
                    >
                      {tab.badge ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Record Counter & Active Filter Badge */}
            <div className="d-flex align-items-center text-muted small">
              <span className="badge badge-light border text-secondary px-2 py-1 mr-2 font-weight-normal">
                <i className="fas fa-info-circle text-primary mr-1"></i>
                {activeFilter === 'today' ? "Showing today's schedule" : `Status: ${activeFilter}`}
              </span>
              <span>
                <strong className="text-dark">{appointments.length}</strong> record{appointments.length !== 1 ? 's' : ''} found
              </span>
            </div>
          </div>

          {/* Lower Tier: Search, Date Filter & Action Toolbar */}
          <div className="d-flex flex-wrap align-items-center justify-content-between pt-3" style={{ gap: '10px' }}>
            <div className="d-flex align-items-center flex-wrap flex-grow-1" style={{ gap: '10px', maxWidth: '780px' }}>
              {/* Search Input with Integrated Icon */}
              <div className="position-relative flex-grow-1" style={{ minWidth: '220px', maxWidth: '360px' }}>
                <i
                  className="fas fa-search text-muted position-absolute"
                  style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.82rem' }}
                ></i>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search by patient, MRN, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    height: '36px',
                    borderRadius: '8px',
                    paddingLeft: '34px',
                    paddingRight: searchQuery ? '32px' : '12px',
                    fontSize: '0.84rem',
                    borderColor: '#cbd5e1',
                    boxShadow: 'none',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="btn btn-link p-0 position-absolute text-muted"
                    style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', textDecoration: 'none' }}
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    <i className="fas fa-times-circle text-secondary"></i>
                  </button>
                )}
              </div>

              {/* Date Filter Input */}
              <div className="d-flex align-items-center" style={{ minWidth: '190px' }}>
                <div className="input-group input-group-sm" style={{ height: '36px' }}>
                  <div className="input-group-prepend">
                    <span
                      className="input-group-text bg-white text-muted border-right-0"
                      style={{ borderRadius: '8px 0 0 8px', borderColor: '#cbd5e1' }}
                    >
                      <i className="fas fa-calendar-day fa-xs"></i>
                    </span>
                  </div>
                  <input
                    type="date"
                    className="form-control form-control-sm border-left-0"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      height: '36px',
                      borderRadius: selectedDate ? '0' : '0 8px 8px 0',
                      borderColor: '#cbd5e1',
                      fontSize: '0.84rem',
                    }}
                    title="Filter by appointment date"
                  />
                  {selectedDate && (
                    <div className="input-group-append">
                      <button
                        type="button"
                        className="btn btn-outline-secondary border"
                        style={{ borderRadius: '0 8px 8px 0', borderColor: '#cbd5e1' }}
                        onClick={() => setSelectedDate('')}
                        title="Clear date filter"
                      >
                        <i className="fas fa-times fa-xs text-danger"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Reset Filters Shortcut */}
              {(searchQuery || selectedDate) && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger font-weight-bold p-0 d-inline-flex align-items-center"
                  style={{ fontSize: '0.80rem', textDecoration: 'none' }}
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDate('');
                  }}
                  title="Reset all search filters"
                >
                  <i className="fas fa-undo-alt mr-1"></i> Reset Filters
                </button>
              )}
            </div>

            {/* Right Action: Refresh Button */}
            <div className="d-flex align-items-center" style={{ gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-white border shadow-sm font-weight-bold d-inline-flex align-items-center"
                style={{
                  height: '36px',
                  borderRadius: '8px',
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  fontSize: '0.82rem',
                  padding: '0 12px',
                  backgroundColor: '#ffffff',
                }}
                onClick={loadAppointments}
                disabled={loading}
                title="Refresh appointments"
              >
                <i className={`fas fa-sync-alt mr-1.5 ${loading ? 'fa-spin text-primary' : 'text-secondary'}`}></i>
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card Body & Table */}
        <div className="card-body p-0">
          <div className="table-responsive" style={{ overflow: 'visible', minHeight: '340px' }}>
            <table className="table table-hover table-bordered mb-0" width="100%" cellSpacing="0">
              <thead className="thead-light">
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Patient Name & MRN</th>
                  <th>Clinic / Purpose</th>
                  <th>Visit Type</th>
                  <th>Appointment Date & Time</th>
                  <th>Status</th>
                  <th style={{ width: '160px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Loading appointments...</span>
                      </div>
                      <div className="mt-2 text-muted small">Loading appointment records...</div>
                    </td>
                  </tr>
                ) : appointments.length > 0 ? (
                  appointments.map((appt, idx) => {
                    const isCompleted = appt.completed === 1;
                    const isCancelled = appt.completed === 2;
                    const isExpired = appt.is_expired;
                    const isTodayAppt = appt.is_today;

                    let statusBadge = (
                      <span className="badge badge-primary px-2 py-1">
                        <i className="fas fa-calendar-check mr-1"></i> Scheduled
                      </span>
                    );
                    if (isCompleted) {
                      statusBadge = (
                        <span className="badge badge-success px-2 py-1">
                          <i className="fas fa-check-circle mr-1"></i> Completed
                        </span>
                      );
                    } else if (isCancelled) {
                      statusBadge = (
                        <span className="badge badge-warning text-dark px-2 py-1">
                          <i className="fas fa-ban mr-1"></i> Cancelled
                        </span>
                      );
                    } else if (isTodayAppt) {
                      statusBadge = (
                        <span className="badge badge-info px-2 py-1">
                          <i className="fas fa-bell mr-1"></i> Today's Visit
                        </span>
                      );
                    } else if (isExpired) {
                      statusBadge = (
                        <span className="badge badge-danger px-2 py-1">
                          <i className="fas fa-times-circle mr-1"></i> Expired
                        </span>
                      );
                    }

                    return (
                      <tr key={appt.id} className={isCancelled ? 'bg-light text-muted' : ''}>
                        <td className="align-middle text-center small text-muted">{idx + 1}</td>

                        {/* Patient info */}
                        <td
                          className="align-middle"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handlePatientClick(appt)}
                          title="Click to view full patient details"
                        >
                          <div className="font-weight-bold text-primary d-flex align-items-center">
                            <span style={{ textDecoration: 'underline' }}>{appt.patient_name || 'N/A'}</span>
                            <i className="fas fa-id-card fa-xs text-primary ml-1 opacity-75" title="View details"></i>
                          </div>
                          <div className="small text-muted d-flex align-items-center flex-wrap mt-1">
                            <span className="badge badge-danger mr-1">{appt.hospital_number || 'No MRN'}</span>
                            {appt.patient_gender && <span className="mr-1">{appt.patient_gender}</span>}
                            {appt.patient_age && <span className="mr-1">({appt.patient_age}y)</span>}
                            {appt.patient_phone && (
                              <span className="text-muted">
                                <i className="fas fa-phone-alt fa-xs mr-1 text-primary"></i>{appt.patient_phone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Purpose */}
                        <td className="align-middle">
                          <div className="font-weight-bold text-gray-800 small">{appt.purpose || 'General Consultation'}</div>
                          {appt.comment && (
                            <div className="small text-muted font-italic text-truncate" style={{ maxWidth: '220px' }}>
                              "{appt.comment}"
                            </div>
                          )}
                        </td>

                        {/* Visit Type */}
                        <td className="align-middle">
                          <span className="badge badge-light border text-dark">
                            {appt.visit_type || 'New-case'}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="align-middle text-nowrap">
                          <div className="font-weight-bold small text-gray-900">
                            <i className="fas fa-calendar-day text-primary mr-1"></i>
                            {appt.arrival_date || '-'}
                          </div>
                          <div className="small text-muted">
                            <i className="fas fa-clock text-info mr-1"></i>
                            {appt.arrival_time ? appt.arrival_time.substring(0, 5) : '-'}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="align-middle text-nowrap position-relative">
                          <div className="d-flex flex-column align-items-start" style={{ gap: '3px' }}>
                            {statusBadge}
                            <VitalsBadgeWithPopover
                              vitals={appt.today_vitals}
                              onOpenVitals={() => handleOpenVitals(appt)}
                            />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="align-middle text-nowrap position-relative" onClick={(e) => e.stopPropagation()}>
                          <div className="position-relative d-inline-block">
                            {/* "Click to show" Professional Trigger Button */}
                            <button
                              type="button"
                              className="btn btn-sm d-inline-flex align-items-center shadow-sm"
                              style={{
                                backgroundColor: openDropdownId === appt.id ? '#eff6ff' : '#ffffff',
                                borderColor: openDropdownId === appt.id ? '#3b82f6' : '#cbd5e1',
                                color: openDropdownId === appt.id ? '#1d4ed8' : '#1e293b',
                                fontSize: '0.80rem',
                                fontWeight: '600',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                boxShadow: openDropdownId === appt.id
                                  ? '0 0 0 3px rgba(59, 130, 246, 0.18)'
                                  : '0 1px 2px rgba(0, 0, 0, 0.05)',
                                transition: 'all 0.16s ease-in-out',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                if (openDropdownId !== appt.id) {
                                  e.currentTarget.style.backgroundColor = '#f8fafc';
                                  e.currentTarget.style.borderColor = '#94a3b8';
                                  e.currentTarget.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.08)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (openDropdownId !== appt.id) {
                                  e.currentTarget.style.backgroundColor = '#ffffff';
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (openDropdownId === appt.id) {
                                  setOpenDropdownId(null);
                                } else {
                                  setOpenDropdownId(appt.id);
                                  setActiveSubmenu('encounter');
                                }
                              }}
                              title="Click to show clinical actions menu"
                            >
                              <span
                                className="d-inline-flex align-items-center justify-content-center mr-2"
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '5px',
                                  backgroundColor: openDropdownId === appt.id ? 'rgba(37, 99, 235, 0.15)' : '#f1f5f9',
                                  color: openDropdownId === appt.id ? '#2563eb' : '#475569',
                                  fontSize: '0.75rem',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <i className="fas fa-clinic-medical"></i>
                              </span>
                              <span style={{ fontWeight: '600', letterSpacing: '0.2px' }}>Click to show</span>
                              <i
                                className="fas fa-chevron-down ml-2"
                                style={{
                                  fontSize: '0.68rem',
                                  color: openDropdownId === appt.id ? '#2563eb' : '#94a3b8',
                                  transition: 'transform 0.2s ease',
                                  transform: openDropdownId === appt.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                }}
                              ></i>
                            </button>

                            {/* Multi-tier Dropdown Menu */}
                            {openDropdownId === appt.id && (
                              <div
                                ref={dropdownRef}
                                className="position-absolute bg-white border"
                                style={{
                                  top: '100%',
                                  right: 0,
                                  marginTop: '5px',
                                  width: '220px',
                                  zIndex: 1060,
                                  borderRadius: '8px',
                                  overflow: 'visible',
                                  padding: '6px 0',
                                  borderColor: '#e2e8f0',
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                                  textAlign: 'left',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* 1. Out-patient Encounter */}
                                <div
                                  className="d-flex align-items-center justify-content-between px-3 py-2 mx-1 rounded"
                                  style={{
                                    cursor: 'pointer',
                                    backgroundColor: activeSubmenu === 'encounter' ? '#2563eb' : 'transparent',
                                    color: activeSubmenu === 'encounter' ? '#ffffff' : '#1e293b',
                                    fontWeight: activeSubmenu === 'encounter' ? '600' : '500',
                                    fontSize: '0.84rem',
                                    transition: 'all 0.12s ease',
                                  }}
                                  onMouseEnter={() => setActiveSubmenu('encounter')}
                                  onClick={() => setActiveSubmenu('encounter')}
                                >
                                  <div className="d-flex align-items-center">
                                    <i
                                      className={`fas fa-user-md mr-2 ${activeSubmenu === 'encounter' ? 'text-white' : 'text-primary'}`}
                                      style={{ width: '16px' }}
                                    ></i>
                                    <span>Out-patient Encounter</span>
                                  </div>
                                  <i
                                    className="fas fa-chevron-right ml-2"
                                    style={{
                                      fontSize: '0.70rem',
                                      color: activeSubmenu === 'encounter' ? '#ffffff' : '#94a3b8',
                                    }}
                                  ></i>
                                </div>

                                {/* 2. Requests */}
                                <div
                                  className="d-flex align-items-center justify-content-between px-3 py-2 mx-1 rounded"
                                  style={{
                                    cursor: 'pointer',
                                    backgroundColor: activeSubmenu === 'requests' ? '#2563eb' : 'transparent',
                                    color: activeSubmenu === 'requests' ? '#ffffff' : '#1e293b',
                                    fontWeight: activeSubmenu === 'requests' ? '600' : '500',
                                    fontSize: '0.84rem',
                                    transition: 'all 0.12s ease',
                                  }}
                                  onMouseEnter={() => setActiveSubmenu('requests')}
                                  onClick={() => setActiveSubmenu('requests')}
                                >
                                  <div className="d-flex align-items-center">
                                    <i
                                      className={`fas fa-notes-medical mr-2 ${activeSubmenu === 'requests' ? 'text-white' : 'text-info'}`}
                                      style={{ width: '16px' }}
                                    ></i>
                                    <span>Requests</span>
                                  </div>
                                  <i
                                    className="fas fa-chevron-right ml-2"
                                    style={{
                                      fontSize: '0.70rem',
                                      color: activeSubmenu === 'requests' ? '#ffffff' : '#94a3b8',
                                    }}
                                  ></i>
                                </div>

                                {/* 3. Billing */}
                                <div
                                  className="d-flex align-items-center justify-content-between px-3 py-2 mx-1 rounded"
                                  style={{
                                    cursor: 'pointer',
                                    backgroundColor: activeSubmenu === 'billing' ? '#2563eb' : 'transparent',
                                    color: activeSubmenu === 'billing' ? '#ffffff' : '#1e293b',
                                    fontWeight: activeSubmenu === 'billing' ? '600' : '500',
                                    fontSize: '0.84rem',
                                    transition: 'all 0.12s ease',
                                  }}
                                  onMouseEnter={() => setActiveSubmenu('billing')}
                                  onClick={() => setActiveSubmenu('billing')}
                                >
                                  <div className="d-flex align-items-center">
                                    <i
                                      className={`fas fa-file-invoice-dollar mr-2 ${activeSubmenu === 'billing' ? 'text-white' : 'text-success'}`}
                                      style={{ width: '16px' }}
                                    ></i>
                                    <span>Billing</span>
                                  </div>
                                  <i
                                    className="fas fa-chevron-right ml-2"
                                    style={{
                                      fontSize: '0.70rem',
                                      color: activeSubmenu === 'billing' ? '#ffffff' : '#94a3b8',
                                    }}
                                  ></i>
                                </div>

                                {/* 4. Admin */}
                                <div
                                  className="d-flex align-items-center justify-content-between px-3 py-2 mx-1 rounded"
                                  style={{
                                    cursor: 'pointer',
                                    backgroundColor: activeSubmenu === 'admin' ? '#2563eb' : 'transparent',
                                    color: activeSubmenu === 'admin' ? '#ffffff' : '#1e293b',
                                    fontWeight: activeSubmenu === 'admin' ? '600' : '500',
                                    fontSize: '0.84rem',
                                    transition: 'all 0.12s ease',
                                  }}
                                  onMouseEnter={() => setActiveSubmenu('admin')}
                                  onClick={() => setActiveSubmenu('admin')}
                                >
                                  <div className="d-flex align-items-center">
                                    <i
                                      className={`fas fa-sliders-h mr-2 ${activeSubmenu === 'admin' ? 'text-white' : 'text-secondary'}`}
                                      style={{ width: '16px' }}
                                    ></i>
                                    <span>Admin</span>
                                  </div>
                                  <i
                                    className="fas fa-chevron-right ml-2"
                                    style={{
                                      fontSize: '0.70rem',
                                      color: activeSubmenu === 'admin' ? '#ffffff' : '#94a3b8',
                                    }}
                                  ></i>
                                </div>

                                {/* ================== FLYOUT SUBMENUS ================== */}

                                {/* Submenu 1: Out-patient Encounter */}
                                {activeSubmenu === 'encounter' && (
                                  <div
                                    className="position-absolute bg-white border"
                                    style={{
                                      top: 0,
                                      right: '100%',
                                      marginRight: '4px',
                                      width: '245px',
                                      zIndex: 1070,
                                      borderRadius: '8px',
                                      padding: '6px 0',
                                      borderColor: '#e2e8f0',
                                      boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.16)',
                                      textAlign: 'left',
                                    }}
                                    onMouseEnter={() => setActiveSubmenu('encounter')}
                                  >
                                    {renderSubmenuItem('Review Vitals & Histories', null, () => handleOpenVitals(appt))}
                                    {renderSubmenuItem('Begin Encounter', <i className="fas fa-stethoscope text-primary mr-2"></i>, () => handleBeginEncounter(appt))}
                                    {renderDivider()}
                                    {renderSubmenuItem('Immunization Encounter', null, () => handleImmunizationEncounter(appt))}
                                    {renderDivider()}
                                    {renderSubmenuItem('Admit to ward', <i className="fas fa-bed text-dark mr-2"></i>, () => handleWardAdmission(appt))}
                                    {renderDivider()}
                                    {renderSubmenuItem('Out-Patient Notes', <i className="fas fa-hospital-alt text-secondary mr-2"></i>, () => handleOpenCaseNote(appt))}
                                    {renderSubmenuItem('Add Drugs to chart', <i className="fas fa-edit text-secondary mr-2"></i>, () => {
                                      if (onNavigate) onNavigate('pharmacy');
                                      showToast(`Opening Drug Chart for ${appt.patient_name}`, 'info');
                                    })}
                                    {renderSubmenuItem('Out-patient Drug chart', <i className="fas fa-hospital-alt text-secondary mr-2"></i>, () => {
                                      if (onNavigate) onNavigate('pharmacy');
                                      showToast(`Opening Drug Chart for ${appt.patient_name}`, 'info');
                                    })}
                                  </div>
                                )}

                                {/* Submenu 2: Requests */}
                                {activeSubmenu === 'requests' && (
                                  <div
                                    className="position-absolute bg-white border"
                                    style={{
                                      top: '38px',
                                      right: '100%',
                                      marginRight: '4px',
                                      width: '245px',
                                      zIndex: 1070,
                                      borderRadius: '8px',
                                      padding: '6px 0',
                                      borderColor: '#e2e8f0',
                                      boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.16)',
                                      textAlign: 'left',
                                    }}
                                    onMouseEnter={() => setActiveSubmenu('requests')}
                                  >
                                    {renderSubmenuItem('Refill Medications', null, () => {
                                      if (onNavigate) onNavigate('pharmacy');
                                      showToast(`Refill Medications for ${appt.patient_name}`, 'info');
                                    })}
                                    {renderSubmenuItem('Write Prescription', null, () => {
                                      if (onNavigate) onNavigate('pharmacy');
                                      showToast(`Prescription request for ${appt.patient_name}`, 'info');
                                    })}
                                    {renderSubmenuItem('Prescribe OTC', null, () => {
                                      if (onNavigate) onNavigate('pharmacy');
                                      showToast(`OTC request for ${appt.patient_name}`, 'info');
                                    })}
                                    {renderSubmenuItem('Request Lab Test', null, () => {
                                      if (onNavigate) onNavigate('radiology');
                                      showToast(`Lab test requested for ${appt.patient_name}`, 'info');
                                    })}
                                    {renderSubmenuItem('Request Imaging', null, () => {
                                      if (onNavigate) onNavigate('radiology');
                                      showToast(`Imaging requested for ${appt.patient_name}`, 'info');
                                    })}
                                    {renderSubmenuItem('Request Others', null, () => {
                                      showToast(`Clinical request recorded for ${appt.patient_name}`, 'info');
                                    })}
                                    {renderSubmenuItem('Request Service/Procedure', null, () => {
                                      showToast(`Service / Procedure request placed for ${appt.patient_name}`, 'info');
                                    })}
                                  </div>
                                )}

                                {/* Submenu 3: Billing */}
                                {activeSubmenu === 'billing' && (
                                  <div
                                    className="position-absolute bg-white border"
                                    style={{
                                      top: '76px',
                                      right: '100%',
                                      marginRight: '4px',
                                      width: '245px',
                                      zIndex: 1070,
                                      borderRadius: '8px',
                                      padding: '6px 0',
                                      borderColor: '#e2e8f0',
                                      boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.16)',
                                      textAlign: 'left',
                                    }}
                                    onMouseEnter={() => setActiveSubmenu('billing')}
                                  >
                                    {renderSubmenuItem('Patient Invoices & Bills', <i className="fas fa-file-invoice-dollar text-primary mr-2"></i>, () => {
                                      if (onNavigate) onNavigate('billings');
                                      showToast(`Viewing invoices for ${appt.patient_name}`, 'info');
                                    })}
                                    {renderSubmenuItem('Create New Invoice', <i className="fas fa-receipt text-info mr-2"></i>, () => {
                                      if (onNavigate) onNavigate('billings');
                                      showToast(`Create invoice for ${appt.patient_name}`, 'info');
                                    })}
                                    {renderSubmenuItem('Record Payment / Receipt', <i className="fas fa-cash-register text-success mr-2"></i>, () => {
                                      if (onNavigate) onNavigate('billings');
                                      showToast(`Record payment for ${appt.patient_name}`, 'info');
                                    })}
                                    {renderSubmenuItem('Add Patient Deposit', <i className="fas fa-wallet text-warning mr-2"></i>, () => {
                                      if (onNavigate) onNavigate('billings');
                                      showToast(`Add deposit for ${appt.patient_name}`, 'info');
                                    })}
                                    {renderSubmenuItem('Patient Statement', <i className="fas fa-file-alt text-secondary mr-2"></i>, () => {
                                      if (onNavigate) onNavigate('billings');
                                      showToast(`Statement for ${appt.patient_name}`, 'info');
                                    })}
                                  </div>
                                )}

                                {/* Submenu 4: Admin */}
                                {activeSubmenu === 'admin' && (
                                  <div
                                    className="position-absolute bg-white border"
                                    style={{
                                      top: '114px',
                                      right: '100%',
                                      marginRight: '4px',
                                      width: '245px',
                                      zIndex: 1070,
                                      borderRadius: '8px',
                                      padding: '6px 0',
                                      borderColor: '#e2e8f0',
                                      boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.16)',
                                      textAlign: 'left',
                                    }}
                                    onMouseEnter={() => setActiveSubmenu('admin')}
                                  >
                                    {renderSubmenuItem('View Case Note', <i className="fas fa-notes-medical text-info mr-2"></i>, () => handleOpenCaseNote(appt))}
                                    {renderSubmenuItem('Patient Profile Details', <i className="fas fa-user-circle text-primary mr-2"></i>, () => handlePatientClick(appt))}
                                    {renderSubmenuItem('Queue for Nursing Vitals', <i className="fas fa-heartbeat text-success mr-2"></i>, () => handleOpenVitals(appt))}
                                    {renderSubmenuItem('Admit / Queue Doctor', <i className="fas fa-user-md text-info mr-2"></i>, () => handleQueueFromAppointment(appt))}
                                    {!isCompleted && !isCancelled && renderSubmenuItem('Mark Completed', <i className="fas fa-check text-success mr-2"></i>, () => handleCompleteAppointment(appt))}
                                    {renderSubmenuItem('Reschedule Appointment', <i className="fas fa-calendar-alt text-warning mr-2"></i>, () => handleReschedule(appt))}
                                    {renderDivider()}
                                    {!isCompleted && !isCancelled && renderSubmenuItem('Cancel Appointment', <i className="fas fa-times text-danger mr-2"></i>, () => handleCancelAppointment(appt), true)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="fas fa-calendar-times fa-3x text-gray-300 mb-3 d-block"></i>
                      <div className="font-weight-bold">No appointments found matching this filter</div>
                      <div className="small mt-1">
                        Use "Schedule New Appointment" to book patient appointments or change the filter criteria.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Patient Picker Modal for Scheduling a New Appointment */}
      {showPatientPicker && (
        <>
          <div className="modal-backdrop-custom" onClick={() => setShowPatientPicker(false)}></div>
          <div className="card shadow modal-custom" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="card-header py-3 bg-gradient-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="m-0 font-weight-bold text-white">
                <i className="fas fa-user-search mr-2"></i> Select Patient for Appointment
              </h5>
              <button
                type="button"
                className="close text-white"
                onClick={() => setShowPatientPicker(false)}
              >
                <span>&times;</span>
              </button>
            </div>
            <div className="card-body">
              <div className="form-group mb-3">
                <label className="font-weight-bold small text-gray-800">
                  Search Patient by Name, Phone Number, or Hospital MRN:
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Type at least 2 characters (e.g. John, 08012..., ISL-1024)..."
                    value={patientSearchQuery}
                    onChange={(e) => handleSearchPatients(e.target.value)}
                    autoFocus
                  />
                  <div className="input-group-append">
                    <span className="input-group-text bg-light">
                      <i className={`fas ${searchingPatients ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
                    </span>
                  </div>
                </div>
              </div>

              {/* Search Results List */}
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {patientSearchResults.length > 0 ? (
                  <div className="list-group">
                    {patientSearchResults.map((pat) => (
                      <button
                        key={pat.id}
                        type="button"
                        className="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3"
                        onClick={() => handleSelectPatientForBooking(pat)}
                      >
                        <div className="d-flex align-items-center">
                          <div
                            className="rounded-circle bg-primary text-white font-weight-bold d-flex align-items-center justify-content-center mr-3"
                            style={{ width: '40px', height: '40px' }}
                          >
                            {pat.first_name ? pat.first_name.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <div>
                            <div className="font-weight-bold text-gray-900">
                              {pat.full_name || `${pat.surname} ${pat.first_name}`}
                            </div>
                            <div className="small text-muted">
                              <span className="badge badge-danger mr-1">MRN: {pat.hospital_number}</span>
                              <span className="mr-1">{pat.gender}</span>
                              {pat.phone_number && <span>&bull; {pat.phone_number}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="btn btn-sm btn-primary font-weight-bold">
                          Select <i className="fas fa-arrow-right ml-1"></i>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : patientSearchQuery.length >= 2 && !searchingPatients ? (
                  <div className="text-center py-4 text-muted">
                    <i className="fas fa-user-times fa-2x text-gray-300 mb-2 d-block"></i>
                    No registered patients found matching "{patientSearchQuery}".
                    {onOpenNewPatient && (
                      <div className="mt-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => {
                            setShowPatientPicker(false);
                            onOpenNewPatient();
                          }}
                        >
                          <i className="fas fa-user-plus mr-1"></i> Register New Patient Now
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted small">
                    <i className="fas fa-keyboard fa-2x text-gray-300 mb-2 d-block"></i>
                    Start typing to search existing patient records.
                  </div>
                )}
              </div>
            </div>
            <div className="card-footer bg-light text-right">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowPatientPicker(false)}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Schedule Appointment Modal */}
      <ScheduleAppointmentModal
        isOpen={isScheduleModalOpen}
        patient={selectedPatientForSchedule}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setSelectedPatientForSchedule(null);
        }}
        onAppointmentScheduled={() => {
          loadAppointments();
        }}
      />

      {/* Vitals Recording Modal */}
      {isVitalsModalOpen && selectedPatientForVitals && (
        <VitalsModal
          isOpen={isVitalsModalOpen}
          patient={selectedPatientForVitals}
          onClose={() => {
            setIsVitalsModalOpen(false);
            setSelectedPatientForVitals(null);
          }}
          onVitalsSaved={() => {
            loadAppointments();
          }}
        />
      )}

      {/* Direct Patient Details Modal Fallback */}
      {selectedPatientForDetail && (
        <PatientDetailModal
          patient={selectedPatientForDetail}
          onClose={() => setSelectedPatientForDetail(null)}
          onQueueUpdated={loadAppointments}
          onScheduleAppointment={() => {
            setSelectedPatientForSchedule(selectedPatientForDetail);
            setSelectedPatientForDetail(null);
            setIsScheduleModalOpen(true);
          }}
        />
      )}

      {/* Clinical Case Note Modal */}
      {isCaseNoteOpen && selectedPatientForCaseNote && (
        <CaseNoteModal
          isOpen={isCaseNoteOpen}
          patient={selectedPatientForCaseNote}
          onClose={() => {
            setIsCaseNoteOpen(false);
            setSelectedPatientForCaseNote(null);
          }}
        />
      )}

      {/* Doctor Consultation Encounter Modal */}
      {isConsultationModalOpen && selectedPatientForConsultation && (
        <DoctorConsultationModal
          isOpen={isConsultationModalOpen}
          patient={selectedPatientForConsultation}
          appointment={selectedAppointmentForConsultation}
          onClose={() => {
            setIsConsultationModalOpen(false);
            setSelectedPatientForConsultation(null);
            setSelectedAppointmentForConsultation(null);
          }}
          onConsultationFinished={() => {
            loadAppointments();
          }}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
