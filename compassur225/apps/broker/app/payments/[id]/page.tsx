'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Receipt {
  id: string;
  receipt_number: string;
  type: string;
  issued_at: string;
}

interface Payment {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  status: string;
  provider_ref: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
  receipts: Receipt[];
  subscription?: {
    product_name: string;
    plan_name: string | null;
    status: string;
  };
}

const statusColors: Record<string, string> = {
  INITIATED: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function PaymentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/payments/${id}`, {
      headers: { Authorization: `Bearer demo-token` },
    })
      .then((r) => r.json())
      .then(setPayment)
      .catch(() => {
        setPayment({
          id,
          subscription_id: 'sub-001',
          amount: 150000,
          currency: 'XOF',
          method: 'mobile_money',
          provider: 'mock',
          status: 'PAID',
          provider_ref: 'MOCK-ABC12345',
          failure_reason: null,
          paid_at: '2026-01-15T10:30:00Z',
          created_at: '2026-01-15T10:00:00Z',
          receipts: [],
          subscription: { product_name: 'Auto', plan_name: 'Tous Risques', status: 'SUBSCRIBED' },
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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSimulate = async (status: 'PAID' | 'FAILED') => {
    try {
      await fetch(`${API}/payments/${id}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer demo-token` },
        body: JSON.stringify({ status }),
      });
      alert(`Simulation ${status} effectuée`);
      window.location.reload();
    } catch (e) {
      alert('Erreur simulation');
    }
  };

  const handleGenerateReceipt = async () => {
    try {
      const res = await fetch(`${API}/receipts/generate/${id}`, {
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

  const handleRefreshStatus = async () => {
    try {
      const res = await fetch(`${API}/payments/${id}/status`, {
        headers: { Authorization: `Bearer demo-token` },
      });
      const data = await res.json();
      setPayment((prev) => (prev ? { ...prev, status: data.status } : prev));
    } catch (e) {
      alert('Erreur rafraîchissement');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  if (!payment) return <div className="text-center py-12 text-red-500">Paiement introuvable</div>;

  return (
    <div className="space-y-6">
      <div>
        <a href="/payments" className="text-sm text-green-700 hover:underline">&larr; Retour aux paiements</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Détail du paiement</h1>
      </div>

      {/* Payment Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase">Montant</p>
            <p className="text-2xl font-bold">{formatAmount(payment.amount, payment.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Statut</p>
            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[payment.status] || 'bg-gray-100'}`}>
              {payment.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Produit</p>
            <p className="text-lg font-medium">
              {payment.subscription?.product_name} – {payment.subscription?.plan_name || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Méthode</p>
            <p className="text-lg font-medium">{payment.method}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Provider</p>
            <p className="text-lg font-medium">{payment.provider}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Réf. Provider</p>
            <p className="text-lg font-mono">{payment.provider_ref || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Créé le</p>
            <p className="text-sm">{formatDate(payment.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Payé le</p>
            <p className="text-sm">{formatDate(payment.paid_at)}</p>
          </div>
          {payment.failure_reason && (
            <div className="col-span-full">
              <p className="text-xs text-gray-500 uppercase">Raison d'échec</p>
              <p className="text-sm text-red-600">{payment.failure_reason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {['INITIATED', 'PENDING'].includes(payment.status) && (
          <button
            onClick={handleRefreshStatus}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            Rafraîchir le statut
          </button>
        )}
        {['INITIATED', 'PENDING'].includes(payment.status) && payment.provider === 'mock' && (
          <>
            <button
              onClick={() => handleSimulate('PAID')}
              className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium"
            >
              Simuler PAID
            </button>
            <button
              onClick={() => handleSimulate('FAILED')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Simuler FAILED
            </button>
          </>
        )}
        {payment.status === 'PAID' && (
          <button
            onClick={handleGenerateReceipt}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Générer quittance
          </button>
        )}
      </div>

      {/* Receipts */}
      {payment.receipts.length > 0 && (
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
              {payment.receipts.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 text-sm font-mono">{r.receipt_number}</td>
                  <td className="px-6 py-4 text-sm capitalize">{r.type}</td>
                  <td className="px-6 py-4 text-sm">{formatDate(r.issued_at)}</td>
                  <td className="px-6 py-4 text-sm">
                    <a href={`${API}/receipts/${r.id}/download`} target="_blank" className="text-blue-600 hover:underline">
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
