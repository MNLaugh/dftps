# Welcome

Thank you for your interest in this project.

> Do not hesitate to tell us about your observation and/or discovery of bugs.

## Requirements

- [Deno 2.x](https://deno.com/) or later
- [mkcert](https://github.com/FiloSottile/mkcert) (optional, for TLS testing)

## How to contribute

1. Fork and clone this repository

   ```sh
   git clone https://github.com/YOUR_USERNAME/DFtpS.git
   cd DFtpS
   ```

2. Install dependencies

   ```sh
   deno cache deps.ts
   ```

3. Make your changes

4. Run checks before submitting

   ```sh
   # Format code
   deno fmt

   # Lint code
   deno lint

   # Type check
   deno check mod.ts

   # Run tests
   deno test --allow-all
   ```

5. Submit your pull request to the `main` branch

## Development Commands

| Command           | Description              |
| ----------------- | ------------------------ |
| `deno task dev`   | Start development server |
| `deno task test`  | Run all tests            |
| `deno task check` | Type check               |
| `deno task lint`  | Run linter               |
| `deno task fmt`   | Format code              |

## Project Structure

```txt
src/
├── cli/           # CLI commands (serve, users, upgrade)
├── db/            # Database layer (SQLite, Users repository)
├── server/        # FTP server core
│   ├── commands/  # FTP command handlers
│   └── connectors/# Active/Passive mode connectors
└── _utils/        # Utility functions
tests/             # Unit and integration tests
tools/             # Development tools and scripts
```

## Code Style

- Use TypeScript strict mode
- Follow Deno's formatting conventions (`deno fmt`)
- Write tests for new features
- Document public APIs with JSDoc

## Testing

- Unit tests: `tests/database_test.ts`, `tests/users_test.ts`, `tests/server_test.ts`
- Integration tests: `tests/integration_test.ts` (requires TLS certificates)
- Manual TLS test: `deno run -A tools/test-ftp.ts`
