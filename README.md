# Momtaz Hijab E-commerce Backend

Backend API for the Momtaz Hijab e-commerce platform.

The backend provides APIs for customer accounts, product catalog, product variants, inventory, shopping carts, orders, payments, addresses, and administration.

## Tech Stack

- **Node.js**
- **NestJS**
- **TypeScript**
- **PostgreSQL**
- **Prisma ORM**
- **JWT with ES256**
- **AWS S3** for object/file storage
- **Swagger / OpenAPI**
- **Class Validator**
- **Docker** for deployment

## Main Features

### Customer

- Customer registration and authentication
- Login / logout
- Access token refresh
- Customer profile
- Customer addresses
- Product browsing
- Product categories
- Product variants
- Product images
- Inventory availability
- Shopping cart
- Order creation
- Order history
- Order details
- Payment information

### Admin

- Admin authentication
- Role-based access control
- User management
- Product management
- Category management
- Product variant management
- Inventory management
- Order management
- Customer management
- Customer address management
- Payment/order status management
- Dashboard statistics

## API Structure

All API endpoints use:

```text
/api/v1
```

Admin endpoints:

```text
/api/v1/admin/*
```

Customer/public endpoints:

```text
/api/v1/*
```

Example:

```text
POST   /api/v1/admin/auth/login
GET    /api/v1/admin/auth/me
POST   /api/v1/admin/auth/refresh
POST   /api/v1/admin/auth/logout
```

## Authentication

The backend uses JWT authentication with **ES256 (ECDSA P-256)**.

Authentication uses short-lived access tokens, refresh token rotation, server-side session tracking, and role-based authorization.

### Token Lifetime

```env
ACCESS_TOKEN_EXP=15m
REFRESH_TOKEN_EXP=7d
```

### JWT Keys

```env
JWT_ALGORITHM=ES256

JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

JWT_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
```

The private key must never be committed to Git or exposed to the frontend.

## Admin Authentication

Admin login:

```http
POST /api/v1/admin/auth/login
```

Request:

```json
{
  "username": "admin@example.com",
  "password": "password"
}
```

Only users with an administrative role can access the admin panel. Customer accounts cannot authenticate through admin authentication endpoints.

### Endpoints

```text
POST /api/v1/admin/auth/login
GET  /api/v1/admin/auth/me
POST /api/v1/admin/auth/refresh
POST /api/v1/admin/auth/logout
```

Authenticated requests use:

```http
Authorization: Bearer <access_token>
```

Refresh token:

```http
POST /api/v1/admin/auth/refresh
```

```json
{
  "refresh_token": "..."
}
```

The refresh operation rotates the refresh token and issues a new access token.

Logout revokes the current authentication session.

## Roles and Authorization

The backend uses role-based access control (RBAC).

Example roles:

```text
SUPER_ADMIN
ADMIN
STAFF
CUSTOMER
```

Administrative permissions must be enforced at the backend level and must not rely only on frontend route protection.

### SUPER_ADMIN

Full administrative access including user, role, product, inventory, order, customer, and system configuration management.

### ADMIN

General management access.

### STAFF

Limited operational access such as orders, customers, inventory, and product information.

### CUSTOMER

Customer-facing access only.

Customers must not be able to access `/api/v1/admin/*`.

## Initial Admin Setup

There is no public admin registration endpoint and no hardcoded default administrator password.

The first `SUPER_ADMIN` should be created through a trusted database seed/bootstrap process.

```bash
npm run build
```

Example environment variables:

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=strong-password
```

The bootstrap process must refuse to overwrite an existing administrator account.

## Database

The application uses:

```text
PostgreSQL
    │
    ▼
 Prisma
    │
    ▼
NestJS Services
```

Prisma schema:

```text
prisma/schema.prisma
```

Database migrations:

```text
prisma/migrations/
```

Prisma is the ORM and database access layer. Application code should use the Prisma service rather than creating direct database connections inside individual resources.

Keep database queries explicit and avoid unnecessary relation loading.

Prefer `select` or carefully scoped `include` instead of loading complete related entities.

## Performance Guidelines

The backend should avoid unnecessary database and API work.

### Avoid Eager Loading

Do not automatically load large relation trees.

Avoid loading products, variants, and inventory together when the endpoint does not require all of them.

Request only the fields and relations required by the endpoint.

### Use Selective Queries

Prefer:

```ts
select: {
  id: true,
  name: true,
  price: true,
}
```

over returning complete database records.

### Pagination

Collection endpoints should use pagination.

Example:

```text
GET /api/v1/products?page=1&limit=20
```

Do not return unlimited database records from API endpoints.

### Indexing

Database indexes should be added based on:

- Foreign keys
- Frequently filtered columns
- Frequently sorted columns
- Unique lookup fields
- Common query combinations

Do not add indexes blindly. Every index should have a query/use-case justification because indexes also increase write and storage costs.

### Transactions

Use database transactions when multiple related writes must succeed or fail together.

Examples:

- Creating an order
- Updating inventory after an order
- Cancelling an order and restoring inventory
- Updating multiple related records

## File Storage

Product and other uploaded images are stored using an object-storage abstraction.

Current storage:

```text
AWS S3
```

Business modules should interact with storage through the shared storage service rather than directly calling the R2 SDK.

Example:

```ts
await this.storageService.upload(...)
```

Storage implementation belongs under:

```text
src/shared/storage/
```

This keeps infrastructure replaceable and business logic independent.

### R2 Environment Variables

```env
STORAGE_PROVIDER=r2

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
AWS_DEFAULT_REGION=ap-southeast-1
AWS_S3_PUBLIC_URL=https://assets.example.com
```

Never commit R2 credentials.

## Environment Variables

Create a local `.env` file.

```env
NODE_ENV=development
PORT=5000

DATABASE_URL=postgresql://username:password@localhost:5432/momtaz_hijab

CORS_ORIGINS=http://localhost:3000,http://localhost:8080

JWT_ALGORITHM=ES256
ACCESS_TOKEN_EXP=15m
REFRESH_TOKEN_EXP=7d

JWT_PUBLIC_KEY="..."
JWT_PRIVATE_KEY="..."

STORAGE_PROVIDER=r2

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
AWS_DEFAULT_REGION=ap-southeast-1
AWS_S3_PUBLIC_URL=https://assets.example.com

SWAGGER_ENABLED=true
```

Never commit:

```text
.env
.env.local
.env.production
```

Commit only an `.env.example` with secret values removed.

## CORS

Configure trusted frontend origins through:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

Production should contain only trusted frontend domains.

Do not use:

```env
CORS_ORIGINS=*
```

for authenticated production APIs.

## Validation and DTO Rules

Every request payload should use a dedicated DTO.

Example:

```ts
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}
```

Validation should happen at the API boundary. Do not trust client-side validation.

Organize reusable DTO exports through an `index.ts` file where appropriate:

```text
resources/
└── badminton-courts/
    └── dto/
        ├── badminton-courts.dto.ts
        └── index.ts
```

```ts
export * from './badminton-courts.dto';
```

Then:

```ts
import { CreateBadmintonCourtDto } from './dto';
```

Do not duplicate DTO definitions across controllers and services.

## Shared Components

Reusable infrastructure should be separated from business resources.

```text
src/shared/
├── storage/
├── cache/
├── database/
├── logger/
└── ...
```

Business modules should consume shared services through dependency injection.

Example:

```text
ProductsService
      │
      ▼
StorageService
      │
      ▼
R2StorageProvider
```

## API Documentation

Swagger/OpenAPI is available during development:

```text
/api/docs
```

Swagger JSON:

```text
/api/docs-json
```

Swagger should be disabled or protected appropriately in production.

## Error Handling

Use NestJS exception handling consistently.

Do not expose:

- Database credentials
- JWT private keys
- Internal stack traces
- SQL queries
- Infrastructure credentials
- Sensitive user information

Production responses should contain safe, meaningful error messages.

## Security Practices

The backend should:

- Validate all incoming requests
- Authenticate protected endpoints
- Authorize resources using RBAC
- Hash user passwords using a secure password hashing algorithm
- Hash refresh tokens before persistence where applicable
- Rotate refresh tokens
- Revoke sessions on logout
- Never store plaintext passwords
- Never expose JWT private keys
- Never expose storage credentials
- Restrict CORS origins
- Apply rate limiting to authentication endpoints
- Avoid leaking whether sensitive accounts exist
- Sanitize and validate uploaded files
- Restrict upload file size and MIME types

## Product Images

Product images should not be stored directly in PostgreSQL as binary data.

Store files in object storage and keep the relevant object key/URL in the database.

```text
PostgreSQL
    │
    └── ProductImage
          ├── id
          ├── product_id
          ├── storage_key
          └── url

AWS S3
    │
    └── products/
          ├── image-1.webp
          ├── image-2.webp
          └── image-3.webp
```

## Order and Inventory Consistency

Inventory operations must be handled carefully to avoid overselling.

Order creation should use appropriate database transactions and concurrency-safe inventory updates.

Do not perform a simple read-check-update sequence without considering concurrent requests.

The inventory update should be atomic where required.

## Development

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev
```

Start development server:

```bash
npm run start:dev
```

Build:

```bash
npm run build
```

Start production build:

```bash
npm run start:prod
```

## Testing

Unit tests:

```bash
npm run test
```

Watch mode:

```bash
npm run test:watch
```

Coverage:

```bash
npm run test:cov
```

E2E tests:

```bash
npm run test:e2e
```

## Git Workflow

Keep commits focused and descriptive.

Examples:

```text
feat(products): add product variant management
feat(storage): integrate Aws S3
feat(auth): implement refresh token rotation
fix(inventory): prevent negative stock
fix(orders): handle concurrent inventory updates
refactor(storage): extract reusable storage provider
docs(readme): update backend setup instructions
```

Never commit:

```text
.env
.env.local
.env.production
node_modules/
dist/
logs/
```

## Production Checklist

Before production deployment:

- [ ] Set production `DATABASE_URL`
- [ ] Generate a dedicated JWT key pair
- [ ] Set `JWT_PRIVATE_KEY`
- [ ] Set `JWT_PUBLIC_KEY`
- [ ] Use a strong production database password
- [ ] Configure production CORS origins
- [ ] Configure production R2 credentials
- [ ] Use a production storage bucket
- [ ] Disable or protect Swagger
- [ ] Enable authentication rate limiting
- [ ] Configure secure cookies where applicable
- [ ] Enable HTTPS
- [ ] Configure database backups
- [ ] Configure application logging
- [ ] Configure error monitoring
- [ ] Review database indexes
- [ ] Review API pagination
- [ ] Review authorization rules
- [ ] Verify inventory concurrency handling
- [ ] Remove development/test credentials
- [ ] Verify `.env` is not committed

## Environment Separation

Keep development and production resources separate.

```text
Development
├── PostgreSQL: development database
├── R2: momtaz-hijab-dev
├── JWT: development key pair
└── Frontend: localhost

Production
├── PostgreSQL: production database
├── R2: production bucket
├── JWT: production key pair
└── Frontend: production domain
```

Never use development credentials or storage buckets for production data.

## License

Private project for Momtaz Hijab.
