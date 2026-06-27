import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Lock, Eye, EyeOff, Loader2, AlertCircle, X, Mail } from 'lucide-react';
import type { Profile } from '../lib/supabase';

interface AdminConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function AdminConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: AdminConfirmModalProps) {
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    setCurrentProfile(profile as Profile);
  }

  if (!isOpen) return null;

  async function handleConfirm() {
    if (!password) {
      setError('Ingrese la contraseña');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('No hay sesión activa');
      return;
    }

    // Determine which email to verify
    const emailToVerify = currentProfile?.role === 'admin'
      ? session.user.email
      : adminEmail;

    if (!emailToVerify) {
      setError('Ingrese el correo del administrador');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the edge function to verify admin credentials
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email: emailToVerify, password }),
        }
      );

      const result = await response.json();

      if (!result.valid) {
        setError(result.error || 'Credenciales incorrectas');
        setLoading(false);
        return;
      }

      // Credentials are valid and user is admin
      onConfirm();
      onClose();
      setPassword('');
      setAdminEmail('');
      setLoading(false);
    } catch (err) {
      setError('Error al verificar credenciales');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800">{title}</h3>
          </div>
          <button
            onClick={() => {
              onClose();
              setPassword('');
              setAdminEmail('');
              setError(null);
            }}
            className="p-2 text-stone-400 hover:bg-stone-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-stone-600">{message}</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {currentProfile?.role !== 'admin' && (
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">
                Correo del administrador *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@panaderia.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Ingrese las credenciales del administrador para autorizar esta acción
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              {currentProfile?.role === 'admin' ? 'Su contraseña' : 'Contraseña del administrador'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirm();
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                onClose();
                setPassword('');
                setAdminEmail('');
                setError(null);
              }}
              className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
