import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { getDatabase } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createGastosRouter } from './routes/gastos.routes.js';
import { createResumenRouter } from './routes/resumen.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(customDb = null) {
  const app = express();
  const db = customDb || getDatabase();

  // Parseo de cuerpos JSON y URL-encoded
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Configuración de sesiones con cookies HTTP-only
  app.use(
    session({
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.cookieSecure,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      }
    })
  );

  // Servir archivos estáticos del frontend
  app.use(express.static(path.resolve(__dirname, '../public')));

  // Rutas de autenticación
  app.use('/api', createAuthRouter(db));

  // Rutas de gestión de gastos y resumen mensual
  app.use('/api/gastos', createGastosRouter(db));
  app.use('/api/resumen', createResumenRouter(db));

  // Manejador de rutas no encontradas para la API
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Ruta de la API no encontrada.' });
  });

  // Manejador centralizado de errores
  app.use(errorHandler);

  return app;
}
