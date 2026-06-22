
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowRightLeft, 
  Settings, 
  Menu,
  X,
  Tag,
  Building,
  Cloud,
  HardDrive,
  PieChart,
  Bot,
  Landmark
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
  }, []);

  const NavItem = ({ route, icon: Icon, label }: { route: AppRoute; icon: any; label: string }) => {
    const isActive = currentRoute === route;
    return (
      <button
        onClick={() => {
          onNavigate(route);
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
          isActive 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
        <span className="font-bold text-sm tracking-tight">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden animate-fadeIn" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-[70] w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="h-20 flex items-center px-8 border-b border-slate-100 shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mr-3">
              <span className="text-white font-black text-xl">$</span>
            </div>
            <span className="text-xl font-black text-slate-800 tracking-tighter uppercase">
              ICASH<span className="text-indigo-600">_PLUS</span>
            </span>
          </div>

          <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
            <div className="pb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">Principal</p>
                <NavItem route={AppRoute.DASHBOARD} icon={LayoutDashboard} label="Panel General" />
                <NavItem route={AppRoute.TRANSACTIONS} icon={ArrowRightLeft} label="Movimientos" />
            </div>

            <div className="pb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">Activos y Rentas</p>
                <NavItem route={AppRoute.REAL_ESTATE} icon={Building} label="Bienes Raíces" />
                <NavItem route={AppRoute.ACCOUNTS} icon={Wallet} label="Bancos y Cuentas" />
                <NavItem route={AppRoute.CATEGORIES} icon={Tag} label="Categorización" />
            </div>

            <div className="pb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">Análisis</p>
                <NavItem route={AppRoute.LOANS} icon={Landmark} label="Préstamos" />
                <NavItem route={AppRoute.REPORTS} icon={PieChart} label="Reportes" />
                <NavItem route={AppRoute.AI_ASSISTANT} icon={Bot} label="Asistente AI" />
            </div>
          </nav>

          <div className="p-6 border-t border-slate-100 space-y-4 bg-slate-50/30 shrink-0">
            <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold border ${
              dbConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {dbConnected ? <Cloud size={16} /> : <HardDrive size={16} />}
              <span>{dbConnected ? 'Sincronizado' : 'Modo Offline'}</span>
            </div>
            
            <NavItem route={AppRoute.SETTINGS} icon={Settings} label="Configuración" />
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* Mobile Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:hidden shrink-0 z-50">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-2">
              <span className="text-white font-bold text-sm">$</span>
            </div>
            <span className="font-black text-slate-800 tracking-tight text-xs uppercase">ICASH_PLUS</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Scrolling Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
          <div className="max-w-7xl mx-auto p-4 lg:p-10 min-h-full pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
