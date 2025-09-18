import React, { Component, ReactNode } from 'react';
import { AlertTriangleIcon } from './icons';

interface Props {
  children: ReactNode;
  componentName: string;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

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
          <p className="text-brand-muted mt-2">
            The "{this.props.componentName}" component has encountered an error. Please try refreshing the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
