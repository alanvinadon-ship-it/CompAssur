'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
  created_at: string;
  payments: { id: string; status: string; amount: number }[];
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUBSCRIBED: 'bg-green-100 text-green-800',
  PAYMENT_PENDING: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/subscriptions`, {
      headers: { Authorization: `Bearer demo-token` },
    })
      .then((r) => r.json())
      .then(setSubscriptions)
      .catch(() => {
        // Mock data for development
        setSubscriptions([
          {
            id: 'sub-001',
            case_id: 'case-001',
            product_name: 'Auto',
            plan_name: 'Tous Risques',
            premium_amount: 150000,
            currency: 'XOF',
            frequency: 'monthly',
            status: 'SUBSCRIBED',
            start_date: '2026-01-15T00:00:00Z',
            created_at: '2026-01-10T00:00:00Z',
            payments: [{ id: 'pay-001', status: 'PAID', amount: 150000 }],
          },
          {
            id: 'sub-002',
            case_id: 'case-002',
            product_name: 'Scolaire',
            plan_name: 'Confort',
            premium_amount: 25000,
            currency: 'XOF',
            frequency: 'annual',
            status: 'PAYMENT_PENDING',
            start_date: null,
            created_at: '2026-02-01T00:00:00Z',
            payments: [{ id: 'pay-002', status: 'PENDING', amount: 25000 }],
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
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Souscriptions</h1>
        <span className="text-sm text-gray-500">{subscriptions.length} souscription(s)</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Aucune souscription trouvée</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Formule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prime</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fréquence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date début</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{sub.product_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sub.plan_name || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                    {formatAmount(sub.premium_amount, sub.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{sub.frequency}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[sub.status] || 'bg-gray-100'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(sub.start_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <a href={`/subscriptions/${sub.id}`} className="text-green-700 hover:text-green-900 font-medium mr-3">
                      Détails
                    </a>
                    <a href={`/payments?subscription=${sub.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      Paiements
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
