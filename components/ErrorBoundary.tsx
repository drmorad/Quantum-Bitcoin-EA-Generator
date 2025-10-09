
import React from 'react';
import { AlertTriangleIcon } from './icons.tsx';

// Use React.PropsWithChildren to correctly type props that include children.
type Props = React.PropsWithChildren<{
  componentName: string;
  fallbackMessage?: React.ReactNode;
}>;

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false };

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error caught in ${this.props.componentName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-6 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
          <AlertTriangleIcon className="w-12 h-12 text-yellow-400 mb-4" />
          <h3 className="text-lg font-semibold text-white">Something went wrong</h3>
          {this.props.fallbackMessage ? (
            this.props.fallbackMessage
           ) : (
            <p className="text-brand-muted mt-2">
                The "{this.props.componentName}" component has encountered an error. Please try refreshing the page.
            </p>
           )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
