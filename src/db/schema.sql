-- Esquema de base de datos relacional para Sistema de Control de Gastos ISEF
-- Compatible con SQLite, con soporte de llaves foráneas y tipos decimales exactos.

PRAGMA foreign_keys = ON;

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_correo ON usuarios(correo);

-- Tabla de Gastos
-- Nota técnica: El monto se almacena en NUMERIC(10,2) para mantener precisión decimal
-- exacta y evitar errores de redondeo binario inherentes al tipo coma flotante (IEEE 754).
CREATE TABLE IF NOT EXISTS gastos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  concepto TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('Papelería', 'Transporte', 'Alimentos', 'Servicios', 'Otros')),
  monto NUMERIC(10, 2) NOT NULL CHECK (monto > 0),
  forma_pago TEXT NOT NULL CHECK (forma_pago IN ('Efectivo', 'Transferencia', 'Tarjeta')),
  tiene_factura INTEGER NOT NULL CHECK (tiene_factura IN (0, 1)),
  creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gastos_usuario_fecha ON gastos(usuario_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_usuario_categoria ON gastos(usuario_id, categoria);
