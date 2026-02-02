import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // <--- ESTO ES LO QUE FALTA
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* El BrowserRouter debe abrazar a toda la App */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);