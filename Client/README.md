# ProConnect â€” Professional Networking Platform

A full-stack professional networking application built with **Express.js**, **MySQL**, and **Vanilla JS**.

---

## Project Structure

```
pro_connect/
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ config/
â”‚   â”‚   â”œâ”€â”€ database.js        # MySQL connection pool
â”‚   â”‚   â””â”€â”€ schema.sql         # Full database schema (run this first)
â”‚   â”œâ”€â”€ controllers/
â”‚   â”‚   â”œâ”€â”€ authController.js  # Register, login, getMe
â”‚   â”‚   â”œâ”€â”€ userController.js  # Profile, resume upload, search
â”‚   â”‚   â”œâ”€â”€ messageController.js # Send, inbox, conversation
â”‚   â”‚   â”œâ”€â”€ connectionController.js # Request, respond, list
â”‚   â”‚   â””â”€â”€ eventController.js # Create, list, register
â”‚   â”œâ”€â”€ middleware/
â”‚   â”‚   â”œâ”€â”€ auth.js            # JWT verify, requireAdmin
â”‚   â”‚   â”œâ”€â”€ validate.js        # Input validation rules
â”‚   â”‚   â””â”€â”€ upload.js          # Multer PDF upload
â”‚   â”œâ”€â”€ routes/
â”‚   â”‚   â”œâ”€â”€ auth.js
â”‚   â”‚   â”œâ”€â”€ users.js
â”‚   â”‚   â”œâ”€â”€ messages.js
â”‚   â”‚   â”œâ”€â”€ connections.js
â”‚   â”‚   â””â”€â”€ events.js
â”‚   â”œâ”€â”€ uploads/               # Resume files (auto-created)
â”‚   â”œâ”€â”€ server.js              # Entry point
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ .env.example           # Copy to .env and fill in values
â””â”€â”€ frontend/
    â”œâ”€â”€ index.html             # Landing page
    â”œâ”€â”€ pages/
    â”‚   â”œâ”€â”€ login.html
    â”‚   â”œâ”€â”€ register.html
    â”‚   â”œâ”€â”€ dashboard.html
    â”‚   â”œâ”€â”€ profile.html
    â”‚   â”œâ”€â”€ connections.html
    â”‚   â”œâ”€â”€ messages.html
    â”‚   â””â”€â”€ events.html
    â”œâ”€â”€ css/
    â”‚   â””â”€â”€ main.css
    â””â”€â”€ js/
        â”œâ”€â”€ api.js             # Centralised fetch helper
        â””â”€â”€ main.js            # Landing page interactions
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
users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ connections (requester_id, addressee_id)
  â”‚                 â”‚
  â””â”€â”€ messages â”€â”€â”€â”€â”€â”˜   (sender_id, receiver_id)
  â”‚
  â””â”€â”€ events â”€â”€â”€â”€â”€â”€â”€ event_participants (event_id, user_id)
```

### Tables
- **users** â€” accounts, profiles, resume URLs, roles
- **connections** â€” pending/accepted/rejected connection requests
- **messages** â€” direct messages between users
- **events** â€” professional events (in-person/virtual/hybrid)
- **event_participants** â€” event registrations

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


