const fs = require('fs');
const path = require('path');
const convert = require('heic-convert');

async function processUploadedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.heic' && ext !== '.heif') return filePath;

  const inputBuffer = fs.readFileSync(filePath);
  const outputBuffer = await convert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.92,
  });
  const newPath = filePath.replace(/\.(heic|heif)$/i, '.jpg');
  fs.writeFileSync(newPath, Buffer.from(outputBuffer));
  fs.unlinkSync(filePath);
  return newPath;
}

async function processUploadedFiles(files) {
  if (!files?.length) return [];
  const paths = await Promise.all(files.map(f => processUploadedFile(f.path)));
  return paths.map(p => '/uploads/' + path.basename(p));
}

function normalizeImageUrl(url) {
  return url.replace(/\.(heic|heif)$/i, '.jpg');
}

module.exports = { processUploadedFile, processUploadedFiles, normalizeImageUrl };
