import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../app.js';

// Mock dependencies to avoid actual DB/WS/AI calls during test
vi.mock('../db.js', () => ({
  db: {
    query: vi.fn(),
  },
}));

vi.mock('../ws.js', () => ({
  broadcastFeedbackUpdate: vi.fn(),
  registerWebSocketHandler: vi.fn(),
}));

vi.mock('../ai.js', () => ({
  analyzeFeedbackAsync: vi.fn().mockResolvedValue(undefined),
}));

describe('Feedback Routes Validation', () => {
  let app: any;

  beforeEach(async () => {
    app = await buildApp();
  });

  it('should accept feedback containing script tags (safe storage policy)', async () => {
    const { db } = await import('../db.js');
    (db.query as any).mockResolvedValueOnce({
      rows: [{ id: 1, content: 'Hello <script>alert(1)</script>', status: 'RECEIVED' }]
    });

    const response = await app.inject({
      method: 'POST',
      url: '/feedback',
      payload: {
        content: 'Hello <script>alert(1)</script>',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.content).toBe('Hello <script>alert(1)</script>');
  });

  it('should accept feedback containing HTML tags (safe storage policy)', async () => {
    const { db } = await import('../db.js');
    (db.query as any).mockResolvedValueOnce({
      rows: [{ id: 1, content: 'Hello <div>content</div>', status: 'RECEIVED' }]
    });

    const response = await app.inject({
      method: 'POST',
      url: '/feedback',
      payload: {
        content: 'Hello <div>content</div>',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.content).toBe('Hello <div>content</div>');
  });

  it('should return 200 for clean feedback text', async () => {
    const { db } = await import('../db.js');
    (db.query as any).mockResolvedValueOnce({
      rows: [{
        id: 1,
        content: 'Excellent product!',
        status: 'RECEIVED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sentiment: null,
        feature_group: null
      }]
    });

    const response = await app.inject({
      method: 'POST',
      url: '/feedback',
      payload: {
        content: 'Excellent product!',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.content).toBe('Excellent product!');
  });
});
