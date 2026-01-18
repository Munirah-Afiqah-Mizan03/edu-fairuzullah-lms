const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, initializeDatabase } = require('./database');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'edu-fairuzullah-lms-secret-2025';

// ========== MIDDLEWARE ==========
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Update last login
    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [decoded.id]);
    
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// ========== AUTHENTICATION ROUTES ==========
app.post('/api/auth/register', async (req, res) => {
  const { email, password, full_name, role = 'learner' } = req.body;

  // Validate
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    // Check if user exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existing) => {
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);

      // Create user
      db.run(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
        [email, passwordHash, full_name, role],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          // Generate token
          const token = jwt.sign(
            {
              id: this.lastID,
              email,
              role,
              full_name
            },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
              id: this.lastID,
              email,
              role,
              full_name
            }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, requestedRole } = req.body; // Add requestedRole

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordValid = bcrypt.compareSync(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate role (if requestedRole is provided)
    if (requestedRole && user.role !== requestedRole) {
      return res.status(403).json({ 
        error: `Access denied. This account is registered as ${user.role}, not ${requestedRole}. Please use the correct login option.` 
      });
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      }
    });
  });
});

// ========== UPLOAD DIRECTORIES SETUP ==========
// Ensure upload directories exist
const uploadDirs = [
  'uploads',
  'uploads/materials',
  'uploads/submissions'
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// ========== FILE UPLOAD ENDPOINTS ==========

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/submissions';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `submission-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

// File filter to accept only certain file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.zip', '.rar', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, Word, text, image, and archive files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload submission file
app.post('/api/upload/submission', authenticate, authorize('learner'), upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Generate accessible URL (in production, this would be your CDN/cloud storage URL)
    const fileUrl = `${req.protocol}://${req.get('host')}/${req.file.path.replace(/\\/g, '/')}`;
    
    res.json({
      message: 'File uploaded successfully',
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: path.extname(req.file.originalname)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Get submission file info
app.get('/api/submissions/:id/file', authenticate, (req, res) => {
  const submissionId = req.params.id;
  
  db.get('SELECT submission_url FROM submissions WHERE id = ?', [submissionId], (err, submission) => {
    if (err || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json({
      fileUrl: submission.submission_url,
      fileName: submission.submission_url.split('/').pop()
    });
  });
});

// ========== BULK SUBMISSIONS DOWNLOAD ==========

// Download all submissions for an assessment as ZIP
app.get('/api/assessments/:id/download-all', authenticate, authorize('educator', 'admin'), (req, res) => {
  const assessmentId = req.params.id;
  
  // Check ownership
  const ownershipQuery = `
    SELECT c.educator_id 
    FROM assessments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.id = ?
  `;
  
  db.get(ownershipQuery, [assessmentId], (err, result) => {
    if (!result) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    if (req.user.role !== 'admin' && result.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to download these submissions' });
    }
    
    // Get all submissions for this assessment
    const submissionsQuery = `
      SELECT s.*, u.full_name as student_name 
      FROM submissions s
      JOIN users u ON s.learner_id = u.id
      WHERE s.assessment_id = ?
    `;
    
    db.all(submissionsQuery, [assessmentId], (err, submissions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (submissions.length === 0) {
        return res.status(404).json({ error: 'No submissions found' });
      }
      
      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      // Set response headers
      res.attachment(`submissions-assessment-${assessmentId}.zip`);
      
      // Pipe archive to response
      archive.pipe(res);
      
      // Add each submission file to archive
      submissions.forEach(submission => {
        if (submission.submission_url && submission.submission_url.includes('uploads/')) {
          const filePath = submission.submission_url.replace(`${req.protocol}://${req.get('host')}/`, '');
          const safeName = submission.student_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const fileName = `${safeName}_${submission.id}${path.extname(filePath)}`;
          
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: fileName });
          }
        }
      });
      
      // Finalize the archive
      archive.finalize();
    });
  });
});

// ========== MATERIAL FILE UPLOAD ENDPOINTS ==========
// Configure storage for material files
const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/materials';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.]/g, '');
    cb(null, `material-${req.user.id}-${uniqueSuffix}-${safeName}`);
  }
});

const materialFileFilter = (req, file, cb) => {
  const allowedTypes = [
    '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
    '.txt', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.gif',
    '.mp4', '.avi', '.mov', '.wmv', '.mp3', '.wav'
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only document, presentation, spreadsheet, image, video, audio, and archive files are allowed'), false);
  }
};

const uploadMaterial = multer({ 
  storage: materialStorage,
  fileFilter: materialFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for materials
  }
});

// Upload material file
app.post('/api/upload/material', authenticate, authorize('educator', 'admin'), uploadMaterial.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileUrl = `${req.protocol}://${req.get('host')}/${req.file.path.replace(/\\/g, '/')}`;
    
    res.json({
      message: 'Material file uploaded successfully',
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: path.extname(req.file.originalname).substring(1)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get material file info
app.get('/api/materials/:id/file', authenticate, (req, res) => {
  const materialId = req.params.id;
  
  const query = `
    SELECT m.file_url, m.title, c.title as course_title
    FROM materials m
    JOIN courses c ON m.course_id = c.id
    WHERE m.id = ?
  `;
  
  db.get(query, [materialId], (err, material) => {
    if (err || !material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json({
      fileUrl: material.file_url,
      fileName: material.file_url.split('/').pop(),
      materialTitle: material.title,
      courseTitle: material.course_title
    });
  });
});

// Update the POST /api/courses/:id/materials endpoint to handle file URLs
// Find this existing endpoint and update it:
app.post('/api/courses/:id/materials', authenticate, authorize('educator', 'admin'), (req, res) => {
  const { title, description, material_type, file_url } = req.body; // Added file_url
  
  // Check if educator owns the course
  db.get('SELECT educator_id FROM courses WHERE id = ?', [req.params.id], (err, course) => {
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    if (req.user.role !== 'admin' && course.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to add materials to this course' });
    }
    
    db.run(
      `INSERT INTO materials (course_id, title, description, material_type, file_url) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, title, description || '', material_type || 'pdf', file_url || ''],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.status(201).json({
          message: 'Material added successfully',
          material_id: this.lastID
        });
      }
    );
  });
});

// ========== LEARNER SPECIFIC ENDPOINTS ==========
// Get learner's submissions
app.get('/api/learner/submissions', authenticate, authorize('learner'), (req, res) => {
  const query = `
    SELECT s.*, a.title as assessment_title, c.title as course_title
    FROM submissions s
    JOIN assessments a ON s.assessment_id = a.id
    JOIN courses c ON a.course_id = c.id
    WHERE s.learner_id = ?
    ORDER BY s.submitted_at DESC
  `;
  
  db.all(query, [req.user.id], (err, submissions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(submissions);
  });
});

// Get learner's recent submissions
app.get('/api/learner/recent-submissions', authenticate, authorize('learner'), (req, res) => {
  const query = `
    SELECT s.*, a.title as assessment_title, c.title as course_title
    FROM submissions s
    JOIN assessments a ON s.assessment_id = a.id
    JOIN courses c ON a.course_id = c.id
    WHERE s.learner_id = ?
    ORDER BY s.submitted_at DESC
    LIMIT 5
  `;
  
  db.all(query, [req.user.id], (err, submissions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(submissions);
  });
});

// Edit learner's submission
app.put('/api/submissions/:id/edit', authenticate, authorize('learner'), (req, res) => {
  const submissionId = req.params.id;
  const { submission_url } = req.body;
  
  // Check ownership
  db.get('SELECT learner_id FROM submissions WHERE id = ?', [submissionId], (err, submission) => {
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    if (submission.learner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this submission' });
    }
    
    db.run(
      'UPDATE submissions SET submission_url = ? WHERE id = ?',
      [submission_url, submissionId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({
          message: 'Submission updated successfully',
          updated: this.changes > 0
        });
      }
    );
  });
});

// Delete learner's submission
app.delete('/api/submissions/:id', authenticate, authorize('learner'), (req, res) => {
  const submissionId = req.params.id;
  
  // Check ownership
  db.get('SELECT learner_id FROM submissions WHERE id = ?', [submissionId], (err, submission) => {
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    if (submission.learner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this submission' });
    }
    
    db.run('DELETE FROM submissions WHERE id = ?', [submissionId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        message: 'Submission deleted successfully',
        deleted: this.changes > 0
      });
    });
  });
});

// ========== COURSE ROUTES ==========
// Get all published courses (public)
app.get('/api/courses', (req, res) => {
  const { category, search, educator_id } = req.query;
  
  let query = `
    SELECT c.*, u.full_name as educator_name, 
    (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_count
    FROM courses c
    JOIN users u ON c.educator_id = u.id
    WHERE c.is_published = 1
  `;
  
  const params = [];
  
  if (category) {
    query += ' AND c.category = ?';
    params.push(category);
  }
  
  if (search) {
    query += ' AND (c.title LIKE ? OR c.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (educator_id) {
    query += ' AND c.educator_id = ?';
    params.push(educator_id);
  }
  
  query += ' ORDER BY c.created_at DESC';
  
  db.all(query, params, (err, courses) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(courses);
  });
});

// Get single course
app.get('/api/courses/:id', (req, res) => {
  const query = `
    SELECT c.*, u.full_name as educator_name,
    (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_count,
    (SELECT COUNT(*) FROM materials m WHERE m.course_id = c.id) as material_count,
    (SELECT COUNT(*) FROM assessments a WHERE a.course_id = c.id) as assessment_count
    FROM courses c
    JOIN users u ON c.educator_id = u.id
    WHERE c.id = ?
  `;
  
  db.get(query, [req.params.id], (err, course) => {
    if (err || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  });
});

// Add this to server.js after the existing /api/courses GET endpoint
// Get all courses for educator (including unpublished)
app.get('/api/educator/courses', authenticate, authorize('educator', 'admin'), (req, res) => {
  const query = `
    SELECT c.*, u.full_name as educator_name, 
    (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_count
    FROM courses c
    JOIN users u ON c.educator_id = u.id
    WHERE c.educator_id = ?
    ORDER BY c.created_at DESC
  `;
  
  db.all(query, [req.user.id], (err, courses) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(courses);
  });
});

// Create course (Educator only)
app.post('/api/courses', authenticate, authorize('educator', 'admin'), (req, res) => {
  const { title, description, category, price, duration_hours } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  db.run(
    `INSERT INTO courses (title, description, category, educator_id, price, duration_hours) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, description || '', category || 'General', req.user.id, price || 0.00, duration_hours || 10],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.status(201).json({
        message: 'Course created successfully',
        course: {
          id: this.lastID,
          title,
          description,
          category,
          educator_id: req.user.id,
          is_published: true  // Make sure this is included
        }
      });
    }
  );
});

// Update course (Educator who owns it or Admin)
app.put('/api/courses/:id', authenticate, authorize('educator', 'admin'), (req, res) => {
  const courseId = req.params.id;
  const updates = req.body;
  
  // Check ownership
  db.get('SELECT educator_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    if (req.user.role !== 'admin' && course.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this course' });
    }
    
    // Build update query
    const setClauses = [];
    const values = [];
    
    if (updates.title !== undefined) {
      setClauses.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      values.push(updates.description);
    }
    if (updates.category !== undefined) {
      setClauses.push('category = ?');
      values.push(updates.category);
    }
    if (updates.price !== undefined) {
      setClauses.push('price = ?');
      values.push(updates.price);
    }
    if (updates.is_published !== undefined) {
      setClauses.push('is_published = ?');
      values.push(updates.is_published);
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    values.push(courseId);
    const query = `UPDATE courses SET ${setClauses.join(', ')} WHERE id = ?`;
    
    db.run(query, values, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        message: 'Course updated successfully',
        updated: this.changes > 0
      });
    });
  });
});

// Delete course (Educator who owns it or Admin)
app.delete('/api/courses/:id', authenticate, authorize('educator', 'admin'), (req, res) => {
  const courseId = req.params.id;
  
  db.get('SELECT educator_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    if (req.user.role !== 'admin' && course.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this course' });
    }
    
    db.run('DELETE FROM courses WHERE id = ?', [courseId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        message: 'Course deleted successfully',
        deleted: this.changes > 0
      });
    });
  });
});

// ========== ENROLLMENT ROUTES ==========
// Enroll in course (Learner only)
app.post('/api/courses/:id/enroll', authenticate, authorize('learner'), (req, res) => {
  const courseId = req.params.id;
  
  // Check if course exists and is published
  db.get('SELECT id FROM courses WHERE id = ? AND is_published = 1', [courseId], (err, course) => {
    if (!course) {
      return res.status(404).json({ error: 'Course not available for enrollment' });
    }
    
    // Check if already enrolled
    db.get(
      'SELECT id FROM enrollments WHERE learner_id = ? AND course_id = ?',
      [req.user.id, courseId],
      (err, enrollment) => {
        if (enrollment) {
          return res.status(400).json({ error: 'Already enrolled in this course' });
        }
        
        // Create enrollment
        db.run(
          'INSERT INTO enrollments (learner_id, course_id) VALUES (?, ?)',
          [req.user.id, courseId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            res.status(201).json({
              message: 'Successfully enrolled in course',
              enrollment_id: this.lastID
            });
          }
        );
      }
    );
  });
});

// Unenroll from course
app.delete('/api/courses/:id/unenroll', authenticate, authorize('learner'), (req, res) => {
  const courseId = req.params.id;
  
  db.run(
    'DELETE FROM enrollments WHERE learner_id = ? AND course_id = ?',
    [req.user.id, courseId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        message: 'Successfully unenrolled from course',
        unenrolled: this.changes > 0
      });
    }
  );
});

// Get learner's enrolled courses
app.get('/api/learner/courses', authenticate, authorize('learner'), (req, res) => {
  const query = `
    SELECT c.*, u.full_name as educator_name, e.enrolled_at, e.progress, e.completed
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN users u ON c.educator_id = u.id
    WHERE e.learner_id = ?
    ORDER BY e.enrolled_at DESC
  `;
  
  db.all(query, [req.user.id], (err, courses) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(courses);
  });
});

// ========== MATERIALS ROUTES ==========
// Get course materials
app.get('/api/courses/:id/materials', authenticate, (req, res) => {
  const query = `
    SELECT * FROM materials 
    WHERE course_id = ? 
    ORDER BY created_at DESC
  `;
  
  db.all(query, [req.params.id], (err, materials) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(materials);
  });
});

// ========== ASSESSMENTS ROUTES ==========
// Get course assessments
app.get('/api/courses/:id/assessments', authenticate, (req, res) => {
  const query = `
    SELECT * FROM assessments 
    WHERE course_id = ? 
    ORDER BY deadline ASC
  `;
  
  db.all(query, [req.params.id], (err, assessments) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(assessments);
  });
});

// Submit assessment (Learner only)
app.post('/api/assessments/:id/submit', authenticate, authorize('learner'), (req, res) => {
  const { submission_url } = req.body;
  
  // Check if learner is enrolled in the course
  const query = `
    SELECT e.id FROM enrollments e
    JOIN assessments a ON e.course_id = a.course_id
    WHERE a.id = ? AND e.learner_id = ?
  `;
  
  db.get(query, [req.params.id, req.user.id], (err, enrollment) => {
    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }
    
    db.run(
      `INSERT INTO submissions (assessment_id, learner_id, submission_url) 
       VALUES (?, ?, ?)`,
      [req.params.id, req.user.id, submission_url],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.status(201).json({
          message: 'Assessment submitted successfully',
          submission_id: this.lastID
        });
      }
    );
  });
});

// ========== MATERIALS MANAGEMENT ENDPOINTS ==========
// Get single material
app.get('/api/materials/:id', authenticate, (req, res) => {
  const query = `
    SELECT m.*, c.title as course_title, u.full_name as educator_name
    FROM materials m
    JOIN courses c ON m.course_id = c.id
    JOIN users u ON c.educator_id = u.id
    WHERE m.id = ?
  `;
  
  db.get(query, [req.params.id], (err, material) => {
    if (err || !material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json(material);
  });
});

// Update material (Educator only)
app.put('/api/materials/:id', authenticate, authorize('educator', 'admin'), (req, res) => {
  const materialId = req.params.id;
  const { title, description, material_type, file_url } = req.body;
  
  // Check ownership
  const query = `
    SELECT c.educator_id 
    FROM materials m
    JOIN courses c ON m.course_id = c.id
    WHERE m.id = ?
  `;
  
  db.get(query, [materialId], (err, result) => {
    if (!result) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    if (req.user.role !== 'admin' && result.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this material' });
    }
    
    db.run(
      `UPDATE materials 
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           material_type = COALESCE(?, material_type),
           file_url = COALESCE(?, file_url)
       WHERE id = ?`,
      [title, description, material_type, file_url, materialId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({
          message: 'Material updated successfully',
          updated: this.changes > 0
        });
      }
    );
  });
});

// Delete material (Educator only)
app.delete('/api/materials/:id', authenticate, authorize('educator', 'admin'), (req, res) => {
  const materialId = req.params.id;
  
  // Check ownership
  const query = `
    SELECT c.educator_id 
    FROM materials m
    JOIN courses c ON m.course_id = c.id
    WHERE m.id = ?
  `;
  
  db.get(query, [materialId], (err, result) => {
    if (!result) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    if (req.user.role !== 'admin' && result.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this material' });
    }
    
    db.run('DELETE FROM materials WHERE id = ?', [materialId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        message: 'Material deleted successfully',
        deleted: this.changes > 0
      });
    });
  });
});

// ========== ASSESSMENTS MANAGEMENT ENDPOINTS ==========
// Create assessment (Educator only)
app.post('/api/courses/:id/assessments', authenticate, authorize('educator', 'admin'), (req, res) => {
  const courseId = req.params.id;
  const { title, description, total_marks, deadline } = req.body;
  
  // Check ownership
  db.get('SELECT educator_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    if (req.user.role !== 'admin' && course.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to create assessments for this course' });
    }
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    db.run(
      `INSERT INTO assessments (course_id, title, description, total_marks, deadline) 
       VALUES (?, ?, ?, ?, ?)`,
      [courseId, title, description, total_marks || 100, deadline || null],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.status(201).json({
          message: 'Assessment created successfully',
          assessment_id: this.lastID,
          assessment: {
            id: this.lastID,
            course_id: courseId,
            title,
            description,
            total_marks: total_marks || 100,
            deadline: deadline || null
          }
        });
      }
    );
  });
});

// Get single assessment with submissions count
app.get('/api/assessments/:id', authenticate, (req, res) => {
  const query = `
    SELECT a.*, c.title as course_title, 
    (SELECT COUNT(*) FROM submissions WHERE assessment_id = a.id) as submission_count
    FROM assessments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.id = ?
  `;
  
  db.get(query, [req.params.id], (err, assessment) => {
    if (err || !assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json(assessment);
  });
});

// Update assessment (Educator only)
app.put('/api/assessments/:id', authenticate, authorize('educator', 'admin'), (req, res) => {
  const assessmentId = req.params.id;
  const { title, description, total_marks, deadline } = req.body;
  
  // Check ownership
  const query = `
    SELECT c.educator_id 
    FROM assessments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.id = ?
  `;
  
  db.get(query, [assessmentId], (err, result) => {
    if (!result) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    if (req.user.role !== 'admin' && result.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this assessment' });
    }
    
    db.run(
      `UPDATE assessments 
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           total_marks = COALESCE(?, total_marks),
           deadline = COALESCE(?, deadline)
       WHERE id = ?`,
      [title, description, total_marks, deadline, assessmentId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({
          message: 'Assessment updated successfully',
          updated: this.changes > 0
        });
      }
    );
  });
});

// Delete assessment (Educator only)
app.delete('/api/assessments/:id', authenticate, authorize('educator', 'admin'), (req, res) => {
  const assessmentId = req.params.id;
  
  // Check ownership
  const query = `
    SELECT c.educator_id 
    FROM assessments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.id = ?
  `;
  
  db.get(query, [assessmentId], (err, result) => {
    if (!result) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    if (req.user.role !== 'admin' && result.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this assessment' });
    }
    
    db.run('DELETE FROM assessments WHERE id = ?', [assessmentId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        message: 'Assessment deleted successfully',
        deleted: this.changes > 0
      });
    });
  });
});

// Get assessment submissions
app.get('/api/assessments/:id/submissions', authenticate, authorize('educator', 'admin'), (req, res) => {
  const assessmentId = req.params.id;
  
  // Check ownership
  const query = `
    SELECT c.educator_id 
    FROM assessments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.id = ?
  `;
  
  db.get(query, [assessmentId], (err, result) => {
    if (!result) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    if (req.user.role !== 'admin' && result.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view these submissions' });
    }
    
    const submissionsQuery = `
      SELECT s.*, u.full_name as student_name, u.email as student_email
      FROM submissions s
      JOIN users u ON s.learner_id = u.id
      WHERE s.assessment_id = ?
      ORDER BY s.submitted_at DESC
    `;
    
    db.all(submissionsQuery, [assessmentId], (err, submissions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(submissions);
    });
  });
});

// Grade submission (Educator only)
app.put('/api/submissions/:id', authenticate, authorize('educator', 'admin'), (req, res) => {
  const submissionId = req.params.id;
  const { marks, feedback } = req.body;
  
  // Check ownership through assessment -> course -> educator
  const query = `
    SELECT c.educator_id 
    FROM submissions s
    JOIN assessments a ON s.assessment_id = a.id
    JOIN courses c ON a.course_id = c.id
    WHERE s.id = ?
  `;
  
  db.get(query, [submissionId], (err, result) => {
    if (!result) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    if (req.user.role !== 'admin' && result.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to grade this submission' });
    }
    
    db.run(
      `UPDATE submissions 
       SET marks = ?, feedback = ?
       WHERE id = ?`,
      [marks, feedback || '', submissionId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({
          message: 'Submission graded successfully',
          updated: this.changes > 0
        });
      }
    );
  });
});

// ========== STUDENT PROGRESS ENDPOINTS ==========
// Get student progress for educator's courses
app.get('/api/educator/student-progress', authenticate, authorize('educator', 'admin'), (req, res) => {
  const { course_id } = req.query;
  
  let query = `
    SELECT 
      u.id as student_id,
      u.full_name as student_name,
      u.email as student_email,
      c.id as course_id,
      c.title as course_title,
      e.enrolled_at,
      e.progress,
      e.completed,
      (
        SELECT COUNT(*) 
        FROM submissions s
        JOIN assessments a ON s.assessment_id = a.id
        WHERE a.course_id = c.id AND s.learner_id = u.id
      ) as submissions_count,
      (
        SELECT AVG(s.marks)
        FROM submissions s
        JOIN assessments a ON s.assessment_id = a.id
        WHERE a.course_id = c.id AND s.learner_id = u.id AND s.marks IS NOT NULL
      ) as avg_marks
    FROM enrollments e
    JOIN users u ON e.learner_id = u.id
    JOIN courses c ON e.course_id = c.id
    WHERE c.educator_id = ?
  `;
  
  const params = [req.user.id];
  
  if (course_id) {
    query += ' AND c.id = ?';
    params.push(course_id);
  }
  
  query += ' ORDER BY c.title, u.full_name';
  
  db.all(query, params, (err, progress) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Calculate statistics
    const stats = {
      total_students: 0,
      avg_progress: 0,
      completed_students: 0,
      avg_grade: 0,
      by_course: {}
    };
    
    if (progress.length > 0) {
      stats.total_students = new Set(progress.map(p => p.student_id)).size;
      stats.avg_progress = progress.reduce((sum, p) => sum + p.progress, 0) / progress.length;
      stats.completed_students = progress.filter(p => p.completed).length;
      stats.avg_grade = progress.filter(p => p.avg_marks !== null)
        .reduce((sum, p) => sum + (p.avg_marks || 0), 0) / 
        progress.filter(p => p.avg_marks !== null).length || 0;
      
      // Group by course
      progress.forEach(p => {
        if (!stats.by_course[p.course_id]) {
          stats.by_course[p.course_id] = {
            course_title: p.course_title,
            students: [],
            avg_progress: 0,
            completed_students: 0
          };
        }
        stats.by_course[p.course_id].students.push(p);
      });
      
      // Calculate course-specific stats
      Object.keys(stats.by_course).forEach(courseId => {
        const course = stats.by_course[courseId];
        course.avg_progress = course.students.reduce((sum, s) => sum + s.progress, 0) / course.students.length;
        course.completed_students = course.students.filter(s => s.completed).length;
      });
    }
    
    res.json({
      progress,
      stats
    });
  });
});

// Get course enrollment statistics
app.get('/api/courses/:id/enrollment-stats', authenticate, authorize('educator', 'admin'), (req, res) => {
  const courseId = req.params.id;
  
  // Check ownership
  db.get('SELECT educator_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    if (req.user.role !== 'admin' && course.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view these statistics' });
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_students,
        AVG(progress) as avg_progress,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_students,
        MIN(enrolled_at) as first_enrollment,
        MAX(enrolled_at) as last_enrollment
      FROM enrollments
      WHERE course_id = ?
    `;
    
    db.get(statsQuery, [courseId], (err, stats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Get progress distribution
      const distributionQuery = `
        SELECT 
          CASE 
            WHEN progress = 0 THEN 'Not Started'
            WHEN progress < 25 THEN '0-25%'
            WHEN progress < 50 THEN '25-50%'
            WHEN progress < 75 THEN '50-75%'
            WHEN progress < 100 THEN '75-99%'
            ELSE 'Completed'
          END as progress_range,
          COUNT(*) as student_count
        FROM enrollments
        WHERE course_id = ?
        GROUP BY 
          CASE 
            WHEN progress = 0 THEN 'Not Started'
            WHEN progress < 25 THEN '0-25%'
            WHEN progress < 50 THEN '25-50%'
            WHEN progress < 75 THEN '50-75%'
            WHEN progress < 100 THEN '75-99%'
            ELSE 'Completed'
          END
        ORDER BY 
          CASE 
            WHEN progress_range = 'Not Started' THEN 1
            WHEN progress_range = '0-25%' THEN 2
            WHEN progress_range = '25-50%' THEN 3
            WHEN progress_range = '50-75%' THEN 4
            WHEN progress_range = '75-99%' THEN 5
            ELSE 6
          END
      `;
      
      db.all(distributionQuery, [courseId], (err, distribution) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({
          ...stats,
          progress_distribution: distribution
        });
      });
    });
  });
});

// Get submission statistics for educator
app.get('/api/educator/submission-stats', authenticate, authorize('educator', 'admin'), (req, res) => {
  const query = `
    SELECT 
      a.id as assessment_id,
      a.title as assessment_title,
      c.title as course_title,
      COUNT(s.id) as total_submissions,
      SUM(CASE WHEN s.marks IS NOT NULL THEN 1 ELSE 0 END) as graded_submissions,
      AVG(s.marks) as avg_marks
    FROM assessments a
    JOIN courses c ON a.course_id = c.id
    LEFT JOIN submissions s ON a.id = s.assessment_id
    WHERE c.educator_id = ?
    GROUP BY a.id, a.title, c.title
    ORDER BY c.title, a.title
  `;
  
  db.all(query, [req.user.id], (err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stats);
  });
});

// ========== RECENT ACTIVITIES ENDPOINTS ==========
// Get recent student activities for educator
app.get('/api/educator/recent-activities', authenticate, authorize('educator', 'admin'), (req, res) => {
  const query = `
    SELECT 
      'submission' as activity_type,
      s.submitted_at as timestamp,
      u.full_name as student_name,
      a.title as assessment_title,
      c.title as course_title,
      NULL as question_text
    FROM submissions s
    JOIN assessments a ON s.assessment_id = a.id
    JOIN courses c ON a.course_id = c.id
    JOIN users u ON s.learner_id = u.id
    WHERE c.educator_id = ?
    
    UNION ALL
    
    SELECT 
      'enrollment' as activity_type,
      e.enrolled_at as timestamp,
      u.full_name as student_name,
      NULL as assessment_title,
      c.title as course_title,
      NULL as question_text
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN users u ON e.learner_id = u.id
    WHERE c.educator_id = ?
    
    ORDER BY timestamp DESC
    LIMIT 10
  `;
  
  db.all(query, [req.user.id, req.user.id], (err, activities) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Format activities
    const formatted = activities.map(activity => {
      let message = '';
      if (activity.activity_type === 'submission') {
        message = `${activity.student_name} submitted ${activity.assessment_title}`;
      } else if (activity.activity_type === 'enrollment') {
        message = `${activity.student_name} enrolled in ${activity.course_title}`;
      }
      
      return {
        ...activity,
        message,
        time_ago: getTimeAgo(activity.timestamp)
      };
    });
    
    res.json(formatted);
  });
});

// Get upcoming tasks for educator (ungraded submissions, upcoming deadlines)
app.get('/api/educator/upcoming-tasks', authenticate, authorize('educator', 'admin'), (req, res) => {
  // Ungraded submissions
  const ungradedQuery = `
    SELECT 
      'grade_submission' as task_type,
      s.id as task_id,
      'Grade submission' as task_title,
      a.title as assessment_title,
      c.title as course_title,
      s.submitted_at as due_date,
      'urgent' as priority
    FROM submissions s
    JOIN assessments a ON s.assessment_id = a.id
    JOIN courses c ON a.course_id = c.id
    WHERE c.educator_id = ? 
      AND s.marks IS NULL
    ORDER BY s.submitted_at ASC
    LIMIT 5
  `;
  
  // Upcoming assessment deadlines
  const deadlineQuery = `
    SELECT 
      'assessment_deadline' as task_type,
      a.id as task_id,
      'Assessment deadline approaching' as task_title,
      a.title as assessment_title,
      c.title as course_title,
      a.deadline as due_date,
      CASE 
        WHEN julianday(a.deadline) - julianday('now') <= 2 THEN 'high'
        WHEN julianday(a.deadline) - julianday('now') <= 7 THEN 'medium'
        ELSE 'low'
      END as priority
    FROM assessments a
    JOIN courses c ON a.course_id = c.id
    WHERE c.educator_id = ? 
      AND a.deadline IS NOT NULL
      AND a.deadline > datetime('now')
    ORDER BY a.deadline ASC
    LIMIT 5
  `;
  
  db.all(ungradedQuery, [req.user.id], (err, ungraded) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    db.all(deadlineQuery, [req.user.id], (err, deadlines) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const tasks = [...ungraded, ...deadlines]
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .map(task => ({
          ...task,
          due_relative: getTimeAgo(task.due_date, true)
        }));
      
      res.json(tasks);
    });
  });
});

// Helper function for time ago
function getTimeAgo(timestamp, future = false) {
  if (!timestamp) return 'Recently';
  
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = future ? date - now : now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (future) {
    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return 'Soon';
  } else {
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  }
}

// Update student progress (Educator can manually update if needed)
app.put('/api/enrollments/:id/progress', authenticate, authorize('educator', 'admin'), (req, res) => {
  const enrollmentId = req.params.id;
  const { progress, completed } = req.body;
  
  // Check ownership through enrollment -> course -> educator
  const query = `
    SELECT c.educator_id 
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.id = ?
  `;
  
  db.get(query, [enrollmentId], (err, result) => {
    if (!result) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    if (req.user.role !== 'admin' && result.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this enrollment' });
    }
    
    const updates = [];
    const values = [];
    
    if (progress !== undefined) {
      updates.push('progress = ?');
      values.push(Math.min(100, Math.max(0, progress)));
    }
    
    if (completed !== undefined) {
      updates.push('completed = ?');
      values.push(completed ? 1 : 0);
      
      // If marking as completed, ensure progress is 100
      if (completed && progress === undefined) {
        if (!updates.includes('progress = ?')) {
          updates.push('progress = ?');
          values.push(100);
        }
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    values.push(enrollmentId);
    
    db.run(
      `UPDATE enrollments SET ${updates.join(', ')} WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({
          message: 'Progress updated successfully',
          updated: this.changes > 0
        });
      }
    );
  });
});

// ========== VIRTUAL CLASS ROUTES ==========
// Get course virtual classes
app.get('/api/courses/:id/classes', authenticate, (req, res) => {
  const query = `
    SELECT * FROM virtual_classes 
    WHERE course_id = ? AND is_active = 1
    ORDER BY schedule ASC
  `;
  
  db.all(query, [req.params.id], (err, classes) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(classes);
  });
});

// Schedule virtual class (Educator only)
app.post('/api/courses/:id/classes', authenticate, authorize('educator', 'admin'), (req, res) => {
  const { title, description, meeting_link, schedule, duration_minutes } = req.body;
  
  // Check ownership
  db.get('SELECT educator_id FROM courses WHERE id = ?', [req.params.id], (err, course) => {
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    if (req.user.role !== 'admin' && course.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to schedule classes for this course' });
    }
    
    db.run(
      `INSERT INTO virtual_classes (course_id, title, description, meeting_link, schedule, duration_minutes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, title, description || '', meeting_link || 'https://meet.google.com/abc-xyz', 
       schedule, duration_minutes || 60],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.status(201).json({
          message: 'Virtual class scheduled successfully',
          class_id: this.lastID
        });
      }
    );
  });
});

// ========== VIRTUAL CLASS MANAGEMENT ENDPOINTS ==========
// Delete virtual class (Educator only)
app.delete('/api/virtual-classes/:id', authenticate, authorize('educator', 'admin'), (req, res) => {
  const classId = req.params.id;
  
  // Check ownership
  const query = `
    SELECT c.educator_id 
    FROM virtual_classes vc
    JOIN courses c ON vc.course_id = c.id
    WHERE vc.id = ?
  `;
  
  db.get(query, [classId], (err, result) => {
    if (!result) {
      return res.status(404).json({ error: 'Virtual class not found' });
    }
    
    if (req.user.role !== 'admin' && result.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this virtual class' });
    }
    
    db.run('DELETE FROM virtual_classes WHERE id = ?', [classId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        message: 'Virtual class deleted successfully',
        deleted: this.changes > 0
      });
    });
  });
});

// Update virtual class (Educator only)
app.put('/api/virtual-classes/:id', authenticate, authorize('educator', 'admin'), (req, res) => {
  const classId = req.params.id;
  const { title, description, meeting_link, schedule, duration_minutes, is_active } = req.body;
  
  // Check ownership
  const query = `
    SELECT c.educator_id 
    FROM virtual_classes vc
    JOIN courses c ON vc.course_id = c.id
    WHERE vc.id = ?
  `;
  
  db.get(query, [classId], (err, result) => {
    if (!result) {
      return res.status(404).json({ error: 'Virtual class not found' });
    }
    
    if (req.user.role !== 'admin' && result.educator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this virtual class' });
    }
    
    // Build update query
    const setClauses = [];
    const values = [];
    
    if (title !== undefined) {
      setClauses.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      setClauses.push('description = ?');
      values.push(description);
    }
    if (meeting_link !== undefined) {
      setClauses.push('meeting_link = ?');
      values.push(meeting_link);
    }
    if (schedule !== undefined) {
      setClauses.push('schedule = ?');
      values.push(schedule);
    }
    if (duration_minutes !== undefined) {
      setClauses.push('duration_minutes = ?');
      values.push(duration_minutes);
    }
    if (is_active !== undefined) {
      setClauses.push('is_active = ?');
      values.push(is_active);
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    values.push(classId);
    const updateQuery = `UPDATE virtual_classes SET ${setClauses.join(', ')} WHERE id = ?`;
    
    db.run(updateQuery, values, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        message: 'Virtual class updated successfully',
        updated: this.changes > 0
      });
    });
  });
});



// ========== USER PROFILE ==========
app.get('/api/profile', authenticate, (req, res) => {
  const query = `
    SELECT id, email, full_name, role, created_at, last_login
    FROM users WHERE id = ?
  `;
  
  db.get(query, [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
});

// ========== STATISTICS ==========
app.get('/api/stats', authenticate, (req, res) => {
  if (req.user.role === 'learner') {
    // Learner stats
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM enrollments WHERE learner_id = ?) as enrolled_courses,
        (SELECT COUNT(*) FROM enrollments WHERE learner_id = ? AND completed = 1) as completed_courses,
        (SELECT AVG(progress) FROM enrollments WHERE learner_id = ?) as avg_progress
    `;
    
    db.get(query, [req.user.id, req.user.id, req.user.id], (err, stats) => {
      res.json(stats);
    });
  } else if (req.user.role === 'educator') {
    // Educator stats
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM courses WHERE educator_id = ?) as total_courses,
        (SELECT COUNT(*) FROM courses WHERE educator_id = ? AND is_published = 1) as published_courses,
        (SELECT COUNT(DISTINCT e.learner_id) FROM enrollments e 
         JOIN courses c ON e.course_id = c.id 
         WHERE c.educator_id = ?) as total_students
    `;
    
    db.get(query, [req.user.id, req.user.id, req.user.id], (err, stats) => {
      res.json(stats);
    });
  } else {
    res.json({});
  }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'Edu Fairuzullah LMS API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ========== WEBSOCKET FOR VIRTUAL CLASSES ==========
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-class', (classId) => {
    socket.join(`class-${classId}`);
    console.log(`User ${socket.id} joined class ${classId}`);
  });
  
  socket.on('class-message', (data) => {
    io.to(`class-${data.classId}`).emit('new-message', {
      user: data.user,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ========== DEBUG ENDPOINT ==========
app.get('/api/debug/uploads', (req, res) => {
  try {
    const checks = {
      uploadsDir: {
        exists: fs.existsSync('uploads'),
        path: path.resolve('uploads'),
        files: []
      },
      materialsDir: {
        exists: fs.existsSync('uploads/materials'),
        path: path.resolve('uploads/materials'),
        files: []
      },
      submissionsDir: {
        exists: fs.existsSync('uploads/submissions'),
        path: path.resolve('uploads/submissions'),
        files: []
      }
    };
    
    // List files if directories exist
    if (checks.uploadsDir.exists) {
      checks.uploadsDir.files = fs.readdirSync('uploads');
    }
    if (checks.materialsDir.exists) {
      checks.materialsDir.files = fs.readdirSync('uploads/materials');
    }
    if (checks.submissionsDir.exists) {
      checks.submissionsDir.files = fs.readdirSync('uploads/submissions');
    }
    
    // Check write permissions
    try {
      const testFile = 'uploads/test_write.tmp';
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      checks.writePermission = true;
    } catch (e) {
      checks.writePermission = false;
      checks.writeError = e.message;
    }
    
    res.json({
      status: 'OK',
      checks: checks,
      serverTime: new Date().toISOString(),
      uploadEndpoints: {
        material: '/api/upload/material (POST)',
        submission: '/api/upload/submission (POST)'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 7071;

// Initialize database and start server
initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`✅ Edu Fairuzullah LMS Server running on port ${PORT}`);
    console.log(`📚 API Documentation:`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Courses: http://localhost:${PORT}/api/courses`);
    console.log(`   Login: POST http://localhost:${PORT}/api/auth/login`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});

module.exports = app;