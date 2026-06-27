# 🩸 RoktoNeer - Backend Server
Backend server for RoktoNeer - Blood Donation Platform built with Express.js, MongoDB, and better-auth.

## 🔗 Links

| Item | Link |
|------|------|
| **Server Repository** | https://github.com/syntaxadil/roktoneer-server |
| **Frontend Repository** | https://github.com/syntaxadil/roktoneer-client |
| **Live Website** | https://roktoneer.vercel.app |

## 🛠️ Tech Stack

**Runtime:** Node.js  
**Framework:** Express.js  
**Database:** MongoDB  
**Authentication:** better-auth (EdDSA/JWKS)  
**Token Verification:** jose library  
**Hosting:** Vercel / Render / Railway  

## 📡 API Endpoints

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/active-donors-count` | Get active donors count |
| `GET` | `/api/donation-requests/public-pending?bloodGroup=O+&district=Dhaka&page=1&limit=6` | Get pending requests |
| `GET` | `/api/users/donors?bloodGroup=O+&district=Dhaka&page=1&limit=6` | Search donors |
| `GET` | `/api/users?status=active&page=1&limit=10` | Get all users |
| `GET` | `/api/funds/total-funds` | Get total funds |
| `GET` | `/api/funds/users?page=1&limit=6` | Get funded users |

### Protected Endpoints (Requires better-auth Token)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/api/donation-requests/all?status=pending&page=1&limit=3` | Get all donation requests | All |
| `POST` | `/api/donation-request` | Create donation request | Donor, Volunteer |
| `GET` | `/api/donation-request/:email?status=pending&page=1&limit=3` | Get user's requests | All |
| `GET` | `/api/donation-requests/:id` | Get request details | All |
| `PATCH` | `/api/donation-requests/:id` | Update request | Donor |
| `PATCH` | `/api/donation-requests/status/:id` | Update status | Donor, Volunteer, Admin |
| `DELETE` | `/api/donation-requests/:id` | Delete request | Donor, Admin |
| `POST` | `/api/funds/add` | Add funds | All |

### Admin Only Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PATCH` | `/api/users/status/:id` | Block/Unblock user |
| `PATCH` | `/api/users/role/:id` | Change user role |
| `GET` | `/api/admin/donation-analytics` | Get analytics (daily/weekly/monthly) |

## 🔐 Authentication (better-auth)

**Header Format:**
```
Authorization: Bearer <better-auth-token>
```

**Features:**
- EdDSA token signing
- JWKS-based verification
- jose library for token handling
- Secure session management
- MongoDB adapter support

## 📊 Valid Values

| Field | Values |
|-------|--------|
| Blood Groups | A+, A-, B+, B-, AB+, AB-, O+, O- |
| Donation Status | pending, inprogress, done, canceled |
| User Roles | donor (default), volunteer, admin |
| User Status | active, blocked |

## ⚙️ Environment Variables

Create `.env` file:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/roktoneer

# better-auth
BETTER_AUTH_SECRET=your_better_auth_secret_key

# Server
PORT=5000
NODE_ENV=production

# CORS
CORS_ORIGIN=https://roktoneer.vercel.app
```

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/syntaxadil/roktoneer-server.git
cd roktoneer-server

# Install dependencies
npm install

# Create .env file with variables
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
roktoneer-server/
├── middleware/
│   ├── auth.middleware.js (better-auth verification)
│   └── role.middleware.js (role-based access)
├── utils/
│   └── asyncHandler.js
├── server.js (main file)
├── .env
└── package.json
```

## 🚀 Middleware

**authMiddleware:** Verifies better-auth token  
**checkRoleMiddleware:** Validates user roles (donor, volunteer, admin)  
**asyncHandler:** Handles async errors  

## 📋 Database Collections

### users
```javascript
{
  _id, name, email, password (hashed),
  avatar, bloodGroup, district, upazila,
  role, status, fund, fundDate,
  createdAt, updatedAt
}
```

### donationRequests
```javascript
{
  _id, requesterName, requesterEmail,
  recipientName, recipientDistrict, recipientUpazila,
  hospitalName, fullAddress, bloodGroup,
  date, time, details, donationStatus,
  donorName, donorEmail, doneAt,
  createdAt
}
```

## ✨ Features

✅ better-auth authentication  
✅ JWT verification with jose  
✅ Role-based access control  
✅ Pagination & filtering  
✅ MongoDB Atlas integration  
✅ CORS enabled  
✅ Error handling  
✅ Analytics endpoints  
✅ Admin dashboard APIs  

## 🔒 Security

- better-auth for secure authentication
- EdDSA token signing
- Password hashing
- Environment variables for secrets
- CORS configuration
- Role-based endpoint protection
- Input validation

## 📊 Commit Guidelines

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `perf:` Performance improvements

**Total Commits:** 12+ ✅

## 🛫 Deployment

**Hosting Options:**
- Vercel
- Render
- Railway
- Heroku

**Checklist:**
- ✅ No CORS errors
- ✅ No 404/504 errors
- ✅ MongoDB connected
- ✅ better-auth configured
- ✅ Environment variables set
- ✅ Live URL working

## 📚 Dependencies

```json
{
  "express": "^4.x",
  "mongodb": "^6.x",
  "better-auth": "^latest",
  "jose": "^5.x",
  "cors": "^2.x",
  "dotenv": "^16.x"
}
```

## 🧪 Testing

```bash
# Test endpoints
npm run test

# Development with nodemon
npm run dev
```

## 👨‍💻 Developer

**Abdur Rahman** | Full Stack Developer | Dhaka, Bangladesh

---

**Made with ❤️ for blood donation community** 🩸