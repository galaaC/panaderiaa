import { useEffect, useState } from 'react';
import { supabase, type Supply } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Plus, Pencil, Trash2, Search, Wheat, X, Loader2, AlertCircle, AlertTriangle, Shield } from 'lucide-react';
import AdminConfirmModal from './AdminConfirmModal';

const UNITS = ['kg', 'litros', 'unidades', 'gramos', 'bolsas'];

export default function Supplies() {
  const { profile } = useAuth();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supply | null>(null);
  const [form, setForm] = useState({
    name: '', quantity: '', unit: 'kg', min_stock: '', purchase_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [supplyToDelete, setSupplyToDelete] = useState<Supply | null>(null);

  useEffect(() => { loadSupplies(); }, []);

  async function loadSupplies() {
    setLoading(true);
    const { data } = await supabase.from('supplies').select('*').order('name');
    setSupplies(data as Supply[] ?? []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', quantity: '', unit: 'kg', min_stock: '', purchase_date: '' });
    setError(null);
    setShowModal(true);
  }

  function openEdit(s: Supply) {
    setEditing(s);
    setForm({
      name: s.name,
      quantity: String(s.quantity),
      unit: s.unit,
      min_stock: String(s.min_stock),
      purchase_date: s.purchase_date ?? '',
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      quantity: Number(form.quantity) || 0,
      unit: form.unit,
      min_stock: Number(form.min_stock) || 0,
      purchase_date: form.purchase_date || null,
    };

    if (!payload.name) {
      setError('El nombre es obligatorio');
      setSaving(false);
      return;
    }

    if (editing) {
      const { error } = await supabase.from('supplies').update(payload).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('supplies').insert(payload);
      if (error) setError(error.message);
    }

    if (!error) {
      setShowModal(false);
      await loadSupplies();
    }
    setSaving(false);
  }

  function requestDelete(s: Supply) {
    if (profile?.role === 'admin') {
      if (confirm(`¿Eliminar el insumo "${s.name}"?`)) {
        performDelete(s);
      }
    } else {
      setSupplyToDelete(s);
      setShowAdminModal(true);
    }
  }

  async function performDelete(s: Supply) {
    const { error } = await supabase.from('supplies').delete().eq('id', s.id);
    if (error) {
      alert('No se puede eliminar: ' + error.message);
    } else {
      await loadSupplies();
    }
    setSupplyToDelete(null);
    setShowAdminModal(false);
  }

  function handleAdminConfirm() {
    if (supplyToDelete) {
      performDelete(supplyToDelete);
    }
  }

  const filtered = supplies.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = supplies.filter(s => Number(s.quantity) <= Number(s.min_stock));

  return (
    <div className="space-y-4">
      {/* Low stock banner */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">{lowStock.length}</span> insumo(s) con stock bajo o agotado
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar insumo..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-md shadow-green-500/20 hover:shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Insumo
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-stone-400">
            <Wheat className="w-12 h-12 mb-2 opacity-30" />
            <p>No hay insumos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Nombre</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Cantidad</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden sm:table-cell">Stock Mín.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden md:table-cell">Fecha Compra</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(s => {
                  const isLow = Number(s.quantity) <= Number(s.min_stock);
                  return (
                    <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-stone-800">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-stone-700">
                        {s.quantity} {s.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-stone-500 hidden sm:table-cell">
                        {s.min_stock} {s.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-500 hidden md:table-cell">
                        {s.purchase_date
                          ? new Date(s.purchase_date).toLocaleDateString('es-ES')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Bajo
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => requestDelete(s)}
                            className={`p-2 text-stone-400 hover:bg-red-50 rounded-lg transition-colors ${
                              profile?.role === 'admin' ? 'hover:text-red-600' : 'hover:text-red-500'
                            }`}
                            title={profile?.role === 'admin' ? 'Eliminar insumo' : 'Requiere autorización de administrador'}
                          >
                            {profile?.role === 'admin' ? (
                              <Trash2 className="w-4 h-4" />
                            ) : (
                              <div className="relative">
                                <Trash2 className="w-4 h-4" />
                                <Shield className="w-2.5 h-2.5 text-amber-500 absolute -top-1 -right-1 bg-white rounded-full" />
                              </div>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h3 className="text-lg font-semibold text-stone-800">
                {editing ? 'Editar Insumo' : 'Nuevo Insumo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-stone-400 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Harina de trigo"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Cantidad</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Unidad</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Stock mínimo</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.min_stock}
                    onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Fecha de compra</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Confirmation Modal for Delete */}
      <AdminConfirmModal
        isOpen={showAdminModal}
        onClose={() => {
          setShowAdminModal(false);
          setSupplyToDelete(null);
        }}
        onConfirm={handleAdminConfirm}
        title="Autorización Requerida"
        message={`Para eliminar el insumo "${supplyToDelete?.name}" se requiere autorización de un administrador. Ingrese las credenciales de administrador.`}
      />
    </div>
  );
}
