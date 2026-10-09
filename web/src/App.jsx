import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './store.jsx';
import Layout, { PortalLayout } from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Projects from './pages/Projects.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import Materials from './pages/Materials.jsx';
import Attendance from './pages/Attendance.jsx';
import Reports from './pages/Reports.jsx';
import Alerts from './pages/Alerts.jsx';
import Access from './pages/Access.jsx';
import { PortalHome, PortalProject } from './pages/Portal.jsx';

export default function App() {
  const { user, can } = useStore();
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  if (!can('VIEW_DASHBOARD')) {
    return (
      <PortalLayout>
        <Routes>
          <Route path="/" element={<PortalHome />} />
          <Route path="/p/:id" element={<PortalProject />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PortalLayout>
    );
  }
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {can('VIEW_PROGRESS') && <Route path="/projects" element={<Projects />} />}
        {can('VIEW_PROGRESS') && <Route path="/projects/:id" element={<ProjectDetail />} />}
        {can('VIEW_MATERIALS') && <Route path="/materials" element={<Materials />} />}
        {(can('VIEW_ATTENDANCE') || can('APPROVE_ATTENDANCE')) && <Route path="/attendance" element={<Attendance />} />}
        {can('VIEW_REPORTS') && <Route path="/reports" element={<Reports />} />}
        {can('VIEW_ALERTS') && <Route path="/alerts" element={<Alerts />} />}
        {can('MANAGE_USERS') && <Route path="/access" element={<Access />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
