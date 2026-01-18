import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaFilter, FaSearch } from 'react-icons/fa';
import axios from 'axios';

const CourseManager = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: 'Technology',
    price: '0.00',
    duration_hours: '10',
    is_published: false
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, searchTerm, filterStatus]);

// Add this useEffect to handle URL parameters for editing
  useEffect(() => {
    // Check if there's an edit parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const editCourseId = urlParams.get('edit');
    
    if (editCourseId) {
      // Find the course and populate form
      const courseToEdit = courses.find(c => c.id === parseInt(editCourseId));
      if (courseToEdit) {
        handleEdit(courseToEdit);
      }
    }
  }, [courses]);

// CourseManager.js - update fetchCourses function
const fetchCourses = async () => {
  try {
    const token = localStorage.getItem('token');
    
    // Use the new educator-specific endpoint
    const response = await axios.get('/api/educator/courses', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    setCourses(response.data);
    setFilteredCourses(response.data);
  } catch (error) {
    console.error('Error fetching courses:', error);
  } finally {
    setLoading(false);
  }
};

  const filterCourses = () => {
    let result = [...courses];

    // Apply search filter
    if (searchTerm) {
      result = result.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus === 'published') {
      result = result.filter(course => course.is_published);
    } else if (filterStatus === 'draft') {
      result = result.filter(course => !course.is_published);
    }

    setFilteredCourses(result);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCourseForm({
      ...courseForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      if (editingCourse) {
        // Update course
        await axios.put(`/api/courses/${editingCourse.id}`, courseForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Course updated successfully!');
      } else {
        // Create new course
        await axios.post('/api/courses', courseForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Course created successfully!');
      }
      
      // Reset form and refresh data
      resetForm();
      fetchCourses();
      
    } catch (error) {
      alert(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || '',
      category: course.category || 'Technology',
      price: course.price || '0.00',
      duration_hours: course.duration_hours || '10',
      is_published: course.is_published || false
    });
    setShowForm(true);
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Course deleted successfully!');
      fetchCourses();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete course');
    }
  };

  const handlePublishToggle = async (courseId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/courses/${courseId}`, {
        is_published: !currentStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Course ${!currentStatus ? 'published' : 'unpublished'} successfully!`);
      fetchCourses();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update course status');
    }
  };

  const resetForm = () => {
    setCourseForm({
      title: '',
      description: '',
      category: 'Technology',
      price: '0.00',
      duration_hours: '10',
      is_published: false
    });
    setEditingCourse(null);
    setShowForm(false);
  };

  const categories = ['Technology', 'Business', 'Science', 'Arts', 'Programming', 'Cloud Computing', 'Mathematics', 'Language'];

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
          <h2>Course Management</h2>
          <p className="text-muted">Create, edit, and manage your courses</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="input-group">
            <span className="input-group-text">
              <FaSearch />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search your courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Courses</option>
            <option value="published">Published Only</option>
            <option value="draft">Drafts Only</option>
          </select>
        </div>
        <div className="col-md-2">
          <button 
            className="btn btn-primary w-100"
            onClick={() => setShowForm(!showForm)}
          >
            <FaPlus className="me-1" /> {showForm ? 'Cancel' : 'New Course'}
          </button>
        </div>
      </div>

      {/* Course Form */}
      {showForm && (
        <div className="row mb-4">
          <div className="col">
            <div className="card">
              <div className="card-header bg-light">
                <h5 className="mb-0">
                  {editingCourse ? 'Edit Course' : 'Create New Course'}
                </h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-8 mb-3">
                      <label className="form-label">Course Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="title"
                        value={courseForm.title}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter course title"
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        name="category"
                        value={courseForm.category}
                        onChange={handleInputChange}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      name="description"
                      rows="4"
                      value={courseForm.description}
                      onChange={handleInputChange}
                      placeholder="Describe your course..."
                    />
                  </div>
                  
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Price (USD)</label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                          type="number"
                          className="form-control"
                          name="price"
                          step="0.01"
                          min="0"
                          value={courseForm.price}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Duration (hours)</label>
                      <input
                        type="number"
                        className="form-control"
                        name="duration_hours"
                        min="1"
                        value={courseForm.duration_hours}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="form-check mt-4 pt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="is_published"
                          checked={courseForm.is_published}
                          onChange={handleInputChange}
                          id="publishCheck"
                        />
                        <label className="form-check-label" htmlFor="publishCheck">
                          Publish immediately
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary">
                      {editingCourse ? 'Update Course' : 'Create Course'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={resetForm}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courses Table */}
      <div className="row">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                Your Courses ({filteredCourses.length})
                <small className="text-muted ms-2">
                  {courses.filter(c => c.is_published).length} published • 
                  {' '}{courses.filter(c => !c.is_published).length} drafts
                </small>
              </h5>
              <div className="text-muted">
                Showing {filteredCourses.length} of {courses.length} courses
              </div>
            </div>
            
            <div className="card-body">
              {filteredCourses.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Category</th>
                        <th>Students</th>
                        <th>Created</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourses.map(course => (
                        <tr key={course.id}>
                          <td>
                            <strong>{course.title}</strong>
                            <br />
                            <small className="text-muted">
                              {course.description?.substring(0, 60)}...
                            </small>
                          </td>
                          <td>
                            <span className="badge bg-secondary">{course.category}</span>
                          </td>
                          <td>
                            <span className="badge bg-info">{course.enrolled_count || 0}</span>
                          </td>
                          <td>
                            <small>{new Date(course.created_at).toLocaleDateString()}</small>
                          </td>
                          <td>
                            {course.is_published ? (
                              <span className="badge bg-success">
                                <FaEye className="me-1" /> Published
                              </span>
                            ) : (
                              <span className="badge bg-warning">
                                <FaEyeSlash className="me-1" /> Draft
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => handleEdit(course)}
                              >
                                <FaEdit />
                              </button>
                              <button 
                                className="btn btn-outline-success"
                                onClick={() => handlePublishToggle(course.id, course.is_published)}
                              >
                                {course.is_published ? <FaEyeSlash /> : <FaEye />}
                              </button>
                              <button 
                                className="btn btn-outline-danger"
                                onClick={() => handleDelete(course.id)}
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
                <div className="text-center py-5">
                  <div className="alert alert-info">
                    <h5>No courses found</h5>
                    <p className="mb-0">
                      {courses.length === 0 
                        ? 'Create your first course to get started!' 
                        : 'Try adjusting your search or filter criteria'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="card-footer">
              <div className="row">
                <div className="col">
                  <small className="text-muted">
                    Tips: Click the eye icon to publish/unpublish courses. 
                    Published courses are visible to learners.
                  </small>
                </div>
                <div className="col-auto">
                  <button className="btn btn-sm btn-outline-primary" onClick={fetchCourses}>
                    Refresh List
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseManager;