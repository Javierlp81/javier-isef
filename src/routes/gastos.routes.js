import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { validarGasto, CATEGORIAS_VALIDAS } from '../services/validaciones.js';
import { esGastoDeducible } from '../services/deducibilidad.js';

export function createGastosRouter(customDb = null) {
  const router = Router();
  const getDb = () => customDb || getDatabase();

  // Requiere que el usuario haya iniciado sesión
  router.use(requireAuth);

  /**
   * GET /api/gastos - Listar gastos del usuario autenticado con filtros opcionales
   * Filtros soportados: mes (AAAA-MM), categoria.
   * Orden: Del más reciente al más antiguo.
   * Paginación opcional: page, limit.
   */
  router.get('/', (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const { mes, categoria, page, limit } = req.query;

      let sql = 'SELECT id, usuario_id, fecha, concepto, categoria, monto, forma_pago, tiene_factura, creado_en FROM gastos WHERE usuario_id = ?';
      const params = [usuarioId];

      // Filtro por mes (AAAA-MM)
      if (mes && /^\d{4}-\d{2}$/.test(mes)) {
        sql += ' AND fecha LIKE ?';
        params.push(`${mes}%`);
      }

      // Filtro por categoría
      if (categoria && CATEGORIAS_VALIDAS.includes(categoria)) {
        sql += ' AND categoria = ?';
        params.push(categoria);
      }

      // Orden del más reciente al más antiguo
      sql += ' ORDER BY fecha DESC, id DESC';

      const db = getDb();

      // Soporte de paginación opcional
      if (page || limit) {
        const pagina = Math.max(1, parseInt(page, 10) || 1);
        const porPagina = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
        const offset = (pagina - 1) * porPagina;

        // Conteo total para paginación
        let countSql = 'SELECT COUNT(*) as total FROM gastos WHERE usuario_id = ?';
        const countParams = [usuarioId];
        if (mes && /^\d{4}-\d{2}$/.test(mes)) {
          countSql += ' AND fecha LIKE ?';
          countParams.push(`${mes}%`);
        }
        if (categoria && CATEGORIAS_VALIDAS.includes(categoria)) {
          countSql += ' AND categoria = ?';
          countParams.push(categoria);
        }

        const totalRow = db.prepare(countSql).get(...countParams);
        const total = totalRow.total;

        sql += ' LIMIT ? OFFSET ?';
        params.push(porPagina, offset);

        const filas = db.prepare(sql).all(...params);
        const gastosConDeducibilidad = filas.map((g) => ({
          ...g,
          monto: Number(Number(g.monto).toFixed(2)),
          tiene_factura: Boolean(g.tiene_factura),
          deducible: esGastoDeducible({
            monto: g.monto,
            formaPago: g.forma_pago,
            tieneFactura: g.tiene_factura
          })
        }));

        return res.status(200).json({
          gastos: gastosConDeducibilidad,
          paginacion: {
            total,
            pagina,
            porPagina,
            totalPaginas: Math.ceil(total / porPagina)
          }
        });
      }

      // Sin paginación (retorna lista completa)
      const filas = db.prepare(sql).all(...params);
      const gastosConDeducibilidad = filas.map((g) => ({
        ...g,
        monto: Number(Number(g.monto).toFixed(2)),
        tiene_factura: Boolean(g.tiene_factura),
        deducible: esGastoDeducible({
          monto: g.monto,
          formaPago: g.forma_pago,
          tieneFactura: g.tiene_factura
        })
      }));

      return res.status(200).json({
        gastos: gastosConDeducibilidad,
        total: gastosConDeducibilidad.length
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/gastos/exportar - Exportar gastos a formato CSV (Punto Opcional)
   */
  router.get('/exportar', (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const { mes, categoria } = req.query;

      let sql = 'SELECT fecha, concepto, categoria, monto, forma_pago, tiene_factura FROM gastos WHERE usuario_id = ?';
      const params = [usuarioId];

      if (mes && /^\d{4}-\d{2}$/.test(mes)) {
        sql += ' AND fecha LIKE ?';
        params.push(`${mes}%`);
      }

      if (categoria && CATEGORIAS_VALIDAS.includes(categoria)) {
        sql += ' AND categoria = ?';
        params.push(categoria);
      }

      sql += ' ORDER BY fecha DESC, id DESC';

      const db = getDb();
      const filas = db.prepare(sql).all(...params);

      // Generar contenido CSV con formato RFC 4180
      const encabezados = ['Fecha', 'Concepto', 'Categoría', 'Monto', 'Forma de Pago', 'Factura', 'Deducible'];
      const escapeCsv = (campo) => {
        const texto = String(campo ?? '');
        if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
          return `"${texto.replace(/"/g, '""')}"`;
        }
        return texto;
      };

      const lineas = [encabezados.join(',')];

      for (const f of filas) {
        const deducible = esGastoDeducible({
          monto: f.monto,
          formaPago: f.forma_pago,
          tieneFactura: f.tiene_factura
        });

        lineas.push([
          escapeCsv(f.fecha),
          escapeCsv(f.concepto),
          escapeCsv(f.categoria),
          escapeCsv(Number(f.monto).toFixed(2)),
          escapeCsv(f.forma_pago),
          f.tiene_factura ? 'Sí' : 'No',
          deducible ? 'Sí' : 'No'
        ].join(','));
      }

      const csvContent = '\uFEFF' + lineas.join('\r\n'); // BOM para compatibilidad con Excel
      const nombreArchivo = mes ? `gastos-${mes}.csv` : 'gastos.csv';

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
      return res.status(200).send(csvContent);
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/gastos - Dar de alta un nuevo gasto
   */
  router.post('/', (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const { fecha, concepto, categoria, monto, forma_pago, tiene_factura } = req.body || {};

      // Validamos los datos enviados por el usuario
      const validacion = validarGasto({
        fecha,
        concepto,
        categoria,
        monto,
        forma_pago,
        tiene_factura
      });

      if (!validacion.valido) {
        return res.status(400).json({
          error: 'Datos del gasto inválidos.',
          detalles: validacion.errores
        });
      }

      const db = getDb();
      const montoFormateado = Number(monto).toFixed(2);
      const facturaInt = tiene_factura === true || tiene_factura === 1 || tiene_factura === '1' || tiene_factura === 'true' ? 1 : 0;

      // Inserción parametrizada
      const stmt = db.prepare(`
        INSERT INTO gastos (usuario_id, fecha, concepto, categoria, monto, forma_pago, tiene_factura)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const resultado = stmt.run(
        usuarioId,
        fecha,
        concepto.trim(),
        categoria,
        montoFormateado,
        forma_pago,
        facturaInt
      );

      const nuevoId = Number(resultado.lastInsertRowid);
      const deducible = esGastoDeducible({
        monto: montoFormateado,
        formaPago: forma_pago,
        tieneFactura: facturaInt
      });

      return res.status(201).json({
        mensaje: 'Gasto registrado exitosamente.',
        gasto: {
          id: nuevoId,
          usuario_id: usuarioId,
          fecha,
          concepto: concepto.trim(),
          categoria,
          monto: Number(montoFormateado),
          forma_pago,
          tiene_factura: Boolean(facturaInt),
          deducible
        }
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/gastos/:id - Consultar un gasto específico por ID
   * Verifica aislamiento estricto entre usuarios.
   */
  router.get('/:id', (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const id = parseInt(req.params.id, 10);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'El identificador del gasto debe ser un número entero positivo.' });
      }

      const db = getDb();
      const gasto = db.prepare('SELECT * FROM gastos WHERE id = ?').get(id);

      if (!gasto) {
        return res.status(404).json({ error: 'El gasto solicitado no existe.' });
      }

      // Verificación de propiedad (aislamiento entre usuarios)
      if (gasto.usuario_id !== usuarioId) {
        return res.status(403).json({ error: 'No tienes permiso para consultar este gasto.' });
      }

      return res.status(200).json({
        gasto: {
          ...gasto,
          monto: Number(Number(gasto.monto).toFixed(2)),
          tiene_factura: Boolean(gasto.tiene_factura),
          deducible: esGastoDeducible({
            monto: gasto.monto,
            formaPago: gasto.forma_pago,
            tieneFactura: gasto.tiene_factura
          })
        }
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * PUT /api/gastos/:id - Editar un gasto existente
   * Verifica aislamiento estricto y valida los datos recibidos.
   */
  router.put('/:id', (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const id = parseInt(req.params.id, 10);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'El identificador del gasto debe ser un número entero positivo.' });
      }

      const db = getDb();
      const gastoExistente = db.prepare('SELECT * FROM gastos WHERE id = ?').get(id);

      if (!gastoExistente) {
        return res.status(404).json({ error: 'El gasto que intenta editar no existe.' });
      }

      // Verificación estricta de aislamiento
      if (gastoExistente.usuario_id !== usuarioId) {
        return res.status(403).json({ error: 'No tienes permiso para modificar este gasto.' });
      }

      const { fecha, concepto, categoria, monto, forma_pago, tiene_factura } = req.body || {};

      const validacion = validarGasto({
        fecha,
        concepto,
        categoria,
        monto,
        forma_pago,
        tiene_factura
      });

      if (!validacion.valido) {
        return res.status(400).json({
          error: 'Datos de actualización inválidos.',
          detalles: validacion.errores
        });
      }

      const montoFormateado = Number(monto).toFixed(2);
      const facturaInt = tiene_factura === true || tiene_factura === 1 || tiene_factura === '1' || tiene_factura === 'true' ? 1 : 0;

      const stmt = db.prepare(`
        UPDATE gastos
        SET fecha = ?, concepto = ?, categoria = ?, monto = ?, forma_pago = ?, tiene_factura = ?, actualizado_en = datetime('now', 'localtime')
        WHERE id = ? AND usuario_id = ?
      `);

      stmt.run(
        fecha,
        concepto.trim(),
        categoria,
        montoFormateado,
        forma_pago,
        facturaInt,
        id,
        usuarioId
      );

      const deducible = esGastoDeducible({
        monto: montoFormateado,
        formaPago: forma_pago,
        tieneFactura: facturaInt
      });

      return res.status(200).json({
        mensaje: 'Gasto actualizado exitosamente.',
        gasto: {
          id,
          usuario_id: usuarioId,
          fecha,
          concepto: concepto.trim(),
          categoria,
          monto: Number(montoFormateado),
          forma_pago,
          tiene_factura: Boolean(facturaInt),
          deducible
        }
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /api/gastos/:id - Eliminar un gasto
   * Verifica aislamiento estricto y solicita confirmación en cliente.
   */
  router.delete('/:id', (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const id = parseInt(req.params.id, 10);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'El identificador del gasto debe ser un número entero positivo.' });
      }

      const db = getDb();
      const gastoExistente = db.prepare('SELECT * FROM gastos WHERE id = ?').get(id);

      if (!gastoExistente) {
        return res.status(404).json({ error: 'El gasto que intenta eliminar no existe.' });
      }

      // Verificación estricta de aislamiento
      if (gastoExistente.usuario_id !== usuarioId) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar este gasto.' });
      }

      const stmt = db.prepare('DELETE FROM gastos WHERE id = ? AND usuario_id = ?');
      stmt.run(id, usuarioId);

      return res.status(200).json({
        mensaje: 'Gasto eliminado exitosamente.'
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
