// components/Learner/Progress.js
import React, { useState, useEffect } from 'react';
import { FaChartLine, FaTrophy, FaCalendarCheck, FaCertificate, FaStar, FaAward, FaBook, FaGraduationCap } from 'react-icons/fa';
import { Bar, Line, Pie } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Progress = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [stats, setStats] = useState({
    total_courses: 0,
    completed_courses: 0,
    avg_progress: 0,
    total_hours: 0,
    total_submissions: 0,
    avg_grade: 0
  });
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch enrolled courses with progress
      const enrolledRes = await axios.get('/api/learner/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnrolledCourses(enrolledRes.data);
      
      // Calculate stats
      const totalCourses = enrolledRes.data.length;
      const completedCourses = enrolledRes.data.filter(course => course.completed).length;
      const avgProgress = enrolledRes.data.reduce((sum, course) => sum + course.progress, 0) / totalCourses || 0;
      const totalHours = enrolledRes.data.reduce((sum, course) => sum + (course.duration_hours || 0), 0);
      
      // Fetch submissions to calculate grades
      const submissionsRes = await axios.get('/api/learner/submissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const gradedSubmissions = submissionsRes.data.filter(s => s.marks !== null);
      const totalSubmissions = submissionsRes.data.length;
      const avgGrade = gradedSubmissions.length > 0 
        ? gradedSubmissions.reduce((sum, s) => sum + s.marks, 0) / gradedSubmissions.length 
        : 0;
      
      setStats({
        total_courses: totalCourses,
        completed_courses: completedCourses,
        avg_progress: avgProgress,
        total_hours: totalHours,
        total_submissions: totalSubmissions,
        avg_grade: avgGrade
      });
      
      // Generate monthly progress data (last 6 months)
      generateMonthlyProgress(enrolledRes.data);
      
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyProgress = (courses) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const monthlyData = months.map((month, index) => {
      // Simulate progress growth over months
      const baseProgress = (index + 1) * 15;
      const randomVariation = Math.random() * 10 - 5; // -5 to +5
      return Math.min(100, Math.max(0, baseProgress + randomVariation));
    });
    setMonthlyData(monthlyData);
  };

  // Chart Data
  const progressChartData = {
    labels: enrolledCourses.map(course => course.title.substring(0, 15) + (course.title.length > 15 ? '...' : '')),
    datasets: [
      {
        label: 'Progress (%)',
        data: enrolledCourses.map(course => course.progress),
        backgroundColor: enrolledCourses.map(course => 
          course.completed ? '#28a745' : 
          course.progress > 50 ? '#ffc107' : '#dc3545'
        ),
        borderColor: '#495057',
        borderWidth: 1
      }
    ]
  };

  const monthlyProgressData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Monthly Progress',
        data: monthlyData,
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const categoryDistributionData = {
    labels: enrolledCourses.reduce((categories, course) => {
      if (!categories.includes(course.category)) {
        categories.push(course.category);
      }
      return categories;
    }, []),
    datasets: [
      {
        data: enrolledCourses.reduce((counts, course) => {
          const index = counts.findIndex(c => c.category === course.category);
          if (index === -1) {
            counts.push({ category: course.category, count: 1 });
          } else {
            counts[index].count++;
          }
          return counts;
        }, []).map(item => item.count),
        backgroundColor: [
          '#0d6efd', '#20c997', '#fd7e14', '#6f42c1', '#dc3545', '#6c757d'
        ]
      }
    ]
  };

  const achievements = [
    { 
      id: 1, 
      title: 'First Course Completed', 
      icon: <FaTrophy />, 
      date: enrolledCourses.find(c => c.completed)?.completed_at || 'Not yet',
      color: 'gold',
      achieved: stats.completed_courses > 0
    },
    { 
      id: 2, 
      title: 'Consistent Learner', 
      icon: <FaCalendarCheck />, 
      date: '2024-01-20', 
      color: 'silver',
      achieved: stats.avg_progress > 50
    },
    { 
      id: 3, 
      title: 'Perfect Score', 
      icon: <FaStar />, 
      date: '2024-01-25', 
      color: 'bronze',
      achieved: stats.avg_grade > 90
    },
    { 
      id: 4, 
      title: 'Course Explorer', 
      icon: <FaAward />, 
      date: '2024-02-01', 
      color: 'primary',
      achieved: stats.total_courses >= 3
    }
  ].filter(ach => ach.achieved);

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
            <FaChartLine className="me-2" />
            Learning Progress & Analytics
          </h2>
          <p className="text-muted">Track your learning journey and achievements</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title">Total Progress</h6>
                  <h2 className="fw-bold">{stats.avg_progress.toFixed(1)}%</h2>
                </div>
                <FaChartLine className="fs-1" />
              </div>
              <div className="progress bg-white bg-opacity-25 mt-2" style={{ height: '8px' }}>
                <div 
                  className="progress-bar bg-white" 
                  style={{ width: `${stats.avg_progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title">Courses Completed</h6>
                  <h2 className="fw-bold">{stats.completed_courses}/{stats.total_courses}</h2>
                </div>
                <FaCertificate className="fs-1" />
              </div>
              <small>{((stats.completed_courses / stats.total_courses) * 100 || 0).toFixed(0)}% completion rate</small>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card bg-warning text-dark">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title">Learning Hours</h6>
                  <h2 className="fw-bold">{stats.total_hours}</h2>
                </div>
                <FaCalendarCheck className="fs-1" />
              </div>
              <small>Total hours enrolled</small>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title">Average Grade</h6>
                  <h2 className="fw-bold">{stats.avg_grade.toFixed(1)}/100</h2>
                </div>
                <FaStar className="fs-1" />
              </div>
              <small>Based on {stats.total_submissions} submissions</small>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0">Course Progress Overview</h5>
            </div>
            <div className="card-body">
              <Bar 
                data={progressChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: {
                        display: true,
                        text: 'Progress (%)'
                      }
                    }
                  }
                }}
                height={300}
              />
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0">Monthly Learning Trend</h5>
            </div>
            <div className="card-body">
              <Line 
                data={monthlyProgressData}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100
                    }
                  }
                }}
                height={300}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Course Progress Details */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Detailed Course Progress</h5>
              <button className="btn btn-sm btn-primary" onClick={fetchProgressData}>
                Refresh Data
              </button>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Category</th>
                      <th>Educator</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Estimated Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledCourses.map(course => {
                      const daysRemaining = course.progress < 100 
                        ? Math.ceil((100 - course.progress) / (course.progress > 0 ? course.progress / 30 : 10))
                        : 0;
                      
                      return (
                        <tr key={course.id}>
                          <td>
                            <strong>{course.title}</strong>
                            <br />
                            <small className="text-muted">Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}</small>
                          </td>
                          <td>
                            <span className="badge bg-secondary">{course.category}</span>
                          </td>
                          <td>{course.educator_name}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1 me-2" style={{ height: '10px' }}>
                                <div 
                                  className={`progress-bar ${course.progress === 100 ? 'bg-success' : course.progress > 50 ? 'bg-warning' : 'bg-danger'}`}
                                  style={{ width: `${course.progress}%` }}
                                ></div>
                              </div>
                              <span>{course.progress}%</span>
                            </div>
                          </td>
                          <td>
                            {course.completed ? (
                              <span className="badge bg-success">
                                <FaGraduationCap className="me-1" /> Completed
                              </span>
                            ) : course.progress === 0 ? (
                              <span className="badge bg-secondary">Not Started</span>
                            ) : (
                              <span className="badge bg-warning">In Progress</span>
                            )}
                          </td>
                          <td>
                            {course.completed ? (
                              <span className="text-success">
                                Completed on {new Date(course.completed_at).toLocaleDateString()}
                              </span>
                            ) : course.progress > 0 ? (
                              <span className="text-muted">
                                ~{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                              </span>
                            ) : (
                              <span className="text-muted">Not started</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements & Category Distribution */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0">Your Achievements ({achievements.length})</h5>
            </div>
            <div className="card-body">
              {achievements.length > 0 ? (
                <div className="row">
                  {achievements.map(achievement => (
                    <div className="col-md-6 mb-3" key={achievement.id}>
                      <div className="card border-0 shadow-sm">
                        <div className="card-body text-center">
                          <div 
                            className="mb-2 p-3 rounded-circle d-inline-flex align-items-center justify-content-center"
                            style={{ 
                              backgroundColor: `${achievement.color}20`,
                              color: achievement.color,
                              width: '60px',
                              height: '60px'
                            }}
                          >
                            {achievement.icon}
                          </div>
                          <h6 className="card-title mb-1">{achievement.title}</h6>
                          <small className="text-muted">
                            {achievement.date !== 'Not yet' ? `Earned on ${new Date(achievement.date).toLocaleDateString()}` : 'Not yet achieved'}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">No achievements yet. Keep learning!</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0">Learning Distribution by Category</h5>
            </div>
            <div className="card-body">
              {enrolledCourses.length > 0 ? (
                <Pie 
                  data={categoryDistributionData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }}
                  height={300}
                />
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">Enroll in courses to see distribution</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progress;