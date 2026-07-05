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
    this.setState({
      error,
      errorInfo,
    });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          color: 'var(--fg)',
          padding: '24px',
        }}>
          <div style={{
            maxWidth: '600px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}>
            <h1 style={{ fontSize: '32px', margin: 0 }}>Bir hata oluştu</h1>
            <p style={{ color: 'var(--fg-dim)', margin: 0 }}>
              Maalesef uygulamada beklenmeyen bir hata meydana geldi. 
              Lütfen sayfayı yenileyin veya ana sayfaya dönün.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                textAlign: 'left',
                background: 'var(--bg-panel)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '12px' }}>Hata Detayları</summary>
                <pre style={{
                  fontSize: '12px',
                  color: 'var(--fg-mute)',
                  overflow: 'auto',
                  margin: 0,
                }}>
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                background: 'var(--accent)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
