import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { RowGroupingModule, RowGroupingPanelModule } from 'ag-grid-enterprise';

ModuleRegistry.registerModules([
    AllCommunityModule,
    RowGroupingModule,
    RowGroupingPanelModule
]);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
