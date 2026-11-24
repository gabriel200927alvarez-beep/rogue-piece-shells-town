import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles.css';
import { initGame } from './game/gameLoop.ts';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initGame(), { once: true });
} else {
  initGame();
}
