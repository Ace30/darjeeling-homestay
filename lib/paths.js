const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function resolveDataDir() {
  const configured = process.env.DATA_DIR;
  if (!configured) return null;

  try {
    ensureDir(configured);
    fs.accessSync(configured, fs.constants.W_OK);
    return configured;
  } catch (err) {
    console.warn(`[storage] DATA_DIR "${configured}" unavailable, using local paths: ${err.message}`);
    return null;
  }
}

function initStoragePaths() {
  const dataDir = resolveDataDir();
  if (dataDir) {
    process.env.DATA_DIR = dataDir;
  } else {
    delete process.env.DATA_DIR;
  }

  const dbPath = dataDir
    ? path.join(dataDir, 'db')
    : path.join(__dirname, '..', 'db', 'data');
  const uploadDir = dataDir
    ? path.join(dataDir, 'uploads')
    : path.join(__dirname, '..', 'public', 'uploads');

  ensureDir(dbPath);
  ensureDir(uploadDir);

  return { dataDir, dbPath, uploadDir };
}

module.exports = { ensureDir, resolveDataDir, initStoragePaths };
