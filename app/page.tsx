import { getAllClients } from "@/lib/supabase";
import Link from "next/link";

export default async function HomePage() {
  const clients = await getAllClients();

  return (
    <div style={{ minHeight: "100vh", background: "#0B0E11", color: "#E8EAED", padding: "40px 24px", fontFamily: "Sora, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Tus clientes</h1>
        <p style={{ color: "#8A92A3", fontSize: 13, marginBottom: 28, lineHeight: 1.5 }}>
          Esta página es de acceso libre por link — guardala como favorito, no la compartas. Cada cliente abajo
          tiene su propio link de edición (para vos) y de vista (para mandarle a él).
        </p>

        {clients.length === 0 && (
          <p style={{ color: "#565E6E", fontSize: 13 }}>
            No hay clientes todavía. Cargá el esquema SQL en Supabase para crear los de ejemplo, o agregá uno nuevo.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {clients.map((c) => (
            <div
              key={c.id}
              style={{
                background: "#12161C",
                border: "1px solid #1F2530",
                borderRadius: 12,
                padding: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: c.color + "22",
                    color: c.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {c.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#565E6E", fontFamily: "IBM Plex Mono, monospace" }}>{c.type}</div>
                </div>
              </div>
              <Link
                href={`/edit/${c.edit_token}`}
                style={{
                  background: "#FF5A1F",
                  color: "#1A0A03",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Abrir panel →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
