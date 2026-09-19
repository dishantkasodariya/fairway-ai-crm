# 📡 FAIRWAY CRM — API Specification Document

> **Document Version:** 1.0.0  
> **Status:** Release Candidate (Post-Hardening & Full Verification)  
> **Last Updated:** September 2026  
> **Target Audience:** Frontend Engineers, Integration Developers, Mobile Engineers, QA Teams, Security Auditors

---

## 1. Global API Architecture & Standards

### 1.1 Base URL & Environment Roots
| Environment | Base URL | Protocol |
| :--- | :--- | :--- |
| **Local Development** | `http://localhost:5000/api` | HTTP/1.1 |
| **Staging / QA** | `https://staging-api.fairwaycrm.com/api` | HTTPS (TLS 1.3) |
| **Production** | `https://api.fairwaycrm.com/api` | HTTPS (TLS 1.3) |

### 1.2 Versioning
The Fairway CRM API uses URI path prefixing for major version boundaries and backward compatibility:
- Current Default Gateway: `/api/*`
- Legacy / Explicit Versioning Gateway: `/api/v1/*`

### 1.3 Authentication & Session Protocols
Authentication is strictly handled via cryptographic **JSON Web Tokens (JWT)**:
- All protected endpoints require an `Authorization` HTTP header with a Bearer token:
  ```http
  Authorization: Bearer <jwt_token>
  ```
- **Token Claims**: `id` (User UUID), `email`, `role`, `iat`, `exp` (Default expiration: 7 days).
- **Security Rule**: Client-spoofed headers (`x-user-role`, `x-user-id`, `x-user-email`) are rejected. All claims are decoded and verified cryptographically by the server using `HMAC-SHA256`.

### 1.4 Rate Limiting & Concurrency Policies
Fairway API employs standard sliding-window rate limiters:
- **Public Authentication Gateway (`/api/auth/login`)**: Max 10 requests per minute per IP address (brute-force defense).
- **Standard Protected APIs**: Max 120 requests per minute per authenticated user ID.
- **Bulk Import / Export APIs (`/api/import/*`)**: Max 5 requests per minute per user ID.
- **Response Headers**:
  ```http
  X-RateLimit-Limit: 120
  X-RateLimit-Remaining: 114
  X-RateLimit-Reset: 1774004520
  ```

### 1.5 Standard Pagination & Query Protocol
All collection endpoints support consistent query parameters:
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `integer` | `1` | 1-based page index |
| `limit` | `integer` | `50` | Maximum items to return (max allowed: 200) |
| `search` | `string` | `""` | Substring match across primary entity titles/names |
| `sortBy` | `string` | `created_at` | Database column name to sort results |
| `sortOrder` | `asc` \| `desc` | `desc` | Sort direction |

**Standard Paginated Envelope:**
```json
{
  "success": true,
  "data": [ /* Array of records */ ],
  "pagination": {
    "total": 248,
    "page": 1,
    "limit": 50,
    "totalPages": 5
  }
}
```

### 1.6 Standard Error Envelope & Error Codes
Every failed request returns a consistent JSON payload with an appropriate HTTP status code:

```json
{
  "success": false,
  "error": "Human-readable error explanation",
  "code": "ERROR_CODE_ENUM",
  "details": null
}
```

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| **400 Bad Request** | `VALIDATION_ERROR` | Missing required fields, invalid format, or malformed JSON |
| **401 Unauthorized** | `AUTHENTICATION_REQUIRED` | Missing, invalid, or expired Bearer token |
| **403 Forbidden** | `PERMISSION_DENIED` | Authenticated user lacks required permission for this action |
| **404 Not Found** | `RESOURCE_NOT_FOUND` | The requested entity UUID does not exist |
| **409 Conflict** | `DUPLICATE_ENTRY` | Unique constraint collision (e.g. duplicate email or code) |
| **429 Too Many Requests** | `RATE_LIMIT_EXCEEDED` | Exceeded request threshold for sliding window |
| **500 Internal Error** | `SERVER_ERROR` | Unhandled database or server exception |

---

## 2. API Endpoints Specification (By Domain Module)

---

### 2.1 System & Health Module
Health checks and automated monitoring diagnostics.

#### `GET /api/health`
- **Auth Required:** No (Public)
- **Description:** Verifies Node.js process health and PostgreSQL database connectivity.
- **Sample Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "fairway-crm-api",
  "timestamp": "2026-09-19T08:30:00.000Z",
  "database": "connected",
  "uptime": 35240
}
```

---

### 2.2 Authentication & User Profile Module

#### `POST /api/auth/login`
- **Auth Required:** No (Public)
- **Request Body:**
```json
{
  "email": "admin@fairway.com",
  "password": "securePassword123"
}
```
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "u_admin_001",
    "name": "Super Administrator",
    "email": "admin@fairway.com",
    "role": "super_admin",
    "department": "Executive Board",
    "phone": "+91 988496151",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb"
  }
}
```

#### `GET /api/auth/profile`
- **Auth Required:** Yes (`Bearer <token>`)
- **Description:** Returns the currently authenticated user's session data.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "u_admin_001",
    "name": "Super Administrator",
    "email": "admin@fairway.com",
    "role": "super_admin",
    "department": "Executive Board",
    "phone": "+91 988496151",
    "timezone": "Asia/Kolkata",
    "workingHoursStart": "10:00 AM",
    "workingHoursEnd": "07:30 PM",
    "twoFactorEnabled": false
  }
}
```

#### `PUT /api/auth/profile`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "name": "Super Administrator",
  "phone": "+91 988496151",
  "department": "Industrial Operations",
  "timezone": "Asia/Kolkata",
  "workingHoursStart": "09:30 AM",
  "workingHoursEnd": "07:00 PM"
}
```
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "u_admin_001",
    "name": "Super Administrator",
    "phone": "+91 988496151",
    "department": "Industrial Operations"
  }
}
```

---

### 2.3 User Management Module

#### `GET /api/users`
- **Auth Required:** Yes (`admin` or `super_admin`)
- **Description:** Returns list of all system team members, active status, and lead allocations.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "u_sales_01",
      "name": "Rahul Verma",
      "email": "rahul.verma@fairway.com",
      "role": "sales",
      "department": "Industrial Leasing",
      "status": "Active",
      "assignedLeadsCount": 18,
      "lastActive": "2026-09-19T08:15:00.000Z"
    }
  ]
}
```

#### `POST /api/users`
- **Auth Required:** Yes (`super_admin` only)
- **Request Body:**
```json
{
  "name": "Vikram Sethi",
  "email": "vikram.sethi@fairway.com",
  "password": "TemporaryPassword123!",
  "role": "sales",
  "department": "North India Corridors",
  "phone": "+91 9811002233"
}
```
- **Sample Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "usr_9942a1b",
    "name": "Vikram Sethi",
    "email": "vikram.sethi@fairway.com",
    "role": "sales"
  }
}
```

---

### 2.4 Roles & Permissions Module

#### `GET /api/roles-permissions`
- **Auth Required:** Yes (Permission: `settings:view`)
- **Description:** Safe read-only retrieval of the entire role-permission matrix.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roles": [
      { "id": "role_super_admin", "name": "Super Admin", "key": "super_admin", "isSystem": true },
      { "id": "role_sales", "name": "Sales Specialist", "key": "sales", "isSystem": false }
    ],
    "permissions": [
      { "roleKey": "sales", "module": "inquiries", "canView": true, "canCreate": true, "canEdit": true, "canDelete": false },
      { "roleKey": "sales", "module": "companies", "canView": true, "canCreate": true, "canEdit": true, "canDelete": false }
    ]
  }
}
```

#### `PUT /api/roles-permissions`
- **Auth Required:** Yes (Permission: `settings:edit`)
- **Request Body:**
```json
{
  "roleKey": "sales",
  "module": "proposals",
  "canView": true,
  "canCreate": true,
  "canEdit": true,
  "canDelete": false
}
```
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "message": "Permission rule updated successfully"
}
```

---

### 2.5 Inquiries & Leads Module (Commercial Requirements)

#### `GET /api/inquiries`
- **Auth Required:** Yes (Permission: `inquiries:view`)
- **Query Parameters:** `page`, `limit`, `search`, `status` (`Active`|`Review`|`Postponed`), `priority` (`High`|`Medium`|`Low`), `stage`
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "inq_78102",
      "inquiryNumber": "INQ-78102",
      "companyId": "comp_dahej_01",
      "companyName": "Pareek Logistics International",
      "contactName": "Mr. Rajesh Pareek",
      "contactPhone": "+91 9820011223",
      "requiredAreaSqFt": 75000,
      "budgetMonthlyINR": 2100000,
      "location": "Sanand GIDC, Ahmedabad",
      "clearHeightM": 12.0,
      "powerKVA": 250,
      "flooringType": "FM2 Laser Screed",
      "dockCount": 8,
      "stage": "site_visit",
      "status": "Active",
      "priority": "High",
      "assignedUserName": "Rahul Verma",
      "nextFollowUpDate": "2026-09-22T10:00:00.000Z",
      "createdAt": "2026-09-10T14:32:00.000Z"
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 50, "totalPages": 1 }
}
```

#### `POST /api/inquiries`
- **Auth Required:** Yes (Permission: `inquiries:create`)
- **Request Body:**
```json
{
  "companyName": "Adani Total Gas Limited",
  "contactName": "Sunil Nair",
  "contactPhone": "+91 9900112233",
  "contactEmail": "sunil.nair@adanigas.com",
  "requiredAreaSqFt": 120000,
  "budgetMonthlyINR": 3600000,
  "location": "Dahej PCPIR Corridor",
  "clearHeightM": 14.0,
  "powerKVA": 500,
  "flooringType": "FM2 Laser Screed (7 Ton/m2)",
  "dockCount": 14,
  "priority": "High",
  "stage": "requirement_ingest"
}
```
- **Sample Response (201 Created):**
```json
{
  "success": true,
  "message": "Inquiry registered successfully",
  "data": {
    "id": "inq_88912",
    "inquiryNumber": "INQ-88912",
    "companyName": "Adani Total Gas Limited",
    "stage": "requirement_ingest",
    "status": "Active"
  }
}
```

#### `PATCH /api/inquiries/:id/stage`
- **Auth Required:** Yes (Permission: `inquiries:edit`)
- **Description:** Optimized stage-jump endpoint for Kanban drag-and-drop operations.
- **Request Body:**
```json
{
  "stage": "proposal_drafting",
  "lostReason": null,
  "notes": "Completed physical site visit. Client requested draft commercial term sheet."
}
```
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "message": "Stage updated successfully",
  "data": {
    "id": "inq_88912",
    "stage": "proposal_drafting",
    "updatedAt": "2026-09-19T08:35:12.000Z"
  }
}
```

---

### 2.6 Sales Pipeline & Stages Module

#### `GET /api/pipeline-stages`
- **Auth Required:** Yes (Permission: `inquiries:view`)
- **Description:** Returns the ordered array of stages configured on the Kanban board.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "id": "stg_1", "key": "requirement_ingest", "name": "Requirement Ingest", "orderIndex": 0, "color": "blue" },
    { "id": "stg_2", "key": "property_matching", "name": "Property Matching", "orderIndex": 1, "color": "purple" },
    { "id": "stg_3", "key": "site_visit", "name": "Site Visit Scheduled", "orderIndex": 2, "color": "amber" },
    { "id": "stg_4", "key": "proposal_drafting", "name": "Proposal / Term Sheet", "orderIndex": 3, "color": "indigo" },
    { "id": "stg_5", "key": "negotiation", "name": "Commercial Negotiation", "orderIndex": 4, "color": "orange" },
    { "id": "stg_6", "key": "closed_won", "name": "Closed Won (Leased)", "orderIndex": 5, "color": "emerald" },
    { "id": "stg_7", "key": "closed_lost", "name": "Closed Lost", "orderIndex": 6, "color": "rose" }
  ]
}
```

---

### 2.7 Companies & Facilities Module

#### `GET /api/companies`
- **Auth Required:** Yes (Permission: `companies:view`)
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "comp_99120",
      "name": "Tata AutoComp Systems Ltd",
      "industry": "Automotive Tier-1 Component Manufacturing",
      "city": "Pune",
      "state": "Maharashtra",
      "facilitiesCount": 4,
      "inquiriesCount": 2,
      "priority": "High",
      "status": "Active"
    }
  ]
}
```

#### `GET /api/companies/:id`
- **Auth Required:** Yes (Permission: `companies:view`)
- **Description:** Comprehensive company dossier including linked facilities, decision-makers, and historical inquiry track record.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "comp_99120",
    "name": "Tata AutoComp Systems Ltd",
    "gstin": "27AAACT1234F1Z5",
    "facilities": [
      {
        "id": "fac_01",
        "name": "Chakan Mother Plant Unit-II",
        "facilityType": "Manufacturing & Assembly",
        "sqFt": 185000,
        "location": "MIDC Chakan Phase-2, Pune"
      }
    ],
    "contacts": [
      {
        "id": "cnt_01",
        "name": "Anil Deshmukh",
        "designation": "Head of Corporate Real Estate",
        "email": "anil.d@tataautocomp.com",
        "phone": "+91 9822001122"
      }
    ]
  }
}
```

---

### 2.8 Properties & Corridors Module (Grade-A Inventory)

#### `GET /api/properties`
- **Auth Required:** Yes (Permission: `properties:view`)
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "prop_sanand_01",
      "code": "WH-SND-101",
      "name": "Fairway Logistics Park Sanand - Block A",
      "corridor": "Sanand GIDC Corridor",
      "city": "Ahmedabad",
      "state": "Gujarat",
      "totalAreaSqFt": 250000,
      "availableAreaSqFt": 85000,
      "clearHeightM": 12.0,
      "floorLoadCapacityTonsSqM": 6.0,
      "dockCount": 12,
      "rentPerSqFtINR": 26.50,
      "camPerSqFtINR": 2.50,
      "fireSystem": "NFPA Compliant K-14 Sprinkler Grid",
      "latitude": 22.9868,
      "longitude": 72.3814,
      "status": "Available"
    }
  ]
}
```

#### `GET /api/properties/corridors`
- **Auth Required:** Yes (Permission: `properties:view`)
- **Description:** Read-only statistical summary of Grade-A warehouse corridors.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "corridor": "Sanand GIDC Corridor", "count": 8, "totalSqFt": 1450000, "availableSqFt": 380000 },
    { "corridor": "Dahej PCPIR Corridor", "count": 5, "totalSqFt": 980000, "availableSqFt": 120000 },
    { "corridor": "Bhiwandi Logistics Hub", "count": 12, "totalSqFt": 2800000, "availableSqFt": 650000 }
  ]
}
```

---

### 2.9 Site Visits & Inspections Module

#### `GET /api/site-visits`
- **Auth Required:** Yes (Permission: `inquiries:view`)
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "sv_101",
      "inquiryId": "inq_78102",
      "companyName": "Pareek Logistics International",
      "propertyCode": "WH-SND-101",
      "scheduledDate": "2026-09-24T11:00:00.000Z",
      "inspectorName": "Devendra Joshi",
      "status": "Scheduled",
      "visitorCount": 3
    }
  ]
}
```

#### `POST /api/site-visits`
- **Auth Required:** Yes (Permission: `inquiries:create`)
- **Request Body:**
```json
{
  "inquiryId": "inq_78102",
  "propertyId": "prop_sanand_01",
  "scheduledDate": "2026-09-24T11:00:00.000Z",
  "inspectorName": "Devendra Joshi",
  "clientAttendees": ["Rajesh Pareek (MD)", "S. Rao (VP Supply Chain)"],
  "notes": "Client wants to verify turning radius for 40ft high-cube containers."
}
```

---

### 2.10 Commercial Proposals & Term Sheets Module

#### `POST /api/proposals`
- **Auth Required:** Yes (Permission: `inquiries:create`)
- **Request Body:**
```json
{
  "inquiryId": "inq_78102",
  "propertyId": "prop_sanand_01",
  "proposedSqFt": 75000,
  "baseRentINR": 26.50,
  "camINR": 2.50,
  "securityDepositMonths": 6,
  "lockInPeriodMonths": 36,
  "annualEscalationPercent": 5.0,
  "possessionDate": "2026-11-01"
}
```
- **Sample Response (201 Created):**
```json
{
  "success": true,
  "message": "Commercial proposal draft generated",
  "data": {
    "proposalId": "prop_doc_9921",
    "totalMonthlyCommitmentINR": 2175000,
    "status": "Draft",
    "pdfDownloadUrl": "/api/proposals/prop_doc_9921/download-pdf"
  }
}
```

---

### 2.11 Tasks & Follow-ups Module

#### `GET /api/tasks`
- **Auth Required:** Yes (Permission: `tasks:view`)
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "tsk_01",
      "title": "Dispatch Revised dahej Term Sheet",
      "inquiryId": "inq_88912",
      "dueDate": "2026-09-20T17:00:00.000Z",
      "priority": "High",
      "status": "Pending",
      "assignedTo": "Rahul Verma"
    }
  ]
}
```

#### `GET /api/follow-ups/:id/download-pdf`
- **Auth Required:** Yes (Permission: `tasks:view`)
- **Description:** Generates and streams dynamic binary PDF document for offline field use.

---

### 2.12 Telephony Calls & Communications Module

#### `POST /api/calls`
- **Auth Required:** Yes (Permission: `communications:create`)
- **Request Body:**
```json
{
  "inquiryId": "inq_78102",
  "companyId": "comp_dahej_01",
  "contactName": "Mr. Rajesh Pareek",
  "direction": "Outbound",
  "durationMinutes": 14,
  "outcome": "Interested",
  "notes": "Client verified that power sanctioned load of 250 kVA matches machinery requirement."
}
```

---

### 2.13 Notifications & Audit Logging Module

#### `GET /api/notifications`
- **Auth Required:** Yes (Authenticated)
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "unreadCount": 2,
  "data": [
    {
      "id": "notif_01",
      "title": "Deal Converted to Closed Won 🎉",
      "message": "Inquiry INQ-6221 for Pareek Logistics was marked Closed Won.",
      "read": false,
      "createdAt": "2026-09-19T08:00:00.000Z"
    }
  ]
}
```

#### `GET /api/audit-logs`
- **Auth Required:** Yes (`admin` or `super_admin`)
- **Description:** Tamper-evident operational audit trail.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "aud_8819",
      "userEmail": "admin@fairway.com",
      "action": "STAGE_TRANSITION",
      "entity": "inquiries",
      "entityId": "inq_6221",
      "ipAddress": "127.0.0.1",
      "timestamp": "2026-09-19T08:00:00.000Z"
    }
  ]
}
```

---

### 2.14 Bulk Data Migration & Excel Importer

#### `POST /api/import/inquiries`
- **Auth Required:** Yes (Permission: `inquiries:create`)
- **Request Payload:** `multipart/form-data` with `.xlsx` or `.csv` file.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "importedCount": 42,
  "failedCount": 0,
  "warnings": []
}
```
