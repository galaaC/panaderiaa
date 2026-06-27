import { useEffect, useState } from 'react';
import { supabase, type Product, type Category } from '../lib/supabase';
import { Plus, Pencil, Trash2, Search, Package, X, Loader2, AlertCircle, ImagePlus, ImageIcon } from 'lucide-react';

const UNITS = ['unidad', 'kg', 'litro', 'docena', 'bolsa'];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    code: '', name: '', category_id: '', quantity: '', price: '', unit: 'unidad',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('name');
    setProducts(data as Product[] ?? []);
    setLoading(false);
  }

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data as Category[] ?? []);
  }

  function openCreate() {
    setEditing(null);
    setForm({ code: '', name: '', category_id: '', quantity: '', price: '', unit: 'unidad' });
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      code: p.code, name: p.name,
      category_id: p.category_id ?? '',
      quantity: String(p.quantity), price: String(p.price), unit: p.unit,
    });
    setImageFile(null);
    setImagePreview(p.image_url);
    setError(null);
    setShowModal(true);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  }

  async function uploadImage(productId: string, file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${productId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('products')
      .upload(fileName, file, { upsert: true });
    if (upErr) {
      setError('Error al subir imagen: ' + upErr.message);
      return null;
    }
    const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      category_id: form.category_id || null,
      quantity: Number(form.quantity) || 0,
      price: Number(form.price) || 0,
      unit: form.unit,
    };

    if (!payload.code || !payload.name) {
      setError('Código y nombre son obligatorios');
      setSaving(false);
      return;
    }

    let savedId = editing?.id ?? null;

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select().single();
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
      savedId = data.id;
    }

    // Upload image if a new file was selected
    if (imageFile && savedId) {
      setUploading(true);
      const publicUrl = await uploadImage(savedId, imageFile);
      setUploading(false);
      if (publicUrl) {
        const { error: imgErr } = await supabase
          .from('products')
          .update({ image_url: publicUrl })
          .eq('id', savedId);
        if (imgErr) {
          setError('Producto guardado pero error al guardar imagen: ' + imgErr.message);
        }
      }
    }

    if (!error) {
      setShowModal(false);
      await loadProducts();
    }
    setSaving(false);
  }

  async function handleDelete(p: Product) {
    if (!confirm(`¿Eliminar el producto "${p.name}"?`)) return;
    // Delete image from storage if exists
    if (p.image_url) {
      const path = p.image_url.split('/products/').pop();
      if (path) {
        await supabase.storage.from('products').remove([path]);
      }
    }
    const { error } = await supabase.from('products').delete().eq('id', p.id);
    if (error) {
      alert('No se puede eliminar: ' + error.message);
    } else {
      await loadProducts();
    }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-stone-400">
            <Package className="w-12 h-12 mb-2 opacity-30" />
            <p>No hay productos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Imagen</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Código</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden sm:table-cell">Categoría</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Cantidad</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Precio</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover border border-stone-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-stone-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-stone-600">{p.code}</td>
                    <td className="px-4 py-3 text-sm font-medium text-stone-800">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-stone-500 hidden sm:table-cell">
                      {p.category ? (
                        <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
                          {p.category.name}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`font-medium ${Number(p.quantity) < 10 ? 'text-red-600' : 'text-stone-700'}`}>
                        {p.quantity} {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-stone-700">
                      ${Number(p.price).toLocaleString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-stone-800">
                {editing ? 'Editar Producto' : 'Nuevo Producto'}
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

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">Imagen del producto</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-stone-300 bg-stone-50 flex items-center justify-center flex-shrink-0">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          className="absolute top-1 right-1 w-6 h-6 bg-stone-900/60 text-white rounded-full flex items-center justify-center hover:bg-stone-900/80 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-8 h-8 text-stone-300" />
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-100 transition-colors">
                      <ImagePlus className="w-4 h-4" />
                      {imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-stone-400 mt-1.5">JPG, PNG o WebP · Máximo 5MB</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Código *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                    placeholder="P001"
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Categoría</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Pan francés"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Cantidad</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Precio</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Unidad</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
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
                  disabled={saving || uploading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                >
                  {(saving || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploading ? 'Subiendo...' : editing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
