# AssetFlow - API Documentation (Phase 1)

This document contains standard specifications for Phase 1 Authentication endpoints.

## Base URL
`http://localhost:5000/api/auth`

---

## Response Format

All responses from the backend API follow a standardized structure.

### Success Response
```json
{
  "success": true,
  "message": "Operation successful description",
  "data": { ... } // Payload data or null
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error details summary",
  "errors": [
    {
      "field": "email",
      "message": "Please enter a valid email address"
    }
  ] // optional validation details
}
```

---

## Endpoints List

### 1. User Registration (Signup)
- **Endpoint:** `POST /api/auth/signup`
- **Access:** Public
- **Description:** Registers a new user. Every new user is registered as `EMPLOYEE` by default.

#### Request Body
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@company.com",
  "password": "Password1234#"
}
```
*Note: Password must be at least 8 characters, containing at least one uppercase letter, one lowercase letter, and one number.*

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "User registered successfully as EMPLOYEE",
  "data": {
    "id": 3,
    "uuid": "f2a893cb-3392-4f31-893d-3df72183e9df",
    "name": "Jane Doe",
    "email": "jane.doe@company.com",
    "role": "EMPLOYEE",
    "departmentId": null,
    "status": "ACTIVE",
    "createdAt": "2026-07-12T12:00:00.000Z",
    "updatedAt": "2026-07-12T12:00:00.000Z"
  }
}
```

---

### 2. User Login
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Description:** Verifies user credentials and starts an authentication session. Returns an access token in the response data and a refresh token inside an HTTP-only secure cookie named `refreshToken`.

#### Request Body
```json
{
  "email": "admin@assetflow.com",
  "password": "Admin1234#"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "uuid": "e9c2b9a7-96a8-4e89-a292-ccf7a93541ef",
      "name": "System Administrator",
      "email": "admin@assetflow.com",
      "role": "ADMIN",
      "departmentId": null,
      "status": "ACTIVE",
      "createdAt": "2026-07-12T12:00:00.000Z",
      "updatedAt": "2026-07-12T12:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
*Note: Cookie `refreshToken` is set with options: `HttpOnly`, `Secure` (production only), `SameSite=Lax`, and `Max-Age=7 days`.*

---

### 3. User Logout
- **Endpoint:** `POST /api/auth/logout`
- **Access:** Protected (Requires Access Token)
- **Description:** Clears session details. Clears the `refreshToken` cookie.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

### 4. Fetch Current Profile (Get Me)
- **Endpoint:** `GET /api/auth/me`
- **Access:** Protected (Requires valid Access Token in `Authorization: Bearer <token>` header or `accessToken` cookie)
- **Description:** Returns the profile of the current authenticated user.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Current user profile retrieved successfully",
  "data": {
    "id": 1,
    "uuid": "e9c2b9a7-96a8-4e89-a292-ccf7a93541ef",
    "name": "System Administrator",
    "email": "admin@assetflow.com",
    "role": "ADMIN",
    "departmentId": null,
    "status": "ACTIVE",
    "createdAt": "2026-07-12T12:00:00.000Z",
    "updatedAt": "2026-07-12T12:00:00.000Z"
  }
}
```

---

### 5. Refresh Access Token
- **Endpoint:** `POST /api/auth/refresh`
- **Access:** Public (Requires valid `refreshToken` cookie)
- **Description:** Extends session by generating a new Access Token and rotating the Refresh Token cookie.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Tokens refreshed successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "System Administrator",
      "email": "admin@assetflow.com",
      "role": "ADMIN",
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
