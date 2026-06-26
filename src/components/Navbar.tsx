import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Instagram, LogOut, Search, ShoppingCart, User } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

const INSTAGRAM_URL = 'https://www.instagram.com/elvio.monteiro_1_2_3?igsh=MW5qZnRiZ3hibWYwMg==';
const WHATSAPP_URL = 'https://wa.me/5493755745255?text=Hola%20Elvio%20Monteiro%2C%20quiero%20consultar%20por%20productos.';

export default function Navbar() {
  const cartItems = useCartStore((state) => state.items);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthStore();
  const displayName = profile?.username || user?.email?.split('@')[0] || 'Mi cuenta';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 90);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 text-white shadow-[0_8px_28px_rgba(255,255,255,0.04)] backdrop-blur-md">
      <div className={`container flex flex-col gap-4 transition-all duration-300 lg:flex-row lg:items-center lg:justify-between ${isScrolled ? 'min-h-16 py-3' : 'min-h-24 py-4'}`}>
        {!isScrolled && (
          <Link to="/" className="flex items-center">
            <div className="rounded-lg bg-white/95 px-3 py-2 shadow-sm">
              <img
                src="/branding/logo-elvio.png"
                alt="Elvio Monteiro"
                className="h-14 w-auto object-contain md:h-16"
              />
            </div>
          </Link>
        )}

        <form onSubmit={handleSearch} className={`order-3 w-full lg:order-none ${isScrolled ? 'lg:max-w-4xl' : 'lg:max-w-2xl'}`}>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="¿Qué estás buscando?"
              className="h-12 w-full rounded-xl border border-white/60 bg-black px-5 pr-12 text-base text-white placeholder:text-white/75 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <Search className="absolute right-4 top-1/2 h-7 w-7 -translate-y-1/2 text-white" />
          </div>
        </form>

        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 text-sm text-white hover:text-gray-300">
            <Instagram className="h-7 w-7" />
            <span>Instagram</span>
          </a>
          {!isScrolled && user ? (
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex flex-col items-center gap-1 text-sm text-white hover:text-gray-300">
                <User className="h-7 w-7" />
                <span>{displayName}</span>
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-3 w-48 rounded-md border border-white/15 bg-black py-1 text-white shadow-lg">
                  <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-white/10" onClick={() => setIsMenuOpen(false)}>
                    Perfil
                  </Link>
                  <button onClick={handleSignOut} className="flex w-full items-center px-4 py-2 text-left text-sm hover:bg-white/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : !isScrolled ? (
            <Link to="/auth" className="flex flex-col items-center gap-1 text-sm text-white hover:text-gray-300">
              <User className="h-7 w-7" />
              <span>Mi cuenta</span>
            </Link>
          ) : null}
          {!isScrolled && (
            <Link to="/cart" className="relative flex flex-col items-center gap-1 text-sm text-white hover:text-gray-300">
              <ShoppingCart className="h-8 w-8" />
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black text-black">
                  {itemCount}
                </span>
              )}
              <span>Mi carrito</span>
            </Link>
          )}
        </div>
      </div>

      {!isScrolled && (
        <div className="border-t border-white/10">
          <div className="container flex flex-wrap items-center justify-center gap-6 py-4 text-base font-medium tracking-wide md:gap-10 md:text-lg">
            <Link to="/" className="hover:text-gray-300">Inicio</Link>
            <Link to="/products" className="hover:text-gray-300">Productos</Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="hover:text-gray-300">Contacto</a>
          </div>
        </div>
      )}
    </nav>
  );
}
