import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDatabase } from '../src/config/database.js';

describe('Pruebas de Integración de la API', () => {
  let app;
  let testDb;

  before(() => {
    // Usar base de datos en memoria para pruebas de integración aisladas y veloces
    testDb = getDatabase(':memory:');
    app = createApp(testDb);
  });

  after(() => {
    if (testDb) {
      testDb.close();
    }
  });

  // Agentes para mantener cookies de sesión entre llamadas
  let agentUsuario1;
  let agentUsuario2;
  let gastoIdUsuario1;

  describe('1. Autenticación y Sesiones (/api/registro y /api/sesion)', () => {
    it('debe registrar un nuevo usuario con éxito (HTTP 201)', async () => {
      agentUsuario1 = request.agent(app);

      const res = await agentUsuario1
        .post('/api/registro')
        .send({
          nombre: 'Ana López',
          correo: 'ana@isef.com',
          password: 'passwordSeguro123'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.usuario.nombre, 'Ana López');
      assert.equal(res.body.usuario.correo, 'ana@isef.com');
      assert.ok(res.body.usuario.id);
    });

    it('debe rechazar registro con correo duplicado (HTTP 409)', async () => {
      const res = await request(app)
        .post('/api/registro')
        .send({
          nombre: 'Otra Ana',
          correo: 'ana@isef.com',
          password: 'passwordSeguro123'
        });

      assert.equal(res.status, 409);
      assert.match(res.body.error, /ya se encuentra registrado/i);
    });

    it('debe rechazar registro con contraseña menor a 8 caracteres (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/registro')
        .send({
          nombre: 'Carlos Ruiz',
          correo: 'carlos@isef.com',
          password: '123'
        });

      assert.equal(res.status, 400);
      assert.ok(res.body.detalles.password);
    });

    it('debe rechazar inicio de sesión con contraseña errónea (HTTP 401)', async () => {
      const res = await request(app)
        .post('/api/sesion')
        .send({
          correo: 'ana@isef.com',
          password: 'passwordEquivocada'
        });

      assert.equal(res.status, 401);
      assert.match(res.body.error, /inválidas/i);
    });

    it('debe iniciar sesión correctamente con credenciales válidas (HTTP 200)', async () => {
      const agente = request.agent(app);
      const res = await agente
        .post('/api/sesion')
        .send({
          correo: 'ana@isef.com',
          password: 'passwordSeguro123'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.usuario.correo, 'ana@isef.com');
    });
  });

  describe('2. Protección y Aislamiento de Rutas sin Sesión', () => {
    it('debe negar acceso a GET /api/gastos sin sesión (HTTP 401)', async () => {
      const res = await request(app).get('/api/gastos');
      assert.equal(res.status, 401);
      assert.match(res.body.error, /no autorizado/i);
    });

    it('debe negar acceso a POST /api/gastos sin sesión (HTTP 401)', async () => {
      const res = await request(app)
        .post('/api/gastos')
        .send({
          fecha: '2026-10-15',
          concepto: 'Café',
          categoria: 'Alimentos',
          monto: 50.00,
          forma_pago: 'Efectivo',
          tiene_factura: false
        });
      assert.equal(res.status, 401);
    });

    it('debe negar acceso a GET /api/resumen sin sesión (HTTP 401)', async () => {
      const res = await request(app).get('/api/resumen?mes=2026-10');
      assert.equal(res.status, 401);
    });
  });

  describe('3. CRUD de Gastos con Sesión Activa', () => {
    it('debe crear un gasto válido correctamente (HTTP 201)', async () => {
      const res = await agentUsuario1
        .post('/api/gastos')
        .send({
          fecha: '2026-10-10',
          concepto: 'Resma de papel bond',
          categoria: 'Papelería',
          monto: 1500.00,
          forma_pago: 'Efectivo',
          tiene_factura: true
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.gasto.id);
      assert.equal(res.body.gasto.deducible, true);
      gastoIdUsuario1 = res.body.gasto.id;
    });

    it('debe crear un segundo gasto en el mismo mes (HTTP 201)', async () => {
      const res = await agentUsuario1
        .post('/api/gastos')
        .send({
          fecha: '2026-10-12',
          concepto: 'Licencia de software contable',
          categoria: 'Servicios',
          monto: 5000.00,
          forma_pago: 'Transferencia',
          tiene_factura: true
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.gasto.deducible, true);
    });

    it('debe listar los gastos ordenados del más reciente al más antiguo (HTTP 200)', async () => {
      const res = await agentUsuario1.get('/api/gastos');

      assert.equal(res.status, 200);
      assert.equal(res.body.gastos.length, 2);
      // El de fecha 2026-10-12 debe venir antes que el de 2026-10-10
      assert.equal(res.body.gastos[0].fecha, '2026-10-12');
      assert.equal(res.body.gastos[1].fecha, '2026-10-10');
    });

    it('debe filtrar gastos por categoría (HTTP 200)', async () => {
      const res = await agentUsuario1.get('/api/gastos?categoria=Papelería');

      assert.equal(res.status, 200);
      assert.equal(res.body.gastos.length, 1);
      assert.equal(res.body.gastos[0].categoria, 'Papelería');
    });

    it('debe retornar el resumen mensual correcto con totales y desglose (HTTP 200)', async () => {
      const res = await agentUsuario1.get('/api/resumen?mes=2026-10');

      assert.equal(res.status, 200);
      assert.equal(res.body.mes, '2026-10');
      assert.equal(res.body.totalGastado, 6500.00); // 1500 + 5000
      assert.equal(res.body.totalDeducible, 6500.00);
      assert.equal(res.body.totalNoDeducible, 0.00);
      assert.equal(res.body.porCategoria['Papelería'], 1500.00);
      assert.equal(res.body.porCategoria['Servicios'], 5000.00);
    });
  });

  describe('4. Aislamiento Estricto entre Usuarios (Prueba de Seguridad Crítica)', () => {
    before(async () => {
      // Registrar e iniciar sesión como Usuario 2
      agentUsuario2 = request.agent(app);
      await agentUsuario2
        .post('/api/registro')
        .send({
          nombre: 'David Morales',
          correo: 'david@isef.com',
          password: 'passwordSeguro456'
        });
    });

    it('Usuario 2 no debe ver los gastos de Usuario 1 en el listado general', async () => {
      const res = await agentUsuario2.get('/api/gastos');
      assert.equal(res.status, 200);
      assert.equal(res.body.gastos.length, 0); // Lista vacía para usuario 2
    });

    it('Usuario 2 recibe HTTP 403 al intentar consultar un gasto ajeno por ID', async () => {
      const res = await agentUsuario2.get(`/api/gastos/${gastoIdUsuario1}`);
      assert.equal(res.status, 403);
      assert.match(res.body.error, /no tienes permiso/i);
    });

    it('Usuario 2 recibe HTTP 403 al intentar editar un gasto ajeno por ID', async () => {
      const res = await agentUsuario2
        .put(`/api/gastos/${gastoIdUsuario1}`)
        .send({
          fecha: '2026-10-10',
          concepto: 'Gasto hackeado',
          categoria: 'Papelería',
          monto: 100.00,
          forma_pago: 'Efectivo',
          tiene_factura: false
        });

      assert.equal(res.status, 403);
      assert.match(res.body.error, /no tienes permiso/i);
    });

    it('Usuario 2 recibe HTTP 403 al intentar eliminar un gasto ajeno por ID', async () => {
      const res = await agentUsuario2.delete(`/api/gastos/${gastoIdUsuario1}`);
      assert.equal(res.status, 403);
      assert.match(res.body.error, /no tienes permiso/i);
    });
  });

  describe('5. Edición y Eliminación por el Propietario Legítimo', () => {
    it('Usuario 1 puede editar su propio gasto (HTTP 200)', async () => {
      const res = await agentUsuario1
        .put(`/api/gastos/${gastoIdUsuario1}`)
        .send({
          fecha: '2026-10-10',
          concepto: 'Resma de papel bond membretado',
          categoria: 'Papelería',
          monto: 1650.00,
          forma_pago: 'Transferencia',
          tiene_factura: true
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.gasto.concepto, 'Resma de papel bond membretado');
      assert.equal(res.body.gasto.monto, 1650.00);
    });

    it('Usuario 1 puede eliminar su propio gasto (HTTP 200)', async () => {
      const res = await agentUsuario1.delete(`/api/gastos/${gastoIdUsuario1}`);
      assert.equal(res.status, 200);
      assert.match(res.body.mensaje, /eliminado exitosamente/i);
    });

    it('consultar un gasto ya eliminado debe retornar HTTP 404', async () => {
      const res = await agentUsuario1.get(`/api/gastos/${gastoIdUsuario1}`);
      assert.equal(res.status, 404);
      assert.match(res.body.error, /no existe/i);
    });
  });

  describe('6. Puntos Opcionales: Exportación CSV y Paginación', () => {
    it('debe exportar gastos del mes en formato CSV válido con cabeceras correctas', async () => {
      const res = await agentUsuario1.get('/api/gastos/exportar?mes=2026-10');

      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /text\/csv/);
      assert.match(res.headers['content-disposition'], /attachment; filename="gastos-2026-10\.csv"/);
      assert.ok(res.text.includes('Fecha,Concepto,Categoría,Monto,Forma de Pago,Factura,Deducible'));
    });

    it('debe soportar paginación del listado devolviendo metadatos adecuados', async () => {
      const res = await agentUsuario1.get('/api/gastos?page=1&limit=1');

      assert.equal(res.status, 200);
      assert.ok(res.body.paginacion);
      assert.equal(res.body.paginacion.pagina, 1);
      assert.equal(res.body.paginacion.porPagina, 1);
      assert.equal(res.body.gastos.length, 1);
    });
  });
});
