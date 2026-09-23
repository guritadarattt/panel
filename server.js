// server.js
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import config from './src/config/index.js';
import { attachUser } from './src/middleware/auth.js';
import { issueCsrf, verifyCsrf } from './src/middleware/csrf.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import { apiLimiter } from './src/middleware/rateLimit.js';
import apiRoutes from './src/routes/index.js';
import { attachConsoleServer } from './src/websocket/consoleServer.js';
import { pruneExpiredSessions } from './src/services/sessionService.js';
import { logger } from './src/utils/logger.js';

const app = express();

if (config.trustProxy) app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(attachUser);
app.use(issueCsrf);
app.use('/api', apiLimiter, verifyCsrf, apiRoutes);

// static
app.use(express.static(path.join(process.cwd(), 'public'), { index: false }));
app.get('/', (_req, res) => res.sendFile(path.join(process.cwd(), 'public/login.html')));
app.get('/dashboard', (_req, res) => res.sendFile(path.join(process.cwd(), 'public/dashboard.html')));
app.get('/account', (req, res) => res.sendFile(path.join(process.cwd(), 'public/account.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(process.cwd(), 'public/admin.html')));
app.get('/server', (_req, res) => res.sendFile(path.join(process.cwd(), 'public/server.html')));

app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = http.createServer(app);
import { attachShellServer } from './src/websocket/shellServer.js';
// ...
attachConsoleServer(httpServer);
attachShellServer(httpServer);

setInterval(() => pruneExpiredSessions().catch(() => {}), 15 * 60 * 1000).unref();

httpServer.listen(config.port, config.host, () => {
  logger.info(`Gurita Panel listening on http://${config.host}:${config.port}`);
});

process.on('uncaughtException', (e) => logger.error('uncaughtException', { message: e.message, stack: e.stack }));
process.on('unhandledRejection', (e) => logger.error('unhandledRejection', { message: String(e) }));