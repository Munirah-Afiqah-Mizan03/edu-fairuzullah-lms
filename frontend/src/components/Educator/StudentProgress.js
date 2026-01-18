// components/Educator/StudentProgress.js
import React, { useState, useEffect } from 'react';
import { FaUsers, FaChartLine, FaBook, FaGraduationCap, FaStar, FaCalendarCheck } from 'react-icons/fa';
import { Bar, Line } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StudentProgress = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseStats, setCourseStats] = useState({
    total_students: 0,
    avg_progress: 0,
    completed_students: 0,
    avg_grade: 0
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

  const fetchStudentProgress = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get('/api/educator/student-progress', {
        params: { course_id: courseId },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter enrollments for the selected course
      const courseEnrollments = courseId 
        ? response.data.progress.filter(item => item.course_id === parseInt(courseId))
        : response.data.progress;
      
      setEnrollments(courseEnrollments);
      
      // Use stats from API response
      if (courseId && response.data.stats.by_course[courseId]) {
        const courseStatsData = response.data.stats.by_course[courseId];
        setCourseStats({
          total_students: courseStatsData.students?.length || 0,
          avg_progress: courseStatsData.avg_progress || 0,
          completed_students: courseStatsData.completed_students || 0,
          avg_grade: 0
        });
      } else {
        setCourseStats({
          total_students: response.data.stats.total_students || 0,
          avg_progress: response.data.stats.avg_progress || 0,
          completed_students: response.data.stats.completed_students || 0,
          avg_grade: response.data.stats.avg_grade || 0
        });
      }
      
    } catch (error) {
      console.error('Error fetching student progress:', error);
      
      // Fallback to mock data if API fails (remove this in production)
      const mockEnrollments = [
        { id: 1, student_name: 'Ahmad Bin Ismail', email: 'ahmad@example.com', enrolled_at: '2024-01-10', progress: 85, completed: false },
        { id: 2, student_name: 'Siti Nurhaliza', email: 'siti@example.com', enrolled_at: '2024-01-12', progress: 92, completed: true },
        { id: 3, student_name: 'John Doe', email: 'john@example.com', enrolled_at: '2024-01-15', progress: 45, completed: false },
        { id: 4, student_name: 'Sarah Lee', email: 'sarah@example.com', enrolled_at: '2024-01-18', progress: 78, completed: false },
        { id: 5, student_name: 'David Chen', email: 'david@example.com', enrolled_at: '2024-01-20', progress: 100, completed: true },
      ];
      
      setEnrollments(mockEnrollments);
      
      // Calculate statistics from mock data
      const total = mockEnrollments.length;
      const avgProgress = mockEnrollments.reduce((sum, e) => sum + e.progress, 0) / total;
      const completed = mockEnrollments.filter(e => e.completed).length;
      const avgGrade = mockEnrollments.reduce((sum, e) => sum + (e.progress * 0.8), 0) / total;
      
      setCourseStats({
        total_students: total,
        avg_progress: avgProgress,
        completed_students: completed,
        avg_grade: avgGrade
      });
    }
  };

  useEffect(() => {
    if (selectedCourse) {
      fetchStudentProgress(selectedCourse);
    }
  }, [selectedCourse]);

  // Chart Data - Only declare once!
  const progressChartData = {
    labels: enrollments.map(e => e.student_name.split(' ')[0]),
    datasets: [
      {
        label: 'Progress (%)',
        data: enrollments.map(e => e.progress),
        backgroundColor: enrollments.map(e => 
          e.completed ? '#28a745' : 
          e.progress > 50 ? '#ffc107' : '#dc3545'
        ),
        borderColor: '#495057',
        borderWidth: 1
      }
    ]
  };

  // Performance chart data - Different variable name
  const classPerformanceData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
    datasets: [
      {
        label: 'Average Class Progress',
        data: [20, 35, 50, 65, 78, 85],
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'warning';
    return 'danger';
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
            <FaUsers className="me-2" />
            Student Progress Tracking
          </h2>
          <p className="text-muted">Monitor and analyze student performance in your courses</p>
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

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-primary">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Total Students</h6>
                  <h2 className="fw-bold text-primary">{courseStats.total_students}</h2>
                </div>
                <FaUsers className="fs-1 text-primary" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card border-success">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Average Progress</h6>
                  <h2 className="fw-bold text-success">{courseStats.avg_progress.toFixed(1)}%</h2>
                </div>
                <FaChartLine className="fs-1 text-success" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card border-info">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Completed</h6>
                  <h2 className="fw-bold text-info">{courseStats.completed_students}</h2>
                </div>
                <FaGraduationCap className="fs-1 text-info" />
              </div>
              <small className="text-muted">
                {((courseStats.completed_students / courseStats.total_students) * 100 || 0).toFixed(1)}% completion rate
              </small>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card border-warning">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Average Grade</h6>
                  <h2 className="fw-bold text-warning">{courseStats.avg_grade.toFixed(1)}/100</h2>
                </div>
                <FaStar className="fs-1 text-warning" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0">Individual Student Progress</h5>
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
                      max: 100
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
              <h5 className="mb-0">Class Performance Over Time</h5>
            </div>
            <div className="card-body">
              <Line 
                data={classPerformanceData}
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

      {/* Student Progress Table */}
      <div className="row">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                Student Progress Details ({enrollments.length})
              </h5>
              <button className="btn btn-sm btn-primary" onClick={() => fetchStudentProgress(selectedCourse)}>
                Refresh
              </button>
            </div>
            <div className="card-body">
              {selectedCourse ? (
                enrollments.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Email</th>
                          <th>Enrolled Date</th>
                          <th>Progress</th>
                          <th>Status</th>
                          <th>Submissions</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((enrollment, index) => (
                        <tr key={enrollment.id || `enrollment-${index}`}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar me-2">
                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                                  {enrollment.student_name?.charAt(0) || '?'}
                                </div>
                              </div>
                              <strong>{enrollment.student_name || 'Unknown Student'}</strong>
                            </div>
                          </td>
                          <td>
                            <small>{enrollment.email || 'No email'}</small>
                          </td>
                          <td>
                            <small>{enrollment.enrolled_at ? new Date(enrollment.enrolled_at).toLocaleDateString() : 'N/A'}</small>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                <div 
                                  className={`progress-bar bg-${getProgressColor(enrollment.progress || 0)}`}
                                  style={{ width: `${enrollment.progress || 0}%` }}
                                ></div>
                              </div>
                              <span>{enrollment.progress || 0}%</span>
                            </div>
                          </td>
                          <td>
                            {enrollment.completed ? (
                              <span className="badge bg-success">
                                <FaCalendarCheck className="me-1" /> Completed
                              </span>
                            ) : (
                              <span className="badge bg-warning">In Progress</span>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-info">
                              {enrollment.submissions_count || 0} submitted
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="alert alert-info">
                      <h5>No students enrolled</h5>
                      <p className="mb-0">No students have enrolled in this course yet</p>
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

export default StudentProgress;