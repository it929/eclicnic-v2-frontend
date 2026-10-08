import React, { useState } from 'react';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your Staff ID or Username.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onLoginSuccess(username.trim(), password);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Invalid Staff ID or Password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #172a45 100%)',
        fontFamily: '"Nunito", "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Background Image Overlay */}
      <img
        src="/admin-img/login-bg.png"
        alt="Isalu Hospital Background"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />

      {/* Dark Ambient Gradient Layer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at center, rgba(16, 37, 66, 0.6) 0%, rgba(10, 20, 36, 0.9) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Login Card Container */}
      <div
        className="container"
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '460px',
          padding: '20px',
        }}
      >
        <div
          className="shadow-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden',
          }}
        >
          {/* Card Top Brand Header with Official Logo */}
          <div
            className="p-4 text-center bg-white"
            style={{
              borderBottom: '1px solid #e3e6f0',
            }}
          >
            <div
              className="d-inline-flex align-items-center justify-content-center mb-2 p-2 bg-white rounded-circle shadow-sm"
              style={{
                width: '84px',
                height: '84px',
                border: '2px solid #e3e6f0',
              }}
            >
              <img
                src="/admin-img/isalu-emblem-transparent.png"
                alt="Isalu Hospitals Logo"
                style={{ width: '85%', height: '85%', objectFit: 'contain' }}
              />
            </div>
            <h4 className="font-weight-bold mb-0 text-primary" style={{ letterSpacing: '0.5px' }}>
              ISALU HOSPITALS
            </h4>
            <div className="badge badge-light border text-muted px-2 py-1 mt-1 font-weight-bold" style={{ fontSize: '0.7rem' }}>
              RC 502112
            </div>
            <p className="small mb-0 text-muted mt-2 font-weight-bold">
              Clinic365 Enterprise HIS &bull; Clinical EMR Portal
            </p>
          </div>

          {/* Form Content */}
          <div className="p-4">
            <div className="text-center mb-4">
              <h5 className="font-weight-bold text-gray-800 mb-1">Welcome Back</h5>
              <p className="text-muted small mb-0">Sign in to your clinical or administrative account</p>
            </div>

            {error && (
              <div
                className="alert alert-danger py-2 px-3 small font-weight-bold d-flex align-items-center mb-3"
                role="alert"
                style={{ borderRadius: '0.5rem' }}
              >
                <i className="fas fa-exclamation-circle mr-2 fa-lg"></i>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Staff ID Field */}
              <div className="form-group mb-3">
                <label className="small font-weight-bold text-gray-700 mb-1">
                  Staff ID / Username
                </label>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text bg-light border-right-0 text-primary">
                      <i className="fas fa-id-badge"></i>
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-control border-left-0 font-weight-bold"
                    placeholder="e.g. 1638"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ height: '46px' }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="form-group mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="small font-weight-bold text-gray-700 mb-0">
                    Password
                  </label>
                  <a
                    href="#"
                    className="small text-primary font-weight-bold"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowForgotModal(true);
                    }}
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text bg-light border-right-0 text-primary">
                      <i className="fas fa-lock"></i>
                    </span>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control border-left-0 border-right-0 font-weight-bold"
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ height: '46px' }}
                  />
                  <div className="input-group-append">
                    <button
                      type="button"
                      className="btn btn-light border border-left-0 text-muted"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={showPassword ? 'fas fa-eye-slash text-primary' : 'fas fa-eye'}></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Remember Me */}
              <div className="form-group d-flex align-items-center justify-content-between mb-4">
                <div className="custom-control custom-checkbox">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="rememberMeCheck"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="custom-control-label small text-muted" htmlFor="rememberMeCheck">
                    Remember my credentials
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary btn-block shadow-sm font-weight-bold py-2 mb-3"
                disabled={loading}
                style={{
                  height: '46px',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  letterSpacing: '0.5px',
                  background: 'linear-gradient(135deg, #4e73df 0%, #2e59d9 100%)',
                }}
              >
                {loading ? (
                  <span>
                    <i className="fas fa-spinner fa-spin mr-2"></i> Authenticating...
                  </span>
                ) : (
                  <span>
                    <i className="fas fa-sign-in-alt mr-2"></i> Sign In to Portal
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Card Footer Security Tagline */}
          <div
            className="py-2 px-4 text-center bg-light border-top"
            style={{ fontSize: '0.75rem', color: '#6c757d' }}
          >
            <i className="fas fa-shield-alt text-success mr-1"></i> Encrypted 256-bit TLS &bull; Role-Based Access Control
          </div>
        </div>

        {/* Outer footer */}
        <div className="text-center text-white-50 mt-3 small font-weight-bold">
          &copy; {new Date().getFullYear()} Isalu Hospital &bull; Clinic365 Health Information System
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-primary text-white">
                <h6 className="modal-title font-weight-bold">
                  <i className="fas fa-key mr-2"></i> Password Recovery Request
                </h6>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => setShowForgotModal(false)}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body p-4 text-center">
                <i className="fas fa-user-shield fa-3x text-info mb-3"></i>
                <h6 className="font-weight-bold text-gray-800">Hospital Security Protocol</h6>
                <p className="text-muted small mb-3">
                  To reset your password, please contact the IT Administrator or Clinical Management Unit directly.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm px-4"
                  onClick={() => setShowForgotModal(false)}
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
