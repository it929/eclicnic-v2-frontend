import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function BillingsView({ onOpenNewPatient }) {
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [activeTab, setActiveTab] = useState('invoices');
  const [loading, setLoading] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    patient_name: '',
    hospital_number: '',
    product: '',
    price: '',
    qty: 1,
    payment_option: 'Cash',
  });

  const [patientsList, setPatientsList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  const loadBillings = async () => {
    try {
      setLoading(true);
      const [invRes, recRes, patRes] = await Promise.all([
        api.getInvoices(),
        api.getReceipts(),
        api.getPatients({ active: 1 })
      ]);
      setInvoices(invRes.results || invRes);
      setReceipts(recRes.results || recRes);
      setPatientsList(patRes.results || patRes);
    } catch (err) {
      console.error('Error fetching billings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillings();
  }, []);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        product: newInvoice.product,
        price: Number(newInvoice.price),
        qty: Number(newInvoice.qty || 1),
        payment_option: newInvoice.payment_option || 'Cash',
      };
      if (selectedPatientId) {
        payload.patient = Number(selectedPatientId);
      }
      await api.createInvoice(payload);
      setIsInvoiceModalOpen(false);
      setNewInvoice({
        patient_name: '',
        hospital_number: '',
        product: '',
        price: '',
        qty: 1,
        payment_option: 'Cash',
      });
      setSelectedPatientId('');
      loadBillings();
    } catch (err) {
      alert('Error creating invoice: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleMarkAsPaid = async (inv) => {
    try {
      await api.updateInvoice(inv.id, { completed: 1 });
      await api.createReceipt({
        patient: inv.patient,
        invoice_number: inv.invoice_number,
        total_price: Number(inv.price || 0) * Number(inv.qty || 1),
        payment_type: inv.payment_option || 'Cash',
        remarks: `Settlement for ${inv.product}`
      });
      loadBillings();
    } catch (err) {
      alert('Error recording payment: ' + (err.response?.data?.detail || err.message));
    }
  };

  const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.qty || 1)), 0);
  const totalReceipted = receipts.reduce((sum, r) => sum + Number(r.total_price || 0), 0);

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800 font-weight-bold">Billings & Financial Records</h1>
          <p className="text-muted small mb-0">Invoices, Receipts, and Patient Accounts</p>
        </div>
        <button className="btn btn-primary shadow-sm" onClick={() => setIsInvoiceModalOpen(true)}>
          <i className="fas fa-file-invoice-dollar mr-2"></i> Create New Bill / Invoice
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
                    Total Invoiced
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    ₦{totalInvoiced.toLocaleString()}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-file-invoice fa-2x text-gray-300"></i>
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
                    Total Receipts Collected
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    ₦{totalReceipted.toLocaleString()}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-receipt fa-2x text-gray-300"></i>
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
                    Pending Invoices
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {invoices.filter((i) => !i.completed).length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-hourglass-half fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <ul className="nav nav-pills card-header-pills">
            <li className="nav-item">
              <button
                className={`nav-link btn-sm ${activeTab === 'invoices' ? 'active' : ''}`}
                onClick={() => setActiveTab('invoices')}
              >
                <i className="fas fa-file-invoice mr-1"></i> Invoices ({invoices.length})
              </button>
            </li>
            <li className="nav-item ml-2">
              <button
                className={`nav-link btn-sm ${activeTab === 'receipts' ? 'active' : ''}`}
                onClick={() => setActiveTab('receipts')}
              >
                <i className="fas fa-receipt mr-1"></i> Receipts ({receipts.length})
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
          {activeTab === 'invoices' ? (
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>Invoice #</th>
                    <th>Patient Name</th>
                    <th>Hospital No.</th>
                    <th>Service / Item</th>
                    <th>Qty</th>
                    <th>Amount (₦)</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length > 0 ? (
                    invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="font-weight-bold text-primary">{inv.invoice_number || `INV-${inv.id}`}</td>
                        <td>{inv.patient_name || 'Patient'}</td>
                        <td className="text-danger font-weight-bold">{inv.hospital_number || '-'}</td>
                        <td>{inv.product}</td>
                        <td>{inv.qty || 1}</td>
                        <td className="font-weight-bold">₦{Number(inv.price || 0).toLocaleString()}</td>
                        <td>
                          {inv.completed ? (
                            <span className="badge badge-success">Paid</span>
                          ) : (
                            <span className="badge badge-warning">Pending Payment</span>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-sm btn-info py-0 px-2 mr-1" title="Print Bill">
                            <i className="fas fa-print fa-xs"></i>
                          </button>
                          {!inv.completed && (
                            <button
                              className="btn btn-sm btn-success py-0 px-2"
                              title="Generate Receipt / Mark Paid"
                              onClick={() => handleMarkAsPaid(inv)}
                            >
                              <i className="fas fa-check fa-xs mr-1"></i> Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-muted">
                        No invoice records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>Receipt #</th>
                    <th>Invoice #</th>
                    <th>Patient Name</th>
                    <th>Payment Method</th>
                    <th>Total Paid (₦)</th>
                    <th>Date Paid</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.length > 0 ? (
                    receipts.map((rec) => (
                      <tr key={rec.id}>
                        <td className="font-weight-bold text-success">{rec.receipt_number || `REC-${rec.id}`}</td>
                        <td className="text-primary">{rec.invoice_number || '-'}</td>
                        <td>{rec.patient_name || 'Patient'}</td>
                        <td>
                          <span className="badge badge-light border">{rec.payment_type || 'Cash'}</span>
                        </td>
                        <td className="font-weight-bold">₦{Number(rec.total_price || 0).toLocaleString()}</td>
                        <td>{rec.created_date ? new Date(rec.created_date).toLocaleDateString() : '-'}</td>
                        <td>
                          <button className="btn btn-sm btn-secondary py-0 px-2" title="Print Receipt">
                            <i className="fas fa-print fa-xs"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        No receipts generated yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Invoice Modal */}
      {isInvoiceModalOpen && (
        <>
          <div className="modal-backdrop-custom" onClick={() => setIsInvoiceModalOpen(false)}></div>
          <div className="card shadow modal-custom" style={{ maxWidth: '500px' }}>
            <div className="card-header py-3 bg-primary text-white d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold">
                <i className="fas fa-file-invoice mr-2"></i> Raise Patient Bill / Invoice
              </h6>
              <button type="button" className="close text-white" onClick={() => setIsInvoiceModalOpen(false)}>
                <span>&times;</span>
              </button>
            </div>
            <form onSubmit={handleCreateInvoice}>
              <div className="card-body">
                <div className="form-group">
                  <label className="small font-weight-bold">Select Registered Patient</label>
                  <select
                    className="custom-select custom-select-sm"
                    value={selectedPatientId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedPatientId(id);
                      const found = patientsList.find(p => String(p.id) === String(id));
                      if (found) {
                        setNewInvoice({
                          ...newInvoice,
                          patient_name: found.full_name || `${found.surname} ${found.first_name}`,
                          hospital_number: found.hospital_number || ''
                        });
                      }
                    }}
                  >
                    <option value="">-- Choose Patient (or enter below) --</option>
                    {patientsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || `${p.surname} ${p.first_name}`} ({p.hospital_number || 'No Hosp#'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="small font-weight-bold">Service / Medication Item</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    placeholder="e.g. Laboratory Test, Consultation, Pharmacy"
                    value={newInvoice.product}
                    onChange={(e) => setNewInvoice({ ...newInvoice, product: e.target.value })}
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 form-group">
                    <label className="small font-weight-bold">Amount (₦)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      required
                      placeholder="e.g. 5000"
                      value={newInvoice.price}
                      onChange={(e) => setNewInvoice({ ...newInvoice, price: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6 form-group">
                    <label className="small font-weight-bold">Quantity</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      min="1"
                      value={newInvoice.qty}
                      onChange={(e) => setNewInvoice({ ...newInvoice, qty: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="card-footer bg-light d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mr-2"
                  onClick={() => setIsInvoiceModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <i className="fas fa-check mr-1"></i> Create Invoice
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
