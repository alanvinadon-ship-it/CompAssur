'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Subscription {
  id: string;
  product_name: string;
  plan_name: string | null;
  premium_amount: number;
  currency: string;
  status: string;
}

type PaymentMethod = 'orange_money' | 'mtn_momo' | 'moov_money';

const methods: { value: PaymentMethod; label: string; color: string; icon: string }[] = [
  { value: 'orange_money', label: 'Orange Money', color: 'border-orange-400 bg-orange-50', icon: '🟠' },
  { value: 'mtn_momo', label: 'MTN MoMo', color: 'border-yellow-400 bg-yellow-50', icon: '🟡' },
  { value: 'moov_money', label: 'Moov Money', color: 'border-blue-400 bg-blue-50', icon: '🔵' },
];

type Step = 'choose' | 'confirm' | 'processing' | 'result';

export default function PayNowPage() {
  const params = useParams();
  const subscriptionId = params?.subscriptionId as string;
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('choose');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; ref?: string } | null>(null);

  useEffect(() => {
    if (!subscriptionId) return;
    fetch(`${API}/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer demo-token` },
    })
      .then((r) => r.json())
      .then(setSub)
      .catch(() => {
        setSub({
          id: subscriptionId,
          product_name: 'Assurance Auto',
          plan_name: 'Tous Risques',
          premium_amount: 150000,
          currency: 'XOF',
          status: 'PAYMENT_PENDING',
        });
      })
      .finally(() => setLoading(false));
  }, [subscriptionId]);

  const formatAmount = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR')} ${currency}`;

  const handlePay = async () => {
    if (!sub || !selectedMethod || !phone) return;
    setStep('processing');
    setProcessing(true);

    try {
      // In sandbox, use mock provider regardless of selected method
      const provider = process.env.NODE_ENV === 'production' ? selectedMethod : 'mock';
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
          method: 'mobile_money',
          provider,
          payer_phone: phone,
        }),
      });

      if (!res.ok) throw new Error('Payment initiation failed');
      const data = await res.json();

      // In mock mode, auto-simulate success after 2 seconds
      if (data.payment?.provider === 'mock' && data.payment?.id) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await fetch(`${API}/payments/${data.payment.id}/simulate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer demo-token`,
          },
          body: JSON.stringify({ status: 'PAID' }),
        });
      }

      setResult({
        success: true,
        message: 'Paiement effectué avec succès !',
        ref: data.provider_ref || data.payment?.provider_ref,
      });
    } catch (e) {
      setResult({
        success: false,
        message: 'Le paiement a échoué. Veuillez réessayer.',
      });
    } finally {
      setProcessing(false);
      setStep('result');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  if (!sub) return <div className="text-center py-12 text-red-500">Souscription introuvable</div>;

  return (
    <div className="max-w-lg mx-auto">
      <a href={`/subscriptions/${sub.id}`} className="text-sm text-blue-600 hover:underline">&larr; Retour</a>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">Payer ma souscription</h1>

      {/* Order Summary */}
      <div className="bg-blue-50 rounded-xl p-4 mb-6">
        <p className="text-sm text-blue-600 font-medium">Récapitulatif</p>
        <p className="text-lg font-bold text-gray-900">{sub.product_name} – {sub.plan_name || 'N/A'}</p>
        <p className="text-2xl font-bold text-blue-700 mt-1">{formatAmount(sub.premium_amount, sub.currency)}</p>
      </div>

      {/* Step: Choose Method */}
      {step === 'choose' && (
        <div className="space-y-4">
          <h2 className="font-bold text-gray-900">Choisissez votre mode de paiement</h2>
          <div className="space-y-3">
            {methods.map((m) => (
              <button
                key={m.value}
                onClick={() => { setSelectedMethod(m.value); setStep('confirm'); }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition hover:shadow-md ${
                  selectedMethod === m.value ? m.color + ' border-opacity-100' : 'border-gray-200 bg-white'
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <span className="font-medium text-gray-900">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && selectedMethod && (
        <div className="space-y-4">
          <h2 className="font-bold text-gray-900">
            Paiement via {methods.find((m) => m.value === selectedMethod)?.label}
          </h2>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Numéro de téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+225 07 XX XX XX XX"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>
          <p className="text-sm text-gray-500">
            Vous recevrez une notification sur votre téléphone pour confirmer le paiement de{' '}
            <span className="font-bold">{formatAmount(sub.premium_amount, sub.currency)}</span>.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('choose')}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
            >
              Retour
            </button>
            <button
              onClick={handlePay}
              disabled={!phone}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              Confirmer le paiement
            </button>
          </div>
        </div>
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">Paiement en cours...</p>
          <p className="text-sm text-gray-500 mt-2">Veuillez confirmer sur votre téléphone</p>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && result && (
        <div className={`text-center py-8 rounded-xl ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className={`text-5xl mb-4 ${result.success ? '' : ''}`}>
            {result.success ? '✅' : '❌'}
          </div>
          <p className={`text-xl font-bold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
            {result.message}
          </p>
          {result.ref && (
            <p className="text-sm text-gray-500 mt-2">Référence : <span className="font-mono">{result.ref}</span></p>
          )}
          <div className="mt-6 space-y-3">
            <a
              href={`/subscriptions/${sub.id}`}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
            >
              Voir ma souscription
            </a>
            {!result.success && (
              <button
                onClick={() => { setStep('choose'); setResult(null); }}
                className="block mx-auto text-sm text-blue-600 hover:underline"
              >
                Réessayer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
