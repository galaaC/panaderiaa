import { useEffect, useState } from 'react';
import { supabase, type Product, type Supply, type Production, type Recipe } from '../lib/supabase';
import { Plus, Trash2, Factory, X, Loader2, AlertCircle, ChefHat, FlaskConical, Calendar } from 'lucide-react';

type Tab = 'production' | 'recipes';

export default function ProductionPage() {
  const [tab, setTab] = useState<Tab>('production');
  const [productions, setProductions] = useState<Production[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const [showProdModal, setShowProdModal] = useState(false);
  const [prodForm, setProdForm] = useState({ product_id: '', quantity: '', date: new Date().toISOString().split('T')[0] });
  const [savingProd, setSavingProd] = useState(false);
  const [prodError, setProdError] = useState<string | null>(null);

  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeForm, setRecipeForm] = useState({ product_id: '', supply_id: '', quantity_per_unit: '' });
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [prodRes, prodRes2, supRes, recRes] = await Promise.all([
      supabase.from('productions').select('*, product:products(*)').order('date', { ascending: false }).limit(50),
      supabase.from('products').select('*').order('name'),
      supabase.from('supplies').select('*').order('name'),
      supabase.from('recipes').select('*, product:products(*), supply:supplies(*)').order('created_at', { ascending: false }),
    ]);
    setProductions(prodRes.data as Production[] ?? []);
    setProducts(prodRes2.data as Product[] ?? []);
    setSupplies(supRes.data as Supply[] ?? []);
    setRecipes(recRes.data as Recipe[] ?? []);
    setLoading(false);
  }

  async function handleProdSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProd(true);
    setProdError(null);

    const payload = {
      product_id: prodForm.product_id,
      quantity: Number(prodForm.quantity),
      date: prodForm.date,
    };

    if (!payload.product_id || !payload.quantity || payload.quantity <= 0) {
      setProdError('Seleccione un producto y una cantidad válida');
      setSavingProd(false);
      return;
    }

    const { error } = await supabase.from('productions').insert(payload);
    if (error) {
      setProdError(error.message);
    } else {
      setShowProdModal(false);
      setProdForm({ product_id: '', quantity: '', date: new Date().toISOString().split('T')[0] });
      await loadAll();
    }
    setSavingProd(false);
  }

  async function handleDeleteProduction(p: Production) {
    if (!confirm('¿Eliminar este registro de producción? Se revertirán los cambios de inventario.')) return;
    const { error } = await supabase.from('productions').delete().eq('id', p.id);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      await loadAll();
    }
  }

  async function handleRecipeSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingRecipe(true);
    setRecipeError(null);

    const payload = {
      product_id: recipeForm.product_id,
      supply_id: recipeForm.supply_id,
      quantity_per_unit: Number(recipeForm.quantity_per_unit),
    };

    if (!payload.product_id || !payload.supply_id || !payload.quantity_per_unit || payload.quantity_per_unit <= 0) {
      setRecipeError('Todos los campos son obligatorios');
      setSavingRecipe(false);
      return;
    }

    const { error } = await supabase.from('recipes').insert(payload);
    if (error) {
      setRecipeError(error.message);
    } else {
      setShowRecipeModal(false);
      setRecipeForm({ product_id: '', supply_id: '', quantity_per_unit: '' });
      await loadAll();
    }
    setSavingRecipe(false);
  }

  async function handleDeleteRecipe(r: Recipe) {
    if (!confirm('¿Eliminar esta receta?')) return;
    const { error } = await supabase.from('recipes').delete().eq('id', r.id);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      await loadAll();
    }
  }

  // Group productions by date
  const groupedProductions = productions.reduce((acc, p) => {
    const date = p.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(p);
    return acc;
  }, {} as Record<string, Production[]>);

  const sortedDates = Object.keys(groupedProductions).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white border border-stone-200 rounded-xl w-fit">
        <button
          onClick={() => setTab('production')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'production' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <Factory className="w-4 h-4" />
          Producción
        </button>
        <button
          onClick={() => setTab('recipes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'recipes' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          Recetas
        </button>
      </div>

      {tab === 'production' ? (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => { setProdError(null); setShowProdModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-5 h-5" />
              Registrar Producción
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-stone-400 bg-white rounded-2xl border border-stone-200">
              <Factory className="w-12 h-12 mb-2 opacity-30" />
              <p>No hay registros de producción</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDates.map(date => (
                <div key={date} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 bg-stone-50 border-b border-stone-200">
                    <Calendar className="w-4 h-4 text-stone-400" />
                    <span className="text-sm font-semibold text-stone-700">
                      {new Date(date + 'T00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <span className="ml-auto text-xs text-stone-400">
                      Total: {groupedProductions[date].reduce((s, p) => s + Number(p.quantity), 0)} unidades
                    </span>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {groupedProductions[date].map(p => (
                      <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                            <ChefHat className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-800">{p.product?.name ?? 'Producto eliminado'}</p>
                            <p className="text-xs text-stone-400">{p.product?.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-stone-700">{p.quantity} unidades</span>
                          <button
                            onClick={() => handleDeleteProduction(p)}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => { setRecipeError(null); setShowRecipeModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-5 h-5" />
              Nueva Receta
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : recipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-stone-400 bg-white rounded-2xl border border-stone-200">
              <FlaskConical className="w-12 h-12 mb-2 opacity-30" />
              <p>No hay recetas registradas</p>
              <p className="text-xs mt-1">Las recetas definen qué insumos se consumen al producir cada producto</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Producto</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Insumo</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Cantidad por unidad</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {recipes.map(r => (
                      <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-stone-800">{r.product?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-stone-600">{r.supply?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-right text-stone-700">
                          {r.quantity_per_unit} {r.supply?.unit ?? ''}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteRecipe(r)}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Production Modal */}
      {showProdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h3 className="text-lg font-semibold text-stone-800">Registrar Producción</h3>
              <button onClick={() => setShowProdModal(false)} className="p-2 text-stone-400 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleProdSave} className="p-6 space-y-4">
              {prodError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {prodError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">Producto *</label>
                <select
                  value={prodForm.product_id}
                  onChange={(e) => setProdForm({ ...prodForm, product_id: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                >
                  <option value="">Seleccione un producto</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    value={prodForm.quantity}
                    onChange={(e) => setProdForm({ ...prodForm, quantity: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Fecha</label>
                  <input
                    type="date"
                    value={prodForm.date}
                    onChange={(e) => setProdForm({ ...prodForm, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                Se descontarán automáticamente los insumos según la receta del producto.
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProdModal(false)} className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={savingProd} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                  {savingProd && <Loader2 className="w-4 h-4 animate-spin" />}
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {showRecipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h3 className="text-lg font-semibold text-stone-800">Nueva Receta</h3>
              <button onClick={() => setShowRecipeModal(false)} className="p-2 text-stone-400 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecipeSave} className="p-6 space-y-4">
              {recipeError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {recipeError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">Producto *</label>
                <select
                  value={recipeForm.product_id}
                  onChange={(e) => setRecipeForm({ ...recipeForm, product_id: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                >
                  <option value="">Seleccione un producto</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">Insumo *</label>
                <select
                  value={recipeForm.supply_id}
                  onChange={(e) => setRecipeForm({ ...recipeForm, supply_id: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                >
                  <option value="">Seleccione un insumo</option>
                  {supplies.map(s => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">Cantidad por unidad *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={recipeForm.quantity_per_unit}
                  onChange={(e) => setRecipeForm({ ...recipeForm, quantity_per_unit: e.target.value })}
                  required
                  placeholder="0.2"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-stone-400 mt-1">Ej: 0.2 kg de harina por cada pan</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRecipeModal(false)} className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={savingRecipe} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                  {savingRecipe && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
