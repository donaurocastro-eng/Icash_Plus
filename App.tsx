import React, { useState } from 'react';
import Layout from './components/Layout';
import AccountsPage from './pages/AccountsPage';
import CategoriesPage from './pages/CategoriesPage';
import { AppRoute } from './types';
import { BarChart3 } from 'lucide-react';

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.ACCOUNTS);

  const renderContent = () => {
    switch (currentRoute) {
      case AppRoute.ACCOUNTS:
        return <AccountsPage />;
      case AppRoute.CATEGORIES:
        return <CategoriesPage />;
      case AppRoute.DASHBOARD:
        return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
             <div className="p-6 bg-slate-100 rounded-full">
                <BarChart3 size={48} />
             </div>
             <h2 className="text-xl font-medium text-slate-600">Dashboard General</h2>
             <p>Panel en construcción. Ve a la sección <span className="text-brand-600 font-bold">Cuentas</span> o <span className="text-brand-600 font-bold">Categorías</span> para empezar.</p>
          </div>
        );
      default:
        return (
           <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
             <h2 className="text-xl font-medium text-slate-600">Próximamente</h2>
             <p>Esta funcionalidad estará disponible en la versión 2.0 de ICASH_PLUS.</p>
          </div>
        );
    }
  };

  return (
    <Layout currentRoute={currentRoute} onNavigate={setCurrentRoute}>
      {renderContent()}
    </Layout>
  );
};

export default App;