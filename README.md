# momtaz-hijab-ecommerce
Full-stack e-commerce platform for Momtaz Hijab, featuring product management, variants, inventory, shopping cart, orders, payments, and customer accounts.

## Admin authentication

The dashboard uses `POST /api/v1/admin/auth/login` with `{ "username": "admin email", "password": "password" }`.
Use an existing active user with an admin role; CUSTOMER accounts cannot sign in to the admin panel.
`GET /api/v1/admin/auth/me` and `POST /api/v1/admin/auth/logout` require a Bearer access token.
`POST /api/v1/admin/auth/refresh` accepts `{ "refresh_token": "..." }` and rotates both tokens.
Access tokens expire after 15 minutes; sessions expire after seven days and are revoked on logout.
Sessions are held in memory and are invalidated on restart. This implementation supports one backend process;
persistent shared sessions are needed before deploying multiple instances.
Set `JWT_SECRET` to a random value of at least 32 characters in production. Development generates an ephemeral secret if unset.
Set `CORS_ORIGINS` to comma-separated dashboard origins (defaults to localhost and 127.0.0.1 on port 8080).
User management now requires SUPER_ADMIN authentication. Provision the first super admin through a trusted database seed;
there is no public admin registration or hardcoded default password.
For an empty user table: build the backend, set ADMIN_EMAIL and ADMIN_PASSWORD in your shell,
then run `node dist/src/auth/bootstrap-admin.js`. This command refuses to overwrite existing accounts.
