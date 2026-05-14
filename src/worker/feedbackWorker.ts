import { FeedbackRepository } from '../repositories/feedbackRepository.js';
import { FeedbackAnalysisService } from '../services/feedbackAnalysisService.js';
import { config } from '../config.js';
import { WebsocketHub } from '../ws/websocketHub.js';

export class FeedbackWorker {
  private repo = new FeedbackRepository();
  private service = new FeedbackAnalysisService();
  private wsHub = WebsocketHub.getInstance();
  private isRunning = false;

  start() {
    this.poll();
  }

  private async poll() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.processNewFeedback();
      await this.retryStaleFeedback();
    } catch (err) {
      console.error('Worker polling error:', err);
    } finally {
      this.isRunning = false;
      setTimeout(() => this.poll(), config.workerInterval);
    }
  }

  private async processNewFeedback() {
    const pending = await this.repo.findByStatus('RECEIVED');
    for (const item of pending) {
      await this.repo.update(item.id, { status: 'ANALYZING' });
      this.broadcastUpdate(item.id, 'ANALYZING');
      
      this.service.processFeedback(item.id, item.content)
        .then(() => this.broadcastUpdate(item.id, 'DONE'))
        .catch((err) => {
          console.error(`[WORKER] Error processing feedback ${item.id}: ${err.message}`);
        });
    }
  }

  private async retryStaleFeedback() {
    const stale = await this.repo.findStaleAnalyzing(config.staleTimeoutMs);
    for (const item of stale) {
      if (item.retry_count >= config.maxRetries) {
        console.error(`[WORKER] Feedback ${item.id} reached max retries (${config.maxRetries}). Marking as FAILED.`);
        await this.repo.update(item.id, { status: 'FAILED' });
        this.broadcastUpdate(item.id, 'FAILED');
      } else {
        const nextRetry = item.retry_count + 1;
        await this.repo.update(item.id, { 
          retry_count: nextRetry
        });
        
        console.log(`[WORKER] Retrying feedback ${item.id} (attempt ${nextRetry}/${config.maxRetries})`);
        
        this.service.processFeedback(item.id, item.content)
          .then(() => {
            console.log(`[WORKER] Feedback ${item.id} processed successfully on retry ${nextRetry}.`);
            this.broadcastUpdate(item.id, 'DONE');
          })
          .catch((err) => console.error(`[WORKER] Retry ${nextRetry} failed for ${item.id}: ${err.message}`));
      }
    }
  }

  private async broadcastUpdate(id: number, status: string) {
    const item = await this.repo.findById(id);
    if (item) {
      this.wsHub.broadcast({
        id: item.id,
        status: item.status,
        sentiment: item.analysis_json?.sentiment || 'pending',
        group: (item as any).group_label || 'pending',
        updated_at: item.updated_at.toISOString()
      });
    }
  }
}
