import React, { useState, useEffect, useRef } from 'react';

export default function Topbar({
  user,
  currentRole,
  searchQuery,
  setSearchQuery,
  onOpenNewPatient,
  onLogout,
  onToggleSidebar,
  onOpenProfile,
}) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  const userDropdownRef = useRef(null);
  const alertsDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (alertsDropdownRef.current && !alertsDropdownRef.current.contains(event.target)) {
        setShowAlertsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav
      className="navbar navbar-expand navbar-light bg-white topbar mb-4 static-top"
      style={{
        height: '4.25rem',
        borderBottom: '1px solid #e3e6f0',
        boxShadow: '0 0.125rem 0.75rem 0 rgba(58, 59, 69, 0.05)',
        padding: '0 1.25rem',
        zIndex: 1020,
      }}
    >
      {/* Sidebar Toggle (Mobile / Tablet) */}
      <button
        id="sidebarToggleTop"
        className="btn btn-link d-md-none rounded-circle mr-2 text-gray-600 d-flex align-items-center justify-content-center"
        style={{ width: '38px', height: '38px', padding: 0 }}
        onClick={onToggleSidebar}
        title="Toggle Sidebar"
      >
        <i className="fa fa-bars fa-lg"></i>
      </button>

      {/* Hospital Brand in Topbar */}
      <div
        className="d-flex align-items-center mr-3 pr-3"
        style={{ borderRight: '1px solid #e3e6f0', flexShrink: 0 }}
      >
        <img
          src="/admin-img/isalu-emblem-transparent.png"
          alt="Isalu Hospitals"
          style={{
            height: '34px',
            width: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
          }}
          className="mr-2.5"
        />
        <div className="d-none d-sm-block" style={{ lineHeight: '1.15' }}>
          <div
            className="font-weight-bold"
            style={{
              fontSize: '0.86rem',
              color: '#1a365d',
              letterSpacing: '0.5px',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            ISALU HOSPITALS
          </div>
          <div className="d-flex align-items-center mt-0.5">
            <span
              className="badge badge-light border text-muted px-1.5 py-0 font-weight-bold mr-1"
              style={{ fontSize: '0.6rem', letterSpacing: '0.4px' }}
            >
              RC 502112
            </span>
            <span
              className="text-muted font-weight-bold d-none d-xl-inline"
              style={{ fontSize: '0.62rem', letterSpacing: '0.3px' }}
            >
              Clinic365 EMR
            </span>
          </div>
        </div>
      </div>

      {/* Topbar Search - Modern Integrated Pill Input */}
      <div
        className="d-none d-sm-flex align-items-center mr-auto my-2 my-md-0"
        style={{ maxWidth: '440px', width: '100%' }}
      >
        <div
          className="input-group align-items-center w-100"
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '24px',
            padding: '2px 8px 2px 14px',
            height: '38px',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <i
            className="fas fa-search mr-2.5"
            style={{ fontSize: '0.82rem', color: '#94a3b8' }}
          ></i>
          <input
            type="text"
            className="form-control bg-transparent border-0 p-0 text-gray-800"
            style={{
              fontSize: '0.82rem',
              boxShadow: 'none',
              outline: 'none',
              height: '100%',
            }}
            placeholder="Search patients by name, hospital no., phone..."
            aria-label="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="btn btn-link btn-sm text-gray-400 p-0 mr-2"
              onClick={() => setSearchQuery('')}
              style={{ textDecoration: 'none' }}
              title="Clear search"
            >
              <i className="fas fa-times-circle" style={{ fontSize: '0.85rem' }}></i>
            </button>
          )}
          <span
            className="d-none d-lg-inline-flex align-items-center text-muted px-1.5 py-0.5 rounded border"
            style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              lineHeight: 1,
            }}
            title="Keyboard shortcut"
          >
            ⌘K
          </span>
        </div>
      </div>

      {/* Quick Action - Register Patient (Never wraps, prominent professional button) */}
      <div className="d-none d-md-flex align-items-center ml-2 mr-3" style={{ flexShrink: 0 }}>
        <button
          className="btn btn-primary d-inline-flex align-items-center shadow-sm"
          style={{
            height: '36px',
            padding: '0 16px',
            fontSize: '0.82rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            borderRadius: '18px',
            letterSpacing: '0.3px',
            backgroundColor: '#4e73df',
            borderColor: '#4e73df',
            boxShadow: '0 2px 5px rgba(78, 115, 223, 0.25)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onClick={onOpenNewPatient}
        >
          <i className="fas fa-user-plus mr-1.5" style={{ fontSize: '0.78rem' }}></i>
          <span>Register Patient</span>
        </button>
      </div>

      {/* Topbar Navbar Right (Alerts, Divider, User) */}
      <ul className="navbar-nav ml-auto align-items-center" style={{ flexShrink: 0 }}>
        {/* Nav Item - Alerts */}
        <li
          className="nav-item dropdown no-arrow mx-1 position-relative"
          ref={alertsDropdownRef}
        >
          <a
            className="nav-link cursor-pointer d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: '38px',
              height: '38px',
              padding: 0,
              color: '#64748b',
              backgroundColor: showAlertsDropdown ? '#f1f5f9' : 'transparent',
              transition: 'background-color 0.15s ease',
            }}
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            title="Notifications & Alerts"
          >
            <i className="fas fa-bell fa-fw" style={{ fontSize: '0.95rem' }}></i>
            <span
              className="badge badge-danger position-absolute"
              style={{
                top: '3px',
                right: '3px',
                fontSize: '0.62rem',
                fontWeight: 700,
                borderRadius: '10px',
                padding: '2px 5px',
                border: '2px solid #ffffff',
                backgroundColor: '#e74a3b',
              }}
            >
              2+
            </span>
          </a>
          {showAlertsDropdown && (
            <div
              className="dropdown-menu dropdown-menu-right shadow animated--grow-in show border-0"
              style={{
                minWidth: '290px',
                position: 'absolute',
                right: 0,
                top: '110%',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                zIndex: 1050,
              }}
            >
              <div
                className="dropdown-header text-white font-weight-bold px-3 py-2 d-flex align-items-center justify-content-between"
                style={{
                  backgroundColor: '#4e73df',
                  borderTopLeftRadius: '10px',
                  borderTopRightRadius: '10px',
                }}
              >
                <span>Alerts Center</span>
                <span className="badge badge-light text-primary font-weight-bold">2 New</span>
              </div>
              <a className="dropdown-item d-flex align-items-center px-3 py-2.5 cursor-pointer border-bottom">
                <div className="mr-3">
                  <div
                    className="icon-circle text-white d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#4e73df',
                      fontSize: '0.85rem',
                    }}
                  >
                    <i className="fas fa-sync-alt"></i>
                  </div>
                </div>
                <div>
                  <div className="small text-gray-500 font-weight-bold">System Sync</div>
                  <span className="font-weight-bold text-gray-800 small d-block" style={{ lineHeight: '1.2' }}>
                    EMR connected with Django DRF API
                  </span>
                </div>
              </a>
              <a className="dropdown-item d-flex align-items-center px-3 py-2.5 cursor-pointer">
                <div className="mr-3">
                  <div
                    className="icon-circle text-white d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#1cc88a',
                      fontSize: '0.85rem',
                    }}
                  >
                    <i className="fas fa-stethoscope"></i>
                  </div>
                </div>
                <div>
                  <div className="small text-gray-500 font-weight-bold">Clinical Queue</div>
                  <span className="text-gray-700 small d-block" style={{ lineHeight: '1.2' }}>
                    Waiting queue ready for triage & vitals
                  </span>
                </div>
              </a>
            </div>
          )}
        </li>

        {/* Divider */}
        <div
          className="d-none d-sm-block mx-3"
          style={{ width: '1px', height: '28px', backgroundColor: '#e2e8f0' }}
        ></div>

        {/* User Information */}
        <li
          className="nav-item dropdown no-arrow position-relative"
          ref={userDropdownRef}
        >
          <a
            className="nav-link cursor-pointer d-flex align-items-center p-1 rounded"
            style={{
              height: 'auto',
              textDecoration: 'none',
              backgroundColor: showUserDropdown ? '#f8fafc' : 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            title="User Profile Menu"
          >
            <div
              className="d-flex flex-column text-right mr-2.5 d-none d-lg-flex"
              style={{ lineHeight: '1.15' }}
            >
              <span
                className="font-weight-bold text-gray-800"
                style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}
              >
                {user?.fullname || 'Tunde Laoye'}
              </span>
              <span className="mt-0.5">
                <span
                  className="badge px-1.5 py-0.5 font-weight-bold"
                  style={{
                    fontSize: '0.65rem',
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                    borderRadius: '8px',
                    letterSpacing: '0.3px',
                  }}
                >
                  {user?.department_name || currentRole || 'Admin'}
                </span>
              </span>
            </div>
            <div className="position-relative">
              <img
                className="img-profile rounded-circle"
                src="/admin-img/undraw_profile.svg"
                alt="User Profile"
                style={{
                  width: '34px',
                  height: '34px',
                  objectFit: 'cover',
                  border: '2px solid #cbd5e1',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              />
              <span
                className="position-absolute"
                style={{
                  bottom: '1px',
                  right: '1px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#10b981',
                  border: '1.5px solid #ffffff',
                  borderRadius: '50%',
                }}
                title="Online"
              ></span>
            </div>
            <i
              className="fas fa-chevron-down text-gray-400 ml-2 d-none d-sm-inline"
              style={{ fontSize: '0.62rem' }}
            ></i>
          </a>

          {showUserDropdown && (
            <div
              className="dropdown-menu dropdown-menu-right shadow animated--grow-in show border-0"
              style={{
                position: 'absolute',
                right: 0,
                top: '110%',
                minWidth: '200px',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                zIndex: 1050,
              }}
            >
              <div
                className="px-3 py-2.5 border-bottom"
                style={{ backgroundColor: '#f8fafc', borderTopLeftRadius: '10px', borderTopRightRadius: '10px' }}
              >
                <div className="font-weight-bold text-gray-800 small">{user?.fullname || 'Tunde Laoye'}</div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                  @{user?.username || '1638'} &bull; {user?.department_name || currentRole}
                </div>
              </div>
              <a
                className="dropdown-item cursor-pointer py-2 small"
                onClick={() => {
                  setShowUserDropdown(false);
                  if (onOpenProfile) onOpenProfile('overview');
                }}
              >
                <i className="fas fa-user fa-sm fa-fw mr-2 text-gray-400"></i>
                My Profile
              </a>
              <a
                className="dropdown-item cursor-pointer py-2 small"
                onClick={() => {
                  setShowUserDropdown(false);
                  if (onOpenProfile) onOpenProfile('modify');
                }}
              >
                <i className="fas fa-cogs fa-sm fa-fw mr-2 text-gray-400"></i>
                Profile Settings
              </a>
              <a
                className="dropdown-item cursor-pointer py-2 small"
                onClick={() => {
                  setShowUserDropdown(false);
                  if (onOpenProfile) onOpenProfile('password');
                }}
              >
                <i className="fas fa-lock fa-sm fa-fw mr-2 text-gray-400"></i>
                Change Password
              </a>
              <div className="dropdown-divider my-1"></div>
              <a
                className="dropdown-item cursor-pointer py-2 small text-danger font-weight-bold"
                onClick={() => {
                  setShowUserDropdown(false);
                  onLogout();
                }}
              >
                <i className="fas fa-sign-out-alt fa-sm fa-fw mr-2 text-danger"></i>
                Logout
              </a>
            </div>
          )}
        </li>
      </ul>
    </nav>
  );
}
