import React, { useState } from 'react';
import api from '../services/api';
import { showToast } from './Toast';

export default function PatientList({
  patients,
  totalCount,
  loading,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  onOpenNewPatient,
  onSelectPatient,
  onEditPatient,
  onScheduleAppointment,
  onPatientQueued,
}) {
  const [queueingId, setQueueingId] = useState(null);

  const handleQueuePatient = async (patient) => {
    try {
      setQueueingId(patient.id);
      await api.createQueue({
        patient: patient.id,
        purpose: 'General Consultation',
        visit_type: 'New-case',
      });
      showToast(
        `Patient ${patient.full_name || `${patient.surname} ${patient.first_name}`} added to Consultation Queue!`,
        'success',
        'Consultation Queue'
      );
      if (onPatientQueued) onPatientQueued();
    } catch (err) {
      showToast(
        err.response?.data?.detail || err.message || 'Error queueing patient',
        'danger',
        'Queue Error'
      );
    } finally {
      setQueueingId(null);
    }
  };
  return (
    <div className="container-fluid">
      {/* Page Heading / Actions */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800 font-weight-bold">Patient Records & Directory</h1>
        <button className="btn btn-primary shadow-sm" onClick={onOpenNewPatient}>
          <i className="fa fa-user-plus mr-2"></i> Register New Patient
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card shadow mb-4">
        {/* Card Header matching Django template */}
        <div className="card-header py-3 d-flex flex-wrap align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center mb-2 mb-md-0">
            <span className="btn btn-danger btn-sm py-1 px-2 mr-2 font-weight-bold">
              {totalCount ?? patients.length}
            </span>
            <i className="fa fa-users mr-2"></i> Patient Records
          </h6>

          {/* Filters */}
          <div className="d-flex align-items-center flex-wrap">
            <div className="mr-2 mb-2 mb-md-0">
              <select
                className="custom-select custom-select-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group input-group-sm" style={{ width: '220px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="input-group-append">
                <button className="btn btn-primary" type="button">
                  <i className="fas fa-search fa-sm"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-hover" id="dataTable" width="100%" cellSpacing="0">
              <thead className="thead-light">
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Hospital No.</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Full Name</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Phone No.</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Age / Gender</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Category</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Plan</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                      <div className="mt-2 text-muted small">Loading patient records from API...</div>
                    </td>
                  </tr>
                ) : patients.length > 0 ? (
                  patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="cursor-pointer"
                      onClick={() => onSelectPatient(patient)}
                    >
                      <td className="align-middle text-nowrap">
                        <span className="hospital-badge">
                          {patient.hospital_number || '-'}
                        </span>
                      </td>
                      <td className="font-weight-bold text-primary align-middle text-nowrap">
                        {patient.full_name || `${patient.surname} ${patient.first_name}`}
                      </td>
                      <td className="align-middle text-nowrap">
                        <span style={{ color: '#8b4513' }}>
                          {patient.phone_number || '-'}
                        </span>
                      </td>
                      <td className="align-middle text-nowrap">
                        {patient.age ? `${patient.age} yrs` : '-'} / {patient.gender || '-'}
                      </td>
                      <td className="align-middle text-nowrap">
                        <span className="badge badge-light border px-2 py-1 font-weight-bold">
                          {patient.category_name || '-'}
                        </span>
                      </td>
                      <td className="align-middle text-nowrap">{patient.plan_name || '-'}</td>
                      <td className="align-middle text-nowrap">
                        {patient.active === 1 ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-secondary">Inactive</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()} className="text-nowrap">
                        <button
                          className="btn btn-sm btn-info py-0 px-2 mr-1"
                          onClick={() => onSelectPatient(patient)}
                          title="View Profile"
                        >
                          <i className="fas fa-eye fa-xs"></i>
                        </button>
                        {onEditPatient && (
                          <button
                            className="btn btn-sm btn-warning py-0 px-2 mr-1"
                            onClick={() => onEditPatient(patient)}
                            title="Edit Patient Record"
                          >
                            <i className="fas fa-edit fa-xs"></i>
                          </button>
                        )}
                        {onScheduleAppointment && (
                          <button
                            className="btn btn-sm btn-success py-0 px-2 mr-1"
                            onClick={() => onScheduleAppointment(patient)}
                            title="Schedule Appointment"
                          >
                            <i className="fas fa-calendar-plus fa-xs"></i>
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-primary py-0 px-2"
                          onClick={() => handleQueuePatient(patient)}
                          disabled={queueingId === patient.id}
                          title="Queue for Doctor / Nurse Consultation in Database"
                        >
                          <i className={`fas ${queueingId === patient.id ? 'fa-spinner fa-spin' : 'fa-stethoscope'} fa-xs`}></i>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <i className="fas fa-folder-open fa-3x text-gray-300 mb-3 d-block"></i>
                      No patient records found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
