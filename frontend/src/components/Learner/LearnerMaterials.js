// components/Learner/LearnerMaterials.js - UPDATED
import React, { useState, useEffect } from 'react';
import { 
  FaDownload, FaFilePdf, FaVideo, FaTasks, FaFileAlt, 
  FaBook, FaCalendar, FaExternalLinkAlt, FaFileWord, 
  FaFileExcel, FaFilePowerpoint, FaFileImage, FaFileArchive 
} from 'react-icons/fa';
import axios from 'axios';

const LearnerMaterials = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseStats, setCourseStats] = useState({});

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get('/api/learner/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEnrolledCourses(response.data);
      if (response.data.length > 0) {
        setSelectedCourse(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseMaterials = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/courses/${courseId}/materials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMaterials(response.data);
      
      // Get course info for stats
      const course = enrolledCourses.find(c => c.id === courseId);
      if (course) {
        setCourseStats({
          courseTitle: course.title,
          educatorName: course.educator_name,
          totalMaterials: response.data.length
        });
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseMaterials(selectedCourse);
    }
  }, [selectedCourse]);

  // Get file icon based on file type
  const getFileIcon = (type, url) => {
    // First check by material_type
    switch (type) {
      case 'pdf': return <FaFilePdf className="text-danger fs-4" />;
      case 'video': return <FaVideo className="text-primary fs-4" />;
      case 'quiz': return <FaTasks className="text-warning fs-4" />;
      case 'assignment': return <FaFileAlt className="text-success fs-4" />;
      case 'image': return <FaFileImage className="text-info fs-4" />;
      case 'document': return <FaFileWord className="text-primary fs-4" />;
      default: 
        // Check by file extension if URL exists
        if (url) {
          const extension = url.split('.').pop().toLowerCase();
          if (['pdf'].includes(extension)) return <FaFilePdf className="text-danger fs-4" />;
          if (['doc', 'docx'].includes(extension)) return <FaFileWord className="text-primary fs-4" />;
          if (['xls', 'xlsx'].includes(extension)) return <FaFileExcel className="text-success fs-4" />;
          if (['ppt', 'pptx'].includes(extension)) return <FaFilePowerpoint className="text-warning fs-4" />;
          if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return <FaFileImage className="text-info fs-4" />;
          if (['mp4', 'avi', 'mov'].includes(extension)) return <FaVideo className="text-primary fs-4" />;
          if (['zip', 'rar', '7z'].includes(extension)) return <FaFileArchive className="text-secondary fs-4" />;
        }
        return <FaFileAlt className="fs-4" />;
    }
  };

  const getMaterialTypeText = (type, url) => {
    switch (type) {
      case 'pdf': return 'PDF Document';
      case 'video': return 'Video Lecture';
      case 'quiz': return 'Quiz';
      case 'assignment': return 'Assignment';
      case 'image': return 'Image';
      case 'document': return 'Document';
      default: 
        if (url) {
          const extension = url.split('.').pop().toLowerCase();
          if (['pdf'].includes(extension)) return 'PDF Document';
          if (['doc', 'docx'].includes(extension)) return 'Word Document';
          if (['xls', 'xlsx'].includes(extension)) return 'Excel Spreadsheet';
          if (['ppt', 'pptx'].includes(extension)) return 'PowerPoint';
          if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'Image';
          if (['mp4', 'avi', 'mov'].includes(extension)) return 'Video';
          if (['zip', 'rar', '7z'].includes(extension)) return 'Archive';
        }
        return 'File';
    }
  };

  const getFileNameFromUrl = (url) => {
    if (!url) return 'File';
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  const isExternalUrl = (url) => {
    return url && (url.startsWith('http://') || url.startsWith('https://'));
  };

  const handleOpenMaterial = (material) => {
    if (material.file_url) {
      if (isExternalUrl(material.file_url)) {
        window.open(material.file_url, '_blank');
      } else {
        // For local files, construct full URL
        const baseUrl = window.location.origin;
        const fullUrl = material.file_url.startsWith('/') 
          ? baseUrl + material.file_url 
          : baseUrl + '/' + material.file_url;
        window.open(fullUrl, '_blank');
      }
    } else {
      alert('No file available for this material.');
    }
  };

  const handleDownloadMaterial = (material) => {
    if (!material.file_url) {
      alert('No downloadable file available.');
      return;
    }

    const link = document.createElement('a');
    
    if (isExternalUrl(material.file_url)) {
      // For external URLs, open in new tab (some may not allow direct download)
      window.open(material.file_url, '_blank');
      return;
    } else {
      // For local files
      const baseUrl = window.location.origin;
      const fullUrl = material.file_url.startsWith('/') 
        ? baseUrl + material.file_url 
        : baseUrl + '/' + material.file_url;
      
      link.href = fullUrl;
      link.download = getFileNameFromUrl(material.file_url) || material.title.replace(/\s+/g, '_');
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Log download (in real app, send to API)
    console.log(`Downloaded: ${material.title}`);
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
            <FaBook className="me-2" />
            Learning Materials
          </h2>
          <p className="text-muted">Access learning materials from your enrolled courses</p>
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
                {enrolledCourses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title} (Progress: {course.progress}%)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Course Info */}
      {selectedCourse && courseStats.courseTitle && (
        <div className="row mb-4">
          <div className="col">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-8">
                    <h4 className="card-title">{courseStats.courseTitle}</h4>
                    <p className="card-text">
                      Educator: <strong>{courseStats.educatorName}</strong>
                    </p>
                  </div>
                  <div className="col-md-4 text-end">
                    <div className="display-4 fw-bold">{courseStats.totalMaterials}</div>
                    <p className="mb-0">Total Materials</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Materials Grid */}
      <div className="row">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Course Materials ({materials.length})</h5>
              <button 
                className="btn btn-sm btn-primary"
                onClick={() => selectedCourse && fetchCourseMaterials(selectedCourse)}
              >
                Refresh Materials
              </button>
            </div>
            <div className="card-body">
              {selectedCourse ? (
                materials.length > 0 ? (
                  <div className="row">
                    {materials.map(material => (
                      <div className="col-md-6 col-lg-4 mb-4" key={material.id}>
                        <div className="card h-100 shadow-sm">
                          <div className="card-body">
                            <div className="d-flex align-items-start mb-3">
                              <div className="me-3">
                                {getFileIcon(material.material_type, material.file_url)}
                              </div>
                              <div>
                                <h6 className="card-title mb-1">{material.title}</h6>
                                <span className="badge bg-secondary">
                                  {getMaterialTypeText(material.material_type, material.file_url)}
                                </span>
                                {isExternalUrl(material.file_url) && (
                                  <span className="badge bg-info ms-1">
                                    <FaExternalLinkAlt className="me-1" /> External
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <p className="card-text small text-muted mb-3">
                              {material.description || 'No description available.'}
                            </p>
                            
                            <div className="mb-3">
                              <small className="text-muted d-block">
                                <FaCalendar className="me-1" />
                                Added: {new Date(material.created_at).toLocaleDateString()}
                              </small>
                              {material.file_url && (
                                <small className="text-muted d-block mt-1">
                                  File: {getFileNameFromUrl(material.file_url)}
                                </small>
                              )}
                            </div>
                            
                            <div className="d-flex gap-2 mt-auto">
                              <button 
                                className="btn btn-outline-primary btn-sm flex-grow-1"
                                onClick={() => handleOpenMaterial(material)}
                              >
                                <FaFileAlt className="me-1" /> 
                                {isExternalUrl(material.file_url) ? 'Open Link' : 'Open'}
                              </button>
                              {material.file_url && (
                                <button 
                                  className="btn btn-outline-success btn-sm flex-grow-1"
                                  onClick={() => handleDownloadMaterial(material)}
                                >
                                  <FaDownload className="me-1" /> Download
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="alert alert-info">
                      <h5>No materials available</h5>
                      <p className="mb-0">
                        No learning materials have been uploaded for this course yet.
                        Check back later or contact your educator.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-5">
                  <div className="alert alert-warning">
                    <h5>Select a Course</h5>
                    <p className="mb-0">Please select a course to view its materials.</p>
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

export default LearnerMaterials;