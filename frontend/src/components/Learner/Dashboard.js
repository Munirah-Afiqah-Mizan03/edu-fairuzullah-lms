// components/Learner/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaBook, FaUserGraduate, FaVideo, FaTasks, 
  FaChartLine, FaCalendarAlt, FaBullhorn, FaBell, FaFileAlt 
} from 'react-icons/fa';
import axios from 'axios';

const LearnerDashboard = () => {
  const [stats, setStats] = useState({
    enrolled_courses: 0,
    completed_courses: 0,
    avg_progress: 0
  });
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch stats
      const statsRes = await axios.get('/api/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(statsRes.data);
      
      // Fetch enrolled courses
      const coursesRes = await axios.get('/api/learner/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnrolledCourses(coursesRes.data.slice(0, 3));
      
      // Fetch upcoming tasks (assessments with deadlines)
      const tasks = await fetchUpcomingTasks(token, coursesRes.data);
      setUpcomingTasks(tasks);
      
      // Fetch recent activities
      const activities = await fetchRecentActivities(token);
      setRecentActivities(activities);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingTasks = async (token, courses) => {
    const tasks = [];
    
    // Get assessments with deadlines for enrolled courses
    for (const course of courses) {
      try {
        const assessmentsRes = await axios.get(`/api/courses/${course.id}/assessments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const upcomingAssessments = assessmentsRes.data
          .filter(a => a.deadline && new Date(a.deadline) > new Date())
          .map(a => ({
            type: 'assessment',
            id: a.id,
            title: a.title,
            description: `Due: ${new Date(a.deadline).toLocaleDateString()}`,
            course: course.title,
            deadline: a.deadline,
            daysLeft: Math.ceil((new Date(a.deadline) - new Date()) / (1000 * 60 * 60 * 24))
          }));
        
        tasks.push(...upcomingAssessments);
      } catch (error) {
        console.error(`Error fetching assessments for course ${course.id}:`, error);
      }
    }
    
    // Sort by deadline (closest first)
    return tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);
  };

  const fetchRecentActivities = async (token) => {
    const activities = [];
    
    try {
      // Get recent submissions
      const submissionsRes = await axios.get('/api/learner/recent-submissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      activities.push(...submissionsRes.data.map(sub => ({
        type: 'submission',
        title: `Submitted: ${sub.assessment_title}`,
        description: `Course: ${sub.course_title}`,
        time: new Date(sub.submitted_at).toLocaleDateString()
      })));
    } catch (error) {
      console.error('Error fetching recent submissions:', error);
    }
    
    return activities.slice(0, 5);
  };

  const getPriorityColor = (daysLeft) => {
    if (daysLeft <= 1) return 'danger';
    if (daysLeft <= 3) return 'warning';
    if (daysLeft <= 7) return 'info';
    return 'secondary';
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
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h1 className="card-title">
                <FaUserGraduate className="me-3" />
                WELCOME BACK LEARNER!
              </h1>
              <p className="card-text">
                Continue your learning journey. You have {stats.enrolled_courses} active courses 
                with {stats.avg_progress}% average progress.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card h-100 border-success">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Enrolled Courses</h6>
                  <h2 className="fw-bold text-success">{stats.enrolled_courses}</h2>
                </div>
                <FaBook className="fs-1 text-success" />
              </div>
              <Link to="/courses" className="btn btn-outline-success btn-sm mt-2">
                Browse More Courses
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-4 mb-3">
          <div className="card h-100 border-info">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Completed Courses</h6>
                  <h2 className="fw-bold text-info">{stats.completed_courses}</h2>
                </div>
                <FaChartLine className="fs-1 text-info" />
              </div>
              <div className="mt-2">
                <small className="text-muted">
                  {((stats.completed_courses / stats.enrolled_courses) * 100 || 0).toFixed(1)}% completion rate
                </small>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4 mb-3">
          <div className="card h-100 border-warning">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Average Progress</h6>
                  <h2 className="fw-bold text-warning">{stats.avg_progress}%</h2>
                </div>
                <FaChartLine className="fs-1 text-warning" />
              </div>
              <div className="progress mt-2" style={{ height: '10px' }}>
                <div 
                  className="progress-bar bg-warning" 
                  style={{ width: `${stats.avg_progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enrolled Courses */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaBook className="me-2" />
                Recently Enrolled Courses
              </h5>
              <Link to="/enrollments" className="btn btn-sm btn-primary">
                View All Courses
              </Link>
            </div>
            <div className="card-body">
              {enrolledCourses.length > 0 ? (
                <div className="row">
                  {enrolledCourses.map(course => (
                    <div className="col-md-4 mb-3" key={course.id}>
                      <div className="card h-100">
                        <div className="card-body">
                          <h6 className="card-title">{course.title}</h6>
                          <p className="card-text small text-muted">
                            By: {course.educator_name}
                          </p>
                          <div className="progress mb-2" style={{ height: '8px' }}>
                            <div 
                              className="progress-bar bg-success" 
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                          <div className="d-flex justify-content-between small">
                            <span>Progress: {course.progress}%</span>
                            <span>{course.completed ? 'Completed' : 'In Progress'}</span>
                          </div>
                        </div>
                        <div className="card-footer bg-transparent">
                          <Link 
                            to={`/course/${course.id}`}
                            className="btn btn-sm btn-outline-primary w-100"
                          >
                            Continue Learning
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">You haven't enrolled in any courses yet.</p>
                  <Link to="/courses" className="btn btn-primary">
                    Browse Available Courses
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Tasks & Recent Activities */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <FaBell className="me-2" />
                Upcoming Tasks ({upcomingTasks.length})
              </h5>
            </div>
            <div className="card-body">
              {upcomingTasks.length > 0 ? (
                <div className="list-group">
                  {upcomingTasks.map((task, idx) => (
                    <Link 
                      key={idx}
                      to="/assessments"
                      className="list-group-item list-group-item-action"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{task.title}</h6>
                          <small className="text-muted">{task.description}</small>
                          <br />
                          <small className="text-muted">Course: {task.course}</small>
                        </div>
                        <div className="text-end">
                          <span className={`badge bg-${getPriorityColor(task.daysLeft)}`}>
                            {task.daysLeft} {task.daysLeft === 1 ? 'day' : 'days'} left
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-muted">No upcoming tasks. Great work!</p>
                </div>
              )}
              <div className="mt-3 text-center">
                <Link to="/assessments" className="btn btn-sm btn-outline-primary">
                  View All Assessments
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <FaBullhorn className="me-2" />
                Quick Actions
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/courses" className="btn btn-outline-primary">
                  <FaBook className="me-2" /> Enroll in New Course
                </Link>
                <Link to="/assessments" className="btn btn-outline-success">
                  <FaTasks className="me-2" /> View Pending Assessments
                </Link>
                <Link to="/materials" className="btn btn-outline-info">
                  <FaFileAlt className="me-2" /> Access Learning Materials
                </Link>
                <Link to="/learner-virtual-classes" className="btn btn-outline-warning">
                  <FaVideo className="me-2" /> Join Virtual Classes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnerDashboard;