// components/Learner/Assessments.js
import React, { useState, useEffect, useRef } from 'react';
import { FaTasks, FaClock, FaUpload, FaCheck, FaFileAlt, FaCalendar, FaEdit, FaTrash, FaPlus, FaFilePdf, FaDownload, FaEye } from 'react-icons/fa';
import axios from 'axios';

const Assessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [submissionForm, setSubmissionForm] = useState({
    submission_url: '',
    file: null,
    fileName: ''
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch enrolled courses first
      const enrolledRes = await axios.get('/api/learner/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // For each course, fetch assessments
      const allAssessments = [];
      for (const course of enrolledRes.data) {
        try {
          const assessmentRes = await axios.get(`/api/courses/${course.id}/assessments`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const courseAssessments = assessmentRes.data.map(assessment => ({
            ...assessment,
            course_title: course.title,
            course_id: course.id,
            progress: course.progress
          }));
          
          allAssessments.push(...courseAssessments);
        } catch (error) {
          console.error(`Error fetching assessments for course ${course.id}:`, error);
        }
      }
      
      setAssessments(allAssessments);
      
      // Fetch learner's submissions
      fetchSubmissions(token);
      
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (token) => {
    try {
      const response = await axios.get('/api/learner/submissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissions(response.data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.zip', '.rar', '.jpg', '.jpeg', '.png'];
      const fileName = file.name.toLowerCase();
      const isValidType = allowedTypes.some(type => fileName.endsWith(type));
      
      if (!isValidType) {
        alert('Please upload PDF, Word, text, image, or archive files only');
        return;
      }
      
      setSubmissionForm({
        ...submissionForm,
        file: file,
        fileName: file.name,
        submission_url: '' // Clear URL if file is selected
      });
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!submissionForm.file) {
      alert('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', submissionForm.file);

    try {
      setUploading(true);
      setUploadProgress(0);
      
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/upload/submission', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      // Set the uploaded file URL
      setSubmissionForm({
        ...submissionForm,
        submission_url: response.data.fileUrl
      });
      
      alert('File uploaded successfully!');
      return response.data.fileUrl;
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to upload file');
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (assessmentId) => {
    let submissionUrl = submissionForm.submission_url;
    
    // If a file is selected but no URL yet, upload it first
    if (submissionForm.file && !submissionUrl) {
      submissionUrl = await handleFileUpload();
      if (!submissionUrl) return; // Upload failed
    }
    
    if (!submissionUrl) {
      alert('Please either upload a file or enter a submission URL');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/assessments/${assessmentId}/submit`, {
        submission_url: submissionUrl
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Assessment submitted successfully!');
      
      // Auto-view the submitted file
      if (submissionForm.file) {
        window.open(submissionUrl, '_blank');
      }
      
      // Reset form and refresh
      setShowSubmitForm(false);
      setSelectedAssessment(null);
      setSubmissionForm({
        submission_url: '',
        file: null,
        fileName: ''
      });
      fetchAssessments();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit assessment');
    }
  };

  const handleEditSubmission = async (submissionId, newUrl, newFile) => {
    let submissionUrl = newUrl;
    
    // If a new file is selected, upload it first
    if (newFile && !newUrl) {
      const tempForm = { file: newFile, fileName: newFile.name };
      setSubmissionForm(tempForm);
      submissionUrl = await handleFileUpload();
      if (!submissionUrl) return; // Upload failed
    }
    
    if (!submissionUrl) {
      alert('Please either upload a file or enter a submission URL');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/submissions/${submissionId}/edit`, {
        submission_url: submissionUrl
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Submission updated successfully!');
      
      // Auto-view the updated file
      if (newFile) {
        window.open(submissionUrl, '_blank');
      }
      
      fetchAssessments();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update submission');
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm('Are you sure you want to delete this submission?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Submission deleted successfully!');
      fetchAssessments();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete submission');
    }
  };

  const openSubmitForm = (assessment) => {
    setSelectedAssessment(assessment);
    setSubmissionForm({
      submission_url: '',
      file: null,
      fileName: ''
    });
    setShowSubmitForm(true);
  };

  const openEditForm = (assessment, submission) => {
    setSelectedAssessment({...assessment, submission});
    setSubmissionForm({
      submission_url: submission.submission_url,
      file: null,
      fileName: ''
    });
    setShowSubmitForm(true);
  };

  const clearFile = () => {
    setSubmissionForm({
      ...submissionForm,
      file: null,
      fileName: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pendingAssessments = assessments.filter(a => 
    !submissions.some(s => s.assessment_id === a.id) &&
    (!a.deadline || new Date(a.deadline) > new Date())
  );

  const submittedAssessments = assessments.filter(a => 
    submissions.some(s => s.assessment_id === a.id)
  ).map(assessment => {
    const submission = submissions.find(s => s.assessment_id === assessment.id);
    return { ...assessment, submission };
  });

  const overdueAssessments = assessments.filter(a => 
    !submissions.some(s => s.assessment_id === a.id) &&
    a.deadline && new Date(a.deadline) < new Date()
  );

  const getFileIcon = (url) => {
    if (!url) return <FaFileAlt />;
    
    const ext = url.toLowerCase().split('.').pop();
    if (ext === 'pdf') return <FaFilePdf className="text-danger" />;
    if (['doc', 'docx'].includes(ext)) return <FaFileAlt className="text-primary" />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <FaFileAlt className="text-success" />;
    return <FaFileAlt />;
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
            Assessments
          </h2>
          <p className="text-muted">Complete your assignments, quizzes, and exams</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-warning">
            <div className="card-body text-center">
              <h2 className="fw-bold text-warning">{pendingAssessments.length}</h2>
              <h6 className="text-muted">Pending</h6>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-success">
            <div className="card-body text-center">
              <h2 className="fw-bold text-success">{submittedAssessments.length}</h2>
              <h6 className="text-muted">Submitted</h6>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-danger">
            <div className="card-body text-center">
              <h2 className="fw-bold text-danger">{overdueAssessments.length}</h2>
              <h6 className="text-muted">Overdue</h6>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card border-info">
            <div className="card-body text-center">
              <h2 className="fw-bold text-info">{assessments.length}</h2>
              <h6 className="text-muted">Total</h6>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Form Modal */}
      {showSubmitForm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {selectedAssessment.submission ? 'Edit Submission' : 'Submit Assessment'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowSubmitForm(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Assessment</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={selectedAssessment.title} 
                    disabled 
                  />
                  <small className="text-muted">Course: {selectedAssessment.course_title}</small>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Upload File (Optional)</label>
                  <div className="input-group">
                    <input
                      type="file"
                      className="form-control"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.txt,.zip,.rar,.jpg,.jpeg,.png"
                    />
                    <button 
                      className="btn btn-outline-secondary" 
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                    >
                      <FaUpload className="me-1" /> Browse
                    </button>
                  </div>
                  <small className="text-muted">
                    Accepted: PDF, Word, text, images, archives (max 10MB)
                  </small>
                  
                  {submissionForm.fileName && (
                    <div className="alert alert-info mt-2 p-2 d-flex justify-content-between align-items-center">
                      <div>
                        {getFileIcon(submissionForm.fileName)} 
                        <span className="ms-2">{submissionForm.fileName}</span>
                      </div>
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={clearFile}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                  
                  {uploading && (
                    <div className="mt-2">
                      <div className="progress">
                        <div 
                          className="progress-bar progress-bar-striped progress-bar-animated" 
                          style={{ width: `${uploadProgress}%` }}
                        >
                          {uploadProgress}%
                        </div>
                      </div>
                      <small className="text-muted">Uploading...</small>
                    </div>
                  )}
                </div>
                
                <div className="mb-3">
                  <label className="form-label">OR Enter Submission URL</label>
                  <input
                    type="url"
                    className="form-control"
                    value={submissionForm.submission_url}
                    onChange={(e) => setSubmissionForm({
                      ...submissionForm,
                      submission_url: e.target.value,
                      file: null,
                      fileName: ''
                    })}
                    placeholder="https://drive.google.com/file/... or file path"
                  />
                  <small className="text-muted">
                    Use this if your file is already hosted online (Google Drive, Dropbox, etc.)
                  </small>
                </div>
                
                <div className="alert alert-info">
                  <small>
                    <strong>Note:</strong> After submission, your file/URL will automatically open in a new tab for verification.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowSubmitForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    if (selectedAssessment.submission) {
                      handleEditSubmission(
                        selectedAssessment.submission.id, 
                        submissionForm.submission_url,
                        submissionForm.file
                      );
                    } else {
                      handleSubmit(selectedAssessment.id);
                    }
                  }}
                  disabled={uploading || (!submissionForm.file && !submissionForm.submission_url)}
                >
                  {selectedAssessment.submission ? 'Update Submission' : 'Submit Assessment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="row mb-4">
        <div className="col">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                Pending ({pendingAssessments.length})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'submitted' ? 'active' : ''}`}
                onClick={() => setActiveTab('submitted')}
              >
                Submitted ({submittedAssessments.length})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'overdue' ? 'active' : ''}`}
                onClick={() => setActiveTab('overdue')}
              >
                Overdue ({overdueAssessments.length})
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Assessment List */}
      <div className="row">
        {activeTab === 'pending' && (
          pendingAssessments.length > 0 ? (
            pendingAssessments.map(assessment => (
              <div className="col-md-6 mb-3" key={assessment.id}>
                <div className="card h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h6 className="card-title mb-1">{assessment.title}</h6>
                        <small className="text-muted">{assessment.course_title}</small>
                      </div>
                      <span className="badge bg-warning">Pending</span>
                    </div>
                    
                    <p className="card-text small">{assessment.description}</p>
                    
                    <div className="mb-3">
                      <small className="text-muted d-block">
                        <FaClock className="me-1" />
                        {assessment.deadline ? `Due: ${new Date(assessment.deadline).toLocaleString()}` : 'No deadline'}
                      </small>
                      <small className="text-muted d-block">
                        <FaFileAlt className="me-1" />
                        Total Marks: {assessment.total_marks}
                      </small>
                    </div>
                    
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => openSubmitForm(assessment)}
                      >
                        <FaUpload className="me-1" /> Submit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col">
              <div className="alert alert-success text-center py-4">
                <h5>No pending assessments!</h5>
                <p className="mb-0">You're all caught up. Great work!</p>
              </div>
            </div>
          )
        )}

        {activeTab === 'submitted' && (
          submittedAssessments.length > 0 ? (
            submittedAssessments.map(assessment => (
              <div className="col-md-6 mb-3" key={assessment.id}>
                <div className="card h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h6 className="card-title mb-1">{assessment.title}</h6>
                        <small className="text-muted">{assessment.course_title}</small>
                      </div>
                      <span className="badge bg-success">
                        <FaCheck className="me-1" /> Submitted
                      </span>
                    </div>
                    
                    <p className="card-text small">{assessment.description}</p>
                    
                    <div className="mb-3">
                      <small className="text-muted d-block">
                        <FaClock className="me-1" />
                        {assessment.deadline ? `Due: ${new Date(assessment.deadline).toLocaleString()}` : 'No deadline'}
                      </small>
                      <small className="text-muted d-block">
                        <FaFileAlt className="me-1" />
                        Total Marks: {assessment.total_marks}
                      </small>
                      <small className="text-muted d-block">
                        Submitted: {new Date(assessment.submission.submitted_at).toLocaleString()}
                      </small>
                      
                      {/* File/URL preview */}
                      <div className="mt-2 p-2 border rounded bg-light">
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            {getFileIcon(assessment.submission.submission_url)}
                            <span className="ms-2 small">
                              {assessment.submission.submission_url.includes('uploads/') 
                                ? 'Uploaded File' 
                                : 'External Link'}
                            </span>
                          </div>
                          <div className="d-flex gap-1">
                            <a 
                              href={assessment.submission.submission_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="btn btn-sm btn-outline-primary"
                              title="View submission"
                            >
                              <FaEye />
                            </a>
                            <a 
                              href={assessment.submission.submission_url} 
                              download
                              className="btn btn-sm btn-outline-success"
                              title="Download submission"
                            >
                              <FaDownload />
                            </a>
                          </div>
                        </div>
                      </div>
                      
                      {assessment.submission.marks !== null && (
                        <div className="alert alert-success mt-2 p-2">
                          <strong>Marks:</strong> {assessment.submission.marks}/{assessment.total_marks}
                          {assessment.submission.feedback && (
                            <>
                              <br />
                              <strong>Feedback:</strong> {assessment.submission.feedback}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-warning btn-sm"
                        onClick={() => openEditForm(assessment, assessment.submission)}
                      >
                        <FaEdit className="me-1" /> Edit
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteSubmission(assessment.submission.id)}
                      >
                        <FaTrash className="me-1" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col">
              <div className="alert alert-info text-center py-4">
                <h5>No submitted assessments yet</h5>
                <p className="mb-0">Submit your first assessment to see it here.</p>
              </div>
            </div>
          )
        )}

        {activeTab === 'overdue' && (
          overdueAssessments.length > 0 ? (
            overdueAssessments.map(assessment => (
              <div className="col-md-6 mb-3" key={assessment.id}>
                <div className="card h-100 border-danger">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h6 className="card-title mb-1">{assessment.title}</h6>
                        <small className="text-muted">{assessment.course_title}</small>
                      </div>
                      <span className="badge bg-danger">Overdue</span>
                    </div>
                    
                    <p className="card-text small">{assessment.description}</p>
                    
                    <div className="mb-3">
                      <small className="text-muted d-block">
                        <FaClock className="me-1" />
                        Was due: {new Date(assessment.deadline).toLocaleString()}
                      </small>
                      <small className="text-muted d-block">
                        <FaFileAlt className="me-1" />
                        Total Marks: {assessment.total_marks}
                      </small>
                    </div>
                    
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => openSubmitForm(assessment)}
                      >
                        <FaUpload className="me-1" /> Submit Late
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col">
              <div className="alert alert-success text-center py-4">
                <h5>No overdue assessments!</h5>
                <p className="mb-0">You're managing your deadlines well.</p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Assessment Calendar */}
      <div className="row mt-4">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <FaCalendar className="me-2" />
                Upcoming Assessment Deadlines
              </h5>
            </div>
            <div className="card-body">
              {assessments.filter(a => a.deadline && new Date(a.deadline) > new Date()).length > 0 ? (
                <div className="list-group">
                  {assessments
                    .filter(a => a.deadline && new Date(a.deadline) > new Date())
                    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
                    .slice(0, 5)
                    .map(assessment => {
                      const daysLeft = Math.ceil((new Date(assessment.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                      const isSubmitted = submissions.some(s => s.assessment_id === assessment.id);
                      
                      return (
                        <div className="list-group-item" key={assessment.id}>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="mb-1">
                                {assessment.title}
                                {isSubmitted && <span className="badge bg-success ms-2">Submitted</span>}
                              </h6>
                              <small className="text-muted">{assessment.course_title}</small>
                            </div>
                            <div className="text-end">
                              <small className="text-muted d-block">
                                Due: {new Date(assessment.deadline).toLocaleDateString()}
                              </small>
                              <small className={`d-block ${daysLeft <= 3 ? 'text-danger' : daysLeft <= 7 ? 'text-warning' : 'text-success'}`}>
                                {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                              </small>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-muted">No upcoming assessment deadlines.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assessments;