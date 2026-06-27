import { useEffect, useState } from 'react';
import { supabase, type Profile, type UserRole } from '../lib/supabase';
import { Users, Loader2, Shield, User as UserIcon, Search, Mail, Calendar, AlertCircle } from 'lucide-react';

export default function Employees() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setEmployees(data as Profile[] ?? []);
    }
    setLoading(false);
  }

  async function changeRole(emp: Profile, newRole: UserRole) {
    setUpdating(emp.id);
    setError(null);
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', emp.id);
    if (error) {
      setError(error.message);
    } else {
      await loadEmployees();
    }
    setUpdating(null);
  }

  async function removeEmployee(emp: Profile) {
    if (!confirm(`¿Eliminar al empleado "${emp.full_name}"? Esta acción no se puede deshacer.`)) return;
    setUpdating(emp.id);
    setError(null);
    const { error } = await supabase.from('profiles').delete().eq('id', emp.id);
    if (error) {
      setError('No se pudo eliminar: ' + error.message);
    } else {
      await loadEmployees();
    }
    setUpdating(null);
  }

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const adminCount = employees.filter(e => e.role === 'admin').length;
  const empleadoCount = employees.filter(e => e.role === 'empleado').length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-800">{adminCount}</p>
            <p className="text-sm text-stone-500">Administradores</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
            <UserIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-800">{empleadoCount}</p>
            <p className="text-sm text-stone-500">Empleados</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar empleado..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Employee list */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-stone-400">
            <Users className="w-12 h-12 mb-2 opacity-30" />
            <p>No hay empleados registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filtered.map(emp => (
              <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-stone-50 transition-colors">
                {/* Avatar + name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                    emp.role === 'admin'
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                      : 'bg-stone-200 text-stone-600'
                  }`}>
                    {emp.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{emp.full_name}</p>
                    <div className="flex items-center gap-3 text-xs text-stone-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(emp.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role badge */}
                <div className="sm:w-32">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                    emp.role === 'admin'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {emp.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                    {emp.role === 'admin' ? 'Administrador' : 'Empleado'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {updating === emp.id ? (
                    <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
                  ) : (
                    <>
                      {emp.role === 'empleado' ? (
                        <button
                          onClick={() => changeRole(emp, 'admin')}
                          className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                          Hacer Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => changeRole(emp, 'empleado')}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          Hacer Empleado
                        </button>
                      )}
                      <button
                        onClick={() => removeEmployee(emp)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
        <Mail className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700">
          <p className="font-medium">¿Cómo se registran nuevos empleados?</p>
          <p className="mt-0.5">
            Los nuevos usuarios se registran desde la pantalla de inicio de sesión con su correo y contraseña.
            Automáticamente quedan como <span className="font-medium">Empleado</span>. Desde aquí puedes
            promoverlos a <span className="font-medium">Administrador</span> si lo deseas.
          </p>
        </div>
      </div>
    </div>
  );
}
