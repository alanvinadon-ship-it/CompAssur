'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
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

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  SUBSCRIBED: 'Active',
  PAYMENT_PENDING: 'Paiement en cours',
  CANCELLED: 'Annulée',
  EXPIRED: 'Expirée',
  PAID: 'Payé',
  INITIATED: 'Initié',
  FAILED: 'Échoué',
  UPCOMING: 'À venir',
  DUE: 'À payer',
  OVERDUE: 'En retard',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUBSCRIBED: 'bg-green-100 text-green-800',
  PAYMENT_PENDING: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
  PAID: 'bg-green-100 text-green-800',
  INITIATED: 'bg-blue-100 text-blue-800',
  FAILED: 'bg-red-100 text-red-800',
  UPCOMING: 'bg-gray-100 text-gray-600',
  DUE: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
};

export default function ClientSubscriptionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/subscriptions/${id}`, {
      headers: { Authorization: `Bearer demo-token` },
    })
      .then((r) => r.json())
      .then(setSub)
      .catch(() => {
        setSub({
          id,
          product_name: 'Assurance Auto',
          plan_name: 'Tous Risques',
          premium_amount: 150000,
          currency: 'XOF',
          frequency: 'monthly',
          status: 'SUBSCRIBED',
          start_date: '2026-01-15T00:00:00Z',
          end_date: '2027-01-15T00:00:00Z',
          created_at: '2026-01-10T00:00:00Z',
          payments: [
            { id: 'p1', amount: 12500, currency: 'XOF', method: 'mobile_money', status: 'PAID', paid_at: '2026-01-15', created_at: '2026-01-15' },
            { id: 'p2', amount: 12500, currency: 'XOF', method: 'mobile_money', status: 'PAID', paid_at: '2026-02-15', created_at: '2026-02-15' },
          ],
          schedules: [
            { id: 's1', installment_num: 1, total_installments: 12, amount: 12500, currency: 'XOF', due_date: '2026-01-15', status: 'PAID' },
            { id: 's2', installment_num: 2, total_installments: 12, amount: 12500, currency: 'XOF', due_date: '2026-02-15', status: 'PAID' },
            { id: 's3', installment_num: 3, total_installments: 12, amount: 12500, currency: 'XOF', due_date: '2026-03-15', status: 'DUE' },
            { id: 's4', installment_num: 4, total_installments: 12, amount: 12500, currency: 'XOF', due_date: '2026-04-15', status: 'UPCOMING' },
          ],
          receipts: [
            { id: 'r1', receipt_number: 'REC-20260115-ABC123', type: 'generated', issued_at: '2026-01-15' },
          ],
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
    });
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  if (!sub) return <div className="text-center py-12 text-red-500">Souscription introuvable</div>;

  const paidCount = sub.schedules.filter((s) => s.status === 'PAID').length;
  const totalScheduled = sub.schedules.length;
  const progressPct = totalScheduled > 0 ? Math.round((paidCount / totalScheduled) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <a href="/subscriptions" className="text-sm text-blue-600 hover:underline">&larr; Mes souscriptions</a>
        <div className="flex items-center gap-4 mt-2">
          <h1 className="text-3xl font-bold text-gray-900">{sub.product_name}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[sub.status]}`}>
            {statusLabels[sub.status] || sub.status}
          </span>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-blue-600 uppercase font-medium">Formule</p>
            <p className="text-lg font-bold text-gray-900">{sub.plan_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 uppercase font-medium">Prime</p>
            <p className="text-lg font-bold text-gray-900">{formatAmount(sub.premium_amount, sub.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 uppercase font-medium">Fréquence</p>
            <p className="text-lg font-bold text-gray-900 capitalize">
              {sub.frequency === 'monthly' ? 'Mensuelle' : sub.frequency === 'quarterly' ? 'Trimestrielle' : 'Annuelle'}
            </p>
          </div>
          <div>
            <p className="text-xs text-blue-600 uppercase font-medium">Validité</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDate(sub.start_date)} — {formatDate(sub.end_date)}
            </p>
          </div>
        </div>

        {/* Pay Now Button */}
        {['PAYMENT_PENDING', 'PENDING'].includes(sub.status) && (
          <div className="mt-4">
            <a
              href={`/pay/${sub.id}`}
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Payer maintenant
            </a>
          </div>
        )}
      </div>

      {/* Payment Progress */}
      {totalScheduled > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Progression des paiements</h2>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">{paidCount}/{totalScheduled} ({progressPct}%)</span>
          </div>
        </div>
      )}

      {/* Schedule */}
      {sub.schedules.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Échéancier</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {sub.schedules.map((s) => (
              <div key={s.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    s.status === 'PAID' ? 'bg-green-100 text-green-700' :
                    s.status === 'DUE' ? 'bg-yellow-100 text-yellow-700' :
                    s.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {s.installment_num}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Échéance n°{s.installment_num}</p>
                    <p className="text-sm text-gray-500">{formatDate(s.due_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-gray-900">{formatAmount(s.amount, s.currency)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status]}`}>
                    {statusLabels[s.status] || s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipts */}
      {sub.receipts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Mes Quittances</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {sub.receipts.map((r) => (
              <div key={r.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 font-mono">{r.receipt_number}</p>
                  <p className="text-sm text-gray-500">{formatDate(r.issued_at)}</p>
                </div>
                <a
                  href={`${API}/receipts/${r.id}/download`}
                  target="_blank"
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
                >
                  Télécharger
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      {sub.payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Historique des paiements</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {sub.payments.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{formatAmount(p.amount, p.currency)}</p>
                  <p className="text-sm text-gray-500">{p.method} – {formatDate(p.paid_at || p.created_at)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status]}`}>
                  {statusLabels[p.status] || p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
