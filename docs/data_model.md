# Data Model & Schema

The system uses a simple relational model to track feedback submissions, their processing state, and the resultant grouped concepts.

## 1. Table: `feedback`
Stores the raw user input and tracks the lifecycle of the analysis.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID / INT | Primary identifier. |
| `content` | TEXT | The raw feedback text precisely as submitted by the user. |
| `locale` | VARCHAR | Language or locale (e.g., 'en', 'he', 'unknown'). |
| `status` | ENUM | Tracks progress: `RECEIVED`, `ANALYZING`, `DONE`, `FAILED`. |
| `raw_ai_response`| TEXT | The raw JSON string returned by the LLM (for auditing/collaboration). |
| `analysis_json` | JSON | The validated extracted data (sentiment, etc.). |
| `group_id` | FK | References `feedback_groups.id` (Nullable until `DONE`). |
| `created_at` | TIMESTAMP| Submission time. |
| `updated_at` | TIMESTAMP| Last state change. |

## 2. Table: `feedback_groups`
Represents the clusters of similar feedback. Grouping is idempotent and based on a canonical English key.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID / INT | Primary identifier. |
| `canonical_key`| VARCHAR | A normalized, English string (e.g., "login_issue_mobile"). Used for exact matching. |
| `label` | VARCHAR | A human-readable display label for the group. |
| `created_at` | TIMESTAMP| Creation time. |
| `updated_at` | TIMESTAMP| Last update time. |

## 3. Table: `analysis_jobs` (Optional)
If not using in-memory queues, a dedicated job table can track the worker queue. Alternatively, the `status` column in the `feedback` table is sufficient for a 3-hour constraint.
