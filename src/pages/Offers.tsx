import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { formatProductPrice } from '../lib/currency';
import { Offer, Product } from '../types/supabase';

const offerLabels = ['Oferta semanal', 'Oferta del mes', 'Especial dia del padre'];
const salePercents = ['20% OFF', '10% OFF', 'SALE'];

type VisibleOffer = {
  id: string;
  product: Product;
  title: string;
  badge: string;
  price: number;
};

export default function Offers() {
  const [offers, setOffers] = useState<VisibleOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOffers() {
      if (!isSupabaseConfigured) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select('*, products(*)')
        .eq('activo', true)
        .order('orden', { ascending: true })
        .order('created_at', { ascending: false });

      if (!offerError && offerData && offerData.length > 0) {
        setOffers(((offerData || []) as Offer[])
          .filter((offer) => offer.products)
          .map((offer) => ({
            id: offer.id,
            product: offer.products as Product,
            title: offer.title || 'Oferta especial',
            badge: offer.badge || 'SALE',
            price: Number(offer.offer_price || offer.products?.price || 0),
          })));
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('price', 0)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error cargando ofertas:', error);
      } else {
        setOffers(((data || []) as Product[]).map((product, index) => ({
          id: product.id,
          product,
          title: offerLabels[index] || 'Oferta especial',
          badge: salePercents[index] || 'SALE',
          price: product.price,
        })));
      }

      setLoading(false);
    }

    loadOffers();
  }, []);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-12 rounded-full border border-white bg-white px-6 py-3 text-center text-sm font-black uppercase tracking-[0.24em] text-black shadow-[0_0_22px_rgba(255,255,255,0.16)]">
        Ofertas
      </div>

      {!isSupabaseConfigured ? (
        <div className="rounded-md border border-white/35 bg-white/10 p-4 text-white backdrop-blur-md">
          Configura Supabase para cargar productos reales en ofertas.
        </div>
      ) : null}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
        </div>
      ) : offers.length > 0 ? (
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {offers.map((offer) => (
            <Link
              key={offer.id}
              to={`/products/${offer.product.id}`}
              className="offer-card group block h-full overflow-visible"
            >
              <div className="review-ribbon-card mx-auto mb-4 flex min-h-16 w-52 items-center justify-center px-4 py-3 text-center">
                <p className="text-sm font-black text-white">{offer.title}</p>
              </div>

              <article className="product-sale-card relative flex min-h-[470px] flex-col overflow-hidden rounded-[28px]">
                <span className="absolute left-4 top-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-center text-[11px] font-black uppercase leading-tight text-white shadow-[0_0_18px_rgba(220,38,38,0.45)]">
                  {offer.badge}
                </span>
                <span className="absolute right-4 top-4 z-20 rounded-full border border-white bg-black/80 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                  Sale
                </span>

                <div className="flex h-72 items-center justify-center border-b border-white/20 bg-white/75 p-4">
                  <img
                    src={offer.product.image_url}
                    alt={offer.product.name}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="flex flex-1 flex-col p-5 text-center">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-white/75">
                    {offer.product.category}
                  </p>
                  <h2 className="min-h-16 text-xl font-bold leading-tight text-white">
                    {offer.product.name}
                  </h2>
                  <p className="mt-3 line-clamp-2 text-sm text-white/70">
                    {offer.product.description}
                  </p>
                  <div className="mt-auto pt-6">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">
                      Precio oferta
                    </p>
                    <p className="mt-2 text-3xl font-black text-red-500">
                      {formatProductPrice(Math.round(offer.price))}
                    </p>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-white/25 bg-white/10 p-8 text-center text-white backdrop-blur-md">
          No hay productos cargados para mostrar ofertas.
        </div>
      )}
    </section>
  );
}
