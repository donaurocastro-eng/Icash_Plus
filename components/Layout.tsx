import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowRightLeft, 
  Settings, 
  LogOut,
  Menu,
  X,
  Tag,
  Building,
  Cloud,
  HardDrive,
  PieChart 
} from 'lucide-react';
import { AppRoute } from '../types';
import { db } from '../services/db';

interface LayoutProps {
  children: React.ReactNode;
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentRoute, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    const checkStatus = () => setDbConnected(db.isConfigured());
    checkStatus();
    window.addEventListener('storage', checkStatus);
    window.addEventListener('db-config-changed', checkStatus);
    return () => {
      window.removeEventListener('storage', checkStatus);
      window.removeEventListener('db-config-changed', checkStatus);
    };
  }, [currentRoute]);

  const NavItem = ({ route, icon: Icon, label }: { route: AppRoute; icon: any; label: string }) => {
    const isActive = currentRoute === route;
    return (
      <button
        onClick={() => {
          onNavigate(route);
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isActive 
            ? 'bg-brand-600 text-white shadow-md' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center mr-3 shadow-sm">
              <span className="text-white font-bold text-lg">$</span>
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">ICASH<span className="text-brand-600">_PLUS</span></span>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            <NavItem route={AppRoute.DASHBOARD} icon={LayoutDashboard} label="Panel General" />
            <NavItem route={AppRoute.ACCOUNTS} icon={Wallet} label="Cuentas Bancarias" />
            <NavItem route={AppRoute.CATEGORIES} icon={Tag} label="Categorías" />
            <NavItem route={AppRoute.TRANSACTIONS} icon={ArrowRightLeft} label="Movimientos" />
            <NavItem route={AppRoute.REAL_ESTATE} icon={Building} label="Bienes Raíces" />
            <NavItem route={AppRoute.REPORTS} icon={PieChart} label="Reportes" />
            <NavItem route={AppRoute.SETTINGS} icon={Settings} label="Configuración" />
          </nav>

          <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium border ${
              dbConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {dbConnected ? <Cloud size={14} /> : <HardDrive size={14} />}
              <span>{dbConnected ? 'Modo: Nube (Neon)' : 'Modo: Local'}</span>
              <span className={`ml-auto w-2 h-2 rounded-full ${dbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
            </div>
            
            <button className="flex items-center space-x-2 text-slate-400 hover:text-red-500 transition-colors px-2 py-1 w-full text-sm">
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
            
            {/* Version Badge */}
            <div className="text-center pt-2">
               <span className="text-[10px] font-mono text-slate-300">v1.2.0</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:hidden shrink-0">
          <span className="font-bold text-slate-800">ICASH_PLUS</span>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto min-h-full pb-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;