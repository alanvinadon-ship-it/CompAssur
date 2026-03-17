'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ExportsPage() {
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState('');
  const [token, setToken] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  const exportTypes = [
    { type: 'kpi', label: 'KPIs Marché', icon: '📊' },
    { type: 'sla', label: 'Violations SLA', icon: '⏱️' },
    { type: 'complaints', label: 'Réclamations', icon: '📨' },
    { type: 'anomalies', label: 'Anomalies', icon: '⚠️' },
    { type: 'attestations', label: 'Attestations', icon: '🔍' },
    { type: 'plans_health', label: 'Santé des Plans', icon: '📋' },
  ];

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);
    if (t) loadExports(t);
  }, []);

  async function loadExports(t: string) {
    setLoading(true);
    const res = await fetch(`${API}/supervision/exports`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const data = await res.json();
      setExports(data.data || []);
    }
    setLoading(false);
  }

  async function generateExport(exportType: string) {
    setGenerating(exportType);
    const res = await fetch(`${API}/supervision/exports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ export_type: exportType, format: 'csv' }),
    });
    if (res.ok) {
      loadExports(token);
    }
    setGenerating('');
  }

  async function downloadExport(id: string) {
    window.open(`${API}/supervision/exports/${id}/download`, '_blank');
  }

  async function loadAuditLog() {
    const res = await fetch(`${API}/supervision/audit-log?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setAuditLogs(data.data || []);
    }
    setShowAudit(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Exports & Registre</h1>
        <button onClick={loadAuditLog} className="text-sm text-blue-600 hover:underline">
          Voir le journal d'audit
        </button>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-3 gap-4">
        {exportTypes.map((et) => (
          <button
            key={et.type}
            onClick={() => generateExport(et.type)}
            disabled={generating === et.type}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow border hover:border-blue-300 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{et.icon}</span>
              <div>
                <p className="font-semibold">{et.label}</p>
                <p className="text-xs text-gray-400">
                  {generating === et.type ? 'Génération en cours...' : 'Cliquer pour générer CSV'}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Export Registry */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Registre des exports</h2>
        <p className="text-xs text-gray-400 mb-4">Chaque export est horodaté, hashé (SHA-256) et journalisé.</p>
        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : exports.length === 0 ? (
          <p className="text-gray-400">Aucun export généré.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3">Type</th>
                <th className="text-left py-2 px-3">Format</th>
                <th className="text-center py-2 px-3">Lignes</th>
                <th className="text-left py-2 px-3">Hash SHA-256</th>
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-center py-2 px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {exports.map((e: any) => (
                <tr key={e.id} className="border-t">
                  <td className="py-2 px-3 font-medium">{e.export_type}</td>
                  <td className="py-2 px-3 uppercase text-xs">{e.format}</td>
                  <td className="py-2 px-3 text-center">{e.row_count}</td>
                  <td className="py-2 px-3 font-mono text-xs text-gray-500 truncate max-w-[200px]" title={e.file_hash}>
                    {e.file_hash?.slice(0, 16)}...
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-500">
                    {new Date(e.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button onClick={() => downloadExport(e.id)} className="text-blue-600 hover:underline text-xs">
                      Télécharger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Audit Log Modal */}
      {showAudit && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Journal d'audit supervision</h2>
            <button onClick={() => setShowAudit(false)} className="text-gray-400 hover:text-gray-600">Fermer</button>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-gray-400">Aucune entrée.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-2">Action</th>
                  <th className="text-left py-2 px-2">Ressource</th>
                  <th className="text-left py-2 px-2">Acteur</th>
                  <th className="text-left py-2 px-2">Raison</th>
                  <th className="text-left py-2 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((l: any) => (
                  <tr key={l.id} className="border-t">
                    <td className="py-2 px-2 font-medium">{l.action}</td>
                    <td className="py-2 px-2">{l.resource_type} {l.resource_id ? `(${l.resource_id.slice(0, 8)}...)` : ''}</td>
                    <td className="py-2 px-2 font-mono">{l.actor_id?.slice(0, 8)}...</td>
                    <td className="py-2 px-2">{l.reason || '-'}</td>
                    <td className="py-2 px-2 text-gray-500">{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
