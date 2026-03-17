'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [token, setToken] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({ category: 'other', subject: '', description: '' });

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);
    if (t) { loadComplaints(t); loadStats(t); }
  }, []);

  async function loadComplaints(t: string, status?: string) {
    setLoading(true);
    const url = status
      ? `${API}/supervision/complaints?status=${status}`
      : `${API}/supervision/complaints`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) {
      const data = await res.json();
      setComplaints(data.data || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }

  async function loadStats(t: string) {
    const res = await fetch(`${API}/supervision/complaints/stats`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) setStats(await res.json());
  }

  async function createComplaint() {
    const res = await fetch(`${API}/supervision/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ category: 'other', subject: '', description: '' });
      loadComplaints(token, filterStatus);
      loadStats(token);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    await fetch(`${API}/supervision/complaints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    loadComplaints(token, filterStatus);
    loadStats(token);
  }

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      received: 'bg-blue-100 text-blue-800',
      in_review: 'bg-yellow-100 text-yellow-800',
      forwarded: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return map[s] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Réclamations</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {showForm ? 'Annuler' : '+ Nouvelle réclamation'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-sm text-gray-500">Hors SLA</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.sla_compliance_pct}%</p>
            <p className="text-sm text-gray-500">Conformité SLA</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-1">Par statut</p>
            <div className="flex flex-wrap gap-1">
              {stats.by_status?.map((s: any) => (
                <span key={s.status} className={`px-2 py-0.5 rounded text-xs ${statusColor(s.status)}`}>
                  {s.status}: {s.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold">Nouvelle réclamation</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="service_quality">Qualité de service</option>
                <option value="pricing_dispute">Litige tarifaire</option>
                <option value="claim_handling">Gestion sinistre</option>
                <option value="document_issue">Problème document</option>
                <option value="fraud_suspicion">Suspicion fraude</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Sujet de la réclamation" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={3} placeholder="Détails..." />
          </div>
          <button onClick={createComplaint} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">Créer</button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'received', 'in_review', 'forwarded', 'resolved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); loadComplaints(token, s); }}
            className={`px-3 py-1 rounded-full text-sm ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {s || 'Tous'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-gray-400 text-center py-8">Chargement...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4">Sujet</th>
                <th className="text-left py-3 px-4">Catégorie</th>
                <th className="text-center py-3 px-4">Statut</th>
                <th className="text-left py-3 px-4">SLA</th>
                <th className="text-left py-3 px-4">Créé le</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c: any) => {
                const overdue = c.sla_due_at && new Date(c.sla_due_at) < new Date() && !['resolved', 'rejected'].includes(c.status);
                return (
                  <tr key={c.id} className={`border-t ${overdue ? 'bg-red-50' : ''}`}>
                    <td className="py-3 px-4 font-medium">{c.subject}</td>
                    <td className="py-3 px-4 text-xs">{c.category}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(c.status)}`}>{c.status}</span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {overdue ? <span className="text-red-600 font-bold">HORS SLA</span> : c.sla_due_at ? new Date(c.sla_due_at).toLocaleDateString('fr-FR') : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 px-4 text-center">
                      {c.status === 'received' && (
                        <button onClick={() => updateStatus(c.id, 'in_review')} className="text-xs text-blue-600 hover:underline mr-2">Examiner</button>
                      )}
                      {c.status === 'in_review' && (
                        <>
                          <button onClick={() => updateStatus(c.id, 'resolved')} className="text-xs text-green-600 hover:underline mr-2">Résoudre</button>
                          <button onClick={() => updateStatus(c.id, 'forwarded')} className="text-xs text-purple-600 hover:underline">Transférer</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-3 text-xs text-gray-400 border-t">Total: {total} réclamations</div>
        </div>
      )}
    </div>
  );
}
