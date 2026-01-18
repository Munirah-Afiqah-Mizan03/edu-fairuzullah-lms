// components/Educator/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaChalkboardTeacher, FaBook, FaUsers, FaChartLine, 
  FaCalendarPlus, FaFileUpload, FaTasks, FaCommentDots, FaEdit, FaCog, FaEye
} from 'react-icons/fa';
import axios from 'axios';

const EducatorDashboard = () => {
  const [stats, setStats] = useState({
    total_courses: 0,
    published_courses: 0,
    total_students: 0
  });
  const [recentCourses, setRecentCourses] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Fetch stats
      const statsRes = await axios.get('/api/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(statsRes.data);
      
      // Fetch educator's courses (using the new endpoint)
      const coursesRes = await axios.get('/api/educator/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentCourses(coursesRes.data.slice(0, 3));
      
      // Fetch recent activities
      const activitiesRes = await axios.get('/api/educator/recent-activities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentActivities(activitiesRes.data);
      
      // Fetch upcoming tasks
      const tasksRes = await axios.get('/api/educator/upcoming-tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUpcomingTasks(tasksRes.data);
      
    } catch (error) {
      console.error('Error fetching educator dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourse = (courseId) => {
    navigate(`/educator/CourseManager?edit=${courseId}`);
  };

  const handleManageCourse = (courseId) => {
    navigate(`/student-progress?course=${courseId}`);
  };

  const handleViewCourseStats = (courseId) => {
    navigate(`/student-progress?course=${courseId}&view=stats`);
  };

  const handleViewActivity = (activity) => {
    if (activity.activity_type === 'submission') {
      navigate('/grade-submissions');
    } else if (activity.activity_type === 'enrollment') {
      navigate(`/student-progress?course=${activity.course_title}`);
    }
  };

  const handleViewTask = (task) => {
    if (task.task_type === 'grade_submission') {
      navigate('/grade-submissions');
    } else if (task.task_type === 'assessment_deadline') {
      navigate(`/create-assessment`);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'secondary';
      default: return 'secondary';
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
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <div className="card bg-warning text-dark">
            <div className="card-body">
              <h1 className="card-title">
                <FaChalkboardTeacher className="me-3" />
                HAPPY WORKING EDUCATOR!
              </h1>
              <p className="card-text">
                You're teaching {stats.total_courses} courses to {stats.total_students} students. 
                Keep inspiring the next generation!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card h-100 border-primary">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Total Courses</h6>
                  <h2 className="fw-bold text-primary">{stats.total_courses}</h2>
                  <small className="text-muted">
                    {stats.published_courses} published • {stats.total_courses - stats.published_courses} draft
                  </small>
                </div>
                <FaBook className="fs-1 text-primary" />
              </div>
              <Link to="/educator/CourseManager" className="btn btn-outline-primary btn-sm mt-2">
                Manage Courses
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-4 mb-3">
          <div className="card h-100 border-success">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Total Students</h6>
                  <h2 className="fw-bold text-success">{stats.total_students}</h2>
                  <small className="text-muted">Across all your courses</small>
                </div>
                <FaUsers className="fs-1 text-success" />
              </div>
              <Link to="/student-progress" className="btn btn-outline-success btn-sm mt-2">
                View Student Progress
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-4 mb-3">
          <div className="card h-100 border-info">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Engagement Rate</h6>
                  <h2 className="fw-bold text-info">84%</h2>
                  <small className="text-muted">Average course completion</small>
                </div>
                <FaChartLine className="fs-1 text-info" />
              </div>
              <div className="progress mt-2" style={{ height: '10px' }}>
                <div className="progress-bar bg-info" style={{ width: '84%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3 mb-3">
                  <Link to="/educator/CourseManager" className="btn btn-primary w-100 h-100 py-3">
                    <FaBook className="mb-2" size={30} />
                    <div>Create New Course</div>
                  </Link>
                </div>
                <div className="col-md-3 mb-3">
                  <Link to="/educator/UploadMaterials" className="btn btn-success w-100 h-100 py-3">
                    <FaFileUpload className="mb-2" size={30} />
                    <div>Upload Materials</div>
                  </Link>
                </div>
                <div className="col-md-3 mb-3">
                  <Link to="/educator/VirtualClass" className="btn btn-info w-100 h-100 py-3">
                    <FaCalendarPlus className="mb-2" size={30} />
                    <div>Schedule Class</div>
                  </Link>
                </div>
                <div className="col-md-3 mb-3">
                  <Link to="/educator/GradeSubmissions" className="btn btn-warning w-100 h-100 py-3">
                    <FaTasks className="mb-2" size={30} />
                    <div>Grade Submissions</div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Courses */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Your Recent Courses</h5>
              <Link to="/educator/CourseManager" className="btn btn-sm btn-primary">
                View All Courses
              </Link>
            </div>
            <div className="card-body">
              {recentCourses.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Course Title</th>
                        <th>Category</th>
                        <th>Students</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCourses.map(course => (
                        <tr key={course.id}>
                          <td>
                            <strong>{course.title}</strong>
                            <br />
                            <small className="text-muted">{course.description?.substring(0, 50)}...</small>
                          </td>
                          <td>
                            <span className="badge bg-secondary">{course.category}</span>
                          </td>
                          <td>
                            <span className="badge bg-info">{course.enrolled_count || 0}</span>
                          </td>
                          <td>
                            {course.is_published ? (
                              <span className="badge bg-success">Published</span>
                            ) : (
                              <span className="badge bg-warning">Draft</span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => handleEditCourse(course.id)}
                              >
                                <FaEdit className="me-1" /> Edit
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
                  <p className="text-muted">You haven't created any courses yet.</p>
                  <Link to="/educator/CourseManager" className="btn btn-primary">
                    Create Your First Course
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities & Upcoming Tasks */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <FaCommentDots className="me-2" />
                Recent Student Activities
              </h5>
            </div>
            <div className="card-body">
              <div className="list-group">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, idx) => (
                    <button 
                      key={idx}
                      className="list-group-item list-group-item-action"
                      onClick={() => handleViewActivity(activity)}
                    >
                      <div className="d-flex w-100 justify-content-between">
                        <div>
                          <strong>{activity.student_name}</strong> {activity.message}
                          <br />
                          <small className="text-muted">{activity.course_title}</small>
                        </div>
                        <small className="text-muted">{activity.time_ago}</small>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-3">
                    <p className="text-muted">No recent activities</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">Upcoming Tasks</h5>
            </div>
            <div className="card-body">
              <div className="list-group">
                {upcomingTasks.length > 0 ? (
                  upcomingTasks.map((task, idx) => (
                    <button 
                      key={idx}
                      className="list-group-item list-group-item-action"
                      onClick={() => handleViewTask(task)}
                    >
                      <div className="d-flex w-100 justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{task.task_title}</h6>
                          <small className="text-muted">
                            {task.course_title} • {task.assessment_title}
                          </small>
                        </div>
                        <div className="text-end">
                          <span className={`badge bg-${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <br />
                          <small className="text-muted">{task.due_relative}</small>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-3">
                    <p className="text-muted">No upcoming tasks</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducatorDashboard;