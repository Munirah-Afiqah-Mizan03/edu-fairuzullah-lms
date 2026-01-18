import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';

// Layout Components
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Footer from './components/Layout/Footer';

// Pages
import Home from './pages/Home';
import Login from './components/Auth/Login';

// Learner Components
import LearnerDashboard from './components/Learner/Dashboard';
import Courses from './components/Learner/Courses';
import Enrollments from './components/Learner/Enrollments';
import Assessments from './components/Learner/Assessments';
import Progress from './components/Learner/Progress';
import LearnerMaterials from './components/Learner/LearnerMaterials';
import LearnerVirtualClasses from './components/Learner/LearnerVirtualClasses';

// Educator Components
import EducatorDashboard from './components/Educator/Dashboard';
import CourseManager from './components/Educator/CourseManager';
import VirtualClass from './components/Educator/VirtualClass';
import UploadMaterials from './components/Educator/UploadMaterials';
import CreateAssessment from './components/Educator/CreateAssessment';
import StudentProgress from './components/Educator/StudentProgress';
import GradeSubmissions from './components/Educator/GradeSubmissions';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);
  }, []);

const handleLogin = async (credentials) => {
  try {
    const response = await axios.post('/api/auth/login', credentials);
    const { token, user: userData } = response.data;
    
    // Save to localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Set axios default header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Update state
    setUser(userData);
    
    // Return with navigation info
    return {
      ...response.data,
      redirectTo: userData.role === 'learner' ? '/learner/dashboard' : '/educator/dashboard'
    };
  } catch (error) {
    throw error;
  }
};

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear axios header
    delete axios.defaults.headers.common['Authorization'];
    
    // Update state
    setUser(null);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="d-flex flex-column min-vh-100">
        <Navbar user={user} onLogout={handleLogout} />
        
        <div className="d-flex flex-grow-1">
          {/* Show sidebar only when user is logged in */}
          {user && <Sidebar role={user.role} />}
          
          <main className={`flex-grow-1 ${user ? 'p-3' : ''}`}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={
                user ? <Navigate to={user.role === 'learner' ? '/learner/dashboard' : '/educator/dashboard'} /> : <Login onLogin={handleLogin} />
              } />
              <Route path="/courses" element={<Courses />} />
              
              {/* Protected Learner Routes */}
              <Route path="/learner/dashboard" element={
                user && user.role === 'learner' ? <LearnerDashboard /> : <Navigate to="/login" />
              } />
                <Route path="/enrollments" element={
                 user && user.role === 'learner' ? <Enrollments /> : <Navigate to="/login" />
              } />
                <Route path="/assessments" element={
                  user && user.role === 'learner' ? <Assessments /> : <Navigate to="/login" />
              } />
                <Route path="/progress" element={
                  user && user.role === 'learner' ? <Progress /> : <Navigate to="/login" />
              } />
              <Route path="/LearnerMaterials" element={
                user && user.role === 'learner' ? <LearnerMaterials /> : <Navigate to="/login" />
              } />
              <Route path="/LearnerVirtualClasses" element={
                user && user.role === 'learner' ? <LearnerVirtualClasses /> : <Navigate to="/login" />
              } />

              {/* Protected Educator Routes */}
              <Route path="/educator/dashboard" element={
                user && user.role === 'educator' ? <EducatorDashboard /> : <Navigate to="/login" />
              } />
              <Route path="/educator/CourseManager" element={
                user && user.role === 'educator' ? <CourseManager /> : <Navigate to="/login" />
              } />
              <Route path="/educator/VirtualClass" element={
                user && user.role === 'educator' ? <VirtualClass /> : <Navigate to="/login" />
              } />
              <Route path="/educator/UploadMaterials" element={
                user && user.role === 'educator' ? <UploadMaterials /> : <Navigate to="/login" />
              } />
              <Route path="/educator/CreateAssessment" element={
                user && user.role === 'educator' ? <CreateAssessment /> : <Navigate to="/login" />
              } />
              <Route path="/educator/StudentProgress" element={
                user && user.role === 'educator' ? <StudentProgress /> : <Navigate to="/login" />
              } />
              <Route path="/educator/GradeSubmissions" element={
                 user && user.role === 'educator' ? <GradeSubmissions /> : <Navigate to="/login" />
              } />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
        
        <Footer />
      </div>
    </Router>
  );
}

export default App;