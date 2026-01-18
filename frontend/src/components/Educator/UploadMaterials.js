// components/Educator/UploadMaterials.js - UPDATED
import React, { useState, useEffect } from 'react';
import { 
  FaUpload, FaFilePdf, FaVideo, FaTasks, FaFileAlt, 
  FaTrash, FaEye, FaCloudUploadAlt, FaTimes, FaCheck 
} from 'react-icons/fa';
import axios from 'axios';

const UploadMaterials = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [materialForm, setMaterialForm] = useState({
    title: '',
    description: '',
    material_type: 'pdf',
    file_url: ''
  });

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    fetchEducatorCourses();
  }, []);

  const fetchEducatorCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      const response = await axios.get('/api/educator/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCourses(response.data);
      if (response.data.length > 0) {
        setSelectedCourse(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      alert('Error loading courses. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/courses/${courseId}/materials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaterials(response.data);
    } catch (error) {
      console.error('Error fetching materials:', error);
      alert('Error loading materials.');
    }
  };

  useEffect(() => {
    if (selectedCourse) {
      fetchMaterials(selectedCourse);
    }
  }, [selectedCourse]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMaterialForm({
      ...materialForm,
      [name]: value
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 50MB as per backend)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
      } else {
        setPreviewUrl('');
      }
      
      // Auto-set material type based on file extension
      const extension = file.name.split('.').pop().toLowerCase();
      let materialType = 'pdf';
      
      if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        materialType = 'image';
      } else if (['mp4', 'avi', 'mov', 'wmv'].includes(extension)) {
        materialType = 'video';
      } else if (['pdf'].includes(extension)) {
        materialType = 'pdf';
      } else if (['doc', 'docx', 'txt'].includes(extension)) {
        materialType = 'document';
      }
      
      setMaterialForm(prev => ({
        ...prev,
        material_type: materialType,
        title: file.name.split('.')[0] || prev.title // Use filename as default title
      }));
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/upload/material', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      });
      
      // Update form with uploaded file URL
      setMaterialForm(prev => ({
        ...prev,
        file_url: response.data.fileUrl
      }));
      
      alert('File uploaded successfully! URL has been copied to the form.');
      setUploading(false);
      setUploadProgress(0);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(error.response?.data?.error || 'Failed to upload file');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCourse) {
      alert('Please select a course first');
      return;
    }

    if (!materialForm.title.trim()) {
      alert('Please enter a title for the material');
      return;
    }

    if (!materialForm.file_url) {
      alert('Please upload a file or provide a URL');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/courses/${selectedCourse}/materials`, materialForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Material added successfully!');
      
      // Reset form
      setMaterialForm({
        title: '',
        description: '',
        material_type: 'pdf',
        file_url: ''
      });
      setSelectedFile(null);
      setPreviewUrl('');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      
      // Refresh materials list
      fetchMaterials(selectedCourse);
    } catch (error) {
      console.error('Error adding material:', error);
      alert(error.response?.data?.error || 'Failed to add material');
    }
  };

  const handleDelete = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/materials/${materialId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Material deleted successfully!');
      fetchMaterials(selectedCourse);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete material');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setMaterialForm(prev => ({ ...prev, file_url: '' }));
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  const getMaterialIcon = (type) => {
    switch (type) {
      case 'pdf': return <FaFilePdf className="text-danger" />;
      case 'video': return <FaVideo className="text-primary" />;
      case 'image': return <FaFileAlt className="text-success" />;
      case 'document': return <FaFileAlt className="text-info" />;
      case 'quiz': return <FaTasks className="text-warning" />;
      case 'assignment': return <FaFileAlt className="text-success" />;
      default: return <FaFileAlt />;
    }
  };

  const getFileTypeName = (type) => {
    switch (type) {
      case 'pdf': return 'PDF Document';
      case 'video': return 'Video';
      case 'image': return 'Image';
      case 'document': return 'Document';
      case 'quiz': return 'Quiz';
      case 'assignment': return 'Assignment';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            <FaUpload className="me-2" />
            Upload Learning Materials
          </h2>
          <p className="text-muted">Upload course materials for your students</p>
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
                    {course.title} ({course.category}) - {course.is_published ? 'Published' : 'Draft'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">Upload New Material</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-8 mb-3">
                    <label className="form-label">Material Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="title"
                      value={materialForm.title}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Chapter 1 Slides, Quiz 1, Assignment Guidelines"
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Material Type *</label>
                    <select
                      className="form-select"
                      name="material_type"
                      value={materialForm.material_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="pdf">PDF Document</option>
                      <option value="video">Video</option>
                      <option value="image">Image</option>
                      <option value="document">Document</option>
                      <option value="quiz">Quiz</option>
                      <option value="assignment">Assignment</option>
                    </select>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    name="description"
                    rows="3"
                    value={materialForm.description}
                    onChange={handleInputChange}
                    placeholder="Describe this material..."
                  />
                </div>
                
                {/* File Upload Section */}
                <div className="mb-4">
                  <label className="form-label">Upload File *</label>
                  
                  {/* File selection */}
                  {!selectedFile ? (
                    <div className="border rounded p-4 text-center bg-light">
                      <FaCloudUploadAlt className="display-4 text-muted mb-3" />
                      <p className="text-muted mb-3">Select a file to upload</p>
                      <div className="d-flex gap-2 justify-content-center">
                        <label className="btn btn-primary">
                          <FaUpload className="me-2" />
                          Choose File
                          <input
                            type="file"
                            className="d-none"
                            onChange={handleFileSelect}
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.wmv,.mp3,.wav"
                          />
                        </label>
                        <div className="input-group" style={{ maxWidth: '300px' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Or enter file URL"
                            value={materialForm.file_url}
                            onChange={(e) => setMaterialForm(prev => ({ ...prev, file_url: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => materialForm.file_url && alert('URL set successfully')}
                          >
                            <FaCheck />
                          </button>
                        </div>
                      </div>
                      <small className="text-muted mt-2 d-block">
                        Maximum file size: 50MB. Supported formats: PDF, Word, Excel, PowerPoint, Images, Videos, Audio
                      </small>
                    </div>
                  ) : (
                    /* File preview and upload */
                    <div className="border rounded p-4 bg-light">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <h6 className="mb-1">{selectedFile.name}</h6>
                          <small className="text-muted">
                            {formatFileSize(selectedFile.size)} • {selectedFile.type}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={handleRemoveFile}
                        >
                          <FaTimes />
                        </button>
                      </div>
                      
                      {/* Image preview */}
                      {previewUrl && (
                        <div className="mb-3">
                          <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="img-fluid rounded border" 
                            style={{ maxHeight: '200px' }}
                          />
                        </div>
                      )}
                      
                      {/* Upload progress */}
                      {uploading ? (
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <span>Uploading...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="progress">
                            <div 
                              className="progress-bar progress-bar-striped progress-bar-animated" 
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-success mb-3"
                          onClick={handleUploadFile}
                        >
                          <FaUpload className="me-2" />
                          Upload File to Server
                        </button>
                      )}
                      
                      {/* URL input (alternative to upload) */}
                      <div className="input-group">
                        <span className="input-group-text">File URL</span>
                        <input
                          type="text"
                          className="form-control"
                          value={materialForm.file_url}
                          onChange={(e) => setMaterialForm(prev => ({ ...prev, file_url: e.target.value }))}
                          placeholder="File URL will appear here after upload"
                        />
                      </div>
                      <small className="text-muted mt-2 d-block">
                        After uploading, the URL will be automatically filled. You can also paste an external URL.
                      </small>
                    </div>
                  )}
                </div>
                
                <div className="d-flex gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={uploading || !materialForm.file_url}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FaUpload className="me-1" /> Save Material
                      </>
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setMaterialForm({
                        title: '',
                        description: '',
                        material_type: 'pdf',
                        file_url: ''
                      });
                      setSelectedFile(null);
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                        setPreviewUrl('');
                      }
                    }}
                  >
                    Clear Form
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Materials */}
      <div className="row">
        <div className="col">
          <div className="card">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                Course Materials ({materials.length})
              </h5>
              <button 
                className="btn btn-sm btn-primary" 
                onClick={() => selectedCourse && fetchMaterials(selectedCourse)}
              >
                Refresh
              </button>
            </div>
            <div className="card-body">
              {selectedCourse ? (
                materials.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Title</th>
                          <th>Description</th>
                          <th>File</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials.map(material => (
                          <tr key={material.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className="me-2">{getMaterialIcon(material.material_type)}</span>
                                <span>{getFileTypeName(material.material_type)}</span>
                              </div>
                            </td>
                            <td>
                              <strong>{material.title}</strong>
                            </td>
                            <td>
                              <small className="text-muted">
                                {material.description || 'No description'}
                              </small>
                            </td>
                            <td>
                              {material.file_url ? (
                                <a 
                                  href={material.file_url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  <FaEye className="me-1" /> View
                                </a>
                              ) : (
                                <span className="text-muted">No file</span>
                              )}
                            </td>
                            <td>
                              <small>{new Date(material.created_at).toLocaleDateString()}</small>
                            </td>
                            <td>
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(material.id)}
                              >
                                <FaTrash />
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
                      <h5>No materials uploaded yet</h5>
                      <p className="mb-0">Upload your first material using the form above</p>
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
            
            {/* Usage Tips */}
            <div className="card-footer bg-light">
              <small className="text-muted">
                <strong>Tips:</strong> Upload files using the form above, or paste external URLs. 
                Students will be able to view/download materials in their portal.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadMaterials;