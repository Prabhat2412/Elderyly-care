import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-[40px] border border-rose-100 shadow-xl max-w-md w-full">
            <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-[32px] flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black mb-4">Something went wrong</h1>
            <p className="text-gray-500 mb-8 font-medium">We encountered an unexpected error. Please refresh the page to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-600 transition-colors"
            >
              <RefreshCw className="w-5 h-5" /> Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
