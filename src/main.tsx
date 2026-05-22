import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './audit.css';
import './filters.css';
import './landing.css';
import './auth.css';
import './session.css';
import './incomeCompare.css';
import './savedAnalyses.css';
import './importCleanup.css';
import './authBootstrap';
import './authFlowBootstrap';
import './incomeCompareBootstrap';
import './savedAnalysesBootstrap';
import './monthlyHistoryBootstrap';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
