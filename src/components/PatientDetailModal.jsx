import React, { useState } from 'react';
import api from '../services/api';

export default function PatientDetailModal({ patient, onClose, onQueueUpdated }) {
  const [loadingQueue, setLoadingQueue] = useState(false);

  if (!patient) return null;

  const handleSendToVitals = async () => {
    try {
      setLoadingQueue(true);
      await api.createQueue({
        patient: patient.id,
        purpose: 'Vital Signs',
        visit_type: 'New-case',
      });
      alert(`Patient ${patient.full_name || patient.surname} queued for Nursing Vitals in database!`);
      if (onQueueUpdated) onQueueUpdated();
      onClose();
    } catch (err) {
      alert('Error sending to nursing vitals: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingQueue(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop-custom" onClick={onClose}></div>
      <div className="card shadow modal-custom" style={{ maxWidth: '750px' }}>
        <div className="card-header py-3 bg-gradient-primary text-white d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold">
            <i className="fas fa-id-card-alt mr-2"></i> Patient Information: {patient.hospital_number || 'N/A'}
          </h6>
          <button
            type="button"
            className="close text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="card-body">
          {/* Header section with avatar */}
          <div className="d-flex align-items-center mb-4 p-3 bg-light rounded">
            <img
              src="/admin-img/undraw_profile.svg"
              alt="Avatar"
              className="rounded-circle mr-3 border border-primary p-1 bg-white"
              style={{ width: '64px', height: '64px' }}
            />
            <div>
              <h4 className="mb-0 font-weight-bold text-gray-800">
                {patient.full_name || `${patient.surname} ${patient.first_name}`}
              </h4>
              <div className="text-muted small mt-1">
                <span className="badge badge-primary mr-2">{patient.category_name || 'Standard'}</span>
                <span className="badge badge-info mr-2">{patient.plan_name || 'General Plan'}</span>
                <span>Hospital No: <strong className="text-danger">{patient.hospital_number}</strong></span>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <div className="card border-left-info shadow-sm h-100">
                <div className="card-body py-2">
                  <h6 className="font-weight-bold text-info mb-2 small text-uppercase">Personal Details</h6>
                  <p className="mb-1 small"><strong>Gender:</strong> {patient.gender || '-'}</p>
                  <p className="mb-1 small"><strong>Age:</strong> {patient.age ? `${patient.age} years` : '-'}</p>
                  <p className="mb-1 small"><strong>Date of Birth:</strong> {patient.dob || '-'}</p>
                  <p className="mb-1 small"><strong>Marital Status:</strong> {patient.patient_type || 'Single'}</p>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <div className="card border-left-success shadow-sm h-100">
                <div className="card-body py-2">
                  <h6 className="font-weight-bold text-success mb-2 small text-uppercase">Contact & Next of Kin</h6>
                  <p className="mb-1 small"><strong>Phone:</strong> {patient.phone_number || '-'}</p>
                  <p className="mb-1 small"><strong>Email:</strong> {patient.email_address || 'None provided'}</p>
                  <p className="mb-1 small"><strong>Relationship:</strong> {patient.relationship_to_patient || '-'}</p>
                  <p className="mb-1 small"><strong>Registered By:</strong> {patient.created_by_name || 'Staff'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-light border-0 p-3 mb-2">
            <h6 className="font-weight-bold text-gray-800 small text-uppercase mb-2">Address & Clinical Flags</h6>
            <p className="small mb-1"><strong>Residential Address:</strong> {patient.address || 'No address specified'}</p>
            <p className="small mb-0">
              <strong>Allergies:</strong>{' '}
              <span className={patient.allergies ? 'text-danger font-weight-bold' : 'text-muted'}>
                {patient.allergies || 'No known allergies reported'}
              </span>
            </p>
          </div>
        </div>

        <div className="card-footer bg-white d-flex justify-content-between">
          <div>
            <button
              className="btn btn-sm btn-outline-danger"
              disabled={loadingQueue}
              onClick={handleSendToVitals}
            >
              <i className={`fas ${loadingQueue ? 'fa-spinner fa-spin' : 'fa-heartbeat'} mr-1`}></i> Send to Nursing Vitals
            </button>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}
