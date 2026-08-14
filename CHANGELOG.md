# Changelog

## Sin publicar

### Importes enteros en pesos colombianos (REC-20)

- Las deudas almacenan `value` como BSON `Int64` mediante el tipo `BigInt` de
  Mongoose y los balances se calculan desde esos enteros.
- La API acepta cantidades enteras como `1500` y cadenas con separadores de
  miles colombianos como `"1.500"`, pero rechaza decimales sin redondearlos.
- Los DTO conservan `value`, `amount`, `owe` y `owes` como números JSON dentro
  del rango seguro.
- Se incorporó una migración idempotente con `dry-run`, confirmación explícita
  y verificación posterior para convertir valores anteriores a BSON `Int64`.
- La auditoría de integridad ahora detecta importes fraccionarios y cantidades
  que superan el rango exacto admitido.

### Retiro gradual de la API legacy (REC-21)

- Todos los endpoints `/api/*` sin versión anuncian `Deprecation`, un `Link`
  dinámico hacia su sucesor v2 y `Sunset`.
- La deprecación comienza el 13 de agosto de 2026 y el retiro predeterminado se
  anuncia para el 1 de febrero de 2027 a las 00:00 UTC. Ambas fechas se pueden
  ajustar mediante configuración validada.
- Los usos legacy producen eventos `legacy_api_request` en logs con ruta,
  método, sucesor, estado, origen y user-agent, sin almacenar tokens, body,
  query, usuario autenticado ni dirección IP.
- `LEGACY_API_ENABLED=false` deja de montar los endpoints antiguos y conserva
  `/api/v2` operativo. `LEGACY_API_LOG_USAGE` permite controlar la medición.
- Se documentaron los criterios de salida: migrar el frontend, identificar
  consumidores, observar 30 días sin tráfico, apagar legacy, monitorear siete
  días y eliminar sus adaptadores en una versión mayor.

### Contrato HTTP uniforme (REC-11)

- Se agregó `/api/v2` con un envelope uniforme basado en `success`, `data`,
  `meta` y `message`.
- Se incorporaron DTO de salida para usuarios, grupos, deudas, resúmenes y
  referencias. Los recursos v2 usan `id` y no exponen `_id`, `__v` ni
  contraseñas.
- La búsqueda exacta pasa a
  `GET /api/v2/user/by-nickname/:nickname`, sin cuerpo en la solicitud GET.
- Los controladores legacy y v2 comparten los mismos servicios y repositorios.
  `/api/*` permanece disponible durante la migración del frontend.
- El servicio de grupos devuelve el grupo actualizado al agregar integrantes;
  los mensajes HTTP se generan en cada adaptador de controlador.
- El calendario de retiro se define ahora en REC-21.

### Saldos derivados (REC-10)

- `Debt` es ahora la única fuente de verdad para `owe` y `owes`; ambos campos
  conservan su contrato JSON, pero se calculan desde deudas activas.
- Se agregó un servicio de balance y una agregación indexada en el repositorio
  de deudas.
- Crear, pagar y eliminar deudas dejó de modificar documentos de usuario y el
  servicio de deudas dejó de depender del servicio de usuarios.
- `owe` y `owes` se retiraron del esquema `User` y cada documento `Debt` exige
  exactamente un deudor.
- La auditoría compara saldos heredados con saldos derivados y detecta deudas
  con cardinalidad incompatible.
- Se agregó una migración con simulación predeterminada y doble confirmación
  para retirar los campos heredados de MongoDB. La migración no se ejecuta al
  iniciar la API.

### Código muerto y endpoint duplicado de grupos

- Se eliminaron los archivos `index.js` vacíos de `adapters`, `models`,
  `repositories`, `routes` y `services`.
- Se retiró `getAllUsers` de servicio y controlador porque no tenía endpoint ni
  consumidores. También se eliminaron `findAllActive` de los repositorios de
  usuarios y grupos, que habían quedado sin uso.
- `GET /api/group` es ahora el listado canónico de los grupos del usuario.
- `GET /api/group/mygroups` permanece temporalmente como alias deprecado y
  ejecuta exactamente el mismo controlador. Informa
  `Deprecation: @1786579200`,
  `Link: </api/v2/group>; rel="successor-version"` y el `Sunset` definido por
  REC-21.

## 2.0.0

### Cambio incompatible: retiro de fachadas heredadas

La versión 2.0.0 elimina los módulos que construían controladores, routers,
middlewares y servicios predeterminados durante `require()`. El servidor HTTP,
sus endpoints y sus respuestas no cambian; la incompatibilidad afecta solo a
consumidores que importaban archivos internos directamente.

Imports retirados:

```text
src/controllers/{auth,debt,group,user}.js
src/routes/{auth,debt,group,user}.js
src/middlewares/{authVerify,httpSecurity,index}.js
src/services/{authService,debtservice,groupService,userService}.js
```

Migración:

| Import anterior | Reemplazo |
| --- | --- |
| `src/controllers/user.js` | `src/controllers/factories/createUserController.js` |
| `src/controllers/group.js` | `src/controllers/factories/createGroupController.js` |
| `src/controllers/auth.js` | `src/controllers/factories/createAuthController.js` |
| `src/controllers/debt.js` | `src/controllers/factories/createDebtController.js` |
| `src/routes/user.js` | `src/routes/factories/createUserRouter.js` |
| `src/routes/group.js` | `src/routes/factories/createGroupRouter.js` |
| `src/routes/auth.js` | `src/routes/factories/createAuthRouter.js` |
| `src/routes/debt.js` | `src/routes/factories/createDebtRouter.js` |
| `src/middlewares/authVerify.js` | `src/middlewares/factories/createAuthVerify.js` |
| `src/middlewares/httpSecurity.js` | `src/middlewares/factories/createHttpSecurity.js` |
| Servicios predeterminados | `src/compositionRoot.js` o su fábrica de servicio |

La opción recomendada para construir la aplicación completa es:

```js
const { createCompositionRoot } = require('./src/compositionRoot');

const root = createCompositionRoot();
```

### Auditoría previa

- No había consumidores internos fuera de las pruebas de compatibilidad.
- El proyecto no estaba publicado en el registro público de npm.
- El repositorio público no mostraba forks al realizar la migración.

Esta auditoría no permite detectar clones privados o código externo no
publicado. Esos consumidores deben migrar sus imports antes de actualizar.
