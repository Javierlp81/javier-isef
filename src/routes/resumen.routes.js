import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { calcularResumenMes } from '../services/deducibilidad.js';

export function createResumenRouter(customDb = null) {
  const router = Router();
  const getDb = () => customDb || getDatabase();

  router.use(requireAuth);

  /**
   * GET /api/resumen?mes=AAAA-MM - Totales del mes
   * Muestra total gastado, total por categoría y total deducible.
   */
  router.get('/', (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      let mes = req.query.mes;

      // Si no se especifica mes, se usa el mes actual en formato AAAA-MM
      if (!mes) {
        const ahora = new Date();
        const anio = ahora.getFullYear();
        const m = String(ahora.getMonth() + 1).padStart(2, '0');
        mes = `${anio}-${m}`;
      } else if (!/^\d{4}-\d{2}$/.test(mes)) {
        return res.status(400).json({
          error: 'El parámetro mes debe tener el formato AAAA-MM (por ejemplo: 2026-10).'
        });
      }

      const db = getDb();
      const gastosMes = db.prepare(`
        SELECT monto, forma_pago, tiene_factura, categoria
        FROM gastos
        WHERE usuario_id = ? AND fecha LIKE ?
      `).all(usuarioId, `${mes}%`);

      const resumen = calcularResumenMes(gastosMes);

      return res.status(200).json({
        mes,
        ...resumen
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
