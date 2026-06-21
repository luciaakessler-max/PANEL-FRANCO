# Panel de Clientes — Andrés

Panel de progreso, KPIs, pendientes y generador de guiones con IA. Cada cliente
tiene su propio link de **vista** (solo lectura, para mandarle) y vos tenés un
link de **edición** por cliente (para cargar datos).

No hay login: el acceso es por link secreto (token largo y random en la URL).
Por eso es importante no compartir el link de edición con nadie.

---

## 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) → "New Project"
2. Elegí nombre (ej: `panel-clientes`) y región (la más cercana a Argentina,
   normalmente São Paulo)
3. Guardá la contraseña de la base de datos que te pida (no la vas a necesitar
   para esto, pero guardala por si acaso)
4. Una vez creado, andá a **SQL Editor** (ícono en la barra lateral izquierda)
   → **New query**
5. Abrí el archivo `schema.sql` de este proyecto, copiá TODO el contenido,
   pegalo en el editor de Supabase, y apretá **Run**
6. Al final de la ejecución vas a ver una tabla con los `edit_token` y
   `view_token` de los 3 clientes de ejemplo — **copiá esos valores**, los vas
   a necesitar para armar tus primeros links
7. Andá a **Project Settings** (ícono de engranaje) → **API**
8. Copiá:
   - `Project URL`
   - `anon public` key (la que dice "this key is safe to use in a browser")

---

## 2. Configurar las variables de entorno

1. Copiá el archivo `.env.local.example` y renombralo a `.env.local`
2. Completá:

```
NEXT_PUBLIC_SUPABASE_URL=<tu Project URL de Supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu anon public key de Supabase>
ANTHROPIC_API_KEY=<tu API key de Anthropic, desde console.anthropic.com>
```

La `ANTHROPIC_API_KEY` la sacás de [console.anthropic.com](https://console.anthropic.com)
→ **API Keys** → **Create Key**. Esta clave nunca se expone al navegador del
cliente, solo la usa el servidor.

---

## 3. Probar en local (opcional, si querés ver cómo queda antes de subir)

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000` — ahí vas a ver la lista de clientes con sus
links de edición.

---

## 4. Desplegar en Vercel

1. Subí este proyecto a un repositorio de GitHub (podés usar GitHub Desktop o
   `git init && git add . && git commit -m "primer commit"` desde la terminal)
2. Entrá a [vercel.com](https://vercel.com) → **Add New** → **Project**
3. Conectá tu repositorio de GitHub
4. En **Environment Variables**, agregá las mismas 3 variables del paso 2
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ANTHROPIC_API_KEY`)
5. Apretá **Deploy**

En unos minutos vas a tener una URL tipo `panel-andres.vercel.app` funcionando.

---

## 5. Conectar tu dominio propio

1. En Vercel, dentro de tu proyecto → **Settings** → **Domains**
2. Escribí tu dominio (ej: `andresestratega.app`) → **Add**
3. Vercel te va a mostrar registros DNS (tipo A o CNAME) para configurar
4. Andá al panel de tu registrador de dominio (Namecheap, Porkbun, etc.) →
   sección DNS → agregá esos registros exactos que te dio Vercel
5. Esperá entre 10 minutos y unas horas a que se propague — después tu panel
   va a estar en `https://andresestratega.app`

---

## Cómo se usa en el día a día

- **Vos**: entrás a `tudominio.com` (la página de inicio), ahí ves todos tus
  clientes y un botón "Abrir panel" que te lleva a tu link de edición de cada
  uno. Guardá esa página de inicio como favorito.
- **Tu cliente**: le mandás el link de vista (lo conseguís apretando
  "Compartir con cliente" dentro del panel de edición). Ese link funciona en
  cualquier celular, sin instalar nada, sin login.

## Agregar un cliente nuevo

Por ahora, agregar un cliente nuevo requiere correr una consulta SQL en
Supabase (SQL Editor → New query):

```sql
insert into clients (name, type, color, initials, master_prompt, script_types)
values (
  'Nombre del Cliente',
  'Tipo (ej: YouTube, Twitter / X, E-commerce)',
  '#FF5A1F',
  'NC',
  'Tu master prompt para este cliente acá...',
  '["Tipo de contenido 1", "Tipo de contenido 2"]'::jsonb
);

-- Después corré esto para ver su link de edición:
select name, edit_token, view_token from clients where name = 'Nombre del Cliente';
```

Si en el futuro querés que esto se pueda hacer desde la interfaz (sin tocar
SQL), avisame y lo agregamos.
