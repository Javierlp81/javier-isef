# Sistema de Control de Gastos y Deducibilidad Fiscal

> Práctica técnica para el puesto de Desarrollador Full Stack Junior  
> Caso: Sistema de control de gastos de oficina y deducibilidad fiscal (Art. 27 LISR)  
> Ediciones Fiscales ISEF

---

## 1. Descripción del Sistema

Aplicación web full stack diseñada para que el personal de una oficina registre y administre sus gastos mensuales de operación, determinando de forma automática y precisa cuáles gastos son fiscalmente deducibles según las disposiciones de la Ley del Impuesto sobre la Renta (LISR).

Cada usuario cuenta con una cuenta protegida e independiente, garantizando el aislamiento absoluto de su información (ningún usuario puede ver, editar ni eliminar los gastos de otra persona).

### Tecnologías Utilizadas

- **Entorno de ejecución:** Node.js (v20+ o v22+)
- **Servidor y API REST:** Express.js 4
- **Base de datos:** SQLite relacional mediante `better-sqlite3` (con soporte estricto de claves foráneas y modo WAL)
- **Seguridad y Criptografía:** `bcryptjs` (algoritmo bcrypt con 10 rondas de sal para contraseñas) y `express-session` con cookies seguras `httpOnly`
- **Frontend:** HTML5 semántico, CSS3 moderno con variables y diseño responsivo, JavaScript ES Modules nativo (sin dependencias de empaquetado complejas que puedan fallar en una máquina limpia)
- **Suite de Pruebas:** Módulo nativo `node:test` y `node:assert/strict` de Node.js, complementado con `supertest` para pruebas de integración de API
- **Contenedores y CI:** Docker, Docker Compose y GitHub Actions

---

## 2. Requisitos Previos

Para ejecutar la aplicación en un equipo local limpio, únicamente se requiere:

- **Node.js:** Versión 20.x, 22.x o superior ([Descargar Node.js](https://nodejs.org/))
- **npm:** Versión 10.x u 11.x (incluido automáticamente con Node.js)
- **Git:** Para clonar el repositorio y auditar el historial de ramas

*(Opcional)* Si desea ejecutar mediante contenedores:
- **Docker Engine y Docker Compose:** Cualquier versión moderna de Docker Desktop.

---

## 3. Instalación y Puesta en Marcha (Menos de 5 minutos)

Siga estos sencillos pasos desde su terminal:

### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/Javierlp81/javier-isef.git
cd javier-isef
```

### Paso 2: Configurar las variables de entorno
Copie la plantilla de variables de entorno (el repositorio no almacena contraseñas ni secretos reales):

En Linux / macOS / Git Bash:
```bash
cp .env.example .env
```

En Windows (PowerShell):
```powershell
Copy-Item .env.example .env
```

En Windows (CMD):
```cmd
copy .env.example .env
```

Las variables contenidas en `.env` vienen con valores funcionales por defecto para desarrollo:
- `PORT=3000`: Puerto donde escuchará la aplicación.
- `NODE_ENV=development`: Modo de desarrollo.
- `SESSION_SECRET=isef_dev_session_secret_key_2026_local`: Firma de cookies de sesión.
- `DB_PATH=./data/gastos.db`: Ruta del archivo de base de datos SQLite.
- `LIMITE_EFECTIVO_DEDUCIBLE=2000.00`: Tope en pesos para deducir gastos en efectivo.

### Paso 3: Instalar dependencias
```bash
npm install
```

### Paso 4: Inicializar la base de datos
Ejecute el script de migración para crear las tablas relacionales, índices y restricciones:
```bash
npm run migrate
```

### Paso 5: Iniciar el servidor
```bash
npm start
```

Abra su navegador web en:  
**http://localhost:3000**

*(Opcional: Modo desarrollo con reinicio automático al guardar cambios)*
```bash
npm run dev
```

---

## 4. Ejecución Alternativa con Docker (Punto Opcional)

Si prefiere no instalar Node.js en su máquina local, puede levantar todo el sistema con un solo comando usando Docker Compose:

```bash
docker compose up --build
```

El servicio creará el contenedor, configurará la base de datos con volumen persistente y publicará la aplicación en `http://localhost:3000`.

---

## 5. Ejecución de Pruebas Automatizadas

El proyecto incluye 39 pruebas automatizadas que cubren:
1. **Regla de Deducibilidad Fiscal (6 casos exactos del Art. 27 LISR)**.
2. **Cálculo de totales, porcentajes y desglose por categoría**.
3. **Validaciones de negocio del servidor** (fechas futuras, longitud de conceptos, categorías oficiales, montos positivos y contraseñas de al menos 8 caracteres).
4. **Pruebas de Integración de API** (registro, login, cookies de sesión, protección HTTP 401).
5. **Seguridad y Aislamiento entre usuarios** (verificación estricta de que un usuario recibe HTTP 403 al intentar consultar, modificar o eliminar registros ajenos).
6. **Puntos opcionales** (exportación a CSV y paginación).

Para ejecutar toda la suite con un solo comando:
```bash
npm test
```

Salida esperada:
```text
ℹ tests 39
ℹ suites 15
ℹ pass 39
ℹ fail 0
```

---

## 6. Decisiones Técnicas y Justificación

### 6.1 ¿Por qué los montos se guardan en un tipo decimal exacto?
En los sistemas financieros y contables, el uso de números de coma flotante binaria estándar (como el tipo `FLOAT` o `DOUBLE` definido por la norma IEEE 754) representa números en base 2. Fracciones decimales cotidianas como `0.1` o `0.2` no tienen una representación binaria finita, provocando anomalías de precisión (por ejemplo: `0.1 + 0.2 = 0.30000000000000004`).

En cálculos fiscales, un error de un solo centavo puede descalificar una deducción ante el SAT o generar descuadres en auditorías. Por ello:
1. **En la base de datos relacional:** Se utiliza `NUMERIC(10, 2)` con validación de restricción `CHECK (monto > 0)` y dos decimales exactos.
2. **En la lógica de negocio en servidor (`src/services/deducibilidad.js`):** Las sumatorias y cálculos de totales se procesan convirtiendo temporalmente los montos a centavos enteros (`Math.round(monto * 100)`), realizando la aritmética sobre enteros (100% exacta) y transformando al final a decimal (`centavos / 100`).

### 6.2 Regla de deducibilidad centralizada en un solo archivo
El documento solicita que la regla fiscal viva en un único punto del código, permitiendo cambiar el límite de `$2,000.00` modificando un único valor:
- La constante `LIMITE_EFECTIVO_DEDUCIBLE` y la función `esGastoDeducible` residen exclusivamente en `src/services/deducibilidad.js`.
- La regla permite configuración dinámica mediante la variable de entorno `LIMITE_EFECTIVO_DEDUCIBLE` o modificando la constante predeterminada. Ningún controlador, ruta o vista repite la lógica condicional ni el monto del límite.

### 6.3 Elección de SQLite y Better-SQLite3
- **Portabilidad absoluta:** Permite que cualquier evaluador clone y ejecute el proyecto de inmediato sin necesidad de instalar o configurar servidores externos como PostgreSQL o MySQL.
- **Relacional real:** SQLite es un motor SQL relacional completo. Con `PRAGMA foreign_keys = ON`, se validan llaves foráneas estrictas (`ON DELETE CASCADE`), índices únicos para evitar correos duplicados y restricciones de dominio (`CHECK`).
- **Consultas parametrizadas:** Se utiliza la sintaxis de sentencias preparadas de `better-sqlite3` (`db.prepare('... WHERE id = ?').get(id)`), mitigando al 100% el riesgo de inyección SQL (SQLi).
- **Entorno de pruebas en memoria:** En las pruebas automatizadas se utiliza `getDatabase(':memory:')`, permitiendo pruebas ultrarrápidas (menos de 900 ms) sin tocar el disco ni dejar basura temporal.

### 6.4 Seguridad y Protección de Datos
- **Hasheo de contraseñas:** Se implementó `bcryptjs` con 10 rondas de sal. Las contraseñas jamás se almacenan ni comparan en texto plano, ni con algoritmos obsoletos como MD5 o SHA-1.
- **Aislamiento multiusuario:** En cada endpoint de consulta, edición o borrado (`/api/gastos/:id`), se valida si el registro pertenece al `usuario_id` de la sesión. Si un usuario intenta forzar un ID ajeno, el servidor rechaza la petición con código **HTTP 403 Forbidden**.
- **Sesiones HTTP-only:** Las sesiones se gestionan mediante cookies con los atributos `httpOnly: true` (inaccesibles desde scripts en el cliente para prevenir robo de sesión por XSS) y `sameSite: 'lax'`.
- **Manejo de errores sanitizado:** El middleware `errorHandler.js` intercepta cualquier excepción no controlada y responde con un mensaje genérico HTTP 500, asegurando que nunca se filtren trazas de error, rutas del disco o consultas SQL al usuario final.

### 6.5 Interfaz y Filosofía de Diseño
Enfoque de diseño funcional, limpio y accesible:
- La interfaz prescinde de gradientes artificiales, tipografías mono ilegibles o elementos decorativos sobrecargados.
- Se seleccionó una paleta institucional sobria inspirada en el contexto fiscal de ISEF: azul pizarra oscuro (`#1e293b`), fondo neutro claro (`#f8fafc`) y acentos en rojo institucional (`#991b1b`) y verde fiscal (`#166534`).
- Contraste validado superior a 4.5:1 en todos los textos.
- Todos los campos de formulario cuentan con etiquetas `<label>` vinculadas y pueden operarse íntegramente mediante teclado (`Tab`, `Enter`, `Escape` para cerrar modales).
- Diseño completamente responsivo: en pantallas de escritorio se visualiza una tabla tabular y en teléfonos móviles se transforma automáticamente en tarjetas legibles con objetivos táctiles de al menos 44px.
- Todos los datos ingresados por el usuario se insertan mediante `textContent`, evitando vulnerabilidades XSS.
- Gráficos interactivos ligeros: Visualización SVG nativa de la composición deducible vs no deducible y barras de distribución por categoría con porcentajes y tooltips dinámicos sin dependencias pesadas.

---

## 7. Estructura del Proyecto

```text
isef-control-gastos/
├── .github/
│   └── workflows/
│       └── ci.yml               # Flujo de GitHub Actions CI para pruebas continuas
├── public/                      # Frontend cliente
│   ├── css/
│   │   └── styles.css           # Estilos para interfaz de usuario responsiva, accesible e interactiva
│   ├── js/
│   │   ├── api.js               # Cliente para consumo de endpoints REST
│   │   └── app.js               # Lógica de interfaz, modales y renderizado seguro
│   └── index.html               # Vista principal SPA semántica
├── src/
│   ├── config/
│   │   ├── database.js          # Conexión SQLite, soporte WAL y base en memoria
│   │   └── env.js               # Carga y tipado de variables de entorno
│   ├── db/
│   │   ├── migrate.js           # Script para aplicar migraciones
│   │   └── schema.sql           # Esquema relacional SQL (tablas usuarios y gastos)
│   ├── middleware/
│   │   ├── auth.js              # Middleware de verificación de sesión activa
│   │   └── errorHandler.js      # Manejador global seguro de errores HTTP
│   ├── routes/
│   │   ├── auth.routes.js       # Endpoints /api/registro y /api/sesion
│   │   ├── gastos.routes.js     # Endpoints CRUD /api/gastos y exportación CSV
│   │   └── resumen.routes.js    # Endpoint /api/resumen con cálculos fiscales
│   ├── services/
│   │   ├── deducibilidad.js     # Regla centralizada de deducibilidad y totales
│   │   └── validaciones.js      # Reglas de validación de entradas
│   ├── app.js                   # Fábrica de la aplicación Express
│   └── server.js                # Punto de entrada y arranque del servidor HTTP
├── tests/
│   ├── api.test.js              # Pruebas de integración de API y seguridad
│   ├── deducibilidad.test.js    # Pruebas unitarias de los 6 casos de deducibilidad
│   └── validaciones.test.js     # Pruebas unitarias de validaciones de negocio
├── .dockerignore
├── .env.example                 # Plantilla de variables sin secretos reales
├── .gitignore                   # Exclusión de node_modules, .env y *.db
├── Dockerfile                   # Imagen Docker para producción
├── docker-compose.yml           # Orquestación de contenedor con volumen
├── package.json                 # Configuración de dependencias y scripts
└── README.md                    # Documentación del proyecto
```

---

## 8. Rutas de la API REST

| Método | Ruta | Descripción | Código Éxito | Códigos Error |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/registro` | Crea una cuenta de usuario nueva | `201 Created` | `400`, `409` |
| `POST` | `/api/sesion` | Inicia sesión con credenciales | `200 OK` | `400`, `401` |
| `DELETE`| `/api/sesion` | Cierra la sesión activa | `200 OK` | `500` |
| `GET` | `/api/sesion` | Consulta el usuario autenticado actual | `200 OK` | - |
| `GET` | `/api/gastos` | Lista gastos con filtros opcionales (`mes`, `categoria`, `page`, `limit`) | `200 OK` | `401` |
| `POST` | `/api/gastos` | Registra un nuevo gasto | `201 Created` | `400`, `401` |
| `GET` | `/api/gastos/:id` | Obtiene un gasto por ID (con validación de propietario) | `200 OK` | `400`, `401`, `403`, `404` |
| `PUT` | `/api/gastos/:id` | Modifica un gasto existente (con validación de propietario) | `200 OK` | `400`, `401`, `403`, `404` |
| `DELETE`| `/api/gastos/:id` | Elimina un gasto existente (con validación de propietario) | `200 OK` | `400`, `401`, `403`, `404` |
| `GET` | `/api/resumen?mes=AAAA-MM` | Totales del mes, deducible y desglose | `200 OK` | `400`, `401` |
| `GET` | `/api/gastos/exportar?mes=AAAA-MM` | Descarga de reporte en formato CSV (RFC 4180) | `200 OK` | `401` |

---

## 9. Historial de Control de Versiones (Git)

En cumplimiento con la sección 5.5 del documento de evaluación:
- El repositorio cuenta con un historial de commits progresivos y descriptivos.
- Se implementó la rama de trabajo `feature/gestion-gastos-resumen` para desarrollar el módulo central de gastos y resumen, la cual fue posteriormente integrada a `main` mediante un commit de fusión explícito (`merge --no-ff`).
- El archivo `.gitignore` excluye dependencias (`node_modules`), variables de entorno locales (`.env`) y archivos de base de datos (`*.db`).

Para auditar el grafo de versiones:
```bash
git log --graph --oneline
```

---

## 10. Mejoras Futuras y Evolución del Sistema

Habiendo cubierto el 100% de los requerimientos obligatorios y los puntos opcionales solicitados en la evaluación técnica, las siguientes propuestas aportarían valor adicional en una etapa de escalamiento productivo:

1. **Autenticación en dos factores (2FA):** Incorporación de códigos TOTP temporales para elevar la seguridad en el acceso corporativo.
2. **Validación automatizada de CFDI (XML):** Carga del archivo XML de la factura para verificar contra el servicio web del SAT el RFC emisor, UUID y estatus de vigencia.
3. **Soporte multimoneda:** Registro de gastos en moneda extranjera (USD, EUR) con conversión automática según el tipo de cambio oficial publicado por el Diario Oficial de la Federación (DOF) a la fecha del gasto.
4. **Análisis histórico interanual:** Métricas comparativas y proyecciones fiscales entre diferentes ejercicios fiscales.
