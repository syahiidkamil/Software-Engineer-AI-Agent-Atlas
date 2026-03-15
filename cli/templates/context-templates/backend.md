# Backend Development Conventions

## API Endpoint Conventions

### RESTful Resource Naming
- Use **plural nouns** for resources
- Use **kebab-case** for multi-word resources
- Keep URLs lowercase

#### Examples:
```
GET    /api/users           # Get all users
GET    /api/users/:id       # Get specific user
POST   /api/users           # Create new user
PUT    /api/users/:id       # Update entire user
PATCH  /api/users/:id       # Update partial user
DELETE /api/users/:id       # Delete user

GET    /api/user-profiles   # Multi-word resource
GET    /api/payment-methods # Another multi-word example
```

### HTTP Methods Usage
- **GET**: Retrieve data (safe, idempotent)
- **POST**: Create new resources
- **PUT**: Replace entire resource
- **PATCH**: Partial update
- **DELETE**: Remove resource

### Nested Resources
When resources have clear parent-child relationships:
```
GET    /api/users/:userId/orders     # User's orders
POST   /api/users/:userId/orders     # Create order for user
GET    /api/shops/:shopId/products   # Shop's products
```

### Query Parameters
Use for filtering, sorting, and pagination:
```
GET /api/products?category=electronics&sort=price-asc
GET /api/users?page=2&limit=20&status=active
```

---

## Response Format

### Success Response
```json
{
  "data": { ... }
}
```

### Success with Metadata (for lists/pagination)
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

---

## HTTP Status Codes

### Success
- **200 OK**: Request succeeded (GET, PUT, PATCH)
- **201 Created**: Resource created (POST)
- **204 No Content**: Success with no body (DELETE)

### Client Errors
- **400 Bad Request**: Malformed request syntax
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Authenticated but not authorized
- **404 Not Found**: Resource doesn't exist

### Server Errors
- **500 Internal Server Error**: Unexpected server error

---

## Error Response Format

### Standard Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data"
  }
}
```

### Validation Error (with field details)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "password", "message": "Must be at least 8 characters" }
    ]
  }
}
```
