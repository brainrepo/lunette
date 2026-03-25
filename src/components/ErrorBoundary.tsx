import React from "react";
import ErrorViewer from "./ErrorViewer";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: string;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Lunette viewer crash:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorViewer
          title="Rendering error"
          message={this.state.error || "An unexpected error occurred in the viewer."}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
