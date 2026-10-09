import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const ALLERGY_PRESETS = [
  'NKDA (No Known Allergies)',
  'Penicillin',
  'Sulfa Drugs',
  'Latex',
  'Aspirin / NSAIDs',
  'Ciprofloxacin',
  'Food / Peanuts',
  'Asthma / Atopy',
];

const generateMRN = () => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `ISL-${num}`;
};

export default function PatientModal({
  isOpen,
  onClose,
  onPatientCreated,
  categories = [],
  isSidebarCollapsed = false,
}) {
  const [activeTab, setActiveTab] = useState('demographics'); // 'demographics' | 'contact' | 'billing'

  const [formData, setFormData] = useState({
    surname: '',
    first_name: '',
    other_name: '',
    dob: '',
    gender: 'Male',
    patient_type: 'Single',
    hospital_number: '',
    phone_number: '',
    email_address: '',
    address: '',
    category: '',
    sponsor: '',
    plan: '',
    insurance_policy_number: '',
    relationship_to_patient: '',
    phone_numbers: '',
    allergies: '',
    auto_route_to_vitals: true,
  });

  const [internalCategories, setInternalCategories] = useState(categories || []);
  const [sponsors, setSponsors] = useState([]);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tabErrors, setTabErrors] = useState({});

  // Reset or initialize state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        surname: '',
        first_name: '',
        other_name: '',
        dob: '',
        gender: 'Male',
        patient_type: 'Single',
        hospital_number: generateMRN(),
        phone_number: '',
        email_address: '',
        address: '',
        category: '',
        sponsor: '',
        plan: '',
        insurance_policy_number: '',
        relationship_to_patient: '',
        phone_numbers: '',
        allergies: '',
        auto_route_to_vitals: true,
      });
      setActiveTab('demographics');
      setError(null);
      setTabErrors({});
    }
  }, [isOpen]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  // Load categories if not passed or empty
  useEffect(() => {
    if (categories && categories.length > 0) {
      setInternalCategories(categories);
    } else if (isOpen) {
      api.getCategories()
        .then((res) => {
          if (Array.isArray(res)) setInternalCategories(res);
        })
        .catch(() => {});
    }
  }, [categories, isOpen]);

  // Load sponsors when modal opens or category changes
  useEffect(() => {
    if (isOpen) {
      setLoadingSponsors(true);
      const params = formData.category ? { category: formData.category } : {};
      api.getSponsors(params)
        .then((res) => {
          setSponsors(Array.isArray(res) ? res : []);
        })
        .catch(() => {
          setSponsors([]);
        })
        .finally(() => {
          setLoadingSponsors(false);
        });
    }
  }, [isOpen, formData.category]);

  // Load plans whenever sponsor or category changes
  useEffect(() => {
    if (formData.sponsor) {
      setLoadingPlans(true);
      api.getPlans({ sponsor: formData.sponsor })
        .then((res) => {
          setPlans(Array.isArray(res) ? res : []);
        })
        .catch(() => {
          setPlans([]);
        })
        .finally(() => {
          setLoadingPlans(false);
        });
    } else if (formData.category) {
      setLoadingPlans(true);
      api.getPlans({ category: formData.category })
        .then((res) => {
          setPlans(Array.isArray(res) ? res : []);
        })
        .catch(() => {
          setPlans([]);
        })
        .finally(() => {
          setLoadingPlans(false);
        });
    } else {
      setPlans([]);
    }
  }, [formData.sponsor, formData.category]);


  // Live Age Calculation Helper
  const getCalculatedAge = useCallback((dobString) => {
    if (!dobString) return null;
    const birth = new Date(dobString);
    const now = new Date();
    if (isNaN(birth.getTime()) || birth > now) return null;

    let years = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      years--;
    }

    if (years >= 1) {
      return `${years} yr${years > 1 ? 's' : ''} old`;
    }

    // Pediatric / Infant under 1 year
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months >= 1) {
      return `${months} mo${months > 1 ? 's' : ''} old (Infant)`;
    }

    const diffDays = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
    return `${Math.max(0, diffDays)} day${diffDays !== 1 ? 's' : ''} old (Neonate)`;
  }, []);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
      if (name === 'category') {
        next.sponsor = '';
        next.plan = '';
      } else if (name === 'sponsor') {
        next.plan = '';
        if (value) {
          const sp = sponsors.find((s) => String(s.id) === String(value));
          if (sp?.category && !prev.category) {
            next.category = sp.category;
          }
        }
      }
      return next;
    });

    if (tabErrors[name]) {
      setTabErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleRegenerateMRN = () => {
    setFormData((prev) => ({ ...prev, hospital_number: generateMRN() }));
  };

  const handleToggleAllergy = (preset) => {
    if (preset.startsWith('NKDA')) {
      setFormData((prev) => ({
        ...prev,
        allergies: prev.allergies === 'NKDA' ? '' : 'NKDA',
      }));
      return;
    }

    setFormData((prev) => {
      let current = (prev.allergies || '').trim();
      if (current === 'NKDA') current = '';

      const list = current ? current.split(',').map((s) => s.trim()).filter(Boolean) : [];
      const existsIndex = list.findIndex((item) => item.toLowerCase() === preset.toLowerCase());

      if (existsIndex >= 0) {
        list.splice(existsIndex, 1);
      } else {
        list.push(preset);
      }

      return {
        ...prev,
        allergies: list.join(', '),
      };
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.surname.trim()) errors.surname = 'Surname is required';
    if (!formData.first_name.trim()) errors.first_name = 'First name is required';
    if (!formData.dob) errors.dob = 'Date of birth is required';
    if (!formData.phone_number.trim()) errors.phone_number = 'Phone number is required';

    if (formData.dob) {
      const birth = new Date(formData.dob);
      if (birth > new Date()) {
        errors.dob = 'Date of birth cannot be in the future';
      }
    }

    setTabErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (errors.surname || errors.first_name || errors.dob) {
        setActiveTab('demographics');
      } else if (errors.phone_number) {
        setActiveTab('contact');
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      setError('Please fill in all required fields: Surname, First Name, Date of Birth, and Phone Number.');
      return;
    }

    try {
      setSaving(true);

      const hospNum = formData.hospital_number?.trim() || String(Math.floor(1000 + Math.random() * 9000));
      const payload = {
        surname: formData.surname.trim(),
        first_name: formData.first_name.trim(),
        other_name: formData.other_name.trim() || null,
        dob: formData.dob,
        gender: formData.gender,
        patient_type: formData.patient_type,
        hospital_number: hospNum,
        phone_number: formData.phone_number.trim(),
        email_address: formData.email_address?.trim() || null,
        address: formData.address?.trim() || null,
        category: formData.category ? Number(formData.category) : null,
        sponsor: formData.sponsor ? Number(formData.sponsor) : null,
        plan: formData.plan ? Number(formData.plan) : null,
        insurance_policy_number: formData.insurance_policy_number?.trim() || null,
        relationship_to_patient: formData.relationship_to_patient?.trim() || null,
        phone_numbers: formData.phone_numbers?.trim() || null,
        allergies: formData.allergies?.trim() || null,
      };

      const created = await api.createPatient(payload);

      // Immediately queue patient for vital signs if requested
      if (formData.auto_route_to_vitals && created?.id) {
        try {
          await api.createQueue({
            patient: created.id,
            purpose: 'Vital Signs',
            visit_type: 'New-case',
          });
        } catch (queueErr) {
          console.warn('Patient saved, but vitals queueing encountered an issue:', queueErr);
        }
      }

      onPatientCreated(created);
      onClose();
    } catch (err) {
      const respData = err.response?.data;
      let msg = 'Failed to save patient. Please check the entered fields.';
      if (respData) {
        if (typeof respData === 'string') {
          msg = respData;
        } else if (respData.detail) {
          msg = respData.detail;
        } else {
          const fields = Object.keys(respData);
          if (fields.length > 0) {
            msg = `${fields.join(', ')}: ${JSON.stringify(respData[fields[0]])}`;
          }
        }
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const calculatedAge = getCalculatedAge(formData.dob);
  const selectedCategoryObj = internalCategories.find(
    (c) => String(c.id) === String(formData.category)
  );
  const selectedSponsorObj = sponsors.find((s) => String(s.id) === String(formData.sponsor));
  const isHMOOrInsurance = !!formData.sponsor ||
    selectedCategoryObj?.category?.toLowerCase().includes('hmo') ||
    selectedCategoryObj?.category?.toLowerCase().includes('retain') ||
    selectedCategoryObj?.category?.toLowerCase().includes('insurance');


  const hasDemographicsError = !!(tabErrors.surname || tabErrors.first_name || tabErrors.dob);
  const hasContactError = !!(tabErrors.phone_number);

  return (
    <>
      <div className="modal-backdrop-custom" onClick={saving ? undefined : onClose}></div>

      {/* Main Modal Card Dialog - Offset away from sidebar into content center */}
      <div
        className={`card shadow patient-modal-dialog ${
          isSidebarCollapsed ? 'sidebar-collapsed' : ''
        }`}
      >
        {/* Header - SB Admin 2 Gradient */}
        <div className="card-header py-3 bg-gradient-primary text-white d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <i className="fas fa-user-plus mr-2 fa-lg text-white-50"></i>
            <div>
              <h6 className="m-0 font-weight-bold text-white">Register New Patient</h6>
              <span className="small text-white-50">Electronic Health Record (EHR) Intake</span>
            </div>
          </div>

          <div className="d-flex align-items-center">
            <span className="badge badge-light text-primary font-weight-bold mr-3 py-1 px-2 d-none d-sm-inline-flex align-items-center">
              <i className="fas fa-barcode mr-1"></i> MRN: {formData.hospital_number || 'Auto'}
            </span>
            <button
              type="button"
              className="close text-white"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
              style={{ textShadow: 'none', opacity: 0.9 }}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        </div>

        {/* Subheader Toolbar: Nav Pills & Live Context */}
        <div className="px-3 py-2 bg-light border-bottom d-flex justify-content-between align-items-center flex-wrap">
          <ul className="nav nav-pills card-header-pills patient-tab-pills my-1">
            <li className="nav-item mr-2">
              <button
                type="button"
                className={`nav-link ${activeTab === 'demographics' ? 'active' : ''}`}
                onClick={() => setActiveTab('demographics')}
              >
                <i className="fas fa-id-card mr-1"></i> 1. Demographics
                {hasDemographicsError && <i className="fas fa-exclamation-circle text-danger ml-1"></i>}
              </button>
            </li>
            <li className="nav-item mr-2">
              <button
                type="button"
                className={`nav-link ${activeTab === 'contact' ? 'active' : ''}`}
                onClick={() => setActiveTab('contact')}
              >
                <i className="fas fa-phone mr-1"></i> 2. Contact & Kin
                {hasContactError && <i className="fas fa-exclamation-circle text-danger ml-1"></i>}
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'billing' ? 'active' : ''}`}
                onClick={() => setActiveTab('billing')}
              >
                <i className="fas fa-file-medical-alt mr-1"></i> 3. Billing & Clinical
              </button>
            </li>
          </ul>

          {/* Quick Info Indicator */}
          <div className="d-flex align-items-center my-1 small">
            {formData.surname || formData.first_name ? (
              <span className="text-gray-800 font-weight-bold mr-2">
                <i className="fas fa-user-circle text-primary mr-1"></i>
                {formData.surname} {formData.first_name}
              </span>
            ) : null}
            {calculatedAge ? (
              <span className="badge badge-info mr-2">{calculatedAge}</span>
            ) : null}
            {formData.allergies ? (
              formData.allergies === 'NKDA' ? (
                <span className="badge badge-success"><i className="fas fa-shield-alt mr-1"></i> NKDA</span>
              ) : (
                <span className="badge badge-danger"><i className="fas fa-exclamation-triangle mr-1"></i> Allergy</span>
              )
            ) : null}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="patient-modal-form">
          <div className="patient-modal-body-scroll">
            {error && (
              <div className="alert alert-danger py-2 small d-flex align-items-center shadow-sm mb-3" role="alert">
                <i className="fas fa-exclamation-triangle mr-2 text-danger"></i>
                <div className="flex-grow-1">{error}</div>
                <button
                  type="button"
                  className="close ml-2"
                  onClick={() => setError(null)}
                  style={{ textShadow: 'none' }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            )}

            {/* TAB 1: Demographics */}
            {activeTab === 'demographics' && (
              <div>
                <div className="card border-left-primary shadow-sm mb-3">
                  <div className="card-body py-3">
                    <h6 className="font-weight-bold text-primary mb-3 small text-uppercase">
                      <i className="fas fa-user mr-1"></i> Personal Identity
                    </h6>
                    <div className="row">
                      <div className="col-md-4 form-group">
                        <label className="small font-weight-bold text-gray-700">
                          Surname <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          name="surname"
                          className={`form-control form-control-sm ${tabErrors.surname ? 'is-invalid' : ''}`}
                          placeholder="Family / Last name"
                          required
                          value={formData.surname}
                          onChange={handleChange}
                          autoFocus
                        />
                        {tabErrors.surname && (
                          <div className="invalid-feedback small">{tabErrors.surname}</div>
                        )}
                      </div>

                      <div className="col-md-4 form-group">
                        <label className="small font-weight-bold text-gray-700">
                          First Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          name="first_name"
                          className={`form-control form-control-sm ${tabErrors.first_name ? 'is-invalid' : ''}`}
                          placeholder="Given name"
                          required
                          value={formData.first_name}
                          onChange={handleChange}
                        />
                        {tabErrors.first_name && (
                          <div className="invalid-feedback small">{tabErrors.first_name}</div>
                        )}
                      </div>

                      <div className="col-md-4 form-group">
                        <label className="small font-weight-bold text-gray-700">
                          Middle / Other Name
                        </label>
                        <input
                          type="text"
                          name="other_name"
                          className="form-control form-control-sm"
                          placeholder="Middle name (optional)"
                          value={formData.other_name}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-left-info shadow-sm mb-3">
                  <div className="card-body py-3">
                    <h6 className="font-weight-bold text-info mb-3 small text-uppercase d-flex justify-content-between align-items-center">
                      <span><i className="fas fa-birthday-cake mr-1"></i> Vital Statistics & Chart ID</span>
                      {calculatedAge && (
                        <span className="badge badge-info font-weight-bold">{calculatedAge}</span>
                      )}
                    </h6>
                    <div className="row">
                      <div className="col-md-4 form-group">
                        <label className="small font-weight-bold text-gray-700">
                          Date of Birth <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          name="dob"
                          max={new Date().toISOString().split('T')[0]}
                          className={`form-control form-control-sm ${tabErrors.dob ? 'is-invalid' : ''}`}
                          required
                          value={formData.dob}
                          onChange={handleChange}
                        />
                        {tabErrors.dob && (
                          <div className="invalid-feedback small">{tabErrors.dob}</div>
                        )}
                      </div>

                      <div className="col-md-4 form-group">
                        <label className="small font-weight-bold text-gray-700">
                          Gender <span className="text-danger">*</span>
                        </label>
                        <select
                          name="gender"
                          className="custom-select custom-select-sm"
                          value={formData.gender}
                          onChange={handleChange}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>

                      <div className="col-md-4 form-group">
                        <label className="small font-weight-bold text-gray-700">
                          Marital Status
                        </label>
                        <select
                          name="patient_type"
                          className="custom-select custom-select-sm"
                          value={formData.patient_type}
                          onChange={handleChange}
                        >
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 form-group mb-0">
                        <label className="small font-weight-bold text-gray-700 d-flex justify-content-between">
                          <span>Hospital / MRN Number</span>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-primary small text-decoration-none"
                            onClick={handleRegenerateMRN}
                          >
                            <i className="fas fa-sync-alt mr-1"></i> Regenerate
                          </button>
                        </label>
                        <div className="input-group input-group-sm patient-input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text font-weight-bold">#</span>
                          </div>
                          <input
                            type="text"
                            name="hospital_number"
                            className="form-control form-control-sm font-weight-bold"
                            placeholder="e.g. ISL-1024"
                            value={formData.hospital_number}
                            onChange={handleChange}
                          />
                        </div>
                        <small className="form-text text-muted">
                          Auto-generated unique record ID or enter existing paper chart number.
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Contact & Emergency */}
            {activeTab === 'contact' && (
              <div>
                <div className="card border-left-success shadow-sm mb-3">
                  <div className="card-body py-3">
                    <h6 className="font-weight-bold text-success mb-3 small text-uppercase">
                      <i className="fas fa-address-book mr-1"></i> Patient Contact
                    </h6>
                    <div className="row">
                      <div className="col-md-6 form-group">
                        <label className="small font-weight-bold text-gray-700">
                          Primary Phone Number <span className="text-danger">*</span>
                        </label>
                        <div className="input-group input-group-sm patient-input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text"><i className="fas fa-phone"></i></span>
                          </div>
                          <input
                            type="tel"
                            name="phone_number"
                            className={`form-control form-control-sm ${tabErrors.phone_number ? 'is-invalid' : ''}`}
                            required
                            placeholder="e.g. 0801 234 5678"
                            value={formData.phone_number}
                            onChange={handleChange}
                          />
                        </div>
                        {tabErrors.phone_number && (
                          <div className="invalid-feedback d-block small">{tabErrors.phone_number}</div>
                        )}
                      </div>

                      <div className="col-md-6 form-group">
                        <label className="small font-weight-bold text-gray-700">
                          Email Address
                        </label>
                        <div className="input-group input-group-sm patient-input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text"><i className="fas fa-envelope"></i></span>
                          </div>
                          <input
                            type="email"
                            name="email_address"
                            className="form-control form-control-sm"
                            placeholder="e.g. patient@example.com"
                            value={formData.email_address}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group mb-0">
                      <label className="small font-weight-bold text-gray-700">
                        Residential Address
                      </label>
                      <textarea
                        name="address"
                        rows="2"
                        className="form-control form-control-sm"
                        placeholder="Street, area, city..."
                        value={formData.address}
                        onChange={handleChange}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="card border-left-warning shadow-sm mb-3">
                  <div className="card-body py-3">
                    <h6 className="font-weight-bold text-warning mb-3 small text-uppercase">
                      <i className="fas fa-heartbeat mr-1"></i> Emergency Contact & Next of Kin
                    </h6>
                    <div className="row">
                      <div className="col-md-6 form-group">
                        <label className="small font-weight-bold text-gray-700">
                          Next of Kin Name & Relationship
                        </label>
                        <input
                          type="text"
                          name="relationship_to_patient"
                          className="form-control form-control-sm"
                          placeholder="e.g. Jane Doe (Spouse/Brother)"
                          value={formData.relationship_to_patient}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="col-md-6 form-group">
                        <label className="small font-weight-bold text-gray-700">
                          Emergency Contact Phone Number
                        </label>
                        <div className="input-group input-group-sm patient-input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text"><i className="fas fa-mobile-alt"></i></span>
                          </div>
                          <input
                            type="tel"
                            name="phone_numbers"
                            className="form-control form-control-sm"
                            placeholder="e.g. 0802 345 6789"
                            value={formData.phone_numbers}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Billing & Clinical */}
            {activeTab === 'billing' && (
              <div>
                <div className="card border-left-primary shadow-sm mb-3">
                  <div className="card-body py-3">
                    <h6 className="font-weight-bold text-primary mb-3 small text-uppercase d-flex justify-content-between align-items-center">
                      <span><i className="fas fa-credit-card mr-1"></i> Payer Category, Sponsor & Tariff Plan</span>
                      {(loadingPlans || loadingSponsors) && (
                        <span className="small text-muted"><i className="fas fa-spinner fa-spin mr-1"></i> Loading...</span>
                      )}
                    </h6>
                    <div className="row">
                      <div className="col-md-4 form-group">
                        <label className="small font-weight-bold text-gray-700">
                          1. Billing Category
                        </label>
                        <select
                          name="category"
                          className="custom-select custom-select-sm"
                          value={formData.category}
                          onChange={handleChange}
                        >
                          <option value="">-- All Categories --</option>
                          {internalCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.category}
                            </option>
                          ))}
                        </select>
                        <small className="form-text text-muted">e.g. HMO, Private, Retainer</small>
                      </div>

                      <div className="col-md-4 form-group">
                        <label className="small font-weight-bold text-gray-700 d-flex justify-content-between align-items-center">
                          <span>2. Select Sponsor</span>
                          {loadingSponsors && <i className="fas fa-spinner fa-spin text-primary small"></i>}
                        </label>
                        <select
                          name="sponsor"
                          className="custom-select custom-select-sm font-weight-bold"
                          value={formData.sponsor}
                          onChange={handleChange}
                        >
                          <option value="">-- Choose Sponsor --</option>
                          {sponsors.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name || s.plan} {s.code ? `(${s.code})` : ''}
                            </option>
                          ))}
                        </select>
                        <small className="form-text text-muted">
                          {selectedSponsorObj?.code ? (
                            <span className="text-primary font-weight-bold">
                              Code: {selectedSponsorObj.code}
                            </span>
                          ) : (
                            'HMO or Corporate Retainer'
                          )}
                        </small>
                      </div>

                      <div className="col-md-4 form-group">
                        <label className="small font-weight-bold text-gray-700 d-flex justify-content-between align-items-center">
                          <span>3. Select Plan</span>
                          {loadingPlans && <i className="fas fa-spinner fa-spin text-primary small"></i>}
                        </label>
                        <select
                          name="plan"
                          className="custom-select custom-select-sm"
                          value={formData.plan}
                          onChange={handleChange}
                          disabled={plans.length === 0}
                        >
                          <option value="">
                            {plans.length === 0
                              ? formData.sponsor
                                ? '-- No plans for this sponsor --'
                                : '-- Select Sponsor first --'
                              : '-- Select Plan --'}
                          </option>
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.plan} {p.code ? `(${p.code})` : ''}
                            </option>
                          ))}
                        </select>
                        <small className="form-text text-muted">
                          {plans.length > 0 ? `${plans.length} plan(s) available` : 'Select sponsor first'}
                        </small>
                      </div>
                    </div>

                    {isHMOOrInsurance && (
                      <div className="p-2 bg-light border border-warning rounded mt-1">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="small font-weight-bold text-dark mb-0">
                            <i className="fas fa-shield-alt text-warning mr-1"></i> Policy / Enrollee ID
                          </label>
                          {selectedSponsorObj?.code && (
                            <span className="badge badge-warning text-dark font-mono px-2 py-0">
                              HMO Code: {selectedSponsorObj.code}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          name="insurance_policy_number"
                          className="form-control form-control-sm"
                          placeholder="e.g. AXA-10293 or NHIS-48201 or Enrollee ID"
                          value={formData.insurance_policy_number}
                          onChange={handleChange}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="card border-left-danger shadow-sm mb-3">
                  <div className="card-body py-3">
                    <h6 className="font-weight-bold text-danger mb-2 small text-uppercase">
                      <i className="fas fa-allergies mr-1"></i> Clinical Safety: Known Allergies
                    </h6>

                    {/* Quick Presets */}
                    <div className="mb-2 d-flex flex-wrap" style={{ gap: '0.4rem' }}>
                      {ALLERGY_PRESETS.map((preset) => {
                        const isNKDA = preset.startsWith('NKDA');
                        const isSelected = isNKDA
                          ? formData.allergies === 'NKDA'
                          : formData.allergies.toLowerCase().includes(preset.toLowerCase());

                        return (
                          <button
                            key={preset}
                            type="button"
                            className={`patient-allergy-chip ${
                              isSelected
                                ? isNKDA
                                  ? 'selected-nkda'
                                  : 'selected'
                                : ''
                            }`}
                            onClick={() => handleToggleAllergy(preset)}
                          >
                            <i className={isSelected ? 'fas fa-check-circle' : 'far fa-circle'}></i>
                            {preset}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      name="allergies"
                      className="form-control form-control-sm"
                      placeholder="e.g. Penicillin, Latex, Seafood..."
                      value={formData.allergies}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="card border-left-info shadow-sm mb-2">
                  <div className="card-body py-2 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="custom-control custom-switch mr-3">
                        <input
                          type="checkbox"
                          className="custom-control-input cursor-pointer"
                          id="autoRouteVitals"
                          name="auto_route_to_vitals"
                          checked={formData.auto_route_to_vitals}
                          onChange={handleChange}
                        />
                        <label className="custom-control-label cursor-pointer" htmlFor="autoRouteVitals"></label>
                      </div>
                      <div>
                        <strong className="d-block text-gray-800 small">
                          <i className="fas fa-stethoscope mr-1 text-info"></i> Automatically Queue for Nurse Triage / Vitals
                        </strong>
                        <span className="text-muted small">
                          Routes patient to the vital signs queue immediately upon intake.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="patient-modal-footer d-flex justify-content-between align-items-center">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={saving}
            >
              <i className="fas fa-times mr-1"></i> Cancel
            </button>

            <div className="d-flex align-items-center">
              {activeTab === 'demographics' && (
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm mr-2"
                  onClick={() => {
                    if (!formData.surname.trim() || !formData.first_name.trim() || !formData.dob) {
                      validateForm();
                      return;
                    }
                    setActiveTab('contact');
                  }}
                >
                  Next: Contact <i className="fas fa-arrow-right ml-1"></i>
                </button>
              )}

              {activeTab === 'contact' && (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm mr-2"
                    onClick={() => setActiveTab('demographics')}
                  >
                    <i className="fas fa-arrow-left mr-1"></i> Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm mr-2"
                    onClick={() => {
                      if (!formData.phone_number.trim()) {
                        validateForm();
                        return;
                      }
                      setActiveTab('billing');
                    }}
                  >
                    Next: Billing <i className="fas fa-arrow-right ml-1"></i>
                  </button>
                </>
              )}

              {activeTab === 'billing' && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm mr-2"
                  onClick={() => setActiveTab('contact')}
                >
                  <i className="fas fa-arrow-left mr-1"></i> Back
                </button>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-sm px-3 shadow-sm font-weight-bold"
                disabled={saving}
              >
                {saving ? (
                  <span>
                    <i className="fas fa-spinner fa-spin mr-1"></i> Saving Patient...
                  </span>
                ) : (
                  <span>
                    <i className="fas fa-check-circle mr-1"></i> Save Patient Record
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
