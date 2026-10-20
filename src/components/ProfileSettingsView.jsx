import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export default function ProfileSettingsView({ initialTab = 'overview', currentUser, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [profile, setProfile] = useState(() => {
    if (currentUser) return currentUser;
    try {
      const u = localStorage.getItem('clinic365_user');
      return u ? JSON.parse(u) : null;
    } catch (_) {
      return null;
    }
  });
  const [hasPin, setHasPin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Avatar upload states
  const fileInputRef = useRef(null);
  const modifyFileInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Helper to compute avatar source
  const getAvatarSrc = () => {
    if (avatarPreview) return avatarPreview;
    if (!profile) return '/admin-img/undraw_profile.svg';
    if (profile.avatar_url) return profile.avatar_url;
    if (profile.avatar && profile.avatar !== 'image/avatar.svg') {
      if (profile.avatar.startsWith('http') || profile.avatar.startsWith('/')) {
        return profile.avatar;
      }
      return `/media/${profile.avatar}`;
    }
    return '/admin-img/undraw_profile.svg';
  };

  // Avatar upload handler
  const handleAvatarFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Maximum allowed size is 5MB.');
      return;
    }

    // Immediate local preview
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    try {
      setAvatarUploading(true);
      setError(null);
      setMessage(null);
      const res = await api.uploadAvatar(file);
      setMessage(res.detail || 'Profile photo updated successfully!');
      if (res.user) {
        setProfile(res.user);
        localStorage.setItem('clinic365_user', JSON.stringify(res.user));
        if (onUserUpdated) onUserUpdated(res.user);
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setError(err.response?.data?.detail || 'Failed to upload profile photo. Please try again.');
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (modifyFileInputRef.current) modifyFileInputRef.current.value = '';
    }
  };

  // Form states initialized with cached user data
  const [modifyForm, setModifyForm] = useState(() => {
    let u = currentUser;
    if (!u) {
      try {
        const cached = localStorage.getItem('clinic365_user');
        if (cached) u = JSON.parse(cached);
      } catch (_) {}
    }
    return {
      fullname: u?.fullname || '',
      email: u?.email || '',
      phone_number: u?.phone_number || '',
      address: u?.address || '',
      dob: u?.dob || '',
      gender: u?.gender || 'Male',
      pin_code: '',
    };
  });

  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [pinForm, setPinForm] = useState({
    new_pin: '',
    confirm_pin: '',
  });

  // Password visibility states
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPinCode, setShowPinCode] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getProfile();
      if (data?.user) {
        setProfile(data.user);
        if (data.has_pin !== undefined) setHasPin(data.has_pin);
        localStorage.setItem('clinic365_user', JSON.stringify(data.user));
        setModifyForm({
          fullname: data.user.fullname || '',
          email: data.user.email || '',
          phone_number: data.user.phone_number || '',
          address: data.user.address || '',
          dob: data.user.dob || '',
          gender: data.user.gender || 'Male',
          pin_code: '',
        });
        if (onUserUpdated) onUserUpdated(data.user);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleModifySubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setMessage(null);
      const res = await api.updateProfile(modifyForm);
      setMessage(res.detail || 'Profile successfully updated!');
      if (res.user) {
        setProfile(res.user);
        localStorage.setItem('clinic365_user', JSON.stringify(res.user));
        if (onUserUpdated) onUserUpdated(res.user);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile. Please verify your PIN code.');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.old_password) {
      setError('Current password is required.');
      return;
    }
    if (!passwordForm.new_password) {
      setError('New password is required.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match.');
      return;
    }
    try {
      setError(null);
      setMessage(null);
      const res = await api.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });
      setMessage(res.detail || 'Password changed successfully!');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      const serverDetail = err.response?.data?.detail || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response?.data : null);
      setError(serverDetail || 'Failed to change password. Please check your current password.');
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (pinForm.new_pin !== pinForm.confirm_pin) {
      setError('PIN numbers do not match.');
      return;
    }
    if (pinForm.new_pin.length !== 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    try {
      setError(null);
      setMessage(null);
      const res = await api.updatePin(pinForm.new_pin);
      setMessage(res.detail || 'Security PIN updated successfully!');
      setPinForm({ new_pin: '', confirm_pin: '' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update PIN.');
    }
  };

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-0 text-gray-800 font-weight-bold">Staff Profile & Settings</h1>
          <p className="text-muted small mb-0">Manage your staff credentials, security PIN, and account preferences</p>
        </div>
      </div>

      {/* Global Alerts */}
      {message && (
        <div className="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
          <i className="fas fa-check-circle mr-2"></i> {message}
          <button type="button" className="close" onClick={() => setMessage(null)}>
            <span>&times;</span>
          </button>
        </div>
      )}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
          <i className="fas fa-exclamation-triangle mr-2"></i> {error}
          <button type="button" className="close" onClick={() => setError(null)}>
            <span>&times;</span>
          </button>
        </div>
      )}

      <div className="row">
        {/* Left Column: Profile Card */}
        <div className="col-xl-4 col-lg-5 mb-4">
          <div className="card shadow mb-4">
            <div className="card-header py-3 bg-gradient-primary text-white">
              <h6 className="m-0 font-weight-bold">
                <i className="fas fa-user-circle mr-2"></i> Staff Account
              </h6>
            </div>
            <div className="card-body text-center">
              {/* Interactive Avatar Container with Hover Overlay & Upload Button */}
              <div className="position-relative d-inline-block mb-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleAvatarFileSelected}
                />
                <div
                  className="position-relative rounded-circle overflow-hidden shadow-sm border"
                  style={{
                    width: '120px',
                    height: '120px',
                    margin: '0 auto',
                    cursor: 'pointer',
                    backgroundColor: '#f8fafc',
                  }}
                  onClick={() => !avatarUploading && fileInputRef.current?.click()}
                  title="Click to change profile picture"
                >
                  <img
                    src={getAvatarSrc()}
                    alt="Staff Avatar"
                    className="w-100 h-100"
                    style={{ objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = '/admin-img/undraw_profile.svg';
                    }}
                  />
                  {avatarUploading ? (
                    <div
                      className="position-absolute d-flex flex-column align-items-center justify-content-center text-white"
                      style={{
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        fontSize: '0.78rem',
                      }}
                    >
                      <i className="fas fa-spinner fa-spin fa-2x mb-1"></i>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div
                      className="position-absolute d-flex flex-column align-items-center justify-content-center text-white"
                      style={{
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.45)',
                        opacity: 0,
                        transition: 'opacity 0.2s ease-in-out',
                        fontSize: '0.76rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                    >
                      <i className="fas fa-camera fa-lg mb-1"></i>
                      <span className="font-weight-bold">Change</span>
                    </div>
                  )}
                </div>

                {/* Floating Camera Badge Button */}
                <button
                  type="button"
                  className="btn btn-sm btn-primary rounded-circle position-absolute shadow"
                  style={{
                    bottom: '2px',
                    right: '2px',
                    width: '34px',
                    height: '34px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #ffffff',
                  }}
                  onClick={() => !avatarUploading && fileInputRef.current?.click()}
                  title="Upload profile photo"
                  disabled={avatarUploading}
                >
                  <i className={`fas ${avatarUploading ? 'fa-spinner fa-spin' : 'fa-camera'}`} style={{ fontSize: '0.8rem' }}></i>
                </button>
              </div>

              <div className="mb-3">
                <button
                  type="button"
                  className="btn btn-xs btn-outline-primary py-1 px-3 font-weight-bold shadow-sm"
                  style={{ fontSize: '0.74rem', borderRadius: '14px' }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  <i className="fas fa-upload mr-1"></i> Change Photo
                </button>
              </div>
              <h4 className="font-weight-bold text-gray-800 mb-1">
                {profile?.fullname || profile?.username || 'User'}
              </h4>
              <p className="text-muted small mb-2">@{profile?.username || 'user'}</p>
              <div className="mb-3">
                <span className="badge badge-primary px-3 py-1 mr-1" style={{ fontSize: '0.8rem' }}>
                  {profile?.department_name || 'Admin'}
                </span>
                <span className="badge badge-success px-2 py-1" style={{ fontSize: '0.8rem' }}>
                  Active Staff
                </span>
              </div>

              <hr />

              <div className="text-left small">
                <div className="mb-2">
                  <i className="fas fa-envelope text-primary mr-2"></i>
                  <strong>Email:</strong> {profile?.email || 'N/A'}
                </div>
                <div className="mb-2">
                  <i className="fas fa-phone text-success mr-2"></i>
                  <strong>Phone:</strong> {profile?.phone_number || 'N/A'}
                </div>
                <div className="mb-2">
                  <i className="fas fa-venus-mars text-info mr-2"></i>
                  <strong>Gender:</strong> {profile?.gender || 'N/A'}
                </div>
                <div className="mb-2">
                  <i className="fas fa-key text-warning mr-2"></i>
                  <strong>Security PIN:</strong> Configured
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Nav Tabs & Forms */}
        <div className="col-xl-8 col-lg-7 mb-4">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <ul className="nav nav-pills card-header-pills">
                <li className="nav-item">
                  <button
                    className={`nav-link btn-sm ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('overview'); setError(null); setMessage(null); }}
                  >
                    <i className="fas fa-id-badge mr-1"></i> My Profile
                  </button>
                </li>
                <li className="nav-item ml-2">
                  <button
                    className={`nav-link btn-sm ${activeTab === 'modify' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('modify'); setError(null); setMessage(null); }}
                  >
                    <i className="fas fa-user-edit mr-1"></i> Modify Profile
                  </button>
                </li>
                <li className="nav-item ml-2">
                  <button
                    className={`nav-link btn-sm ${activeTab === 'password' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('password'); setError(null); setMessage(null); }}
                  >
                    <i className="fas fa-lock mr-1"></i> Change Password
                  </button>
                </li>
                <li className="nav-item ml-2">
                  <button
                    className={`nav-link btn-sm ${activeTab === 'pin' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('pin'); setError(null); setMessage(null); }}
                  >
                    <i className="fas fa-shield-alt mr-1"></i> Security PIN
                  </button>
                </li>
              </ul>
            </div>

            <div className="card-body">
              {/* Tab 1: My Profile Details */}
              {activeTab === 'overview' && (
                <div>
                  <h6 className="font-weight-bold text-primary mb-3">
                    <i className="fas fa-info-circle mr-1"></i> Official Staff Information
                  </h6>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <tbody>
                        <tr>
                          <th className="bg-light" style={{ width: '35%' }}>Staff Username / ID</th>
                          <td className="font-weight-bold text-danger">{profile?.username || 'N/A'}</td>
                        </tr>
                        <tr>
                          <th className="bg-light">Full Name</th>
                          <td className="font-weight-bold">{profile?.fullname || profile?.username || 'N/A'}</td>
                        </tr>
                        <tr>
                          <th className="bg-light">Department</th>
                          <td>
                            <span className="badge badge-primary">{profile?.department_name || 'Admin'}</span>
                          </td>
                        </tr>
                        <tr>
                          <th className="bg-light">Official Email</th>
                          <td>{profile?.email || 'N/A'}</td>
                        </tr>
                        <tr>
                          <th className="bg-light">Phone Number</th>
                          <td>{profile?.phone_number || 'N/A'}</td>
                        </tr>
                        <tr>
                          <th className="bg-light">Date of Birth</th>
                          <td>{profile?.dob || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <th className="bg-light">Residential Address</th>
                          <td>{profile?.address || 'Hospital Staff Quarters'}</td>
                        </tr>
                        <tr>
                          <th className="bg-light">Account Status</th>
                          <td>
                            <span className="badge badge-success">Verified Staff</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 text-right">
                    <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('modify')}>
                      <i className="fas fa-edit mr-1"></i> Edit Profile Information
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Modify Profile Form */}
              {activeTab === 'modify' && (
                <form onSubmit={handleModifySubmit}>
                  <h6 className="font-weight-bold text-primary mb-3">
                    <i className="fas fa-user-edit mr-1"></i> Update Staff Details
                  </h6>

                  {/* Photo Upload Section in Modify Form */}
                  <div className="card bg-light border p-3 mb-3" style={{ borderRadius: '10px' }}>
                    <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: '12px' }}>
                      <div className="d-flex align-items-center">
                        <img
                          src={getAvatarSrc()}
                          alt="Avatar Thumbnail"
                          className="rounded-circle border mr-3 shadow-sm"
                          style={{ width: '56px', height: '56px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.src = '/admin-img/undraw_profile.svg';
                          }}
                        />
                        <div>
                          <div className="font-weight-bold text-gray-800 small">Staff Profile Photo</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            Upload PNG, JPG, or WEBP (Max 5MB). Photo syncs across all hospital modules.
                          </div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                        <input
                          type="file"
                          ref={modifyFileInputRef}
                          style={{ display: 'none' }}
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          onChange={handleAvatarFileSelected}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary font-weight-bold shadow-sm d-inline-flex align-items-center"
                          style={{ borderRadius: '6px' }}
                          onClick={() => modifyFileInputRef.current?.click()}
                          disabled={avatarUploading}
                        >
                          <i className={`fas ${avatarUploading ? 'fa-spinner fa-spin' : 'fa-camera'} mr-1`}></i>
                          {avatarUploading ? 'Uploading...' : 'Upload New Photo'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 form-group">
                      <label className="small font-weight-bold">Full Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        value={modifyForm.fullname}
                        onChange={(e) => setModifyForm({ ...modifyForm, fullname: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 form-group">
                      <label className="small font-weight-bold">Email Address *</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        required
                        value={modifyForm.email}
                        onChange={(e) => setModifyForm({ ...modifyForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 form-group">
                      <label className="small font-weight-bold">Phone Number *</label>
                      <input
                        type="tel"
                        className="form-control form-control-sm"
                        required
                        value={modifyForm.phone_number}
                        onChange={(e) => setModifyForm({ ...modifyForm, phone_number: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 form-group">
                      <label className="small font-weight-bold">Gender</label>
                      <select
                        className="custom-select custom-select-sm"
                        value={modifyForm.gender}
                        onChange={(e) => setModifyForm({ ...modifyForm, gender: e.target.value })}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 form-group">
                      <label className="small font-weight-bold">Date of Birth</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={modifyForm.dob}
                        onChange={(e) => setModifyForm({ ...modifyForm, dob: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 form-group">
                      <label className="small font-weight-bold text-danger">
                        Security PIN Verification *
                      </label>
                      <div className="input-group input-group-sm">
                        <input
                          type={showPinCode ? 'text' : 'password'}
                          maxLength="4"
                          className="form-control"
                          placeholder="Enter your 4-digit PIN"
                          value={modifyForm.pin_code}
                          onChange={(e) => setModifyForm({ ...modifyForm, pin_code: e.target.value })}
                        />
                        <div className="input-group-append">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowPinCode(!showPinCode)}
                            title={showPinCode ? 'Hide PIN' : 'Show PIN'}
                          >
                            <i className={showPinCode ? 'fas fa-eye-slash text-danger' : 'fas fa-eye'}></i>
                          </button>
                        </div>
                      </div>
                      <small className="text-muted">Required by system security before saving changes</small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="small font-weight-bold">Residential Address</label>
                    <textarea
                      rows="2"
                      className="form-control form-control-sm"
                      value={modifyForm.address}
                      onChange={(e) => setModifyForm({ ...modifyForm, address: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="text-right mt-3">
                    <button type="submit" className="btn btn-primary btn-sm">
                      <i className="fas fa-save mr-1"></i> Save Changes
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 3: Change Password Form */}
              {activeTab === 'password' && (
                <form onSubmit={handlePasswordSubmit}>
                  <h6 className="font-weight-bold text-primary mb-3">
                    <i className="fas fa-lock mr-1"></i> Change Account Password
                  </h6>

                  <div className="form-group">
                    <label className="small font-weight-bold">Current Password *</label>
                    <div className="input-group input-group-sm">
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        className="form-control"
                        required
                        placeholder="Enter your existing password"
                        value={passwordForm.old_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                      />
                      <div className="input-group-append">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          title={showOldPassword ? 'Hide password' : 'Show password'}
                        >
                          <i className={showOldPassword ? 'fas fa-eye-slash text-primary' : 'fas fa-eye'}></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="small font-weight-bold">New Password *</label>
                    <div className="input-group input-group-sm">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        className="form-control"
                        required
                        placeholder="Enter new password (min. 8 characters)"
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      />
                      <div className="input-group-append">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          title={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          <i className={showNewPassword ? 'fas fa-eye-slash text-primary' : 'fas fa-eye'}></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="small font-weight-bold">Confirm New Password *</label>
                    <div className="input-group input-group-sm">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="form-control"
                        required
                        placeholder="Repeat new password"
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      />
                      <div className="input-group-append">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          <i className={showConfirmPassword ? 'fas fa-eye-slash text-primary' : 'fas fa-eye'}></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-right mt-3">
                    <button type="submit" className="btn btn-danger btn-sm">
                      <i className="fas fa-key mr-1"></i> Update Password
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 4: Security PIN Form */}
              {activeTab === 'pin' && (
                <form onSubmit={handlePinSubmit}>
                  <h6 className="font-weight-bold text-primary mb-3">
                    <i className="fas fa-shield-alt mr-1"></i> Set / Change Authorization PIN
                  </h6>
                  <p className="text-muted small">
                    Your 4-digit PIN is required to authorize critical actions, patient tariff overrides, and profile modifications.
                  </p>

                  <div className="row">
                    <div className="col-md-6 form-group">
                      <label className="small font-weight-bold">New 4-Digit PIN *</label>
                      <input
                        type="password"
                        maxLength="4"
                        className="form-control form-control-sm"
                        required
                        placeholder="e.g. 1234"
                        value={pinForm.new_pin}
                        onChange={(e) => setPinForm({ ...pinForm, new_pin: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6 form-group">
                      <label className="small font-weight-bold">Confirm PIN *</label>
                      <input
                        type="password"
                        maxLength="4"
                        className="form-control form-control-sm"
                        required
                        placeholder="Repeat 4-digit PIN"
                        value={pinForm.confirm_pin}
                        onChange={(e) => setPinForm({ ...pinForm, confirm_pin: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="text-right mt-3">
                    <button type="submit" className="btn btn-success btn-sm">
                      <i className="fas fa-shield-alt mr-1"></i> Save Security PIN
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
