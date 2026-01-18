import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaChalkboardTeacher, FaUserGraduate } from 'react-icons/fa';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'learner'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleQuickLogin = (role) => {
    // Just set the role, don't auto-fill credentials
    setFormData({
      ...formData,
      role
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Send the selected role to backend for validation
      const result = await onLogin({
        ...formData,
        requestedRole: formData.role
      });
      
      // Navigate based on actual user role from backend
      navigate(result.redirectTo);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow">
            <div className="card-header bg-primary text-white text-center py-3">
              <h4 className="mb-0">
                <FaUser className="me-2" />
                Login to LMS Portal
              </h4>
            </div>
            
            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger alert-dismissible fade show">
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email Address</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaUser />
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaLock />
                    </span>
                    <input
                      type="password"
                      className="form-control"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Enter your password"
                    />
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Login As</label>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className={`btn ${formData.role === 'learner' ? 'btn-success' : 'btn-outline-success'} flex-grow-1`}
                      onClick={() => handleQuickLogin('learner')}
                    >
                      <FaUserGraduate className="me-1" /> Learner
                    </button>
                    <button
                      type="button"
                      className={`btn ${formData.role === 'educator' ? 'btn-warning' : 'btn-outline-warning'} flex-grow-1`}
                      onClick={() => handleQuickLogin('educator')}
                    >
                      <FaChalkboardTeacher className="me-1" /> Educator
                    </button>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="rememberMe" />
                    <label className="form-check-label" htmlFor="rememberMe">
                      Remember me
                    </label>
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary w-100 py-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Logging in...
                    </>
                  ) : (
                    'Login to Portal'
                  )}
                </button>
              </form>
              
              <div className="mt-4 text-center">
                <p className="text-muted mb-2">Demo Credentials:</p>
                <div className="row small">
                  <div className="col-6">
                    <strong>Learner:</strong>
                    <div>learner@edufairuzullah.com</div>
                    <div>Password: Learner@123</div>
                  </div>
                  <div className="col-6">
                    <strong>Educator:</strong>
                    <div>educator@edufairuzullah.com</div>
                    <div>Password: Educator@123</div>
                  </div>
                </div>
                <p className="text-muted mt-2 small">
                  
                </p>
              </div>
            </div>
            
            <div className="card-footer text-center bg-light">
              <p className="mb-0">
                Don't have an account?{' '}
                <a href="/register" className="text-decoration-none">
                  Register here
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;