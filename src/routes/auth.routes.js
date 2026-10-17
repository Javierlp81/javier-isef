import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../config/database.js';
import { validarRegistroUsuario, validarInicioSesion } from '../services/validaciones.js';

export function createAuthRouter(customDb = null) {
  const router = Router();
  const getDb = () => customDb || getDatabase();

  /**
   * POST /api/registro - Crear una cuenta nueva
   */
  router.post('/registro', async (req, res, next) => {
    try {
      const { nombre, correo, password } = req.body || {};

      // 1. Validaciones de formato y longitud
      const validacion = validarRegistroUsuario({ nombre, correo, password });
      if (!validacion.valido) {
        return res.status(400).json({
          error: 'Datos de registro inválidos.',
          detalles: validacion.errores
        });
      }

      const db = getDb();
      const correoLimpio = correo.trim().toLowerCase();

      // 2. Verificar duplicidad de correo en BD
      const usuarioExistente = db.prepare('SELECT id FROM usuarios WHERE correo = ?').get(correoLimpio);
      if (usuarioExistente) {
        return res.status(409).json({
          error: 'El correo electrónico ya se encuentra registrado.',
          detalles: { correo: 'Este correo electrónico ya está en uso.' }
        });
      }

      // 3. Generación de hash seguro con bcrypt
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 4. Inserción con consulta parametrizada
      const stmt = db.prepare('INSERT INTO usuarios (nombre, correo, password_hash) VALUES (?, ?, ?)');
      const resultado = stmt.run(nombre.trim(), correoLimpio, passwordHash);

      const nuevoUsuario = {
        id: Number(resultado.lastInsertRowid),
        nombre: nombre.trim(),
        correo: correoLimpio
      };

      // 5. Iniciar sesión automáticamente tras registro
      req.session.usuarioId = nuevoUsuario.id;

      return res.status(201).json({
        mensaje: 'Usuario registrado exitosamente.',
        usuario: nuevoUsuario
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/sesion - Iniciar sesión
   */
  router.post('/sesion', async (req, res, next) => {
    try {
      const { correo, password } = req.body || {};

      const validacion = validarInicioSesion({ correo, password });
      if (!validacion.valido) {
        return res.status(400).json({
          error: 'Credenciales incompletas.',
          detalles: validacion.errores
        });
      }

      const db = getDb();
      const correoLimpio = correo.trim().toLowerCase();

      // Consulta parametrizada
      const usuario = db.prepare('SELECT id, nombre, correo, password_hash FROM usuarios WHERE correo = ?').get(correoLimpio);
      if (!usuario) {
        return res.status(401).json({
          error: 'Credenciales inválidas. Verifique su correo o contraseña.'
        });
      }

      const passwordCorrecto = await bcrypt.compare(password, usuario.password_hash);
      if (!passwordCorrecto) {
        return res.status(401).json({
          error: 'Credenciales inválidas. Verifique su correo o contraseña.'
        });
      }

      // Establecer sesión
      req.session.usuarioId = usuario.id;

      return res.status(200).json({
        mensaje: 'Inicio de sesión exitoso.',
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo
        }
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /api/sesion - Cerrar sesión
   */
  router.delete('/sesion', (req, res) => {
    if (!req.session) {
      return res.status(200).json({ mensaje: 'No había sesión activa.' });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Error al cerrar la sesión.' });
      }
      res.clearCookie('connect.sid');
      return res.status(200).json({ mensaje: 'Sesión cerrada correctamente.' });
    });
  });

  /**
   * GET /api/sesion - Obtener información del usuario autenticado
   */
  router.get('/sesion', (req, res, next) => {
    try {
      if (!req.session || !req.session.usuarioId) {
        return res.status(200).json({ autenticado: false, usuario: null });
      }

      const db = getDb();
      const usuario = db.prepare('SELECT id, nombre, correo, creado_en FROM usuarios WHERE id = ?').get(req.session.usuarioId);

      if (!usuario) {
        req.session.destroy(() => {});
        return res.status(200).json({ autenticado: false, usuario: null });
      }

      return res.status(200).json({
        autenticado: true,
        usuario
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
