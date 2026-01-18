// components/Learner/LearnerVirtualClasses.js
import React, { useState, useEffect } from 'react';
import { FaVideo, FaCalendar, FaClock, FaLink, FaUsers, FaCalendarCheck } from 'react-icons/fa';
import axios from 'axios';

const LearnerVirtualClasses = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [virtualClasses, setVirtualClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get('/api/learner/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEnrolledCourses(response.data);
      fetchAllVirtualClasses(response.data);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllVirtualClasses = async (courses) => {
    try {
      const token = localStorage.getItem('token');
      const allClasses = [];
      
      for (const course of courses) {
        try {
          const response = await axios.get(`/api/courses/${course.id}/classes`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const courseClasses = response.data.map(cls => ({
            ...cls,
            course_title: course.title,
            educator_name: course.educator_name
          }));
          
          allClasses.push(...courseClasses);
        } catch (error) {
          console.error(`Error fetching classes for course ${course.id}:`, error);
        }
      }
      
      setVirtualClasses(allClasses);
    } catch (error) {
      console.error('Error fetching virtual classes:', error);
    }
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-MY', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntil = (dateTime) => {
    const now = new Date();
    const classTime = new Date(dateTime);
    const diffMs = classTime - now;
    
    if (diffMs <= 0) return 'Started';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  };

  const joinClass = (meetingLink) => {
    window.open(meetingLink, '_blank');
  };

  const filteredClasses = selectedCourse === 'all' 
    ? virtualClasses 
    : virtualClasses.filter(cls => cls.course_id === parseInt(selectedCourse));

  const upcomingClasses = filteredClasses.filter(cls => new Date(cls.schedule) > new Date());
  const pastClasses = filteredClasses.filter(cls => new Date(cls.schedule) <= new Date());

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h2>
            <FaVideo className="me-2" />
            Virtual Classes
          </h2>
          <p className="text-muted">Join scheduled virtual classes from your enrolled courses</p>
        </div>
      </div>

      {/* Course Filter */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">Filter by Course</h5>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="all">All Courses</option>
                {enrolledCourses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card border-primary">
            <div className="card-body text-center">
              <h2 className="fw-bold text-primary">{filteredClasses.length}</h2>
              <h6 className="text-muted">Total Classes</h6>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card border-success">
            <div className="card-body text-center">
              <h2 className="fw-bold text-success">{upcomingClasses.length}</h2>
              <h6 className="text-muted">Upcoming</h6>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card border-info">
            <div className="card-body text-center">
              <h2 className="fw-bold text-info">{pastClasses.length}</h2>
              <h6 className="text-muted">Completed</h6>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Classes */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">
                <FaCalendar className="me-2" />
                Upcoming Classes ({upcomingClasses.length})
              </h5>
            </div>
            <div className="card-body">
              {upcomingClasses.length > 0 ? (
                <div className="row">
                  {upcomingClasses.map(cls => (
                    <div className="col-md-6 mb-3" key={cls.id}>
                      <div className="card h-100 border-success">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                              <h5 className="card-title">{cls.title}</h5>
                              <p className="card-text small text-muted">
                                {cls.course_title} • By: {cls.educator_name}
                              </p>
                            </div>
                            <span className="badge bg-success">{getTimeUntil(cls.schedule)}</span>
                          </div>
                          
                          <p className="card-text">{cls.description}</p>
                          
                          <div className="mb-3">
                            <small className="text-muted d-block">
                              <FaClock className="me-1" />
                              {formatDateTime(cls.schedule)}
                            </small>
                            <small className="text-muted d-block">
                              <FaClock className="me-1" />
                              Duration: {cls.duration_minutes} minutes
                            </small>
                            <small className="text-muted d-block">
                              <FaLink className="me-1" />
                              <a href={cls.meeting_link} target="_blank" rel="noreferrer">
                                Meeting Link
                              </a>
                            </small>
                          </div>
                          
                          <div className="d-flex gap-2">
                            <button 
                              className="btn btn-success btn-sm"
                              onClick={() => joinClass(cls.meeting_link)}
                            >
                              <FaVideo className="me-1" /> Join Class
                            </button>
                            <button className="btn btn-outline-secondary btn-sm">
                              <FaCalendarCheck className="me-1" /> Add to Calendar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="alert alert-info">
                    <h5>No upcoming classes</h5>
                    <p className="mb-0">No virtual classes are scheduled for your selected courses.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Past Classes */}
      <div className="row">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <FaCalendarCheck className="me-2" />
                Past Classes ({pastClasses.length})
              </h5>
            </div>
            <div className="card-body">
              {pastClasses.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>Course</th>
                        <th>Date & Time</th>
                        <th>Duration</th>
                        <th>Educator</th>
                        <th>Recording</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastClasses.map(cls => (
                        <tr key={cls.id}>
                          <td>
                            <strong>{cls.title}</strong>
                            <br />
                            <small className="text-muted">{cls.description}</small>
                          </td>
                          <td>{cls.course_title}</td>
                          <td>
                            <small>{formatDateTime(cls.schedule)}</small>
                          </td>
                          <td>{cls.duration_minutes} mins</td>
                          <td>{cls.educator_name}</td>
                          <td>
                            <a 
                              href={cls.meeting_link} 
                              className="btn btn-sm btn-outline-primary"
                              target="_blank" 
                              rel="noreferrer"
                            >
                              <FaVideo className="me-1" /> View Recording
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-center py-4">No past classes found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnerVirtualClasses;