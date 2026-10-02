import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './store.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Projects from './pages/Projects.jsx';
import Materials from './pages/Materials.jsx';
import Attendance from './pages/Attendance.jsx';
import Alerts from './pages/Alerts.jsx';

export default function App() {
  const { user } = useStore();
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
