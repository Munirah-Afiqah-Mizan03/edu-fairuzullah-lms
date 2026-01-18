import React, { useState, useEffect } from 'react';
import { FaBook, FaUserGraduate, FaCalendarAlt, FaChartLine, FaTimes, FaCheck } from 'react-icons/fa';
import axios from 'axios';

const Enrollments = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch enrolled courses
      const enrolledRes = await axios.get('/api/learner/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnrolledCourses(enrolledRes.data);
      
      // Fetch available courses (not enrolled)
      const allCoursesRes = await axios.get('/api/courses');
      const enrolledIds = enrolledRes.data.map(course => course.id);
      const available = allCoursesRes.data.filter(course => !enrolledIds.includes(course.id));
      setAvailableCourses(available);
      
    } catch (error) {
      console.error('Error fetching enrollment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/courses/${courseId}/enroll`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Successfully enrolled in course!');
      fetchData(); // Refresh data
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to enroll');
    }
  };

  const handleUnenroll = async (courseId) => {
    if (!window.confirm('Are you sure you want to unenroll from this course?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/courses/${courseId}/unenroll`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Successfully unenrolled from course');
      fetchData(); // Refresh data
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to unenroll');
    }
  };

  const updateProgress = async (courseId, progress) => {
    try {
      const token = localStorage.getItem('token');
      // This would require a new API endpoint
      // For now, we'll just update the UI state
      setEnrolledCourses(prev => prev.map(course => 
        course.id === courseId ? { ...course, progress } : course
      ));
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

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
            <FaUserGraduate className="me-2" />
            My Course Enrollments
          </h2>
          <p className="text-muted">Manage your course enrollments and track progress</p>
        </div>
      </div>

      {/* Enrolled Courses */}
      <div className="row mb-5">
        <div className="col">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <FaBook className="me-2" />
                Currently Enrolled Courses ({enrolledCourses.length})
              </h5>
            </div>
            <div className="card-body">
              {enrolledCourses.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Educator</th>
                        <th>Enrolled Date</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrolledCourses.map(course => (
                        <tr key={course.id}>
                          <td>
                            <strong>{course.title}</strong>
                            <br />
                            <small className="text-muted">{course.category}</small>
                          </td>
                          <td>{course.educator_name}</td>
                          <td>{new Date(course.enrolled_at).toLocaleDateString()}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1 me-2" style={{ height: '10px' }}>
                                <div 
                                  className="progress-bar bg-success" 
                                  style={{ width: `${course.progress}%` }}
                                ></div>
                              </div>
                              <span>{course.progress}%</span>
                            </div>
                            <div className="btn-group btn-group-sm mt-1">
                              <button 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => updateProgress(course.id, Math.max(0, course.progress - 10))}
                              >
                                -10%
                              </button>
                              <button 
                                className="btn btn-outline-success btn-sm"
                                onClick={() => updateProgress(course.id, Math.min(100, course.progress + 10))}
                              >
                                +10%
                              </button>
                            </div>
                          </td>
                          <td>
                            {course.completed ? (
                              <span className="badge bg-success">
                                <FaCheck className="me-1" /> Completed
                              </span>
                            ) : (
                              <span className="badge bg-warning">In Progress</span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group">
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => window.location.href = `/course/${course.id}`}
                              >
                                Continue
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleUnenroll(course.id)}
                              >
                                <FaTimes className="me-1" /> Unenroll
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="alert alert-info">
                    <h5>No enrolled courses</h5>
                    <p className="mb-0">Browse available courses below and enroll to get started!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Available Courses */}
      <div className="row">
        <div className="col">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">
                <FaBook className="me-2" />
                Available Courses to Enroll ({availableCourses.length})
              </h5>
            </div>
            <div className="card-body">
              {availableCourses.length > 0 ? (
                <div className="row">
                  {availableCourses.map(course => (
                    <div className="col-md-4 mb-3" key={course.id}>
                      <div className="card h-100">
                        <div className="card-body">
                          <h6 className="card-title">{course.title}</h6>
                          <p className="card-text small text-muted">
                            {course.description?.substring(0, 100)}...
                          </p>
                          <div className="mb-2">
                            <span className="badge bg-primary">{course.category}</span>
                            <span className="badge bg-secondary ms-1">
                              {course.duration_hours} hours
                            </span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <small className="text-muted">
                                By: <strong>{course.educator_name}</strong>
                              </small>
                              <br />
                              <small className="text-muted">
                                <FaUserGraduate className="me-1" />
                                {course.enrolled_count} students
                              </small>
                            </div>
                            <button 
                              className="btn btn-sm btn-success"
                              onClick={() => handleEnroll(course.id)}
                            >
                              Enroll Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">No available courses to enroll. You're enrolled in all courses!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Enrollments;