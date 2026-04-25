const multer = require('multer');

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
  storage: multer.memoryStorage(),
  fileFilter: createFileFilter(
    ['application/pdf'],
    'Only PDF files are allowed for resume uploads.'
  ),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
  },
});

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
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
