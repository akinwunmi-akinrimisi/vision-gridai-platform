import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6 animate-in">
          <div className="text-center max-w-md w-full">
            {/* Error icon with glow */}
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-red-500/15 rounded-3xl blur-xl scale-125" />
              <div className="relative w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-500/[0.1] border border-red-200/50 dark:border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" strokeWidth={1.5} />
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
              Something went wrong
            </h2>
            <p className="text-text-muted dark:text-text-muted-dark text-sm mb-8 leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>

            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="
                inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                font-semibold text-sm text-white
                bg-gradient-to-r from-primary to-indigo-600
                hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5
                transition-all duration-300 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-primary/40
              "
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
