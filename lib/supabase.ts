import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------- TIPOS ----------

export type Kpi = {
  id: string;
  client_id: string;
  platform: string;
  key: string;
  label: string;
  value: number | null;
  previous_value: number | null;
  unit: string;
  pending: boolean;
  sort_order: number;
};

export type KanbanCard = {
  id: string;
  client_id: string;
  column_key: "todo" | "doing" | "done";
  text: string;
  tag: string;
  sort_order: number;
};

export type WeeklyHighlight = {
  id: string;
  client_id: string;
  task: string;
  due_date: string | null;
  notes: string;
};

export type WinningFormat = {
  id: string;
  client_id: string;
  platform: string;
  video_name: string;
  about: string;
  format_date: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  name: string;
  type: string;
  color: string;
  initials: string;
  edit_token: string;
  view_token: string;
};

export type FullClient = Client & {
  kpis: Kpi[];
  kanban_cards: KanbanCard[];
  weekly_highlight: WeeklyHighlight | null;
  winning_formats: WinningFormat[];
};

// ---------- FUNCIONES ----------

export async function getClientByToken(
  token: string,
  tokenType: "edit_token" | "view_token"
): Promise<FullClient | null> {
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq(tokenType, token)
    .single();

  if (error || !client) return null;

  const [kpisRes, kanbanRes, highlightRes, winnersRes] = await Promise.all([
    supabase.from("kpis").select("*").eq("client_id", client.id).order("platform").order("sort_order"),
    supabase.from("kanban_cards").select("*").eq("client_id", client.id).order("sort_order"),
    supabase.from("weekly_highlight").select("*").eq("client_id", client.id).maybeSingle(),
    supabase.from("winning_formats").select("*").eq("client_id", client.id).order("format_date", { ascending: false }),
  ]);

  return {
    ...client,
    kpis: kpisRes.data || [],
    kanban_cards: kanbanRes.data || [],
    weekly_highlight: highlightRes.data || null,
    winning_formats: winnersRes.data || [],
  };
}

export async function getAllClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("name");
  if (error || !data) return [];
  return data;
}

export async function updateKpi(
  kpiId: string,
  value: number | null,
  previousValue: number,
  unit: string,
  pending: boolean
) {
  return supabase
    .from("kpis")
    .update({ value, previous_value: previousValue, unit, pending, updated_at: new Date().toISOString() })
    .eq("id", kpiId);
}

export async function upsertWeeklyHighlight(
  clientId: string,
  task: string,
  dueDate: string | null,
  notes: string
) {
  return supabase
    .from("weekly_highlight")
    .upsert({ client_id: clientId, task, due_date: dueDate, notes }, { onConflict: "client_id" });
}

export async function addWinningFormat(
  clientId: string,
  platform: string,
  videoName: string,
  about: string,
  formatDate: string
) {
  return supabase
    .from("winning_formats")
    .insert({
      client_id: clientId,
      platform,
      video_name: videoName,
      about,
      format_date: formatDate,
    })
    .select();
}

export async function addKanbanCard(clientId: string, columnKey: string, text: string, tag: string) {
  return supabase
    .from("kanban_cards")
    .insert({
      client_id: clientId,
      column_key: columnKey,
      text,
      tag,
    })
    .select();
}

export async function updateKanbanCard(cardId: string, columnKey: string, text: string, tag: string) {
  return supabase.from("kanban_cards").update({ column_key: columnKey, text, tag }).eq("id", cardId);
}

export async function deleteKanbanCard(cardId: string) {
  return supabase.from("kanban_cards").delete().eq("id", cardId);
}
