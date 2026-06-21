-- ============================================
-- ESQUEMA DE BASE DE DATOS — Panel de Clientes Andrés
-- Ejecutar esto en Supabase: Project > SQL Editor > New query > pegar todo > Run
-- ============================================

-- Extensión para generar UUIDs/tokens random
create extension if not exists "pgcrypto";

-- ---------- TABLA: CLIENTES ----------
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,                    -- ej: "Twitter / X", "YouTube", "E-commerce / Ads"
  color text not null default '#FF5A1F', -- color de acento del cliente
  initials text not null,                -- ej: "FR"
  edit_token text not null unique default encode(gen_random_bytes(16), 'hex'),  -- link secreto de EDICIÓN (tuyo)
  view_token text not null unique default encode(gen_random_bytes(16), 'hex'),  -- link secreto de VISTA (del cliente)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- TABLA: KPIs ----------
create table kpis (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  platform text not null default 'GENERAL',  -- ej: 'SKOOL', 'INSTAGRAM', 'YOUTUBE'
  key text not null,            -- ej: "impressions"
  label text not null,          -- ej: "Impresiones"
  value numeric,                 -- null = sin cargar
  previous_value numeric,        -- valor anterior, para calcular variación
  unit text default '',          -- '$', '%', 'x', ''
  pending boolean default true,  -- true = marcado como PENDIENTE
  sort_order int default 0,
  updated_at timestamptz default now()
);

-- ---------- TABLA: PENDIENTE DESTACADO DE LA SEMANA ----------
create table weekly_highlight (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade unique,
  task text default '',
  due_date date,
  notes text default '',
  updated_at timestamptz default now()
);

-- ---------- TABLA: FORMATOS GANADORES (historial) ----------
create table winning_formats (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  platform text not null,        -- 'Instagram' o 'YouTube'
  video_name text not null,
  about text default '',
  format_date date,
  created_at timestamptz default now()
);

-- ---------- TABLA: SERIE HISTÓRICA (para el gráfico de evolución) ----------
create table chart_points (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  label text not null,      -- ej: "D1", "Semana 3", "Jun 15"
  value numeric not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ---------- TABLA: KANBAN ----------
create table kanban_cards (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  column_key text not null check (column_key in ('todo','doing','done')),
  text text not null,
  tag text default '',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ============================================
-- ÍNDICES para que las búsquedas por token sean rápidas
-- ============================================
create index idx_clients_edit_token on clients(edit_token);
create index idx_clients_view_token on clients(view_token);
create index idx_kpis_client on kpis(client_id);
create index idx_chart_points_client on chart_points(client_id);
create index idx_kanban_client on kanban_cards(client_id);

-- ============================================
-- ROW LEVEL SECURITY
-- Como no hay login (es por token secreto), dejamos las tablas
-- accesibles vía la anon key, pero el FILTRADO por token pasa
-- en el código de la app (no en la DB). Esto es aceptable
-- porque los tokens son largos y random (no se pueden adivinar).
-- ============================================
alter table clients enable row level security;
alter table kpis enable row level security;
alter table chart_points enable row level security;
alter table kanban_cards enable row level security;
alter table weekly_highlight enable row level security;
alter table winning_formats enable row level security;

-- Política simple: permitir todo via anon key (el control de acceso real
-- es el conocimiento del token, no estas políticas)
create policy "allow all clients" on clients for all using (true) with check (true);
create policy "allow all kpis" on kpis for all using (true) with check (true);
create policy "allow all chart_points" on chart_points for all using (true) with check (true);
create policy "allow all kanban_cards" on kanban_cards for all using (true) with check (true);
create policy "allow all weekly_highlight" on weekly_highlight for all using (true) with check (true);
create policy "allow all winning_formats" on winning_formats for all using (true) with check (true);

-- ============================================
-- DATOS DE EJEMPLO PARA FRANCO
-- Si ya tenés a Franco cargado (sin datos por plataforma todavía),
-- este bloque inserta sus KPIs nuevos, el pendiente destacado,
-- y un par de formatos ganadores de ejemplo.
-- ============================================

-- KPIs — SKOOL
insert into kpis (client_id, platform, key, label, value, previous_value, unit, pending, sort_order)
select id, 'SKOOL', 'mrr', 'MRR', 2140, 1850, '$', false, 0 from clients where name = 'Franco'
union all
select id, 'SKOOL', 'premium', 'Miembros Premium', 71, 62, '', false, 1 from clients where name = 'Franco'
union all
select id, 'SKOOL', 'free', 'Miembros gratis', 812, 740, '', false, 2 from clients where name = 'Franco'
union all
select id, 'SKOOL', 'churn', '% Churn', 3.6, 4.2, '%', false, 3 from clients where name = 'Franco';

-- KPIs — INSTAGRAM
insert into kpis (client_id, platform, key, label, value, previous_value, unit, pending, sort_order)
select id, 'INSTAGRAM', 'followers', 'Seguidores', 9120, 8400, '', false, 0 from clients where name = 'Franco'
union all
select id, 'INSTAGRAM', 'reach', 'Alcance / Impresiones', 168000, 145000, '', false, 1 from clients where name = 'Franco'
union all
select id, 'INSTAGRAM', 'interactions', 'Interacciones', 7100, 6200, '', false, 2 from clients where name = 'Franco'
union all
select id, 'INSTAGRAM', 'new_followers', 'Nuevos seguidores', 720, 510, '', false, 3 from clients where name = 'Franco';

-- KPIs — YOUTUBE
insert into kpis (client_id, platform, key, label, value, previous_value, unit, pending, sort_order)
select id, 'YOUTUBE', 'subs', 'Suscriptores', 12950, 12300, '', false, 0 from clients where name = 'Franco'
union all
select id, 'YOUTUBE', 'views', 'Vistas del mes', 312000, 280000, '', false, 1 from clients where name = 'Franco'
union all
select id, 'YOUTUBE', 'rpm', 'RPM / Ingresos AdSense', 998, 890, '$', false, 2 from clients where name = 'Franco'
union all
select id, 'YOUTUBE', 'retention', 'Retención promedio', 41, 43, '%', false, 3 from clients where name = 'Franco';

-- Pendiente destacado de la semana
insert into weekly_highlight (client_id, task, due_date, notes)
select id, 'Cerrar el bug de tracking del Pixel en Mercado Pago', '2026-06-27', 'Bloquea poder medir ROAS real de Fenogrec'
from clients where name = 'Franco';

-- Formatos ganadores
insert into winning_formats (client_id, platform, video_name, about, format_date)
select id, 'YouTube', 'Por qué el 90% pierde plata en futuros', 'Errores comunes de gestión de riesgo en traders nuevos', '2026-06-15'
from clients where name = 'Franco'
union all
select id, 'Instagram', '3 señales de que estás sobre-operando', 'Carrusel explicando overtrading con ejemplos reales', '2026-06-18'
from clients where name = 'Franco';

-- Kanban para Franco (si no lo corriste antes)
insert into kanban_cards (client_id, column_key, text, tag, sort_order)
select id, 'todo', 'Hilo sobre gestión de riesgo', 'Bomba #14', 0 from clients where name = 'Franco'
union all
select id, 'todo', 'Revisar métricas semana 3', 'Reporte', 1 from clients where name = 'Franco'
union all
select id, 'doing', 'Tanda de 20 tweets — formato shock', 'Bomba #13', 0 from clients where name = 'Franco'
union all
select id, 'done', 'Tanda de 20 tweets — día 1', 'Bomba #12', 0 from clients where name = 'Franco'
union all
select id, 'done', 'Setup master prompt v2', 'Sistema', 1 from clients where name = 'Franco';

-- ============================================
-- AL FINAL: ver los links que se generaron
-- ============================================
select name, edit_token, view_token from clients;

-- ============================================
-- LIMPIEZA OPCIONAL — si ya corriste una versión anterior
-- con la tabla de chart_points o generated_scripts y querés
-- sacar lo que quedó sin uso:
-- ============================================
-- drop table if exists generated_scripts;
-- drop table if exists chart_points;

