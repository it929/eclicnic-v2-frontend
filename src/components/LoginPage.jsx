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
      console.error('Login error:', err);
      const networkOrServerError =
        err.message === 'Network Error' || !err.response
          ? 'Cannot connect to backend server. Please verify your API URL and CORS settings.'
          : err.response?.status >= 500
          ? 'Server error occurred during login. Please check server logs.'
          : null;

      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        networkOrServerError ||
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
        className="container px-3"
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '435px',
          margin: 'auto',
        }}
      >
        <div
          className="shadow-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            borderRadius: '1.1rem',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.4)',
            overflow: 'hidden',
          }}
        >
          {/* Card Top Brand Header with Balanced Logo */}
          <div
            className="pt-3.5 pb-2.5 px-4 text-center bg-white"
            style={{
              borderBottom: '1px solid #e9ecef',
            }}
          >
            <div
              className="d-inline-flex align-items-center justify-content-center mb-2 p-1.5 bg-white rounded-circle shadow-sm"
              style={{
                width: '62px',
                height: '62px',
                border: '2px solid #e2e8f0',
              }}
            >
              <img
                src="/admin-img/isalu-emblem-transparent.png"
                alt="Isalu Hospitals Logo"
                style={{ width: '85%', height: '85%', objectFit: 'contain' }}
              />
            </div>
            <h5
              className="font-weight-bold mb-0 text-primary"
              style={{
                letterSpacing: '0.6px',
                fontSize: '1.22rem',
                color: '#1e40af',
              }}
            >
              ISALU HOSPITALS
            </h5>
            <div className="d-flex align-items-center justify-content-center mt-1.5 flex-wrap" style={{ gap: '6px' }}>
              <span
                className="badge badge-light border text-muted px-2 py-0.5 font-weight-bold"
                style={{ fontSize: '0.68rem', letterSpacing: '0.4px' }}
              >
                RC 502112
              </span>
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>&bull;</span>
              <span
                className="text-muted font-weight-bold"
                style={{ fontSize: '0.75rem', letterSpacing: '0.2px' }}
              >
                Clinic365 Enterprise HIS
              </span>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-4 pt-3 pb-3.5">
            <div className="text-center mb-3">
              <h6 className="font-weight-bold text-gray-800 mb-1" style={{ fontSize: '1rem' }}>
                Welcome Back
              </h6>
              <p className="text-muted small mb-0" style={{ fontSize: '0.78rem' }}>
                Sign in to your clinical or administrative account
              </p>
            </div>

            {error && (
              <div
                className="alert alert-danger py-2 px-3 small font-weight-bold d-flex align-items-center mb-2.5"
                role="alert"
                style={{ borderRadius: '0.4rem', fontSize: '0.8rem' }}
              >
                <i className="fas fa-exclamation-circle mr-2 fa-sm"></i>
                <div style={{ lineHeight: 1.35 }}>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Staff ID Field */}
              <div className="form-group mb-2.5">
                <label
                  className="font-weight-bold text-gray-700 mb-1 d-block"
                  style={{ fontSize: '0.78rem', letterSpacing: '0.2px' }}
                >
                  Staff ID / Username
                </label>
                <div className="login-input-group">
                  <div className="login-input-icon">
                    <i className="fas fa-id-badge"></i>
                  </div>
                  <input
                    type="text"
                    className="login-input-control"
                    placeholder="e.g. 1638"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="form-group mb-2.5">
                <label
                  className="font-weight-bold text-gray-700 mb-1 d-block"
                  style={{ fontSize: '0.78rem', letterSpacing: '0.2px' }}
                >
                  Password
                </label>
                <div className="login-input-group">
                  <div className="login-input-icon">
                    <i className="fas fa-lock"></i>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input-control"
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="login-input-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={showPassword ? 'fas fa-eye-slash text-primary' : 'fas fa-eye'}></i>
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password in one clean row */}
              <div className="d-flex align-items-center justify-content-between pt-1 mb-3">
                <div className="custom-control custom-checkbox" style={{ minHeight: 'auto' }}>
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="rememberMeCheck"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label
                    className="custom-control-label text-muted font-weight-normal"
                    htmlFor="rememberMeCheck"
                    style={{ fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Remember me
                  </label>
                </div>
                <a
                  href="#"
                  className="text-primary font-weight-bold"
                  style={{ fontSize: '0.8rem', textDecoration: 'none' }}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowForgotModal(true);
                  }}
                >
                  Forgot Password?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary btn-block shadow-sm font-weight-bold d-flex align-items-center justify-content-center mb-1"
                disabled={loading}
                style={{
                  height: '44px',
                  borderRadius: '0.45rem',
                  fontSize: '0.92rem',
                  letterSpacing: '0.4px',
                  background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
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
            className="py-2 px-3 text-center bg-light border-top d-flex align-items-center justify-content-center"
            style={{ fontSize: '0.72rem', color: '#64748b', gap: '6px' }}
          >
            <i className="fas fa-shield-alt text-success"></i>
            <span>Encrypted 256-bit TLS &bull; Role-Based Access Control</span>
          </div>
        </div>

        {/* Outer footer */}
        <div
          className="text-center text-white-50 mt-3 font-weight-bold"
          style={{ fontSize: '0.73rem', letterSpacing: '0.2px' }}
        >
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
