require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const XLSX = require('xlsx');

const db = require('./db/database');
const { processUploadedFiles, normalizeImageUrl } = require('./lib/images');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'darjeeling-secret-key-2024';
const DATA_DIR = process.env.DATA_DIR;

// Ensure uploads dir exists
const UPLOAD_DIR = DATA_DIR
  ? path.join(DATA_DIR, 'uploads')
  : path.join(__dirname, 'public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function seedUploadsIfNeeded() {
  if (!DATA_DIR) return;
  const seedUploads = path.join(__dirname, 'public/uploads');
  if (!fs.existsSync(seedUploads)) return;
  for (const file of fs.readdirSync(seedUploads)) {
    if (file.startsWith('.')) continue;
    const dest = path.join(UPLOAD_DIR, file);
    const src = path.join(seedUploads, file);
    if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
  }
}
seedUploadsIfNeeded();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// Init admin
db.admin.init();

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.admin.get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, name: admin.name });
});

// ─── Public API ───────────────────────────────────────────────────────────────
app.get('/api/properties', (req, res) => {
  const props = db.properties.all();
  const result = props.map(p => {
    const revs = db.reviews.byProperty(p.id);
    const avgRating = revs.length ? (revs.reduce((s, r) => s + r.rating, 0) / revs.length).toFixed(1) : null;
    return { ...p, avgRating, reviewCount: revs.length };
  });
  res.json(result);
});

app.get('/api/properties/:id', (req, res) => {
  const prop = db.properties.get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Not found' });
  const revs = db.reviews.byProperty(prop.id);
  const avgRating = revs.length ? (revs.reduce((s, r) => s + r.rating, 0) / revs.length).toFixed(1) : null;
  res.json({ ...prop, reviews: revs, avgRating, reviewCount: revs.length });
});

app.post('/api/bookings', (req, res) => {
  const { propertyId, guestName, guestEmail, guestPhone, guestCount, checkIn, checkOut, totalAmount, specialRequests } = req.body;
  if (!propertyId || !guestName || !guestEmail || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const prop = db.properties.get(propertyId);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const booking = db.bookings.create({
    propertyId, propertyName: prop.name,
    guestName, guestEmail, guestPhone, guestCount,
    checkIn, checkOut, totalAmount, specialRequests,
  });
  res.json(booking);
});

app.get('/api/bookings/:id', (req, res) => {
  const booking = db.bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  res.json(booking);
});

app.post('/api/reviews', (req, res) => {
  const { propertyId, guestName, rating, comment } = req.body;
  if (!propertyId || !guestName || !rating) return res.status(400).json({ error: 'Missing fields' });
  const review = db.reviews.create({ propertyId, guestName, rating: Number(rating), comment });
  res.json(review);
});

// ─── Admin API ────────────────────────────────────────────────────────────────
app.get('/api/admin/dashboard', authMiddleware, (req, res) => {
  const props = db.properties.all();
  const bookings = db.bookings.all();
  const guests = db.guests.all();
  const reviews = db.reviews.all();
  const revenue = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.totalAmount || 0), 0);
  res.json({
    totalProperties: props.length,
    totalBookings: bookings.length,
    totalGuests: guests.length,
    totalReviews: reviews.length,
    revenue,
    recentBookings: bookings.slice(-5).reverse(),
    recentReviews: reviews.slice(-5).reverse(),
  });
});

app.get('/api/admin/properties', authMiddleware, (req, res) => res.json(db.properties.all()));

app.post('/api/admin/properties', authMiddleware, upload.array('images', 10), async (req, res) => {
  const { name, description, location, lat, lng, pricePerNight, maxGuests, amenities, contactPhone, contactEmail, contactWhatsapp } = req.body;
  const images = await processUploadedFiles(req.files);
  const prop = db.properties.create({
    name, description, location,
    coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
    pricePerNight: parseFloat(pricePerNight),
    maxGuests: parseInt(maxGuests),
    amenities: amenities ? amenities.split(',').map(a => a.trim()) : [],
    images,
    contact: { phone: contactPhone, email: contactEmail, whatsapp: contactWhatsapp },
  });
  res.json(prop);
});

app.put('/api/admin/properties/:id', authMiddleware, upload.array('images', 10), async (req, res) => {
  const { name, description, location, lat, lng, pricePerNight, maxGuests, amenities, contactPhone, contactEmail, contactWhatsapp, existingImages } = req.body;
  const newImages = await processUploadedFiles(req.files);
  const existingList = existingImages ? JSON.parse(existingImages).map(normalizeImageUrl) : [];
  const prop = db.properties.update(req.params.id, {
    name, description, location,
    coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
    pricePerNight: parseFloat(pricePerNight),
    maxGuests: parseInt(maxGuests),
    amenities: amenities ? amenities.split(',').map(a => a.trim()) : [],
    images: [...existingList, ...newImages],
    contact: { phone: contactPhone, email: contactEmail, whatsapp: contactWhatsapp },
  });
  res.json(prop);
});

app.delete('/api/admin/properties/:id', authMiddleware, (req, res) => {
  db.properties.delete(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/bookings', authMiddleware, (req, res) => res.json(db.bookings.all().reverse()));

app.put('/api/admin/bookings/:id', authMiddleware, (req, res) => {
  const booking = db.bookings.update(req.params.id, req.body);
  res.json(booking);
});

app.get('/api/admin/guests', authMiddleware, (req, res) => res.json(db.guests.all()));

app.get('/api/admin/guests/export', authMiddleware, (req, res) => {
  const guests = db.guests.all();
  const bookings = db.bookings.all();
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const rows = guests.map(g => {
    const guestBookings = bookings.filter(b => b.guestEmail === g.email);
    const latest = guestBookings[guestBookings.length - 1];
    return {
      Name: g.name,
      Email: g.email,
      Phone: g.phone || '',
      'First Booking': fmt(g.firstBooking),
      'Total Bookings': guestBookings.length,
      'Latest Property': latest?.propertyName || '',
      'Latest Check-in': latest?.checkIn || '',
      'Latest Check-out': latest?.checkOut || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Name: '', Email: '', Phone: '', 'First Booking': '', 'Total Bookings': 0, 'Latest Property': '', 'Latest Check-in': '', 'Latest Check-out': '' }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Guests');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `guests-${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

app.get('/api/admin/reviews', authMiddleware, (req, res) => res.json(db.reviews.all().reverse()));

app.delete('/api/admin/reviews/:id', authMiddleware, (req, res) => {
  db.reviews.delete(req.params.id);
  res.json({ success: true });
});

// File upload endpoint
app.post('/api/upload', authMiddleware, upload.array('files', 10), async (req, res) => {
  const urls = await processUploadedFiles(req.files);
  res.json({ urls });
});

// ─── Serve HTML pages ─────────────────────────────────────────────────────────
app.get(['/admin', '/admin/'], (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/{*splat}', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

app.listen(PORT, () => console.log(`🏔️  Darjeeling Homestay running on http://localhost:${PORT}`));
