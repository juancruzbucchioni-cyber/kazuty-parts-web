import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import FeaturedProducts from '../components/FeaturedProducts';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Product, Testimonial } from '../types/supabase';
import ProductCard from '../components/ProductCard';
import { useCartStore } from '../store/cartStore';

const DEFAULT_REVIEW_AVATAR = '/branding/avatar-placeholder.svg';

type ClientReview = {
  nombre: string;
  mensaje: string;
  foto: string;
};

export default function Home() {
  const [clientReviews, setClientReviews] = useState<ClientReview[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    async function loadReviews() {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('testimonials')
          .select('*')
          .eq('activo', true)
          .order('orden', { ascending: true })
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const normalized = (data as Testimonial[]).map((item) => ({
            nombre: item.nombre,
            mensaje: item.mensaje,
            foto: item.foto_url || DEFAULT_REVIEW_AVATAR,
          }));
          setClientReviews(normalized);
          return;
        }
      }

      try {
        const response = await fetch('/testimonials.json');
        if (!response.ok) throw new Error('No se pudo cargar testimonials.json');
        const data = await response.json();
        if (Array.isArray(data)) {
          setClientReviews(data);
          return;
        }
      } catch (error) {
        console.error('Error cargando reseñas de clientes:', error);
      }

      setClientReviews([
        {
          nombre: 'Cliente Elvio Monteiro',
          mensaje: 'Excelente atencion, me ayudaron a elegir justo lo que necesitaba.',
          foto: DEFAULT_REVIEW_AVATAR,
        },
      ]);
    }

    loadReviews();
  }, []);

  useEffect(() => {
    async function loadCatalog() {
      if (!isSupabaseConfigured) return;

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!productsError && productsData) {
        setAllProducts(productsData as Product[]);
      }

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('name')
        .eq('activo', true)
        .order('orden', { ascending: true })
        .order('created_at', { ascending: false });

      if (!categoriesError && categoriesData) {
        setAllCategories(categoriesData.map((c: { name: string }) => c.name));
      }
    }

    loadCatalog();
  }, []);

  const groupedProducts = useMemo(() => {
    const group = new Map<string, Product[]>();
    allProducts.forEach((product) => {
      const list = group.get(product.category) || [];
      list.push(product);
      group.set(product.category, list);
    });

    const orderedCategories = allCategories.length > 0
      ? allCategories
      : Array.from(group.keys());

    return orderedCategories
      .map((category) => ({
        category,
        products: [...(group.get(category) || [])].sort((a, b) =>
          a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        ),
      }))
      .filter((block) => block.products.length > 0);
  }, [allProducts, allCategories]);

  const categoriesWithProducts = groupedProducts.map((block) => block.category);

  return (
    <section className="container py-10">
      <div className="relative min-h-[58vh] w-full rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_18px_60px_rgba(255,255,255,0.06)]">
        <div className="relative z-10 min-h-[72vh] flex flex-col items-center justify-start pt-20 md:pt-16 text-center px-4">
          <h1 className="font-brand text-4xl font-black text-white md:text-6xl">
            ELVIO <span className="text-white">MONTEIRO</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg font-medium text-gray-200 md:text-xl">
            Repuestos, accesorios y atención directa para tu moto.
          </p>
          <div className="flex gap-3 mt-6">
            <Link to="/products" className="rounded-md bg-white px-6 py-2 font-bold text-black transition-colors hover:bg-gray-200">Ver productos</Link>
            <Link to="/categories" className="rounded-md border border-white/40 px-6 py-2 font-bold text-white transition-colors hover:bg-white/10">Categorias</Link>
          </div>

          <div className="mt-8 w-full max-w-5xl overflow-hidden rounded-md border border-white/10 bg-black">
            <div className="reviews-ticker-track flex items-center py-3">
              {[...clientReviews, ...clientReviews].map((review, index) => (
                <div key={`${review.nombre}-${index}`} className="mx-3 shrink-0 rounded-md border border-white/10 bg-zinc-950 px-4 py-2 shadow-sm">
                  <div className="flex items-center gap-3">
                    <img
                      src={review.foto || DEFAULT_REVIEW_AVATAR}
                      alt={review.nombre}
                      className="h-10 w-10 rounded-full border border-white/20 object-cover"
                    />
                    <p className="text-sm text-gray-200 md:text-base">
                      <span className="font-bold text-white">{review.nombre}:</span> {review.mensaje}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-5 text-center shadow-sm">
              <p className="text-3xl font-black text-white">+20.000</p>
              <p className="mt-1 text-sm font-bold uppercase tracking-wide text-gray-200">Ventas enviadas</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-5 text-center shadow-sm">
              <p className="text-xl text-white">★★★★★</p>
              <p className="text-3xl font-black text-white">+20.000</p>
              <p className="mt-1 text-sm font-bold uppercase tracking-wide text-gray-200">Clientes satisfechos</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-5 text-center shadow-sm">
              <p className="text-3xl">📦</p>
              <p className="text-2xl font-black text-white">Envíos</p>
              <p className="mt-1 text-sm font-bold uppercase tracking-wide text-gray-200">A todo Argentina</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <FeaturedProducts />
      </div>

      <div className="mt-16 w-full">
        <h2 className="font-brand mb-8 text-3xl font-bold text-white">Todas las categorias</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(categoriesWithProducts.length > 0
            ? categoriesWithProducts
            : ['Accesorios', 'Escapes', 'Plasticos', 'Transmision', 'Electronica', 'Frenos', 'Iluminacion', 'Indumentaria']
          ).map((categoria) => (
            <Link
              key={categoria}
              to={`/products?category=${encodeURIComponent(categoria)}`}
              className="font-brand rounded-md border border-white/20 bg-zinc-950 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-white hover:text-black"
            >
              {categoria}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-16 w-full">
        <h2 className="font-brand mb-8 text-3xl font-bold text-white">Productos por categoria</h2>
        <div className="space-y-10">
          {groupedProducts.map((block) => (
            <div key={block.category}>
              <h3 className="font-brand mb-4 text-xl text-white md:text-2xl">{block.category}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {block.products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="block h-full"
                  >
                    <ProductCard product={product} onAddToCart={addItem} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 w-full">
        <div className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-zinc-950 p-6 text-center shadow-sm md:p-8">
          <p className="text-2xl font-black tracking-wide text-white">@elvio.monteiro_1_2_3</p>
          <p className="mt-3 text-gray-200">Seguinos para novedades, ingresos y promos.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://www.instagram.com/elvio.monteiro_1_2_3?igsh=MW5qZnRiZ3hibWYwMg=="
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-white/40 px-6 py-3 font-bold text-white transition-colors hover:bg-white/10"
            >
              Ir a Instagram
            </a>
            <a
              href="https://wa.me/5493755745255?text=Hola%20Elvio%20Monteiro%2C%20quiero%20hacer%20una%20consulta."
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-white px-6 py-3 font-bold text-black transition-colors hover:bg-gray-200"
            >
              Enviar mensaje directo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

