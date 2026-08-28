import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center px-5 text-center">
          <div className="max-w-sm">
            <div className="mb-5 w-14 h-14 rounded-2xl grid place-items-center mx-auto" style={{ background: "rgba(248,113,113,0.12)" }}>
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h1 className="font-display font-bold text-xl mb-2" style={{ color: "var(--fg)" }}>
              Something went wrong
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
              This part of the app hit an unexpected error. Reloading usually fixes it.
            </p>
            <button onClick={() => window.location.reload()} className="btn btn-primary mx-auto">
              <RefreshCw className="w-4 h-4" /> Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
