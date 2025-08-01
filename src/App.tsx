import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { MantineProvider } from '@mantine/core';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

import '@mantine/core/styles.css';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <MantineProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
        <ToastContainer position="bottom-right" />
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;
