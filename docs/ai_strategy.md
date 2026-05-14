# AI Strategy & Prompts

The core engine relies on AI to extract structured insights and standardize terminology across different languages (Multi-locale support) for grouping.

## Output Structure (Zod Schema Enforcement)
The LLM must return strict JSON matching this schema:
```json
{
  "sentiment": "Positive | Neutral | Negative",
  "feature_requests": ["string"],
  "actionable_insight": "string",
  "canonical_label_en": "string",
  "display_label": "string"
}
```
*Note: We enforce this using the `response_format` configuration in the OpenAI SDK and validate the result natively via Zod upon parsing.*

## Prompt Design
The prompt should enforce operationally useful, deterministic results without conversational fluff.

**System Prompt:**
```text
You are a managed operations analyst for InsightInbox.
Your task is to analyze incoming user feedback (which could be in any language) and classify it consistently.
You must return ONLY valid JSON.
Rules:
- Preserve the exact sentiment of the user.
- actionable_insight must be a concise, practical recommendation.
- canonical_label_en MUST be a short English phrase capturing the core issue, formatted in lowercase with underscores (e.g., "slow_loading_dashboard"). This is critical for system-wide idempotent grouping.
- display_label can be in the original language if appropriate, representing a user-friendly category name.
- Return ONLY JSON. No markdown, no prose.
```

**User Prompt Template:**
```text
Analyze the following feedback event.
Original Content: {{feedback.content}}

Return valid JSON only.
```

## Idempotent Grouping Algorithm
To prevent the LLM from creating random redundant groups on retry, we rely on the `canonical_label_en`:
1. Receive `canonical_label_en` from AI.
2. Normalize it in code: `key = canonical_label_en.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')`
3. Lookup `feedback_groups` where `canonical_key == key`.
4. If found, link the feedback to this group.
5. If missing, insert a new row into `feedback_groups` using `key` and `display_label`, then link it.

## Error Handling
- Validate output immediately with Zod.
- If JSON parsing fails or Zod validation fails, throw an `InternalServerError`.
- The async worker will catch this, set the feedback status to `FAILED`, and the UI will allow the user to trigger a Retry.
