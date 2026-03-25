import React from "react";
import ViewerRouter from "./components/ViewerRouter";
import ErrorBoundary from "./components/ErrorBoundary";

function App(): React.JSX.Element {
  return (
    <div id="app">
      <ErrorBoundary>
        <ViewerRouter />
      </ErrorBoundary>
    </div>
  );
}

export default App;
