'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  status: string;
  provider_ref: string | null;
  paid_at: string | null;
  created_at: string;
}

interface Schedule {
  id: string;
  installment_num: number;
  total_installments: number;
  amount: number;
  currency: string;
  due_date: string;
  status: string;
}

interface Receipt {
  id: string;
  receipt_number: string;
  type: string;
  issued_at: string;
}

interface Subscription {
  id: string;
  case_id: string;
  product_name: string;
  plan_name: string | null;
  premium_amount: number;
  currency: string;
  frequency: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  payments: Payment[];
  schedules: Schedule[];
  receipts: Receipt[];
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUBSCRIBED: 'bg-green-100 text-green-800',
  PAYMENT_PENDING: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  INITIATED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  UPCOMING: 'bg-gray-100 text-gray-600',
  DUE: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
};

export default function SubscriptionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [payerPhone, setPayerPhone] = useState('');
  const [showPayForm, setShowPayForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/subscriptions/${id}`, {
      headers: { Authorization: `Bearer demo-token` },
    })
      .then((r) => r.json())
      .then(setSub)
      .catch(() => {
        // Mock data
        setSub({
          id,
          case_id: 'case-001',
          product_name: 'Auto',
          plan_name: 'Tous Risques',
          premium_amount: 150000,
          currency: 'XOF',
          frequency: 'monthly',
          status: 'PAYMENT_PENDING',
          start_date: null,
          end_date: null,
          created_at: '2026-02-01T00:00:00Z',
          payments: [],
          schedules: [],
          receipts: [],
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const formatAmount = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR')} ${currency}`;

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleInitiatePayment = async () => {
    if (!sub || !payerPhone) return;
    setInitiating(true);
    try {
      const res = await fetch(`${API}/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer demo-token`,
        },
        body: JSON.stringify({
          subscription_id: sub.id,
          amount: sub.premium_amount,
          currency: sub.currency,
          payer_phone: payerPhone,
          provider: 'mock',
        }),
      });
      const data = await res.json();
      alert(`Paiement initié ! Réf: ${data.provider_ref || data.payment?.provider_ref}`);
      setShowPayForm(false);
      // Refresh
      window.location.reload();
    } catch (e) {
      alert('Erreur lors de l\'initiation du paiement');
    } finally {
      setInitiating(false);
    }
  };

  const handleSimulate = async (paymentId: string, status: 'PAID' | 'FAILED') => {
    try {
      await fetch(`${API}/payments/${paymentId}/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer demo-token`,
        },
        body: JSON.stringify({ status }),
      });
      alert(`Simulation ${status} effectuée`);
      window.location.reload();
    } catch (e) {
      alert('Erreur simulation');
    }
  };

  const handleGenerateReceipt = async (paymentId: string) => {
    try {
      const res = await fetch(`${API}/receipts/generate/${paymentId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer demo-token` },
      });
      const data = await res.json();
      alert(`Quittance générée : ${data.receipt_number}`);
      window.location.reload();
    } catch (e) {
      alert('Erreur génération quittance');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  if (!sub) return <div className="text-center py-12 text-red-500">Souscription introuvable</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <a href="/subscriptions" className="text-sm text-green-700 hover:underline">&larr; Retour aux souscriptions</a>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {sub.product_name} – {sub.plan_name || 'N/A'}
          </h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[sub.status] || 'bg-gray-100'}`}>
          {sub.status}
        </span>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-lg shadow p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase">Prime</p>
          <p className="text-lg font-bold">{formatAmount(sub.premium_amount, sub.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Fréquence</p>
          <p className="text-lg font-medium capitalize">{sub.frequency}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Date début</p>
          <p className="text-lg font-medium">{formatDate(sub.start_date)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Créée le</p>
          <p className="text-lg font-medium">{formatDate(sub.created_at)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowPayForm(!showPayForm)}
          className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium"
        >
          Déclencher un paiement
        </button>
      </div>

      {/* Payment Form */}
      {showPayForm && (
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <h3 className="font-bold text-gray-900 mb-4">Initier un paiement</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Téléphone du payeur</label>
              <input
                type="tel"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                placeholder="+225 07 XX XX XX XX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Montant</p>
              <p className="font-bold text-lg">{formatAmount(sub.premium_amount, sub.currency)}</p>
            </div>
            <button
              onClick={handleInitiatePayment}
              disabled={initiating || !payerPhone}
              className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 text-sm font-medium"
            >
              {initiating ? 'En cours...' : 'Envoyer'}
            </button>
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Paiements</h2>
        </div>
        {sub.payments.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">Aucun paiement enregistré</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
              {sub.payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold">{formatAmount(p.amount, p.currency)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.method}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.provider}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{p.provider_ref || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-100'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(p.paid_at || p.created_at)}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    {p.status === 'PENDING' && p.provider === 'mock' && (
                      <>
                        <button onClick={() => handleSimulate(p.id, 'PAID')} className="text-green-700 hover:underline text-xs">
                          Simuler PAID
                        </button>
                        <button onClick={() => handleSimulate(p.id, 'FAILED')} className="text-red-600 hover:underline text-xs">
                          Simuler FAILED
                        </button>
                      </>
                    )}
                    {p.status === 'PAID' && (
                      <button onClick={() => handleGenerateReceipt(p.id)} className="text-blue-600 hover:underline text-xs">
                        Quittance
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedules */}
      {sub.schedules.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Échéancier</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Échéance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sub.schedules.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">{s.installment_num}/{s.total_installments}</td>
                  <td className="px-6 py-4 text-sm font-semibold">{formatAmount(s.amount, s.currency)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(s.due_date)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[s.status] || 'bg-gray-100'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipts */}
      {sub.receipts.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Quittances</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Quittance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sub.receipts.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono">{r.receipt_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">{r.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(r.issued_at)}</td>
                  <td className="px-6 py-4 text-sm">
                    <a
                      href={`${API}/receipts/${r.id}/download`}
                      target="_blank"
                      className="text-blue-600 hover:underline"
                    >
                      Télécharger
                    </a>
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
