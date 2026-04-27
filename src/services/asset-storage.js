'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

require('../lib/load-env');

const REPO_ROOT = path.join(__dirname, '../..');
const DEFAULT_UPLOAD_DIR = path.join(REPO_ROOT, 'Server/uploads');
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';

function resolveUploadDir() {
  const configured = process.env.UPLOAD_PATH;
  if (!configured) {
    return DEFAULT_UPLOAD_DIR;
  }

  if (path.isAbsolute(configured)) {
    return configured;
  }

  return path.join(REPO_ROOT, configured);
}

function isBlobStorageEnabled() {
  return Boolean(BLOB_TOKEN);
}

function getLocalUploadsDir() {
  return resolveUploadDir();
}

function normalizeFileExt(originalName, mimeType) {
  const ext = path.extname(originalName || '').toLowerCase();
  if (ext) {
    return ext;
  }

  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}

function safeAssetKind(value) {
  return value === 'avatar' ? 'avatar' : 'resume';
}

async function ensureLocalUploadDir() {
  const uploadDir = resolveUploadDir();
  await fs.promises.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

function buildAssetFileName({ userId, kind, originalName, mimeType }) {
  const ext = normalizeFileExt(originalName, mimeType);
  const suffix = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  return `${safeAssetKind(kind)}_${userId}_${suffix}${ext}`;
}

function loadBlobClient() {
  try {
    return require('@vercel/blob');
  } catch (err) {
    const wrapped = new Error(
      'Vercel Blob is enabled via BLOB_READ_WRITE_TOKEN but @vercel/blob is not installed.'
    );
    wrapped.cause = err;
    throw wrapped;
  }
}

async function uploadUserAsset({ userId, kind, file }) {
  if (!file || !file.buffer) {
    throw new Error('Upload failed: file buffer is missing.');
  }

  const fileName = buildAssetFileName({
    userId,
    kind,
    originalName: file.originalname,
    mimeType: file.mimetype,
  });

  if (isBlobStorageEnabled()) {
    const { put } = loadBlobClient();
    const blobPath = `proconnect/${safeAssetKind(kind)}s/${fileName}`;
    const blob = await put(blobPath, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
      addRandomSuffix: false,
      token: BLOB_TOKEN,
    });
    return blob.url;
  }

  const uploadDir = await ensureLocalUploadDir();
  const targetPath = path.join(uploadDir, fileName);
  await fs.promises.writeFile(targetPath, file.buffer);
  return `/uploads/${fileName}`;
}

function isLocalUploadUrl(fileUrl) {
  return typeof fileUrl === 'string' && fileUrl.startsWith('/uploads/');
}

function isHttpUrl(fileUrl) {
  return typeof fileUrl === 'string' && /^https?:\/\//i.test(fileUrl);
}

async function deleteUserAsset(fileUrl) {
  if (!fileUrl) {
    return;
  }

  if (isLocalUploadUrl(fileUrl)) {
    const uploadDir = resolveUploadDir();
    const filePath = path.join(uploadDir, path.basename(fileUrl));
    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
    return;
  }

  if (isBlobStorageEnabled() && isHttpUrl(fileUrl)) {
    try {
      const { del } = loadBlobClient();
      await del(fileUrl, { token: BLOB_TOKEN });
    } catch (err) {
      console.warn('[assets] Failed to delete remote asset:', err.message || err);
    }
  }
}

module.exports = {
  isBlobStorageEnabled,
  getLocalUploadsDir,
  uploadUserAsset,
  deleteUserAsset,
};
