import { pool } from '../db.js';

export interface FeedbackRecord {
  id: number;
  content: string;
  status: 'RECEIVED' | 'ANALYZING' | 'DONE' | 'FAILED';
  retry_count: number;
  raw_ai_response?: string;
  analysis_json?: any;
  group_id?: number;
  created_at: Date;
  updated_at: Date;
}

export class FeedbackRepository {
  async create(content: string): Promise<FeedbackRecord> {
    const res = await pool.query(
      'INSERT INTO feedback (content, status) VALUES ($1, $2) RETURNING *',
      [content, 'RECEIVED']
    );
    return res.rows[0];
  }

  async findById(id: number): Promise<FeedbackRecord | null> {
    const res = await pool.query('SELECT f.*, g.label as group_label FROM feedback f LEFT JOIN feedback_groups g ON f.group_id = g.id WHERE f.id = $1', [id]);
    return res.rows[0] || null;
  }

  async findAll() {
    const res = await pool.query(`
      SELECT f.*, g.label as group_label 
      FROM feedback f 
      LEFT JOIN feedback_groups g ON f.group_id = g.id 
      ORDER BY f.created_at DESC
    `);
    return res.rows;
  }

  async findByStatus(status: string) {
    const res = await pool.query('SELECT * FROM feedback WHERE status = $1', [status]);
    return res.rows;
  }

  async findStaleAnalyzing(timeoutMs: number) {
    const res = await pool.query(
      'SELECT * FROM feedback WHERE status = $1 AND updated_at < NOW() - ($2 || \' milliseconds\')::interval',
      ['ANALYZING', timeoutMs]
    );
    return res.rows;
  }

  async update(id: number, updates: Partial<FeedbackRecord>) {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    
    const res = await pool.query(
      `UPDATE feedback SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return res.rows[0];
  }
}
