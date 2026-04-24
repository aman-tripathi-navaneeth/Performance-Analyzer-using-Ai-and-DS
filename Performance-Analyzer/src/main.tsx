import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initMockBackend } from './lib/mockBackend';

// Initialize the local storage client-side mock database
initMockBackend();

createRoot(document.getElementById("root")!).render(<App />);
