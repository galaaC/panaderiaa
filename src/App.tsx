import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import AuthScreen from './components/AuthScreen';
import Layout, { type PageId } from './components/Layout';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Supplies from './components/Supplies';
import ProductionPage from './components/ProductionPage';
import Sales from './components/Sales';
import Reports from './components/Reports';
import Employees from './components/Employees';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<PageId>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'products' && <Products />}
      {page === 'supplies' && <Supplies />}
      {page === 'production' && <ProductionPage />}
      {page === 'sales' && <Sales />}
      {page === 'reports' && <Reports />}
      {page === 'employees' && <Employees />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
