# AhoritaPago API

API REST para gestionar deudas entre amigos, familiares o integrantes de un
grupo. Permite registrar usuarios, crear grupos, distribuir deudas, consultar
saldos, marcar pagos y revisar el historial de obligaciones activas y pagadas.

## Funcionalidades

- Registro e inicio de sesión con JWT.
- Contraseñas cifradas con `bcryptjs`.
- Creación de grupos con administrador, integrantes y código único.
- Incorporación de personas al grupo por nickname.
- Creación de una deuda independiente por cada deudor.
- Saldos acumulados:
  - `owe`: valor que debe el usuario.
  - `owes`: valor que le deben al usuario.
- Pago y eliminación de deudas con transacciones de MongoDB.
- Historial separado entre deudas activas y pagadas.
- Autorización por propietario, integrante, administrador, acreedor y deudor.

## Tecnologías

- Node.js y CommonJS.
- Express.
- MongoDB y Mongoose.
- JSON Web Tokens.
- bcryptjs.
- express-validator.
- Node Test Runner para pruebas automatizadas.

## Requisitos

- Node.js 20.6 o superior.
- npm.
- MongoDB con soporte para transacciones:
  - MongoDB Atlas, o
  - una instalación configurada como replica set.

Una instancia local de MongoDB en modo standalone no puede ejecutar las
transacciones utilizadas al crear, pagar o eliminar deudas.

## Instalación local

Instala las dependencias:

```bash
npm install
```

Copia la plantilla de variables de entorno:

```powershell
Copy-Item .env.example .env
```

Completa los valores de `.env` y ejecuta la API:

```bash
npm run dev
```

La API utiliza el puerto indicado en `PORT`.
El puerto solo se abre después de establecer correctamente la conexión con
MongoDB. Si la conexión falla, la aplicación informa el error y no acepta
solicitudes HTTP.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto HTTP de la aplicación. |
| `DATABASE_URL` | URI de conexión a MongoDB. |
| `JWT_SECRET` | Secreto privado utilizado para firmar y validar JWT. |

No se debe versionar el archivo `.env` ni usar el valor de ejemplo de
`JWT_SECRET` en un entorno real.

## Scripts

```bash
npm run dev
```

Inicia la API con Nodemon y carga `.env`.

```bash
npm start
```

Inicia la API con Node y carga `.env`.

```bash
npm test
```

Ejecuta una vez todas las pruebas automatizadas.

```bash
npm run test:watch
```

Ejecuta las pruebas en modo observación durante el desarrollo.

## Arquitectura

El proyecto es un monolito modular organizado por capas:

```text
Cliente HTTP
    |
    v
Routes
    |
    +--> Middlewares de autenticación y validación
    |
    v
Controllers
    |
    v
Services
    |
    v
Repositories
    |
    v
Mongoose / MongoDB
```

Responsabilidad de cada carpeta:

```text
src/
├── controllers/   Traducción entre HTTP y los casos de uso
├── db/            Conexión con MongoDB
├── helpers/       Utilidades y errores HTTP
├── middlewares/   JWT y validación de formularios
├── models/        Esquemas de Mongoose y servidor Express
├── repositories/  Consultas y escrituras en MongoDB
├── routes/        Definición de endpoints
└── services/      Reglas de negocio y autorización

test/
├── middlewares/   Pruebas de autenticación
├── routes/        Pruebas de protección y orden de rutas
└── services/      Pruebas de reglas de negocio
```

## Autenticación

Después de iniciar sesión, las rutas protegidas requieren:

```http
Authorization: Bearer <token>
```

El JWT dura cuatro horas e incluye `userId` y `nick`. En cada solicitud
protegida también se comprueba que el usuario todavía exista y tenga
`state: true`; desactivar una cuenta invalida inmediatamente sus tokens aunque
no hayan expirado.

Solo estas operaciones son públicas:

- `POST /api/auth/login`
- `POST /api/user`

Las demás rutas de usuarios, grupos y deudas requieren un JWT válido.

## Reglas de autorización

### Usuarios

- El registro público solo acepta `name`, `nickname`, `email` y `password`.
  Los saldos, el estado y los demás campos internos conservan los valores
  definidos por el servidor.
- Un usuario puede consultar, modificar y desactivar únicamente su perfil.
- La edición del perfil permite `name`, `nickname` y `email`.
- `owe`, `owes`, `state` y `password` no se pueden modificar directamente.

### Grupos

- Los integrantes pueden consultar el grupo y agregar personas.
- Solo el administrador puede modificar o eliminar el grupo.
- Un usuario externo no puede consultar ni administrar el grupo.

### Deudas

- Acreedor y deudor pueden consultar la deuda.
- Solo el acreedor puede modificar su descripción o eliminarla.
- Acreedor y deudor pueden marcarla como pagada.
- El acreedor y todos los deudores deben pertenecer al grupo.

## Modelos principales

### User

| Campo | Descripción |
|---|---|
| `name` | Nombre del usuario. |
| `nickname` | Identificador público único. |
| `email` | Correo único. |
| `password` | Contraseña cifrada. |
| `state` | Estado activo del usuario. |
| `owe` | Total que debe. |
| `owes` | Total que le deben. |

### Group

| Campo | Descripción |
|---|---|
| `name` | Nombre único del grupo. |
| `admin` | Usuario administrador. |
| `members` | Integrantes del grupo. |
| `code` | Código único del grupo. |
| `state` | Estado activo del grupo. |

### Debt

| Campo | Descripción |
|---|---|
| `description` | Concepto de la deuda. |
| `creditor` | Usuario al que le deben. |
| `debtor` | Lista de deudores. |
| `value` | Valor por deudor. |
| `group` | Grupo asociado. |
| `debtDate` | Fecha de creación. |
| `paymentDate` | Fecha de pago. |
| `state` | `true` si está activa y `false` si está pagada. |

## Endpoints

Todas las rutas, excepto registro y login, requieren JWT.

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Inicia sesión y devuelve un JWT. |

Ejemplo:

```json
{
  "email": "usuario@example.com",
  "password": "contraseña"
}
```

### Usuarios

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/user` | Registra un usuario. |
| `GET` | `/api/user` | Consulta el perfil del JWT. |
| `GET` | `/api/user/:id` | Consulta el perfil propio por ID. |
| `GET` | `/api/user/nick` | Busca un usuario por nickname enviado como `nick`. |
| `GET` | `/api/user/search/:searchTerm` | Busca nicknames parcialmente. |
| `PUT` | `/api/user/:id` | Actualiza el perfil propio. |
| `DELETE` | `/api/user/:id` | Desactiva el perfil propio. |

Registro:

```json
{
  "name": "Laura",
  "nickname": "laura",
  "email": "laura@example.com",
  "password": "contraseña-segura"
}
```

### Grupos

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/group` | Lista los grupos del usuario. |
| `GET` | `/api/group/mygroups` | Lista los grupos del usuario. |
| `GET` | `/api/group/:id` | Consulta un grupo al que pertenece. |
| `POST` | `/api/group` | Crea un grupo. |
| `POST` | `/api/group/addMember` | Agrega una persona; puede hacerlo cualquier integrante. |
| `PUT` | `/api/group/:id` | Modifica el nombre; solo administrador. |
| `DELETE` | `/api/group/:id` | Desactiva el grupo; solo administrador. |

Crear grupo:

```json
{
  "name": "Viaje"
}
```

Agregar integrante:

```json
{
  "groupCode": "ABC123",
  "userNick": "nuevo_integrante"
}
```

### Deudas y pagos

Estas rutas utilizan el prefijo histórico `/api/payment`, aunque administran
documentos de deuda.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/payment` | Lista deudas activas del usuario como deudor. |
| `GET` | `/api/payment/summary` | Resumen de deudas y créditos activos. |
| `GET` | `/api/payment/history` | Historial activo y pagado. |
| `GET` | `/api/payment/group/:groupCode` | Deudas activas del usuario en un grupo. |
| `GET` | `/api/payment/:id` | Consulta una deuda como acreedor o deudor. |
| `POST` | `/api/payment` | Crea una deuda. |
| `PUT` | `/api/payment/:id` | Modifica su descripción; solo acreedor. |
| `PUT` | `/api/payment/pay/:id` | Marca la deuda como pagada. |
| `DELETE` | `/api/payment/:id` | Elimina la deuda y revierte saldos si estaba activa. |

Crear deuda:

```json
{
  "description": "Cena",
  "value": 50000,
  "group": "ID_DEL_GRUPO",
  "debtor": [
    "ID_DEL_DEUDOR_1",
    "ID_DEL_DEUDOR_2"
  ]
}
```

El valor se interpreta por persona y se crea un documento independiente para
cada deudor.

## Historial de deudas

Solicitud:

```http
GET /api/payment/history
Authorization: Bearer <token>
```

Respuesta:

```json
{
  "count": {
    "total": 2,
    "active": 1,
    "paid": 1
  },
  "active": [
    {
      "_id": "ID_DEUDA_ACTIVA",
      "description": "Cena",
      "value": 50000,
      "state": true,
      "debtDate": "2026-07-20T18:00:00.000Z"
    }
  ],
  "paid": [
    {
      "_id": "ID_DEUDA_PAGADA",
      "description": "Transporte",
      "value": 20000,
      "state": false,
      "debtDate": "2026-07-10T18:00:00.000Z",
      "paymentDate": "2026-07-22T18:00:00.000Z"
    }
  ]
}
```

Las deudas activas se ordenan por `debtDate` y las pagadas por `paymentDate`,
siempre desde la más reciente hasta la más antigua. Las deudas eliminadas
físicamente no forman parte del historial.

## Consistencia financiera

Crear, pagar y eliminar deudas utiliza sesiones y transacciones de MongoDB.

- Si todas las operaciones funcionan, se confirma la transacción.
- Si alguna operación falla, MongoDB revierte documentos y saldos.
- El pago de una deuda no puede procesarse dos veces.
- Eliminar una deuda activa revierte `owe` y `owes`.
- Eliminar una deuda pagada no vuelve a modificar los saldos.

## Pruebas automatizadas

La suite utiliza `node:test` y no necesita una conexión real a MongoDB. Los
repositorios y las sesiones se sustituyen por implementaciones controladas
durante cada prueba.

Cobertura inicial:

- JWT ausente, mal formado, expirado, incompleto y válido.
- Rechazo de tokens pertenecientes a usuarios inexistentes o desactivados.
- Protección de campos internos durante el registro público.
- Espera de MongoDB antes de abrir el puerto HTTP.
- Protección global de rutas.
- Propiedad del perfil y bloqueo de campos sensibles.
- Membresía y administración de grupos.
- Incorporación de integrantes.
- Separación y orden del historial.
- Propagación de sesiones.
- Commit y abort de transacciones.
- Reversión de saldos al eliminar deudas.

Ejecutar:

```bash
npm test
```

La suite actual es principalmente unitaria. Como siguiente nivel de cobertura
se pueden incorporar pruebas de integración contra una base MongoDB aislada.

## Respuestas de error

La API utiliza principalmente:

| Estado | Significado |
|---|---|
| `400` | Datos o transición de estado inválidos. |
| `401` | JWT ausente, inválido o expirado. |
| `403` | Usuario autenticado sin permiso sobre el recurso. |
| `404` | Recurso no encontrado. |
| `500` | Error interno inesperado. |
