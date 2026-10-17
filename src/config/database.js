import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export function getDatabase(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const targetPath = customPath || env.dbPath;

  // Si la ruta es en memoria para tests
  if (targetPath === ':memory:') {
    const memoryDb = new Database(':memory:');
    memoryDb.pragma('foreign_keys = ON');
    ejecutarEsquema(memoryDb);
    return memoryDb;
  }

  // Asegurar que exista el directorio padre si es archivo
  const resolvedPath = path.resolve(process.cwd(), targetPath);
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Inicializar tablas automáticamente si no existen
  ejecutarEsquema(db);

  if (!customPath) {
    dbInstance = db;
  }

  return db;
}

export function ejecutarEsquema(db) {
  const schemaPath = path.resolve(__dirname, '../db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql);
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
