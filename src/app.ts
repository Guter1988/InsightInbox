import fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { feedbackRoutes } from './routes/feedback.js';
import { groupRoutes } from './routes/groups.js';
import { healthRoutes } from './routes/health.js';
import { WebsocketHub } from './ws/websocketHub.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildApp() {
  const app = fastify({ logger: true });

  // Plugins
  await app.register(fastifyWebsocket);
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/',
  });

  // Websocket
  app.get('/ws', { websocket: true }, (connection, req) => {
    WebsocketHub.getInstance().addClient((connection as any).socket);
    console.log('New WS connection established');
  });

  // Routes
  await app.register(feedbackRoutes);
  await app.register(groupRoutes);
  await app.register(healthRoutes);

  // Global error handler for Zod
  app.setErrorHandler((error, request, reply) => {
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Validation failed',
        details: (error as any).errors,
      });
    }
    reply.send(error);
  });

  return app;
}
