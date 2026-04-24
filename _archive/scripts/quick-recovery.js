// 快速恢復基本資料結構
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'activity_reservation',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'NewStrongPassword123!',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log
  }
);

async function quickRecovery() {
  try {
    console.log('🚀 快速恢復基本資料結構...\n');
    
    // 1. 重新執行所有遷移
    console.log('📋 重新執行資料庫遷移...');
    
    // 先重置遷移狀態
    try {
      await sequelize.query("DELETE FROM SequelizeMeta", { type: Sequelize.QueryTypes.DELETE });
      console.log('✅ 重置遷移狀態');
    } catch (error) {
      console.log('⚠️ 無法重置遷移狀態:', error.message);
    }
    
    // 2. 重新建立所有表格
    console.log('\n🏗️ 重新建立表格...');
    
    const createTables = [
      // Users 表格
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        studentId VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        department VARCHAR(100),
        isBlacklisted BOOLEAN DEFAULT FALSE,
        blacklistUntil DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      // Events 表格
      `CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        startTime TIME NOT NULL,
        endTime TIME NOT NULL,
        location VARCHAR(200),
        maxParticipants INT DEFAULT 0,
        currentParticipants INT DEFAULT 0,
        eventType VARCHAR(50),
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      // Reservations 表格
      `CREATE TABLE IF NOT EXISTS reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eventId INT NOT NULL,
        userId INT,
        studentId VARCHAR(50) NOT NULL,
        studentName VARCHAR(100) NOT NULL,
        studentEmail VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        department VARCHAR(100),
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        checkinStatus ENUM('未報到', '已報到', '已登記違規') DEFAULT '未報到',
        checkinTime DATETIME,
        \`group\` VARCHAR(50),
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_event_student (eventId, studentId),
        UNIQUE KEY unique_event_email (eventId, studentEmail)
      )`,
      
      // Classes 表格
      `CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        semester VARCHAR(20) NOT NULL,
        department VARCHAR(100),
        teacherName VARCHAR(100),
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      // Class Memberships 表格
      `CREATE TABLE IF NOT EXISTS class_memberships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        semester VARCHAR(20) NOT NULL,
        classId INT NOT NULL,
        studentId VARCHAR(50) NOT NULL,
        studentName VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        email VARCHAR(100),
        grade VARCHAR(10),
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE
      )`,
      
      // Teachers 表格
      `CREATE TABLE IF NOT EXISTS teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        isActive BOOLEAN DEFAULT TRUE,
        department VARCHAR(100),
        phone VARCHAR(20),
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      // Class Teachers 表格
      `CREATE TABLE IF NOT EXISTS class_teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        classId INT NOT NULL,
        teacherId INT NOT NULL,
        semester VARCHAR(20) NOT NULL,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (teacherId) REFERENCES teachers(id) ON DELETE CASCADE,
        UNIQUE KEY unique_class_teacher_semester (classId, teacherId, semester)
      )`,
      
      // Settings 表格
      `CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      // Blacklist Records 表格
      `CREATE TABLE IF NOT EXISTS blacklist_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        reason TEXT,
        recordedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      // Survey Responses 表格
      `CREATE TABLE IF NOT EXISTS survey_responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        studentId VARCHAR(50) NOT NULL,
        studentName VARCHAR(100) NOT NULL,
        studentEmail VARCHAR(100) NOT NULL,
        surveyId VARCHAR(100) NOT NULL,
        responses JSON,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      // English Table Survey Responses 表格
      `CREATE TABLE IF NOT EXISTS english_table_survey_responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        studentId VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        q1 INT,
        q2 INT,
        q3 INT,
        q4 INT,
        q5 INT,
        q6 INT,
        q7 INT,
        q8 INT,
        q9 INT,
        q10 INT,
        q11 INT,
        q12 INT,
        q13 INT,
        q14 INT,
        q15 INT,
        q16 INT,
        q17 INT,
        q18 INT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      // Event Violations 表格
      `CREATE TABLE IF NOT EXISTS event_violations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eventId INT NOT NULL,
        userId INT NOT NULL,
        violationType VARCHAR(100) NOT NULL,
        description TEXT,
        recordedBy INT NOT NULL,
        recordedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recordedBy) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];
    
    for (const sql of createTables) {
      try {
        await sequelize.query(sql, { type: Sequelize.QueryTypes.RAW });
        console.log('✅ 表格建立成功');
      } catch (error) {
        console.log('❌ 表格建立失敗:', error.message);
      }
    }
    
    // 3. 建立索引
    console.log('\n🔗 建立索引...');
    
    const createIndexes = [
      'CREATE INDEX idx_users_student_id ON users(studentId)',
      'CREATE INDEX idx_users_email ON users(email)',
      'CREATE INDEX idx_events_date ON events(date)',
      'CREATE INDEX idx_events_type ON events(eventType)',
      'CREATE INDEX idx_reservations_event_id ON reservations(eventId)',
      'CREATE INDEX idx_reservations_student_id ON reservations(studentId)',
      'CREATE INDEX idx_reservations_checkin_status ON reservations(checkinStatus)',
      'CREATE INDEX idx_classes_semester ON classes(semester)',
      'CREATE INDEX idx_class_memberships_class_id ON class_memberships(classId)',
      'CREATE INDEX idx_class_memberships_student_id ON class_memberships(studentId)',
      'CREATE INDEX idx_class_memberships_semester ON class_memberships(semester)',
      'CREATE INDEX idx_teachers_email ON teachers(email)',
      'CREATE INDEX idx_teachers_username ON teachers(username)',
      'CREATE INDEX idx_class_teachers_class_id ON class_teachers(classId)',
      'CREATE INDEX idx_class_teachers_teacher_id ON class_teachers(teacherId)',
      'CREATE INDEX idx_class_teachers_semester ON class_teachers(semester)',
      'CREATE INDEX idx_class_teachers_is_active ON class_teachers(isActive)',
      'CREATE INDEX idx_survey_responses_student_id ON survey_responses(studentId)',
      'CREATE INDEX idx_survey_responses_survey_id ON survey_responses(surveyId)',
      'CREATE INDEX idx_english_table_survey_responses_student_id ON english_table_survey_responses(studentId)',
      'CREATE INDEX idx_event_violations_event_id ON event_violations(eventId)',
      'CREATE INDEX idx_event_violations_user_id ON event_violations(userId)'
    ];
    
    for (const sql of createIndexes) {
      try {
        await sequelize.query(sql, { type: Sequelize.QueryTypes.RAW });
        console.log('✅ 索引建立成功');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log('❌ 索引建立失敗:', error.message);
        }
      }
    }
    
    console.log('\n🎉 快速恢復完成！');
    console.log('💡 現在可以重新執行遷移: npx sequelize-cli db:migrate');
    
  } catch (error) {
    console.error('❌ 快速恢復失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

quickRecovery();
