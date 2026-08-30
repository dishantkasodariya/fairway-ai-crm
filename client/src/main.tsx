import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { StorageService } from '@/modules/core/services/storageService';

// Initialize storage and seed data on launch
StorageService.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
