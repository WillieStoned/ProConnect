const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function createStorage(prefix) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${req.user.user_id}_${Date.now()}`;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${prefix}_${uniqueSuffix}${ext}`);
    },
  });
}

function createFileFilter(allowedMimeTypes, errorMessage) {
  return (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(errorMessage), false);
    }
  };
}

const uploadResume = multer({
  storage: createStorage('resume'),
  fileFilter: createFileFilter(
    ['application/pdf'],
    'Only PDF files are allowed for resume uploads.'
  ),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
  },
});

const uploadAvatar = multer({
  storage: createStorage('avatar'),
  fileFilter: createFileFilter(
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    'Only JPG, PNG, and WEBP images are allowed for profile photos.'
  ),
  limits: {
    fileSize: parseInt(process.env.MAX_AVATAR_SIZE, 10) || 2 * 1024 * 1024,
  },
});

// Error handler for multer
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File exceeds the maximum allowed size.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
}

module.exports = {
  uploadResume,
  uploadAvatar,
  handleUploadError,
};
