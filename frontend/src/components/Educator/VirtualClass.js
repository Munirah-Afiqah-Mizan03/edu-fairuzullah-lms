// components/Educator/VirtualClass.js
import React, { useState, useEffect } from 'react';
import { FaVideo, FaCalendarPlus, FaUsers, FaClock, FaLink, FaComments, FaTrash, FaEdit } from 'react-icons/fa'; // Add FaTrash, FaEdit
import axios from 'axios';

const VirtualClass = () => {
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [classForm, setClassForm] = useState({
    course_id: '',
    title: '',
    description: '',
    meeting_link: 'https://meet.google.com/',
    schedule: '',
    duration_minutes: '60'
  });

  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Fetch educator's courses
      const coursesRes = await axios.get('/api/courses', {
        params: { educator_id: user.id },
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(coursesRes.data);
      
      // Fetch virtual classes for these courses
      const allClasses = [];
      for (const course of coursesRes.data) {
        try {
          const classRes = await axios.get(`/api/courses/${course.id}/classes`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const courseClasses = classRes.data.map(cls => ({
            ...cls,
            course_title: course.title
          }));
          
          allClasses.push(...courseClasses);
        } catch (error) {
          console.error(`Error fetching classes for course ${course.id}:`, error);
        }
      }
      
      setClasses(allClasses);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClassForm({
      ...classForm,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/courses/${classForm.course_id}/classes`, classForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Virtual class scheduled successfully!');
      setShowForm(false);
      setClassForm({
        course_id: '',
        title: '',
        description: '',
        meeting_link: 'https://meet.google.com/',
        schedule: '',
        duration_minutes: '60'
      });
      fetchData();
      
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to schedule class');
    }
  };

  const handleStartClass = (meetingLink) => {
    window.open(meetingLink, '_blank');
  };

  // Add this function to handle deleting virtual classes
  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this virtual class? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Call the delete endpoint
      await axios.delete(`/api/virtual-classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from local state
      setClasses(prevClasses => prevClasses.filter(cls => cls.id !== classId));
      
      alert('Virtual class deleted successfully!');
      
      // Update the counts
      fetchData(); // This will refresh the data from server
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete virtual class');
    }
  };

  const [editingClass, setEditingClass] = useState(null);

  const handleEditClass = (virtualClass) => {
    setEditingClass(virtualClass);
    setClassForm({
      course_id: virtualClass.course_id,
      title: virtualClass.title,
      description: virtualClass.description || '',
      meeting_link: virtualClass.meeting_link,
      schedule: virtualClass.schedule.slice(0, 16), // Format for datetime-local input
      duration_minutes: virtualClass.duration_minutes.toString()
    });
    setShowForm(true);
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const upcomingClasses = classes.filter(cls => new Date(cls.schedule) > new Date());
  const pastClasses = classes.filter(cls => new Date(cls.schedule) <= new Date());

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h2>
            <FaVideo className="me-2" />
            Virtual Classes
          </h2>
          <p className="text-muted">Schedule and host virtual classes for your students</p>
        </div>
        <div className="col-auto">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            <FaCalendarPlus className="me-1" />
            Schedule New Class
          </button>
        </div>
      </div>

      {/* Schedule Form */}
      {showForm && (
        <div className="row mb-4">
          <div className="col">
            <div className="card">
              <div className="card-header bg-light">
                <h5 className="mb-0">Schedule Virtual Class</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Select Course *</label>
                      <select
                        className="form-select"
                        name="course_id"
                        value={classForm.course_id}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Choose a course</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Class Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="title"
                        value={classForm.title}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Week 5 Lecture: Cloud Security"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      name="description"
                      rows="3"
                      value={classForm.description}
                      onChange={handleInputChange}
                      placeholder="Describe what will be covered in this class..."
                    />
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Meeting Link *</label>
                      <input
                        type="url"
                        className="form-control"
                        name="meeting_link"
                        value={classForm.meeting_link}
                        onChange={handleInputChange}
                        required
                        placeholder="https://meet.google.com/abc-xyz"
                      />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        name="schedule"
                        value={classForm.schedule}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Duration (minutes)</label>
                      <input
                        type="number"
                        className="form-control"
                        name="duration_minutes"
                        min="15"
                        max="240"
                        value={classForm.duration_minutes}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary">
                      Schedule Class
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Classes */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">
                <FaCalendarPlus className="me-2" />
                Upcoming Classes ({upcomingClasses.length})
              </h5>
            </div>
            <div className="card-body">
              {upcomingClasses.length > 0 ? (
                <div className="row">
                  {upcomingClasses.map(cls => (
                    <div className="col-md-6 mb-3" key={cls.id}>
                      <div className="card h-100">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                              <h5 className="card-title">{cls.title}</h5>
                              <p className="card-text small text-muted">{cls.course_title}</p>
                            </div>
                            <div className="d-flex gap-1">
                              <span className="badge bg-success">Upcoming</span>
                              <button 
                                className="btn btn-sm btn-outline-warning ms-1"
                                onClick={() => handleEditClass(cls)}
                                title="Edit this class"
                              >
                                <FaEdit />
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger ms-1"
                                onClick={() => handleDeleteClass(cls.id)}
                                title="Delete this class"
                              >
                                <FaTrash />
                              </button>
                            </div>
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
                                {cls.meeting_link}
                              </a>
                            </small>
                          </div>
                          
                          <div className="d-flex gap-2">
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleStartClass(cls.meeting_link)}
                            >
                              <FaVideo className="me-1" /> Start Class
                            </button>
                            <button className="btn btn-outline-secondary btn-sm">
                              <FaUsers className="me-1" /> View Participants
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
                    <h5>No upcoming classes scheduled</h5>
                    <p className="mb-0">Schedule your first virtual class to get started!</p>
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
                <FaComments className="me-2" />
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
                        <th>Status</th>
                        <th>Recording</th>
                        <th>Actions</th>
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
                          <td>
                            <span className="badge bg-secondary">Completed</span>
                          </td>
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
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteClass(cls.id)}
                              title="Delete this class"
                            >
                              <FaTrash />
                            </button>
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

export default VirtualClass;