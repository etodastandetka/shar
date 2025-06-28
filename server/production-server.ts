import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes-sqlite";
// import { serveStatic, log } from "./vite"; // Не импортируем из vite.ts
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { setupAuth } from "./auth-sqlite";
import { initializeDatabase } from './auth-sqlite';
import { Server } from "http"; // Импортируем Server

// Создаем директорию для SQLite, если она не существует
const dbDir = join(process.cwd(), 'db');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Создаем директорию для загрузок, если она не существует
const uploadsDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Простая функция логирования для production
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Запускаем миграцию SQLite перед запуском сервера
import('./migrate-sqlite')
  .then(() => {
    console.log('SQLite database initialized');
  })
  .catch((err) => {
    console.error('Failed to initialize SQLite database', err);
    process.exit(1);
  });


async function startServer() {
  try {
    // Инициализируем базу данных
    await initializeDatabase();

    // Настраиваем аутентификацию
    setupAuth(app);

    const server = await registerRoutes(app) as Server; // Указываем тип Server

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error(err);
    });

    // Production: Serve static files
    const staticPath = join(process.cwd(), 'dist', 'public');

    // Serve static assets
    app.use('/assets', express.static(join(staticPath, 'assets')));

    // Serve other static files
    app.use(express.static(staticPath));

    // Handle SPA fallback - must be after all other routes
    app.get('*', (req, res) => {
      res.sendFile(join(staticPath, 'index.html'), {
        headers: {
          'Content-Type': 'text/html',
        }
      });
    });


    const port = Number(process.env.PORT) || 5000;
    const host = process.env.HOST || '0.0.0.0';
    server.listen({
      port,
      host,
    }, () => {
      console.log(`Server running in production mode on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
      console.log(`Static files served from: ${join(process.cwd(), 'dist', 'public')}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer(); 