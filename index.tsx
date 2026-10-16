import { registerRootComponent } from 'expo';
import { createRoot } from 'react-dom/client';
import App from './App';

// For web: create a root element and render the app
if (typeof document !== 'undefined') {
  const root = document.getElementById('root') || document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  const rootInstance = createRoot(root);
  rootInstance.render(<App />);
} else {
  // For native: use registerRootComponent
  registerRootComponent(App);
}
