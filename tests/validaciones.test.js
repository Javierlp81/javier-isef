import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validarGasto, validarRegistroUsuario } from '../src/services/validaciones.js';

describe('Validaciones del Servidor', () => {
  describe('Validación de Fecha de Gasto', () => {
    it('debe rechazar una fecha posterior al día de hoy', () => {
      // Crear una fecha de mañana
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      const fechaFutura = manana.toISOString().split('T')[0];

      const resultado = validarGasto({
        fecha: fechaFutura,
        concepto: 'Compra de tóner',
        categoria: 'Papelería',
        monto: 850.50,
        forma_pago: 'Transferencia',
        tiene_factura: true
      });

      assert.equal(resultado.valido, false);
      assert.ok(resultado.errores.fecha);
      assert.match(resultado.errores.fecha, /no puede ser posterior al día de hoy/i);
    });

    it('debe aceptar la fecha de hoy y fechas pasadas válidas', () => {
      const hoy = new Date().toISOString().split('T')[0];

      const resultado = validarGasto({
        fecha: hoy,
        concepto: 'Pago de internet de oficina',
        categoria: 'Servicios',
        monto: 1200.00,
        forma_pago: 'Transferencia',
        tiene_factura: true
      });

      assert.equal(resultado.valido, true);
      assert.equal(Object.keys(resultado.errores).length, 0);
    });
  });

  describe('Validación de Concepto', () => {
    it('debe rechazar conceptos con menos de 3 caracteres', () => {
      const hoy = new Date().toISOString().split('T')[0];
      const resultado = validarGasto({
        fecha: hoy,
        concepto: 'ab',
        categoria: 'Papelería',
        monto: 50.00,
        forma_pago: 'Efectivo',
        tiene_factura: false
      });

      assert.equal(resultado.valido, false);
      assert.ok(resultado.errores.concepto);
    });

    it('debe rechazar conceptos con más de 120 caracteres', () => {
      const hoy = new Date().toISOString().split('T')[0];
      const resultado = validarGasto({
        fecha: hoy,
        concepto: 'A'.repeat(121),
        categoria: 'Papelería',
        monto: 50.00,
        forma_pago: 'Efectivo',
        tiene_factura: false
      });

      assert.equal(resultado.valido, false);
      assert.ok(resultado.errores.concepto);
    });
  });

  describe('Validación de Categorías Permitidas', () => {
    it('debe rechazar categorías fuera de la lista oficial', () => {
      const hoy = new Date().toISOString().split('T')[0];
      const resultado = validarGasto({
        fecha: hoy,
        concepto: 'Viaje en taxi',
        categoria: 'Viáticos', // No permitida
        monto: 180.00,
        forma_pago: 'Efectivo',
        tiene_factura: false
      });

      assert.equal(resultado.valido, false);
      assert.ok(resultado.errores.categoria);
    });
  });

  describe('Validación de Monto', () => {
    it('debe rechazar montos menores o iguales a cero', () => {
      const hoy = new Date().toISOString().split('T')[0];
      const resultado = validarGasto({
        fecha: hoy,
        concepto: 'Gasto prueba',
        categoria: 'Otros',
        monto: 0,
        forma_pago: 'Efectivo',
        tiene_factura: false
      });

      assert.equal(resultado.valido, false);
      assert.ok(resultado.errores.monto);
    });

    it('debe rechazar montos con más de dos decimales', () => {
      const hoy = new Date().toISOString().split('T')[0];
      const resultado = validarGasto({
        fecha: hoy,
        concepto: 'Gasto prueba',
        categoria: 'Otros',
        monto: 125.456,
        forma_pago: 'Efectivo',
        tiene_factura: false
      });

      assert.equal(resultado.valido, false);
      assert.ok(resultado.errores.monto);
    });
  });

  describe('Validación de Registro de Usuario', () => {
    it('debe rechazar contraseña con menos de 8 caracteres', () => {
      const resultado = validarRegistroUsuario({
        nombre: 'Mauricio Leyva',
        correo: 'mau@example.com',
        password: 'corta'
      });

      assert.equal(resultado.valido, false);
      assert.ok(resultado.errores.password);
    });

    it('debe aceptar usuario con datos válidos y contraseña >= 8 caracteres', () => {
      const resultado = validarRegistroUsuario({
        nombre: 'Mauricio Leyva',
        correo: 'mau@example.com',
        password: 'password123'
      });

      assert.equal(resultado.valido, true);
    });
  });
});
