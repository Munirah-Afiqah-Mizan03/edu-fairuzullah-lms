import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaStar, FaUserFriends, FaClock, FaBookmark } from 'react-icons/fa';
import axios from 'axios';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    sortBy: 'newest'
  });

  const categories = ['All', 'Technology', 'Business', 'Science', 'Arts', 'Programming', 'Cloud Computing'];

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, searchTerm, filters]);

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses');
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

    // Apply category filter
    if (filters.category && filters.category !== 'All') {
      result = result.filter(course => course.category === filters.category);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'popular':
        result.sort((a, b) => b.enrolled_count - a.enrolled_count);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'name':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    setFilteredCourses(result);
  };

  const handleEnroll = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/courses/${courseId}/enroll`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Successfully enrolled in course!');
      fetchCourses(); // Refresh course list
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to enroll in course');
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
          <h2>Browse Available Courses</h2>
          <p className="text-muted">Enroll in courses and start your learning journey</p>
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
              placeholder="Search courses by title, description, or educator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={filters.sortBy}
            onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
          >
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="row mb-3">
        <div className="col">
          <p className="text-muted">
            Showing {filteredCourses.length} of {courses.length} courses
          </p>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="row">
        {filteredCourses.length > 0 ? (
          filteredCourses.map(course => (
            <div className="col-lg-4 col-md-6 mb-4" key={course.id}>
              <div className="card h-100 course-card shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <span className="badge bg-primary">{course.category}</span>
                      {course.is_published && (
                        <span className="badge bg-success ms-1">Published</span>
                      )}
                    </div>
                    <button className="btn btn-sm btn-outline-secondary">
                      <FaBookmark />
                    </button>
                  </div>
                  
                  <h5 className="card-title">{course.title}</h5>
                  <p className="card-text text-muted small">
                    {course.description || 'No description available'}
                  </p>
                  
                  <div className="mb-3">
                    <small className="text-muted d-block">
                      <FaUserFriends className="me-1" />
                      {course.enrolled_count} students enrolled
                    </small>
                    <small className="text-muted d-block">
                      <FaClock className="me-1" />
                      {course.duration_hours} hours
                    </small>
                    <small className="text-muted d-block">
                      By: <strong>{course.educator_name}</strong>
                    </small>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="fw-bold text-primary">
                        {course.price > 0 ? `$${course.price}` : 'FREE'}
                      </span>
                    </div>
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEnroll(course.id)}
                      >
                        Enroll Now
                      </button>
                      <button className="btn btn-sm btn-outline-secondary">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="card-footer bg-transparent">
                  <div className="d-flex justify-content-between small text-muted">
                    <span>Created: {new Date(course.created_at).toLocaleDateString()}</span>
                    <span>
                      <FaStar className="text-warning" /> 4.5
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col text-center py-5">
            <div className="alert alert-info">
              <h5>No courses found</h5>
              <p className="mb-0">Try adjusting your search or filter criteria</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;