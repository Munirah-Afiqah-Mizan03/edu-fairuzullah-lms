import React from 'react';
import { FaUniversity, FaCloud } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-dark text-white mt-auto py-4">
      <div className="container">
        <div className="row">
          <div className="col-md-4 mb-3">
            <h5 className="d-flex align-items-center">
              <FaUniversity className="me-2" />
              Edu Fairuzullah LMS
            </h5>
            <p className="small">
              A cloud-based Learning Management System for schools, 
              universities, and corporate clients.
            </p>
          </div>
          
          <div className="col-md-4 mb-3">
            <h5>Cloud Services</h5>
            <p className="small d-flex align-items-center">
              <FaCloud className="me-2" />
              Powered by Microsoft Azure Cloud Platform
            </p>
            <ul className="list-unstyled small">
              <li>Azure App Service</li>
              <li>Azure SQL Database</li>
              <li>Azure Active Directory</li>
              <li>Azure Blob Storage</li>
            </ul>
          </div>
          
          <div className="col-md-4 mb-3">
            <h5>Contact</h5>
            <ul className="list-unstyled small">
              <li>Email: support@edufairuzullah.com</li>
              <li>Phone: +603-1234 5678</li>
              <li>Address: University Malaysia Pahang</li>
              <li>Course: BCN3243 Cloud Computing</li>
            </ul>
          </div>
        </div>
        
        <hr className="bg-light" />
        
        <div className="text-center small">
          <p className="mb-0">
            &copy; {new Date().getFullYear()} Edu Fairuzullah Sdn Bhd. 
            BCN3243 Cloud Computing Final Assessment.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;