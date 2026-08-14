# AhoritaPago API

API REST para administrar usuarios, grupos y deudas compartidas. La interfaz
HTTP soportada se publica exclusivamente bajo `/api/v2` y responde en JSON.

## Funcionalidades

- Registro e inicio de sesión con JWT.
- Creación y administración de grupos.
- Incorporación de integrantes por cualquier miembro del grupo.
- Creación, consulta, actualización y pago de deudas con historial permanente.
- Historial separado entre deudas activas y pagadas.
- Resumen financiero y saldos calculados desde las deudas activas.
- Importes COP enteros, almacenados como `Int64` sin cálculos con flotantes.
- Paginación y ordenamiento de listados desde MongoDB.

## Tecnologías

- Node.js y Express.
- MongoDB y Mongoose.
- JSON Web Tokens para autenticación.
- bcryptjs para hash de contraseñas.
- express-validator para validación HTTP.
- Helmet, CORS y express-rate-limit para seguridad transversal.
- `node:test` para pruebas automatizadas.

## Requisitos

- Node.js 20 o superior recomendado.
- npm.
- MongoDB accesible mediante `mongodb://` o `mongodb+srv://`.
- MongoDB configurado como replica set para las operaciones transaccionales.

## Instalación local

```bash
npm install
```

Copia `.env.example` como `.env` y reemplaza los valores necesarios:

```env
PORT=3000
DATABASE_URL=mongodb://127.0.0.1:27017/ahoritapago?replicaSet=rs0
JWT_SECRET=un-secreto-aleatorio-de-al-menos-32-caracteres
```

Inicia la API en desarrollo:

```bash
npm run dev
```

O ejecútala sin recarga automática:

```bash
npm start
```

La configuración se valida completamente antes de construir la aplicación. Si
falta `PORT`, `DATABASE_URL` o `JWT_SECRET`, el proceso termina con el código
`INVALID_CONFIGURATION` sin iniciar parcialmente el servidor.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto HTTP, entre 1 y 65535. |
| `DATABASE_URL` | URI válida de MongoDB. |
| `JWT_SECRET` | Secreto JWT de al menos 32 caracteres. |
| `CORS_ALLOW_LOCALHOST` | Permite orígenes locales cuando vale `true`. |
| `CORS_ALLOWED_ORIGINS` | Orígenes HTTP/HTTPS permitidos, separados por comas. |
| `JSON_BODY_LIMIT` | Tamaño máximo del body JSON. Valor predeterminado: `100kb`. |
| `RATE_LIMIT_ENABLED` | Activa los límites por IP cuando vale `true`. |
| `TRUST_PROXY_HOPS` | Cantidad de proxies confiables. Valor predeterminado: `0`. |
| `GLOBAL_RATE_LIMIT_WINDOW_MS` | Ventana del límite general en milisegundos. |
| `GLOBAL_RATE_LIMIT_MAX` | Solicitudes generales permitidas por ventana. |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | Ventana del límite de login. |
| `LOGIN_RATE_LIMIT_MAX` | Intentos de login permitidos por ventana. |
| `REGISTRATION_RATE_LIMIT_WINDOW_MS` | Ventana del límite de registro. |
| `REGISTRATION_RATE_LIMIT_MAX` | Registros permitidos por ventana. |

Los límites por IP y `trust proxy` permanecen apagados con la configuración de
`.env.example`, adecuada para pruebas locales. CORS permite localhost y puede
recibir orígenes adicionales mediante `CORS_ALLOWED_ORIGINS`.

## Scripts

| Comando | Uso |
|---|---|
| `npm start` | Inicia la aplicación. |
| `npm run dev` | Inicia con nodemon. |
| `npm test` | Ejecuta todas las pruebas automatizadas. |
| `npm run test:integration` | Ejecuta la prueba concurrente sobre un replica set efímero. |
| `npm run test:watch` | Ejecuta las pruebas en modo observación. |
| `npm run audit:data` | Audita integridad de usuarios, grupos, deudas e índices. |
| `npm run migrate:balances:dry-run` | Simula la eliminación de saldos persistidos. |
| `npm run migrate:balances` | Elimina `owe` y `owes` persistidos en usuarios. |
| `npm run migrate:money:dry-run` | Audita los importes antes de convertirlos a enteros COP. |
| `npm run migrate:money` | Convierte los importes válidos a BSON `Int64`. |

## Arquitectura

El proyecto separa la interfaz HTTP, la lógica de aplicación y la
infraestructura:

```text
src/
├── adapters/          # Adaptadores de infraestructura y transacciones
├── config/            # Configuración validada y políticas compartidas
├── controllers/v2/    # Adaptación de casos de uso al contrato HTTP v2
├── db/                # Conexión a MongoDB
├── dtos/              # DTO de entrada y salida
├── helpers/           # Errores y utilidades puras
├── middlewares/       # Autenticación, validación, errores y seguridad HTTP
├── models/            # Esquemas Mongoose y servidor Express
├── repositories/      # Contratos de persistencia sobre Mongoose
├── routes/            # Routers compartidos y router v2 de usuarios
├── services/          # Casos de uso y reglas de negocio
├── validators/        # Reglas del límite HTTP
└── compositionRoot.js # Construcción del grafo de dependencias
```

`src/compositionRoot.js` es el único lugar que ensambla repositorios, servicios,
controladores, middleware y routers. Su superficie HTTP contiene únicamente:

```js
root.controllers.v2
root.routers.v2
```

Los servicios reciben sus dependencias por inyección. Los casos de uso de deuda
dependen de un `transactionManager` con `runInTransaction(work)`, no de sesiones
de Mongoose directamente. El adaptador traduce el contexto transaccional a la
sesión utilizada por los repositorios.

## Contrato HTTP

Base soportada:

```text
/api/v2
```

Una respuesta exitosa usa este envelope:

```json
{
  "success": true,
  "data": {},
  "message": "Mensaje opcional",
  "meta": {}
}
```

`message` y `meta` solo aparecen cuando el endpoint los necesita. Los errores
también tienen un contrato uniforme:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos.",
    "details": []
  }
}
```

Los errores internos no exponen mensajes técnicos, credenciales ni valores de
entrada sensibles.

## Autenticación

### Login

```http
POST /api/v2/auth/login
Content-Type: application/json
```

```json
{
  "email": "usuario@example.com",
  "password": "contraseña"
}
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "token": "jwt"
  }
}
```

El registro y el login son públicos. Las demás rutas requieren:

```http
Authorization: Bearer <token>
```

El middleware rechaza encabezados ausentes o mal formados, tokens inválidos y
tokens pertenecientes a usuarios desactivados.

## Usuarios

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/v2/user` | Registra un usuario. |
| `GET` | `/api/v2/user` | Obtiene el perfil asociado al JWT. |
| `GET` | `/api/v2/user/:id` | Obtiene el perfil propio por ID. |
| `GET` | `/api/v2/user/by-nickname/:nickname` | Busca un nickname exacto. |
| `GET` | `/api/v2/user/search/:searchTerm` | Busca nicknames parcialmente. |
| `PUT` | `/api/v2/user/:id` | Actualiza el perfil propio. |
| `DELETE` | `/api/v2/user/:id` | Desactiva el perfil propio. |

Body de registro:

```json
{
  "name": "Laura Gómez",
  "nickname": "Laura",
  "email": "Laura@example.com",
  "password": "12345678"
}
```

El email y el nickname conservan sus mayúsculas y se comparan de forma exacta.
Por tanto, `Laura` y `laura`, así como `Laura@example.com` y
`laura@example.com`, son identidades diferentes. Las contraseñas nuevas solo
exigen un mínimo de ocho caracteres; no se aplica una regla de composición.

No se puede desactivar un usuario que participe en deudas activas. En ese caso,
la API responde `409 USER_HAS_ACTIVE_DEBTS`.

## Grupos

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v2/group` | Lista los grupos activos del usuario. |
| `GET` | `/api/v2/group/:id` | Consulta un grupo al que pertenece. |
| `POST` | `/api/v2/group` | Crea un grupo. |
| `POST` | `/api/v2/group/addMember` | Agrega una persona al grupo. |
| `PUT` | `/api/v2/group/:id` | Actualiza el nombre del grupo. |
| `DELETE` | `/api/v2/group/:id` | Desactiva el grupo. |

Body de creación:

```json
{
  "name": "Viaje"
}
```

Body para agregar un integrante:

```json
{
  "groupCode": "ABC123",
  "userNick": "Laura"
}
```

Cualquier integrante puede agregar personas. Solo el administrador puede
actualizar o desactivar el grupo. Los códigos se generan con reintentos
limitados y un índice único de MongoDB protege frente a colisiones concurrentes.
Un grupo con deudas activas no puede desactivarse; la API responde
`409 GROUP_HAS_ACTIVE_DEBTS` y conserva el grupo activo.

## Deudas y pagos

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v2/payment` | Lista deudas activas del usuario como deudor. |
| `GET` | `/api/v2/payment/summary` | Resume deudas y créditos activos. |
| `GET` | `/api/v2/payment/history` | Separa deudas activas y pagadas. |
| `GET` | `/api/v2/payment/group/:groupCode` | Lista deudas activas del usuario en un grupo. |
| `GET` | `/api/v2/payment/:id` | Consulta una deuda en la que participa. |
| `POST` | `/api/v2/payment` | Crea una o varias deudas. |
| `PUT` | `/api/v2/payment/:id` | Actualiza la descripción. |
| `PUT` | `/api/v2/payment/pay/:id` | Marca una deuda como pagada. |

Body de creación:

```json
{
  "description": "Cena",
  "value": 45000,
  "group": "66b4f424e02c14b86db53b01",
  "debtor": [
    "66b4f424e02c14b86db53b02",
    "66b4f424e02c14b86db53b03"
  ]
}
```

El usuario autenticado es el acreedor. Acreedor y deudores deben pertenecer al
grupo, el valor debe ser un entero COP mayor que cero, no se permiten deudores
repetidos y el acreedor no puede incluirse como deudor. Se persiste una deuda
independiente por cada deudor.

Los importes representan pesos colombianos completos, sin centavos. `value`
acepta un entero JSON como `1500` o una cadena con separadores de miles
colombianos como `"1.500"`; ambos se normalizan a `1500`. No debe enviarse
`1.500` como número JSON porque el parser lo interpreta como `1.5` y la API lo
rechaza por ser decimal. Las respuestas conservan `value`, `amount`, `owe` y
`owes` como números enteros.

Solo el acreedor puede modificar la deuda. Acreedor y deudor pueden marcarla
como pagada. Una deuda pagada conserva su documento con `state: false` y
`paymentDate`, deja de afectar los saldos activos y aparece en `history.paid`.
No existe una operación HTTP ni un método de repositorio para eliminar deudas
físicamente. Una deuda pagada no puede procesarse otra vez ni modificar su
descripción.

## Paginación y ordenamiento

Los listados se ordenan y paginan en MongoDB. El límite predeterminado es 20 y
el máximo permitido es 50.

Listados simples:

```http
GET /api/v2/group?page=1&limit=20
GET /api/v2/payment?page=1&limit=20
GET /api/v2/payment/group/ABC123?page=1&limit=20
GET /api/v2/user/search/lau?page=1&limit=20
```

Resumen con páginas independientes:

```http
GET /api/v2/payment/summary?debtsPage=1&creditsPage=1&limit=20
```

Historial con páginas independientes:

```http
GET /api/v2/payment/history?activePage=1&paidPage=1&limit=20
```

Ejemplo de metadatos de una lista:

```json
{
  "count": 42,
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

El historial devuelve `data.active` y `data.paid`, ordenados desde la operación
más reciente hasta la más antigua. Cada sección incluye sus conteos y
metadatos dentro de `meta`.

## Consistencia financiera

`owe` y `owes` no se persisten en el documento de usuario. El servicio de
saldos los calcula desde las deudas activas, evitando mantener dos fuentes de
verdad.

Los valores de las deudas se persisten como enteros BSON `Int64`. Los servicios
y las agregaciones operan en pesos COP completos y los DTO verifican que cada
resultado pueda representarse como un entero seguro antes de devolverlo.

Crear y pagar deudas utiliza el administrador de transacciones. Si
falla una operación dentro del caso de uso, MongoDB aborta la transacción.

Crear una deuda y desactivar su grupo realizan primero una escritura
condicional sobre el mismo documento activo mediante `lockActiveById`. Si ambas
operaciones son concurrentes, MongoDB genera un conflicto y `withTransaction`
reintenta una de ellas con el estado actualizado. El resultado válido siempre
es uno de estos dos: grupo activo con deuda activa, o grupo inactivo sin deudas
activas.

El script `migrate:balances:dry-run` permite comprobar documentos antiguos
antes de retirar campos derivados con `migrate:balances`.

Para migrar valores monetarios existentes, primero ejecuta la auditoría sin
escrituras:

```bash
npm run migrate:money:dry-run
```

Si `invalidCount` es cero, realiza un respaldo y autoriza expresamente la
conversión antes de ejecutarla:

```env
CONFIRM_COP_MONEY_MIGRATION=CONVERT_DEBT_VALUES_TO_COP_INTEGERS
```

```bash
npm run migrate:money
```

La migración es idempotente. No redondea valores decimales: si encuentra uno,
se detiene antes de modificar documentos para que sea revisado manualmente.

## Validación y seguridad

- Los routers aceptan únicamente los campos declarados por endpoint.
- Los parámetros, query strings y bodies se validan antes del controlador.
- Los DTO de entrada descartan campos internos.
- Los DTO de salida no exponen hashes, metadatos de Mongoose ni propiedades no
  incluidas en el contrato.
- Helmet agrega encabezados defensivos.
- CORS utiliza una lista configurable de orígenes.
- El body JSON tiene un límite configurable.
- Login, registro y tráfico general tienen limitadores independientes cuando se
  activa `RATE_LIMIT_ENABLED`.
- Las rutas de usuarios, grupos y deudas aplican autorización además de JWT.

## Pruebas automatizadas

Ejecuta la suite completa:

```bash
npm test
```

La cobertura incluye:

- configuración y arranque;
- seguridad HTTP, JWT y autorización de rutas;
- validadores y DTO;
- controladores v2 y contratos JSON;
- servicios y reglas de negocio;
- repositorios, índices y transacciones;
- normalización, almacenamiento `Int64`, balances y migración de importes COP;
- permanencia de las deudas pagadas y clasificación en `history.paid`;
- concurrencia real entre creación de deuda y desactivación de grupo sobre un
  replica set efímero;
- esquemas Mongoose e integridad de datos;
- montaje exclusivo de `/api/v2` y manejo JSON de rutas inexistentes.

## Códigos de error frecuentes

| Estado | Código | Motivo |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Datos inválidos. |
| `400` | `UNKNOWN_FIELDS` | Campos no admitidos por el endpoint. |
| `401` | `TOKEN_MISSING` | Falta el encabezado Bearer. |
| `401` | `TOKEN_INVALID_OR_EXPIRED` | JWT inválido o expirado. |
| `403` | `FORBIDDEN` | El usuario no tiene permiso. |
| `404` | `ROUTE_NOT_FOUND` | La ruta no existe. |
| `409` | `GROUP_HAS_ACTIVE_DEBTS` | El grupo conserva deudas activas. |
| `409` | `USER_HAS_ACTIVE_DEBTS` | La cuenta participa en deudas activas. |
| `409` | `DEBT_ALREADY_PAID` | La deuda ya fue pagada. |
| `413` | `PAYLOAD_TOO_LARGE` | El body supera el límite configurado. |
| `429` | `GLOBAL_RATE_LIMIT_EXCEEDED` | Se superó el límite general. |
| `500` | `INTERNAL_SERVER_ERROR` | Error interno ocultado al cliente. |

El historial de cambios del proyecto se conserva en `CHANGELOG.md`.
