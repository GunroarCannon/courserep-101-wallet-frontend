import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useSearchParams, BrowserRouter } from 'react-router-dom';

// Required for wallet adapter
import '@solana/wallet-adapter-react-ui/styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render( 
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);