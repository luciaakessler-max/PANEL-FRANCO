"use client";

import { useState } from "react";
import type { FullClient, Kpi, KanbanCard } from "@/lib/supabase";
import { updateKpi, upsertWeeklyHighlight, addWinningFormat, addKanbanCard, updateKanbanCard, deleteKanbanCard } from "@/lib/supabase";

const PLATFORM_COLORS: Record<string, string> = { SKOOL: "#4FA8E0", INSTAGRAM: "#E0527A", YOUTUBE: "#E05B4F" };
const KANBAN_COLORS: Record<string, string> = { todo: "#565E6E", doing: "#FF5A1F", done: "#3DDC84" };

function formatNumber(n: number | null) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("es");
}

function formatValue(k: Kpi) {
  if (k.pending || k.value === null) return "PENDIENTE";
  if (k.unit === "$") return "$" + formatNumber(k.value);
  if (k.unit === "%") return k.value + "%";
  return formatNumber(k.value);
}

function calcDelta(k: Kpi): number | null {
  if (k.pending || k.value === null || !k.previous_value) return null;
  return ((k.value - k.previous_value) / k.previous_value) * 100;
}

function groupByPlatform(kpis: Kpi[]) {
  const groups: Record<string, Kpi[]> = {};
  for (const k of kpis) {
    if (!groups[k.platform]) groups[k.platform] = [];
    groups[k.platform].push(k);
  }
  return groups;
}

export default function ClientDashboard({
  client: initialClient,
  readOnly,
}: {
  client: FullClient;
  readOnly: boolean;
}) {
  const [client, setClient] = useState(initialClient);
  const [showShare, setShowShare] = useState(false);
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);
  const [editingHighlight, setEditingHighlight] = useState(false);
  const [addingWinner, setAddingWinner] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<{ card: KanbanCard | null; column: string } | null>(null);
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});

  const kpiGroups = groupByPlatform(client.kpis);
  const pendingCount = client.kpis.filter((k) => k.pending).length;

  async function handleSaveKpi(value: number | null, previousValue: number, unit: string, pending: boolean) {
    if (!editingKpi) return;
    await updateKpi(editingKpi.id, value, previousValue, unit, pending);
    setClient((prev) => ({
      ...prev,
      kpis: prev.kpis.map((k) => (k.id === editingKpi.id ? { ...k, value, previous_value: previousValue, unit, pending } : k)),
    }));
    setEditingKpi(null);
  }

  async function handleSaveHighlight(task: string, dueDate: string, notes: string) {
    await upsertWeeklyHighlight(client.id, task, dueDate || null, notes);
    setClient((prev) => ({
      ...prev,
      weekly_highlight: { id: prev.weekly_highlight?.id || "", client_id: prev.id, task, due_date: dueDate || null, notes },
    }));
    setEditingHighlight(false);
  }

  async function handleAddWinner(platform: string, videoName: string, about: string, date: string) {
    const { data } = await addWinningFormat(client.id, platform, videoName, about, date);
    setClient((prev) => ({
      ...prev,
      winning_formats: [
        { id: data?.[0]?.id || Math.random().toString(), client_id: prev.id, platform, video_name: videoName, about, format_date: date, created_at: new Date().toISOString() },
        ...prev.winning_formats,
      ],
    }));
    setAddingWinner(null);
  }

  async function handleSaveTask(text: string, tag: string, column: string) {
    if (editingTask?.card) {
      await updateKanbanCard(editingTask.card.id, column, text, tag);
      setClient((prev) => ({
        ...prev,
        kanban_cards: prev.kanban_cards.map((c) =>
          c.id === editingTask.card!.id ? { ...c, column_key: column as any, text, tag } : c
        ),
      }));
    } else {
      const { data } = await addKanbanCard(client.id, column, text, tag);
      setClient((prev) => ({
        ...prev,
        kanban_cards: [
          ...prev.kanban_cards,
          { id: data?.[0]?.id || Math.random().toString(), client_id: prev.id, column_key: column as any, text, tag, sort_order: 0 },
        ],
      }));
    }
    setEditingTask(null);
  }

  async function handleDeleteTask() {
    if (!editingTask?.card) return;
    await deleteKanbanCard(editingTask.card.id);
    setClient((prev) => ({
      ...prev,
      kanban_cards: prev.kanban_cards.filter((c) => c.id !== editingTask.card!.id),
    }));
    setEditingTask(null);
  }

  return (
    <div className="cd-root">
      <div className="cd-app">
        <div className="cd-main" style={{ width: "100%" }}>
          <div className="cd-topbar">
            <div className="cd-topbar-title">
              <div className="cd-avatar-lg" style={{ background: client.color + "22", color: client.color }}>
                {client.initials}
              </div>
              <div>
                <h1>{client.name}</h1>
                <div className="cd-meta">{readOnly ? "Vista de solo lectura" : "Modo edición"}</div>
              </div>
            </div>
            {!readOnly && (
              <button className="cd-share-btn" onClick={() => setShowShare(true)}>
                Compartir con cliente →
              </button>
            )}
          </div>

          <div className="cd-content">
            {/* PENDIENTE DESTACADO */}
            <div
              className="cd-pending-alert"
              style={{ cursor: readOnly ? "default" : "pointer" }}
              onClick={() => !readOnly && setEditingHighlight(true)}
            >
              <div className="cd-pending-icon">!</div>
              <div className="cd-text">
                <b>PENDIENTE DE LA SEMANA</b> —{" "}
                {client.weekly_highlight?.task || "Sin tarea destacada todavía."}
                {client.weekly_highlight?.due_date && (
                  <> · Fecha límite: {client.weekly_highlight.due_date}</>
                )}
              </div>
            </div>

            {/* KPIs por plataforma */}
            {Object.entries(kpiGroups).map(([platform, kpis]) => (
              <div key={platform}>
                <div className="cd-panel-head" style={{ marginTop: 22 }}>
                  <h2 style={{ color: PLATFORM_COLORS[platform] || "var(--accent)" }}>{platform}</h2>
                </div>
                <div className="cd-kpi-grid">
                  {kpis.map((k) => {
                    const delta = calcDelta(k);
                    return (
                      <div
                        key={k.id}
                        className={`cd-kpi-card ${k.pending ? "pending" : ""}`}
                        onClick={() => !readOnly && setEditingKpi(k)}
                        style={{ cursor: readOnly ? "default" : "pointer" }}
                      >
                        <div className="cd-kpi-label">
                          {k.label}
                          {k.pending && <span className="cd-pending-tag">!</span>}
                        </div>
                        <div className="cd-kpi-value">{formatValue(k)}</div>
                        {delta !== null && (
                          <div className={`cd-kpi-delta ${delta >= 0 ? "up" : "down"}`}>
                            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
                          </div>
                        )}
                        {k.pending && !readOnly && (
                          <div className="cd-kpi-delta" style={{ color: "var(--text-dim)" }}>
                            Click para cargar
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* FORMATOS GANADORES */}
            <div className="cd-panel-head" style={{ marginTop: 26 }}>
              <h2>🏆 Formatos ganadores</h2>
            </div>
            <div className="cd-two-col">
              {["Instagram", "YouTube"].map((platform) => {
                const list = client.winning_formats.filter((w) => w.platform === platform);
                const latest = list[0];
                const rest = list.slice(1);
                return (
                  <div key={platform} className="cd-panel">
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: PLATFORM_COLORS[platform.toUpperCase()] || "var(--accent)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {platform}
                    </div>
                    {latest ? (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{latest.video_name}</div>
                        <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>{latest.about}</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-dim)" }}>{latest.format_date}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Sin formato ganador cargado todavía.</div>
                    )}
                    {!readOnly && (
                      <div
                        style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-dim)", padding: 7, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 6, cursor: "pointer", marginTop: 10 }}
                        onClick={() => setAddingWinner(platform)}
                      >
                        + Agregar formato ganador
                      </div>
                    )}
                    {rest.length > 0 && (
                      <>
                        <div
                          style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-dim)", cursor: "pointer", marginTop: 8, textDecoration: "underline" }}
                          onClick={() => setOpenHistory((p) => ({ ...p, [platform]: !p[platform] }))}
                        >
                          Ver historial ({rest.length})
                        </div>
                        {openHistory[platform] && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                            {rest.map((w) => (
                              <div key={w.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                                <div style={{ fontWeight: 600 }}>{w.video_name}</div>
                                <div>{w.about}</div>
                                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-dim)" }}>{w.format_date}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* TAREAS */}
            <div className="cd-panel-head" style={{ marginTop: 26 }}>
              <h2>🗂️ Tareas {pendingCount > 0 && <span className="cd-badge">{pendingCount}</span>}</h2>
            </div>
            <div className="cd-kanban">
              {(["todo", "doing", "done"] as const).map((col) => {
                const label = col === "todo" ? "Por hacer" : col === "doing" ? "En proceso" : "Hecho";
                const items = client.kanban_cards.filter((c) => c.column_key === col);
                return (
                  <div key={col} className="cd-kanban-col">
                    <div className="cd-kanban-col-head">
                      {label}
                      <span>{items.length}</span>
                    </div>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`cd-kanban-card ${col}`}
                        style={{ cursor: readOnly ? "default" : "pointer" }}
                        onClick={() => !readOnly && setEditingTask({ card: item, column: col })}
                      >
                        {item.text}
                        <div className="cd-tag">{item.tag}</div>
                      </div>
                    ))}
                    {!readOnly && (
                      <div
                        style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-dim)", padding: 7, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 6, cursor: "pointer", marginTop: 4 }}
                        onClick={() => setEditingTask({ card: null, column: col })}
                      >
                        + Agregar tarjeta
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showShare && <ShareModal client={client} onClose={() => setShowShare(false)} />}
      {editingKpi && (
        <EditKpiModal kpi={editingKpi} onSave={handleSaveKpi} onClose={() => setEditingKpi(null)} />
      )}
      {editingHighlight && (
        <EditHighlightModal highlight={client.weekly_highlight} onSave={handleSaveHighlight} onClose={() => setEditingHighlight(false)} />
      )}
      {addingWinner && (
        <AddWinnerModal platform={addingWinner} onSave={handleAddWinner} onClose={() => setAddingWinner(null)} />
      )}
      {editingTask && (
        <EditTaskModal
          card={editingTask.card}
          column={editingTask.column}
          onSave={handleSaveTask}
          onDelete={editingTask.card ? handleDeleteTask : undefined}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

// ---------------- MODALS ----------------

function ShareModal({ client, onClose }: { client: FullClient; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/view/${client.view_token}` : "";
  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Compartir panel de {client.name}</h3>
        <p>Este enlace le muestra a tu cliente sus KPIs, pendientes y progreso en modo solo lectura.</p>
        <div className="cd-link-box">{link}</div>
        <div className="cd-modal-actions">
          <button
            className="cd-copy-btn"
            onClick={() => {
              navigator.clipboard?.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copiado ✓" : "Copiar enlace"}
          </button>
          <button className="cd-close-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function EditKpiModal({
  kpi,
  onSave,
  onClose,
}: {
  kpi: Kpi;
  onSave: (value: number | null, previousValue: number, unit: string, pending: boolean) => void;
  onClose: () => void;
}) {
  const [prev, setPrev] = useState(kpi.previous_value?.toString() ?? "");
  const [curr, setCurr] = useState(kpi.value?.toString() ?? "");
  const [unit, setUnit] = useState(kpi.unit);
  const [pending, setPending] = useState(kpi.pending);

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{kpi.label}</h3>
        <div className="cd-form-group">
          <label>Valor anterior</label>
          <input type="number" value={prev} onChange={(e) => setPrev(e.target.value)} />
        </div>
        <div className="cd-form-group">
          <label>Valor actual</label>
          <input type="number" value={curr} onChange={(e) => setCurr(e.target.value)} />
        </div>
        <div className="cd-form-group">
          <label>Unidad</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">Ninguna</option>
            <option value="$">$ (dinero)</option>
            <option value="%">% (porcentaje)</option>
          </select>
        </div>
        <div className="cd-form-group">
          <label>¿Marcar como pendiente?</label>
          <select value={pending ? "true" : "false"} onChange={(e) => setPending(e.target.value === "true")}>
            <option value="false">No</option>
            <option value="true">Sí — todavía no tengo el dato</option>
          </select>
        </div>
        <div className="cd-modal-actions">
          <button
            className="cd-copy-btn"
            onClick={() => onSave(pending ? null : parseFloat(curr) || 0, parseFloat(prev) || 0, unit, pending)}
          >
            Guardar
          </button>
          <button className="cd-close-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function EditHighlightModal({
  highlight,
  onSave,
  onClose,
}: {
  highlight: FullClient["weekly_highlight"];
  onSave: (task: string, dueDate: string, notes: string) => void;
  onClose: () => void;
}) {
  const [task, setTask] = useState(highlight?.task || "");
  const [dueDate, setDueDate] = useState(highlight?.due_date || "");
  const [notes, setNotes] = useState(highlight?.notes || "");

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Pendiente de la semana</h3>
        <div className="cd-form-group">
          <label>Tarea destacada</label>
          <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={2} />
        </div>
        <div className="cd-form-group">
          <label>Fecha límite</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="cd-form-group">
          <label>Notas</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <div className="cd-modal-actions">
          <button className="cd-copy-btn" onClick={() => onSave(task, dueDate, notes)}>
            Guardar
          </button>
          <button className="cd-close-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function AddWinnerModal({
  platform,
  onSave,
  onClose,
}: {
  platform: string;
  onSave: (platform: string, videoName: string, about: string, date: string) => void;
  onClose: () => void;
}) {
  const [videoName, setVideoName] = useState("");
  const [about, setAbout] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nuevo formato ganador — {platform}</h3>
        <div className="cd-form-group">
          <label>Nombre del video/posteo</label>
          <input type="text" value={videoName} onChange={(e) => setVideoName(e.target.value)} />
        </div>
        <div className="cd-form-group">
          <label>De qué trató</label>
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={2} />
        </div>
        <div className="cd-form-group">
          <label>Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="cd-modal-actions">
          <button
            className="cd-copy-btn"
            onClick={() => {
              if (!videoName.trim()) return;
              onSave(platform, videoName.trim(), about.trim(), date);
            }}
          >
            Agregar
          </button>
          <button className="cd-close-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTaskModal({
  card,
  column,
  onSave,
  onDelete,
  onClose,
}: {
  card: KanbanCard | null;
  column: string;
  onSave: (text: string, tag: string, column: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(card?.text || "");
  const [tag, setTag] = useState(card?.tag || "");
  const [col, setCol] = useState(column);

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{card ? "Editar tarea" : "Nueva tarea"}</h3>
        <div className="cd-form-group">
          <label>Texto</label>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="cd-form-group">
          <label>Etiqueta</label>
          <input type="text" value={tag} onChange={(e) => setTag(e.target.value)} />
        </div>
        <div className="cd-form-group">
          <label>Estado</label>
          <select value={col} onChange={(e) => setCol(e.target.value)}>
            <option value="todo">Por hacer</option>
            <option value="doing">En proceso</option>
            <option value="done">Hecho</option>
          </select>
        </div>
        <div className="cd-modal-actions">
          <button
            className="cd-copy-btn"
            onClick={() => {
              if (!text.trim()) return;
              onSave(text.trim(), tag.trim(), col);
            }}
          >
            Guardar
          </button>
          {onDelete && (
            <button className="cd-close-btn" style={{ color: "var(--alert)", borderColor: "var(--alert)" }} onClick={onDelete}>
              Eliminar
            </button>
          )}
          <button className="cd-close-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
