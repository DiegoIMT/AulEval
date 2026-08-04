# AulaEval

Aplicación web estática para crear, responder y exportar evaluaciones escolares. La interfaz se publica gratis en GitHub Pages y Supabase almacena las evaluaciones y respuestas.

## Funciones

- Convierte texto con preguntas numeradas en una evaluación digital.
- Detecta preguntas abiertas, de opción múltiple y escalas del 1 al 5.
- Permite indicar respuestas correctas para calificación automática.
- Guarda evaluaciones y entregas en el almacenamiento local del navegador.
- Exporta resultados a CSV (compatible con Excel) y respaldos completos en JSON.
- Importa plantillas y respaldos JSON.
- Genera un enlace en **modo alumno**, que oculta completamente el editor y los resultados.
- Publica evaluaciones y recibe entregas desde cualquier dispositivo mediante Supabase.
- Administra varias evaluaciones simultáneamente, cada una con su enlace y resultados independientes.
- Protege las claves correctas y los resultados mediante Row Level Security (RLS).

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Sube todos los archivos del proyecto a la rama principal.
3. Abre **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**, selecciona `main` y la carpeta `/ (root)`.
5. Guarda y abre la dirección que GitHub mostrará después de unos minutos.

## Configurar Supabase

1. Crea un proyecto gratuito en [Supabase](https://supabase.com/).
2. Abre **SQL Editor**, crea una consulta nueva, pega todo el contenido de `supabase-schema.sql` y ejecútalo.
3. Abre **Project Settings → API** y copia la **Project URL** y la clave pública **Publishable** o **anon**.
4. Pega ambos valores en `config.js`. Nunca utilices la clave `service_role` en una página pública.
5. En **Authentication → URL Configuration**, agrega la dirección de tu GitHub Pages como Site URL y Redirect URL.
6. Publica los archivos en GitHub Pages y abre la aplicación.
7. Presiona **Acceso docente**, crea tu cuenta o inicia sesión y publica la evaluación.

La evaluación y sus opciones se guardan en una tabla pública, pero las claves correctas están en una tabla privada. Las entregas solo pueden consultarse desde la cuenta del profesor propietario. La calificación se realiza en la base de datos.

## Modo alumno

Después de iniciar sesión y guardar la evaluación, pulsa **Publicar en Supabase**. La aplicación publicará la evaluación y copiará el enlace para alumnos. Este abre únicamente el formulario, sin mostrar creación, resultados ni acceso docente. Las entregas aparecerán automáticamente en la pestaña **Resultados** del profesor.

## Varias evaluaciones

Usa **+ Nueva evaluación** para crear otra sin borrar las anteriores. El selector **Evaluación activa** permite cambiar entre ellas. Cada evaluación publicada recibe un ID y un enlace propio, y puede recibir entregas de muchos alumnos. Usa **Actualizar desde Supabase** para recuperar todas tus evaluaciones al trabajar desde otro dispositivo.

Si Supabase aún no está configurado, la aplicación conserva el funcionamiento local anterior como respaldo.
