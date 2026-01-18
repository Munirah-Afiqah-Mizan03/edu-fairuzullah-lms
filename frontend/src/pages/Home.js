import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaCloud, FaGraduationCap, FaChalkboardTeacher, 
  FaUserGraduate, FaLaptopCode, FaShieldAlt 
} from 'react-icons/fa';

const Home = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section bg-primary text-white py-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h1 className="display-4 fw-bold mb-4">
                <FaCloud className="me-3" />
                Edu Fairuzullah Learning Management System
              </h1>
              <p className="lead mb-4">
                A cloud-based platform for schools, universities, and corporate clients. 
                Transform education with scalable, secure, and innovative learning solutions.
              </p>
              <div className="d-flex gap-3">
                <Link to="/login" className="btn btn-light btn-lg">
                  Get Started
                </Link>
                <Link to="/courses" className="btn btn-outline-light btn-lg">
                  Browse Courses
                </Link>
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <img 
                src="https://via.placeholder.com/500x300/0d6efd/ffffff?text=LMS+Dashboard" 
                alt="LMS Dashboard" 
                className="img-fluid rounded shadow"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-5">
        <div className="container">
          <div className="row text-center mb-5">
            <div className="col">
              <h2>Key Features</h2>
              <p className="text-muted">Everything you need for modern education</p>
            </div>
          </div>
          
          <div className="row">
            <div className="col-md-4 mb-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center p-4">
                  <div className="feature-icon mb-3">
                    <FaGraduationCap className="text-primary fs-1" />
                  </div>
                  <h4>For Learners</h4>
                  <p className="text-muted">
                    Access courses, learning materials, virtual classes, and assessments. 
                    Track your progress and earn certificates.
                  </p>
                  <ul className="text-start">
                    <li>Enroll in courses</li>
                    <li>Access learning materials</li>
                    <li>Participate in live classes</li>
                    <li>Complete assessments</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="col-md-4 mb-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center p-4">
                  <div className="feature-icon mb-3">
                    <FaChalkboardTeacher className="text-warning fs-1" />
                  </div>
                  <h4>For Educators</h4>
                  <p className="text-muted">
                    Create and manage courses, upload resources, host virtual classes, 
                    and track student progress.
                  </p>
                  <ul className="text-start">
                    <li>Create and manage courses</li>
                    <li>Upload learning materials</li>
                    <li>Host virtual classes</li>
                    <li>Manage assessments</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="col-md-4 mb-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center p-4">
                  <div className="feature-icon mb-3">
                    <FaShieldAlt className="text-success fs-1" />
                  </div>
                  <h4>Cloud Security</h4>
                  <p className="text-muted">
                    Built on Microsoft Azure with enterprise-grade security, 
                    compliance, and scalability.
                  </p>
                  <ul className="text-start">
                    <li>Azure Active Directory IAM</li>
                    <li>Data encryption at rest & transit</li>
                    <li>GDPR/PDPA compliant</li>
                    <li>Auto-scaling infrastructure</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-light py-5">
        <div className="container">
          <div className="row text-center">
            <div className="col-md-3 mb-4">
              <div className="display-4 fw-bold text-primary">500+</div>
              <div className="text-muted">Courses Available</div>
            </div>
            <div className="col-md-3 mb-4">
              <div className="display-4 fw-bold text-success">10,000+</div>
              <div className="text-muted">Active Learners</div>
            </div>
            <div className="col-md-3 mb-4">
              <div className="display-4 fw-bold text-warning">200+</div>
              <div className="text-muted">Expert Educators</div>
            </div>
            <div className="col-md-3 mb-4">
              <div className="display-4 fw-bold text-info">99.9%</div>
              <div className="text-muted">Uptime SLA</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-5">
        <div className="container text-center">
          <h2 className="mb-4">Ready to Transform Education?</h2>
          <p className="lead text-muted mb-4">
            Join thousands of educators and learners using our cloud-based platform.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/register" className="btn btn-primary btn-lg">
              <FaUserGraduate className="me-2" />
              Register as Learner
            </Link>
            <Link to="/register?role=educator" className="btn btn-warning btn-lg">
              <FaChalkboardTeacher className="me-2" />
              Register as Educator
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;