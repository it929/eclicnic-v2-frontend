import React from 'react';

export default function Dashboard({
  stats,
  categories,
  onOpenNewPatient,
  onViewPatients,
  onViewQueues,
  recentPatients = [],
  onSelectPatient,
  currentRole,
  selectedDepartment,
}) {
  const cards = [
    {
      title: 'Private Patients',
      value: stats?.private_patients ?? 0,
      borderClass: 'border-left-primary',
      textClass: 'text-primary',
      icon: 'fas fa-clipboard-list',
    },
    {
      title: 'ANC Patients',
      value: stats?.anc_patients ?? 0,
      borderClass: 'border-left-success',
      textClass: 'text-success',
      icon: 'fas fa-baby',
    },
    {
      title: 'HMO Patients',
      value: stats?.hmo_patients ?? 0,
      borderClass: 'border-left-info',
      textClass: 'text-info',
      icon: 'fas fa-id-card',
    },
    {
      title: 'Retainership Patients',
      value: stats?.retainership_patients ?? 0,
      borderClass: 'border-left-warning',
      textClass: 'text-warning',
      icon: 'fas fa-building',
    },
    {
      title: 'Active Patients',
      value: stats?.active_patients ?? 0,
      borderClass: 'border-left-primary',
      textClass: 'text-primary',
      icon: 'fas fa-user-check',
    },
    {
      title: 'Deactivated Patients',
      value: stats?.inactive_patients ?? 0,
      borderClass: 'border-left-danger',
      textClass: 'text-danger',
      icon: 'fas fa-user-slash',
    },
    {
      title: 'Queue / Waiting List',
      value: stats?.nurse_queue_count ?? 0,
      borderClass: 'border-left-warning',
      textClass: 'text-warning',
      icon: 'fas fa-procedures',
      badge: stats?.nurse_queue_count > 0 ? 'In Queue' : null,
      onClick: onViewQueues,
    },
    {
      title: "Today's Appointments",
      value: stats?.today_appointments ?? 0,
      borderClass: 'border-left-info',
      textClass: 'text-info',
      icon: 'fas fa-calendar-check',
    },
  ];

  const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.substring(0, 2) || 'PT').toUpperCase();
  };

  const getCategoryBadgeClass = (categoryName = '') => {
    const cat = categoryName.toLowerCase();
    if (cat.includes('hmo')) return 'badge-category-hmo';
    if (cat.includes('private')) return 'badge-category-private';
    if (cat.includes('anc')) return 'badge-category-anc';
    if (cat.includes('retainer')) return 'badge-category-retainer';
    return 'badge-light border';
  };

  const isNursing = (selectedDepartment === 'nursing') || (currentRole?.toLowerCase().includes('nurse'));
  const isClinical = (selectedDepartment === 'clinical') || (currentRole?.toLowerCase().includes('clin') || currentRole?.toLowerCase().includes('doc'));
  const isInventory = (selectedDepartment === 'inventory') || (currentRole?.toLowerCase().includes('inv'));
  const isPharmacy = selectedDepartment?.includes('pharm') || selectedDepartment?.includes('ipd') || selectedDepartment?.includes('opd') || currentRole?.toLowerCase().includes('pharm');

  let pageTitle = 'Front Desk & Clinical Overview';
  let pageIcon = 'fa-hospital-user';
  let pageSubtitle = 'Live hospital management dashboard powered by Django REST API';

  if (isNursing) {
    pageTitle = 'Nursing Station & Clinical Overview';
    pageIcon = 'fa-user-nurse';
    pageSubtitle = 'Nurse triage, patient waiting lists, vital signs, and ward admissions';
  } else if (isClinical) {
    pageTitle = 'Clinical Consultations Overview';
    pageIcon = 'fa-user-md';
    pageSubtitle = 'Doctor consultations, lab/radiology results, and medical diagnoses';
  } else if (isInventory) {
    pageTitle = 'Inventory & Supply Chain Overview';
    pageIcon = 'fa-boxes';
    pageSubtitle = 'Hospital supplies, pharmacy product transfers, and requisition status';
  } else if (isPharmacy) {
    pageTitle = 'Pharmacy Operations Overview';
    pageIcon = 'fa-pills';
    pageSubtitle = 'Prescription fulfillment, medication stocks, and drug dispensing';
  }

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-1 text-gray-800 font-weight-bold">
            <i className={`fas ${pageIcon} text-primary mr-2`}></i>
            {pageTitle}
          </h1>
          <p className="text-muted small mb-0">
            {pageSubtitle}
          </p>
        </div>
        <div className="mt-3 mt-sm-0 d-flex flex-wrap align-items-center">
          <button
            className="btn btn-sm btn-primary shadow-sm mr-2 mb-1 font-weight-bold"
            onClick={onOpenNewPatient}
          >
            <i className="fas fa-user-plus fa-sm text-white-50 mr-1"></i> Register New Patient
          </button>
          <button
            className="btn btn-sm btn-outline-secondary shadow-sm mb-1 font-weight-bold"
            onClick={onViewQueues}
          >
            <i className="fas fa-list-ol fa-sm mr-1"></i> View Queues
            {stats?.nurse_queue_count > 0 && (
              <span className="badge badge-warning text-dark ml-2">
                {stats.nurse_queue_count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content Row - 8 Stat Cards */}
      <div className="row">
        {cards.map((card, idx) => (
          <div key={idx} className="col-xl-3 col-md-6 mb-4">
            <div
              className={`card ${card.borderClass} shadow h-100 py-2 stat-card-hover ${
                card.onClick ? 'cursor-pointer' : ''
              }`}
              onClick={card.onClick}
            >
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div
                      className={`text-xs font-weight-bold ${card.textClass} text-uppercase mb-1 d-flex align-items-center justify-content-between`}
                    >
                      <span>{card.title}</span>
                      {card.badge && (
                        <span className="badge badge-warning text-dark font-weight-bold">
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {Number(card.value).toLocaleString()}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className={`${card.icon} fa-2x text-gray-300`}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Categories Breakdown & Recent Patients */}
      <div className="row">
        {/* Patient Categories Card */}
        <div className="col-xl-4 col-lg-5 mb-4">
          <div className="card shadow mb-4 h-100">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-chart-pie mr-1"></i> Patient Categories
              </h6>
              <span className="badge badge-light border text-muted">
                {stats?.total_patients ?? 0} Total
              </span>
            </div>
            <div className="card-body d-flex flex-column justify-content-between">
              <div>
                {categories && categories.length > 0 ? (
                  categories.map((cat, idx) => {
                    const total = stats?.total_patients || 1;
                    const count = cat.patient_count || 0;
                    const pct = Math.round((count / total) * 100);
                    const colors = [
                      'bg-primary',
                      'bg-success',
                      'bg-info',
                      'bg-warning',
                      'bg-danger',
                    ];
                    const color = colors[idx % colors.length];

                    return (
                      <div key={cat.id || idx} className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="small font-weight-bold text-gray-800">
                            {cat.category}
                          </span>
                          <span className="small text-muted">
                            <strong>{count}</strong> ({pct}%)
                          </span>
                        </div>
                        <div className="progress progress-sm" style={{ height: '8px' }}>
                          <div
                            className={`progress-bar ${color}`}
                            role="progressbar"
                            style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                            aria-valuenow={pct}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted small text-center py-3">
                    No category breakdown data available.
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-top">
                <div className="d-flex justify-content-between small text-muted mb-3">
                  <span>
                    <i className="fas fa-circle text-success mr-1"></i>
                    Active: <strong>{stats?.active_patients ?? 0}</strong>
                  </span>
                  <span>
                    <i className="fas fa-circle text-danger mr-1"></i>
                    Deactivated: <strong>{stats?.inactive_patients ?? 0}</strong>
                  </span>
                </div>

                <button
                  className="btn btn-outline-primary btn-sm btn-block font-weight-bold"
                  onClick={onViewPatients}
                >
                  <i className="fas fa-users mr-1"></i> Browse Full Patient Directory
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Patients Table */}
        <div className="col-xl-8 col-lg-7 mb-4">
          <div className="card shadow mb-4 h-100">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-user-clock mr-1"></i> Recently Registered Patients
              </h6>
              <button
                className="btn btn-sm btn-link text-primary font-weight-bold p-0"
                onClick={onViewPatients}
              >
                View All &rarr;
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-items-center mb-0" width="100%">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ fontSize: '0.8rem' }}>Patient Name</th>
                      <th style={{ fontSize: '0.8rem' }}>Hospital No.</th>
                      <th style={{ fontSize: '0.8rem' }}>Phone</th>
                      <th style={{ fontSize: '0.8rem' }}>Category</th>
                      <th style={{ fontSize: '0.8rem' }}>Plan</th>
                      <th className="text-right" style={{ fontSize: '0.8rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients && recentPatients.length > 0 ? (
                      recentPatients.map((p) => {
                        const fullName =
                          p.full_name ||
                          `${p.surname || ''} ${p.first_name || ''}`.trim() ||
                          'Unnamed Patient';
                        const initials = getInitials(fullName);
                        const catBadge = getCategoryBadgeClass(p.category_name || '');

                        return (
                          <tr
                            key={p.id}
                            className="cursor-pointer"
                            onClick={() => onSelectPatient && onSelectPatient(p)}
                            title="Click to view patient details"
                          >
                            <td className="font-weight-bold text-primary align-middle">
                              <div className="d-flex align-items-center">
                                <span className="avatar-initials mr-2">{initials}</span>
                                <span>{fullName}</span>
                              </div>
                            </td>
                            <td className="align-middle">
                              <span className="hospital-badge">
                                {p.hospital_number || '-'}
                              </span>
                            </td>
                            <td className="align-middle small text-gray-700">
                              {p.phone_number || '-'}
                            </td>
                            <td className="align-middle">
                              <span className={`badge px-2 py-1 ${catBadge}`}>
                                {p.category_name || '-'}
                              </span>
                            </td>
                            <td className="align-middle small text-muted">
                              {p.plan_name || '-'}
                            </td>
                            <td className="align-middle text-right">
                              <button
                                className="btn btn-sm btn-light border text-primary font-weight-bold py-1 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSelectPatient) {
                                    onSelectPatient(p);
                                  } else if (onViewPatients) {
                                    onViewPatients();
                                  }
                                }}
                                title="Open patient profile"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">
                          <i className="fas fa-folder-open fa-2x text-gray-300 d-block mb-2"></i>
                          No patients found. Click &ldquo;Register New Patient&rdquo; to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
