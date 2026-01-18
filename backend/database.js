const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'lms.db'));

// Initialize database with tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT CHECK(role IN ('learner', 'educator', 'admin')) DEFAULT 'learner',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )`);

      // Courses table
      db.run(`CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'General',
        educator_id INTEGER NOT NULL,
        price DECIMAL(10,2) DEFAULT 0.00,
        duration_hours INTEGER DEFAULT 10,
        is_published BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (educator_id) REFERENCES users(id)
      )`);

      // Enrollments table
      db.run(`CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        learner_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT 0,
        UNIQUE(learner_id, course_id),
        FOREIGN KEY (learner_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )`);

      // Learning materials table
      db.run(`CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        file_url TEXT,
        material_type TEXT CHECK(material_type IN ('video', 'pdf', 'quiz', 'assignment')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )`);

      // Assessments table
      db.run(`CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        total_marks INTEGER DEFAULT 100,
        deadline DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )`);

      // Assessment submissions
      db.run(`CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id INTEGER NOT NULL,
        learner_id INTEGER NOT NULL,
        submission_url TEXT,
        marks INTEGER,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        feedback TEXT,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id),
        FOREIGN KEY (learner_id) REFERENCES users(id)
      )`);

      // Virtual classes table
      db.run(`CREATE TABLE IF NOT EXISTS virtual_classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        meeting_link TEXT,
        schedule DATETIME NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )`);

      // Create sample data
      createSampleData().then(resolve).catch(reject);
    });
  });
}

// Create sample data
async function createSampleData() {
  const salt = bcrypt.genSaltSync(10);
  
  // Sample users
  const sampleUsers = [
    {
      email: 'educator@edufairuzullah.com',
      password: 'Educator@123',
      full_name: 'Dr. Abdullah Fairuzullah',
      role: 'educator'
    },
    {
      email: 'learner@edufairuzullah.com',
      password: 'Learner@123',
      full_name: 'Ahmad Bin Ismail',
      role: 'learner'
    },
    {
      email: 'john@example.com',
      password: 'Learner@123',
      full_name: 'John Doe',
      role: 'learner'
    }
  ];

  for (const user of sampleUsers) {
    const passwordHash = bcrypt.hashSync(user.password, salt);
    
    // Check if user exists
    const existing = await new Promise((resolve) => {
      db.get('SELECT id FROM users WHERE email = ?', [user.email], (err, row) => {
        resolve(row);
      });
    });

    if (!existing) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
          [user.email, passwordHash, user.full_name, user.role],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    }
  }

  console.log('✅ Database initialized with sample data');
}

module.exports = { db, initializeDatabase };