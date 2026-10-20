import React, { useState, useEffect } from 'react';
import api from '../services/api';
import VitalsModal from './VitalsModal';
import { showToast } from './Toast';

export default function QueueView({ queues: initialQueues = [], onSelectPatient, onOpenNewPatient, onRefreshQueues }) {
  const [queues, setQueues] = useState(initialQueues);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState(null);
  const [patientsList, setPatientsList] = useState([]);
  const [purposesList, setPurposesList] = useState([]);
  const [newQueue, setNewQueue] = useState({
    patient: '',
    purpose: 'General Consultation',
    visit_type: 'New-case',
  });

  const loadQueues = async () => {
    try {
      setLoading(true);
      const [qRes, patRes, purpRes] = await Promise.all([
        api.getQueues(),
        api.getPatients({ active: 1 }),
        api.getVisitPurposes(),
      ]);
      setQueues(qRes.results || qRes || []);
      setPatientsList(patRes.results || patRes || []);
      setPurposesList(purpRes.results || purpRes || []);
      if (onRefreshQueues) onRefreshQueues();
    } catch (err) {
      console.error('Error fetching queues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueues();
  }, []);

  const handleCreateQueue = async (e) => {
    e.preventDefault();
    if (!newQueue.patient) {
      showToast('Please select a patient to queue.', 'warning', 'Missing Patient');
      return;
    }
    try {
      await api.createQueue({
        patient: Number(newQueue.patient),
        purpose: newQueue.purpose,
        visit_type: newQueue.visit_type,
      });
      setIsQueueModalOpen(false);
      setNewQueue({
        patient: '',
        purpose: 'General Consultation',
        visit_type: 'New-case',
      });
      showToast('Patient added to consultation queue successfully!', 'success', 'Queue Updated');
      loadQueues();
    } catch (err) {
      showToast('Error adding patient to queue: ' + (err.response?.data?.detail || err.message), 'danger', 'Queue Error');
    }
  };

  const handleCallNext = async (queueId) => {
    try {
      await api.updateQueue(queueId, { waiting_status: 1 });
      showToast('Patient called into active consultation!', 'success', 'Queue Updated');
      loadQueues();
    } catch (err) {
      showToast('Error updating queue status: ' + (err.response?.data?.detail || err.message), 'danger', 'Queue Error');
    }
  };

  const handleTakeVitals = (queueItem) => {
    setSelectedQueueItem(queueItem);
    setIsVitalsModalOpen(true);
  };

  const activeQueues = queues.filter((q) => {
    if (filterType === 'waiting') return q.waiting_status === 0;
    if (filterType === 'consultation') return q.waiting_status === 1;
    return true;
  });

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800 font-weight-bold">Nurse & Doctor Queue Monitoring</h1>
          <p className="text-muted small mb-0">Live real-time patient queue and consultation routing</p>
        </div>
        <div>
          <button className="btn btn-outline-primary shadow-sm mr-2" onClick={() => setIsQueueModalOpen(true)}>
            <i className="fas fa-list-ol mr-2"></i> Queue Existing Patient
          </button>
          <button className="btn btn-primary shadow-sm" onClick={onOpenNewPatient}>
            <i className="fa fa-user-plus mr-2"></i> Register New Patient
          </button>
        </div>
      </div>

      <div className="row">
        {/* Queue Summary Cards */}
        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Patients in Waiting
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {queues.filter((q) => q.waiting_status === 0).length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-clock fa-2x text-gray-300"></i>
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
                    Attended / In Consultation
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {queues.filter((q) => q.waiting_status === 1).length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-user-check fa-2x text-gray-300"></i>
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
                    Total Queue Entries
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{queues.length}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-procedures fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-primary">
            <i className="fas fa-procedures mr-2"></i> Active Queue List
          </h6>
          <div className="btn-group btn-group-sm">
            <button
              className={`btn ${filterType === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilterType('all')}
            >
              All ({queues.length})
            </button>
            <button
              className={`btn ${filterType === 'waiting' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilterType('waiting')}
            >
              Waiting ({queues.filter((q) => q.waiting_status === 0).length})
            </button>
            <button
              className={`btn ${filterType === 'consultation' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilterType('consultation')}
            >
              In Consultation ({queues.filter((q) => q.waiting_status === 1).length})
            </button>
          </div>
        </div>

        <div className="card-body">
          {activeQueues.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>Position</th>
                    <th>Patient Name</th>
                    <th>Hospital No.</th>
                    <th>Visit Purpose</th>
                    <th>Attendant</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeQueues.map((q, idx) => (
                    <tr key={q.id || idx}>
                      <td className="font-weight-bold text-center">{idx + 1}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-link p-0 font-weight-bold text-primary text-left"
                          style={{ textDecoration: 'none' }}
                          onClick={() => onSelectPatient && onSelectPatient(q)}
                          title="View Patient Details"
                        >
                          {q.patient_name || 'Patient'}
                        </button>
                      </td>
                      <td>
                        <span className="text-danger font-weight-bold hospital-badge" style={{ fontSize: '0.85rem' }}>
                          {q.hospital_number || '-'}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-light border text-dark font-weight-normal px-2 py-1">
                          {q.purpose || q.visit_type || 'General Consultation'}
                        </span>
                      </td>
                      <td>{q.attendant_name || 'Nurse Desk'}</td>
                      <td>
                        {q.waiting_status === 1 ? (
                          <span className="badge badge-success px-2 py-1">In Consultation</span>
                        ) : (
                          <span className="badge badge-warning px-2 py-1">Waiting</span>
                        )}
                      </td>
                      <td>
                        {q.waiting_status === 0 ? (
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-sm btn-success py-1 px-2"
                              title="Call Patient into Consultation"
                              onClick={() => handleCallNext(q.id)}
                            >
                              <i className="fas fa-check mr-1"></i> Call Next
                            </button>
                            <button
                              className="btn btn-sm btn-outline-primary py-1 px-2 font-weight-bold"
                              title="Take Vitals immediately"
                              onClick={() => handleTakeVitals(q)}
                            >
                              <i className="fas fa-heartbeat mr-1"></i> Take Vitals
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-sm btn-primary py-1 px-3 shadow-sm font-weight-bold"
                            title="Record Patient Vital Signs"
                            onClick={() => handleTakeVitals(q)}
                          >
                            <i className="fas fa-heartbeat mr-1"></i> Take Vitals
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-check-circle fa-3x text-success mb-3 d-block"></i>
              <h5 className="font-weight-bold text-gray-800">Queue is Clear!</h5>
              <p className="text-muted small">There are currently no patients in this queue view.</p>
            </div>
          )}
        </div>
      </div>

      {/* Queue Existing Patient Modal */}
      {isQueueModalOpen && (
        <>
          <div className="modal-backdrop-custom" onClick={() => setIsQueueModalOpen(false)}></div>
          <div className="card shadow modal-custom" style={{ maxWidth: '500px' }}>
            <div className="card-header py-3 bg-primary text-white d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold">
                <i className="fas fa-list-ol mr-2"></i> Queue Patient for Consultation
              </h6>
              <button type="button" className="close text-white" onClick={() => setIsQueueModalOpen(false)}>
                <span>&times;</span>
              </button>
            </div>
            <form onSubmit={handleCreateQueue}>
              <div className="card-body">
                <div className="form-group">
                  <label className="small font-weight-bold">Select Registered Patient *</label>
                  <select
                    className="custom-select custom-select-sm"
                    required
                    value={newQueue.patient}
                    onChange={(e) => setNewQueue({ ...newQueue, patient: e.target.value })}
                  >
                    <option value="">-- Choose Patient --</option>
                    {patientsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {(p.surname ? `${p.surname} ${p.first_name} ${p.other_name || ''}`.trim() : null) || p.patient_name || 'Patient'} ({p.hospital_number || 'No Hosp#'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="small font-weight-bold">Visit Purpose</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    list="purposes-list"
                    value={newQueue.purpose}
                    onChange={(e) => setNewQueue({ ...newQueue, purpose: e.target.value })}
                  />
                  <datalist id="purposes-list">
                    {purposesList.map((purp) => (
                      <option key={purp.id} value={purp.purpose} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label className="small font-weight-bold">Visit Type</label>
                  <select
                    className="custom-select custom-select-sm"
                    value={newQueue.visit_type}
                    onChange={(e) => setNewQueue({ ...newQueue, visit_type: e.target.value })}
                  >
                    <option value="New-case">New Case</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Review">Review</option>
                  </select>
                </div>
              </div>
              <div className="card-footer bg-light d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mr-2"
                  onClick={() => setIsQueueModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <i className="fas fa-check mr-1"></i> Add to Queue
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Vitals Recording Modal */}
      <VitalsModal
        isOpen={isVitalsModalOpen}
        patient={selectedQueueItem}
        queueItem={selectedQueueItem}
        onClose={() => {
          setIsVitalsModalOpen(false);
          setSelectedQueueItem(null);
        }}
        onVitalsSaved={() => {
          loadQueues();
          if (onRefreshQueues) onRefreshQueues();
        }}
      />
    </div>
  );
}
