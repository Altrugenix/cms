import { Component, type ReactNode, type ErrorInfo } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-12">
          <div className="rounded-full bg-destructive/10 p-4">
            <span className="text-2xl text-destructive">!</span>
          </div>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {this.state.error?.message ?? "An unexpected error occurred"}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null, hasError: false })}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
