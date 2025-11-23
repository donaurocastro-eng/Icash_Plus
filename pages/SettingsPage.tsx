import React, { useState, useEffect } from 'react';
import { Save, Server, CheckCircle, XCircle, AlertTriangle, Database } from 'lucide-react';
import { db } from '../services/db';

const SettingsPage: React.FC = () => {
  const [dbUrl, setDbUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load existing URL
    const current = db.getUrl();
    if (current) setDbUrl(current);
  }, []);

  const handleTest = async () => {
    setStatus('testing');
    setMessage('Intentando conectar...');
    
    // Auto-clean the input (handles psql prefix and quotes)
    const cleaned = db.cleanUrl(dbUrl);
    setDbUrl(cleaned); // Update UI to show the clean URL

    const oldUrl = db.getUrl();
    db.setUrl(cleaned); // Save clean URL temporarily for testing

    const success = await db.testConnection();
    
    if (success) {
      setStatus('success');
      setMessage('¡Conexión exitosa! La base de datos Neon está lista.');
      window.dispatchEvent(new Event('db-config-changed'));
    } else {
      setStatus('error');
      setMessage('No se pudo conectar. Verifica la URL y tu conexión a internet.');
      // Keep the input as is so user can correct it, even if test failed
    }
  };

  const handleSave = () => {
    const cleaned = db.cleanUrl(dbUrl);
    setDbUrl(cleaned);
    db.setUrl(cleaned);
    
    window.dispatchEvent(new Event('db-config-changed'));
    setStatus('idle');
    setMessage('Configuración guardada.');
    alert('Configuración guardada correctamente.');
  };

  const handleDisconnect = () => {
    if(window.confirm('¿Desconectar la base de datos? Volverás al modo Local.')) {
      setDbUrl('');
      db.setUrl('');
      window.dispatchEvent(new Event('db-config-changed'));
      setStatus('idle');
      setMessage('Desconectado. Usando almacenamiento local.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-500">Administra la conexión a tu base de datos y preferencias.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Database size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Base de Datos (Neon Postgres)</h2>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <AlertTriangle className="shrink-0 text-amber-500 mt-0.5" size={16} />
              <p>
                Ingresa tu cadena de conexión de Neon (Connection String). 
                <br/>
                La app limpiará automáticamente el prefijo <code>psql</code> si lo copias por error.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">URL de Conexión</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-mono text-sm"
                placeholder="postgres://..."
                value={dbUrl}
                onChange={(e) => setDbUrl(e.target.value)}
              />
            </div>

            {/* Status Feedback */}
            {status !== 'idle' && (
              <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                status === 'testing' ? 'bg-blue-50 text-blue-700' :
                status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                'bg-red-50 text-red-700'
              }`}>
                {status === 'testing' && <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>}
                {status === 'success' && <CheckCircle size={16} />}
                {status === 'error' && <XCircle size={16} />}
                <span>{message}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 flex items-center justify-between">
           <button 
            onClick={handleDisconnect}
            className="text-red-600 text-sm font-medium hover:underline"
          >
            Desconectar / Usar Modo Local
          </button>

          <div className="flex space-x-3">
            <button 
              onClick={handleTest}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Probar Conexión
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-sm transition-colors"
            >
              <Save size={18} />
              <span>Guardar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;