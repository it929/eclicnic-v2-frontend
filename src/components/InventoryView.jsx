import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function InventoryView({ initialSubmodule = 'view' }) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubmodule);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [inventoryList, setInventoryList] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [requisitions, setRequisitions] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, trfRes, reqRes] = await Promise.all([
        api.getInventoryProducts().catch(() => []),
        api.getInventoryTransfers().catch(() => []),
        api.getInventoryRequisitions().catch(() => []),
      ]);
      setInventoryList(Array.isArray(prodRes) ? prodRes : prodRes?.results || []);
      setTransfers(Array.isArray(trfRes) ? trfRes : trfRes?.results || []);
      setRequisitions(Array.isArray(reqRes) ? reqRes : reqRes?.results || []);
    } catch (err) {
      console.error('Error fetching inventory from database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Vendors
  const [vendors] = useState([
    { id: 1, name: 'Chi Pharmaceuticals Ltd', contact: '+234 803 111 2233', email: 'orders@chipharm.com', products: 'Antibiotics, IV Fluids', status: 'Active' },
    { id: 2, name: 'May & Baker Nigeria Plc', contact: '+234 802 333 4455', email: 'sales@may-baker.com', products: 'Analgesics, Anti-malaria', status: 'Active' },
    { id: 3, name: 'Fidson Healthcare Plc', contact: '+234 809 777 8899', email: 'supply@fidson.com', products: 'Gastrointestinal, Syrups', status: 'Active' },
  ]);

  // New Transfer form state
  const [newTransfer, setNewTransfer] = useState({
    target: 'IPD Pharmacy 1',
    productId: '',
    qty: 1,
    note: '',
  });

  const handleSimulateScan = () => {
    if (!scannedCode) return;
    const found = inventoryList.find(
      (item) =>
        (item.product_id && item.product_id.toLowerCase() === scannedCode.trim().toLowerCase()) ||
        (item.product_name && item.product_name.toLowerCase().includes(scannedCode.trim().toLowerCase()))
    );
    if (found) {
      setScanResult(found);
    } else {
      setScanResult({ error: `No inventory product found matching "${scannedCode}"` });
    }
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    const item = inventoryList.find((i) => i.id === Number(newTransfer.productId));
    if (!item) {
      alert('Please select a valid inventory product.');
      return;
    }
    if (item.stock < Number(newTransfer.qty)) {
      alert(`Insufficient stock! Available: ${item.stock}`);
      return;
    }

    try {
      await api.createInventoryTransfer({
        product: item.id,
        quantity: Number(newTransfer.qty),
        destination: newTransfer.target,
        transaction_type: 'Transfer',
      });
      setIsTransferModalOpen(false);
      loadData();
      alert(`Transfer of ${newTransfer.qty} to ${newTransfer.target} created and saved to database!`);
    } catch (err) {
      alert('Error creating transfer: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleApproveRequisition = async (reqId) => {
    try {
      await api.updateInventoryRequisition(reqId, { status: 1 });
      loadData();
    } catch (err) {
      alert('Error approving requisition: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filteredInventory = inventoryList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = inventoryList.filter((item) => item.stock <= item.reorderLevel).length;

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800 font-weight-bold">
            <i className="fas fa-boxes text-warning mr-2"></i> Inventory & Supply Chain Management
          </h1>
          <p className="text-muted small mb-0">Central store operations, warehouse stock, hospital-wide requisitions & transfers</p>
        </div>
        <div className="btn-group">
          <button
            className="btn btn-warning text-dark font-weight-bold shadow-sm"
            onClick={() => setIsTransferModalOpen(true)}
          >
            <i className="fas fa-dolly mr-1"></i> New Transfer
          </button>
          <button
            className="btn btn-info shadow-sm ml-2"
            onClick={() => setIsScanModalOpen(true)}
          >
            <i className="fas fa-barcode mr-1"></i> Scan Barcode
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Stock Items</div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{inventoryList.length}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-boxes fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-danger shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">Low Stock Alerts</div>
                  <div className="h5 mb-0 font-weight-bold text-danger">{lowStockCount}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-exclamation-triangle fa-2x text-danger"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">Pending Requisitions</div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {requisitions.filter((r) => r.status.includes('Pending')).length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-clipboard-check fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">Active Transfers</div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">{transfers.length}</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-truck-moving fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 bg-light border-bottom">
          <ul className="nav nav-pills card-header-pills">
            <li className="nav-item">
              <button
                className={`nav-link font-weight-bold ${activeSubTab === 'view' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('view')}
              >
                <i className="fas fa-list mr-1"></i> Stock Inventory
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link font-weight-bold ${activeSubTab === 'transfers' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('transfers')}
              >
                <i className="fas fa-exchange-alt mr-1"></i> Department Transfers
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link font-weight-bold ${activeSubTab === 'requisitions' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('requisitions')}
              >
                <i className="fas fa-file-invoice mr-1"></i> Requisitions
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link font-weight-bold ${activeSubTab === 'vendors' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('vendors')}
              >
                <i className="fas fa-building mr-1"></i> Registered Vendors
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
          {/* SubTab 1: Stock Inventory */}
          {activeSubTab === 'view' && (
            <div>
              <div className="row mb-3 align-items-center">
                <div className="col-md-5">
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0">
                        <i className="fas fa-search text-muted"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0"
                      placeholder="Search product code, name, category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <select
                    className="custom-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    <option value="Analgesics">Analgesics</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Gastrointestinal">Gastrointestinal</option>
                    <option value="IV Fluids">IV Fluids</option>
                    <option value="Consumables">Consumables</option>
                  </select>
                </div>
                <div className="col-md-3 text-right">
                  <span className="badge badge-secondary p-2">Showing {filteredInventory.length} items</span>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="thead-light">
                    <tr>
                      <th>Product Code</th>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Current Stock</th>
                      <th>Unit</th>
                      <th>Cost Price</th>
                      <th>Selling Price</th>
                      <th>Expiry</th>
                      <th>Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => {
                      const isLow = item.stock <= item.reorderLevel;
                      return (
                        <tr key={item.id} className={isLow ? 'table-warning' : ''}>
                          <td><strong>{item.code}</strong></td>
                          <td className="font-weight-bold text-dark">{item.name}</td>
                          <td><span className="badge badge-light border">{item.category}</span></td>
                          <td>
                            <strong className={isLow ? 'text-danger' : 'text-success'}>
                              {item.stock}
                            </strong>
                          </td>
                          <td>{item.unit}</td>
                          <td>₦{item.costPrice.toLocaleString()}</td>
                          <td>₦{item.sellingPrice.toLocaleString()}</td>
                          <td>{item.expiryDate}</td>
                          <td><small className="text-muted">{item.location}</small></td>
                          <td>
                            {isLow ? (
                              <span className="badge badge-danger">Low Stock</span>
                            ) : (
                              <span className="badge badge-success">In Stock</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubTab 2: Department Transfers */}
          {activeSubTab === 'transfers' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="font-weight-bold text-gray-800 mb-0">Inter-Department Product Transfers</h5>
                <button className="btn btn-primary btn-sm" onClick={() => setIsTransferModalOpen(true)}>
                  <i className="fas fa-plus mr-1"></i> New Transfer Dispatch
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered table-striped">
                  <thead className="thead-light">
                    <tr>
                      <th>Transfer ID</th>
                      <th>Date</th>
                      <th>Destination Store</th>
                      <th>Product Dispatched</th>
                      <th>Quantity</th>
                      <th>Initiated By</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t) => (
                      <tr key={t.id}>
                        <td><strong>{t.id}</strong></td>
                        <td>{t.date}</td>
                        <td><span className="badge badge-info">{t.target}</span></td>
                        <td>{t.product}</td>
                        <td><strong>{t.qty}</strong></td>
                        <td>{t.initiatedBy}</td>
                        <td>
                          <span className={`badge ${t.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubTab 3: Requisitions */}
          {activeSubTab === 'requisitions' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="font-weight-bold text-gray-800 mb-0">Store Requisitions from Units</h5>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="thead-light">
                    <tr>
                      <th>Req Code</th>
                      <th>Date</th>
                      <th>Requesting Department</th>
                      <th>Item Requested</th>
                      <th>Requested Qty</th>
                      <th>Urgency</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requisitions.map((req) => (
                      <tr key={req.id}>
                        <td><strong>{req.id}</strong></td>
                        <td>{req.date}</td>
                        <td><span className="badge badge-primary">{req.fromDept}</span></td>
                        <td>{req.product}</td>
                        <td>{req.requestedQty}</td>
                        <td>
                          <span
                            className={`badge ${
                              req.urgency === 'High' ? 'badge-danger' : req.urgency === 'Medium' ? 'badge-warning' : 'badge-secondary'
                            }`}
                          >
                            {req.urgency}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-light border font-weight-bold">{req.status}</span>
                        </td>
                        <td>
                          {req.status === 'Pending Approval' || req.status === 0 ? (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleApproveRequisition(req.id)}
                            >
                              Approve
                            </button>
                          ) : (
                            <span className="text-muted small">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubTab 4: Vendors */}
          {activeSubTab === 'vendors' && (
            <div>
              <h5 className="font-weight-bold text-gray-800 mb-3">Accredited Pharmaceutical & Supply Vendors</h5>
              <div className="table-responsive">
                <table className="table table-bordered table-striped">
                  <thead className="thead-light">
                    <tr>
                      <th>#</th>
                      <th>Vendor / Supplier Name</th>
                      <th>Contact Phone</th>
                      <th>Email Address</th>
                      <th>Product Categories Supplied</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v) => (
                      <tr key={v.id}>
                        <td>{v.id}</td>
                        <td className="font-weight-bold text-primary">{v.name}</td>
                        <td>{v.contact}</td>
                        <td>{v.email}</td>
                        <td>{v.products}</td>
                        <td><span className="badge badge-success">{v.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Transfer */}
      {isTransferModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title font-weight-bold">
                  <i className="fas fa-dolly mr-2"></i> Dispatch Product Transfer
                </h5>
                <button type="button" className="close" onClick={() => setIsTransferModalOpen(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleCreateTransfer}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="font-weight-bold">Target Department Store</label>
                    <select
                      className="form-control"
                      value={newTransfer.target}
                      onChange={(e) => setNewTransfer({ ...newTransfer, target: e.target.value })}
                    >
                      <option value="IPD Pharmacy 1">IPD Pharmacy 1</option>
                      <option value="IPD Pharmacy 2">IPD Pharmacy 2</option>
                      <option value="IPD Pharmacy 3">IPD Pharmacy 3</option>
                      <option value="OPD Pharmacy 1">OPD Pharmacy 1</option>
                      <option value="OPD Pharmacy 2">OPD Pharmacy 2</option>
                      <option value="Laboratory">Laboratory</option>
                      <option value="Radiology">Radiology</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="font-weight-bold">Select Inventory Item</label>
                    <select
                      className="form-control"
                      value={newTransfer.productId}
                      onChange={(e) => setNewTransfer({ ...newTransfer, productId: e.target.value })}
                    >
                      {inventoryList.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} - {item.name} (Stock: {item.stock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="font-weight-bold">Quantity to Transfer</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      required
                      value={newTransfer.qty}
                      onChange={(e) => setNewTransfer({ ...newTransfer, qty: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Transfer Notes / Reason</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="e.g. Weekly replenishment for inpatient ward floor 1"
                      value={newTransfer.note}
                      onChange={(e) => setNewTransfer({ ...newTransfer, note: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsTransferModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning text-dark font-weight-bold">
                    <i className="fas fa-check mr-1"></i> Confirm Dispatch
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Barcode Scan Simulator */}
      {isScanModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title font-weight-bold">
                  <i className="fas fa-barcode mr-2"></i> Inventory Barcode Scanner
                </h5>
                <button type="button" className="close text-white" onClick={() => setIsScanModalOpen(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body text-center">
                <div className="p-3 bg-light rounded mb-3 border">
                  <i className="fas fa-qrcode fa-4x text-info mb-2"></i>
                  <p className="text-muted small mb-0">Enter or scan product barcode or product code (e.g. MED-001, MED-002)</p>
                </div>
                <div className="input-group mb-3">
                  <input
                    type="text"
                    className="form-control form-control-lg text-center font-weight-bold"
                    placeholder="Scan or enter code..."
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSimulateScan()}
                    autoFocus
                  />
                  <div className="input-group-append">
                    <button className="btn btn-info font-weight-bold px-4" onClick={handleSimulateScan}>
                      Scan
                    </button>
                  </div>
                </div>

                {scanResult && (
                  <div className="mt-3 text-left">
                    {scanResult.error ? (
                      <div className="alert alert-danger">{scanResult.error}</div>
                    ) : (
                      <div className="card border-success">
                        <div className="card-header bg-success text-white py-2 font-weight-bold">
                          Product Found!
                        </div>
                        <div className="card-body">
                          <h5 className="font-weight-bold text-dark">{scanResult.name}</h5>
                          <p className="mb-1"><strong>Code:</strong> {scanResult.code}</p>
                          <p className="mb-1"><strong>Category:</strong> {scanResult.category}</p>
                          <p className="mb-1"><strong>Stock:</strong> {scanResult.stock} {scanResult.unit}</p>
                          <p className="mb-1"><strong>Selling Price:</strong> ₦{scanResult.sellingPrice}</p>
                          <p className="mb-0"><strong>Location:</strong> {scanResult.location}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsScanModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
