import { env } from '../config/env.js';

// Límite máximo para deducir gastos pagados en efectivo
export const LIMITE_EFECTIVO_DEDUCIBLE = env.limiteEfectivoDeducible;

/**
 * Comprueba si un gasto es deducible:
 * Debe tener factura y, si es mayor al límite, no haberse pagado en efectivo.
 *
 * @param {Object} gasto
 * @param {number|string} gasto.monto - Monto del gasto (mayor a 0)
 * @param {string} gasto.formaPago - Forma de pago: 'Efectivo', 'Transferencia' o 'Tarjeta'
 * @param {boolean|number} gasto.tieneFactura - Booleano o 1/0 si cuenta con factura
 * @returns {boolean} true si es deducible, false en caso contrario
 */
export function esGastoDeducible({ monto, formaPago, tieneFactura }) {
  const factura = Boolean(tieneFactura);
  if (!factura) {
    return false;
  }

  const montoNumerico = Number(monto);
  if (formaPago === 'Efectivo' && montoNumerico > LIMITE_EFECTIVO_DEDUCIBLE) {
    return false;
  }

  return true;
}

/**
 * Convierte un número a formato centavos enteros para aritmética exacta.
 */
function aCentavos(monto) {
  return Math.round(Number(monto) * 100);
}

/**
 * Convierte centavos a formato decimal estándar con 2 decimales.
 */
function aDecimal(centavos) {
  return Number((centavos / 100).toFixed(2));
}

/**
 * Calcula el resumen de gastos: total gastado, deducible, no deducible y desglose por categoría.
 * Utiliza aritmética de centavos para evitar imprecisión de punto flotante binario.
 *
 * @param {Array} listaGastos - Arreglo de registros de gastos
 * @returns {Object} Resumen consolidado con totales
 */
export function calcularResumenMes(listaGastos) {
  const categoriasValidas = ['Papelería', 'Transporte', 'Alimentos', 'Servicios', 'Otros'];

  const desgloseInicial = {};
  for (const cat of categoriasValidas) {
    desgloseInicial[cat] = 0;
  }

  let totalGastadoCentavos = 0;
  let totalDeducibleCentavos = 0;
  const desgloseCentavos = { ...desgloseInicial };

  for (const gasto of listaGastos) {
    const centavos = aCentavos(gasto.monto);
    totalGastadoCentavos += centavos;

    const categoria = gasto.categoria;
    if (desgloseCentavos[categoria] !== undefined) {
      desgloseCentavos[categoria] += centavos;
    } else {
      desgloseCentavos[categoria] = centavos;
    }

    const deducible = esGastoDeducible({
      monto: gasto.monto,
      formaPago: gasto.forma_pago || gasto.formaPago,
      tieneFactura: gasto.tiene_factura !== undefined ? gasto.tiene_factura : gasto.tieneFactura
    });

    if (deducible) {
      totalDeducibleCentavos += centavos;
    }
  }

  const totalNoDeducibleCentavos = totalGastadoCentavos - totalDeducibleCentavos;

  const porCategoria = {};
  for (const [cat, centavos] of Object.entries(desgloseCentavos)) {
    porCategoria[cat] = aDecimal(centavos);
  }

  return {
    totalGastado: aDecimal(totalGastadoCentavos),
    totalDeducible: aDecimal(totalDeducibleCentavos),
    totalNoDeducible: aDecimal(totalNoDeducibleCentavos),
    porCategoria,
    cantidadGastos: listaGastos.length
  };
}
