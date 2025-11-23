
import React, { useState } from 'react';
import Layout from './components/Layout';
import AccountsPage from './pages/AccountsPage';
import CategoriesPage from './pages/CategoriesPage';
import TransactionsPage from './pages/TransactionsPage';
import RealEstatePage from './pages/RealEstatePage';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/DashboardPage';
import { AppRoute } from './types';

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.DASHBOARD);

  const renderContent = () => {
    switch (currentRoute) {
      case AppRoute.ACCOUNTS:
        return <AccountsPage />;
      case AppRoute.CATEGORIES:
        return <CategoriesPage />;
      case AppRoute.TRANSACTIONS:
        return <TransactionsPage />;
      case AppRoute.REAL_ESTATE:
        return <RealEstatePage />;
      case AppRoute.SETTINGS:
        return <SettingsPage />;
      case AppRoute.DASHBOARD:
        return <DashboardPage />;
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
