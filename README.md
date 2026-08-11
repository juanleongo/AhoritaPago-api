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
- Helmet y CORS configurable para seguridad HTTP.
- express-rate-limit, preparado para habilitarse por entorno.
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

Instala exactamente las versiones registradas en `package-lock.json`:

```bash
npm ci
```

Usa `npm install` únicamente cuando agregues, elimines o actualices una
dependencia y conserva el cambio resultante de `package-lock.json`.

Copia la plantilla de variables de entorno:

```powershell
Copy-Item .env.example .env
```

Completa los valores de `.env` y ejecuta la API:

```bash
npm run dev
```

El valor de ejemplo de `JWT_SECRET` es rechazado intencionalmente y debe
reemplazarse antes de iniciar.

La API utiliza el puerto indicado en `PORT`.
El puerto solo se abre después de establecer correctamente la conexión con
MongoDB. Si la conexión falla, la aplicación informa el error y no acepta
solicitudes HTTP.

### Instalación de producción

Las dependencias utilizadas solo durante el desarrollo se excluyen con:

```bash
npm ci --omit=dev
npm start
```

`nodemon` pertenece a `devDependencies` y se usa exclusivamente mediante
`npm run dev`. El servidor de producción se ejecuta directamente con Node.
`package-lock.json` se mantiene versionado para que desarrollo, integración
continua y producción resuelvan el mismo árbol de dependencias.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Obligatoria. Entero entre `1` y `65535`. |
| `DATABASE_URL` | Obligatoria. URI que empieza por `mongodb://` o `mongodb+srv://`. |
| `JWT_SECRET` | Obligatoria. Mínimo 32 caracteres, sin espacios externos y distinta del valor de ejemplo. |
| `CORS_ALLOW_LOCALHOST` | Permite orígenes HTTP/HTTPS en `localhost`, `127.0.0.1` y `::1`, sin restringir el puerto. Por defecto: `true`. |
| `CORS_ALLOWED_ORIGINS` | Lista de orígenes autorizados separados por coma, sin rutas. |
| `JSON_BODY_LIMIT` | Tamaño máximo de un cuerpo JSON. Por defecto: `100kb`. |
| `RATE_LIMIT_ENABLED` | Activa los límites global, de login y de registro. Por defecto: `false`. |
| `TRUST_PROXY_HOPS` | Cantidad de proxies confiables delante de Express. Solo se aplica si el rate limiting está activo. Por defecto: `0`. |
| `GLOBAL_RATE_LIMIT_WINDOW_MS` | Ventana del límite general en milisegundos. Por defecto: `900000`. |
| `GLOBAL_RATE_LIMIT_MAX` | Solicitudes generales permitidas por ventana. Por defecto: `500`. |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | Ventana del límite de login. Por defecto: `900000`. |
| `LOGIN_RATE_LIMIT_MAX` | Intentos fallidos de login permitidos por ventana. Por defecto: `15`. |
| `REGISTRATION_RATE_LIMIT_WINDOW_MS` | Ventana del límite de registro. Por defecto: `3600000`. |
| `REGISTRATION_RATE_LIMIT_MAX` | Registros permitidos por ventana. Por defecto: `10`. |

No se debe versionar el archivo `.env` ni usar el valor de ejemplo de
`JWT_SECRET` en un entorno real.

Los booleanos opcionales solo aceptan `true` o `false`. Los límites y ventanas
deben ser enteros positivos, salvo `TRUST_PROXY_HOPS`, que también admite
`0`. `JSON_BODY_LIMIT` acepta tamaños positivos en `b`, `kb` o `mb`.
`CORS_ALLOWED_ORIGINS` acepta orígenes HTTP/HTTPS separados por coma, sin
rutas, credenciales, query ni fragmentos.

### Validación al iniciar

La configuración se carga y valida antes de importar y construir el servidor:

```text
.env
  |
  v
Configuración validada
  |
  +--> Puerto
  +--> Conexión MongoDB
  +--> JWT
  `--> Seguridad HTTP
  |
  v
Composition root y Server
  |
  v
MongoDB -> puerto HTTP
```

Si una o más variables son inválidas, la API informa todas sus reglas
incumplidas, asigna un código de salida de error y no construye Express, no
intenta conectarse a MongoDB y no abre el puerto. Los valores recibidos y el
contenido de `JWT_SECRET` nunca se incluyen en el error.

Antes de desplegar una actualización en Render, comprueba especialmente que
el secreto configurado tenga al menos 32 caracteres. Un valor inválido hará
que el servicio falle inmediatamente, en lugar de iniciar parcialmente.

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

```bash
npm run audit:data
```

Ejecuta una auditoría de solo lectura sobre las deudas existentes y los índices
de grupos. Requiere `DATABASE_URL` y genera un reporte JSON; no modifica
documentos ni elimina índices.

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
├── audits/        Consultas no destructivas de integridad de datos
├── config/        Valores configurables y límites de la aplicación
├── controllers/   Traducción entre HTTP y los casos de uso
├── db/            Conexión con MongoDB
├── dtos/          Contratos de entrada para controladores
├── helpers/       Utilidades y errores HTTP
├── middlewares/   JWT y validación de formularios
├── models/        Esquemas de Mongoose y servidor Express
├── repositories/  Consultas y escrituras en MongoDB
├── routes/        Definición de endpoints
├── services/      Reglas de negocio y autorización
└── validators/    Validación y sanitización de solicitudes

test/
├── audits/        Pruebas de reportes de integridad
├── middlewares/   Pruebas de autenticación
├── models/        Pruebas de restricciones de esquemas
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

- configuración validada de servidor, base de datos, JWT y seguridad HTTP;
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
- `count...` para contar registros sin cargarlos en memoria;
- `exists...` para comprobaciones booleanas de existencia;
- `create` para inserciones;
- `updateById` para actualizaciones;
- `deactivateById` para eliminaciones lógicas;
- `deleteById` solo cuando la eliminación es física.

Todas las operaciones aceptan un objeto `options` como último argumento. Una
sesión de MongoDB se entrega siempre como `{ session }`; no se usan argumentos
posicionales distintos entre repositorios. Los filtros forman parte del nombre
del método: por ejemplo, `findActiveById` y `findActiveByParticipant` hacen
explícito si se consultan registros activos. El historial recibe un objeto de
consulta con estado, página y límite; el repositorio aplica filtro,
ordenamiento y paginación antes de recuperar documentos.

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

## Seguridad HTTP

La API aplica Helmet antes de las rutas para agregar encabezados defensivos y
ocultar `X-Powered-By`. También limita explícitamente el cuerpo JSON; si se
supera `JSON_BODY_LIMIT`, responde `413` con el código
`PAYLOAD_TOO_LARGE`.

CORS ya no autoriza indiscriminadamente todos los orígenes. Durante el
desarrollo, `CORS_ALLOW_LOCALHOST=true` permite consumir la API desplegada en
Render desde un frontend local en cualquier puerto. Los clientes que no son
navegadores y no envían el encabezado `Origin` continúan permitidos. Para un
frontend desplegado, su origen completo debe agregarse a
`CORS_ALLOWED_ORIGINS`; por ejemplo:

```env
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

### Estado temporal de los límites por IP

En la fase actual se conserva:

```env
RATE_LIMIT_ENABLED=false
TRUST_PROXY_HOPS=0
```

Con esta configuración no se monta ningún rate limiter, no se contabilizan ni
bloquean direcciones IP, no se generan respuestas `429` y Express mantiene
`trust proxy=false`. Los valores globales, de login y de registro quedan
preparados, pero no tienen efecto hasta activar explícitamente la función.

Cuando se vaya a habilitar en Render, primero se debe comprobar la cadena real
de proxies y definir `TRUST_PROXY_HOPS` con ese valor. Una configuración
incorrecta puede hacer que varias personas compartan un mismo contador o que
un cliente manipule la IP utilizada. Después se puede establecer
`RATE_LIMIT_ENABLED=true` y probar login, registro y tráfico general desde el
frontend real. El almacenamiento incluido es local al proceso; si se ejecutan
varias instancias de la API, se debe configurar posteriormente un almacén
compartido para que el conteo sea consistente entre ellas.

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

- Los nombres son descriptivos y pueden repetirse entre grupos. El código es
  el identificador público único.
- Al crear un grupo se realizan hasta cinco intentos para generar un código
  disponible. Cada código se consulta nuevamente y el índice único de MongoDB
  resuelve posibles colisiones concurrentes antes de reintentar.
- Los integrantes pueden consultar el grupo y agregar personas.
- Solo el administrador puede modificar o eliminar el grupo.
- Un usuario externo no puede consultar ni administrar el grupo.

### Deudas

- Toda deuda requiere acreedor, uno o más deudores diferentes al acreedor y un
  valor finito mayor que cero. Estas reglas se aplican en HTTP, servicios y
  Mongoose.
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
| `name` | Nombre descriptivo; puede repetirse. |
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

## Auditoría de integridad

Después de endurecer un esquema, Mongoose protege las escrituras nuevas pero
no corrige automáticamente los documentos históricos. Antes de limpiar datos,
ejecuta:

```bash
npm run audit:data
```

El reporte identifica:

- deudas sin acreedor o sin deudores;
- elementos nulos y deudores repetidos;
- acreedores incluidos como deudores;
- valores ausentes, no numéricos, iguales a cero o negativos;
- índices globales únicos heredados sobre `Group.name`.

La auditoría no realiza escrituras. Un índice heredado `name_1` puede seguir
impidiendo nombres repetidos aunque el esquema actual no lo declare. Su
eliminación y cualquier corrección de documentos debe hacerse por separado,
con respaldo previo y después de revisar el reporte.

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
| `GET` | `/api/user/search/:searchTerm` | Busca nicknames parcialmente con paginación. |
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

Búsqueda paginada:

```http
GET /api/user/search/leo?page=1&limit=20
Authorization: Bearer <token>
```

La respuesta conserva `results` y agrega el total y los metadatos de página:

```json
{
  "msg": "Resultados de la búsqueda para 'leo'",
  "count": 21,
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "results": []
}
```

Los resultados se ordenan por `nickname` y luego por `_id`, ambos de forma
ascendente. `page` empieza en `1`; `limit` utiliza `20` por defecto y admite
como máximo `50` resultados.

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
| `GET` | `/api/payment/history` | Historial activo y pagado con páginas independientes. |
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
GET /api/payment/history?activePage=1&paidPage=1&limit=20
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
  "pagination": {
    "active": {
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    },
    "paid": {
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
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

`activePage` y `paidPage` permiten avanzar cada lista de manera independiente.
Todos los parámetros son opcionales: las páginas empiezan en `1`, el límite
predeterminado es `20` y el máximo permitido es `50`. Los conteos representan
todos los documentos encontrados, no solamente los de la página actual.

## Índices y consultas paginadas

El historial se filtra, ordena y pagina en MongoDB mediante `sort`, `skip` y
`limit`; el servicio no carga la colección completa ni la ordena en memoria.
Los esquemas declaran índices compuestos para:

- acreedor o deudor, estado y fecha de creación;
- acreedor o deudor, estado y fecha de pago;
- grupo, estado y cada tipo de participante;
- estado y nickname del usuario.

El orden incluye `_id` como criterio de desempate para que una página sea
determinista cuando varios documentos tienen la misma fecha o nickname. Los
índices nuevos no son únicos y no eliminan índices existentes.

La búsqueda parcial conserva la expresión regular insensible a mayúsculas para
no cambiar su comportamiento. La paginación limita la respuesta, pero una
expresión regular no anclada todavía puede examinar muchos usuarios. Si el
volumen crece significativamente, conviene evaluar búsqueda por prefijo sobre
un campo normalizado o MongoDB Atlas Search.

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
- Paginación independiente, conteos totales y ordenamiento en MongoDB.
- Paginación y orden estable de búsquedas parciales por nickname.
- Definición de índices compuestos para deudas y usuarios.
- Compatibilidad de la fachada y separación de casos de uso de deudas.
- Propagación de dependencias desde composition root hasta routers.
- Sustitución de repositorios, JWT, bcrypt y servicios en pruebas.
- Contratos, filtros activos y opciones de sesión de los repositorios.
- Persistencia de integrantes encapsulada en el repositorio de grupos.
- Reintentos limitados y colisiones concurrentes al generar códigos de grupo.
- Reglas de deuda alineadas entre HTTP, servicios y Mongoose.
- Nombres de grupo repetibles y auditoría no destructiva de datos históricos.
- Inyección directa de conexión y puerto en `Server`.
- Propagación de sesiones.
- Commit y abort de transacciones.
- Reversión de saldos al eliminar deudas.
- Bloqueo transaccional de la desactivación cuando existen deudas activas.
- Encabezados de Helmet, CORS local y límite de cuerpos JSON.
- Rate limiting deshabilitado por defecto y contratos `429` de los tres
  limitadores cuando se activan.
- Validación central, normalización e inyección de variables de entorno.
- Fallo de arranque previo a Express y MongoDB ante configuración inválida.

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
