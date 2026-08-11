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

Si cualquier middleware, controlador, servicio o repositorio produce una
excepción, esta se propaga hacia un único middleware global:

```text
Error de aplicación
        |
        v
Normalización del error
        |
        +--> Error esperado: conserva estado, código y mensaje
        |
        `--> Error interno: registra el detalle y oculta información sensible
        |
        v
Respuesta JSON uniforme
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

### Inyección de dependencias y composition root

La aplicación ensambla todas sus dependencias de ejecución en
`src/compositionRoot.js`:

```text
Repositorios + infraestructura
              |
              v
          Servicios
              |
              v
         Controladores
              |
              v
            Routers
              |
              v
            Server
```

El composition root construye e inyecta:

- repositorios de usuarios, grupos y deudas;
- bcrypt como proveedor de contraseñas;
- JWT y la función que obtiene el secreto;
- Mongoose para los casos de uso transaccionales;
- servicios, middleware de autenticación, controladores y routers.

Los servicios no reciben estas dependencias desde variables globales dentro de
su lógica. Se construyen mediante fábricas ubicadas en
`src/services/factories/` y `src/services/debt/`. Controladores y routers
también exponen fábricas para recibir servicios y handlers ya construidos.

### Contratos de repositorios

Los tres repositorios utilizan la misma convención de nombres:

- `find...` para recuperar registros;
- `exists...` para comprobaciones booleanas de existencia;
- `create` para inserciones;
- `updateById` para actualizaciones;
- `deactivateById` para eliminaciones lógicas;
- `deleteById` solo cuando la eliminación es física.

Todas las operaciones aceptan un objeto `options` como último argumento. Una
sesión de MongoDB se entrega siempre como `{ session }`; no se usan argumentos
posicionales distintos entre repositorios. Los filtros forman parte del nombre
del método: por ejemplo, `findActiveById`, `findActiveByParticipant` y
`findHistoryByParticipant` hacen explícito si se consultan registros activos o
el historial completo.

Las operaciones de persistencia también quedan dentro del repositorio. Por
ejemplo, el servicio de grupos usa `addMemberById` y no modifica documentos de
Mongoose ni ejecuta `save()` directamente. Este contrato permite reemplazar
un repositorio desde el composition root sin que el caso de uso conozca los
detalles de MongoDB.

`Server` acepta opcionalmente `compositionRoot`, `connection` y `port`, lo que
permite probar su arranque sin modificar `require.cache`. Los módulos públicos
anteriores se conservan como fachadas de compatibilidad para consumidores que
todavía los importen directamente.

### Casos de uso de deudas

El dominio de deudas está dividido por operación para que cada módulo tenga
una única razón de cambio:

```text
src/services/
├── debtservice.js                 Fachada pública compatible
└── debt/
    ├── debtAccess.js              Identidad, participación y búsqueda común
    ├── createDebt.js              Creación transaccional
    ├── deleteDebt.js              Eliminación y reversión de saldos
    ├── getAllDebts.js             Listado de deudas activas
    ├── getDebtById.js             Consulta autorizada por ID
    ├── getDebtHistoryForUser.js   Historial activo y pagado
    ├── getDebtSummaryForUser.js   Resumen de deudas y créditos
    ├── getDebtsForUserInGroupByCode.js
    ├── markAsPaid.js              Pago transaccional
    └── updateDebt.js              Actualización autorizada
```

Los controladores continúan importando `debtservice.js`. La fachada conserva
las mismas nueve funciones públicas y delega cada una al caso de uso
correspondiente, evitando cambios en rutas o consumidores existentes.

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

## Validación y DTO de entrada

Los controladores no consumen directamente `req.body`, `req.params` o
`req.query`. Antes de ejecutar un caso de uso, la solicitud atraviesa este
flujo:

```text
Campos permitidos
        |
        v
Validación y sanitización
        |
        v
DTO de entrada
        |
        v
Controlador y servicio
```

Los textos se recortan con `trim`, los parámetros `:id` se validan como
ObjectId y el valor de una deuda válida se convierte a número. Los DTO crean
objetos nuevos y únicamente conservan los campos declarados para la operación.
Los términos de búsqueda admiten entre 2 y 50 caracteres y sus símbolos de
expresión regular se escapan para tratarlos como texto literal.

Contratos de body:

| Operación | Campos permitidos |
|---|---|
| Login | `email`, `password` |
| Registrar usuario | `name`, `nickname`, `email`, `password` |
| Buscar por nickname | `nick` |
| Actualizar usuario | `name`, `nickname`, `email` |
| Crear grupo | `name` |
| Actualizar grupo | `name` |
| Agregar integrante | `groupCode`, `userNick` |
| Crear deuda | `description`, `value`, `group`, `debtor` |
| Actualizar deuda | `description` |
| Pagar o eliminar recursos | Ninguno |

Si el cliente envía un campo fuera del contrato, la API responde `400` con
el código `UNKNOWN_FIELDS`. Campos internos como `state`, `owe`, `owes`,
`creditor`, `debtDate` y `paymentDate` nunca forman parte de los DTO públicos.

La validación HTTP comprueba estructura, tipos y formatos. Las reglas que
dependen del estado de la aplicación permanecen en los servicios; por ejemplo,
pertenencia al grupo, permisos del acreedor y estado de pago de una deuda.

## Reglas de autorización

### Usuarios

- El registro público solo acepta `name`, `nickname`, `email` y `password`.
  Los saldos, el estado y los demás campos internos conservan los valores
  definidos por el servidor.
- Un usuario puede consultar, modificar y desactivar únicamente su perfil.
- Un usuario no puede desactivar su cuenta mientras participe como acreedor o
  deudor en alguna deuda activa. La API responde `409` con el código
  `USER_HAS_ACTIVE_DEBTS` hasta que esas obligaciones se paguen o eliminen.
- La edición del perfil permite `name`, `nickname` y `email`.
- `owe`, `owes`, `state` y `password` no se pueden modificar directamente.

### Grupos

- Al crear un grupo se realizan hasta cinco intentos para generar un código
  disponible. Cada código se consulta nuevamente y el índice único de MongoDB
  resuelve posibles colisiones concurrentes antes de reintentar.
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

Crear, pagar y eliminar deudas, así como desactivar una cuenta, utiliza
sesiones y transacciones de MongoDB.

- Si todas las operaciones funcionan, se confirma la transacción.
- Si alguna operación falla, MongoDB revierte documentos y saldos.
- El pago de una deuda no puede procesarse dos veces.
- Eliminar una deuda activa revierte `owe` y `owes`.
- Eliminar una deuda pagada no vuelve a modificar los saldos.
- La desactivación consulta las deudas activas y modifica el usuario dentro de
  la misma transacción, evitando cuentas inactivas con obligaciones abiertas.

## Pruebas automatizadas

La suite utiliza `node:test` y no necesita una conexión real a MongoDB. Los
repositorios y las sesiones se sustituyen por implementaciones controladas
durante cada prueba.

Cobertura inicial:

- JWT ausente, mal formado, expirado, incompleto y válido.
- Rechazo de tokens pertenecientes a usuarios inexistentes o desactivados.
- Protección de campos internos durante el registro público.
- Espera de MongoDB antes de abrir el puerto HTTP.
- Contrato uniforme para errores de negocio.
- Ocultamiento de mensajes y detalles técnicos en errores internos.
- Propagación de excepciones asíncronas.
- Errores JSON para rutas inexistentes y validaciones.
- Validación de body y parámetros por endpoint.
- Rechazo de campos desconocidos antes de consultar MongoDB.
- Sanitización, conversión de tipos y DTO de entrada.
- Bloqueo de campos internos en usuarios, grupos y deudas.
- Protección global de rutas.
- Propiedad del perfil y bloqueo de campos sensibles.
- Membresía y administración de grupos.
- Incorporación de integrantes.
- Separación y orden del historial.
- Compatibilidad de la fachada y separación de casos de uso de deudas.
- Propagación de dependencias desde composition root hasta routers.
- Sustitución de repositorios, JWT, bcrypt y servicios en pruebas.
- Contratos, filtros activos y opciones de sesión de los repositorios.
- Persistencia de integrantes encapsulada en el repositorio de grupos.
- Reintentos limitados y colisiones concurrentes al generar códigos de grupo.
- Inyección directa de conexión y puerto en `Server`.
- Propagación de sesiones.
- Commit y abort de transacciones.
- Reversión de saldos al eliminar deudas.
- Bloqueo transaccional de la desactivación cuando existen deudas activas.

Ejecutar:

```bash
npm test
```

La suite actual es principalmente unitaria. Como siguiente nivel de cobertura
se pueden incorporar pruebas de integración contra una base MongoDB aislada.

## Respuestas de error

Todos los errores utilizan el mismo contrato JSON:

```json
{
  "success": false,
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Grupo no encontrado"
  }
}
```

`code` es un identificador estable que el cliente puede utilizar para decidir
qué acción o mensaje mostrar. `message` contiene la explicación destinada al
usuario.

Los errores de validación incluyen una lista `details`:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos.",
    "details": [
      {
        "type": "field",
        "path": "email",
        "message": "El correo es obligatorio",
        "location": "body"
      }
    ]
  }
}
```

Los valores enviados por el cliente, incluidas las contraseñas, no se incluyen
en `details`.

Los campos que no pertenecen al contrato del endpoint producen:

```json
{
  "success": false,
  "error": {
    "code": "UNKNOWN_FIELDS",
    "message": "La solicitud contiene campos no permitidos.",
    "details": [
      {
        "path": "state",
        "location": "body"
      }
    ]
  }
}
```

La API utiliza principalmente:

| Estado | Significado |
|---|---|
| `400` | Datos o transición de estado inválidos. |
| `401` | JWT ausente, inválido o expirado. |
| `403` | Usuario autenticado sin permiso sobre el recurso. |
| `404` | Recurso no encontrado. |
| `409` | Conflicto con el estado o con un registro existente. |
| `413` | Cuerpo de la solicitud demasiado grande. |
| `500` | Error interno inesperado. |

Los errores `500` siempre responden:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Ocurrió un error interno."
  }
}
```

El mensaje técnico original se registra únicamente en el servidor. Las rutas
inexistentes también responden JSON con el código `ROUTE_NOT_FOUND` y los
cuerpos JSON mal formados utilizan `INVALID_JSON`.
