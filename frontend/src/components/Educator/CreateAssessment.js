// components/Educator/CreateAssessment.js
import React, { useState, useEffect } from 'react';
import { FaTasks, FaCalendarPlus, FaFileAlt, FaClock, FaPlus, FaTrash, FaEye } from 'react-icons/fa'; // Add FaEye
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateAssessment = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Fixed: lowercase 'useNavigate'

  const [assessmentForm, setAssessmentForm] = useState({
    title: '',
    description: '',
    total_marks: '100',
    deadline: ''
  });

  useEffect(() => {
    fetchEducatorCourses();
  }, []);

  const fetchEducatorCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      const response = await axios.get('/api/courses', {
        params: { educator_id: user.id },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCourses(response.data);
      if (response.data.length > 0) {
        setSelectedCourse(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessments = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/courses/${courseId}/assessments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssessments(response.data);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    }
  };

  useEffect(() => {
    if (selectedCourse) {
      fetchAssessments(selectedCourse);
    }
  }, [selectedCourse]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAssessmentForm({
      ...assessmentForm,
      [name]: value
    });
  };

  // Add this function to handle viewing submissions
  const handleViewSubmissions = (assessmentId) => {
    navigate(`/educator/GradeSubmissions?assessment=${assessmentId}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCourse) {
      alert('Please select a course first');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/courses/${selectedCourse}/assessments`, assessmentForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Assessment created successfully!');
      setAssessmentForm({
        title: '',
        description: '',
        total_marks: '100',
        deadline: ''
      });
      fetchAssessments(selectedCourse);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create assessment');
    }
  };

  const handleDelete = async (assessmentId) => {
    if (!window.confirm('Are you sure you want to delete this assessment?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Assessment deleted successfully!');
      fetchAssessments(selectedCourse);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete assessment');
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
            <FaTasks className="me-2" />
            Create Assessments
          </h2>
          <p className="text-muted">Create assignments, quizzes, and exams for your courses</p>
        </div>
      </div>

      {/* Course Selection */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">Select Course</h5>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="">Choose a course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title} ({course.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Create Assessment Form */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">Create New Assessment</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-8 mb-3">
                    <label className="form-label">Assessment Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="title"
                      value={assessmentForm.title}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Midterm Exam, Final Project, Quiz 1"
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Total Marks *</label>
                    <input
                      type="number"
                      className="form-control"
                      name="total_marks"
                      value={assessmentForm.total_marks}
                      onChange={handleInputChange}
                      required
                      min="1"
                      max="1000"
                    />
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Description *</label>
                  <textarea
                    className="form-control"
                    name="description"
                    rows="3"
                    value={assessmentForm.description}
                    onChange={handleInputChange}
                    required
                    placeholder="Provide assessment instructions, topics covered, and guidelines..."
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Deadline (Optional)</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    name="deadline"
                    value={assessmentForm.deadline}
                    onChange={handleInputChange}
                  />
                  <small className="text-muted">
                    Leave empty if there's no deadline
                  </small>
                </div>
                
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary">
                    <FaPlus className="me-1" /> Create Assessment
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setAssessmentForm({
                    title: '',
                    description: '',
                    total_marks: '100',
                    deadline: ''
                  })}>
                    Clear Form
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Assessments */}
      <div className="row">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                Course Assessments ({assessments.length})
              </h5>
              <button className="btn btn-sm btn-primary" onClick={() => fetchAssessments(selectedCourse)}>
                Refresh
              </button>
            </div>
            <div className="card-body">
              {selectedCourse ? (
                assessments.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Description</th>
                          <th>Total Marks</th>
                          <th>Deadline</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessments.map(assessment => (
                          <tr key={assessment.id}>
                            <td>
                              <strong>{assessment.title}</strong>
                            </td>
                            <td>
                              <small className="text-muted">{assessment.description}</small>
                            </td>
                            <td>
                              <span className="badge bg-info">{assessment.total_marks}</span>
                            </td>
                            <td>
                              {assessment.deadline ? (
                                <small>
                                  <FaClock className="me-1" />
                                  {new Date(assessment.deadline).toLocaleString()}
                                </small>
                              ) : (
                                <small className="text-muted">No deadline</small>
                              )}
                            </td>
                            <td>
                              <small>{new Date(assessment.created_at).toLocaleDateString()}</small>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button 
                                  className="btn btn-outline-primary"
                                  onClick={() => handleViewSubmissions(assessment.id)}
                                >
                                  <FaEye className="me-1" /> View Submissions
                                </button>
                                <button 
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDelete(assessment.id)}
                                >
                                  <FaTrash />
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
                      <h5>No assessments created yet</h5>
                      <p className="mb-0">Create your first assessment using the form above</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-4">
                  <div className="alert alert-warning">
                    <h5>No course selected</h5>
                    <p className="mb-0">Please select a course first</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAssessment;