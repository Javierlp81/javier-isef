import { api } from './api.js';

// Estado global de la aplicación
const estado = {
  usuario: null,
  mesSeleccionado: '',
  categoriaSeleccionada: '',
  gastos: [],
  resumen: null,
  cargando: false,
  gastoEnEdicion: null,
  gastoAEliminar: null
};

// Formateador de moneda mexicana ($ MXN)
const formatoMoneda = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2
});

// Elementos del DOM
const dom = {
  // Encabezado
  usuarioHeader: document.getElementById('usuarioHeader'),
  nombreUsuarioActual: document.getElementById('nombreUsuarioActual'),
  btnCerrarSesion: document.getElementById('btnCerrarSesion'),
  alertaGlobal: document.getElementById('alertaGlobal'),
  alertaGlobalTexto: document.getElementById('alertaGlobalTexto'),

  // Autenticación
  seccionAuth: document.getElementById('seccionAuth'),
  tabLogin: document.getElementById('tabLogin'),
  tabRegistro: document.getElementById('tabRegistro'),
  panelLogin: document.getElementById('panelLogin'),
  panelRegistro: document.getElementById('panelRegistro'),
  formLogin: document.getElementById('formLogin'),
  loginCorreo: document.getElementById('loginCorreo'),
  loginPassword: document.getElementById('loginPassword'),
  errorLoginCorreo: document.getElementById('errorLoginCorreo'),
  errorLoginPassword: document.getElementById('errorLoginPassword'),
  formRegistro: document.getElementById('formRegistro'),
  regNombre: document.getElementById('regNombre'),
  regCorreo: document.getElementById('regCorreo'),
  regPassword: document.getElementById('regPassword'),
  errorRegNombre: document.getElementById('errorRegNombre'),
  errorRegCorreo: document.getElementById('errorRegCorreo'),
  errorRegPassword: document.getElementById('errorRegPassword'),

  // Aplicación principal
  seccionApp: document.getElementById('seccionApp'),
  filtroMes: document.getElementById('filtroMes'),
  filtroCategoria: document.getElementById('filtroCategoria'),
  btnExportarCsv: document.getElementById('btnExportarCsv'),
  btnAbrirModalNuevoGasto: document.getElementById('btnAbrirModalNuevoGasto'),
  btnNuevoGastoVacio: document.getElementById('btnNuevoGastoVacio'),

  // Resumen
  resumenTotalGastado: document.getElementById('resumenTotalGastado'),
  resumenCantidadGastos: document.getElementById('resumenCantidadGastos'),
  resumenTotalDeducible: document.getElementById('resumenTotalDeducible'),
  resumenPorcentajeDeducible: document.getElementById('resumenPorcentajeDeducible'),
  resumenTotalNoDeducible: document.getElementById('resumenTotalNoDeducible'),
  desgloseCategoriasContainer: document.getElementById('desgloseCategoriasContainer'),

  // Gráficos
  seccionGraficos: document.getElementById('seccionGraficos'),
  graficoDeducibilidadContainer: document.getElementById('graficoDeducibilidadContainer'),
  graficoCategoriasContainer: document.getElementById('graficoCategoriasContainer'),

  // Estados
  estadoCargando: document.getElementById('estadoCargando'),
  estadoVacio: document.getElementById('estadoVacio'),
  estadoError: document.getElementById('estadoError'),
  mensajeErrorCarga: document.getElementById('mensajeErrorCarga'),
  btnReintentarCarga: document.getElementById('btnReintentarCarga'),
  contenedorTabla: document.getElementById('contenedorTabla'),
  cuerpoTablaGastos: document.getElementById('cuerpoTablaGastos'),

  // Modal Gasto
  modalGasto: document.getElementById('modalGasto'),
  modalGastoTitulo: document.getElementById('modalGastoTitulo'),
  btnCerrarModalGasto: document.getElementById('btnCerrarModalGasto'),
  btnCancelarModalGasto: document.getElementById('btnCancelarModalGasto'),
  formGasto: document.getElementById('formGasto'),
  gastoId: document.getElementById('gastoId'),
  gastoFecha: document.getElementById('gastoFecha'),
  gastoConcepto: document.getElementById('gastoConcepto'),
  gastoCategoria: document.getElementById('gastoCategoria'),
  gastoMonto: document.getElementById('gastoMonto'),
  gastoFormaPago: document.getElementById('gastoFormaPago'),
  gastoTieneFactura: document.getElementById('gastoTieneFactura'),
  errorGastoFecha: document.getElementById('errorGastoFecha'),
  errorGastoConcepto: document.getElementById('errorGastoConcepto'),
  errorGastoCategoria: document.getElementById('errorGastoCategoria'),
  errorGastoMonto: document.getElementById('errorGastoMonto'),
  errorGastoFormaPago: document.getElementById('errorGastoFormaPago'),
  errorGastoTieneFactura: document.getElementById('errorGastoTieneFactura'),

  // Modal Eliminar
  modalConfirmarEliminar: document.getElementById('modalConfirmarEliminar'),
  btnCerrarModalEliminar: document.getElementById('btnCerrarModalEliminar'),
  btnCancelarEliminar: document.getElementById('btnCancelarEliminar'),
  btnConfirmarEliminar: document.getElementById('btnConfirmarEliminar'),
  detalleGastoEliminar: document.getElementById('detalleGastoEliminar')
};

// ==========================================
// Utilidades de Interfaz y Notificaciones
// ==========================================

function mostrarAlerta(mensaje, tipo = 'peligro') {
  dom.alertaGlobal.className = `alerta alerta-${tipo}`;
  dom.alertaGlobalTexto.textContent = mensaje;
  dom.alertaGlobal.classList.remove('oculto');

  setTimeout(() => {
    dom.alertaGlobal.classList.add('oculto');
  }, 5000);
}

function limpiarErrores(prefijo) {
  const spans = document.querySelectorAll(`[id^="error${prefijo}"]`);
  for (const span of spans) {
    span.textContent = '';
  }
  const campos = document.querySelectorAll('.con-error');
  for (const c of campos) {
    c.classList.remove('con-error');
  }
}

function mostrarErroresEnFormulario(errores, mapaCampos) {
  for (const [campo, mensaje] of Object.entries(errores)) {
    const config = mapaCampos[campo];
    if (config) {
      if (config.input) config.input.classList.add('con-error');
      if (config.errorSpan) config.errorSpan.textContent = mensaje;
    }
  }
}

function obtenerFechaHoyIso() {
  const d = new Date();
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function obtenerMesActualIso() {
  const d = new Date();
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${anio}-${mes}`;
}

// ==========================================
// Control de Sesión y Vistas
// ==========================================

async function verificarEstadoSesion() {
  try {
    const datos = await api.verificarSesion();
    if (datos.autenticado && datos.usuario) {
      iniciarVistaAutenticada(datos.usuario);
    } else {
      mostrarVistaLogin();
    }
  } catch (err) {
    mostrarVistaLogin();
  }
}

function iniciarVistaAutenticada(usuario) {
  estado.usuario = usuario;
  dom.nombreUsuarioActual.textContent = usuario.nombre;
  dom.usuarioHeader.classList.remove('oculto');
  dom.seccionAuth.classList.add('oculto');
  dom.seccionApp.classList.remove('oculto');

  // Inicializar fecha y mes por defecto
  const mesActual = obtenerMesActualIso();
  dom.filtroMes.value = mesActual;
  estado.mesSeleccionado = mesActual;
  estado.categoriaSeleccionada = '';
  dom.filtroCategoria.value = '';

  // Configurar límite máximo de fecha para registros
  dom.gastoFecha.max = obtenerFechaHoyIso();

  cargarDatosMes();
}

function mostrarVistaLogin() {
  estado.usuario = null;
  dom.usuarioHeader.classList.add('oculto');
  dom.seccionApp.classList.add('oculto');
  dom.seccionAuth.classList.remove('oculto');
  cambiarTabAuth('login');
}

function cambiarTabAuth(tab) {
  limpiarErrores('Login');
  limpiarErrores('Reg');

  if (tab === 'login') {
    dom.tabLogin.classList.add('activo');
    dom.tabLogin.setAttribute('aria-selected', 'true');
    dom.tabRegistro.classList.remove('activo');
    dom.tabRegistro.setAttribute('aria-selected', 'false');
    dom.panelLogin.classList.remove('oculto');
    dom.panelRegistro.classList.add('oculto');
  } else {
    dom.tabRegistro.classList.add('activo');
    dom.tabRegistro.setAttribute('aria-selected', 'true');
    dom.tabLogin.classList.remove('activo');
    dom.tabLogin.setAttribute('aria-selected', 'false');
    dom.panelRegistro.classList.remove('oculto');
    dom.panelLogin.classList.add('oculto');
  }
}

// ==========================================
// Carga y Renderizado de Datos
// ==========================================

async function cargarDatosMes() {
  estado.cargando = true;
  mostrarEstadoUI('cargando');

  try {
    const [gastosRes, resumenRes] = await Promise.all([
      api.obtenerGastos({
        mes: estado.mesSeleccionado,
        categoria: estado.categoriaSeleccionada
      }),
      api.obtenerResumen(estado.mesSeleccionado)
    ]);

    estado.gastos = gastosRes.gastos || [];
    estado.resumen = resumenRes;

    renderizarResumen(estado.resumen);
    renderizarTablaGastos(estado.gastos);
  } catch (err) {
    if (err.status === 401) {
      mostrarVistaLogin();
      return;
    }
    mostrarEstadoUI('error', err.message);
  } finally {
    estado.cargando = false;
  }
}

function mostrarEstadoUI(estadoTipo, mensaje = '') {
  dom.estadoCargando.classList.add('oculto');
  dom.estadoVacio.classList.add('oculto');
  dom.estadoError.classList.add('oculto');
  dom.contenedorTabla.classList.add('oculto');

  if (estadoTipo === 'cargando') {
    dom.estadoCargando.classList.remove('oculto');
  } else if (estadoTipo === 'vacio') {
    dom.estadoVacio.classList.remove('oculto');
  } else if (estadoTipo === 'error') {
    dom.mensajeErrorCarga.textContent = mensaje || 'No fue posible cargar los datos del servidor.';
    dom.estadoError.classList.remove('oculto');
  } else if (estadoTipo === 'tabla') {
    dom.contenedorTabla.classList.remove('oculto');
  }
}

function renderizarResumen(resumen) {
  if (!resumen) return;

  dom.resumenTotalGastado.textContent = formatoMoneda.format(resumen.totalGastado || 0);
  dom.resumenCantidadGastos.textContent = `${resumen.cantidadGastos || 0} gastos registrados en el mes`;

  dom.resumenTotalDeducible.textContent = formatoMoneda.format(resumen.totalDeducible || 0);

  const porcentaje = resumen.totalGastado > 0
    ? Math.round((resumen.totalDeducible / resumen.totalGastado) * 100)
    : 0;
  dom.resumenPorcentajeDeducible.textContent = `${porcentaje}% del total gastado`;

  dom.resumenTotalNoDeducible.textContent = formatoMoneda.format(resumen.totalNoDeducible || 0);

  // Desglose por categorías
  dom.desgloseCategoriasContainer.innerHTML = '';
  const categorias = resumen.porCategoria || {};

  for (const [cat, monto] of Object.entries(categorias)) {
    const item = document.createElement('div');
    item.className = 'desglose-item';

    const catTitulo = document.createElement('div');
    catTitulo.className = 'desglose-categoria';
    catTitulo.textContent = cat;

    const catMonto = document.createElement('div');
    catMonto.className = 'desglose-monto';
    catMonto.textContent = formatoMoneda.format(monto || 0);

    item.appendChild(catTitulo);
    item.appendChild(catMonto);
    dom.desgloseCategoriasContainer.appendChild(item);
  }

  // Renderizar gráficos interactivos ligeros
  renderizarGraficos(resumen);
}

function renderizarGraficos(resumen) {
  if (!resumen || !resumen.totalGastado || Number(resumen.totalGastado) <= 0) {
    dom.seccionGraficos.classList.add('oculto');
    return;
  }

  dom.seccionGraficos.classList.remove('oculto');

  // 1. Gráfico Donut de Deducibilidad Fiscal (SVG interactivo)
  const total = Number(resumen.totalGastado);
  const deducible = Number(resumen.totalDeducible);
  const noDeducible = Number(resumen.totalNoDeducible);
  const pctDeducible = total > 0 ? (deducible / total) * 100 : 0;
  const pctNoDeducible = total > 0 ? (noDeducible / total) * 100 : 0;

  // Radio r = 54 -> circunferencia C = 2 * PI * 54 = 339.29
  const radio = 54;
  const circ = 2 * Math.PI * radio;
  const dashDeducible = (pctDeducible / 100) * circ;

  dom.graficoDeducibilidadContainer.innerHTML = `
    <svg class="svg-donut" viewBox="0 0 160 160" role="img" aria-label="Gráfico de deducibilidad fiscal">
      <!-- Círculo base no deducible -->
      <circle cx="80" cy="80" r="${radio}" fill="none" stroke="#94a3b8" stroke-width="18">
        <title>No deducible: ${formatoMoneda.format(noDeducible)} (${Math.round(pctNoDeducible)}%)</title>
      </circle>
      <!-- Segmento deducible -->
      <circle class="donut-segment" cx="80" cy="80" r="${radio}" fill="none" stroke="#166534" stroke-width="18"
        stroke-dasharray="${dashDeducible} ${circ}" stroke-dashoffset="0">
        <title>Deducible: ${formatoMoneda.format(deducible)} (${Math.round(pctDeducible)}%)</title>
      </circle>
      <!-- Texto central -->
      <text x="80" y="76" class="donut-centro">${Math.round(pctDeducible)}%</text>
      <text x="80" y="93" class="donut-subcentro">Deducible</text>
    </svg>
  `;

  // 2. Gráfico de Barras de Distribución por Categoría
  dom.graficoCategoriasContainer.innerHTML = '';
  const categorias = resumen.porCategoria || {};

  const clasesColor = {
    'Papelería': 'barra-fill-papeleria',
    'Transporte': 'barra-fill-transporte',
    'Alimentos': 'barra-fill-alimentos',
    'Servicios': 'barra-fill-servicios',
    'Otros': 'barra-fill-otros'
  };

  for (const [cat, monto] of Object.entries(categorias)) {
    const montoNum = Number(monto);
    const pct = total > 0 ? ((montoNum / total) * 100).toFixed(1) : '0.0';
    const claseColor = clasesColor[cat] || 'barra-fill-otros';

    const fila = document.createElement('div');
    fila.className = 'barra-fila';

    const meta = document.createElement('div');
    meta.className = 'barra-meta';

    const etiqueta = document.createElement('span');
    etiqueta.className = 'barra-etiqueta';
    etiqueta.textContent = cat;

    const montoSpan = document.createElement('span');
    montoSpan.className = 'barra-monto';
    montoSpan.textContent = `${formatoMoneda.format(montoNum)} (${pct}%)`;

    meta.appendChild(etiqueta);
    meta.appendChild(montoSpan);

    const track = document.createElement('div');
    track.className = 'barra-track';
    track.title = `${cat}: ${formatoMoneda.format(montoNum)} (${pct}%)`;

    const fill = document.createElement('div');
    fill.className = `barra-fill ${claseColor}`;
    fill.style.width = `${pct}%`;

    track.appendChild(fill);
    fila.appendChild(meta);
    fila.appendChild(track);

    dom.graficoCategoriasContainer.appendChild(fila);
  }
}

function renderizarTablaGastos(gastos) {
  dom.cuerpoTablaGastos.innerHTML = '';

  if (!gastos || gastos.length === 0) {
    mostrarEstadoUI('vacio');
    return;
  }

  mostrarEstadoUI('tabla');

  for (const gasto of gastos) {
    const tr = document.createElement('tr');

    // 1. Fecha
    const tdFecha = document.createElement('td');
    tdFecha.setAttribute('data-label', 'Fecha');
    tdFecha.textContent = gasto.fecha;
    tr.appendChild(tdFecha);

    // 2. Concepto (escapado de forma segura con textContent)
    const tdConcepto = document.createElement('td');
    tdConcepto.setAttribute('data-label', 'Concepto');
    tdConcepto.textContent = gasto.concepto;
    tr.appendChild(tdConcepto);

    // 3. Categoría
    const tdCat = document.createElement('td');
    tdCat.setAttribute('data-label', 'Categoría');
    tdCat.textContent = gasto.categoria;
    tr.appendChild(tdCat);

    // 4. Monto
    const tdMonto = document.createElement('td');
    tdMonto.setAttribute('data-label', 'Monto');
    tdMonto.className = 'col-monto';
    tdMonto.textContent = formatoMoneda.format(gasto.monto);
    tr.appendChild(tdMonto);

    // 5. Forma de Pago
    const tdFormaPago = document.createElement('td');
    tdFormaPago.setAttribute('data-label', 'Forma de Pago');
    tdFormaPago.textContent = gasto.forma_pago;
    tr.appendChild(tdFormaPago);

    // 6. Factura
    const tdFactura = document.createElement('td');
    tdFactura.setAttribute('data-label', 'Factura');
    tdFactura.textContent = gasto.tiene_factura ? 'Sí' : 'No';
    tr.appendChild(tdFactura);

    // 7. Deducibilidad
    const tdDeducible = document.createElement('td');
    tdDeducible.setAttribute('data-label', 'Deducibilidad');
    const badge = document.createElement('span');
    badge.className = `insignia ${gasto.deducible ? 'insignia-deducible' : 'insignia-no-deducible'}`;
    badge.textContent = gasto.deducible ? 'Deducible' : 'No deducible';
    tdDeducible.appendChild(badge);
    tr.appendChild(tdDeducible);

    // 8. Acciones
    const tdAcciones = document.createElement('td');
    tdAcciones.setAttribute('data-label', 'Acciones');
    tdAcciones.className = 'col-acciones';

    const btnEditar = document.createElement('button');
    btnEditar.type = 'button';
    btnEditar.className = 'btn btn-secundario btn-pequeno';
    btnEditar.textContent = 'Editar';
    btnEditar.addEventListener('click', () => abrirModalEditarGasto(gasto));

    const btnEliminar = document.createElement('button');
    btnEliminar.type = 'button';
    btnEliminar.className = 'btn btn-peligro btn-pequeno';
    btnEliminar.textContent = 'Eliminar';
    btnEliminar.addEventListener('click', () => abrirModalEliminarGasto(gasto));

    tdAcciones.appendChild(btnEditar);
    tdAcciones.appendChild(btnEliminar);
    tr.appendChild(tdAcciones);

    dom.cuerpoTablaGastos.appendChild(tr);
  }
}

// ==========================================
// Gestión de Formularios y Modales
// ==========================================

function abrirModalNuevoGasto() {
  estado.gastoEnEdicion = null;
  limpiarErrores('Gasto');
  dom.formGasto.reset();
  dom.gastoId.value = '';
  dom.modalGastoTitulo.textContent = 'Registrar Nuevo Gasto';

  // Precargar fecha de hoy o del mes seleccionado si corresponde
  dom.gastoFecha.max = obtenerFechaHoyIso();
  dom.gastoFecha.value = obtenerFechaHoyIso();
  dom.gastoTieneFactura.value = '1';

  dom.modalGasto.classList.remove('oculto');
  dom.gastoFecha.focus();
}

function abrirModalEditarGasto(gasto) {
  estado.gastoEnEdicion = gasto;
  limpiarErrores('Gasto');
  dom.modalGastoTitulo.textContent = 'Editar Gasto';

  dom.gastoId.value = gasto.id;
  dom.gastoFecha.max = obtenerFechaHoyIso();
  dom.gastoFecha.value = gasto.fecha;
  dom.gastoConcepto.value = gasto.concepto;
  dom.gastoCategoria.value = gasto.categoria;
  dom.gastoMonto.value = gasto.monto;
  dom.gastoFormaPago.value = gasto.forma_pago;
  dom.gastoTieneFactura.value = gasto.tiene_factura ? '1' : '0';

  dom.modalGasto.classList.remove('oculto');
  dom.gastoConcepto.focus();
}

function cerrarModalGasto() {
  dom.modalGasto.classList.add('oculto');
  estado.gastoEnEdicion = null;
}

function abrirModalEliminarGasto(gasto) {
  estado.gastoAEliminar = gasto;
  dom.detalleGastoEliminar.textContent = `${gasto.fecha} - ${gasto.concepto} (${formatoMoneda.format(gasto.monto)})`;
  dom.modalConfirmarEliminar.classList.remove('oculto');
  dom.btnCancelarEliminar.focus();
}

function cerrarModalEliminar() {
  dom.modalConfirmarEliminar.classList.add('oculto');
  estado.gastoAEliminar = null;
}

// ==========================================
// Event Listeners y Manejo de Eventos
// ==========================================

// Pestañas de Autenticación
dom.tabLogin.addEventListener('click', () => cambiarTabAuth('login'));
dom.tabRegistro.addEventListener('click', () => cambiarTabAuth('registro'));

// Envío de Inicio de Sesión
dom.formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores('Login');

  const correo = dom.loginCorreo.value.trim();
  const password = dom.loginPassword.value;

  let hayErrores = false;
  if (!correo) {
    dom.loginCorreo.classList.add('con-error');
    dom.errorLoginCorreo.textContent = 'Ingresa tu correo electrónico.';
    hayErrores = true;
  }
  if (!password) {
    dom.loginPassword.classList.add('con-error');
    dom.errorLoginPassword.textContent = 'Ingresa tu contraseña.';
    hayErrores = true;
  }
  if (hayErrores) return;

  try {
    const res = await api.iniciarSesion({ correo, password });
    mostrarAlerta('Bienvenido al sistema.', 'exito');
    iniciarVistaAutenticada(res.usuario);
  } catch (err) {
    if (err.detalles) {
      mostrarErroresEnFormulario(err.detalles, {
        correo: { input: dom.loginCorreo, errorSpan: dom.errorLoginCorreo },
        password: { input: dom.loginPassword, errorSpan: dom.errorLoginPassword }
      });
    } else {
      dom.loginPassword.classList.add('con-error');
      dom.errorLoginPassword.textContent = err.message || 'Credenciales inválidas.';
    }
  }
});

// Envío de Registro
dom.formRegistro.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores('Reg');

  const nombre = dom.regNombre.value.trim();
  const correo = dom.regCorreo.value.trim();
  const password = dom.regPassword.value;

  let hayErrores = false;
  if (!nombre || nombre.length < 2) {
    dom.regNombre.classList.add('con-error');
    dom.errorRegNombre.textContent = 'El nombre debe tener al menos 2 caracteres.';
    hayErrores = true;
  }
  if (!correo) {
    dom.regCorreo.classList.add('con-error');
    dom.errorRegCorreo.textContent = 'Ingresa un correo electrónico.';
    hayErrores = true;
  }
  if (!password || password.length < 8) {
    dom.regPassword.classList.add('con-error');
    dom.errorRegPassword.textContent = 'La contraseña debe tener al menos 8 caracteres.';
    hayErrores = true;
  }
  if (hayErrores) return;

  try {
    const res = await api.registrarse({ nombre, correo, password });
    mostrarAlerta('Cuenta creada con éxito.', 'exito');
    iniciarVistaAutenticada(res.usuario);
  } catch (err) {
    if (err.detalles) {
      mostrarErroresEnFormulario(err.detalles, {
        nombre: { input: dom.regNombre, errorSpan: dom.errorRegNombre },
        correo: { input: dom.regCorreo, errorSpan: dom.errorRegCorreo },
        password: { input: dom.regPassword, errorSpan: dom.errorRegPassword }
      });
    } else {
      mostrarAlerta(err.message, 'peligro');
    }
  }
});

// Cierre de sesión
dom.btnCerrarSesion.addEventListener('click', async () => {
  try {
    await api.cerrarSesion();
  } catch (err) {
    // Si falla la red se limpia el estado igualmente
  }
  mostrarAlerta('Sesión cerrada correctamente.', 'exito');
  mostrarVistaLogin();
});

// Filtros
dom.filtroMes.addEventListener('change', () => {
  estado.mesSeleccionado = dom.filtroMes.value;
  cargarDatosMes();
});

dom.filtroCategoria.addEventListener('change', () => {
  estado.categoriaSeleccionada = dom.filtroCategoria.value;
  cargarDatosMes();
});

// Botones para abrir modal nuevo gasto
dom.btnAbrirModalNuevoGasto.addEventListener('click', abrirModalNuevoGasto);
dom.btnNuevoGastoVacio.addEventListener('click', abrirModalNuevoGasto);
dom.btnReintentarCarga.addEventListener('click', cargarDatosMes);

// Cierre de modales
dom.btnCerrarModalGasto.addEventListener('click', cerrarModalGasto);
dom.btnCancelarModalGasto.addEventListener('click', cerrarModalGasto);
dom.btnCerrarModalEliminar.addEventListener('click', cerrarModalEliminar);
dom.btnCancelarEliminar.addEventListener('click', cerrarModalEliminar);

// Cerrar modales con la tecla Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!dom.modalGasto.classList.contains('oculto')) {
      cerrarModalGasto();
    }
    if (!dom.modalConfirmarEliminar.classList.contains('oculto')) {
      cerrarModalEliminar();
    }
  }
});

// Guardar gasto (Crear o Editar)
dom.formGasto.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores('Gasto');

  const fecha = dom.gastoFecha.value;
  const concepto = dom.gastoConcepto.value.trim();
  const categoria = dom.gastoCategoria.value;
  const monto = dom.gastoMonto.value;
  const forma_pago = dom.gastoFormaPago.value;
  const tiene_factura = dom.gastoTieneFactura.value === '1';

  // Validación rápida en cliente
  let hayErrores = false;
  if (!fecha) {
    dom.gastoFecha.classList.add('con-error');
    dom.errorGastoFecha.textContent = 'La fecha es obligatoria.';
    hayErrores = true;
  }
  if (!concepto || concepto.length < 3 || concepto.length > 120) {
    dom.gastoConcepto.classList.add('con-error');
    dom.errorGastoConcepto.textContent = 'El concepto debe tener entre 3 y 120 caracteres.';
    hayErrores = true;
  }
  if (!categoria) {
    dom.gastoCategoria.classList.add('con-error');
    dom.errorGastoCategoria.textContent = 'Selecciona una categoría.';
    hayErrores = true;
  }
  if (!monto || Number(monto) <= 0) {
    dom.gastoMonto.classList.add('con-error');
    dom.errorGastoMonto.textContent = 'El monto debe ser un número mayor a cero.';
    hayErrores = true;
  }
  if (!forma_pago) {
    dom.gastoFormaPago.classList.add('con-error');
    dom.errorGastoFormaPago.textContent = 'Selecciona la forma de pago.';
    hayErrores = true;
  }

  if (hayErrores) return;

  const payload = {
    fecha,
    concepto,
    categoria,
    monto: Number(monto),
    forma_pago,
    tiene_factura
  };

  const id = dom.gastoId.value;

  try {
    if (id) {
      await api.actualizarGasto(id, payload);
      mostrarAlerta('Gasto actualizado exitosamente.', 'exito');
    } else {
      await api.crearGasto(payload);
      mostrarAlerta('Gasto registrado exitosamente.', 'exito');
    }
    cerrarModalGasto();

    // Actualizar filtro de mes al mes del gasto creado si es diferente
    const mesDelGasto = fecha.substring(0, 7);
    if (estado.mesSeleccionado !== mesDelGasto) {
      estado.mesSeleccionado = mesDelGasto;
      dom.filtroMes.value = mesDelGasto;
    }

    cargarDatosMes();
  } catch (err) {
    if (err.detalles) {
      mostrarErroresEnFormulario(err.detalles, {
        fecha: { input: dom.gastoFecha, errorSpan: dom.errorGastoFecha },
        concepto: { input: dom.gastoConcepto, errorSpan: dom.errorGastoConcepto },
        categoria: { input: dom.gastoCategoria, errorSpan: dom.errorGastoCategoria },
        monto: { input: dom.gastoMonto, errorSpan: dom.errorGastoMonto },
        forma_pago: { input: dom.gastoFormaPago, errorSpan: dom.errorGastoFormaPago },
        tiene_factura: { input: dom.gastoTieneFactura, errorSpan: dom.errorGastoTieneFactura }
      });
    } else {
      mostrarAlerta(err.message, 'peligro');
    }
  }
});

// Confirmar eliminación de gasto
dom.btnConfirmarEliminar.addEventListener('click', async () => {
  if (!estado.gastoAEliminar) return;

  try {
    await api.eliminarGasto(estado.gastoAEliminar.id);
    mostrarAlerta('Gasto eliminado exitosamente.', 'exito');
    cerrarModalEliminar();
    cargarDatosMes();
  } catch (err) {
    mostrarAlerta(err.message || 'No fue posible eliminar el gasto.', 'peligro');
    cerrarModalEliminar();
  }
});

// Exportar a CSV (Punto opcional)
dom.btnExportarCsv.addEventListener('click', () => {
  const url = api.obtenerUrlExportacionCsv(estado.mesSeleccionado, estado.categoriaSeleccionada);
  window.location.href = url;
});

// Inicialización de la aplicación
verificarEstadoSesion();
