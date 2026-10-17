/**
 * Middleware centralizado de manejo de errores.
 * Garantiza que ante un fallo interno nunca se expongan al cliente
 * rutas de archivos, consultas SQL, contraseñas o trazas técnicas (stack traces).
 */
export function errorHandler(err, req, res, next) {
  // En consola del servidor se registra el error para depuración interna
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR INTERNO] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}:`, err.message);
  }

  // Manejo de errores de sintaxis JSON en el cuerpo de la petición
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'El cuerpo de la petición no contiene un formato JSON válido.'
    });
  }

  // Manejo de restricción UNIQUE de SQLite (correo duplicado)
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
    return res.status(409).json({
      error: 'El correo electrónico ya se encuentra registrado en el sistema.'
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const mensajeSeguro = statusCode === 500
    ? 'Ocurrió un error interno en el servidor. Por favor intente más tarde.'
    : err.message || 'Error en la solicitud.';

  res.status(statusCode).json({
    error: mensajeSeguro
  });
}
