import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ScheduleAppointmentModal from './ScheduleAppointmentModal';
import CaseNoteModal from './CaseNoteModal';
import { showToast } from './Toast';

export default function PatientDetailModal({ patient, onClose, onQueueUpdated, onEdit, onScheduleAppointment }) {
  const [currentPatient, setCurrentPatient] = useState(patient);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCaseNoteOpen, setIsCaseNoteOpen] = useState(false);

  useEffect(() => {
    setCurrentPatient(patient);
    const patId = patient?.id || patient?.patient_id || patient?.patient;
    if (patId && (typeof patId === 'number' || !isNaN(Number(patId)))) {
      setLoadingDetails(true);
      api.getPatient(Number(patId))
        .then((data) => {
          if (data) {
            setCurrentPatient((prev) => ({ ...prev, ...data }));
          }
        })
        .catch((err) => {
          console.warn('Failed to load full patient details:', err);
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    }
  }, [patient?.id, patient?.patient_id, patient?.patient]);

  if (!patient) return null;

  const displayPatient = currentPatient || patient;

  return (
    <>
      <div className="modal-backdrop-custom" onClick={onClose}></div>
      <div
        className="card shadow-lg modal-custom"
        style={{
          maxWidth: '850px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '10px',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Modal Header */}
        <div className="card-header py-3 bg-gradient-primary text-white d-flex justify-content-between align-items-center flex-shrink-0">
          <div className="d-flex align-items-center">
            <i className="fas fa-id-card-alt mr-2 fa-lg text-white-50"></i>
            <div>
              <span className="font-weight-bold text-white h6 mb-0 mr-2">Patient Details</span>
              <span className="badge badge-light text-primary font-weight-bold px-2 py-1 shadow-sm" style={{ letterSpacing: '0.5px' }}>
                {displayPatient.hospital_number || 'N/A'}
              </span>
              {loadingDetails && (
                <span className="badge badge-light text-primary ml-2 px-2 py-1 small font-weight-normal">
                  <i className="fas fa-spinner fa-spin mr-1"></i> Refreshing...
                </span>
              )}
            </div>
          </div>
          <div className="d-flex align-items-center">
            <button
              type="button"
              className="btn btn-sm btn-light text-success font-weight-bold px-3 py-1 mr-2 shadow-sm"
              onClick={() => setIsCaseNoteOpen(true)}
              title="View Patient Clinical Case Note"
            >
              <i className="fas fa-file-medical-alt mr-1"></i> Case Note
            </button>
            {onEdit && (
              <button
                type="button"
                className="btn btn-sm btn-light text-primary font-weight-bold px-3 py-1 mr-2 shadow-sm"
                onClick={() => onEdit(displayPatient)}
                title="Edit Patient Information"
              >
                <i className="fas fa-edit mr-1"></i> Edit
              </button>
            )}
            <button
              type="button"
              className="close text-white ml-2"
              onClick={onClose}
              aria-label="Close"
              style={{ opacity: 0.9, fontSize: '1.4rem' }}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        </div>

        {/* Modal Body with internal scrolling */}
        <div className="card-body p-4" style={{ overflowY: 'auto' }}>
          {errorMessage && (
            <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3 shadow-sm border-0" role="alert">
              <i className="fas fa-exclamation-triangle fa-lg text-danger mr-2"></i>
              <div className="flex-grow-1">
                <strong className="d-block">Could not add to queue</strong>
                <div className="small">{errorMessage}</div>
              </div>
              <button type="button" className="close ml-2" onClick={() => setErrorMessage(null)}>
                <span>&times;</span>
              </button>
            </div>
          )}

          {/* Patient Overview Card */}
          <div className="d-flex align-items-center mb-4 p-3 rounded shadow-sm" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <img
              src="/admin-img/undraw_profile.svg"
              alt="Avatar"
              className="rounded-circle mr-3 border border-primary p-1 bg-white shadow-sm flex-shrink-0"
              style={{ width: '64px', height: '64px' }}
            />
            <div className="flex-grow-1">
              <h4 className="mb-1 font-weight-bold text-gray-900">
                {(displayPatient.surname ? `${displayPatient.surname} ${displayPatient.first_name || ''} ${displayPatient.other_name || ''}`.trim() : null) || displayPatient.patient_name || 'Patient'}
              </h4>
              <div className="d-flex flex-wrap align-items-center text-muted small mt-1">
                <span className="badge badge-primary mr-2 mb-1 px-2 py-1 shadow-sm font-weight-bold">
                  {displayPatient.category_name || 'Standard'}
                </span>
                <span className="badge badge-info mr-2 mb-1 px-2 py-1 shadow-sm font-weight-bold">
                  {displayPatient.plan_name || 'General Plan'}
                </span>
                {displayPatient.sponsor_name && (
                  <span className="badge badge-warning text-dark mr-2 mb-1 px-2 py-1 shadow-sm font-weight-bold">
                    <i className="fas fa-shield-alt mr-1"></i> {displayPatient.sponsor_name}
                  </span>
                )}
                <span className="mb-1">
                  Hospital No: <strong className="text-danger font-weight-bold">{displayPatient.hospital_number || 'N/A'}</strong>
                </span>
                {displayPatient.family_number && (
                  <span className="mb-1">
                    Family: <span className="badge badge-warning text-dark font-weight-bold px-2 py-0.5">
                      <i className={`fas fa-${displayPatient.family_folder_type === 'hmo_group' ? 'users' : 'folder'} mr-1`}></i>
                      {displayPatient.family_name} ({displayPatient.family_number})
                      {displayPatient.family_member_suffix ? ` &bull; Code ${displayPatient.family_member_suffix}` : ''}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details 2-Column Grid */}
          <div className="row mb-3">
            <div className="col-md-6 mb-3 mb-md-0">
              <div className="card border-left-info shadow-sm h-100">
                <div className="card-body py-3 px-3">
                  <h6 className="font-weight-bold text-info mb-3 small text-uppercase d-flex align-items-center">
                    <i className="fas fa-user mr-2"></i> Personal Details
                  </h6>
                  <p className="mb-2 small d-flex justify-content-between">
                    <span className="text-muted">Gender:</span>
                    <strong className="text-gray-800">{displayPatient.gender || '-'}</strong>
                  </p>
                  <p className="mb-2 small d-flex justify-content-between">
                    <span className="text-muted">Age:</span>
                    <strong className="text-gray-800">{displayPatient.age ? `${displayPatient.age} years` : '-'}</strong>
                  </p>
                  <p className="mb-2 small d-flex justify-content-between">
                    <span className="text-muted">Date of Birth:</span>
                    <strong className="text-gray-800">{displayPatient.dob || '-'}</strong>
                  </p>
                  <p className="mb-0 small d-flex justify-content-between">
                    <span className="text-muted">Marital Status:</span>
                    <strong className="text-gray-800">{displayPatient.patient_type || 'Single'}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card border-left-success shadow-sm h-100">
                <div className="card-body py-3 px-3">
                  <h6 className="font-weight-bold text-success mb-3 small text-uppercase d-flex align-items-center">
                    <i className="fas fa-address-book mr-2"></i> Contact & Next of Kin
                  </h6>
                  <p className="mb-2 small d-flex justify-content-between">
                    <span className="text-muted">Phone:</span>
                    <strong className="text-gray-800">{displayPatient.phone_number || '-'}</strong>
                  </p>
                  <p className="mb-2 small d-flex justify-content-between">
                    <span className="text-muted">Email:</span>
                    <strong className="text-gray-800">{displayPatient.email_address || 'None provided'}</strong>
                  </p>
                  <p className="mb-2 small d-flex justify-content-between">
                    <span className="text-muted">Next of Kin:</span>
                    <strong className="text-gray-800">{displayPatient.next_of_kin_name || displayPatient.full_name || '-'}</strong>
                  </p>
                  <p className="mb-2 small d-flex justify-content-between">
                    <span className="text-muted">Relationship:</span>
                    <strong className="text-gray-800">{displayPatient.next_of_kin_relationship || displayPatient.relationship_to_patient || '-'}</strong>
                  </p>
                  <p className="mb-2 small d-flex justify-content-between">
                    <span className="text-muted">Emergency Phone:</span>
                    <strong className="text-gray-800">{displayPatient.next_of_kin_phone || displayPatient.phone_numbers || '-'}</strong>
                  </p>
                  <p className="mb-0 small d-flex justify-content-between">
                    <span className="text-muted">Registered By:</span>
                    <strong className="text-gray-800">{displayPatient.created_by_name || 'Staff'}</strong>
                  </p>
                  {displayPatient.insurance_policy_number && (
                    <p className="mb-0 mt-2 small d-flex justify-content-between">
                      <span className="text-muted">Policy / ID:</span>
                      <span className="badge badge-light border text-dark font-mono px-2 py-0">
                        {displayPatient.insurance_policy_number}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Address & Clinical Flags */}
          <div className="card bg-light border shadow-sm p-3">
            <h6 className="font-weight-bold text-gray-800 small text-uppercase mb-2 d-flex align-items-center">
              <i className="fas fa-map-marker-alt text-danger mr-2"></i> Address & Clinical Flags
            </h6>
            <p className="small mb-2">
              <strong className="text-muted mr-1">Residential Address:</strong>
              <span className="text-gray-800">{displayPatient.address || 'No address specified'}</span>
            </p>
            <p className="small mb-0">
              <strong className="text-muted mr-1">Allergies:</strong>{' '}
              <span className={displayPatient.allergies ? 'badge badge-danger font-weight-bold px-2 py-1' : 'text-muted'}>
                {displayPatient.allergies || 'No known allergies reported'}
              </span>
            </p>
          </div>
        </div>

        {/* Modal Footer - Fixed at bottom, clean responsive buttons */}
        <div className="card-footer bg-light border-top py-3 px-4 d-flex flex-wrap justify-content-between align-items-center flex-shrink-0">
          <div className="d-flex flex-wrap align-items-center mb-2 mb-md-0">
            <button
              type="button"
              className="btn btn-sm btn-success mr-2 mb-1 shadow-sm font-weight-bold px-3 py-2"
              onClick={() => setIsCaseNoteOpen(true)}
              title="View full clinical case note"
            >
              <i className="fas fa-file-medical-alt mr-1"></i> View Case Note
            </button>
            <button
              type="button"
              className="btn btn-sm btn-info mr-2 mb-1 shadow-sm font-weight-bold px-3 py-2"
              onClick={() => {
                if (onScheduleAppointment) {
                  onScheduleAppointment(displayPatient);
                  onClose();
                } else {
                  setIsScheduleModalOpen(true);
                }
              }}
              title="Schedule an Appointment for this patient"
            >
              <i className="fas fa-calendar-plus mr-1"></i> Schedule Appointment
            </button>
            {onEdit && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary mb-1 shadow-sm px-3 py-2"
                onClick={() => onEdit(displayPatient)}
                title="Edit Patient Details"
              >
                <i className="fas fa-user-edit mr-1"></i> Edit Details
              </button>
            )}
          </div>
          <button type="button" className="btn btn-secondary btn-sm px-4 py-2 font-weight-bold shadow-sm mb-1" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Schedule Appointment Modal */}
      <ScheduleAppointmentModal
        isOpen={isScheduleModalOpen}
        patient={displayPatient}
        onClose={() => setIsScheduleModalOpen(false)}
        onAppointmentScheduled={() => {
          if (onQueueUpdated) onQueueUpdated();
        }}
      />

      {/* Patient Case Note Modal */}
      <CaseNoteModal
        isOpen={isCaseNoteOpen}
        patient={displayPatient}
        onClose={() => setIsCaseNoteOpen(false)}
      />
    </>
  );
}
