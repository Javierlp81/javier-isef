import { getDatabase, ejecutarEsquema, closeDatabase } from '../config/database.js';

console.log('Aplicando migraciones a la base de datos...');
try {
  const db = getDatabase();
  ejecutarEsquema(db);
  console.log('Base de datos inicializada y tablas verificadas con éxito.');
} catch (error) {
  console.error('Error al aplicar el esquema de la base de datos:', error.message);
  process.exit(1);
} finally {
  closeDatabase();
}
