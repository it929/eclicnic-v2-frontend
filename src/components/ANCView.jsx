import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function ANCView({ onOpenNewPatient }) {
  const [ancList, setAncList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [newANC, setNewANC] = useState({
    patient: '',
    last_menstrual_period: '',
    number_of_foetus: 1,
  });

  const loadANC = async () => {
    try {
      setLoading(true);
      const [res, patRes] = await Promise.all([
        api.getANCRegistrations(),
        api.getPatients({ active: 1 })
      ]);
      setAncList(res.results || res);
      setPatientsList(patRes.results || patRes);
    } catch (err) {
      console.error('Error fetching ANC:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadANC();
  }, []);

  const handleCreateANC = async (e) => {
    e.preventDefault();
    if (!newANC.patient) {
      alert('Please select a mother to enroll in ANC.');
      return;
    }
    try {
      await api.createANCRegistration({
        patient: Number(newANC.patient),
        last_menstrual_period: newANC.last_menstrual_period || null,
        number_of_foetus: Number(newANC.number_of_foetus || 1),
      });
      setIsEnrollModalOpen(false);
      setNewANC({
        patient: '',
        last_menstrual_period: '',
        number_of_foetus: 1,
      });
      loadANC();
    } catch (err) {
      alert('Error enrolling mother in ANC: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800 font-weight-bold">Antenatal Care (ANC) Clinic</h1>
          <p className="text-muted small mb-0">Maternal health tracking, gestational age, and delivery scheduling</p>
        </div>
        <button className="btn btn-primary shadow-sm" onClick={() => setIsEnrollModalOpen(true)}>
          <i className="fas fa-female mr-2"></i> Enroll Mother in ANC
        </button>
      </div>

      <div className="row">
        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Registered ANC Mothers
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{ancList.length}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-baby fa-2x text-gray-300"></i>
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
                    Deliveries Due This Month
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">4</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar-alt fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    High Risk Pregnancy Alerts
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">1</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-shield-alt fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">
            <i className="fas fa-female mr-2"></i> Active Antenatal Registry
          </h6>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="thead-light">
                <tr>
                  <th>Hospital No.</th>
                  <th>Patient Name</th>
                  <th>LMP (Last Period)</th>
                  <th>Gestational Age</th>
                  <th>Expected Delivery Date (EDD)</th>
                  <th>Stage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ancList.length > 0 ? (
                  ancList.map((anc) => (
                    <tr key={anc.id}>
                      <td className="font-weight-bold text-danger">{anc.hospital_number || '-'}</td>
                      <td className="font-weight-bold text-primary">{anc.patient_name || 'Mother'}</td>
                      <td>{anc.last_menstrual_period || '-'}</td>
                      <td>
                        <span className="badge badge-info">{anc.gestational_age_weeks || 24} Weeks</span>
                      </td>
                      <td className="font-weight-bold text-success">
                        {anc.expected_delivery_date || '-'}
                      </td>
                      <td>Stage {anc.current_stage || 1}</td>
                      <td>
                        <button className="btn btn-sm btn-primary py-0 px-2">
                          <i className="fas fa-notes-medical mr-1"></i> Visit Notes
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No active ANC enrollments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Enroll Mother Modal */}
      {isEnrollModalOpen && (
        <>
          <div className="modal-backdrop-custom" onClick={() => setIsEnrollModalOpen(false)}></div>
          <div className="card shadow modal-custom" style={{ maxWidth: '500px' }}>
            <div className="card-header py-3 bg-primary text-white d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold">
                <i className="fas fa-female mr-2"></i> Enroll Mother in ANC
              </h6>
              <button type="button" className="close text-white" onClick={() => setIsEnrollModalOpen(false)}>
                <span>&times;</span>
              </button>
            </div>
            <form onSubmit={handleCreateANC}>
              <div className="card-body">
                <div className="form-group">
                  <label className="small font-weight-bold">Select Mother / Patient *</label>
                  <select
                    className="custom-select custom-select-sm"
                    required
                    value={newANC.patient}
                    onChange={(e) => setNewANC({ ...newANC, patient: e.target.value })}
                  >
                    <option value="">-- Choose Patient --</option>
                    {patientsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || `${p.surname} ${p.first_name}`} ({p.hospital_number || 'No Hosp#'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="small font-weight-bold">Last Menstrual Period (LMP)</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={newANC.last_menstrual_period}
                    onChange={(e) => setNewANC({ ...newANC, last_menstrual_period: e.target.value })}
                  />
                  <small className="form-text text-muted">
                    Gestational age & Expected Date of Delivery (EDD) are auto-calculated from this date in database.
                  </small>
                </div>
                <div className="form-group">
                  <label className="small font-weight-bold">Number of Foetus</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    className="form-control form-control-sm"
                    value={newANC.number_of_foetus}
                    onChange={(e) => setNewANC({ ...newANC, number_of_foetus: e.target.value })}
                  />
                </div>
              </div>
              <div className="card-footer bg-light d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mr-2"
                  onClick={() => setIsEnrollModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <i className="fas fa-check mr-1"></i> Enroll in ANC
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
