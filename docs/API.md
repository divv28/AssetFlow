# AssetFlow - API Documentation (Phase 1 & 2)

This document contains standard specifications for Phase 1 and Phase 2 API endpoints.

## Base URL
`http://localhost:5000`

---

## Response Format

All responses follow a standardized structure.

### Success Response
```json
{
  "success": true,
  "message": "Operation successful description",
  "data": { ... } // Payload data or null
}
```

### Paginated Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": [ ... ], // Array of records
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## 🔑 Authentication Endpoints (Phase 1)
Base path: `/api/auth`

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

---

### 2. User Login
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Description:** Verifies credentials and sets `refreshToken` in an HTTP-only secure cookie. Returns access token.

#### Request Body
```json
{
  "email": "admin@assetflow.com",
  "password": "Admin1234#"
}
```

---

### 3. User Logout
- **Endpoint:** `POST /api/auth/logout`
- **Access:** Protected (Requires Access Token)
- **Description:** Clears session and clears the `refreshToken` cookie.

---

### 4. Fetch Profile (Get Me)
- **Endpoint:** `GET /api/auth/me`
- **Access:** Protected (Requires valid Access Token)

---

### 5. Refresh Access Token
- **Endpoint:** `POST /api/auth/refresh`
- **Access:** Public (Requires valid `refreshToken` cookie)

---

## 🏢 Department Management (Phase 2)
Base path: `/api/departments` (Requires `ADMIN` role)

### 1. List Departments
- **Endpoint:** `GET /api/departments`
- **Access:** Protected (ADMIN Only)
- **Query Params:** `?page=1&limit=20&sortBy=name&order=asc&search=IT&status=ACTIVE`

---

### 2. Create Department
- **Endpoint:** `POST /api/departments`
- **Access:** Protected (ADMIN Only)
- **Description:** Creates a new department. Verifies that it does not form recursive parent loops.

#### Request Body
```json
{
  "name": "Quality Assurance",
  "code": "QA",
  "description": "Software QA team",
  "parentDepartmentId": "c30f40d1-0428-4e3f-b883-fa492f254e21",
  "headId": "e9c2b9a7-96a8-4e89-a292-ccf7a93541ef"
}
```

---

### 3. Update Department
- **Endpoint:** `PUT /api/departments/:id`
- **Access:** Protected (ADMIN Only)

---

### 4. Patch Status (Deactivate/Reactivate)
- **Endpoint:** `PATCH /api/departments/:id/status`
- **Access:** Protected (ADMIN Only)
- **Description:** Deactivates (soft deletes) or reactivates a department.
- **Rules:** Cannot deactivate if any active employees are currently assigned to the department.

#### Request Body
```json
{
  "status": "INACTIVE"
}
```

---

## 🏷️ Asset Category Management (Phase 2)
Base path: `/api/categories` (Requires `ADMIN` role)

### 1. List Categories
- **Endpoint:** `GET /api/categories`
- **Access:** Protected (ADMIN Only)

### 2. Create Category
- **Endpoint:** `POST /api/categories`
- **Access:** Protected (ADMIN Only)

#### Request Body
```json
{
  "name": "Laptops & Hardware",
  "description": "Developer workstations",
  "warrantyMonths": 36,
  "depreciationYears": 3
}
```

### 3. Update Category
- **Endpoint:** `PUT /api/categories/:id`
- **Access:** Protected (ADMIN Only)

### 4. Patch Status
- **Endpoint:** `PATCH /api/categories/:id/status`
- **Access:** Protected (ADMIN Only)

---

## 👥 Employee Directory (Phase 2)
Base path: `/api/employees` (Requires `ADMIN` role)

### 1. List Employees
- **Endpoint:** `GET /api/employees`
- **Access:** Protected (ADMIN Only)
- **Query Params:** `?page=1&limit=20&search=john&role=EMPLOYEE&departmentId=some-uuid&status=ACTIVE`

### 2. Fetch Employee Details
- **Endpoint:** `GET /api/employees/:id`
- **Access:** Protected (ADMIN Only)

### 3. Promote Role
- **Endpoint:** `PATCH /api/employees/:id/role`
- **Access:** Protected (ADMIN Only)
- **Rules:** 
  - Admins cannot modify their own roles.
  - Cannot demote/change role if they are the last active admin in the system.
  - Setting role to `DEPARTMENT_HEAD` automatically assigns them as head of their department and demotes any previous head to `EMPLOYEE`.

#### Request Body
```json
{
  "role": "DEPARTMENT_HEAD"
}
```

### 4. Assign Department
- **Endpoint:** `PATCH /api/employees/:id/department`
- **Access:** Protected (ADMIN Only)

#### Request Body
```json
{
  "departmentId": "c30f40d1-0428-4e3f-b883-fa492f254e21"
}
```

### 5. Patch Status (Activate/Deactivate)
- **Endpoint:** `PATCH /api/employees/:id/status`
- **Access:** Protected (ADMIN Only)
- **Rules:** Cannot deactivate if they are the last active admin.

#### Request Body
```json
{
  "status": "INACTIVE"
}
```

### 6. Dashboard Metrics
- **Endpoint:** `GET /api/employees/dashboard-stats`
- **Access:** Protected (ADMIN Only)
- **Description:** Returns total department, categories, employees, department head, and asset manager count metrics.
