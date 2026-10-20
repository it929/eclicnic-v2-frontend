import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    localStorage.removeItem('selectedDepartment');
    localStorage.removeItem('clinic365_user');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
          <div className="card shadow-lg border-0 rounded-lg text-center p-4" style={{ maxWidth: '540px' }}>
            <div className="text-danger mb-3">
              <i className="fas fa-exclamation-circle fa-4x"></i>
            </div>
            <h4 className="font-weight-bold text-dark mb-2">Something went wrong</h4>
            <p className="text-muted mb-3 small">
              An error occurred while loading this view. The error message is displayed below:
            </p>
            <div
              className="alert alert-danger text-left small font-monospace py-2 px-3 mb-4"
              style={{ maxHeight: '150px', overflowY: 'auto', wordBreak: 'break-word' }}
            >
              {this.state.error?.toString() || 'Unknown application error'}
            </div>
            <div className="d-flex justify-content-center gap-2">
              <button className="btn btn-primary font-weight-bold px-3 mr-2" onClick={this.handleReload}>
                <i className="fas fa-sync-alt mr-1"></i> Reload Page
              </button>
              <button className="btn btn-outline-secondary font-weight-bold px-3" onClick={this.handleResetState}>
                <i className="fas fa-home mr-1"></i> Reset View
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
