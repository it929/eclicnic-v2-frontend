import React, { useState } from 'react';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await onLoginSuccess(username, password);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop-custom" onClick={onClose}></div>
      <div className="card shadow modal-custom" style={{ maxWidth: '420px' }}>
        <div className="card-header py-3 bg-gradient-primary text-white d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold">
            <i className="fas fa-lock mr-2"></i> Clinic365 Staff Login
          </h6>
          <button type="button" className="close text-white" onClick={onClose}>
            <span>&times;</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger py-2 small" role="alert">
                {error}
              </div>
            )}

            <div className="text-center mb-3">
              <img
                src="/admin-img/isalu-emblem-transparent.png"
                alt="Isalu Hospitals"
                style={{ height: '52px', objectFit: 'contain' }}
                className="mb-2"
              />
              <h5 className="font-weight-bold text-gray-800 mb-0">ISALU HOSPITALS</h5>
              <div className="badge badge-light border text-muted px-2 py-0 mt-1" style={{ fontSize: '0.65rem' }}>
                RC 502112
              </div>
              <p className="text-muted small mt-1">Sign in to your staff portal account</p>
            </div>

            <div className="form-group">
              <label className="small font-weight-bold">Staff ID / Username</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter Staff ID (e.g. 1638)"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="small font-weight-bold">Password</label>
              <div className="input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="input-group-append">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={showPassword ? 'fas fa-eye-slash text-primary' : 'fas fa-eye'}></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card-footer bg-light d-flex justify-content-between align-items-center">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
