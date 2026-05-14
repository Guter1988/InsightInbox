# Feedback Insight Inbox: Implementation Plan

This document serves as the high-level implementation plan and flow for the "Feedback Insight Inbox" task. The goal is to build a robust, product-oriented application that accepts user feedback, processes it asynchronously via an AI model (to extract insights and group similar feedback), and presents it in a usable UI.

## High-Level Requirements
- **Async AI Analysis**: Feedback submission must not be blocked by AI processing. Uses an async queue.
- **Persistence**: Store raw feedback, status, and structured AI response in a database.
- **Idempotent Grouping**: Group similar feedback across multiple locales/languages.
- **UI**: A simple, usable server-rendered or static UI with status updates (`RECEIVED`, `ANALYZING`, `DONE`, `FAILED`) and a retry mechanism.
- **Robustness**: Implement retries, error handling, structured logging, and JSON schema validation.

## Documentation Index

Please refer to the following linked documents for detailed specifications on each domain:

1. [Architecture & Stack Overview](./architecture.md)
2. [Data Model & Schema](./data_model.md)
3. [AI Strategy & Prompts](./ai_strategy.md)

---

## Step-by-Step Execution Flow

### Phase 1: Architecture & Tradeoffs
- Define the project scope and acknowledge constraints (3 hours).
- **Decisions Made**:
  - Focus on operational readiness rather than UI polish.
  - Use deterministic normalized grouping (via English translation/canonical label) over complex ML clustering to guarantee idempotency.
  - Implement a basic retry mechanism.
  - Retain the exact original text and language submitted by the user.

### Phase 2: Schema & DB Setup
- Setup the database (SQLite / PostgreSQL) according to the [Data Model](./data_model.md).
- Create tables: `feedback`, `feedback_groups`, and jobs/queues tracking (if separate).
- Seed initial data if necessary.

### Phase 3: Core Endpoints (Submit & List)
- Implement `POST /api/feedback`:
  - Receives raw text.
  - Inserts into DB with `RECEIVED` status.
  - Enqueues an async job.
  - Returns immediate success to UI.
- Implement `GET /api/feedback`:
  - Returns lists of feedback items with their processing statuses and group labels.

### Phase 4: Async Queue & Processing
- Setup the worker/queue system.
- For each job:
  - Transition status to `ANALYZING`.
  - Send to AI service (see [AI Strategy](./ai_strategy.md)).
  - Handle failures: Transition to `FAILED` and support manual retry.
  - On success: Move to grouping step.

### Phase 5: Grouping Logic (Idempotent)
- Upon receiving `canonical_label_en` from AI:
  - Normalize string (lowercase, trim, remove punctuation).
  - Look up existing `feedback_groups` by the normalized key.
  - If exists: Associate feedback to the group.
  - If new: Create a new group record.
  - Update feedback status to `DONE`.

### Phase 6: User Interface (UI)
- Build a lightweight frontend (Vanilla JS/HTML or simple SSR).
- Form to submit feedback.
- List view displaying feedback text, statuses, AI extracted insights (sentiment, actions), and grouping labels.
- Implement a `Retry` button for `FAILED` feedback.
- Display empty states ("No feedback yet").

### Phase 7: Delivery & Polish
- Add Docker setup (`Dockerfile`, `docker-compose.yml`).
- Add CI configuration (e.g., GitHub Actions).
- Finalize `README.md` and `AI_COLLABORATION_LOG.md`.
