# SaltarAdmin — RLS + Puente Clerk↔Supabase (Design)

> Bloqueante #1 del informe de auditoría pre-despliegue de 11 expertos (2026-07-14). Señalado independientemente por Seguridad (2/10), Base de datos (5/10) y RGPD (2/10) como la causa raíz común: la base de datos Supabase no tiene RLS en ninguna tabla, y Clerk (login) nunca se conecta con Supabase — solo decide qué botones se muestran en la interfaz, no qué datos se pueden tocar. Cualquiera con la clave anónima del proyecto (extraíble de cualquier build desplegado) puede leer y escribir toda la base de datos sin iniciar sesión.

## Problema

- `src/lib/supabase.ts:18` crea el cliente de Supabase solo con la clave anónima. Sin RLS, esa clave por sí sola concede lectura y escritura completas sobre `articulos`, `reservas` y `bloqueos`.
- `App.tsx:79` (`isSignedIn`) controla exclusivamente qué botones renderiza React. Ningún componente comprueba sesión antes de llamar a las funciones de `supabase.ts`, y Supabase nunca valida ningún token de Clerk.
- El bucket de almacenamiento de imágenes de artículos (`docs/supabase-articulo-imagen.sql:19-24`) tiene la misma causa raíz: política de subida sin comprobación de autenticación.

## Decisiones de alcance (confirmadas con el usuario)

- **Modelo de permisos: un solo nivel.** Cualquier usuario con sesión de Clerk iniciada tiene acceso completo de lectura/escritura. No hay distinción admin/empleado.
- **Cero acceso anónimo.** Toda la app es de uso interno; no existe ninguna vista pública de cara al cliente que deba seguir siendo legible sin sesión.
- **Alcance de tablas/recursos:** `articulos`, `reservas`, `bloqueos`, y el bucket de Storage de imágenes de artículos — las cuatro comparten la misma causa raíz y la misma corrección.

## Arquitectura

**Enfoque elegido: Third-Party Auth nativo de Supabase, con Clerk como proveedor de identidad.**

Supabase soporta desde 2024 confiar directamente en JWT emitidos por un proveedor externo (Clerk, Auth0, Firebase...), sin pasar por su propio sistema de auth ni por las plantillas JWT antiguas de Clerk (ese método está en vías de desaparición). El flujo:

1. En el panel de Supabase, se registra Clerk como proveedor de Third-Party Auth, pegando la URL de la instancia de Clerk (`https://<tu-instancia>.clerk.accounts.dev` o el dominio personalizado si lo tienen).
2. El cliente de Supabase en el navegador, al hacer cualquier petición, adjunta el JWT de sesión de Clerk como token de portador.
3. PostgREST (la capa API de Supabase) valida ese JWT contra el proveedor configurado y, si es válido, ejecuta la query con el rol de Postgres `authenticated`. Sin JWT válido, ejecuta con el rol `anon`.
4. Las políticas RLS de cada tabla comprueban ese rol: `to authenticated using (true)` para dar acceso completo a cualquier sesión válida, y ninguna política equivalente para `anon` — por lo que las peticiones anónimas quedan bloqueadas por defecto (RLS deniega todo lo que no tenga una política que lo permita explícitamente).

**Cómo se obtiene el JWT sin refactorizar toda la capa de datos:** Clerk expone un objeto global `window.Clerk` una vez cargado, con `window.Clerk.session.getToken()`. Esto permite pasar una función `accessToken` al crear el cliente de Supabase, sin necesitar hooks de React en el punto de creación:

```ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => (await window.Clerk?.session?.getToken()) ?? null,
})
```

Esto mantiene intacto el resto de `supabase.ts` (las ~15 funciones de acceso a datos) y sus ~6 puntos de llamada en componentes — ninguno cambia.

## Componentes afectados

| Archivo | Cambio |
|---|---|
| `src/lib/supabase.ts` | Solo la creación del cliente (líneas 11-18): añadir la opción `accessToken`. |
| Nuevo: `docs/supabase-rls-policies.sql` | Habilita RLS en las 3 tablas + políticas `authenticated`/`for all`; sustituye la política de Storage del bucket de imágenes por una que exija `authenticated`. |
| Panel de Supabase (manual) | Registrar Clerk como proveedor de Third-Party Auth. |
| Panel de Clerk (manual, solo si hace falta) | Confirmar la URL pública de la instancia (probablemente ya disponible sin cambios). |

No se toca ningún componente de UI: el comportamiento visible de la app no cambia. Esta es una corrección de backend/seguridad pura.

## Manejo de errores

Ahora mismo, `src/lib/supabase.ts` y los componentes usan el patrón `err instanceof Error ? err.message : '...'` en los `catch`, que **nunca es cierto** para errores de Postgrest/Supabase (son objetos planos, no instancias de `Error`) — esto ya está catalogado como hallazgo separado en la auditoría (Calidad de código, ~12 ocurrencias) y **queda fuera de alcance de esta tarea**, no se toca aquí.

Consecuencia práctica para esta tarea: si una política RLS deniega una petición, el usuario verá el mensaje genérico de fallback (p. ej. "No se pudieron cargar las reservas.") en vez del error real de Postgres. Para la verificación en vivo, leeremos el error real directamente de la respuesta de red/consola del navegador (Playwright), no del texto mostrado en la interfaz.

## Verificación

- **Peticiones anónimas bloqueadas:** comprobable sin sesión real, haciendo una petición REST directa a Supabase con solo la clave anónima (antes: devuelve datos; después: fila vacía o error de RLS).
- **Peticiones autenticadas siguen funcionando:** requiere una sesión real de Clerk. El usuario iniciará sesión con sus credenciales reales de Google durante la verificación en vivo (el truco de bypass `{true || isSignedIn}` usado en rondas anteriores de esta sesión no sirve aquí — solo engaña a la interfaz, no crea un JWT real, así que las llamadas a Supabase seguirían viajando como anónimas).
- Verificar los 3 flujos de escritura principales tras el cambio: crear reserva, editar artículo, crear bloqueo — con sesión real iniciada.
- Verificar que la subida de imágenes de artículo sigue funcionando con sesión real, y que una subida sin sesión (petición REST directa con clave anónima) es rechazada.

## Fuera de alcance

- Roles diferenciados (admin/empleado) — el usuario confirmó un solo nivel de acceso.
- Cualquier vista pública/anónima — no existe ninguna hoy y no se añade.
- El bug de manejo de errores `err instanceof Error` (~12 sitios) — hallazgo separado de la auditoría, no bloqueante #1.
- Separar los proyectos de Supabase de desarrollo y producción — es el bloqueante #6 de la auditoría, se abordará en su turno.
