'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function PlansHealthPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterInsurer, setFilterInsurer] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    loadPlans(t);
  }, []);

  async function loadPlans(t: string) {
    setLoading(true);
    const url = filterInsurer
      ? `${API}/supervision/plans/health?insurerId=${filterInsurer}`
      : `${API}/supervision/plans/health`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) setPlans(await res.json());
    setLoading(false);
  }

  const healthColor = (status: string) => {
    if (status === 'healthy') return 'bg-green-100 text-green-800';
    if (status === 'warning') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Contrôle des Offres — Santé des Plans</h1>
        <div className="flex gap-2">
          <span className="text-sm text-gray-500">{plans.length} plans analysés</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{plans.filter(p => p.status === 'healthy').length}</p>
          <p className="text-sm text-green-600">Conformes</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{plans.filter(p => p.status === 'warning').length}</p>
          <p className="text-sm text-yellow-600">Avertissements</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{plans.filter(p => p.status === 'critical').length}</p>
          <p className="text-sm text-red-600">Critiques</p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-8">Chargement...</p>
      ) : plans.length === 0 ? (
        <p className="text-gray-400 text-center py-8">Aucun plan trouvé.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4">Plan</th>
                <th className="text-left py-3 px-4">Produit</th>
                <th className="text-center py-3 px-4">Score</th>
                <th className="text-center py-3 px-4">Statut</th>
                <th className="text-center py-3 px-4">Couvertures</th>
                <th className="text-center py-3 px-4">Tarifs</th>
                <th className="text-left py-3 px-4">Problèmes</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{p.plan_name}</td>
                  <td className="py-3 px-4">{p.product}</td>
                  <td className={`py-3 px-4 text-center font-bold ${scoreColor(p.health_score)}`}>
                    {p.health_score}/100
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${healthColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">{p.coverages_count}</td>
                  <td className="py-3 px-4 text-center">{p.pricing_rules_count}</td>
                  <td className="py-3 px-4">
                    {p.issues.length > 0 ? (
                      <ul className="text-xs text-red-600 space-y-1">
                        {p.issues.map((issue: string, j: number) => (
                          <li key={j}>• {issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-green-500 text-xs">Aucun</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
