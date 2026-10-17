import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { esGastoDeducible, calcularResumenMes, LIMITE_EFECTIVO_DEDUCIBLE } from '../src/services/deducibilidad.js';

describe('Regla de Deducibilidad Fiscal', () => {
  it('el límite de efectivo deducible debe estar centralizado y configurado en $2,000.00', () => {
    assert.equal(LIMITE_EFECTIVO_DEDUCIBLE, 2000.00);
  });

  // Caso 1: $1,500.00 | Efectivo | Factura: Sí -> Deducible: Sí
  it('Caso 1: $1,500.00 en Efectivo con Factura debe ser DEDUCIBLE (Sí)', () => {
    const resultado = esGastoDeducible({
      monto: 1500.00,
      formaPago: 'Efectivo',
      tieneFactura: true
    });
    assert.equal(resultado, true);
  });

  // Caso 2: $1,500.00 | Efectivo | Factura: No -> Deducible: No
  it('Caso 2: $1,500.00 en Efectivo sin Factura NO debe ser deducible (No)', () => {
    const resultado = esGastoDeducible({
      monto: 1500.00,
      formaPago: 'Efectivo',
      tieneFactura: false
    });
    assert.equal(resultado, false);
  });

  // Caso 3: $2,000.00 | Efectivo | Factura: Sí -> Deducible: Sí
  it('Caso 3: $2,000.00 (monto límite) en Efectivo con Factura debe ser DEDUCIBLE (Sí)', () => {
    const resultado = esGastoDeducible({
      monto: 2000.00,
      formaPago: 'Efectivo',
      tieneFactura: true
    });
    assert.equal(resultado, true);
  });

  // Caso 4: $2,000.01 | Efectivo | Factura: Sí -> Deducible: No
  it('Caso 4: $2,000.01 (excede límite) en Efectivo con Factura NO debe ser deducible (No)', () => {
    const resultado = esGastoDeducible({
      monto: 2000.01,
      formaPago: 'Efectivo',
      tieneFactura: true
    });
    assert.equal(resultado, false);
  });

  // Caso 5: $5,000.00 | Transferencia | Factura: Sí -> Deducible: Sí
  it('Caso 5: $5,000.00 en Transferencia con Factura debe ser DEDUCIBLE (Sí)', () => {
    const resultado = esGastoDeducible({
      monto: 5000.00,
      formaPago: 'Transferencia',
      tieneFactura: true
    });
    assert.equal(resultado, true);
  });

  // Caso 6: $5,000.00 | Tarjeta | Factura: No -> Deducible: No
  it('Caso 6: $5,000.00 en Tarjeta sin Factura NO debe ser deducible (No)', () => {
    const resultado = esGastoDeducible({
      monto: 5000.00,
      formaPago: 'Tarjeta',
      tieneFactura: false
    });
    assert.equal(resultado, false);
  });

  describe('Cálculo de Totales y Resumen Mensual', () => {
    it('debe totalizar correctamente gastado, deducible, no deducible y categorías', () => {
      const gastosEjemplo = [
        { monto: 1500.00, forma_pago: 'Efectivo', tiene_factura: 1, categoria: 'Papelería' }, // Deducible
        { monto: 1500.00, forma_pago: 'Efectivo', tiene_factura: 0, categoria: 'Alimentos' }, // No deducible
        { monto: 2000.00, forma_pago: 'Efectivo', tiene_factura: 1, categoria: 'Servicios' }, // Deducible
        { monto: 2000.01, forma_pago: 'Efectivo', tiene_factura: 1, categoria: 'Transporte' }, // No deducible
        { monto: 5000.00, forma_pago: 'Transferencia', tiene_factura: 1, categoria: 'Otros' }, // Deducible
        { monto: 5000.00, forma_pago: 'Tarjeta', tiene_factura: 0, categoria: 'Otros' } // No deducible
      ];

      const resumen = calcularResumenMes(gastosEjemplo);

      // Total gastado: 1500 + 1500 + 2000 + 2000.01 + 5000 + 5000 = 17000.01
      assert.equal(resumen.totalGastado, 17000.01);
      // Total deducible: 1500 + 2000 + 5000 = 8500.00
      assert.equal(resumen.totalDeducible, 8500.00);
      // Total no deducible: 1500 + 2000.01 + 5000 = 8500.01
      assert.equal(resumen.totalNoDeducible, 8500.01);

      // Desglose por categoría
      assert.equal(resumen.porCategoria['Papelería'], 1500.00);
      assert.equal(resumen.porCategoria['Alimentos'], 1500.00);
      assert.equal(resumen.porCategoria['Servicios'], 2000.00);
      assert.equal(resumen.porCategoria['Transporte'], 2000.01);
      assert.equal(resumen.porCategoria['Otros'], 10000.00);
    });
  });
});
