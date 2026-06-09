"use client";

import { useEffect, useState } from "react";

const PROP_TYPES = [
  { value: "teren-intravilan", label: "Teren intravilan" },
  { value: "teren-agricol",    label: "Teren agricol" },
  { value: "teren-industrial", label: "Teren industrial" },
  { value: "casa",             label: "Casă" },
  { value: "apartament",       label: "Apartament" },
  { value: "spatiu-comercial", label: "Spațiu comercial" },
];

interface Alert {
  id: string;
  locality: string;
  propertyType: string;
  maxTotalPrice: number | null;
  maxPriceM2: number | null;
  email: string;
  active: boolean;
  createdAt: string;
  lastCheckedAt: string | null;
  notifiedLinks: string[];
}

const inp: React.CSSProperties = {
  padding: "9px 12px", borderRadius: 8, border: "1px solid #333",
  background: "#0b0b0b", color: "#fff", fontSize: 13, width: "100%", boxSizing: "border-box",
};

const btn = (variant: "primary" | "danger" | "default" = "default"): React.CSSProperties => ({
  padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
  border: variant === "primary" ? "1px solid #1d4ed8" : variant === "danger" ? "1px solid #7f1d1d" : "1px solid #333",
  background: variant === "primary" ? "#1e3a8a" : variant === "danger" ? "#1a0000" : "#0b0b0b",
  color: variant === "primary" ? "#93c5fd" : variant === "danger" ? "#f87171" : "#e2e8f0",
});

function TypeBadge({ type }: { type: string }) {
  const found = PROP_TYPES.find((t) => t.value === type);
  return (
    <span style={{ fontSize: 11, background: "#1e293b", borderRadius: 5, padding: "2px 8px", color: "#94a3b8" }}>
      {found?.label ?? type}
    </span>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);

  const [form, setForm] = useState({
    locality: "",
    propertyType: "teren-intravilan",
    maxTotalPrice: "",
    maxPriceM2: "",
    email: "",
  });

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json() as Alert[];
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locality: form.locality,
          propertyType: form.propertyType,
          maxTotalPrice: form.maxTotalPrice ? parseFloat(form.maxTotalPrice) : undefined,
          maxPriceM2: form.maxPriceM2 ? parseFloat(form.maxPriceM2) : undefined,
          email: form.email,
        }),
      });
      if (res.ok) {
        setForm({ locality: "", propertyType: "teren-intravilan", maxTotalPrice: "", maxPriceM2: "", email: "" });
        setShowForm(false);
        await loadAlerts();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, active: !current } : a));
  }

  async function deleteAlert(id: string) {
    if (!confirm("Ștergi această alertă?")) return;
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function runCronNow() {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch("/api/cron/scrape");
      const data = await res.json() as { processed: number; totalNewMatches: number };
      setCronResult(`Procesate ${data.processed} alerte · ${data.totalNewMatches} potriviri noi trimise pe email`);
      await loadAlerts();
    } catch (err) {
      setCronResult(`Eroare: ${String(err)}`);
    } finally {
      setCronRunning(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#111", borderBottom: "1px solid #222", padding: "16px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>🔔 Alerte Proprietăți</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
              Primești email automat când apar anunțuri noi cu criteriile tale
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={runCronNow} disabled={cronRunning} style={btn("default")}>
              {cronRunning ? "⏳ Se verifică..." : "▶️ Verifică acum"}
            </button>
            <button onClick={() => setShowForm((s) => !s)} style={btn("primary")}>
              {showForm ? "✕ Anulează" : "+ Alertă nouă"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>

        {/* Cron result */}
        {cronResult && (
          <div style={{ background: "#071a0e", border: "1px solid #166534", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#4ade80" }}>
            ✅ {cronResult}
          </div>
        )}

        {/* Form creare alertă */}
        {showForm && (
          <form onSubmit={handleCreate} style={{ background: "#111", border: "1px solid #1d4ed8", borderRadius: 14, padding: 20, marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>+ Alertă nouă</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 5, fontWeight: 700 }}>LOCALITATE *</label>
                <input value={form.locality} onChange={(e) => setForm((f) => ({ ...f, locality: e.target.value }))}
                  placeholder="ex: Timișoara" required style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 5, fontWeight: 700 }}>TIP PROPRIETATE</label>
                <select value={form.propertyType} onChange={(e) => setForm((f) => ({ ...f, propertyType: e.target.value }))}
                  style={{ ...inp }}>
                  {PROP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 5, fontWeight: 700 }}>PREȚ MAXIM TOTAL (€)</label>
                <input type="number" value={form.maxTotalPrice} onChange={(e) => setForm((f) => ({ ...f, maxTotalPrice: e.target.value }))}
                  placeholder="ex: 50000 (opțional)" style={inp} min={0} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 5, fontWeight: 700 }}>PREȚ MAXIM / m² (€)</label>
                <input type="number" value={form.maxPriceM2} onChange={(e) => setForm((f) => ({ ...f, maxPriceM2: e.target.value }))}
                  placeholder="ex: 100 (opțional)" style={inp} min={0} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 5, fontWeight: 700 }}>EMAIL NOTIFICARE *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="ex: investitor@email.com" required style={inp} />
              </div>
            </div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setShowForm(false)} style={btn()}>Anulează</button>
              <button type="submit" disabled={saving} style={{ ...btn("primary"), opacity: saving ? 0.6 : 1 }}>
                {saving ? "Se salvează..." : "💾 Salvează alerta"}
              </button>
            </div>
          </form>
        )}

        {/* Lista alerte */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>⏳ Se încarcă alertele...</div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#334155" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Nicio alertă configurată</div>
            <div style={{ fontSize: 13 }}>Creează o alertă pentru a primi notificări când apar proprietăți noi.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {alerts.map((alert) => (
              <div key={alert.id} style={{
                background: alert.active ? "#111" : "#0a0a0a",
                border: `1px solid ${alert.active ? "#222" : "#1a1a1a"}`,
                borderRadius: 12, padding: "16px 20px",
                opacity: alert.active ? 1 : 0.55,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: "#e2e8f0" }}>
                        📍 {alert.locality}
                      </span>
                      <TypeBadge type={alert.propertyType} />
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                        background: alert.active ? "#14532d" : "#1e1e1e",
                        color: alert.active ? "#4ade80" : "#475569",
                        border: `1px solid ${alert.active ? "#166534" : "#333"}`,
                      }}>
                        {alert.active ? "ACTIVĂ" : "INACTIVĂ"}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#64748b" }}>
                      <span>📧 {alert.email}</span>
                      {alert.maxTotalPrice && <span>💰 Max {alert.maxTotalPrice.toLocaleString("ro-RO")} €</span>}
                      {alert.maxPriceM2 && <span>📐 Max {alert.maxPriceM2} €/m²</span>}
                    </div>

                    <div style={{ marginTop: 8, display: "flex", gap: 16, fontSize: 11, color: "#334155" }}>
                      <span>Creată: {new Date(alert.createdAt).toLocaleDateString("ro-RO")}</span>
                      {alert.lastCheckedAt && (
                        <span>Ultima verificare: {new Date(alert.lastCheckedAt).toLocaleString("ro-RO")}</span>
                      )}
                      <span>{alert.notifiedLinks.length} notificări trimise</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => toggleActive(alert.id, alert.active)} style={btn()}>
                      {alert.active ? "⏸ Pauză" : "▶️ Activează"}
                    </button>
                    <button onClick={() => deleteAlert(alert.id)} style={btn("danger")}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info email config */}
        <div style={{ marginTop: 32, background: "#111", border: "1px solid #222", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>⚙️ Configurare email</div>
          <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
            Adaugă în fișierul <code style={{ color: "#f59e0b", background: "#1c1200", padding: "1px 6px", borderRadius: 4 }}>.env</code> variabilele:
          </div>
          <pre style={{ fontSize: 11, color: "#64748b", background: "#0b0b0b", borderRadius: 8, padding: "10px 14px", marginTop: 8, overflow: "auto" }}>
{`EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=email@gmail.com
EMAIL_PASS=parola_aplicatie_google
EMAIL_FROM="Invest <email@gmail.com>"
NEXT_PUBLIC_BASE_URL=http://localhost:3000`}
          </pre>
          <div style={{ fontSize: 11, color: "#334155", marginTop: 8 }}>
            Pentru Gmail: activează &quot;App Passwords&quot; în setările contului Google.
            Fără configurare, emailurile sunt loggate în consolă (mod dev).
          </div>
        </div>

        {/* Info cron */}
        <div style={{ marginTop: 16, background: "#111", border: "1px solid #222", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>⏰ Cron automat (Vercel)</div>
          <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
            Adaugă în <code style={{ color: "#f59e0b", background: "#1c1200", padding: "1px 6px", borderRadius: 4 }}>vercel.json</code>:
          </div>
          <pre style={{ fontSize: 11, color: "#64748b", background: "#0b0b0b", borderRadius: 8, padding: "10px 14px", marginTop: 8, overflow: "auto" }}>
{`{
  "crons": [{
    "path": "/api/cron/scrape",
    "schedule": "0 8 * * *"
  }]
}`}
          </pre>
          <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>
            Rulează zilnic la 08:00 UTC. Adaugă <code style={{ color: "#94a3b8" }}>CRON_SECRET</code> în env pentru securitate.
          </div>
        </div>
      </div>
    </div>
  );
}
