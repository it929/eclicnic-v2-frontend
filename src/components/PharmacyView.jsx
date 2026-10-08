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

  const lowStockCount = drugs.filter((d) => (d.stock || 0) <= (d.low_stock_threshold || 10)).length;

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800 font-weight-bold">Pharmacy & Medication Store</h1>
          <p className="text-muted small mb-0">Dispensing, stock tracking, and prescription management</p>
        </div>
        <button className="btn btn-primary shadow-sm" onClick={() => setIsAddModalOpen(true)}>
          <i className="fas fa-plus mr-1"></i> Add Medication
        </button>
      </div>

      {/* Metric Cards */}
      <div className="row">
        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Catalog Items
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{drugs.length}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-pills fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                    Low Stock Alerts
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{lowStockCount}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-exclamation-triangle fa-2x text-danger"></i>
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
                    Prescriptions Dispensed Today
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">18</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-check-circle fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drugs Table Card */}
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
