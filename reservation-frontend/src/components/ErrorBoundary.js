import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Render 失敗要確保有落地資訊
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mt-4">
          <div className="alert alert-danger">
            <h4 className="alert-heading">頁面錯誤</h4>
            <p className="mb-0">發生渲染錯誤，請刷新頁面。</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

