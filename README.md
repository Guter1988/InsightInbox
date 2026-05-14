# InsightInbox - Feedback Analysis Platform

A robust, multilingual feedback analysis system powered by a local LLM (Ollama).

## Features
- **Asynchronous Analysis**: Feedback is processed in the background, ensuring a snappy user experience.
- **Strict Structured Output**: AI analysis is validated using Zod to ensure data integrity.
- **Deterministic Grouping**: Similar feedback is automatically clustered into stable categories.
- **Multi-Locale Support**: Full Unicode compatibility for feedback in any script (Hebrew, Arabic, Japanese, etc.).
- **Real-time Updates**: Live dashboard updates via WebSockets as analysis completes.
- **Modern UI**: Clean, glassmorphism-inspired interface built with vanilla JS.

## Tech Stack
- **Backend**: Node.js, TypeScript, Fastify
- **Database**: PostgreSQL
- **AI Engine**: Ollama (Llama 3.1)
- **Validation**: Zod
- **Frontend**: Vanilla HTML/CSS/JS
- **Infrastucture**: Docker Compose

## Getting Started

### 1. Prerequisites
- Docker and Docker Compose installed.

### 2. Run the Application
Start the entire stack with one command:
```bash
docker compose up -d
```
The first run will automatically pull the `llama3.1` model (approx. 4.7GB).

### 3. Seed Sample Data
Populate the database with diverse test cases:
```bash
npm run seed:samples
```

### 4. Access
- **Dashboard**: [http://localhost:3000](http://localhost:3000)

## Design Decisions

### Background Worker & Retry Strategy
We use a polling-based background worker (`src/worker/feedbackWorker.ts`) that runs every 1 second. 
- **Failures**: If Ollama is transiently down, the record stays in `ANALYZING`.
- **Retries**: A stale processing logic picks up records stuck in `ANALYZING` for >1 minute and retries them up to 5 times.
- **Why?**: Polling avoids the need for an external queue (like Redis) while providing robust retry-ability for this scale.

### Grouping Strategy
Grouping is performed deterministically by the `GroupingService`.
1. The AI generates a `canonical_group_label`.
2. The service normalizes this label (lowercase, trimming, alphanumeric-only keys).
3. If an existing group matches the key, it is joined; otherwise, a new group is created.
4. This ensures stable grouping even if phrasing varies slightly.

### Multi-Locale Verification
End-to-end Unicode support is baked into every layer:
- **UI**: `<meta charset="UTF-8">` and `.textContent` for safe rendering.
- **DB**: PostgreSQL initialized with UTF8.
- **AI**: System prompts structured to support multilingual data extraction.
Verified with Hebrew, Arabic, Japanese, Russian, Hindi, and Emojis.

### AI Security Guardrails

This application implements several layers of security to mitigate common AI-related risks, specifically focusing on Prompt Injection and Unsafe Output.

### Key Threats Addressed
1.  **Prompt Injection**: Malicious users attempting to hijack the LLM core instructions (e.g., "Ignore previous instructions").
2.  **Unsafe Output**: The model potentially returning malformed JSON or leaking internal instructions.
3.  **Resource Abuse**: Handling excessively long or complex inputs that could tie up resources.
4.  **XSS & Payload Injection**: Ensuring adversarial payloads (HTML/JS) are treated as data and rendered safely.

### Mitigations
- **Structured Prompt Delimiters**: User content is wrapped in explicit `================` delimiters with strict instructions to treat the enclosed text as untrusted data only.
- **Input Pre-validation**: A lightweight security utility scans for common injection patterns and logs them for auditing.
- **Strict Output Schema**: A Zod schema enforces the structure of the AI's response. Any deviation (missing fields, wrong types) triggers a failure/retry flow.
- **Output Sanitization**: The raw AI response is sanitized to remove any leaked internal tokens or suspicious HTML markers before being parsed or stored.
- **Least Privilege Architecture**: The LLM is used strictly for stateless analysis. It has no access to the database or system commands.
- **Safe Frontend Rendering**: All user-submitted and AI-generated content is rendered using `textContent` to prevent XSS.

### Limitations
- **Cat-and-Mouse Game**: Prompt injection is an evolving field; no static detection pattern is 100% effective against sophisticated obfuscation.
- **Model-Specific Behavior**: Different LLMs may have varying levels of instruction-following consistency.

### Why User Text is Untrusted
In this system, we treat user feedback as **pure data**. We never allow the model to make security-critical decisions without application-layer validation, and we ensure the model's output is treated as untrusted until it passes schema validation and sanitization.

**For a deep dive into the security architecture, see [docs/security_review.md](./docs/security_review.md).**

## API Summary
- `POST /feedback`: Submit new feedback.
- `GET /feedbacks`: List all feedback with analysis and group info.
- `GET /feedback/:id`: Detailed view of a single feedback item.
- `GET /groups`: Get cluster statistics and member counts.
- `GET /health`: System health check.

## Trade-offs & Future Improvements
- **In-process Worker**: Simple to deploy but doesn't scale horizontally. In a production environment, we would use a distributed queue like RabbitMQ or BullMQ.
- **Model Size**: Llama 3.1 is high quality but heavy. For faster response times, a smaller model like Phil-3 or Mistral could be used.
- **Search**: Adding a full-text search capability in PostgreSQL (pg_trgm) would be the next logical feature.
