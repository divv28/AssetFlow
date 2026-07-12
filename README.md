# AssetFlow - Enterprise ERP (Phase 1)

AssetFlow is an Enterprise-grade Resource Planning (ERP) application. This repository contains the Phase 1 setup, covering the project architecture, PostgreSQL database integration (using Prisma ORM), and a secure JWT-based authentication system.

---

## Folder Structure

```
d:/oodo/
├── client/                     # Vite + React 19 Frontend
│   ├── src/
│   │   ├── assets/             # Assets and logos
│   │   ├── components/         # Reusable UI components
│   │   ├── constants/          # App constants
│   │   ├── contexts/           # AuthContext provider
│   │   ├── hooks/              # Custom hooks
│   │   ├── layouts/            # Page layouts
│   │   ├── pages/              # Login, Signup, Dashboard pages
│   │   ├── routes/             # Protected/Public route rules & router
│   │   ├── services/           # Axios instance & Auth service layer
│   │   ├── utils/              # Client-side helper functions
│   │   ├── App.jsx             # Main App root component
│   │   └── main.jsx            # React 19 entry point
│   ├── tailwind.config.js      # Custom theme & typography
│   ├── postcss.config.js       # PostCSS config
│   ├── vite.config.js          # Vite server and reverse proxy config
│   └── package.json            # Frontend package details
│
├── server/                     # Express Backend API
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma DB schemas & enums
│   │   └── seed.js             # Initial database seeder (admin/employee)
│   ├── src/
│   │   ├── config/             # DB & server configurations
│   │   ├── constants/          # Server constants
│   │   ├── controllers/        # Thin MVC controller routes
│   │   ├── lib/                # Custom library files
│   │   ├── middlewares/        # Auth verification, role limits, error middleware
│   │   ├── routes/             # Authentication routes
│   │   ├── services/           # Authentication service layer
│   │   ├── types/              # Type signatures (if applicable)
│   │   ├── utils/              # ApiError, ApiResponse, asyncHandler helpers
│   │   ├── validators/         # Zod schemas for input validation
│   │   ├── app.js              # Express app middleware assembly
│   │   └── server.js           # Server runner and DB initial connector
│   ├── .env                    # System Environment Variables
│   └── package.json            # Backend package details
│
├── docs/                       # Project documentation
│   └── API.md                  # Detailed API Documentation
└── README.md                   # Setup guide (This file)
```

---

## Environment Variables

Create `.env` inside `server/` with the following variables:

```ini
# Server Config
PORT=5000
NODE_ENV=development

# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>?schema=public"

# JWT Authentication
JWT_ACCESS_SECRET="your-super-secret-access-token-key-assetflow"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key-assetflow"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# CORS Origin
CORS_ORIGIN="http://localhost:5173"
```

---

## Installation & Setup

Follow these steps to configure and run the application locally.

### Prerequisites
- Node.js (v18+)
- PostgreSQL database instance

### 1. Database Setup
1. Update the `DATABASE_URL` in `server/.env` with your PostgreSQL database user and password.
2. Run database migrations:
   ```bash
   cd server
   npx prisma migrate dev --name init
   ```
3. Generate the Prisma Client:
   ```bash
   npx prisma generate
   ```
4. Seed the database with default users (Admin & Employee):
   ```bash
   npm run db:seed
   ```

### 2. Install Dependencies
Run dependency installs on both directories:
```bash
# In server folder
cd server && npm install

# In client folder
cd client && npm install
```

### 3. Running the Projects

Open two terminal instances:

#### Terminal 1 (Start Server)
```bash
cd server
npm run dev
```
The server will run on `http://localhost:5000`.

#### Terminal 2 (Start Frontend Client)
```bash
cd client
npm run dev
```
The Vite development server will run on `http://localhost:5173`. Open it in your browser.

---

## Default Seeded Accounts

Use these accounts to test the Login flow after seeding the database:

1. **System Administrator**
   - **Email:** `admin@assetflow.com`
   - **Password:** `Admin1234#`
   - **Role:** `ADMIN`

2. **Employee User**
   - **Email:** `employee@assetflow.com`
   - **Password:** `Employee1234#`
   - **Role:** `EMPLOYEE`
