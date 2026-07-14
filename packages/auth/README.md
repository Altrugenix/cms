# @arche-cms/auth

Authentication package for Arche CMS. Provides JWT-based auth with login, register, token refresh, and password reset flows.

## Installation

```bash
yarn add @arche-cms/auth
```

## Usage

### Auth Service

```ts
import { AuthService } from "@arche-cms/auth";

const auth = new AuthService(adapter, {
  secret: "your-jwt-secret",
  accessTokenExpiresIn: "15m",
  refreshTokenExpiresIn: "7d",
});

const { accessToken, refreshToken } = await auth.register({
  email: "user@example.com",
  password: "secure-password",
});

const { accessToken, refreshToken } = await auth.login({
  email: "user@example.com",
  password: "secure-password",
});

const user = await auth.verifyToken(accessToken);
```

### JWT Utilities

```ts
import { generateTokens, verifyToken } from "@arche-cms/auth";

const { accessToken, refreshToken } = await generateTokens(
  { id: "1", email: "user@example.com" },
  { secret: "jwt-secret", accessExpiresIn: "15m", refreshExpiresIn: "7d" },
);

const payload = await verifyToken(accessToken, "jwt-secret");
```

### Password Handling

```ts
import { hashPassword, verifyPassword } from "@arche-cms/auth";

const hash = await hashPassword("my-password");
const match = await verifyPassword("my-password", hash);
```
