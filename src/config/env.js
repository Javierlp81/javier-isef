import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde el archivo .env en la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'dev_secret_isef_gastos_default_key_2026',
  dbPath: process.env.DB_PATH || './data/gastos.db',
  limiteEfectivoDeducible: parseFloat(process.env.LIMITE_EFECTIVO_DEDUCIBLE) || 2000.00,
  cookieSecure: process.env.COOKIE_SECURE === 'true'
};
