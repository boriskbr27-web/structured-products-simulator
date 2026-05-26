import { useState, useRef, useEffect } from "react";

const PRODUCTS = {
  phoenix: { label: "Phoenix Autocall", color: "#534AB7", bg: "#EEEDFE", textColor: "#3C3489" },
  guaranteed: { label: "Capital garanti", color: "#0F6E56", bg: "#E1F5EE", textColor: "#085041" },
  reverse: { label: "Reverse convertible", color: "#854F0B", bg: "#FAEEDA", textColor: "#633806" },
  booster: { label: "Booster certificate", color: "#993C1D", bg: "#FAECE7", textColor: "#712B13" },
};

const UNDERLYINGS_LIST = [
  { id: "CAC40", name: "CAC 40", vol: 14.2 },
  { id: "SX5E", name: "EuroStoxx 50", vol: 13.8 },
  { id: "SPX", name: "S&P 500", vol: 15.5 },
  { id: "NKY", name: "Nikkei 225", vol: 18.1 },
  { id: "DAX", name: "DAX 40", vol: 14.0 },
  { id: "TTE", name: "TotalEnergies", vol: 22.8 },
  { id: "AI", name: "Air Liquide", vol: 19.2 },
  { id: "BNP", name: "BNP Paribas", vol: 27.3 },
  { id: "MC", name: "LVMH", vol: 23.1 },
  { id: "SAN", name: "Sanofi", vol: 20.0 },
  { id: "GLD", name: "Gold ETF", vol: 16.5 },
  { id: "OIL", name: "Crude Oil ETF", vol: 32.2 },
];

function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function Slider({ label, id, min, max, step, value, onChange, format }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <label style={{ fontSize: 12, color: "#666" }}>{label}</label>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#534AB7" }} />
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: color || "#534AB7" }}>{value}</div>
    </div>
  );
}

function TsRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid #eee", fontSize: 13 }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function HistogramBar({ value, max, color, label }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", flexDirection: "column", flex: 1, gap: 2 }}>
      <div style={{ width: "100%", background: "#eee", borderRadius: 2, height: 120, display: "flex", alignItems: "flex-end" }}>
        <div style={{ width: "100%", height: `${pct}%`, background: color, borderRadius: "2px 2px 0 0", minHeight: value > 0 ? 2 : 0 }} />
      </div>
      <div style={{ fontSize: 9, color: "#999", writingMode: "vertical-rl", transform: "rotate(180deg)", height: 36, overflow: "hidden" }}>{label}</div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("type");
  const [product, setProduct] = useState("phoenix");
  const [underlyings, setUnderlyings] = useState([{ id: "SX5E", name: "EuroStoxx 50", vol: 13.8 }]);
  const [addUnd, setAddUnd] = useState("");
  const [nominal, setNominal] = useState(1000);
  const [maturity, setMaturity] = useState(5);
  const [freq, setFreq] = useState(4);
  const [riskFree, setRiskFree] = useState(3.5);
  const [basket, setBasket] = useState("worst");
  const [params, setParams] = useState({
    recallBarrier: 100, couponBarrier: 70, capitalBarrier: 60, couponRate: 8, memoryEffect: true,
    participation: 100, callStrike: 100, capLevel: 150, capitalGuarantee: 100,
    fixedCoupon: 12, protectionBarrier: 70,
    bonusLevel: 140, knockIn: 60, leverage: 150, boosterCap: 200,
  });
  const [termsheetDone, setTermsheetDone] = useState(false);
  const [mcResults, setMcResults] = useState(null);
  const [running, setRunning] = useState(false);

  const setP = (key, val) => setParams(prev => ({ ...prev, [key]: val }));

  const addUnderlying = () => {
    const found = UNDERLYINGS_LIST.find(u => u.id === addUnd);
    if (!found || underlyings.find(u => u.id === found.id)) return;
    setUnderlyings(prev => [...prev, found]);
    setAddUnd("");
  };

  const removeUnderlying = (id) => {
    if (underlyings.length <= 1) return;
    setUnderlyings(prev => prev.filter(u => u.id !== id));
  };

  const generateTermsheet = () => {
    setTermsheetDone(true);
    setTab("termsheet");
  };

  const runMonteCarlo = () => {
    setRunning(true);
    setTab("pricing");
    setTimeout(() => {
      const N = 5000;
      const T = maturity;
      const r = riskFree / 100;
      const steps = T * freq;
      const dt = T / steps;
      const vols = underlyings.map(u => u.vol / 100);
      const p = product;

      let payoffs = [];
      let callTimes = [];

      for (let sim = 0; sim < N; sim++) {
        let paths = underlyings.map(() => [1]);
        for (let t = 0; t < steps; t++) {
          underlyings.forEach((_, i) => {
            const S = paths[i][paths[i].length - 1];
            const dW = randn() * Math.sqrt(dt);
            paths[i].push(S * Math.exp((r - 0.5 * vols[i] ** 2) * dt + vols[i] * dW));
          });
        }

        const getBasket = (step) => {
          const vals = paths.map(path => path[step]);
          if (basket === "worst") return Math.min(...vals);
          if (basket === "best") return Math.max(...vals);
          return vals.reduce((s, v) => s + v, 0) / vals.length;
        };

        let payoff = 0;
        let called = false;

        if (p === "phoenix") {
          const rb = params.recallBarrier / 100;
          const cb = params.couponBarrier / 100;
          const capitalB = params.capitalBarrier / 100;
          const cpnRate = params.couponRate / 100;
          const cpn = cpnRate / freq;
          let pending = 0;
          for (let obs = 1; obs <= steps; obs++) {
            const bkt = getBasket(obs);
            if (bkt >= cb || params.memoryEffect) pending++;
            if (bkt >= rb) {
              const t_obs = obs * dt;
              payoff = nominal * (1 + pending * cpn) * Math.exp(-r * t_obs);
              called = true;
              callTimes.push(t_obs);
              break;
            }
          }
          if (!called) {
            const bktF = getBasket(steps);
            let totalCpn = 0;
            for (let obs = 1; obs <= steps; obs++) {
              if (getBasket(obs) >= cb) totalCpn += cpn;
            }
            payoff = nominal * (bktF >= capitalB ? 1 : bktF) * (1 + totalCpn) * Math.exp(-r * T);
          }
        } else if (p === "guaranteed") {
          const part = params.participation / 100;
          const strike = params.callStrike / 100;
          const cap = params.capLevel / 100;
          const guar = params.capitalGuarantee / 100;
          const bktF = getBasket(steps);
          const perf = Math.min(Math.max(bktF - strike, 0) * part, cap - 1);
          payoff = nominal * (guar + perf) * Math.exp(-r * T);
        } else if (p === "reverse") {
          const couponF = params.fixedCoupon / 100;
          const barrier = params.protectionBarrier / 100;
          const bktF = getBasket(steps);
          const totalCpn = couponF * T;
          payoff = nominal * (bktF >= barrier ? 1 : bktF) * (1 + totalCpn) * Math.exp(-r * T);
        } else if (p === "booster") {
          const bonus = params.bonusLevel / 100;
          const ki = params.knockIn / 100;
          const lev = params.leverage / 100;
          const bcap = params.boosterCap / 100;
          let touched = false;
          for (let obs = 1; obs <= steps; obs++) {
            if (getBasket(obs) <= ki) { touched = true; break; }
          }
          const bktF = getBasket(steps);
          if (!touched) {
            payoff = nominal * (bktF >= 1 ? Math.min(1 + lev * (bktF - 1), bcap) : bonus) * Math.exp(-r * T);
          } else {
            payoff = nominal * bktF * Math.exp(-r * T);
          }
        }
        payoffs.push(payoff);
      }

      const sorted = [...payoffs].sort((a, b) => a - b);
      const mean = payoffs.reduce((s, v) => s + v, 0) / N;
      const var95 = sorted[Math.floor(N * 0.05)];
      const cvar95 = sorted.slice(0, Math.floor(N * 0.05)).reduce((s, v) => s + v, 0) / Math.floor(N * 0.05);
      const pctPos = (payoffs.filter(v => v >= nominal).length / N * 100);
      const pctLoss = (payoffs.filter(v => v < nominal * 0.9).length / N * 100);
      const avgCall = callTimes.length ? callTimes.reduce((s, v) => s + v, 0) / callTimes.length : null;
      const pctCalled = (callTimes.length / N * 100);

      const bins = 30;
      const minP = sorted[0], maxP = sorted[N - 1];
      const binSize = (maxP - minP) / bins;
      const histData = Array(bins).fill(0);
      payoffs.forEach(v => { const b = Math.min(Math.floor((v - minP) / binSize), bins - 1); histData[b]++; });
      const histLabels = Array(bins).fill(0).map((_, i) => (minP + i * binSize).toFixed(0));
      const histMax = Math.max(...histData);

      setMcResults({ mean, var95, cvar95, pctPos, pctLoss, avgCall, pctCalled, histData, histLabels, histMax, N, binSize, minP });
      setRunning(false);
    }, 100);
  };

  const freqLabel = { 1: "Annuelle", 2: "Semestrielle", 4: "Trimestrielle", 12: "Mensuelle" };
  const basketLabel = { worst: "Worst-of", best: "Best-of", average: "Moyenne pondérée" };
  const avgVol = (underlyings.reduce((s, u) => s + u.vol, 0) / underlyings.length).toFixed(1);

  const tabStyle = (name) => ({
    padding: "10px 16px", fontSize: 13, cursor: "pointer",
    borderBottom: tab === name ? "2px solid #534AB7" : "2px solid transparent",
    color: tab === name ? "#1a1a1a" : "#888",
    fontWeight: tab === name ? 500 : 400,
    background: "none", border: "none", borderBottom: tab === name ? "2px solid #534AB7" : "2px solid transparent",
  });

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "16px", maxWidth: 700, margin: "0 auto", color: "#1a1a1a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Simulateur de produits structurés</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Paramétrage · Term sheet · Pricing Monte Carlo</div>
        </div>
        <span style={{ background: PRODUCTS[product].bg, color: PRODUCTS[product].textColor, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
          {PRODUCTS[product].label}
        </span>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #eee", marginBottom: 20 }}>
        {["type", "params", "termsheet", "pricing"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
            {{ type: "① Type", params: "② Paramètres", termsheet: "③ Term sheet", pricing: "④ Pricing MC" }[t]}
          </button>
        ))}
      </div>

      {tab === "type" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            {Object.entries(PRODUCTS).map(([key, prod]) => (
              <div key={key} onClick={() => setProduct(key)}
                style={{ border: product === key ? `2px solid ${prod.color}` : "0.5px solid #ddd", borderRadius: 12, padding: "14px 16px", cursor: "pointer", background: product === key ? prod.bg + "55" : "white" }}>
                <span style={{ background: prod.bg, color: prod.textColor, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{prod.label}</span>
                <div style={{ fontSize: 14, fontWeight: 500, margin: "8px 0 4px" }}>
                  {{ phoenix: "Phoenix Autocall", guaranteed: "Capital garanti + participation", reverse: "Reverse convertible", booster: "Booster / Bonus certificate" }[key]}
                </div>
                <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>
                  {{ phoenix: "Rappel automatique si au-dessus de la barrière. Coupon conditionnel. Protection partielle du capital.", guaranteed: "100% du capital remboursé. Participation à la hausse via un call vanille ou call spread.", reverse: "Coupon fixe élevé garanti. Risque de remboursement en actions si la barrière est franchie.", booster: "Participation amplifiée à la hausse. Niveau bonus minimum si la barrière basse n'est pas touchée." }[key]}
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "right" }}>
            <button onClick={() => setTab("params")} style={{ background: "#534AB7", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Paramétrer →
            </button>
          </div>
        </div>
      )}

      {tab === "params" && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Sous-jacents</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {underlyings.map(u => (
              <span key={u.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f0f0f0", borderRadius: 20, padding: "4px 12px", fontSize: 12 }}>
                <strong>{u.id}</strong> {u.name} <span style={{ background: "#EEEDFE", color: "#3C3489", padding: "1px 6px", borderRadius: 10, fontSize: 10 }}>σ {u.vol}%</span>
                <span onClick={() => removeUnderlying(u.id)} style={{ cursor: "pointer", color: "#aaa", fontWeight: 700, fontSize: 14 }}>×</span>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <select value={addUnd} onChange={e => setAddUnd(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }}>
              <option value="">Ajouter un sous-jacent...</option>
              {UNDERLYINGS_LIST.filter(u => !underlyings.find(x => x.id === u.id)).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.id}) — σ {u.vol}%</option>
              ))}
            </select>
            <button onClick={addUnderlying} style={{ background: "none", border: "0.5px solid #ccc", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>+ Ajouter</button>
          </div>

          <div style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Caractéristiques générales</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Nominal (€)</label>
              <input type="number" value={nominal} onChange={e => setNominal(parseFloat(e.target.value))} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Maturité (années)</label>
              <input type="number" min={1} max={10} value={maturity} onChange={e => setMaturity(parseFloat(e.target.value))} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Fréquence d'observation</label>
              <select value={freq} onChange={e => setFreq(parseInt(e.target.value))} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }}>
                <option value={12}>Mensuelle</option>
                <option value={4}>Trimestrielle</option>
                <option value={2}>Semestrielle</option>
                <option value={1}>Annuelle</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Méthode panier</label>
              <select value={basket} onChange={e => setBasket(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }}>
                <option value="worst">Worst-of</option>
                <option value="best">Best-of</option>
                <option value="average">Moyenne pondérée</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Taux sans risque (%)</label>
              <input type="number" step={0.1} value={riskFree} onChange={e => setRiskFree(parseFloat(e.target.value))} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13 }} />
            </div>
          </div>

          <div style={{ height: 1, background: "#eee", margin: "16px 0" }} />
          <div style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Paramètres — {PRODUCTS[product].label}</div>

          {product === "phoenix" && (
            <div>
              <Slider label="Barrière de rappel (%)" min={80} max={110} step={1} value={params.recallBarrier} onChange={v => setP("recallBarrier", v)} format={v => v + "%"} />
              <Slider label="Barrière de coupon (%)" min={50} max={100} step={1} value={params.couponBarrier} onChange={v => setP("couponBarrier", v)} format={v => v + "%"} />
              <Slider label="Barrière protection capital (%)" min={40} max={90} step={1} value={params.capitalBarrier} onChange={v => setP("capitalBarrier", v)} format={v => v + "%"} />
              <Slider label="Coupon annuel conditionnel (%)" min={1} max={20} step={0.5} value={params.couponRate} onChange={v => setP("couponRate", v)} format={v => v + "%"} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#666" }}>Effet mémoire</label>
                <button onClick={() => setP("memoryEffect", !params.memoryEffect)} style={{ background: params.memoryEffect ? "#534AB7" : "#eee", color: params.memoryEffect ? "white" : "#666", border: "none", padding: "4px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer" }}>
                  {params.memoryEffect ? "Oui" : "Non"}
                </button>
              </div>
            </div>
          )}
          {product === "guaranteed" && (
            <div>
              <Slider label="Garantie en capital (%)" min={90} max={100} step={1} value={params.capitalGuarantee} onChange={v => setP("capitalGuarantee", v)} format={v => v + "%"} />
              <Slider label="Strike du call (%)" min={90} max={120} step={1} value={params.callStrike} onChange={v => setP("callStrike", v)} format={v => v + "%"} />
              <Slider label="Taux de participation (%)" min={50} max={200} step={5} value={params.participation} onChange={v => setP("participation", v)} format={v => v + "%"} />
              <Slider label="Plafond (cap) (%)" min={110} max={250} step={5} value={params.capLevel} onChange={v => setP("capLevel", v)} format={v => v + "%"} />
            </div>
          )}
          {product === "reverse" && (
            <div>
              <Slider label="Coupon fixe annuel (%)" min={3} max={25} step={0.5} value={params.fixedCoupon} onChange={v => setP("fixedCoupon", v)} format={v => v + "%"} />
              <Slider label="Barrière de protection (%)" min={50} max={90} step={1} value={params.protectionBarrier} onChange={v => setP("protectionBarrier", v)} format={v => v + "%"} />
            </div>
          )}
          {product === "booster" && (
            <div>
              <Slider label="Niveau bonus (%)" min={110} max={200} step={5} value={params.bonusLevel} onChange={v => setP("bonusLevel", v)} format={v => v + "%"} />
              <Slider label="Barrière désactivante (%)" min={40} max={80} step={1} value={params.knockIn} onChange={v => setP("knockIn", v)} format={v => v + "%"} />
              <Slider label="Facteur de levier (%)" min={100} max={300} step={10} value={params.leverage} onChange={v => setP("leverage", v)} format={v => v + "%"} />
              <Slider label="Plafond (%)" min={150} max={300} step={10} value={params.boosterCap} onChange={v => setP("boosterCap", v)} format={v => v + "%"} />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
            <button onClick={() => setTab("type")} style={{ background: "none", border: "0.5px solid #ccc", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Retour</button>
            <button onClick={generateTermsheet} style={{ background: "#534AB7", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Générer la term sheet →
            </button>
          </div>
        </div>
      )}

      {tab === "termsheet" && (
        <div>
          {!termsheetDone ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <div>Veuillez d'abord paramétrer le produit</div>
              <button onClick={() => setTab("params")} style={{ marginTop: 12, background: "none", border: "0.5px solid #ccc", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Aller aux paramètres</button>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <span style={{ background: PRODUCTS[product].bg, color: PRODUCTS[product].textColor, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, display: "inline-block", marginBottom: 6 }}>{PRODUCTS[product].label}</span>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Term sheet — {underlyings.map(u => u.name).join(" / ")}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Maturité {maturity} ans · {maturity * freq} observations</div>
                </div>
                <button onClick={runMonteCarlo} style={{ background: "#534AB7", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  Pricer →
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                <MetricCard label="Nominal" value={nominal.toLocaleString("fr-FR") + " €"} />
                <MetricCard label="Maturité" value={maturity + " ans"} />
                <MetricCard label="Observations" value={maturity * freq} />
                <MetricCard label="Vol. moy." value={avgVol + "%"} />
              </div>
              <div style={{ height: 1, background: "#eee", margin: "14px 0" }} />
              <TsRow label="Sous-jacent(s)" value={underlyings.map(u => u.name).join(" / ")} />
              <TsRow label="Méthode panier" value={basketLabel[basket]} />
              <TsRow label="Fréquence" value={freqLabel[freq]} />
              <TsRow label="Taux sans risque" value={riskFree + "%"} />
              <TsRow label="Volatilité implicite moy." value={avgVol + "%"} />
              {product === "phoenix" && <>
                <TsRow label="Barrière de rappel" value={params.recallBarrier + "% du niveau initial"} />
                <TsRow label="Barrière de coupon" value={params.couponBarrier + "% du niveau initial"} />
                <TsRow label="Barrière protection capital" value={params.capitalBarrier + "% du niveau initial"} />
                <TsRow label="Coupon annuel conditionnel" value={params.couponRate + "% (" + (params.couponRate / freq).toFixed(2) + "% par période)"} />
                <TsRow label="Effet mémoire" value={params.memoryEffect ? "Oui — coupons cumulés" : "Non"} />
              </>}
              {product === "guaranteed" && <>
                <TsRow label="Garantie en capital" value={params.capitalGuarantee + "%"} />
                <TsRow label="Strike du call" value={params.callStrike + "%"} />
                <TsRow label="Taux de participation" value={params.participation + "%"} />
                <TsRow label="Plafond (cap)" value={params.capLevel + "% (perf. max " + (params.capLevel - 100) + "%)"} />
              </>}
              {product === "reverse" && <>
                <TsRow label="Coupon fixe (garanti)" value={params.fixedCoupon + "% / an"} />
                <TsRow label="Barrière de protection" value={params.protectionBarrier + "%"} />
              </>}
              {product === "booster" && <>
                <TsRow label="Niveau bonus" value={params.bonusLevel + "%"} />
                <TsRow label="Barrière désactivante" value={params.knockIn + "%"} />
                <TsRow label="Facteur de levier" value={params.leverage + "%"} />
                <TsRow label="Plafond" value={params.boosterCap + "%"} />
              </>}
            </div>
          )}
        </div>
      )}

      {tab === "pricing" && (
        <div>
          {running ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
              <div style={{ fontSize: 13, marginBottom: 8 }}>Simulation de 5 000 trajectoires en cours...</div>
              <div style={{ background: "#eee", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ width: "60%", height: "100%", background: "#534AB7", borderRadius: 4 }} />
              </div>
            </div>
          ) : !mcResults ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
              <div>Générez d'abord la term sheet et lancez le pricing</div>
              <button onClick={() => setTab("params")} style={{ marginTop: 12, background: "none", border: "0.5px solid #ccc", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Aller aux paramètres</button>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Résultats — {mcResults.N.toLocaleString("fr-FR")} simulations Monte Carlo</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{PRODUCTS[product].label} · {underlyings.map(u => u.id).join("/")} · {maturity} ans</div>
                </div>
                <button onClick={runMonteCarlo} style={{ background: "none", border: "0.5px solid #ccc", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>↺ Relancer</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 10 }}>
                <MetricCard label="VAN espérée" value={mcResults.mean.toFixed(0) + " €"} color={mcResults.mean >= nominal ? "#0F6E56" : "#A32D2D"} />
                <MetricCard label="Rendement espéré" value={((mcResults.mean / nominal - 1) * 100).toFixed(1) + "%"} color={mcResults.mean >= nominal ? "#0F6E56" : "#A32D2D"} />
                <MetricCard label="Prob. capital préservé" value={mcResults.pctPos.toFixed(1) + "%"} color={mcResults.pctPos >= 50 ? "#0F6E56" : "#A32D2D"} />
                <MetricCard label="Prob. perte > 10%" value={mcResults.pctLoss.toFixed(1) + "%"} color={mcResults.pctLoss < 20 ? "#0F6E56" : "#A32D2D"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: product === "phoenix" ? "repeat(4,1fr)" : "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <MetricCard label="VaR 95%" value={mcResults.var95.toFixed(0) + " €"} color="#A32D2D" />
                <MetricCard label="CVaR 95%" value={mcResults.cvar95.toFixed(0) + " €"} color="#A32D2D" />
                {product === "phoenix" && <>
                  <MetricCard label="Prob. rappel anticipé" value={mcResults.pctCalled.toFixed(1) + "%"} color="#534AB7" />
                  <MetricCard label="Durée moy. si rappel" value={mcResults.avgCall ? mcResults.avgCall.toFixed(2) + " ans" : "—"} color="#534AB7" />
                </>}
              </div>

              <div style={{ height: 1, background: "#eee", margin: "14px 0" }} />
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Distribution des payoffs simulés</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 160, marginBottom: 6 }}>
                {mcResults.histData.map((count, i) => {
                  const v = mcResults.minP + i * mcResults.binSize;
                  const color = v < nominal * 0.9 ? "#F09595" : v < nominal ? "#FAC775" : "#5DCAA5";
                  const pct = mcResults.histMax > 0 ? (count / mcResults.histMax) * 140 : 0;
                  return (
                    <div key={i} title={`${mcResults.histLabels[i]} € : ${count} sim.`}
                      style={{ flex: 1, height: Math.max(pct, count > 0 ? 2 : 0), background: color, borderRadius: "1px 1px 0 0", alignSelf: "flex-end" }} />
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#aaa", marginBottom: 8 }}>
                <span>{parseFloat(mcResults.histLabels[0]).toFixed(0)} €</span>
                <span>{parseFloat(mcResults.histLabels[Math.floor(mcResults.histLabels.length / 2)]).toFixed(0)} €</span>
                <span>{parseFloat(mcResults.histLabels[mcResults.histLabels.length - 1]).toFixed(0)} €</span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#666", marginBottom: 16 }}>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#5DCAA5", borderRadius: 2, marginRight: 4 }} />Capital préservé</span>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#FAC775", borderRadius: 2, marginRight: 4 }} />Légère perte (&lt;10%)</span>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#F09595", borderRadius: 2, marginRight: 4 }} />Perte &gt; 10%</span>
              </div>

              <div style={{
                background: mcResults.mean >= nominal * 1.05 ? "#E1F5EE" : mcResults.mean >= nominal * 0.95 ? "#FAEEDA" : "#FCEBEB",
                border: `0.5px solid ${mcResults.mean >= nominal * 1.05 ? "#5DCAA5" : mcResults.mean >= nominal * 0.95 ? "#EF9F27" : "#F09595"}`,
                color: mcResults.mean >= nominal * 1.05 ? "#085041" : mcResults.mean >= nominal * 0.95 ? "#633806" : "#791F1F",
                borderRadius: 8, padding: "12px 14px", fontSize: 13
              }}>
                {mcResults.mean >= nominal * 1.05
                  ? `Profil favorable : VAN espérée de ${mcResults.mean.toFixed(0)} € pour un nominal de ${nominal} €. Rendement espéré de ${((mcResults.mean / nominal - 1) * 100).toFixed(1)}% avec ${mcResults.pctPos.toFixed(0)}% de probabilité de préserver le capital.`
                  : mcResults.mean >= nominal * 0.95
                  ? `Profil équilibré : VAN légèrement ${mcResults.mean >= nominal ? "au-dessus" : "en dessous"} du nominal. Risque modéré — ${mcResults.pctLoss.toFixed(0)}% de probabilité de perte > 10%.`
                  : `Profil défavorable : VAN espérée (${mcResults.mean.toFixed(0)} €) significativement sous le nominal. Revoir les paramètres de barrière ou de coupon.`
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
