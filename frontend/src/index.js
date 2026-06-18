import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { UserProvider } from './components/player/UserContext';
import { FeedbackProvider } from './components/feedback/FeedbackContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <UserProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </UserProvider>
  </React.StrictMode>
);

// PWA: instant shell loads + offline fallback (production only, so dev
// never fights a stale cache).
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL}/service-worker.js`)
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
}

reportWebVitals();
