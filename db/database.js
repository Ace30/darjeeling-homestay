const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { initStoragePaths, ensureDir } = require('../lib/paths');

const { dataDir: DATA_DIR, dbPath: DB_PATH } = initStoragePaths();
const SEED_PATH = path.join(__dirname, 'data');

function seedDataIfNeeded() {
  if (!DATA_DIR) return;
  if (!fs.existsSync(SEED_PATH)) return;
  for (const file of fs.readdirSync(SEED_PATH)) {
    if (!file.endsWith('.json')) continue;
    const dest = path.join(DB_PATH, file);
    const src = path.join(SEED_PATH, file);
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }
}
seedDataIfNeeded();

const TABLES = {
  properties: 'properties.json',
  bookings: 'bookings.json',
  reviews: 'reviews.json',
  guests: 'guests.json',
  admin: 'admin.json',
};

function read(table) {
  const file = path.join(DB_PATH, TABLES[table]);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function write(table, data) {
  const file = path.join(DB_PATH, TABLES[table]);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- Properties ---
const properties = {
  all: () => read('properties'),
  get: (id) => read('properties').find(p => p.id === id),
  create: (data) => {
    const props = read('properties');
    const prop = { id: uuidv4(), createdAt: new Date().toISOString(), ...data };
    props.push(prop);
    write('properties', props);
    return prop;
  },
  update: (id, data) => {
    const props = read('properties');
    const idx = props.findIndex(p => p.id === id);
    if (idx === -1) return null;
    props[idx] = { ...props[idx], ...data, updatedAt: new Date().toISOString() };
    write('properties', props);
    return props[idx];
  },
  delete: (id) => {
    const props = read('properties').filter(p => p.id !== id);
    write('properties', props);
  },
};

// --- Bookings ---
const bookings = {
  all: () => read('bookings'),
  get: (id) => read('bookings').find(b => b.id === id),
  byProperty: (propertyId) => read('bookings').filter(b => b.propertyId === propertyId),
  create: (data) => {
    const all = read('bookings');
    const booking = {
      id: uuidv4(),
      bookingRef: 'DH-' + Date.now().toString(36).toUpperCase(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...data
    };
    all.push(booking);
    write('bookings', all);
    // Also save guest
    const guests = read('guests');
    const existing = guests.find(g => g.email === data.guestEmail);
    if (!existing) {
      guests.push({
        id: uuidv4(),
        name: data.guestName,
        email: data.guestEmail,
        phone: data.guestPhone,
        firstBooking: new Date().toISOString(),
      });
      write('guests', guests);
    }
    return booking;
  },
  update: (id, data) => {
    const all = read('bookings');
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data };
    write('bookings', all);
    return all[idx];
  },
};

// --- Reviews ---
const reviews = {
  all: () => read('reviews'),
  byProperty: (propertyId) => read('reviews').filter(r => r.propertyId === propertyId),
  create: (data) => {
    const all = read('reviews');
    const review = { id: uuidv4(), createdAt: new Date().toISOString(), ...data };
    all.push(review);
    write('reviews', all);
    return review;
  },
  delete: (id) => {
    write('reviews', read('reviews').filter(r => r.id !== id));
  },
};

// --- Guests ---
const guests = {
  all: () => read('guests'),
};

// --- Admin ---
const admin = {
  get: (username) => read('admin').find(a => a.username === username),
  init: () => {
    const admins = read('admin');
    if (admins.length === 0) {
      const bcrypt = require('bcryptjs');
      admins.push({
        id: uuidv4(),
        username: 'admin',
        password: bcrypt.hashSync('darjeeling2024', 10),
        name: 'Property Owner',
      });
      write('admin', admins);
      console.log('✅ Default admin created: admin / darjeeling2024');
    }
  },
};

module.exports = { properties, bookings, reviews, guests, admin };
