import React, { useState } from 'react';

export default function ReportingView({ initialCategory = 'ambulatory', initialReport = 'patients_reg' }) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedReport, setSelectedReport] = useState(initialReport);
  const [dateRange, setDateRange] = useState({ from: '2026-10-01', to: '2026-10-07' });
  const [searchFilter, setSearchFilter] = useState('');

  // Sample data for various reports
  const sampleAmbulatoryData = [
    { id: 1, hospital_no: '1111', name: 'Adewale Akeem Isola', gender: 'Male', age: 24, type: 'Private (Single)', regDate: '2026-10-01', createdBy: 'Tunde Laoye', status: 'Active' },
    { id: 2, hospital_no: '1112', name: 'Fatima Abubakar', gender: 'Female', age: 29, type: 'ANC Patient', regDate: '2026-10-02', createdBy: 'Nurse Desk 1', status: 'Active' },
    { id: 3, hospital_no: '1113', name: 'Chukwudi Eze', gender: 'Male', age: 41, type: 'HMO (Hygeia)', regDate: '2026-10-03', createdBy: 'Tunde Laoye', status: 'Active' },
    { id: 4, hospital_no: '1114', name: 'Bolanle Davies', gender: 'Female', age: 35, type: 'Private (Family)', regDate: '2026-10-04', createdBy: 'Tunde Laoye', status: 'Active' },
    { id: 5, hospital_no: '1115', name: 'Musa Garba', gender: 'Male', age: 52, type: 'Retainership', regDate: '2026-10-05', createdBy: 'Nurse Desk 2', status: 'Active' },
  ];

  const sampleBillingData = [
    { id: 'INV-2026-001', date: '2026-10-01', patient: 'Adewale Akeem Isola', item: 'General Consultation', amount: 5000, paid: 5000, balance: 0, status: 'Paid', paymentMethod: 'Cash' },
    { id: 'INV-2026-002', date: '2026-10-02', patient: 'Fatima Abubakar', item: 'ANC Booking & Scan', amount: 15000, paid: 15000, balance: 0, status: 'Paid', paymentMethod: 'POS' },
    { id: 'INV-2026-003', date: '2026-10-03', patient: 'Chukwudi Eze', item: 'Laboratory Profile', amount: 8500, paid: 0, balance: 8500, status: 'Unprocessed (HMO)', paymentMethod: 'HMO Claim' },
    { id: 'INV-2026-004', date: '2026-10-05', patient: 'Bolanle Davies', item: 'Ward Admission & Meds', amount: 35000, paid: 20000, balance: 15000, status: 'Partially Cleared', paymentMethod: 'Transfer' },
    { id: 'INV-2026-005', date: '2026-10-06', patient: 'Musa Garba', item: 'Pharmacy Prescription', amount: 12400, paid: 12400, balance: 0, status: 'Paid', paymentMethod: 'POS' },
  ];

  const sampleInventoryData = [
    { code: 'MED-004', name: 'Omeprazole 20mg Capsules', category: 'Gastrointestinal', currentStock: 15, reorderLevel: 40, status: 'Low Stock', lastRestocked: '2026-09-15', supplier: 'Chi Pharmaceuticals' },
    { code: 'MED-002', name: 'Amoxicillin 500mg Capsules', category: 'Antibiotics', currentStock: 85, reorderLevel: 100, status: 'Short-Dated (Dec 2026)', lastRestocked: '2026-08-20', supplier: 'May & Baker' },
    { code: 'MED-008', name: 'Artemether + Lumefantrine', category: 'Anti-malaria', currentStock: 0, reorderLevel: 50, status: 'Out of Stock', lastRestocked: '2026-07-10', supplier: 'Fidson Healthcare' },
    { code: 'MED-001', name: 'Paracetamol 500mg Tablets', category: 'Analgesics', currentStock: 450, reorderLevel: 100, status: 'Adequate', lastRestocked: '2026-10-01', supplier: 'May & Baker' },
    { code: 'MED-005', name: 'Normal Saline 0.9% 500ml', category: 'IV Fluids', currentStock: 120, reorderLevel: 30, status: 'Adequate', lastRestocked: '2026-09-28', supplier: 'Chi Pharmaceuticals' },
  ];

  const handleExportCSV = () => {
    alert(`Exporting "${selectedReport}" data as CSV format...`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container-fluid">
      {/* Page Title */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800 font-weight-bold">
            <i className="fas fa-chart-line text-primary mr-2"></i> Comprehensive Hospital Reporting Window
          </h1>
          <p className="text-muted small mb-0">Auditing, financial analytics, clinical attendance & inventory consumption reports</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-outline-secondary btn-sm shadow-sm" onClick={handlePrint}>
            <i className="fas fa-print mr-1"></i> Print Report
          </button>
          <button className="btn btn-success btn-sm shadow-sm ml-2" onClick={handleExportCSV}>
            <i className="fas fa-file-excel mr-1"></i> Export to Excel
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Header */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Registrations</div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">5 Patients</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-user-plus fa-2x text-gray-300"></i>
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
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">Period Invoiced Total</div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">₦75,900</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-coins fa-2x text-gray-300"></i>
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
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">Collections & Receipts</div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">₦52,400</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-cash-register fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">Stock Attention Items</div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">3 Items</div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-boxes fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Reporting Card */}
      <div className="card shadow mb-4">
        {/* Navigation Tabs */}
        <div className="card-header py-3 bg-light border-bottom">
          <div className="d-flex flex-wrap justify-content-between align-items-center">
            <ul className="nav nav-pills card-header-pills mb-2 mb-md-0">
              <li className="nav-item">
                <button
                  className={`nav-link font-weight-bold ${selectedCategory === 'ambulatory' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory('ambulatory');
                    setSelectedReport('patients_reg');
                  }}
                >
                  <i className="fas fa-users mr-1"></i> Ambulatory Reports
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link font-weight-bold ${selectedCategory === 'billing' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory('billing');
                    setSelectedReport('invoices');
                  }}
                >
                  <i className="fas fa-file-invoice-dollar mr-1"></i> Billing Reports
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link font-weight-bold ${selectedCategory === 'inventory' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory('inventory');
                    setSelectedReport('stock_analysis');
                  }}
                >
                  <i className="fas fa-prescription-bottle-alt mr-1"></i> Pharmacy & Inventory
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link font-weight-bold ${selectedCategory === 'others' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory('others');
                    setSelectedReport('appointments');
                  }}
                >
                  <i className="fas fa-calendar-check mr-1"></i> Appointments Reports
                </button>
              </li>
            </ul>

            {/* Date Filters */}
            <div className="d-flex align-items-center">
              <div className="d-flex align-items-center mr-2">
                <span className="small text-muted mr-1 font-weight-bold">From:</span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                />
              </div>
              <div className="d-flex align-items-center">
                <span className="small text-muted mr-1 font-weight-bold">To:</span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card-body">
          {/* Sub-report selector buttons */}
          <div className="mb-4 pb-3 border-bottom d-flex flex-wrap align-items-center justify-content-between">
            <div className="btn-group btn-group-sm mb-2 mb-md-0">
              {selectedCategory === 'ambulatory' && (
                <>
                  <button
                    className={`btn ${selectedReport === 'patients_reg' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedReport('patients_reg')}
                  >
                    Patients Registration Report
                  </button>
                  <button
                    className={`btn ${selectedReport === 'visits' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedReport('visits')}
                  >
                    Visit & Consultation Report
                  </button>
                  <button
                    className={`btn ${selectedReport === 'admissions' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedReport('admissions')}
                  >
                    IPD Admission Report
                  </button>
                  <button
                    className={`btn ${selectedReport === 'deactivated' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedReport('deactivated')}
                  >
                    Deactivated Patients
                  </button>
                </>
              )}

              {selectedCategory === 'billing' && (
                <>
                  <button
                    className={`btn ${selectedReport === 'invoices' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedReport('invoices')}
                  >
                    Billing Invoice Listing
                  </button>
                  <button
                    className={`btn ${selectedReport === 'exceptions' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedReport('exceptions')}
                  >
                    Exception Bills Report
                  </button>
                  <button
                    className={`btn ${selectedReport === 'cancelled' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedReport('cancelled')}
                  >
                    Cancelled Bills Report
                  </button>
                  <button
                    className={`btn ${selectedReport === 'transaction_book' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedReport('transaction_book')}
                  >
                    Complete Transaction Book
                  </button>
                </>
              )}

              {selectedCategory === 'inventory' && (
                <>
                  <button
                    className={`btn ${selectedReport === 'stock_analysis' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedReport('stock_analysis')}
                  >
                    Stock Analysis Report
                  </button>
                  <button
                    className={`btn ${selectedReport === 'low_stock' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedReport('low_stock')}
                  >
                    Low Stock & Short-Dated
                  </button>
                  <button
                    className={`btn ${selectedReport === 'requisitions' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedReport('requisitions')}
                  >
                    Requisitions Detail
                  </button>
                  <button
                    className={`btn ${selectedReport === 'vendors' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedReport('vendors')}
                  >
                    Vendors & Expenses
                  </button>
                </>
              )}

              {selectedCategory === 'others' && (
                <button className="btn btn-primary">
                  All Appointments Reports
                </button>
              )}
            </div>

            {/* Quick search input */}
            <div style={{ maxWidth: '300px' }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Filter current report results..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Report Content Table */}
          {selectedCategory === 'ambulatory' && (
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>#</th>
                    <th>Hospital No</th>
                    <th>Patient Full Name</th>
                    <th>Gender</th>
                    <th>Age</th>
                    <th>Patient Category / Plan</th>
                    <th>Registration Date</th>
                    <th>Staff Officer</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleAmbulatoryData
                    .filter((p) => p.name.toLowerCase().includes(searchFilter.toLowerCase()) || p.hospital_no.includes(searchFilter))
                    .map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td><strong>{item.hospital_no}</strong></td>
                        <td className="font-weight-bold text-dark">{item.name}</td>
                        <td>{item.gender}</td>
                        <td>{item.age} yrs</td>
                        <td><span className="badge badge-light border">{item.type}</span></td>
                        <td>{item.regDate}</td>
                        <td>{item.createdBy}</td>
                        <td><span className="badge badge-success">{item.status}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedCategory === 'billing' && (
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Patient Name</th>
                    <th>Service / Item</th>
                    <th>Amount (₦)</th>
                    <th>Paid (₦)</th>
                    <th>Balance (₦)</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleBillingData
                    .filter((b) => b.patient.toLowerCase().includes(searchFilter.toLowerCase()) || b.id.includes(searchFilter))
                    .map((inv) => (
                      <tr key={inv.id}>
                        <td><strong>{inv.id}</strong></td>
                        <td>{inv.date}</td>
                        <td className="font-weight-bold text-dark">{inv.patient}</td>
                        <td>{inv.item}</td>
                        <td className="font-weight-bold">₦{inv.amount.toLocaleString()}</td>
                        <td className="text-success font-weight-bold">₦{inv.paid.toLocaleString()}</td>
                        <td className={inv.balance > 0 ? 'text-danger font-weight-bold' : 'text-muted'}>
                          ₦{inv.balance.toLocaleString()}
                        </td>
                        <td><span className="badge badge-info">{inv.paymentMethod}</span></td>
                        <td>
                          <span
                            className={`badge ${
                              inv.status === 'Paid'
                                ? 'badge-success'
                                : inv.status.includes('Partially')
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedCategory === 'inventory' && (
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>Code</th>
                    <th>Item / Medication Name</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Reorder Level</th>
                    <th>Stock Health</th>
                    <th>Last Restocked</th>
                    <th>Vendor</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleInventoryData
                    .filter((i) => i.name.toLowerCase().includes(searchFilter.toLowerCase()) || i.code.includes(searchFilter))
                    .map((item) => (
                      <tr key={item.code}>
                        <td><strong>{item.code}</strong></td>
                        <td className="font-weight-bold text-dark">{item.name}</td>
                        <td>{item.category}</td>
                        <td><strong>{item.currentStock}</strong></td>
                        <td>{item.reorderLevel}</td>
                        <td>
                          <span
                            className={`badge ${
                              item.status === 'Adequate'
                                ? 'badge-success'
                                : item.status === 'Low Stock'
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td>{item.lastRestocked}</td>
                        <td>{item.supplier}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedCategory === 'others' && (
            <div className="p-4 text-center bg-light rounded">
              <i className="fas fa-calendar-alt fa-3x text-primary mb-3"></i>
              <h5 className="font-weight-bold text-dark">Appointments Activity Log & Summaries</h5>
              <p className="text-muted small">No scheduled appointments cancelled or flagged within the selected date window.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
