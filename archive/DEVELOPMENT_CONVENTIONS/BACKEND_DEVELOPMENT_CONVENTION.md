# DEVELOPMENT CONVENTION

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

### Example Implementation
```javascript
// Good: Plural resources, proper HTTP methods
router.get('/api/products', getProducts);
router.get('/api/products/:id', getProduct);
router.post('/api/products', createProduct);
router.patch('/api/products/:id', updateProduct);
router.delete('/api/products/:id', deleteProduct);
```
