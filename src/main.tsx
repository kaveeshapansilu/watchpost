import { SITE } from './lib/site';
import { hexToRgb } from './lib/settings';
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout';
import PublicStatusPage from './pages/PublicStatusPage';
import MaintenancePage from './pages/MaintenancePage';
import IncidentsPage from './pages/IncidentsPage';
import NotFound from './pages/NotFound';
import { ADMIN_LOGIN_PATH, ADMIN_PATH } from './lib/admin';

// Split admin UI into a separate chunk so the public bundle served at
// /, /maintenance, /incidents contains no admin screens or logic.
// eslint-disable-next-line react/only-export-components -- This file mounts the application.
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
// eslint-disable-next-line react/only-export-components -- This file mounts the application.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

document.documentElement.style.setProperty('--brand-primary', hexToRgb(SITE.primaryColor));
document.documentElement.style.setProperty('--brand-accent', hexToRgb(SITE.accentColor));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<p className="py-10 text-center text-sm text-slate-500">Loading…</p>}>
          <Routes>
            {/* Public. deliberately only these three paths are linked in the UI */}
            <Route path="/" element={<PublicStatusPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/incidents" element={<IncidentsPage />} />

            {/* Admin. access requires an authenticated administrator.
                Configure its path in site.config.json. */}
            <Route path={ADMIN_LOGIN_PATH} element={<AdminLogin />} />
            <Route path={ADMIN_PATH} element={<AdminDashboard />} />

            <Route path="/status" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  </StrictMode>,
);
