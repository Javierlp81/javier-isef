// Funciones para hacer las peticiones al backend

async function peticion(url, opciones = {}) {
  const config = {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.headers || {})
    }
  };

  try {
    const respuesta = await fetch(url, config);
    const esJson = respuesta.headers.get('content-type')?.includes('application/json');
    const datos = esJson ? await respuesta.json() : null;

    if (!respuesta.ok) {
      const error = new Error(datos?.error || `Error HTTP ${respuesta.status}`);
      error.status = respuesta.status;
      error.detalles = datos?.detalles || null;
      throw error;
    }

    return datos;
  } catch (err) {
    if (err.status) throw err;
    const errorRed = new Error('No fue posible conectar con el servidor. Verifique su conexión de red.');
    errorRed.status = 0;
    throw errorRed;
  }
}

export const api = {
  // Autenticación
  async verificarSesion() {
    return peticion('/api/sesion', { method: 'GET' });
  },

  async iniciarSesion(credenciales) {
    return peticion('/api/sesion', {
      method: 'POST',
      body: JSON.stringify(credenciales)
    });
  },

  async registrarse(datosUsuario) {
    return peticion('/api/registro', {
      method: 'POST',
      body: JSON.stringify(datosUsuario)
    });
  },

  async cerrarSesion() {
    return peticion('/api/sesion', { method: 'DELETE' });
  },

  // Gastos
  async obtenerGastos({ mes, categoria } = {}) {
    const params = new URLSearchParams();
    if (mes) params.append('mes', mes);
    if (categoria) params.append('categoria', categoria);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return peticion(`/api/gastos${qs}`, { method: 'GET' });
  },

  async crearGasto(datos) {
    return peticion('/api/gastos', {
      method: 'POST',
      body: JSON.stringify(datos)
    });
  },

  async obtenerGastoPorId(id) {
    return peticion(`/api/gastos/${id}`, { method: 'GET' });
  },

  async actualizarGasto(id, datos) {
    return peticion(`/api/gastos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos)
    });
  },

  async eliminarGasto(id) {
    return peticion(`/api/gastos/${id}`, { method: 'DELETE' });
  },

  // Resumen
  async obtenerResumen(mes) {
    const qs = mes ? `?mes=${encodeURIComponent(mes)}` : '';
    return peticion(`/api/resumen${qs}`, { method: 'GET' });
  },

  // Exportar CSV
  obtenerUrlExportacionCsv(mes, categoria) {
    const params = new URLSearchParams();
    if (mes) params.append('mes', mes);
    if (categoria) params.append('categoria', categoria);
    return `/api/gastos/exportar?${params.toString()}`;
  }
};
