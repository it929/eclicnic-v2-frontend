import React, { useState, useEffect } from 'react';

// Global helper to trigger toast from anywhere in the application
export const showToast = (message, type = 'success', title = '') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('clinic365:toast', {
        detail: {
          id: Date.now() + Math.random(),
          message,
          type, // 'success' | 'danger' | 'warning' | 'info'
          title,
        },
      })
    );
  }
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const toast = e.detail;
      setToasts((prev) => [...prev, toast]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== toast.id));
      }, 4000);
    };

    window.addEventListener('clinic365:toast', handleToastEvent);
    return () => window.removeEventListener('clinic365:toast', handleToastEvent);
  }, []);

  const removeToast = (id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        width: 'calc(100% - 48px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isDanger = toast.type === 'danger' || toast.type === 'error';
        const isWarning = toast.type === 'warning';

        const borderColor = isSuccess
          ? '#1cc88a'
          : isDanger
          ? '#e74a3b'
          : isWarning
          ? '#f6c23e'
          : '#4e73df';

        const iconClass = isSuccess
          ? 'fas fa-check-circle text-success'
          : isDanger
          ? 'fas fa-times-circle text-danger'
          : isWarning
          ? 'fas fa-exclamation-triangle text-warning'
          : 'fas fa-info-circle text-info';

        const defaultTitle = isSuccess
          ? 'Success'
          : isDanger
          ? 'Action Failed'
          : isWarning
          ? 'Notice'
          : 'Information';

        return (
          <div
            key={toast.id}
            className="toast-notification-card shadow-lg"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              borderLeft: `4px solid ${borderColor}`,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              pointerEvents: 'auto',
              animation: 'toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderLeftWidth: '5px',
            }}
          >
            <div className="d-flex align-items-start pr-2">
              <i
                className={`${iconClass} mr-2 mt-1`}
                style={{ fontSize: '1.25rem', flexShrink: 0 }}
              ></i>
              <div>
                <strong
                  className="d-block text-gray-900"
                  style={{ fontSize: '0.88rem', lineHeight: '1.2' }}
                >
                  {toast.title || defaultTitle}
                </strong>
                <span
                  className="text-gray-700 mt-1 d-block"
                  style={{ fontSize: '0.82rem', lineHeight: '1.4' }}
                >
                  {toast.message}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-muted border-0 bg-transparent p-0 ml-2"
              style={{
                cursor: 'pointer',
                opacity: 0.6,
                fontSize: '1.1rem',
                lineHeight: '1',
              }}
              title="Dismiss notification"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}
