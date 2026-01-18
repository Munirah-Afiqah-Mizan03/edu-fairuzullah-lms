// components/Educator/GradeSubmissions.js
import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaFileAlt, FaUserGraduate, FaStar, FaCalendar, FaEye, FaDownload, FaFilePdf, FaFileWord, FaFileImage, FaFileArchive } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const GradeSubmissions = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState({});
  const [searchParams] = useSearchParams();
  const [viewingFile, setViewingFile] = useState(null);

  useEffect(() => {
    fetchEducatorCourses();
    
    const assessmentIdFromUrl = searchParams.get('assessment');
    if (assessmentIdFromUrl) {
      sessionStorage.setItem('preselectedAssessment', assessmentIdFromUrl);
    }
  }, [searchParams]);

  const fetchEducatorCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      const response = await axios.get('/api/courses', {
        params: { educator_id: user.id },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCourses(response.data);
      
      const preselectedAssessmentId = sessionStorage.getItem('preselectedAssessment');
      if (preselectedAssessmentId && response.data.length > 0) {
        findAndSelectAssessment(preselectedAssessmentId, response.data);
        sessionStorage.removeItem('preselectedAssessment');
      } else if (response.data.length > 0) {
        setSelectedCourse(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const findAndSelectAssessment = async (assessmentId, educatorCourses) => {
    try {
      const token = localStorage.getItem('token');
      
      const assessmentRes = await axios.get(`/api/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (assessmentRes.data) {
        const assessment = assessmentRes.data;
        
        const course = educatorCourses.find(c => c.id === assessment.course_id);
        if (course) {
          setSelectedCourse(course.id);
          
          const assessmentsRes = await axios.get(`/api/courses/${course.id}/assessments`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setAssessments(assessmentsRes.data);
          setSelectedAssessment(assessmentId);
          fetchSubmissions(assessmentId);
        }
      }
    } catch (error) {
      console.error('Error finding assessment:', error);
    }
  };

  const fetchAssessments = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/courses/${courseId}/assessments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAssessments(response.data);
      if (response.data.length > 0) {
        const assessmentIdFromUrl = searchParams.get('assessment');
        if (assessmentIdFromUrl && response.data.find(a => a.id === parseInt(assessmentIdFromUrl))) {
          setSelectedAssessment(assessmentIdFromUrl);
        } else {
          setSelectedAssessment(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
    }
  };

  const fetchSubmissions = async (assessmentId) => {
    if (!assessmentId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/assessments/${assessmentId}/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSubmissions(response.data);
      
      const gradingState = {};
      response.data.forEach(sub => {
        gradingState[sub.id] = {
          marks: sub.marks || '',
          feedback: sub.feedback || ''
        };
      });
      setGrading(gradingState);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  useEffect(() => {
    if (selectedCourse) {
      fetchAssessments(selectedCourse);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedAssessment) {
      fetchSubmissions(selectedAssessment);
    }
  }, [selectedAssessment]);

  const handleGradingChange = (submissionId, field, value) => {
    setGrading(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value
      }
    }));
  };

  const submitGrade = async (submissionId) => {
    const gradeData = grading[submissionId];
    if (!gradeData || !gradeData.marks) {
      alert('Please enter marks before grading');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/submissions/${submissionId}`, gradeData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Grade submitted successfully!');
      fetchSubmissions(selectedAssessment);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit grade');
    }
  };

  const getAssessmentById = (id) => {
    return assessments.find(a => a.id === parseInt(id));
  };

  const getStatusBadge = (submission) => {
    if (submission.marks !== null && submission.marks !== undefined) {
      return <span className="badge bg-success">Graded</span>;
    }
    return <span className="badge bg-warning">Pending</span>;
  };

  // Get file icon based on file type
  const getFileIcon = (url) => {
    if (!url) return <FaFileAlt />;
    
    const fileName = url.toLowerCase();
    if (fileName.includes('.pdf')) return <FaFilePdf className="text-danger" />;
    if (fileName.includes('.doc') || fileName.includes('.docx')) return <FaFileWord className="text-primary" />;
    if (fileName.includes('.jpg') || fileName.includes('.jpeg') || fileName.includes('.png') || fileName.includes('.gif')) return <FaFileImage className="text-success" />;
    if (fileName.includes('.zip') || fileName.includes('.rar') || fileName.includes('.7z')) return <FaFileArchive className="text-warning" />;
    return <FaFileAlt />;
  };

  // Get file type name
  const getFileType = (url) => {
    if (!url) return 'File';
    
    const fileName = url.toLowerCase();
    if (fileName.includes('.pdf')) return 'PDF';
    if (fileName.includes('.doc')) return 'Word Document';
    if (fileName.includes('.docx')) return 'Word Document';
    if (fileName.includes('.jpg') || fileName.includes('.jpeg')) return 'Image';
    if (fileName.includes('.png')) return 'Image';
    if (fileName.includes('.gif')) return 'Image';
    if (fileName.includes('.txt')) return 'Text File';
    if (fileName.includes('.zip')) return 'ZIP Archive';
    if (fileName.includes('.rar')) return 'RAR Archive';
    return 'File';
  };

  // Extract filename from URL
  const getFileName = (url) => {
    if (!url) return 'No file';
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  // Open file in new tab
  const openFile = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Download file
  const downloadFile = (url, studentName, assessmentTitle) => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${studentName}_${assessmentTitle}_${getFileName(url)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // View file in modal (for larger preview)
  const viewFileModal = (submission) => {
    setViewingFile(submission);
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
      {/* File View Modal */}
      {viewingFile && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Viewing: {viewingFile.student_name}'s Submission
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setViewingFile(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-4">
                    <div className="card">
                      <div className="card-body">
                        <h6>Submission Details</h6>
                        <p><strong>Student:</strong> {viewingFile.student_name}</p>
                        <p><strong>Email:</strong> {viewingFile.student_email}</p>
                        <p><strong>Submitted:</strong> {new Date(viewingFile.submitted_at).toLocaleString()}</p>
                        <p><strong>File Type:</strong> {getFileType(viewingFile.submission_url)}</p>
                        
                        <div className="d-grid gap-2 mt-3">
                          <button 
                            className="btn btn-primary"
                            onClick={() => openFile(viewingFile.submission_url)}
                          >
                            <FaEye className="me-2" /> Open in New Tab
                          </button>
                          <button 
                            className="btn btn-success"
                            onClick={() => downloadFile(
                              viewingFile.submission_url, 
                              viewingFile.student_name,
                              getAssessmentById(selectedAssessment)?.title
                            )}
                          >
                            <FaDownload className="me-2" /> Download File
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-8">
                    <div className="card h-100">
                      <div className="card-body">
                        <h6>File Preview</h6>
                        {viewingFile.submission_url.includes('.pdf') ? (
                          <iframe 
                            src={viewingFile.submission_url} 
                            style={{ width: '100%', height: '500px' }}
                            title="PDF Preview"
                          />
                        ) : viewingFile.submission_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <div className="text-center">
                            <img 
                              src={viewingFile.submission_url} 
                              alt="Submission" 
                              style={{ maxWidth: '100%', maxHeight: '500px' }}
                              className="img-fluid"
                            />
                          </div>
                        ) : (
                          <div className="text-center py-5">
                            <div className="display-1 text-muted">
                              {getFileIcon(viewingFile.submission_url)}
                            </div>
                            <p className="mt-3">
                              This file type cannot be previewed directly.
                              Please download or open in appropriate application.
                            </p>
                            <p className="text-muted">
                              File: {getFileName(viewingFile.submission_url)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row mb-4">
        <div className="col">
          <h2>
            <FaStar className="me-2" />
            Grade Student Submissions
          </h2>
          <p className="text-muted">Review and grade student assessment submissions</p>
          {searchParams.get('assessment') && (
            <div className="alert alert-info">
              <small>Viewing submissions for assessment ID: {searchParams.get('assessment')}</small>
            </div>
          )}
        </div>
      </div>

      {/* Course and Assessment Selection */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header bg-light">
              <h6 className="mb-0">Select Course</h6>
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
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header bg-light">
              <h6 className="mb-0">Select Assessment</h6>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={selectedAssessment}
                onChange={(e) => setSelectedAssessment(e.target.value)}
                disabled={!selectedCourse}
              >
                <option value="">Choose an assessment</option>
                {assessments.map(assessment => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {selectedAssessment && (
        <div className="row">
          <div className="col">
            <div className="card">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">Submissions to Grade ({submissions.length})</h5>
                  {selectedAssessment && (
                    <small className="text-muted">
                      Assessment: {getAssessmentById(selectedAssessment)?.title}
                    </small>
                  )}
                </div>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => fetchSubmissions(selectedAssessment)}
                >
                  Refresh
                </button>
              </div>
              <div className="card-body">
                {submissions.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Submitted</th>
                          <th>Submission File</th>
                          <th>Marks</th>
                          <th>Feedback</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map(submission => (
                          <tr key={submission.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="avatar me-2">
                                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                                    {submission.student_name.charAt(0)}
                                  </div>
                                </div>
                                <div>
                                  <strong>{submission.student_name}</strong>
                                  <br />
                                  <small className="text-muted">{submission.student_email}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <small>
                                <FaCalendar className="me-1" />
                                {new Date(submission.submitted_at).toLocaleString()}
                              </small>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="me-2">
                                  {getFileIcon(submission.submission_url)}
                                </div>
                                <div>
                                  <small className="d-block">
                                    <strong>{getFileType(submission.submission_url)}</strong>
                                  </small>
                                  <small className="text-muted">
                                    {getFileName(submission.submission_url)}
                                  </small>
                                </div>
                              </div>
                              <div className="mt-1 d-flex gap-1">
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => viewFileModal(submission)}
                                  title="Preview submission"
                                >
                                  <FaEye />
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => downloadFile(
                                    submission.submission_url, 
                                    submission.student_name,
                                    getAssessmentById(selectedAssessment)?.title
                                  )}
                                  title="Download submission"
                                >
                                  <FaDownload />
                                </button>
                                <a 
                                  href={submission.submission_url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="btn btn-sm btn-outline-info"
                                  title="Open in new tab"
                                >
                                  <FaFileAlt />
                                </a>
                              </div>
                            </td>
                            <td>
                              <div className="input-group input-group-sm">
                                <input
                                  type="number"
                                  className="form-control"
                                  value={grading[submission.id]?.marks || submission.marks || ''}
                                  onChange={(e) => handleGradingChange(submission.id, 'marks', e.target.value)}
                                  min="0"
                                  max={getAssessmentById(selectedAssessment)?.total_marks || 100}
                                  style={{ width: '80px' }}
                                />
                                <span className="input-group-text">
                                  /{getAssessmentById(selectedAssessment)?.total_marks || 100}
                                </span>
                              </div>
                            </td>
                            <td>
                              <textarea
                                className="form-control form-control-sm"
                                rows="2"
                                value={grading[submission.id]?.feedback || submission.feedback || ''}
                                onChange={(e) => handleGradingChange(submission.id, 'feedback', e.target.value)}
                                placeholder="Enter feedback..."
                                style={{ width: '200px' }}
                              />
                            </td>
                            <td>
                              {getStatusBadge(submission)}
                            </td>
                            <td>
                              <div className="d-flex flex-column gap-1">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => submitGrade(submission.id)}
                                  disabled={!grading[submission.id]?.marks}
                                >
                                  <FaCheck className="me-1" /> Grade
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => viewFileModal(submission)}
                                >
                                  <FaEye className="me-1" /> View
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
                      <h5>No submissions yet</h5>
                      <p className="mb-0">Students haven't submitted this assessment yet.</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Bulk Actions */}
              {submissions.length > 0 && (
                <div className="card-footer">
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      {submissions.filter(s => s.marks !== null).length} of {submissions.length} submissions graded
                    </small>
                    <div className="btn-group">
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          // Download all submissions as ZIP (would need backend endpoint)
                          alert('This would download all submissions as a ZIP file');
                        }}
                      >
                        <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            const assessmentTitle = getAssessmentById(selectedAssessment)?.title.replace(/[^a-z0-9]/gi, '_');
                            const fileName = `submissions_${assessmentTitle}.zip`;
                            
                            // Create a temporary link for download
                            const response = await axios.get(`/api/assessments/${selectedAssessment}/download-all`, {
                              headers: { Authorization: `Bearer ${token}` },
                              responseType: 'blob'
                            });
                            
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', fileName);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                          } catch (error) {
                            alert(error.response?.data?.error || 'Failed to download submissions');
                          }
                        }}
                      >
                        <FaDownload className="me-1" /> Download All as ZIP
                      </button>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeSubmissions;