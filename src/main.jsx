import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

// StrictMode double-invokes effects in development on purpose, to surface
// effects that are not safe to run twice. ChatScreen guards its opener call
// with a ref for exactly this reason.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
