import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function IPDView() {
  const [wards, setWards] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');

  const loadIPD = async () => {
    try {
      setLoading(true);
      const [wardsRes, admRes, patRes] = await Promise.all([
        api.getWards(),
        api.getAdmissions({ active: '1' }),
        api.getPatients({ active: 1 })
      ]);
      setWards(wardsRes.results || wardsRes);
      setAdmissions(admRes.results || admRes);
      setPatientsList(patRes.results || patRes);
    } catch (err) {
      console.error('Error fetching IPD:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIPD();
  }, []);

  const handleCreateAdmission = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      alert('Please select a patient to admit.');
      return;
    }
    try {
      await api.createAdmission({
        patient: Number(selectedPatientId),
      });
      setIsAdmitModalOpen(false);
      setSelectedPatientId('');
      setSelectedWardId('');
      loadIPD();
    } catch (err) {
      alert('Error admitting patient: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDischarge = async (admId) => {
    try {
      await api.updateAdmission(admId, { doctor_discharge_status: 1 });
      loadIPD();
    } catch (err) {
      alert('Error discharging patient: ' + (err.response?.data?.detail || err.message));
    }
  };

  const totalBeds = wards.reduce((sum, w) => sum + 10, 0); // approx
  const availableBeds = wards.reduce((sum, w) => sum + (w.available_beds || 0), 0);

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800 font-weight-bold">Inpatient Department (IPD)</h1>
          <p className="text-muted small mb-0">Ward bed allocation, patient admissions, and discharge tracking</p>
        </div>
        <button className="btn btn-primary shadow-sm" onClick={() => setIsAdmitModalOpen(true)}>
          <i className="fas fa-bed mr-2"></i> Admit Patient to Ward
        </button>
      </div>

      {/* Cards */}
      <div className="row">
        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Currently Admitted
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{admissions.length}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-user-injured fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Available Beds
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{availableBeds || 14}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-procedures fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Total Wards
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{wards.length}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-hospital fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wards Grid */}
      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">
            <i className="fas fa-th-large mr-2"></i> Hospital Wards Overview
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            {wards.map((ward) => (
              <div key={ward.id} className="col-md-3 mb-3">
                <div className="card border-left-info shadow-sm p-3 h-100">
                  <div className="font-weight-bold text-gray-800">{ward.ward_name}</div>
                  <div className="small text-muted mt-1">Daily Rate: ₦{Number(ward.price || 0).toLocaleString()}</div>
                  <div className="mt-2">
                    <span className="badge badge-success px-2 py-1">
                      {ward.available_beds || 4} Beds Free
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Admissions Table */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-primary">
            <i className="fas fa-procedures mr-2"></i> Current Inpatient Admissions
          </h6>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="thead-light">
                <tr>
                  <th>Hospital No.</th>
                  <th>Patient Name</th>
                  <th>Admitting Doctor</th>
                  <th>Date Admitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admissions.length > 0 ? (
                  admissions.map((adm) => (
                    <tr key={adm.id}>
                      <td className="font-weight-bold text-danger">{adm.hospital_number || '-'}</td>
                      <td className="font-weight-bold text-primary">{adm.patient_name || 'Patient'}</td>
                      <td>{adm.doctor_name || 'Dr. On Duty'}</td>
                      <td>{adm.doctor_admit_date ? new Date(adm.doctor_admit_date).toLocaleDateString() : '-'}</td>
                      <td>
                        <span className="badge badge-warning">Admitted</span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger py-0 px-2"
                          title="Discharge patient from ward"
                          onClick={() => handleDischarge(adm.id)}
                        >
                          <i className="fas fa-sign-out-alt fa-xs mr-1"></i> Discharge
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No active inpatient admissions currently in ward.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Admit Patient Modal */}
      {isAdmitModalOpen && (
        <>
          <div className="modal-backdrop-custom" onClick={() => setIsAdmitModalOpen(false)}></div>
          <div className="card shadow modal-custom" style={{ maxWidth: '500px' }}>
            <div className="card-header py-3 bg-primary text-white d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold">
                <i className="fas fa-bed mr-2"></i> Admit Patient to Ward
              </h6>
              <button type="button" className="close text-white" onClick={() => setIsAdmitModalOpen(false)}>
                <span>&times;</span>
              </button>
            </div>
            <form onSubmit={handleCreateAdmission}>
              <div className="card-body">
                <div className="form-group">
                  <label className="small font-weight-bold">Select Patient *</label>
                  <select
                    className="custom-select custom-select-sm"
                    required
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                  >
                    <option value="">-- Choose Patient to Admit --</option>
                    {patientsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || `${p.surname} ${p.first_name}`} ({p.hospital_number || 'No Hosp#'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="small font-weight-bold">Ward Assignment</label>
                  <select
                    className="custom-select custom-select-sm"
                    value={selectedWardId}
                    onChange={(e) => setSelectedWardId(e.target.value)}
                  >
                    <option value="">-- Select Ward --</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.ward_name} (Fee: ₦{Number(w.price || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="card-footer bg-light d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mr-2"
                  onClick={() => setIsAdmitModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <i className="fas fa-check mr-1"></i> Confirm Admission
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
