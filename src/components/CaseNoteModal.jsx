import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function CaseNoteModal({ isOpen, patient, onClose }) {
  const [activeTab, setActiveTab] = useState('clinical'); // 'clinical' | 'legacy'
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [caseNoteData, setCaseNoteData] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('all');
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const iframeRef = useRef(null);

  const patientId = patient?.id || patient?.patient_id || patient?.patient;
  const token = localStorage.getItem('clinic365_token');
  const caseNoteUrl = patientId
    ? token
      ? `/case_note/${patientId}/?token=${token}`
      : `/case_note/${patientId}/`
    : '';

  useEffect(() => {
    if (isOpen && patientId) {
      loadCaseNoteData();
    }
  }, [isOpen, patientId]);

  const loadCaseNoteData = async () => {
    try {
      setIsLoadingData(true);
      setDataError(null);
      const formData = new FormData();
      formData.append('filter_type', 'all');

      const headers = {};
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const res = await axios.post(`/filtered_case_note/${patientId}/`, formData, { headers });
      setCaseNoteData(res.data);
    } catch (err) {
      console.error('Error fetching clinical case note:', err);
      setDataError(err.response?.data?.error || err.message || 'Failed to load case note records');
    } finally {
      setIsLoadingData(false);
    }
  };

  if (!isOpen || !patient) return null;

  const patientName =
    patient.full_name ||
    `${patient.surname || ''} ${patient.first_name || ''}`.trim() ||
    'Patient';
  const hospitalNumber = patient.hospital_number || 'N/A';

  const sortedDates = caseNoteData?.sorted_dates || [];
  const groupedData = caseNoteData?.grouped_by_date || {};

  // Filter dates based on selection
  const displayDates = selectedDate === 'all'
    ? sortedDates
    : sortedDates.filter((d) => d === selectedDate);

  // Compute stats
  let totalVitals = 0;
  let totalEncounters = 0;
  let totalDrugs = 0;
  let totalInvestigations = 0;
  let totalAppointments = 0;

  sortedDates.forEach((dateKey) => {
    const day = groupedData[dateKey] || {};
    totalVitals += day.vital_signs?.length || 0;
    totalEncounters += day.patient_encounters?.length || 0;
    totalDrugs += (day.administered_drugs?.length || 0) + (day.written_prescriptions?.length || 0);
    totalInvestigations += day.investigations?.length || 0;
    totalAppointments += day.appointments?.length || 0;
  });

  const handlePrint = () => {
    if (activeTab === 'legacy' && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (_) {}
    }
    window.print();
  };

  return (
    <>
      <div
        className="modal-backdrop-custom"
        style={{ zIndex: 1060 }}
        onClick={onClose}
      />
      <div
        className="card shadow-lg modal-custom"
        style={{
          zIndex: 1070,
          maxWidth: '1240px',
          width: '96vw',
          height: '92vh',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '10px',
        }}
      >
        {/* Header */}
        <div className="card-header py-2 px-3 bg-gradient-primary text-white d-flex justify-content-between align-items-center flex-shrink-0">
          <div className="d-flex align-items-center">
            <i className="fas fa-notes-medical fa-lg mr-2 text-warning"></i>
            <div>
              <div className="d-flex align-items-center">
                <h6 className="m-0 font-weight-bold text-white mr-2">
                  Clinical Case Note: {patientName}
                </h6>
                <span className="badge badge-light text-primary font-weight-bold px-2 py-0">
                  {hospitalNumber}
                </span>
              </div>
              <span className="small text-white-50">
                {patient.gender ? `${patient.gender}` : ''}
                {patient.age ? ` • ${patient.age} yrs` : ''}
                {patient.category_name ? ` • ${patient.category_name}` : ''}
                {patient.plan_name ? ` • ${patient.plan_name}` : ''}
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center">
            {/* View Switcher */}
            <div className="btn-group btn-group-sm mr-2 shadow-sm" role="group">
              <button
                type="button"
                className={`btn ${activeTab === 'clinical' ? 'btn-light font-weight-bold text-primary' : 'btn-outline-light text-white'}`}
                onClick={() => setActiveTab('clinical')}
                title="Interactive Clinical Chart"
              >
                <i className="fas fa-stream mr-1"></i> Clinical Chart
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'legacy' ? 'btn-light font-weight-bold text-primary' : 'btn-outline-light text-white'}`}
                onClick={() => {
                  setActiveTab('legacy');
                  setIsIframeLoading(true);
                }}
                title="Full EMR Document View"
              >
                <i className="fas fa-file-alt mr-1"></i> Full EMR Document
              </button>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-light text-secondary px-2 py-1 mr-2 shadow-sm"
              onClick={() => {
                if (activeTab === 'clinical') {
                  loadCaseNoteData();
                } else if (iframeRef.current) {
                  setIsIframeLoading(true);
                  iframeRef.current.src = caseNoteUrl;
                }
              }}
              title="Refresh Case Note"
            >
              <i className="fas fa-sync-alt mr-1"></i> Refresh
            </button>

            <button
              type="button"
              className="btn btn-sm btn-light text-secondary px-2 py-1 mr-2 shadow-sm"
              onClick={handlePrint}
              title="Print Clinical Case Note"
            >
              <i className="fas fa-print mr-1"></i> Print
            </button>

            <a
              href={caseNoteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-light text-primary font-weight-bold px-3 py-1 mr-3 shadow-sm"
              title="Open full EMR Case Note in new browser window"
            >
              <i className="fas fa-external-link-alt mr-1"></i> Open in New Tab
            </a>

            <button
              type="button"
              className="close text-white"
              onClick={onClose}
              aria-label="Close"
              style={{ opacity: 0.9, fontSize: '1.5rem', lineHeight: '1' }}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        </div>

        {/* Clinical Summary Bar */}
        <div className="bg-light px-3 py-2 border-bottom d-flex flex-wrap align-items-center justify-content-between flex-shrink-0">
          <div className="d-flex flex-wrap align-items-center">
            <span className="badge badge-primary mr-2 px-2 py-1 shadow-sm">
              <i className="fas fa-heartbeat mr-1"></i> {totalVitals} Vitals
            </span>
            <span className="badge badge-info mr-2 px-2 py-1 shadow-sm">
              <i className="fas fa-user-md mr-1"></i> {totalEncounters} Encounters
            </span>
            <span className="badge badge-success mr-2 px-2 py-1 shadow-sm">
              <i className="fas fa-pills mr-1"></i> {totalDrugs} Meds
            </span>
            <span className="badge badge-warning text-dark mr-2 px-2 py-1 shadow-sm">
              <i className="fas fa-microscope mr-1"></i> {totalInvestigations} Tests
            </span>
            <span className="badge badge-secondary mr-2 px-2 py-1 shadow-sm">
              <i className="fas fa-calendar-check mr-1"></i> {totalAppointments} Visits
            </span>
          </div>

          {activeTab === 'clinical' && sortedDates.length > 0 && (
            <div className="d-flex align-items-center mt-1 mt-md-0">
              <label className="small text-muted font-weight-bold mb-0 mr-2">Filter Date:</label>
              <select
                className="custom-select custom-select-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: '160px' }}
              >
                <option value="all">All Dates ({sortedDates.length})</option>
                {sortedDates.map((dateStr) => (
                  <option key={dateStr} value={dateStr}>
                    {dateStr}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="card-body p-0 position-relative flex-grow-1" style={{ overflow: 'hidden' }}>
          {activeTab === 'clinical' ? (
            <div className="h-100 p-3" style={{ overflowY: 'auto' }}>
              {isLoadingData ? (
                <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5">
                  <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
                    <span className="sr-only">Loading...</span>
                  </div>
                  <h6 className="font-weight-bold text-gray-700">Loading Clinical Case Note</h6>
                  <p className="text-muted small">Retrieving vital signs, medical diagnoses, and prescriptions...</p>
                </div>
              ) : dataError ? (
                <div className="alert alert-danger m-3 shadow-sm">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  <strong>Unable to load case note:</strong> {dataError}
                  <button className="btn btn-sm btn-outline-danger ml-3" onClick={loadCaseNoteData}>
                    Retry
                  </button>
                </div>
              ) : displayDates.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="fas fa-folder-open fa-3x text-gray-400 mb-3"></i>
                  <h5>No Case Note Records Found</h5>
                  <p className="small">There are currently no recorded vital signs, doctor notes, or prescriptions for this patient.</p>
                </div>
              ) : (
                displayDates.map((dateKey) => {
                  const day = groupedData[dateKey] || {};
                  const vitals = day.vital_signs || [];
                  const encounters = day.patient_encounters || [];
                  const drugs = day.administered_drugs || [];
                  const writtenPrescriptions = day.written_prescriptions || [];
                  const investigations = day.investigations || [];
                  const appointments = day.appointments || [];
                  const followups = day.followups || [];
                  const referrals = day.referrals || [];
                  const otherServices = day.other_services || [];

                  return (
                    <div key={dateKey} className="card shadow-sm mb-4 border-left-primary">
                      {/* Date Heading */}
                      <div className="card-header bg-white py-2 px-3 d-flex justify-content-between align-items-center border-bottom">
                        <span className="font-weight-bold text-primary h6 mb-0">
                          <i className="fas fa-calendar-alt mr-2 text-primary"></i>
                          Clinical Entries for {dateKey}
                        </span>
                        <span className="badge badge-light border text-muted small px-2 py-1">
                          {vitals.length} Vitals • {encounters.length} Notes • {drugs.length + writtenPrescriptions.length} Meds
                        </span>
                      </div>

                      <div className="card-body p-3">
                        {/* 1. Vital Signs */}
                        {vitals.length > 0 && (
                          <div className="mb-3">
                            <h6 className="font-weight-bold text-info small text-uppercase mb-2 d-flex align-items-center">
                              <i className="fas fa-heartbeat mr-2"></i> Vital Signs Recorded
                            </h6>
                            <div className="table-responsive">
                              <table className="table table-sm table-bordered table-hover mb-0 small">
                                <thead className="bg-light text-dark font-weight-bold">
                                  <tr>
                                    <th>Time</th>
                                    <th>BP (mmHg)</th>
                                    <th>Pulse (bpm)</th>
                                    <th>Temp (°C)</th>
                                    <th>SpO2 (%)</th>
                                    <th>Resp. Rate</th>
                                    <th>BMI / Weight / Ht</th>
                                    <th>Glucose</th>
                                    <th>Recorded By</th>
                                    <th>Clinical Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {vitals.map((v, i) => (
                                    <tr key={i}>
                                      <td className="font-weight-bold">{v.created_date?.split(' ')[1] || v.created_date}</td>
                                      <td>
                                        <span className={`badge ${v.bp ? 'badge-primary' : 'badge-light'} font-weight-bold px-2 py-1`}>
                                          {v.bp || '-'}
                                        </span>
                                      </td>
                                      <td>{v.pulse ? `${v.pulse} bpm` : '-'}</td>
                                      <td>
                                        {v.temperature ? (
                                          <span className={Number(v.temperature) >= 37.5 ? 'text-danger font-weight-bold' : ''}>
                                            {v.temperature} °C
                                          </span>
                                        ) : '-'}
                                      </td>
                                      <td>{v.sp_02 ? `${v.sp_02}%` : '-'}</td>
                                      <td>{v.respiratory_rate ? `${v.respiratory_rate} cpm` : '-'}</td>
                                      <td>
                                        {v.bmi ? <span className="badge badge-info mr-1">BMI {v.bmi}</span> : null}
                                        {v.weight ? `${v.weight}kg` : ''} {v.height ? `/ ${v.height}cm` : ''}
                                      </td>
                                      <td>{v.blood_glucose ? `${v.blood_glucose} mg/dL` : '-'}</td>
                                      <td>
                                        <span className="text-secondary font-weight-bold">{v.staff || 'Staff'}</span>
                                      </td>
                                      <td className="text-muted font-italic">{v.comment || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* 2. Doctor Encounters & Consultations */}
                        {encounters.length > 0 && (
                          <div className="mb-3">
                            <h6 className="font-weight-bold text-primary small text-uppercase mb-2 d-flex align-items-center">
                              <i className="fas fa-stethoscope mr-2"></i> Clinical Encounters & Doctor Notes
                            </h6>
                            {encounters.map((enc, idx) => (
                              <div key={idx} className="card bg-light border-0 p-3 mb-2 shadow-sm rounded">
                                <div className="d-flex justify-content-between mb-2">
                                  <strong className="text-primary font-weight-bold">
                                    <i className="fas fa-user-md mr-1"></i> {enc.doctor || enc.staff || 'Consulting Physician'}
                                  </strong>
                                  <span className="text-muted small">{enc.created_at || enc.created_date}</span>
                                </div>
                                {enc.complaints && (
                                  <p className="mb-1 small">
                                    <strong>Presenting Complaints:</strong> {enc.complaints}
                                  </p>
                                )}
                                {enc.history_of_complaint && (
                                  <p className="mb-1 small">
                                    <strong>History:</strong> {enc.history_of_complaint}
                                  </p>
                                )}
                                {enc.examination && (
                                  <p className="mb-1 small">
                                    <strong>Physical Examination:</strong> {enc.examination}
                                  </p>
                                )}
                                {enc.provisional_diagnosis && (
                                  <p className="mb-1 small">
                                    <strong>Provisional Diagnosis:</strong>{' '}
                                    <span className="badge badge-warning text-dark px-2 py-1">{enc.provisional_diagnosis}</span>
                                  </p>
                                )}
                                {enc.final_diagnosis && (
                                  <p className="mb-0 small">
                                    <strong>Final Diagnosis:</strong>{' '}
                                    <span className="badge badge-success px-2 py-1">{enc.final_diagnosis}</span>
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 3. Prescriptions & Medications */}
                        {(drugs.length > 0 || writtenPrescriptions.length > 0) && (
                          <div className="mb-3">
                            <h6 className="font-weight-bold text-success small text-uppercase mb-2 d-flex align-items-center">
                              <i className="fas fa-pills mr-2"></i> Prescriptions & Administered Medications
                            </h6>
                            <div className="table-responsive">
                              <table className="table table-sm table-bordered mb-0 small">
                                <thead className="bg-light">
                                  <tr>
                                    <th>Medication / Item</th>
                                    <th>Dosage / Instructions</th>
                                    <th>Store / Department</th>
                                    <th>Prescribed By</th>
                                    <th>Status / Time</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {drugs.map((d, di) => (
                                    <tr key={`d-${di}`}>
                                      <td className="font-weight-bold text-dark">{d.product_name || d.name || 'Drug'}</td>
                                      <td>{d.dosage || d.instruction || '-'}</td>
                                      <td>
                                        <span className="badge badge-light border">{d.store_name || 'Pharmacy'}</span>
                                      </td>
                                      <td>{d.staff || 'Doctor'}</td>
                                      <td>
                                        <span className="badge badge-success px-2 py-1">Administered</span>
                                      </td>
                                    </tr>
                                  ))}
                                  {writtenPrescriptions.map((wp, wpi) => (
                                    <tr key={`wp-${wpi}`}>
                                      <td className="font-weight-bold text-primary">{wp.drug_name || wp.name || 'Prescription'}</td>
                                      <td>{wp.dosage || wp.instructions || '-'}</td>
                                      <td>
                                        <span className="badge badge-light border">Written Prescription</span>
                                      </td>
                                      <td>{wp.doctor || wp.staff || 'Physician'}</td>
                                      <td>
                                        <span className="badge badge-info px-2 py-1">Prescribed</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* 4. Investigations / Tests */}
                        {investigations.length > 0 && (
                          <div className="mb-3">
                            <h6 className="font-weight-bold text-warning small text-uppercase mb-2 d-flex align-items-center text-dark">
                              <i className="fas fa-flask mr-2 text-warning"></i> Laboratory & Radiology Investigations
                            </h6>
                            <div className="table-responsive">
                              <table className="table table-sm table-bordered mb-0 small">
                                <thead className="bg-light">
                                  <tr>
                                    <th>Investigation / Test</th>
                                    <th>Emergency Status</th>
                                    <th>Requested By</th>
                                    <th>Findings / Comment</th>
                                    <th>Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {investigations.map((inv, ii) => (
                                    <tr key={ii}>
                                      <td className="font-weight-bold">{inv.test_name || inv.item_name || 'Investigation'}</td>
                                      <td>
                                        {inv.emergency ? (
                                          <span className="badge badge-danger">EMERGENCY</span>
                                        ) : (
                                          <span className="badge badge-light border">Routine</span>
                                        )}
                                      </td>
                                      <td>{inv.provider || 'Doctor'}</td>
                                      <td className="text-muted">{inv.comment || 'Completed'}</td>
                                      <td>{inv.created_date || dateKey}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* 5. Appointments & Visits */}
                        {appointments.length > 0 && (
                          <div>
                            <h6 className="font-weight-bold text-secondary small text-uppercase mb-2 d-flex align-items-center">
                              <i className="fas fa-calendar-check mr-2"></i> Clinic Appointments & Encounters
                            </h6>
                            <div className="row">
                              {appointments.map((apt, ai) => (
                                <div key={ai} className="col-md-6 mb-2">
                                  <div className="p-2 border rounded bg-light small">
                                    <div className="d-flex justify-content-between font-weight-bold">
                                      <span>{apt.purpose || 'Appointment'}</span>
                                      <span className="badge badge-primary">{apt.visit_type || 'Visit'}</span>
                                    </div>
                                    <div className="text-muted mt-1">
                                      Clinician: <strong>{apt.clinician || 'General Pool'}</strong>
                                    </div>
                                    <div className="text-muted">
                                      Arrival: {apt.arrival_time || 'N/A'} {apt.arrival_date ? `(${apt.arrival_date})` : ''}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Legacy EMR Document View */
            <div className="h-100 position-relative">
              {isIframeLoading && (
                <div
                  className="position-absolute w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white"
                  style={{ zIndex: 10, top: 0, left: 0 }}
                >
                  <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
                    <span className="sr-only">Loading...</span>
                  </div>
                  <h6 className="font-weight-bold text-gray-700">Loading Full EMR Case Note</h6>
                  <p className="text-muted small">Rendering comprehensive medical records...</p>
                </div>
              )}
              {caseNoteUrl ? (
                <iframe
                  ref={iframeRef}
                  src={caseNoteUrl}
                  title={`Full Case Note for ${patientName}`}
                  onLoad={() => setIsIframeLoading(false)}
                  onError={() => setIsIframeLoading(false)}
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                />
              ) : (
                <div className="p-4 text-center text-muted">
                  <p>Patient ID not available.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
