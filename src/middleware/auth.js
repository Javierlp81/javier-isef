import { getDatabase } from '../config/database.js';

/**
 * Middleware para comprobar que el usuario tenga sesión activa.
 */
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.usuarioId) {
    return res.status(401).json({
      error: 'Acceso no autorizado. Debe iniciar sesión para acceder a este recurso.'
    });
  }
  next();
}

/**
 * Middleware para adjuntar los datos del usuario en sesión a la petición (opcional).
 */
export function attachCurrentUser(db = null) {
  return (req, res, next) => {
    if (!req.session || !req.session.usuarioId) {
      req.usuario = null;
      return next();
    }

    try {
      const database = db || getDatabase();
      const usuario = database.prepare('SELECT id, nombre, correo, creado_en FROM usuarios WHERE id = ?').get(req.session.usuarioId);

      if (!usuario) {
        req.session.destroy(() => {});
        req.usuario = null;
        return res.status(401).json({
          error: 'La sesión ya no es válida. Por favor inicie sesión nuevamente.'
        });
      }

      req.usuario = usuario;
      next();
    } catch (err) {
      next(err);
    }
  };
}
