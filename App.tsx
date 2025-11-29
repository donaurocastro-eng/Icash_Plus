
import React, { useState } from 'react';
import Layout from './components/Layout';
import AccountsPage from './pages/AccountsPage';
import CategoriesPage from './pages/CategoriesPage';
import TransactionsPage from './pages/TransactionsPage';
import RealEstatePage from './pages/RealEstatePage';
import LoansPage from './pages/LoansPage';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import AssistantPage from './pages/AssistantPage';
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
      case AppRoute.LOANS:
        return <LoansPage />;
      case AppRoute.REPORTS:
        return <ReportsPage />;
      case AppRoute.AI_ASSISTANT:
        return <AssistantPage />;
      case AppRoute.SETTINGS:
        return <SettingsPage />;
      case AppRoute.DASHBOARD:
        return <DashboardPage />;
      default:
        return (
           <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
             <h2 className="text-xl font-medium text-slate-600">Próximamente</h2>
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
