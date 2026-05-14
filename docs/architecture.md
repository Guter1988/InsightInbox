# Architecture & Stack Overview

The architectural direction for the Feedback Insight Inbox prioritizes reliability, maintainability, and operational readiness, adhering to MSP/MSSP industry standards. 

## Technology Stack
- **Backend Framework**: Node.js with Fastify (lightweight, performant, schema-oriented).
- **Language**: TypeScript (strong typing, predictable interfaces).
- **Database**: SQLite or PostgreSQL. (SQLite is recommended for rapid 3-hour setups without compromising persistence).
- **Validation**: Zod (strict validation for both incoming requests and AI-generated outputs).
- **Logging**: Pino (structured JSON logging for observability).
- **AI Integration**: OpenAI SDK (utilizing structured outputs to guarantee deterministic JSON).
- **Testing**: Vitest (fast, lightweight testing focusing on integration flows).
- **Infrastructure**: Docker (multi-stage builds, non-root users) and GitHub Actions (CI pipeline).

## System Design
1. **Route -> Controller -> Service Pattern**: Keeps routing distinct from business logic without overengineering repositories (unless using a complex ORM).
2. **Centralized Error Handling**: Custom error classes (`AppError`, `BadRequestError`, `InternalServerError`, `UpstreamServiceError`) caught via a unified Fastify error handler.
3. **Observability**: Expose a `GET /health` endpoint containing uptime and system status.
4. **Resiliency**: The AI processing service requires retry logic (e.g., exponential backoff) for transient API failures (429, 5xx).

## Trade-offs Highlighted
Given the strict 3-hour constraint:
- **No Complex ML Clustering**: Chose deterministic text-normalization for grouping to ensure idempotency.
- **Minimal UI**: Focus shifted toward a functional server-rendered or basic HTML/JS frontend showing state transitions rather than a comprehensive Single Page Application.
- **No Authentication**: Omitted to focus solely on the core async AI workflow and data integrity.
