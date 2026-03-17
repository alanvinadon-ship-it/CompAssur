'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Subscription {
  id: string;
  product_name: string;
  plan_name: string | null;
  premium_amount: number;
  currency: string;
  frequency: string;
  status: string;
  start_date: string | null;
  created_at: string;
  payments: { id: string; status: string; amount: number }[];
  schedules: { id: string; installment_num: number; total_installments: number; amount: number; due_date: string; status: string }[];
}

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  SUBSCRIBED: 'Active',
  PAYMENT_PENDING: 'Paiement en cours',
  CANCELLED: 'Annulée',
  EXPIRED: 'Expirée',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  SUBSCRIBED: 'bg-green-100 text-green-800 border-green-200',
  PAYMENT_PENDING: 'bg-orange-100 text-orange-800 border-orange-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  EXPIRED: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function ClientSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, use user_id from auth context
    fetch(`${API}/subscriptions?user_id=demo-user`, {
      headers: { Authorization: `Bearer demo-token` },
    })
      .then((r) => r.json())
      .then(setSubscriptions)
      .catch(() => {
        setSubscriptions([
          {
            id: 'sub-001',
            product_name: 'Assurance Auto',
            plan_name: 'Tous Risques',
            premium_amount: 150000,
            currency: 'XOF',
            frequency: 'monthly',
            status: 'SUBSCRIBED',
            start_date: '2026-01-15T00:00:00Z',
            created_at: '2026-01-10T00:00:00Z',
            payments: [{ id: 'pay-001', status: 'PAID', amount: 150000 }],
            schedules: [
              { id: 's1', installment_num: 1, total_installments: 12, amount: 12500, due_date: '2026-02-15', status: 'PAID' },
              { id: 's2', installment_num: 2, total_installments: 12, amount: 12500, due_date: '2026-03-15', status: 'DUE' },
            ],
          },
          {
            id: 'sub-002',
            product_name: 'Assurance Scolaire',
            plan_name: 'Confort',
            premium_amount: 25000,
            currency: 'XOF',
            frequency: 'annual',
            status: 'PAYMENT_PENDING',
            start_date: null,
            created_at: '2026-02-01T00:00:00Z',
            payments: [],
            schedules: [],
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
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Souscriptions</h1>
      <p className="text-gray-600 mb-8">Retrouvez ici toutes vos assurances et leur état de paiement.</p>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement de vos souscriptions...</div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-4">Vous n'avez pas encore de souscription.</p>
          <a href="/quote/auto" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Comparer les offres
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {subscriptions.map((sub) => {
            const nextDue = sub.schedules.find((s) => s.status === 'DUE');
            return (
              <div key={sub.id} className={`bg-white rounded-xl shadow-sm border-l-4 p-6 ${statusColors[sub.status]?.split(' ').pop() || 'border-gray-200'}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-gray-900">{sub.product_name}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[sub.status] || 'bg-gray-100'}`}>
                        {statusLabels[sub.status] || sub.status}
                      </span>
                    </div>
                    <p className="text-gray-600">Formule : <span className="font-medium">{sub.plan_name || 'N/A'}</span></p>
                    <p className="text-gray-600">
                      Prime : <span className="font-bold text-gray-900">{formatAmount(sub.premium_amount, sub.currency)}</span>
                      <span className="text-gray-500"> / {sub.frequency === 'monthly' ? 'mois' : sub.frequency === 'quarterly' ? 'trimestre' : 'an'}</span>
                    </p>
                    {sub.start_date && (
                      <p className="text-sm text-gray-500 mt-1">Depuis le {formatDate(sub.start_date)}</p>
                    )}
                    {nextDue && (
                      <p className="text-sm text-orange-600 mt-1 font-medium">
                        Prochaine échéance : {formatAmount(nextDue.amount, sub.currency)} le {formatDate(nextDue.due_date)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <a
                      href={`/subscriptions/${sub.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium text-center"
                    >
                      Voir les détails
                    </a>
                    {['PAYMENT_PENDING', 'PENDING'].includes(sub.status) && (
                      <a
                        href={`/pay/${sub.id}`}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium text-center"
                      >
                        Payer maintenant
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
