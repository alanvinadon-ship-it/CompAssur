'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Payment {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  status: string;
  provider_ref: string | null;
  paid_at: string | null;
  created_at: string;
  subscription?: {
    product_name: string;
    plan_name: string | null;
  };
}

const statusColors: Record<string, string> = {
  INITIATED: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [uploadPaymentId, setUploadPaymentId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    // In production, fetch from API; for dev, use mock data
    fetch(`${API}/subscriptions`, {
      headers: { Authorization: `Bearer demo-token` },
    })
      .then((r) => r.json())
      .then((subs: any[]) => {
        // Flatten payments from all subscriptions
        const allPayments: Payment[] = [];
        subs.forEach((sub: any) => {
          (sub.payments || []).forEach((p: any) => {
            allPayments.push({
              ...p,
              subscription: {
                product_name: sub.product_name,
                plan_name: sub.plan_name,
              },
            });
          });
        });
        setPayments(allPayments);
      })
      .catch(() => {
        // Mock data
        setPayments([
          {
            id: 'pay-001',
            subscription_id: 'sub-001',
            amount: 150000,
            currency: 'XOF',
            method: 'mobile_money',
            provider: 'mock',
            status: 'PAID',
            provider_ref: 'MOCK-ABC12345',
            paid_at: '2026-01-15T10:30:00Z',
            created_at: '2026-01-15T10:00:00Z',
            subscription: { product_name: 'Auto', plan_name: 'Tous Risques' },
          },
          {
            id: 'pay-002',
            subscription_id: 'sub-002',
            amount: 25000,
            currency: 'XOF',
            method: 'mobile_money',
            provider: 'mock',
            status: 'PENDING',
            provider_ref: 'MOCK-DEF67890',
            paid_at: null,
            created_at: '2026-02-01T08:00:00Z',
            subscription: { product_name: 'Scolaire', plan_name: 'Confort' },
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const formatAmount = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR')} ${currency}`;

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredPayments = filter === 'all' ? payments : payments.filter((p) => p.status === filter);

  const handleUploadReceipt = async () => {
    if (!uploadPaymentId || !uploadFile) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const res = await fetch(`${API}/receipts/upload/${uploadPaymentId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer demo-token`,
          },
          body: JSON.stringify({
            file_base64: base64,
            file_name: uploadFile.name,
          }),
        });
        const data = await res.json();
        alert(`Quittance uploadée : ${data.receipt_number}`);
        setUploadPaymentId(null);
        setUploadFile(null);
      } catch (e) {
        alert('Erreur upload quittance');
      }
    };
    reader.readAsDataURL(uploadFile);
  };

  // Summary stats
  const totalPaid = payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => ['PENDING', 'INITIATED'].includes(p.status)).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Total paiements</p>
          <p className="text-2xl font-bold">{payments.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Montant encaissé</p>
          <p className="text-2xl font-bold text-green-700">{formatAmount(totalPaid, 'XOF')}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">En attente</p>
          <p className="text-2xl font-bold text-orange-600">{formatAmount(totalPending, 'XOF')}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Taux de succès</p>
          <p className="text-2xl font-bold">
            {payments.length > 0
              ? `${Math.round((payments.filter((p) => p.status === 'PAID').length / payments.length) * 100)}%`
              : '—'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'INITIATED', 'PENDING', 'PAID', 'FAILED', 'CANCELLED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              filter === f ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'Tous' : f}
          </button>
        ))}
      </div>

      {/* Upload Receipt Modal */}
      {uploadPaymentId && (
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <h3 className="font-bold text-gray-900 mb-4">Uploader une quittance (paiement offline)</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Fichier (PDF, image)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
            </div>
            <button
              onClick={handleUploadReceipt}
              disabled={!uploadFile}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              Uploader
            </button>
            <button
              onClick={() => { setUploadPaymentId(null); setUploadFile(null); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Payments Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Aucun paiement trouvé</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Réf.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <span className="font-medium">{p.subscription?.product_name}</span>
                    <span className="text-gray-500 ml-1">({p.subscription?.plan_name || '—'})</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">{formatAmount(p.amount, p.currency)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.method}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.provider}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono text-xs">{p.provider_ref || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-100'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(p.paid_at || p.created_at)}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <a href={`/payments/${p.id}`} className="text-green-700 hover:underline text-xs">Détails</a>
                    {p.status === 'PAID' && (
                      <button
                        onClick={() => setUploadPaymentId(p.id)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Upload quittance
                      </button>
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
