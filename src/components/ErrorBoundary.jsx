import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '20px', 
          textAlign: 'center',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)'
        }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '20px' 
          }}>⚠️</div>
          <h1 style={{ fontSize: '2rem', marginBottom: '16px' }}>Oops! Something went wrong</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '32px', lineHeight: '1.6' }}>
            The application encountered an unexpected error. This can happen due to a temporary glitch or corrupted data.
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              className="btn btn-primary" 
              onClick={this.handleRetry} 
              style={{ padding: '12px 32px' }}
            >
              Try Again
            </button>
            <button 
              className="btn btn-outline" 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ padding: '12px 32px' }}
            >
              Reset Data (Fixes Crash)
            </button>
          </div>
          <p style={{ marginTop: '40px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Error Details: {this.state.error?.message || "Unknown Runtime Error"}
          </p>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
