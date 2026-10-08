import React, { useState } from 'react';
import api from '../services/api';

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
      alert(`Patient ${patient.full_name || patient.surname} added to Consultation Queue in database!`);
      if (onPatientQueued) onPatientQueued();
    } catch (err) {
      alert('Error queueing patient: ' + (err.response?.data?.detail || err.message));
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
                  <th>Hospital No.</th>
                  <th>Full Name</th>
                  <th>Phone No.</th>
                  <th>Age / Gender</th>
                  <th>Category</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                      <td className="font-weight-bold text-danger">
                        {patient.hospital_number || '-'}
                      </td>
                      <td className="font-weight-bold text-primary">
                        {patient.full_name || `${patient.surname} ${patient.first_name}`}
                      </td>
                      <td>
                        <span style={{ color: '#8b4513' }}>
                          {patient.phone_number || '-'}
                        </span>
                      </td>
                      <td>
                        {patient.age ? `${patient.age} yrs` : '-'} / {patient.gender || '-'}
                      </td>
                      <td>
                        <span className="badge badge-light border px-2 py-1">
                          {patient.category_name || '-'}
                        </span>
                      </td>
                      <td>{patient.plan_name || '-'}</td>
                      <td>
                        {patient.active === 1 ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-secondary">Inactive</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-sm btn-info py-0 px-2 mr-1"
                          onClick={() => onSelectPatient(patient)}
                          title="View Profile"
                        >
                          <i className="fas fa-eye fa-xs"></i>
                        </button>
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
