import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function RadioLabView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [newOrder, setNewOrder] = useState({
    item: '',
    patient: '',
    rate: '',
    item_type: 'Lab',
    samples: '',
    comment: '',
  });

  const loadOrders = async () => {
    try {
      setLoading(true);
      const [res, patRes] = await Promise.all([
        api.getRadioLabOrders(),
        api.getPatients({ active: 1 })
      ]);
      setOrders(res.results || res);
      setPatientsList(patRes.results || patRes);
    } catch (err) {
      console.error('Error fetching RadioLab orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrder.patient) {
      alert('Please select a patient for the investigation order.');
      return;
    }
    try {
      await api.createRadioLabTest({
        item: newOrder.item,
        patient: Number(newOrder.patient),
        rate: Number(newOrder.rate || 0),
        item_type: newOrder.item_type === 'Radio' ? 'RA' : 'LA',
        samples: newOrder.samples,
        comment: newOrder.comment,
      });
      setIsOrderModalOpen(false);
      setNewOrder({
        item: '',
        patient: '',
        rate: '',
        item_type: 'Lab',
        samples: '',
        comment: '',
      });
      loadOrders();
    } catch (err) {
      alert('Error ordering test in database: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCompleteTest = async (orderId) => {
    try {
      await api.updateRadioLabTest(orderId, { completed: 1 });
      loadOrders();
    } catch (err) {
      alert('Error updating test status: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filterType === 'pending') return !o.completed;
    if (filterType === 'completed') return o.completed;
    return true;
  });

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800 font-weight-bold">Laboratory & Radiology Diagnostics</h1>
          <p className="text-muted small mb-0">Clinical investigations, medical scans, and test results</p>
        </div>
        <button className="btn btn-primary shadow-sm" onClick={() => setIsOrderModalOpen(true)}>
          <i className="fas fa-microscope mr-2"></i> Order New Investigation
        </button>
      </div>

      <div className="row">
        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Test Orders
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{orders.length}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-vial fa-2x text-gray-300"></i>
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
                    Awaiting Lab Analysis
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {orders.filter((o) => !o.completed).length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-hourglass-start fa-2x text-gray-300"></i>
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
                    Completed Results
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {orders.filter((o) => o.completed).length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-check-double fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-primary">
            <i className="fas fa-flask mr-2"></i> Diagnostics Investigation Queue
          </h6>
          <div className="btn-group btn-group-sm">
            <button
              className={`btn ${filterType === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilterType('all')}
            >
              All Orders
            </button>
            <button
              className={`btn ${filterType === 'pending' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilterType('pending')}
            >
              Pending
            </button>
            <button
              className={`btn ${filterType === 'completed' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilterType('completed')}
            >
              Completed
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="thead-light">
                <tr>
                  <th>Investigation Item</th>
                  <th>Patient Name</th>
                  <th>Hospital No.</th>
                  <th>Fee Rate (₦)</th>
                  <th>Sample / Notes</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td className="font-weight-bold text-primary">
                        <i className="fas fa-microscope mr-2 text-gray-400"></i>
                        {ord.item}
                      </td>
                      <td>{ord.patient_name || 'Patient'}</td>
                      <td className="font-weight-bold text-danger">{ord.hospital_number || '-'}</td>
                      <td className="font-weight-bold">₦{Number(ord.rate || 0).toLocaleString()}</td>
                      <td>{ord.samples || ord.comment || 'Routine sample'}</td>
                      <td>
                        {ord.completed ? (
                          <span className="badge badge-success">Result Ready</span>
                        ) : (
                          <span className="badge badge-warning">Sample In Lab</span>
                        )}
                      </td>
                      <td>
                        {!ord.completed ? (
                          <button
                            className="btn btn-sm btn-success py-0 px-2 mr-1"
                            title="Complete test order in database"
                            onClick={() => handleCompleteTest(ord.id)}
                          >
                            <i className="fas fa-check fa-xs mr-1"></i> Mark Done
                          </button>
                        ) : (
                          <span className="badge badge-light border text-success">
                            <i className="fas fa-check-circle mr-1"></i> Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No diagnostic investigation orders in this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Investigation Modal */}
      {isOrderModalOpen && (
        <>
          <div className="modal-backdrop-custom" onClick={() => setIsOrderModalOpen(false)}></div>
          <div className="card shadow modal-custom" style={{ maxWidth: '550px' }}>
            <div className="card-header py-3 bg-primary text-white d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold">
                <i className="fas fa-microscope mr-2"></i> Order New Investigation
              </h6>
              <button type="button" className="close text-white" onClick={() => setIsOrderModalOpen(false)}>
                <span>&times;</span>
              </button>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className="card-body">
                <div className="form-group">
                  <label className="small font-weight-bold">Select Patient *</label>
                  <select
                    className="custom-select custom-select-sm"
                    required
                    value={newOrder.patient}
                    onChange={(e) => setNewOrder({ ...newOrder, patient: e.target.value })}
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
                  <label className="small font-weight-bold">Investigation / Test Name *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    placeholder="e.g. Full Blood Count (FBC), Malaria Parasite, Chest X-Ray"
                    value={newOrder.item}
                    onChange={(e) => setNewOrder({ ...newOrder, item: e.target.value })}
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 form-group">
                    <label className="small font-weight-bold">Department Type</label>
                    <select
                      className="custom-select custom-select-sm"
                      value={newOrder.item_type}
                      onChange={(e) => setNewOrder({ ...newOrder, item_type: e.target.value })}
                    >
                      <option value="Lab">Laboratory (LA)</option>
                      <option value="Radio">Radiology (RA)</option>
                    </select>
                  </div>
                  <div className="col-md-6 form-group">
                    <label className="small font-weight-bold">Fee Rate (₦) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control form-control-sm"
                      required
                      placeholder="e.g. 2500"
                      value={newOrder.rate}
                      onChange={(e) => setNewOrder({ ...newOrder, rate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="small font-weight-bold">Sample Collected / Specimen</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Whole blood, Urine sample, Sputum"
                    value={newOrder.samples}
                    onChange={(e) => setNewOrder({ ...newOrder, samples: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="small font-weight-bold">Clinical Notes / Indication</label>
                  <textarea
                    rows="2"
                    className="form-control form-control-sm"
                    placeholder="Clinical reason or suspected diagnosis"
                    value={newOrder.comment}
                    onChange={(e) => setNewOrder({ ...newOrder, comment: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="card-footer bg-light d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mr-2"
                  onClick={() => setIsOrderModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <i className="fas fa-check mr-1"></i> Order Investigation
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
