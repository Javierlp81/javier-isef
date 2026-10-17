const CATEGORIAS_VALIDAS = ['Papelería', 'Transporte', 'Alimentos', 'Servicios', 'Otros'];
const FORMAS_PAGO_VALIDAS = ['Efectivo', 'Transferencia', 'Tarjeta'];

/**
 * Valida los datos para registrar un usuario nuevo.
 */
export function validarRegistroUsuario({ nombre, correo, password }) {
  const errores = {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    errores.nombre = 'El nombre es obligatorio y debe tener al menos 2 caracteres.';
  } else if (nombre.trim().length > 100) {
    errores.nombre = 'El nombre no puede exceder 100 caracteres.';
  }

  const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!correo || typeof correo !== 'string' || !regexCorreo.test(correo.trim())) {
    errores.correo = 'Ingresa un correo electrónico válido.';
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errores.password = 'La contraseña debe tener al menos 8 caracteres.';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores
  };
}

/**
 * Valida las credenciales de inicio de sesión.
 */
export function validarInicioSesion({ correo, password }) {
  const errores = {};

  if (!correo || typeof correo !== 'string' || !correo.trim()) {
    errores.correo = 'El correo electrónico es obligatorio.';
  }

  if (!password || typeof password !== 'string' || !password) {
    errores.password = 'La contraseña es obligatoria.';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores
  };
}

/**
 * Valida que los datos del gasto sean correctos.
 */
export function validarGasto({ fecha, concepto, categoria, monto, forma_pago, formaPago, tiene_factura, tieneFactura }) {
  const errores = {};

  // 1. Fecha: Obligatoria. No puede ser posterior al día de hoy.
  if (!fecha || typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    errores.fecha = 'La fecha es obligatoria y debe tener formato AAAA-MM-DD.';
  } else {
    // Comparar fecha contra la fecha local actual
    const fechaGasto = new Date(fecha + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    if (isNaN(fechaGasto.getTime())) {
      errores.fecha = 'La fecha proporcionada no es válida.';
    } else if (fechaGasto > hoy) {
      errores.fecha = 'La fecha no puede ser posterior al día de hoy.';
    }
  }

  // 2. Concepto: Obligatorio, de 3 a 120 caracteres.
  if (!concepto || typeof concepto !== 'string' || concepto.trim().length < 3) {
    errores.concepto = 'El concepto es obligatorio y debe tener al menos 3 caracteres.';
  } else if (concepto.trim().length > 120) {
    errores.concepto = 'El concepto no puede exceder 120 caracteres.';
  }

  // 3. Categoría: Una de: Papelería, Transporte, Alimentos, Servicios, Otros.
  if (!categoria || !CATEGORIAS_VALIDAS.includes(categoria)) {
    errores.categoria = `La categoría debe ser una de las siguientes: ${CATEGORIAS_VALIDAS.join(', ')}.`;
  }

  // 4. Monto: Obligatorio, mayor que cero, con dos decimales.
  if (monto === undefined || monto === null || monto === '') {
    errores.monto = 'El monto es obligatorio.';
  } else {
    const numMonto = Number(monto);
    if (isNaN(numMonto) || numMonto <= 0) {
      errores.monto = 'El monto debe ser un número mayor a cero.';
    } else {
      // Verificar que no tenga más de dos decimales
      const partes = String(monto).split('.');
      if (partes.length === 2 && partes[1].length > 2) {
        errores.monto = 'El monto no puede tener más de dos decimales.';
      }
    }
  }

  // 5. Forma de pago: Una de: Efectivo, Transferencia, Tarjeta.
  const metodoPago = forma_pago || formaPago;
  if (!metodoPago || !FORMAS_PAGO_VALIDAS.includes(metodoPago)) {
    errores.forma_pago = `La forma de pago debe ser una de las siguientes: ${FORMAS_PAGO_VALIDAS.join(', ')}.`;
  }

  // 6. Tiene factura: Sí o no (booleano)
  const factura = tiene_factura !== undefined ? tiene_factura : tieneFactura;
  if (factura === undefined || factura === null || factura === '') {
    errores.tiene_factura = 'Debe indicar si el gasto cuenta con factura.';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores
  };
}

export { CATEGORIAS_VALIDAS, FORMAS_PAGO_VALIDAS };
