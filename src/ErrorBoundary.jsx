import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#fff', color: '#f00', minHeight: '100vh', width: '100vw', zIndex: 99999, position: 'fixed', top: 0, left: 0, overflow: 'auto' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>SYSTEM CRASH!</h1>
          <p style={{ fontWeight: 'bold' }}>{this.state.error?.toString()}</p>
          <pre style={{ marginTop: '1rem', backgroundColor: '#eee', padding: '1rem', color: '#000', whiteSpace: 'pre-wrap' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
