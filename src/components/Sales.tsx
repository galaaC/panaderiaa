import { useEffect, useState } from 'react';
import { supabase, type Product, type Sale } from '../lib/supabase';
import { Plus, Trash2, ShoppingCart, Loader2, AlertCircle, Search, Receipt, TrendingUp } from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [, setShowCart] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSales();
    loadProducts();
  }, []);

  async function loadSales() {
    setLoading(true);
    const { data } = await supabase
      .from('sales')
      .select('*, sale_items(*, product:products(*))')
      .order('date', { ascending: false })
      .limit(30);
    setSales(data as Sale[] ?? []);
    setLoading(false);
  }

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts(data as Product[] ?? []);
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        return prev.map(c =>
          c.product.id === product.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateCartQty(productId: string, delta: number) {
    setCart(prev =>
      prev
        .map(c =>
          c.product.id === productId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c
        )
        .filter(c => c.quantity > 0)
    );
  }

  function setCartQty(productId: string, qty: number) {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.product.id !== productId));
    } else {
      setCart(prev => prev.map(c =>
        c.product.id === productId ? { ...c, quantity: qty } : c
      ));
    }
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);

  async function processSale() {
    if (cart.length === 0) return;
    setProcessing(true);
    setError(null);

    try {
      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({ total: cartTotal })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const items = cart.map(c => ({
        sale_id: sale.id,
        product_id: c.product.id,
        quantity: c.quantity,
        price: c.product.price,
        subtotal: c.product.price * c.quantity,
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(items);
      if (itemsError) throw itemsError;

      setSuccess(`Venta registrada: $${cartTotal.toLocaleString('es-ES')}`);
      setCart([]);
      setShowCart(false);
      await loadSales();
      await loadProducts();

      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la venta');
    }
    setProcessing(false);
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 animate-pulse">
          <Receipt className="w-4 h-4" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Product grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto para agregar..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-stone-400 bg-white rounded-2xl border border-stone-200">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-30" />
              <p>No hay productos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={Number(p.quantity) <= 0}
                  className="bg-white rounded-2xl border border-stone-200 p-4 text-left hover:shadow-lg hover:border-amber-300 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 group overflow-hidden"
                >
                  <div className="relative w-full h-24 mb-3 rounded-xl overflow-hidden bg-stone-100">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                        <Plus className="w-8 h-8 text-amber-300" />
                      </div>
                    )}
                    <span className={`absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-lg backdrop-blur-sm ${
                      Number(p.quantity) <= 0 ? 'bg-red-500/90 text-white' :
                      Number(p.quantity) < 10 ? 'bg-amber-500/90 text-white' :
                      'bg-white/90 text-green-600'
                    }`}>
                      {p.quantity} {p.unit}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-stone-800 leading-tight">{p.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{p.code}</p>
                  <p className="text-lg font-bold text-stone-800 mt-2">
                    ${Number(p.price).toLocaleString('es-ES')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart sidebar */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-600">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-white" />
                <h3 className="font-semibold text-white">Carrito</h3>
              </div>
              <span className="text-sm text-white/80 bg-white/20 px-2 py-0.5 rounded-lg">
                {cart.length} items
              </span>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border-b border-red-200 text-red-700 text-sm px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Carrito vacío</p>
                <p className="text-xs mt-1">Toca un producto para agregarlo</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
                  {cart.map(c => (
                    <div key={c.product.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{c.product.name}</p>
                        <p className="text-xs text-stone-400">
                          ${Number(c.product.price).toLocaleString('es-ES')} c/u
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateCartQty(c.product.id, -1)}
                          className="w-7 h-7 flex items-center justify-center bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors font-medium"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={c.quantity}
                          onChange={(e) => setCartQty(c.product.id, Number(e.target.value))}
                          className="w-10 text-center text-sm font-medium text-stone-800 bg-transparent border-none focus:outline-none"
                        />
                        <button
                          onClick={() => updateCartQty(c.product.id, 1)}
                          className="w-7 h-7 flex items-center justify-center bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors font-medium"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(c.product.id)}
                        className="p-1 text-stone-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-4 bg-stone-50 border-t border-stone-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-stone-500">Total</span>
                    <span className="text-2xl font-bold text-stone-800">
                      ${cartTotal.toLocaleString('es-ES')}
                    </span>
                  </div>
                  <button
                    onClick={processSale}
                    disabled={processing}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                  >
                    {processing ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
                    ) : (
                      <><Receipt className="w-5 h-5" /> Procesar Venta</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent sales */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-stone-200">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-stone-800">Ventas Recientes</h3>
        </div>
        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-stone-400">
            <Receipt className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No hay ventas registradas</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
            {sales.map(sale => (
              <div key={sale.id} className="px-5 py-3 hover:bg-stone-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      ${Number(sale.total).toLocaleString('es-ES')}
                    </p>
                    <p className="text-xs text-stone-400">
                      {new Date(sale.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {sale.sale_items?.length ?? 0} producto(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                    {sale.sale_items?.slice(0, 3).map(item => (
                      <span key={item.id} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-lg">
                        {item.product?.name} ×{item.quantity}
                      </span>
                    ))}
                    {(sale.sale_items?.length ?? 0) > 3 && (
                      <span className="text-xs text-stone-400">
                        +{(sale.sale_items?.length ?? 0) - 3} más
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
