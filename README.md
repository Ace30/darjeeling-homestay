# 🏔️ Darjeeling Hills Homestay — Website & Admin Panel

A complete homestay booking website with a professional frontend and admin backend.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed on your computer/server

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```

Then open your browser at: **http://localhost:3000**

---

## 🔑 Admin Login

Go to: **http://localhost:3000/admin**

| Username | Password |
|----------|----------|
| `admin`  | `darjeeling2024` |

> ⚠️ Change the password after first login (edit `db/database.js` line with `hashSync`)

---

## 📁 Project Structure

```
darjeeling-homestay/
├── server.js          → Express backend (API + file serving)
├── db/
│   ├── database.js    → JSON-based database layer
│   └── data/          → All data stored here (auto-created)
│       ├── properties.json
│       ├── bookings.json
│       ├── reviews.json
│       ├── guests.json
│       └── admin.json
├── public/
│   ├── index.html     → Main public website
│   ├── admin.html     → Admin panel
│   └── uploads/       → Uploaded property photos
└── package.json
```

---

## ✨ Features

### Public Website
- 🏡 Property listings with photos, pricing, amenities
- 📍 Interactive map (OpenStreetMap) showing property locations
- ⭐ Guest ratings and reviews
- 📅 Booking system with checkout flow
- 💬 WhatsApp / phone / email contact
- 📱 Fully mobile responsive

### Admin Panel
- 📊 Dashboard with stats (properties, bookings, guests, revenue)
- 🏡 Add/Edit/Delete properties with photo upload
- 📍 Click-to-place map for setting property coordinates
- 📅 View all bookings, update status (pending/confirmed/cancelled)
- 👥 Guest database
- ⭐ Manage and delete reviews

---

## 🌐 Deploying Online

To make your website available on the internet:

### Option A: Railway (Free/Easy)
1. Create account at railway.app
2. Connect your GitHub repo
3. Set start command: `node server.js`

### Option B: Render (Free)
1. Create account at render.com
2. New Web Service → connect repo
3. Build command: `npm install`
4. Start command: `node server.js`

### Option C: VPS (DigitalOcean/Hostinger)
```bash
# Install Node.js, clone repo, then:
npm install
npm install -g pm2
pm2 start server.js --name homestay
pm2 startup
```

---

## 📸 Adding Your First Property

1. Open **http://localhost:3000/admin**
2. Login with `admin` / `darjeeling2024`
3. Click **Properties → Add Property**
4. Fill in details, upload photos, click the map to set location
5. Save — it instantly appears on your website!

---

## 🔒 Security Notes

- Change the default admin password
- Set a strong JWT_SECRET in a `.env` file:
  ```
  JWT_SECRET=your-very-long-random-secret-here
  PORT=3000
  ```
- For production, use HTTPS (SSL certificate)

---

*Made with ❤️ for Darjeeling Hills Homestay*
