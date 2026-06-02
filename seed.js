// Seed file for json-server to ensure numeric IDs
const fs = require('fs');
const path = require('path');

// Generate numeric IDs for all entities
function ensureNumericIds(db) {
  // Students
  if (db.students) {
    db.students = db.students.map((student, index) => ({
      ...student,
      id: student.id ? Number(student.id) : index + 1
    }));
  }

  // Teachers
  if (db.teachers) {
    db.teachers = db.teachers.map((teacher, index) => ({
      ...teacher,
      id: teacher.id ? Number(teacher.id) : index + 1
    }));
  }

  // Classes
  if (db.classes) {
    db.classes = db.classes.map((cls, index) => ({
      ...cls,
      id: cls.id ? Number(cls.id) : index + 1,
      teacherId: cls.teacherId ? Number(cls.teacherId) : cls.teacherId
    }));
  }

  // Sections
  if (db.sections) {
    db.sections = db.sections.map((section, index) => ({
      ...section,
      id: section.id ? Number(section.id) : index + 1,
      classId: section.classId ? Number(section.classId) : section.classId,
      studentIds: (section.studentIds || []).map(sid => Number(sid))
    }));
  }

  // Lectures
  if (db.lectures) {
    db.lectures = db.lectures.map((lecture, index) => ({
      ...lecture,
      id: lecture.id ? Number(lecture.id) : index + 1,
      sectionId: lecture.sectionId ? Number(lecture.sectionId) : lecture.sectionId
    }));
  }

  return db;
}

// Export the seed function
module.exports = () => {
  const data = JSON.parse(fs.readFileSync('db.json', 'utf-8'));
  const cleanedData = ensureNumericIds(data);
  fs.writeFileSync('db.json', JSON.stringify(cleanedData, null, 2));
  return cleanedData;
};
