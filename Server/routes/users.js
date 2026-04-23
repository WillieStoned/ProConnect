const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  uploadResume,
  uploadAvatar,
  searchUsers,
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { uploadResume: uploadResumeMiddleware, uploadAvatar: uploadAvatarMiddleware, handleUploadError } = require('../middleware/upload');

router.get('/', authenticateToken, searchUsers);
router.get('/:userId', getProfile);
router.put('/me', authenticateToken, updateProfile);
router.post('/me/resume', authenticateToken, uploadResumeMiddleware.single('resume'), handleUploadError, uploadResume);
router.post('/me/avatar', authenticateToken, uploadAvatarMiddleware.single('avatar'), handleUploadError, uploadAvatar);

module.exports = router;
