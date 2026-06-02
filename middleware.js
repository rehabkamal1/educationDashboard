// Custom middleware for json-server to ensure numeric IDs when appropriate
const fs = require('fs');

module.exports = (req, res, next) => {
  // Intercept POST responses and convert ID-like strings to numbers
  if (req.method === 'POST') {
    const originalSend = res.send;
    res.send = function(data) {
      try {
        let response = typeof data === 'string' ? JSON.parse(data) : data;

        const isAllDigits = (v) => typeof v === 'string' && /^\d+$/.test(v);

        // Convert ID to number only if the ID string contains only digits
        if (response && response.id !== undefined) {
          if (isAllDigits(response.id)) {
            response.id = parseInt(response.id, 10);
          }
        }

        // Convert numeric foreign keys only when they are fully numeric strings
        if (response && response.teacherId !== undefined && isAllDigits(response.teacherId)) {
          response.teacherId = parseInt(response.teacherId, 10);
        }

        if (response && response.classId !== undefined && isAllDigits(response.classId)) {
          response.classId = parseInt(response.classId, 10);
        }

        if (response && response.sectionId !== undefined && isAllDigits(response.sectionId)) {
          response.sectionId = parseInt(response.sectionId, 10);
        }

        if (response && response.studentIds && Array.isArray(response.studentIds)) {
          response.studentIds = response.studentIds.map(id => isAllDigits(id) ? parseInt(id, 10) : id);
        }

        return originalSend.call(this, JSON.stringify(response));
      } catch (e) {
        return originalSend.call(this, data);
      }
    };
  }

  next();
};
