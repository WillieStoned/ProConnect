# ProConnect Professional Networking Platform

A full-stack professional networking application built with **Express.js**, **MySQL**, and **Vanilla JS**.

---

## Project Structure

```
pro_connect/
 backend/
config/
  database.js        # MySQL connection pool
  schema.sql         # Full database schema (run this first)
 controllers/
  authController.js  # Register, login, getMe
  userController.js  # Profile, resume upload, search
  messageController.js # Send, inbox, conversation
  connectionController.js # Request, respond, list
  eventController.js # Create, list, register
middleware/
 auth.js            # JWT verify, requireAdmin
 validate.js        # Input validation rules
 upload.js          # Multer PDF upload
 routes/
  auth.js
  users.js
  messages.js
  connections.js
  events.js
 uploads/               # Resume files (auto-created)
  server.js              # Entry point
  package.json
  .env.example           # Copy to .env and fill in values
 frontend/
     index.html             # Landing page
   pages/
     login.html
     register.html
     dashboard.html
     profile.html
     connections.html
     messages.html
     events.html
   css/
     main.css
   js/
     api.js             # Centralised fetch helper
     main.js            # Landing page interactions
```

---

## Setup Instructions

### 1. Database Setup

```sql
-- In MySQL client:
SOURCE Server/database/schema.sql;
```

### 2. Backend Configuration

```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials and a strong JWT_SECRET
npm install
npm run dev
```

### 3. Frontend

The frontend is served as static files by Express. With the server running, open:
```
http://localhost:5000
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | âŒ | Create account |
| POST | `/api/auth/login` | âŒ | Login, receive JWT |
| GET | `/api/auth/me` | âœ… | Get own profile |
| GET | `/api/users?q=` | âœ… | Search users |
| GET | `/api/users/:id` | âŒ | Public profile |
| PUT | `/api/users/me` | âœ… | Update profile |
| POST | `/api/users/me/resume` | âœ… | Upload PDF resume |
| GET | `/api/connections` | âœ… | My connections |
| GET | `/api/connections/pending` | âœ… | Pending requests |
| POST | `/api/connections/request/:userId` | âœ… | Send request |
| PUT | `/api/connections/:id/respond` | âœ… | Accept/Reject |
| GET | `/api/messages` | âœ… | Inbox |
| POST | `/api/messages` | âœ… | Send message |
| GET | `/api/messages/:userId` | âœ… | Conversation |
| GET | `/api/events` | âŒ | List events |
| POST | `/api/events` | âœ… | Create event |
| POST | `/api/events/:id/register` | âœ… | Register for event |

All protected routes require: `Authorization: Bearer <token>`

---

## Database Schema (ER Overview)

```
users connections (requester_id, addressee_id)
                   
   Messages   (sender_id, receiver_id)
  
   events  event_participants (event_id, user_id)
```

### Tables
- **users**  accounts, profiles, resume URLs, roles
- **connections**  pending/accepted/rejected connection requests
- **messages**  direct messages between users
- **events**  professional events (in-person/virtual/hybrid)
- **event_participants**  event registrations

---

## Security Features

- Passwords hashed with **bcrypt** (12 salt rounds)
- Authentication via **JWT** (7-day expiry)
- Input validation via **express-validator** on all routes
- File uploads restricted to **PDF only**, max **5 MB**
- SQL injection prevented via **parameterised queries** (mysql2)
- Request body size limited to **10 KB**
- Generic error messages to prevent **user enumeration**
- Role-based access control (**user** / **admin**)
- CORS configured for specific allowed origins

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js 4 |
| Database | MySQL 8 (mysql2) |
| Auth | JWT (jsonwebtoken) |
| Password | bcryptjs |
| Validation | express-validator |
| File upload | multer |
| Config | dotenv |
| Frontend | HTML5, CSS3, Vanilla JS |


