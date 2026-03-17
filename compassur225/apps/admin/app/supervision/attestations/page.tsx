'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AttestationsPage() {
  const [inputRef, setInputRef] = useState('');
  const [inputType, setInputType] = useState('number');
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);
    if (t) loadHistory(t);
  }, []);

  async function loadHistory(t: string) {
    setLoading(true);
    const res = await fetch(`${API}/supervision/attestations/history`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const data = await res.json();
      setHistory(data.data || []);
    }
    setLoading(false);
  }

  async function verify() {
    if (!inputRef.trim()) return;
    setVerifying(true);
    setResult(null);
    const res = await fetch(`${API}/supervision/attestations/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ input_ref: inputRef, input_type: inputType }),
    });
    if (res.ok) {
      setResult(await res.json());
      loadHistory(token);
    }
    setVerifying(false);
  }

  const resultColor = (r: string) => {
    if (r === 'valid') return 'bg-green-100 text-green-800';
    if (r === 'invalid') return 'bg-red-100 text-red-800';
    if (r === 'not_found') return 'bg-gray-100 text-gray-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Vérification d'Attestations</h1>

      {/* Verify Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Vérifier une attestation</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Référence / N° attestation</label>
            <input
              type="text"
              value={inputRef}
              onChange={(e) => setInputRef(e.target.value)}
              placeholder="Ex: VALID-123456, ATT-OK-789, INV-001..."
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="number">Numéro</option>
              <option value="qr_code">QR Code</option>
            </select>
          </div>
          <button
            onClick={verify}
            disabled={verifying}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {verifying ? 'Vérification...' : 'Vérifier'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Stub: préfixe VALID/ATT-OK → valide, INV → invalide, EXP → expiré, autre → introuvable
        </p>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-lg p-6 ${resultColor(result.result)}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">
              Résultat: {result.result === 'valid' ? 'VALIDE' : result.result === 'invalid' ? 'INVALIDE' : 'NON TROUVÉ'}
            </h3>
            <span className="text-sm opacity-70">Source: {result.source}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Assureur:</strong> {result.insurer_name || 'N/A'}</div>
            <div><strong>N° Police:</strong> {result.policy_number || 'N/A'}</div>
            <div><strong>Titulaire:</strong> {result.policy_holder || 'N/A'} <span className="text-xs opacity-50">(masqué)</span></div>
            <div><strong>Véhicule:</strong> {result.vehicle_info || 'N/A'} <span className="text-xs opacity-50">(masqué)</span></div>
            <div><strong>Valide du:</strong> {result.valid_from ? new Date(result.valid_from).toLocaleDateString('fr-FR') : 'N/A'}</div>
            <div><strong>Valide au:</strong> {result.valid_to ? new Date(result.valid_to).toLocaleDateString('fr-FR') : 'N/A'}</div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Historique des vérifications</h2>
        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : history.length === 0 ? (
          <p className="text-gray-400">Aucune vérification effectuée.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3">Référence</th>
                <th className="text-left py-2 px-3">Type</th>
                <th className="text-center py-2 px-3">Résultat</th>
                <th className="text-left py-2 px-3">Assureur</th>
                <th className="text-left py-2 px-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="py-2 px-3 font-mono text-xs">{h.input_ref}</td>
                  <td className="py-2 px-3">{h.input_type}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${resultColor(h.result)}`}>
                      {h.result}
                    </span>
                  </td>
                  <td className="py-2 px-3">{h.insurer_name || 'N/A'}</td>
                  <td className="py-2 px-3 text-xs text-gray-500">
                    {new Date(h.created_at).toLocaleString('fr-FR')}
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
