'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function SupervisionDashboard() {
  const [kpis, setKpis] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [sla, setSla] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);
    if (t) loadData(t);
  }, []);

  async function loadData(t: string) {
    setLoading(true);
    const headers = { Authorization: `Bearer ${t}` };
    try {
      const [kRes, fRes, sRes] = await Promise.all([
        fetch(`${API}/supervision/kpis`, { headers }),
        fetch(`${API}/supervision/funnel`, { headers }),
        fetch(`${API}/supervision/sla`, { headers }),
      ]);
      if (kRes.ok) setKpis(await kRes.json());
      if (fRes.ok) setFunnel(await fRes.json());
      if (sRes.ok) setSla(await sRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement du dashboard supervision...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Marché — Supervision ASACI</h1>
        <span className="text-sm text-gray-500">Données agrégées • PII masquées par défaut</span>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Devis" value={kpis.volumes.quotes} color="blue" />
          <KpiCard label="Leads" value={kpis.volumes.leads} color="indigo" />
          <KpiCard label="Dossiers" value={kpis.volumes.cases} color="purple" />
          <KpiCard label="Gagnés" value={kpis.volumes.won} color="green" />
          <KpiCard label="Perdus" value={kpis.volumes.lost} color="red" />
          <KpiCard label="Souscriptions" value={kpis.volumes.subscriptions} color="teal" />
          <KpiCard label="Paiements réussis" value={kpis.volumes.paid_payments} color="emerald" />
          <KpiCard label="Prime totale (XOF)" value={kpis.financials.total_premium_collected?.toLocaleString('fr-FR')} color="amber" />
        </div>
      )}

      {/* Conversion Rates */}
      {kpis && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Taux de conversion</h3>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-blue-600">{kpis.rates.conversion_rate_pct}%</span>
              <span className="text-sm text-gray-400 mb-1">leads → gagnés</span>
            </div>
            <div className="mt-3 bg-gray-200 rounded-full h-3">
              <div className="bg-blue-500 rounded-full h-3" style={{ width: `${kpis.rates.conversion_rate_pct}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Taux succès paiement</h3>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-green-600">{kpis.rates.payment_success_rate_pct}%</span>
              <span className="text-sm text-gray-400 mb-1">paiements réussis</span>
            </div>
            <div className="mt-3 bg-gray-200 rounded-full h-3">
              <div className="bg-green-500 rounded-full h-3" style={{ width: `${kpis.rates.payment_success_rate_pct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Funnel */}
      {funnel && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Entonnoir de conversion</h2>
          <div className="space-y-3">
            {funnel.stages.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <span className="w-40 text-sm text-gray-600 truncate">{s.stage.replace(/_/g, ' ')}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                  <div
                    className="bg-blue-500 rounded-full h-6 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(5, (s.count / Math.max(funnel.stages[0]?.count || 1, 1)) * 100)}%` }}
                  >
                    <span className="text-xs text-white font-medium">{s.count}</span>
                  </div>
                </div>
                {s.drop_off_pct > 0 && (
                  <span className="text-xs text-red-500 w-20">-{s.drop_off_pct}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SLA */}
      {sla && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">SLA — Violations</h2>
          {sla.breaches_summary.length === 0 ? (
            <p className="text-gray-400">Aucune violation SLA enregistrée.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2">Type</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Résolues</th>
                  <th className="py-2">Non résolues</th>
                  <th className="py-2">Taux résolution</th>
                </tr>
              </thead>
              <tbody>
                {sla.breaches_summary.map((b: any, i: number) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 font-medium">{b.breach_type}</td>
                    <td className="py-2">{b.total_breaches}</td>
                    <td className="py-2 text-green-600">{b.resolved}</td>
                    <td className="py-2 text-red-600">{b.unresolved}</td>
                    <td className="py-2">
                      <span className={b.resolution_rate_pct >= 80 ? 'text-green-600' : 'text-orange-500'}>
                        {b.resolution_rate_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-gray-400 mt-3">Total violations: {sla.total_breaches}</p>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: any; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color] || colorMap.blue}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value ?? 0}</p>
    </div>
  );
}
