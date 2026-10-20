import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function PharmacyView() {
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDrug, setNewDrug] = useState({
    product_name: '',
    product_id: '',
    price: '',
    stock: '',
    minimum_UoM: 'tablets',
    low_stock_threshold: 10,
    description: '',
  });

  const loadDrugs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (showLowStockOnly) params.low_stock = '1';
      const res = await api.getPharmacyDrugs(params);
      setDrugs(res.results || res);
    } catch (err) {
      console.error('Error fetching pharmacy drugs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrugs();
  }, [search, showLowStockOnly]);

  const handleCreateDrug = async (e) => {
    e.preventDefault();
    try {
      await api.createPharmacyDrug({
        product_name: newDrug.product_name,
        product_id: newDrug.product_id || `DRG${Math.floor(1000 + Math.random() * 9000)}`,
        price: Number(newDrug.price),
        stock: Number(newDrug.stock),
        minimum_UoM: newDrug.minimum_UoM,
        low_stock_threshold: Number(newDrug.low_stock_threshold || 10),
        description: newDrug.description,
      });
      setIsAddModalOpen(false);
      setNewDrug({
        product_name: '',
        product_id: '',
        price: '',
        stock: '',
        minimum_UoM: 'tablets',
        low_stock_threshold: 10,
        description: '',
      });
      loadDrugs();
    } catch (err) {
      alert('Error creating drug in database: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDispense = async (drug) => {
    if (drug.stock <= 0) {
      alert(`Cannot dispense ${drug.product_name}: Out of stock!`);
      return;
    }
    try {
      await api.updatePharmacyDrug(drug.id, {
        stock: Math.max(0, Number(drug.stock) - 1),
      });
      loadDrugs();
    } catch (err) {
      alert('Error dispensing medication: ' + (err.response?.data?.detail || err.message));
    }
  };

  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'inventory'
  const [prescriptions, setPrescriptions] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [dispensingId, setDispensingId] = useState(null);
  const [prescriptionFilter, setPrescriptionFilter] = useState('pending'); // 'pending' | 'dispensed' | 'all'
  const [prescriptionSearch, setPrescriptionSearch] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadPrescriptions = async () => {
    try {
      setQueueLoading(true);
      const params = {};
      if (prescriptionFilter !== 'all') params.status = prescriptionFilter;
      if (prescriptionSearch) params.search = prescriptionSearch;
      const res = await api.getPrescriptions(params);
      setPrescriptions(Array.isArray(res) ? res : (res?.results || []));
    } catch (err) {
      console.error('Error fetching prescriptions queue:', err);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleDispensePrescription = async (prescription) => {
    if (prescription.status === 'dispensed') {
      alert('This prescription has already been dispensed.');
      return;
    }
    const confirmMsg = `Dispense ${prescription.dispense_detail || `${prescription.quantity} ${prescription.dispense_unit || 'units'}`} of ${prescription.item} to patient ${prescription.patient_name}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setDispensingId(prescription.id);
      const res = await api.dispensePrescription(prescription.id);
      showNotification(
        `Successfully dispensed ${prescription.dispense_detail || prescription.item} to ${prescription.patient_name}!${
          res.stock_deducted ? ` (${res.stock_deducted} units deducted from inventory)` : ''
        }`,
        'success'
      );
      loadPrescriptions();
      loadDrugs();
    } catch (err) {
      alert('Error dispensing prescription: ' + (err.response?.data?.detail || err.message));
    } finally {
      setDispensingId(null);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, [prescriptionFilter, prescriptionSearch]);

  const pendingCount = prescriptions.filter((p) => p.status === 'pending').length;
  const dispensedCount = prescriptions.filter((p) => p.status === 'dispensed').length;
  const lowStockCount = drugs.filter((d) => (d.stock || 0) <= (d.low_stock_threshold || 10)).length;

  return (
    <div className="container-fluid">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`alert alert-${toastMessage.type} shadow-lg position-fixed d-flex align-items-center`}
          style={{ top: '20px', right: '20px', zIndex: 9999, minWidth: '300px' }}
        >
          <i className="fas fa-check-circle mr-2"></i>
          <span>{toastMessage.msg}</span>
          <button type="button" className="close ml-auto" onClick={() => setToastMessage(null)}>
            &times;
          </button>
        </div>
      )}

      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800 font-weight-bold">Pharmacy &amp; Medication Store</h1>
          <p className="text-muted small mb-0">Dispensing fulfillment, pieces &amp; bottle calculations, and stock control</p>
        </div>
        <div className="d-flex" style={{ gap: '8px' }}>
          <button className="btn btn-outline-primary btn-sm shadow-sm" onClick={() => { loadPrescriptions(); loadDrugs(); }}>
            <i className="fas fa-sync-alt mr-1"></i> Refresh
          </button>
          <button className="btn btn-primary btn-sm shadow-sm" onClick={() => setIsAddModalOpen(true)}>
            <i className="fas fa-plus mr-1"></i> Add Medication to Catalog
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="row">
        <div className="col-xl-3 col-md-6 mb-4">
          <div
            className={`card border-left-primary shadow h-100 py-2 ${activeTab === 'queue' && prescriptionFilter === 'pending' ? 'bg-light' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => { setActiveTab('queue'); setPrescriptionFilter('pending'); }}
          >
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Pending Prescriptions (To Dispense)
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">{pendingCount}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-hand-holding-medical fa-2x text-primary"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div
            className="card border-left-success shadow h-100 py-2"
            style={{ cursor: 'pointer' }}
            onClick={() => { setActiveTab('queue'); setPrescriptionFilter('dispensed'); }}
          >
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Prescriptions Dispensed
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">{dispensedCount}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-check-double fa-2x text-success"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div
            className="card border-left-danger shadow h-100 py-2"
            style={{ cursor: 'pointer' }}
            onClick={() => { setActiveTab('inventory'); setShowLowStockOnly(true); }}
          >
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                    Low Stock Alerts
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">{lowStockCount}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-exclamation-triangle fa-2x text-danger"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div
            className="card border-left-info shadow h-100 py-2"
            style={{ cursor: 'pointer' }}
            onClick={() => { setActiveTab('inventory'); setShowLowStockOnly(false); }}
          >
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Medication Inventory Items
                  </div>
                  <div className="h4 mb-0 font-weight-bold text-gray-800">{drugs.length}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-pills fa-2x text-info"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <ul className="nav nav-tabs mb-3 font-weight-bold">
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center ${activeTab === 'queue' ? 'active text-primary font-weight-bold' : 'text-muted'}`}
            onClick={() => setActiveTab('queue')}
            style={{ cursor: 'pointer' }}
          >
            <i className="fas fa-prescription-bottle-alt mr-2"></i>
            Prescription Dispensing Queue
            {pendingCount > 0 && (
              <span className="badge badge-danger ml-2 px-2 py-0.5">{pendingCount} pending</span>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center ${activeTab === 'inventory' ? 'active text-primary font-weight-bold' : 'text-muted'}`}
            onClick={() => setActiveTab('inventory')}
            style={{ cursor: 'pointer' }}
          >
            <i className="fas fa-boxes mr-2"></i>
            Medication Inventory &amp; Stock
            <span className="badge badge-light border ml-2">{drugs.length}</span>
          </button>
        </li>
      </ul>

      {/* TAB 1: Prescription Dispensing Queue */}
      {activeTab === 'queue' && (
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-wrap align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-2 mb-md-0" style={{ gap: '10px' }}>
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-clipboard-list mr-1"></i> Doctor Prescriptions to Dispense
              </h6>
              <div className="btn-group btn-group-sm ml-2">
                <button
                  type="button"
                  className={`btn ${prescriptionFilter === 'pending' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'}`}
                  onClick={() => setPrescriptionFilter('pending')}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  type="button"
                  className={`btn ${prescriptionFilter === 'dispensed' ? 'btn-success font-weight-bold' : 'btn-outline-secondary'}`}
                  onClick={() => setPrescriptionFilter('dispensed')}
                >
                  Dispensed ({dispensedCount})
                </button>
                <button
                  type="button"
                  className={`btn ${prescriptionFilter === 'all' ? 'btn-dark font-weight-bold' : 'btn-outline-secondary'}`}
                  onClick={() => setPrescriptionFilter('all')}
                >
                  All Records
                </button>
              </div>
            </div>

            <div className="input-group input-group-sm" style={{ width: '260px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search patient or drug..."
                value={prescriptionSearch}
                onChange={(e) => setPrescriptionSearch(e.target.value)}
              />
              <div className="input-group-append">
                <button className="btn btn-primary" type="button" onClick={loadPrescriptions}>
                  <i className="fas fa-search fa-sm"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {queueLoading ? (
              <div className="text-center py-5 text-muted">
                <i className="fas fa-spinner fa-spin fa-2x mb-2"></i>
                <p className="mb-0">Loading prescription queue...</p>
              </div>
            ) : prescriptions.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-bordered table-hover mb-0">
                  <thead className="thead-light">
                    <tr style={{ fontSize: '0.82rem' }}>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Date / Time</th>
                      <th>Patient Name &amp; Hospital #</th>
                      <th>Medication &amp; Form</th>
                      <th>Strength</th>
                      <th>Regimen / Instructions</th>
                      <th className="bg-light-primary text-primary font-weight-bold">
                        <i className="fas fa-hand-holding-medical mr-1"></i> Pieces / Bottles to Dispense
                      </th>
                      <th>Prescribed By</th>
                      <th>Status</th>
                      <th style={{ width: '130px' }} className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((p, idx) => {
                      const isPending = p.status === 'pending';
                      const isLiquid = p.dosage_form === 'Syrup' || p.dosage_form === 'Suspension' || (p.dispense_unit && p.dispense_unit.toLowerCase().includes('bottle'));

                      return (
                        <tr key={p.id} className={!isPending ? 'bg-light text-muted' : ''} style={{ fontSize: '0.85rem' }}>
                          <td className="text-center font-weight-bold text-muted">{idx + 1}</td>
                          <td className="small">
                            <span className="font-weight-bold text-dark d-block">
                              {p.created_date ? new Date(p.created_date).toLocaleDateString() : 'Today'}
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {p.created_date ? new Date(p.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </td>
                          <td>
                            <div className="font-weight-bold text-primary" style={{ fontSize: '0.9rem' }}>
                              {p.patient_name || 'Patient'}
                            </div>
                            <span className="badge badge-light border text-muted">
                              {p.hospital_number ? `#${p.hospital_number}` : 'Walk-in'}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center flex-wrap" style={{ gap: '4px' }}>
                              <span className="font-weight-bold text-dark">{p.item}</span>
                              {(p.comment?.includes('Pay from your purse') || p.instruction?.includes('Pay from your purse')) && (
                                <span
                                  className="badge px-2 py-0.5 font-weight-bold shadow-xs"
                                  style={{
                                    backgroundColor: '#fef3c7',
                                    color: '#92400e',
                                    border: '1px solid #fde68a',
                                    fontSize: '0.73rem',
                                  }}
                                >
                                  <i className="fas fa-wallet mr-1"></i> Pay from your purse
                                </span>
                              )}
                            </div>
                            <div className="d-flex align-items-center flex-wrap" style={{ gap: '4px' }}>
                              <span className="badge badge-light border text-primary">
                                {p.dosage_form || 'Tablet'}
                              </span>
                              {p.route && (
                                <span className="badge badge-light border text-info font-weight-bold">
                                  <i className="fas fa-route mr-1"></i>{p.route}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="font-weight-bold text-muted">
                            {p.strength || '-'}
                          </td>
                          <td>
                            <div className="font-weight-bold text-dark">{p.instruction || `${p.dose_qty || ''} ${p.frequency || ''}`}</div>
                            {p.comment && (
                              <div className="small text-info font-italic">
                                <i className="fas fa-info-circle mr-1"></i>{p.comment}
                              </div>
                            )}
                          </td>
                          {/* Highlighted Exact Dispense Quantity calculated for pharmacy */}
                          <td className="bg-light-primary">
                            <span
                              className={`badge px-2.5 py-1.5 font-weight-bold shadow-sm ${
                                isLiquid ? 'badge-success' : 'badge-primary'
                              }`}
                              style={{ fontSize: '0.86rem' }}
                            >
                              <i className={`fas ${isLiquid ? 'fa-prescription-bottle' : 'fa-pills'} mr-1`}></i>
                              {p.dispense_detail || `${p.quantity || p.dispense_quantity || 1} ${p.dispense_unit || 'Pieces'}`}
                            </span>
                          </td>
                          <td className="small">
                            <div className="font-weight-bold text-dark">{p.provider_name || 'Doctor'}</div>
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>Attending Physician</span>
                          </td>
                          <td>
                            {isPending ? (
                              <span className="badge badge-warning px-2 py-1 font-weight-bold">
                                <i className="fas fa-clock mr-1"></i> Pending Dispense
                              </span>
                            ) : (
                              <span className="badge badge-success px-2 py-1 font-weight-bold">
                                <i className="fas fa-check mr-1"></i> Dispensed
                              </span>
                            )}
                          </td>
                          <td className="text-center">
                            {isPending ? (
                              <button
                                className="btn btn-sm btn-success font-weight-bold shadow-sm py-1 px-2.5"
                                disabled={dispensingId === p.id}
                                onClick={() => handleDispensePrescription(p)}
                                title="Dispense exact pieces/bottles to patient"
                              >
                                {dispensingId === p.id ? (
                                  <><i className="fas fa-spinner fa-spin mr-1"></i> Dispensing...</>
                                ) : (
                                  <><i className="fas fa-hand-holding-medical mr-1"></i> Dispense</>
                                )}
                              </button>
                            ) : (
                              <span className="small text-success font-weight-bold">
                                <i className="fas fa-check-circle mr-1"></i> Completed
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="fas fa-prescription-bottle-alt fa-3x text-gray-300 mb-3 d-block"></i>
                <h6 className="font-weight-bold text-gray-700">No Prescriptions in this Queue</h6>
                <p className="small text-muted mb-0">When doctors prescribe medications during consultation, they will appear here with pieces/bottles calculated.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Medication Inventory List */}
      {activeTab === 'inventory' && (
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex flex-wrap align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center mb-2 mb-md-0">
            <i className="fas fa-capsules mr-2"></i> Medication Inventory List
          </h6>

          <div className="d-flex align-items-center">
            <div className="custom-control custom-switch mr-3">
              <input
                type="checkbox"
                className="custom-control-input"
                id="lowStockToggle"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
              />
              <label className="custom-control-label small font-weight-bold" htmlFor="lowStockToggle">
                Low Stock Only
              </label>
            </div>

            <div className="input-group input-group-sm" style={{ width: '220px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search medication..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="input-group-append">
                <button className="btn btn-primary" type="button">
                  <i className="fas fa-search fa-sm"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="thead-light">
                <tr>
                  <th>Product SKU</th>
                  <th>Medication Name</th>
                  <th>Unit Price (₦)</th>
                  <th>Current Stock</th>
                  <th>Unit of Measure</th>
                  <th>Stock Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {drugs.length > 0 ? (
                  drugs.map((drug) => {
                    const isLow = (drug.stock || 0) <= (drug.low_stock_threshold || 10);
                    return (
                      <tr key={drug.id}>
                        <td className="font-weight-bold text-muted">{drug.product_id || `SKU-${drug.id}`}</td>
                        <td className="font-weight-bold text-primary">{drug.product_name}</td>
                        <td className="font-weight-bold">₦{Number(drug.price || 0).toLocaleString()}</td>
                        <td className={`font-weight-bold ${isLow ? 'text-danger' : 'text-dark'}`}>
                          {drug.stock}
                        </td>
                        <td>
                          <span className="badge badge-light border">{drug.minimum_UoM || 'units'}</span>
                        </td>
                        <td>
                          {isLow ? (
                            <span className="badge badge-danger">Reorder Needed</span>
                          ) : (
                            <span className="badge badge-success">Sufficient</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary py-0 px-2 mr-1"
                            onClick={() => handleDispense(drug)}
                            title="Dispense 1 unit"
                          >
                            <i className="fas fa-hand-holding-medical fa-xs mr-1"></i> Dispense
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No medication records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* Add Medication Modal */}
      {isAddModalOpen && (
        <>
          <div className="modal-backdrop-custom" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="card shadow modal-custom" style={{ maxWidth: '550px' }}>
            <div className="card-header py-3 bg-primary text-white d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold">
                <i className="fas fa-pills mr-2"></i> Add New Medication / Drug
              </h6>
              <button type="button" className="close text-white" onClick={() => setIsAddModalOpen(false)}>
                <span>&times;</span>
              </button>
            </div>
            <form onSubmit={handleCreateDrug}>
              <div className="card-body">
                <div className="form-group">
                  <label className="small font-weight-bold">Medication Name *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    placeholder="e.g. Amoxicillin 500mg, Paracetamol"
                    value={newDrug.product_name}
                    onChange={(e) => setNewDrug({ ...newDrug, product_name: e.target.value })}
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 form-group">
                    <label className="small font-weight-bold">SKU / Product ID</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. AMX500 (auto if empty)"
                      value={newDrug.product_id}
                      onChange={(e) => setNewDrug({ ...newDrug, product_id: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6 form-group">
                    <label className="small font-weight-bold">Unit of Measure</label>
                    <select
                      className="custom-select custom-select-sm"
                      value={newDrug.minimum_UoM}
                      onChange={(e) => setNewDrug({ ...newDrug, minimum_UoM: e.target.value })}
                    >
                      <option value="tablets">Tablets</option>
                      <option value="capsules">Capsules</option>
                      <option value="bottles">Bottles</option>
                      <option value="sachets">Sachets</option>
                      <option value="ampoules">Ampoules</option>
                      <option value="vial">Vial</option>
                      <option value="tubes">Tubes</option>
                      <option value="packs">Packs</option>
                      <option value="pieces">Pieces</option>
                    </select>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 form-group">
                    <label className="small font-weight-bold">Unit Price (₦) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control form-control-sm"
                      required
                      placeholder="e.g. 1500"
                      value={newDrug.price}
                      onChange={(e) => setNewDrug({ ...newDrug, price: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6 form-group">
                    <label className="small font-weight-bold">Stock Quantity *</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      required
                      placeholder="e.g. 100"
                      value={newDrug.stock}
                      onChange={(e) => setNewDrug({ ...newDrug, stock: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="small font-weight-bold">Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={newDrug.low_stock_threshold}
                    onChange={(e) => setNewDrug({ ...newDrug, low_stock_threshold: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="small font-weight-bold">Description / Usage</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Antibiotic for bacterial infections"
                    value={newDrug.description}
                    onChange={(e) => setNewDrug({ ...newDrug, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="card-footer bg-light d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mr-2"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <i className="fas fa-save mr-1"></i> Save to Database
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
