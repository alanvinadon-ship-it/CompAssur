'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagForm, setFlagForm] = useState({
    case_id: '',
    flag_type: 'manual_flag',
    severity: 'medium',
    reason: '',
  });

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);
    if (t) { loadAnomalies(t); loadFlags(t); }
  }, []);

  async function loadAnomalies(t: string) {
    setLoading(true);
    const res = await fetch(`${API}/supervision/anomalies`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const data = await res.json();
      setAnomalies(data.anomalies || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }

  async function loadFlags(t: string) {
    const res = await fetch(`${API}/supervision/flags`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) setFlags(await res.json());
  }

  async function createFlag() {
    if (!flagForm.case_id || !flagForm.reason) return;
    await fetch(`${API}/supervision/cases/${flagForm.case_id}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        flag_type: flagForm.flag_type,
        severity: flagForm.severity,
        reason: flagForm.reason,
      }),
    });
    setShowFlagForm(false);
    setFlagForm({ case_id: '', flag_type: 'manual_flag', severity: 'medium', reason: '' });
    loadFlags(token);
    loadAnomalies(token);
  }

  async function resolveFlag(flagId: string, status: string) {
    await fetch(`${API}/supervision/flags/${flagId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    loadFlags(token);
    loadAnomalies(token);
  }

  const sevColor = (s: string) => {
    const map: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return map[s] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Anomalies & Signaux</h1>
        <div className="flex gap-2">
          <span className="text-sm text-gray-500">{total} anomalies détectées</span>
          <button onClick={() => setShowFlagForm(!showFlagForm)} className="bg-red-600 text-white px-4 py-1 rounded-lg text-sm hover:bg-red-700">
            Signaler un dossier
          </button>
        </div>
      </div>

      {/* Manual Flag Form */}
      {showFlagForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4 border-l-4 border-red-500">
          <h3 className="font-semibold">Signaler un dossier manuellement</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID du dossier (case_id)</label>
              <input value={flagForm.case_id} onChange={(e) => setFlagForm({ ...flagForm, case_id: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="UUID du dossier" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={flagForm.flag_type} onChange={(e) => setFlagForm({ ...flagForm, flag_type: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="manual_flag">Signalement manuel</option>
                <option value="duplicate_case">Doublon</option>
                <option value="suspicious_document">Document suspect</option>
                <option value="fraud_suspicion">Suspicion fraude</option>
                <option value="pricing_anomaly">Anomalie tarifaire</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sévérité</label>
              <select value={flagForm.severity} onChange={(e) => setFlagForm({ ...flagForm, severity: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="critical">Critique</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Justification (obligatoire)</label>
              <input value={flagForm.reason} onChange={(e) => setFlagForm({ ...flagForm, reason: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Raison du signalement..." />
            </div>
          </div>
          <button onClick={createFlag} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">Signaler</button>
        </div>
      )}

      {/* Auto-detected anomalies */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Anomalies auto-détectées</h2>
        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : anomalies.length === 0 ? (
          <p className="text-gray-400">Aucune anomalie détectée.</p>
        ) : (
          <div className="space-y-3">
            {anomalies.map((a, i) => (
              <div key={i} className={`border rounded-lg p-4 ${sevColor(a.severity)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase">{a.severity}</span>
                    <span className="font-medium">{a.type.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-xs opacity-70">{new Date(a.detected_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <p className="text-sm mt-1">{a.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Flags */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Signalements manuels</h2>
        {flags.length === 0 ? (
          <p className="text-gray-400">Aucun signalement.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3">Type</th>
                <th className="text-center py-2 px-3">Sévérité</th>
                <th className="text-left py-2 px-3">Raison</th>
                <th className="text-center py-2 px-3">Statut</th>
                <th className="text-center py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f: any) => (
                <tr key={f.id} className="border-t">
                  <td className="py-2 px-3">{f.flag_type.replace(/_/g, ' ')}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${sevColor(f.severity)}`}>{f.severity}</span>
                  </td>
                  <td className="py-2 px-3">{f.reason}</td>
                  <td className="py-2 px-3 text-center">{f.status}</td>
                  <td className="py-2 px-3 text-center">
                    {f.status === 'open' && (
                      <>
                        <button onClick={() => resolveFlag(f.id, 'resolved')} className="text-xs text-green-600 hover:underline mr-2">Résoudre</button>
                        <button onClick={() => resolveFlag(f.id, 'dismissed')} className="text-xs text-gray-500 hover:underline">Rejeter</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
