import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './store.jsx';
import Layout, { PortalLayout } from './components/Layout.jsx';
const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Projects = lazy(() => import('./pages/Projects.jsx'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail.jsx'));
const Materials = lazy(() => import('./pages/Materials.jsx'));
const Attendance = lazy(() => import('./pages/Attendance.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Expenses = lazy(() => import('./pages/Expenses.jsx'));
const Alerts = lazy(() => import('./pages/Alerts.jsx'));
const Access = lazy(() => import('./pages/Access.jsx'));
const Company = lazy(() => import('./pages/Company.jsx'));
const Transfers = lazy(() => import('./pages/Transfers.jsx'));
const Assets = lazy(() => import('./pages/Assets.jsx'));
const Field = lazy(() => import('./pages/Field.jsx'));
const PortalHome = lazy(() => import('./pages/Portal.jsx').then((m) => ({ default: m.PortalHome })));
const PortalProject = lazy(() => import('./pages/Portal.jsx').then((m) => ({ default: m.PortalProject })));
import NexusPreloader from './nexus/NexusPreloader.jsx';

function NoAccess() {
  const { t, logout } = useStore();
  return <div className="state"><p>{t('nohq')}</p><button className="btn ok" onClick={logout}>{t('signout')}</button></div>;
}

export default function App() {
  const { user, can } = useStore();
  if (!user) return <Suspense fallback={<NexusPreloader />}><Routes><Route path="*" element={<Login />} /></Routes></Suspense>;
  if (!can('VIEW_DASHBOARD')) {
    if (!can('VIEW_CLIENT_PORTAL')) {
      // Site foremen: the field interface. They have no dashboard, finances, assets or project administration.
      const field = ['MANAGE_ATTENDANCE', 'SUBMIT_REPORTS', 'MANAGE_DELIVERIES'].some((p) => can(p));
      return field ? <Suspense fallback={<NexusPreloader />}><Field /></Suspense> : <NoAccess />;
    }
    return (
      <PortalLayout>
        <Suspense fallback={<NexusPreloader fullscreen={false} />}>
        <Routes>
          <Route path="/" element={<PortalHome />} />
          <Route path="/p/:id" element={<PortalProject />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </PortalLayout>
    );
  }
  return (
    <Layout>
      <Suspense fallback={<NexusPreloader fullscreen={false} />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {can('VIEW_PROGRESS') && <Route path="/projects" element={<Projects />} />}
        {can('VIEW_PROGRESS') && <Route path="/projects/:id" element={<ProjectDetail />} />}
        {can('VIEW_MATERIALS') && <Route path="/materials" element={<Materials />} />}
        {(can('VIEW_ATTENDANCE') || can('APPROVE_ATTENDANCE')) && <Route path="/attendance" element={<Attendance />} />}
        {can('VIEW_REPORTS') && <Route path="/reports" element={<Reports />} />}
        {can('VIEW_TRANSFERS') && <Route path="/transfers" element={<Transfers />} />}
        {can('VIEW_ASSETS') && <Route path="/assets" element={<Assets />} />}
        {can('VIEW_EXPENSES') && <Route path="/expenses" element={<Expenses />} />}
        {can('VIEW_ALERTS') && <Route path="/alerts" element={<Alerts />} />}
        {can('MANAGE_COMPANY') && <Route path="/company" element={<Company />} />}
        {can('MANAGE_USERS') && <Route path="/access" element={<Access />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </Layout>
  );
}
