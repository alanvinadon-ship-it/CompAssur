import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'CompAssur225 Broker - Portail Partenaire',
  description: 'Gestion des leads et dossiers clients',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900">
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-green-900 text-white p-6 overflow-y-auto">
            <h1 className="text-2xl font-bold mb-8">Broker Portal</h1>
            <nav className="space-y-4">
              <a href="/inbox" className="block px-4 py-2 rounded hover:bg-green-800">📬 Inbox (SLA)</a>
              <a href="/handoffs" className="block px-4 py-2 rounded hover:bg-green-800">🤖 Handoffs IA</a>
              <a href="/pipeline" className="block px-4 py-2 rounded hover:bg-green-800">📊 Pipeline Kanban</a>
              <a href="/cases" className="block px-4 py-2 rounded hover:bg-green-800">📋 Mes Dossiers</a>
              <a href="/subscriptions" className="block px-4 py-2 rounded hover:bg-green-800">📝 Souscriptions</a>
              <a href="/payments" className="block px-4 py-2 rounded hover:bg-green-800">💳 Paiements</a>
              <a href="/commissions" className="block px-4 py-2 rounded hover:bg-green-800">💰 Mes Commissions</a>
              <a href="/profile" className="block px-4 py-2 rounded hover:bg-green-800">👤 Mon Profil</a>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
              <h2 className="text-xl font-bold">Portail Partenaire CompAssur225</h2>
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
