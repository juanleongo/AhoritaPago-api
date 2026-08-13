# Changelog

## Sin publicar

### Código muerto y endpoint duplicado de grupos

- Se eliminaron los archivos `index.js` vacíos de `adapters`, `models`,
  `repositories`, `routes` y `services`.
- Se retiró `getAllUsers` de servicio y controlador porque no tenía endpoint ni
  consumidores. También se eliminaron `findAllActive` de los repositorios de
  usuarios y grupos, que habían quedado sin uso.
- `GET /api/group` es ahora el listado canónico de los grupos del usuario.
- `GET /api/group/mygroups` permanece temporalmente como alias deprecado y
  ejecuta exactamente el mismo controlador. Informa
  `Deprecation: @1786492800` y
  `Link: </api/group>; rel="successor-version"`.
- No se ha fijado una fecha `Sunset`; el alias no debe eliminarse hasta
  anunciarla y comprobar que el frontend ya usa la ruta canónica.

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
