import React, { StrictMode } from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { logDebug, logError } from './lib/debug';

class DebugErrorBoundary extends (React.Component as new (
  props: { children: React.ReactNode }
) => React.Component<{ children: React.ReactNode }, { hasError: boolean }>) {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    (this as any).state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logError('error-boundary', 'React render crashed', { error, info });
  }

  render(): React.ReactNode {
    if ((this as any).state.hasError) {
      logError('error-boundary', 'Rendering fallback after crash');
      return (
        <div style={{ padding: 24, color: 'white', background: '#100', minHeight: '100vh' }}>
          <h1>Snaplet crashed while rendering.</h1>
          <p>Open browser console and look for [snaplet-debug] logs.</p>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

window.addEventListener('error', (event) => {
  logError('window.error', 'Unhandled window error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logError('window.unhandledrejection', 'Unhandled promise rejection', event.reason);
});

logDebug('bootstrap', 'Starting React mount', { url: window.location.href });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DebugErrorBoundary>
        <App />
      </DebugErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);

logDebug('bootstrap', 'React mount call completed');
