import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function PatientModal({ isOpen, onClose, onPatientCreated, categories }) {
  const [formData, setFormData] = useState({
    surname: '',
    first_name: '',
    other_name: '',
    dob: '',
    gender: 'Male',
    patient_type: 'Single',
    phone_number: '',
    address: '',
    email_address: '',
    category: '',
    plan: '',
    allergies: '',
    relationship_to_patient: '',
  });

  const [plans, setPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (formData.category) {
      api.getPlans(formData.category).then((res) => {
        setPlans(res);
      });
    } else {
      setPlans([]);
    }
  }, [formData.category]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.surname || !formData.first_name || !formData.dob || !formData.phone_number) {
      setError('Please fill in required fields: Surname, First Name, DOB, and Phone Number.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      // Auto-generate hospital number if not present
      const hospNum = String(Math.floor(1000 + Math.random() * 9000));
      const payload = {
        ...formData,
        hospital_number: hospNum,
        category: formData.category ? Number(formData.category) : null,
        plan: formData.plan ? Number(formData.plan) : null,
      };

      const created = await api.createPatient(payload);
      onPatientCreated(created);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save patient. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop-custom" onClick={onClose}></div>
      <div className="card shadow modal-custom">
        <div className="card-header py-3 bg-primary text-white d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold">
            <i className="fa fa-user-plus mr-2"></i> Register New Patient
          </h6>
          <button
            type="button"
            className="close text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger py-2 small" role="alert">
                <i className="fas fa-exclamation-triangle mr-2"></i> {error}
              </div>
            )}

            <div className="row">
              <div className="col-md-4 form-group">
                <label className="small font-weight-bold">Surname *</label>
                <input
                  type="text"
                  name="surname"
                  className="form-control form-control-sm"
                  required
                  value={formData.surname}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-4 form-group">
                <label className="small font-weight-bold">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  className="form-control form-control-sm"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-4 form-group">
                <label className="small font-weight-bold">Other Name</label>
                <input
                  type="text"
                  name="other_name"
                  className="form-control form-control-sm"
                  value={formData.other_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-4 form-group">
                <label className="small font-weight-bold">Date of Birth *</label>
                <input
                  type="date"
                  name="dob"
                  className="form-control form-control-sm"
                  required
                  value={formData.dob}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-4 form-group">
                <label className="small font-weight-bold">Gender</label>
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
                <label className="small font-weight-bold">Marital Status</label>
                <select
                  name="patient_type"
                  className="custom-select custom-select-sm"
                  value={formData.patient_type}
                  onChange={handleChange}
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 form-group">
                <label className="small font-weight-bold">Phone Number *</label>
                <input
                  type="tel"
                  name="phone_number"
                  className="form-control form-control-sm"
                  required
                  placeholder="e.g. 08012345678"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-6 form-group">
                <label className="small font-weight-bold">Email Address</label>
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

            <div className="row">
              <div className="col-md-6 form-group">
                <label className="small font-weight-bold">Category</label>
                <select
                  name="category"
                  className="custom-select custom-select-sm"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 form-group">
                <label className="small font-weight-bold">Tariff / Insurance Plan</label>
                <select
                  name="plan"
                  className="custom-select custom-select-sm"
                  value={formData.plan}
                  onChange={handleChange}
                  disabled={plans.length === 0}
                >
                  <option value="">-- Select Plan --</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.plan}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="small font-weight-bold">Residential Address</label>
              <textarea
                name="address"
                rows="2"
                className="form-control form-control-sm"
                value={formData.address}
                onChange={handleChange}
              ></textarea>
            </div>

            <div className="row">
              <div className="col-md-6 form-group">
                <label className="small font-weight-bold">Known Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  className="form-control form-control-sm"
                  placeholder="e.g. Penicillin, Latex"
                  value={formData.allergies}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-6 form-group">
                <label className="small font-weight-bold">Next of Kin / Relationship</label>
                <input
                  type="text"
                  name="relationship_to_patient"
                  className="form-control form-control-sm"
                  placeholder="e.g. Brother, Spouse"
                  value={formData.relationship_to_patient}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="card-footer bg-light d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary btn-sm mr-2"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={saving}
            >
              {saving ? (
                <span>
                  <i className="fas fa-spinner fa-spin mr-1"></i> Saving...
                </span>
              ) : (
                <span>
                  <i className="fas fa-save mr-1"></i> Save Patient
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
