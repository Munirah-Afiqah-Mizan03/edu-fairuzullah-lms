import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FaHome, FaBook, FaUserGraduate, FaChalkboardTeacher, 
  FaFileUpload, FaVideo, FaTasks, FaChartBar, FaCog, FaStar 
} from 'react-icons/fa';

const Sidebar = ({ role }) => {
  // Common links for all roles
  const commonLinks = [
    { to: '/Courses', icon: <FaBook />, label: 'Courses' },
  ];

  // Learner specific links
  const learnerLinks = [
    { to: '/Learner/Dashboard', icon: <FaHome />, label: 'Dashboard' },
    { to: '/Enrollments', icon: <FaUserGraduate />, label: 'Enrollments' },
    { to: '/LearnerMaterials', icon: <FaFileUpload />, label: 'Learning Materials' },
    { to: '/LearnerVirtualClasses', icon: <FaVideo />, label: 'Virtual Classes' },
    { to: '/Assessments', icon: <FaTasks />, label: 'Assessments' },
    { to: '/Progress', icon: <FaChartBar />, label: 'Progress' },
  ];

  // Educator specific links
  const educatorLinks = [
    { to: '/Educator/Dashboard', icon: <FaHome />, label: 'Dashboard' },
    { to: '/Educator/CourseManager', icon: <FaBook />, label: 'Manage Courses' },
    { to: '/Educator/UploadMaterials', icon: <FaFileUpload />, label: 'Upload Materials' },
    { to: '/Educator/VirtualClass', icon: <FaVideo />, label: 'Schedule Class' },
    { to: '/Educator/CreateAssessment', icon: <FaTasks />, label: 'Create Assessment' },
    { to: '/Educator/GradeSubmissions', icon: <FaStar />, label: 'Grade Submissions' },
    { to: '/Educator/StudentProgress', icon: <FaChartBar />, label: 'Student Progress' },
  ];

  // Admin links
  const adminLinks = [
    { to: '/admin/users', icon: <FaUserGraduate />, label: 'User Management' },
    { to: '/admin/courses', icon: <FaBook />, label: 'All Courses' },
    { to: '/admin/settings', icon: <FaCog />, label: 'System Settings' },
  ];

  const getRoleLinks = () => {
    switch (role) {
      case 'learner':
        return [...commonLinks, ...learnerLinks];
      case 'educator':
        return [...commonLinks, ...educatorLinks];
      case 'admin':
        return [...commonLinks, ...adminLinks];
      default:
        return commonLinks;
    }
  };

  const links = getRoleLinks();

  return (
    <div className="sidebar bg-light border-end" style={{ width: '250px', minHeight: 'calc(100vh - 73px)' }}>
      <div className="p-3">
        <h5 className="text-muted mb-3">Navigation</h5>
        <ul className="nav nav-pills flex-column">
          {links.map((link, index) => (
            <li className="nav-item" key={index}>
              <NavLink
                to={link.to}
                className={({ isActive }) => 
                  `nav-link d-flex align-items-center ${isActive ? 'active bg-primary' : 'text-dark'}`
                }
              >
                <span className="me-2">{link.icon}</span>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
        
        <div className="mt-4">
          <h6 className="text-muted mb-2"></h6>
          <div className="small">
            <div className="d-flex justify-content-between">
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;