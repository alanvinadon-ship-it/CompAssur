import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'CompAssur225 Admin - Backoffice',
  description: 'Gestion des leads, courtiers et commissions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900">
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-blue-900 text-white p-6 overflow-y-auto">
            <h1 className="text-2xl font-bold mb-8">CompAssur Admin</h1>
            <nav className="space-y-4">
              <a href="/dashboard" className="block px-4 py-2 rounded hover:bg-blue-800">📊 Dashboard</a>
              <a href="/leads" className="block px-4 py-2 rounded hover:bg-blue-800">📋 Leads/Cases</a>
              <a href="/brokers" className="block px-4 py-2 rounded hover:bg-blue-800">👥 Courtiers</a>
              <a href="/distribution" className="block px-4 py-2 rounded hover:bg-blue-800">⚙️ Distribution</a>
              <a href="/commissions" className="block px-4 py-2 rounded hover:bg-blue-800">💰 Commissions</a>
              <a href="/audit" className="block px-4 py-2 rounded hover:bg-blue-800">📝 Audit Logs</a>
              <a href="/consent" className="block px-4 py-2 rounded hover:bg-blue-800">✅ Consentements</a>
              <hr className="border-blue-700 my-4" />
              <p className="text-xs uppercase text-blue-300 px-4 mb-2">IA Quality</p>
              <a href="/ai/dashboard" className="block px-4 py-2 rounded hover:bg-blue-800">🤖 Dashboard IA</a>
              <a href="/ai/feedback" className="block px-4 py-2 rounded hover:bg-blue-800">💬 Feedback & Flags</a>
              <a href="/ai/knowledge" className="block px-4 py-2 rounded hover:bg-blue-800">📚 Knowledge Ops</a>
              <hr className="border-blue-700 my-4" />
              <p className="text-xs uppercase text-blue-300 px-4 mb-2">Assureurs</p>
              <a href="/insurers" className="block px-4 py-2 rounded hover:bg-blue-800">🏢 Assureurs</a>
              <a href="/reporting" className="block px-4 py-2 rounded hover:bg-blue-800">📈 Reporting</a>
              <hr className="border-blue-700 my-4" />
              <p className="text-xs uppercase text-blue-300 px-4 mb-2">Pilote Ops</p>
              <a href="/analytics" className="block px-4 py-2 rounded hover:bg-blue-800">📊 Funnel Analytics</a>
              <a href="/sla" className="block px-4 py-2 rounded hover:bg-blue-800">⏱️ SLA Alertes</a>
              <a href="/flags" className="block px-4 py-2 rounded hover:bg-blue-800">🚩 A/B Flags</a>
              <a href="/ia-loop" className="block px-4 py-2 rounded hover:bg-blue-800">🔄 Boucle Qualité IA</a>
              <hr className="border-blue-700 my-4" />
              <p className="text-xs uppercase text-blue-300 px-4 mb-2">Supervision ASACI</p>
              <a href="/supervision" className="block px-4 py-2 rounded hover:bg-blue-800">🏛️ Dashboard Marché</a>
              <a href="/supervision/plans" className="block px-4 py-2 rounded hover:bg-blue-800">📋 Contrôle Offres</a>
              <a href="/supervision/attestations" className="block px-4 py-2 rounded hover:bg-blue-800">🔍 Attestations</a>
              <a href="/supervision/complaints" className="block px-4 py-2 rounded hover:bg-blue-800">📨 Réclamations</a>
              <a href="/supervision/anomalies" className="block px-4 py-2 rounded hover:bg-blue-800">⚠️ Anomalies</a>
              <a href="/supervision/exports" className="block px-4 py-2 rounded hover:bg-blue-800">📥 Exports</a>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
              <h2 className="text-xl font-bold">Backoffice CompAssur225</h2>
            </header>
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
