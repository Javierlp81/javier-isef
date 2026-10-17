import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`====================================================`);
  console.log(`Sistema de Control de Gastos ISEF iniciado`);
  console.log(`Servidor escuchando en: http://localhost:${env.port}`);
  console.log(`Entorno: ${env.nodeEnv}`);
  console.log(`====================================================`);
});

// Manejo de apagado ordenado (graceful shutdown)
function cerrarServidor() {
  console.log('\nCerrando servidor HTTP...');
  server.close(() => {
    console.log('Servidor finalizado con éxito.');
    process.exit(0);
  });
}

process.on('SIGINT', cerrarServidor);
process.on('SIGTERM', cerrarServidor);
