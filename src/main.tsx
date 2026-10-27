import React from 'react';
import ReactDOM from 'react-dom/client';
import Shell, { bootstrap } from './Shell';
import './index.css';

// Before React, not inside it: every useLocalStorage reads its key as it
// mounts, so an install being moved into its first project has to be moved
// before the first render rather than during it.
bootstrap();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Shell />
  </React.StrictMode>
);
