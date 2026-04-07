import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/90 px-8 py-12 text-center">
          <div className="mb-4 text-slate-500">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-800">Something went wrong</h3>
          <p className="mb-6 max-w-sm text-sm text-slate-500">
            An error occurred while loading this view. You can try re-uploading your data to recover.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Try re-uploading data
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
