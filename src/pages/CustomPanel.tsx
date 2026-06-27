import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Category, Product, ProductImage, Testimonial } from '../types/supabase';
import { formatARS } from '../lib/currency';

type ProductForm = {
  id?: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  image_url: string;
  colors: string;
  extra_images: string;
};

type CategoryForm = {
  id?: string;
  name: string;
  description: string;
  image_url: string;
  activo: boolean;
  orden: string;
};

type TestimonialForm = {
  id?: string;
  nombre: string;
  mensaje: string;
  foto_url: string;
  activo: boolean;
  orden: string;
};

type AdminCategory = Category & {
  activo?: boolean;
  orden?: number;
};

type BulkProductRow = {
  name: string;
  category?: string;
  price?: number;
  stock?: number;
  colors?: string[];
  image_url?: string;
};

type LocalTestimonial = {
  nombre?: string;
  mensaje?: string;
  foto?: string;
  foto_url?: string;
};

const emptyProduct: ProductForm = {
  name: '',
  description: '',
  price: '',
  stock: '1',
  category: '',
  image_url: '',
  colors: 'Negro, Blanco, Gris',
  extra_images: '',
};

const emptyCategory: CategoryForm = {
  name: '',
  description: '',
  image_url: '',
  activo: true,
  orden: '0',
};

const emptyTestimonial: TestimonialForm = {
  nombre: '',
  mensaje: '',
  foto_url: '',
  activo: true,
  orden: '0',
};

const fieldClass = 'w-full rounded-md border border-white/35 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-white focus:outline-none';
const labelClass = 'text-sm font-semibold text-gray-200';
const panelClass = 'rounded-lg border border-white/30 bg-black/60 p-4 backdrop-blur-sm';

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeMatch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function parseMoney(value: string) {
  const cleanValue = value
    .replace(/[^\d.,-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number(cleanValue);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

function parseBulkCatalog(text: string): BulkProductRow[] {
  return text
    .split('\n')
    .map((line) => line.trim().replace(/^[-*•]\s*/, ''))
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+-\s+|[|;\t]/).map((part) => part.trim()).filter(Boolean);

      if (parts.length >= 3) {
        return {
          name: parts[0],
          category: parts[1],
          price: parseMoney(parts[2]),
          stock: parts[3] ? Number(parts[3].replace(/\D/g, '')) : undefined,
          colors: parts[4] ? splitList(parts[4]) : undefined,
          image_url: parts[5],
        };
      }

      const name = line
        .replace(/\b(categoria|cat|precio|stock|colores?|color|imagen|foto|url)\s*[:=]\s*[^|;]+/gi, '')
        .replace(/\$\s*[\d.,]+/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const category = line.match(/\b(?:categoria|cat)\s*[:=]\s*([^|;]+)/i)?.[1]?.trim();
      const price = parseMoney(line.match(/(?:\$|precio\s*[:=]\s*)([\d.,]+)/i)?.[1] || '');
      const stockMatch = line.match(/\bstock\s*[:=]?\s*(\d+)/i);
      const colors = line.match(/\bcolores?\s*[:=]\s*([^|;]+)/i)?.[1];
      const imageUrl = line.match(/\b(?:imagen|foto|url)\s*[:=]\s*(https?:\/\/\S+|\/\S+)/i)?.[1];

      return {
        name,
        category,
        price,
        stock: stockMatch ? Number(stockMatch[1]) : undefined,
        colors: colors ? splitList(colors) : undefined,
        image_url: imageUrl,
      };
    })
    .filter((row) => row.name);
}

function findMatchingProduct(row: BulkProductRow, productsByName: Map<string, Product>) {
  const normalizedName = normalizeMatch(row.name);
  const exactMatch = productsByName.get(normalizedName);

  if (exactMatch) {
    return exactMatch;
  }

  const compactName = normalizedName.replace(/\s/g, '');
  for (const [productName, product] of productsByName) {
    const compactProductName = productName.replace(/\s/g, '');

    if (
      compactProductName === compactName ||
      compactProductName.includes(compactName) ||
      compactName.includes(compactProductName)
    ) {
      return product;
    }
  }

  return undefined;
}

async function loadLocalTestimonials(): Promise<Testimonial[]> {
  try {
    const response = await fetch('/testimonials.json');
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return (data as LocalTestimonial[])
      .filter((item) => item.nombre && item.mensaje)
      .map((item, index) => ({
        id: `local-${index}`,
        nombre: item.nombre || '',
        mensaje: item.mensaje || '',
        foto_url: item.foto_url || item.foto || '',
        activo: true,
        orden: index + 1,
        created_at: new Date(0).toISOString(),
      }));
  } catch (error) {
    console.error('No se pudieron cargar las resenas locales:', error);
    return [];
  }
}

export default function CustomPanel() {
  const { user, profile, loading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'testimonials'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [productImages, setProductImages] = useState<Record<string, ProductImage[]>>({});
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory);
  const [testimonialForm, setTestimonialForm] = useState<TestimonialForm>(emptyTestimonial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [message, setMessage] = useState('');

  const isAdmin = Boolean(profile?.is_admin);

  const stats = useMemo(() => {
    const totalStock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const lowStock = products.filter((product) => Number(product.stock || 0) <= 3).length;
    return { totalStock, lowStock };
  }, [products]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const categoryCompare = a.category.localeCompare(b.category, 'es', { sensitivity: 'base' });
      if (categoryCompare !== 0) return categoryCompare;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });
  }, [products]);

  const loadData = async () => {
    if (!isSupabaseConfigured || !user) return;

    const [{ data: productData }, { data: categoryData }, { data: testimonialData }, { data: imagesData }] = await Promise.all([
      supabase.from('products').select('*').order('category', { ascending: true }).order('name', { ascending: true }),
      supabase.from('categories').select('*').order('orden', { ascending: true }).order('created_at', { ascending: false }),
      supabase.from('testimonials').select('*').order('orden', { ascending: true }).order('created_at', { ascending: false }),
      supabase.from('product_images').select('*').order('display_order', { ascending: true }),
    ]);

    setProducts((productData || []) as Product[]);
    setCategories((categoryData || []) as AdminCategory[]);
    const supabaseTestimonials = (testimonialData || []) as Testimonial[];
    setTestimonials(supabaseTestimonials.length > 0 ? supabaseTestimonials : await loadLocalTestimonials());

    const groupedImages = ((imagesData || []) as ProductImage[]).reduce<Record<string, ProductImage[]>>((acc, image) => {
      acc[image.product_id] = [...(acc[image.product_id] || []), image];
      return acc;
    }, {});
    setProductImages(groupedImages);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      category: productForm.category.trim(),
      image_url: productForm.image_url.trim(),
      colors: splitList(productForm.colors),
    };

    const request = productForm.id
      ? supabase.from('products').update(payload).eq('id', productForm.id).select().single()
      : supabase.from('products').insert(payload).select().single();

    const { data, error } = await request;
    if (error) {
      setMessage(`No se pudo guardar el producto: ${error.message}`);
      setSaving(false);
      return;
    }

    const productId = (data as Product).id;
    const images = [payload.image_url, ...splitList(productForm.extra_images)].filter(Boolean);

    const { error: deleteImagesError } = await supabase.from('product_images').delete().eq('product_id', productId);
    if (deleteImagesError) {
      setMessage(`El producto se guardo, pero no se pudieron actualizar las imagenes: ${deleteImagesError.message}`);
      setSaving(false);
      return;
    }

    if (images.length > 0) {
      const { error: imagesError } = await supabase.from('product_images').insert(
        images.map((imageUrl, index) => ({
          product_id: productId,
          image_url: imageUrl,
          is_primary: index === 0,
          display_order: index + 1,
        }))
      );

      if (imagesError) {
        setMessage(`El producto se guardo, pero no se pudieron guardar las imagenes extra: ${imagesError.message}`);
        setSaving(false);
        return;
      }
    }

    setProductForm(emptyProduct);
    setMessage('Producto guardado correctamente.');
    setSaving(false);
    await loadData();
  };

  const applyBulkCatalog = async () => {
    const rows = parseBulkCatalog(bulkText);

    if (rows.length === 0) {
      setMessage('Pega al menos una linea para actualizar.');
      return;
    }

    setSaving(true);
    setMessage('');

    let updated = 0;
    let created = 0;
    const errors: string[] = [];
    const productsByName = new Map(products.map((product) => [normalizeMatch(product.name), product]));

    for (const row of rows) {
      const currentProduct = findMatchingProduct(row, productsByName);
      const payload = {
        name: currentProduct?.name || row.name.trim(),
        description: currentProduct?.description || 'Producto cargado desde actualizacion rapida.',
        price: row.price ?? currentProduct?.price ?? 0,
        stock: row.stock ?? currentProduct?.stock ?? 0,
        category: row.category || currentProduct?.category || '',
        image_url: row.image_url || currentProduct?.image_url || '/branding/kazuty-logo.png',
        colors: row.colors && row.colors.length > 0 ? row.colors : currentProduct?.colors || ['Consultar'],
      };

      if (!payload.category) {
        errors.push(`${row.name}: falta categoria para crearlo.`);
        continue;
      }

      const request = currentProduct
        ? supabase.from('products').update(payload).eq('id', currentProduct.id).select().single()
        : supabase.from('products').insert(payload).select().single();

      const { data, error } = await request;

      if (error) {
        errors.push(`${row.name}: ${error.message}`);
        continue;
      }

      const savedProduct = data as Product;
      productsByName.set(normalizeMatch(savedProduct.name), savedProduct);

      if (currentProduct) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    setSaving(false);
    await loadData();

    if (errors.length > 0) {
      setMessage(`Actualizados: ${updated}. Creados: ${created}. Revisar: ${errors.join(' / ')}`);
      return;
    }

    setBulkText('');
    setMessage(`Listo. Actualizados: ${updated}. Creados: ${created}.`);
  };

  const editProduct = (product: Product) => {
    setProductForm({
      id: product.id,
      name: product.name || '',
      description: product.description || '',
      price: String(product.price || ''),
      stock: String(product.stock || 0),
      category: product.category || '',
      image_url: product.image_url || '',
      colors: (product.colors || []).join(', '),
      extra_images: (productImages[product.id] || [])
        .filter((image) => image.image_url !== product.image_url)
        .map((image) => image.image_url)
        .join('\n'),
    });
    setActiveTab('products');
  };

  const uploadProductFiles = async (files: FileList | null, mode: 'main' | 'extra') => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage('');

    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      const extension = file.name.split('.').pop() || 'jpg';
      const safeName = file.name
        .replace(/\.[^/.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const filePath = `products/${Date.now()}-${safeName}.${extension}`;

      const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { upsert: false });

      if (error) {
        setMessage(`No se pudo subir "${file.name}": ${error.message}`);
        setUploading(false);
        return;
      }

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      uploadedUrls.push(data.publicUrl);
    }

    setProductForm((current) => {
      if (mode === 'main') {
        const [mainImage, ...restImages] = uploadedUrls;
        return {
          ...current,
          image_url: mainImage || current.image_url,
          extra_images: [...splitList(current.extra_images), ...restImages].join('\n'),
        };
      }

      return {
        ...current,
        extra_images: [...splitList(current.extra_images), ...uploadedUrls].join('\n'),
      };
    });

    setMessage('Imagenes subidas correctamente. Ahora toca Guardar producto.');
    setUploading(false);
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Seguro que queres borrar este producto?')) return;
    await supabase.from('product_images').delete().eq('product_id', productId);
    const { error } = await supabase.from('products').delete().eq('id', productId);
    setMessage(error ? `No se pudo borrar: ${error.message}` : 'Producto eliminado.');
    await loadData();
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      image_url: categoryForm.image_url.trim(),
      activo: categoryForm.activo,
      orden: Number(categoryForm.orden || 0),
    };
    const request = categoryForm.id
      ? supabase.from('categories').update(payload).eq('id', categoryForm.id)
      : supabase.from('categories').insert(payload);
    const { error } = await request;
    setMessage(error ? `No se pudo guardar la categoria: ${error.message}` : 'Categoria guardada correctamente.');
    setCategoryForm(emptyCategory);
    setSaving(false);
    await loadData();
  };

  const editCategory = (category: AdminCategory) => {
    setCategoryForm({
      id: category.id,
      name: category.name || '',
      description: category.description || '',
      image_url: category.image_url || '',
      activo: category.activo ?? true,
      orden: String(category.orden || 0),
    });
    setActiveTab('categories');
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Seguro que queres borrar esta categoria?')) return;
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    setMessage(error ? `No se pudo borrar: ${error.message}` : 'Categoria eliminada.');
    await loadData();
  };

  const saveTestimonial = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      nombre: testimonialForm.nombre.trim(),
      mensaje: testimonialForm.mensaje.trim(),
      foto_url: testimonialForm.foto_url.trim(),
      activo: testimonialForm.activo,
      orden: Number(testimonialForm.orden || 0),
    };
    const request = testimonialForm.id
      ? supabase.from('testimonials').update(payload).eq('id', testimonialForm.id)
      : supabase.from('testimonials').insert(payload);
    const { error } = await request;
    setMessage(error ? `No se pudo guardar la resena: ${error.message}` : 'Resena guardada correctamente.');
    setTestimonialForm(emptyTestimonial);
    setSaving(false);
    await loadData();
  };

  const editTestimonial = (testimonial: Testimonial) => {
    setTestimonialForm({
      id: testimonial.id.startsWith('local-') ? undefined : testimonial.id,
      nombre: testimonial.nombre || '',
      mensaje: testimonial.mensaje || '',
      foto_url: testimonial.foto_url || '',
      activo: testimonial.activo,
      orden: String(testimonial.orden || 0),
    });
    setActiveTab('testimonials');
  };

  const deleteTestimonial = async (testimonialId: string) => {
    if (!confirm('Seguro que queres borrar esta resena?')) return;
    const { error } = await supabase.from('testimonials').delete().eq('id', testimonialId);
    setMessage(error ? `No se pudo borrar: ${error.message}` : 'Resena eliminada.');
    await loadData();
  };

  if (loading) {
    return <section className="container py-10 text-gray-200">Cargando panel...</section>;
  }

  if (!user) {
    return (
      <section className="container py-10">
        <div className={panelClass}>
          <h1 className="font-brand text-3xl text-white">Panel administrador</h1>
          <p className="mt-3 text-gray-200">Tenes que iniciar sesion para administrar la tienda.</p>
          <Link to="/auth" className="mt-5 inline-flex rounded-md bg-white px-4 py-2 font-bold text-white">
            Ingresar
          </Link>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="container py-10">
        <div className={panelClass}>
          <h1 className="font-brand text-3xl text-white">Panel administrador</h1>
          <p className="mt-3 text-gray-200">
            Tu usuario inicio sesion, pero todavia no esta marcado como administrador en Supabase.
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Activa <code className="text-white">profiles.is_admin = true</code> para tu usuario.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-10 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-white">Kazuty Parts</p>
          <h1 className="font-brand text-3xl text-white md:text-4xl">Panel administrador</h1>
          <p className="mt-2 text-gray-300">Crea y edita productos, categorias y resenas conectadas a Supabase.</p>
        </div>
        <button onClick={loadData} className="inline-flex items-center gap-2 rounded-md border border-white/50 bg-white/10 px-4 py-2 text-sm font-bold text-white">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className={panelClass}><p className="text-gray-400">Productos</p><p className="text-3xl font-black text-white">{products.length}</p></div>
        <div className={panelClass}><p className="text-gray-400">Categorias</p><p className="text-3xl font-black text-white">{categories.length}</p></div>
        <div className={panelClass}><p className="text-gray-400">Stock total</p><p className="text-3xl font-black text-white">{stats.totalStock}</p></div>
        <div className={panelClass}><p className="text-gray-400">Stock bajo</p><p className="text-3xl font-black text-white">{stats.lowStock}</p></div>
      </div>

      {message ? <div className="rounded-md border border-white/35 bg-white/10 p-3 text-gray-100">{message}</div> : null}

      <div className="flex flex-wrap gap-2">
        {[
          ['products', 'Productos'],
          ['categories', 'Categorias'],
          ['testimonials', 'Resenas'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`rounded-md border px-4 py-2 text-sm font-bold ${activeTab === id ? 'border-white bg-white/25 text-white' : 'border-white/15 bg-black/40 text-gray-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'products' ? (
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={saveProduct} className={`${panelClass} space-y-3`}>
            <h2 className="text-xl font-bold text-white">{productForm.id ? 'Editar producto' : 'Nuevo producto'}</h2>
            <label className={labelClass}>Nombre<input required className={fieldClass} value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label>
            <label className={labelClass}>Descripcion<textarea required className={`${fieldClass} min-h-24`} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>Precio ARS<input required type="number" min="0" className={fieldClass} value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label>
              <label className={labelClass}>Stock<input required type="number" min="0" className={fieldClass} value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} /></label>
            </div>
            <label className={labelClass}>Categoria<input required list="admin-categories" className={fieldClass} value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} /></label>
            <datalist id="admin-categories">{categories.map((category) => <option key={category.id} value={category.name} />)}</datalist>
            <label className={labelClass}>
              Imagen principal
              <input type="file" accept="image/*" className={fieldClass} disabled={uploading} onChange={(e) => uploadProductFiles(e.target.files, 'main')} />
            </label>
            <label className={labelClass}>Imagen principal URL<input required className={fieldClass} value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} /></label>
            <label className={labelClass}>Colores separados por coma<input className={fieldClass} value={productForm.colors} onChange={(e) => setProductForm({ ...productForm, colors: e.target.value })} /></label>
            <label className={labelClass}>
              Subir mas imagenes
              <input type="file" accept="image/*" multiple className={fieldClass} disabled={uploading} onChange={(e) => uploadProductFiles(e.target.files, 'extra')} />
            </label>
            <label className={labelClass}>Mas imagenes, una por linea<textarea className={`${fieldClass} min-h-20`} value={productForm.extra_images} onChange={(e) => setProductForm({ ...productForm, extra_images: e.target.value })} /></label>
            <div className="flex gap-2">
              <button disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 font-bold text-white disabled:opacity-60">
                <Save className="h-4 w-4" />
                {uploading ? 'Subiendo...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setProductForm(emptyProduct)} className="rounded-md border border-white/20 px-4 py-2 text-gray-200">Limpiar</button>
            </div>
          </form>

          <div className="space-y-6">
            <div className={`${panelClass} space-y-3`}>
              <div>
                <h2 className="text-xl font-bold text-white">Actualizacion rapida por texto</h2>
                <p className="mt-1 text-sm text-gray-300">
                  Pega una linea por producto. El sistema detecta por nombre si debe actualizar uno existente o crear uno nuevo.
                </p>
              </div>
              <textarea
                className={`${fieldClass} min-h-36 font-mono text-xs`}
                value={bulkText}
                onChange={(event) => setBulkText(event.target.value)}
                placeholder={`Escape GRS - Escapes - 250000 - 3 - rojo, negro\nKit cilindro 190 - Motor - 148373 - 2\nFiltro XR precio=35000 stock=6 categoria=Accesorios`}
              />
              <div className="rounded-md border border-green-400/80 bg-green-500/15 p-3 text-xs text-green-100 shadow-[0_0_22px_rgba(34,197,94,0.22)]">
                <p className="font-black uppercase tracking-wide text-green-300">Formato recomendado:</p>
                <p className="mt-1 text-base font-black text-white">Producto - Categoria - Precio - Stock - Colores</p>
                <p className="font-semibold text-green-100">Colores separados con coma: negro, blanco, rojo</p>
                <p className="mt-1 text-green-200">Ordena automatico por categoria y nombre. Para dejarlo como consulta: usa precio 0.</p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={applyBulkCatalog}
                className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 font-bold text-black disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                Actualizar catalogo
              </button>
            </div>

            <div className={`${panelClass} overflow-x-auto`}>
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-white"><tr><th className="p-2">Producto</th><th className="p-2">Categoria</th><th className="p-2">Precio</th><th className="p-2">Stock</th><th className="p-2">Acciones</th></tr></thead>
                <tbody>{sortedProducts.map((product) => (
                  <tr key={product.id} className="border-t border-white/10 text-gray-200">
                    <td className="p-2">{product.name}</td><td className="p-2">{product.category}</td><td className="p-2 text-white">{formatARS(Math.round(product.price))}</td><td className="p-2">{product.stock}</td>
                    <td className="flex gap-2 p-2"><button onClick={() => editProduct(product)} className="rounded bg-white/10 p-2"><Edit className="h-4 w-4" /></button><button onClick={() => deleteProduct(product.id)} className="rounded bg-red-500/20 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'categories' ? (
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={saveCategory} className={`${panelClass} space-y-3`}>
            <h2 className="text-xl font-bold text-white">{categoryForm.id ? 'Editar categoria' : 'Nueva categoria'}</h2>
            <label className={labelClass}>Nombre<input required className={fieldClass} value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} /></label>
            <label className={labelClass}>Descripcion<textarea className={`${fieldClass} min-h-20`} value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} /></label>
            <label className={labelClass}>Foto URL<input className={fieldClass} value={categoryForm.image_url} onChange={(e) => setCategoryForm({ ...categoryForm, image_url: e.target.value })} /></label>
            <label className={labelClass}>Orden<input type="number" className={fieldClass} value={categoryForm.orden} onChange={(e) => setCategoryForm({ ...categoryForm, orden: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm text-gray-200"><input type="checkbox" checked={categoryForm.activo} onChange={(e) => setCategoryForm({ ...categoryForm, activo: e.target.checked })} /> Activa</label>
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 font-bold text-white"><Plus className="h-4 w-4" />Guardar categoria</button>
          </form>
          <div className={`${panelClass} space-y-2`}>
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-3 text-gray-200">
                <div><p className="font-bold text-white">{category.name}</p><p className="text-sm text-gray-400">Orden {category.orden || 0} - {category.activo === false ? 'Oculta' : 'Activa'}</p></div>
                <div className="flex gap-2"><button onClick={() => editCategory(category)} className="rounded bg-white/10 p-2"><Edit className="h-4 w-4" /></button><button onClick={() => deleteCategory(category.id)} className="rounded bg-red-500/20 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'testimonials' ? (
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={saveTestimonial} className={`${panelClass} space-y-3`}>
            <h2 className="text-xl font-bold text-white">{testimonialForm.id ? 'Editar resena' : 'Nueva resena'}</h2>
            <label className={labelClass}>Nombre cliente<input required className={fieldClass} value={testimonialForm.nombre} onChange={(e) => setTestimonialForm({ ...testimonialForm, nombre: e.target.value })} /></label>
            <label className={labelClass}>Mensaje<textarea required className={`${fieldClass} min-h-24`} value={testimonialForm.mensaje} onChange={(e) => setTestimonialForm({ ...testimonialForm, mensaje: e.target.value })} /></label>
            <label className={labelClass}>Foto URL<input className={fieldClass} value={testimonialForm.foto_url} onChange={(e) => setTestimonialForm({ ...testimonialForm, foto_url: e.target.value })} /></label>
            <label className={labelClass}>Orden<input type="number" className={fieldClass} value={testimonialForm.orden} onChange={(e) => setTestimonialForm({ ...testimonialForm, orden: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm text-gray-200"><input type="checkbox" checked={testimonialForm.activo} onChange={(e) => setTestimonialForm({ ...testimonialForm, activo: e.target.checked })} /> Visible</label>
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 font-bold text-white"><Save className="h-4 w-4" />Guardar resena</button>
          </form>
          <div className={`${panelClass} space-y-2`}>
            {testimonials.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-white/5 p-3 text-gray-300">
                Todavia no hay resenas cargadas.
              </div>
            ) : null}
            {testimonials.map((testimonial) => {
              const isLocal = testimonial.id.startsWith('local-');

              return (
                <div key={testimonial.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-3 text-gray-200">
                  <div>
                    <p className="font-bold text-white">{testimonial.nombre}</p>
                    <p className="text-sm text-gray-300">{testimonial.mensaje}</p>
                    {isLocal ? <p className="mt-1 text-xs font-bold text-purple-300">Resena local de la web. Toca editar y guardar para subirla a Supabase.</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editTestimonial(testimonial)} className="rounded bg-white/10 p-2" title={isLocal ? 'Copiar al formulario' : 'Editar resena'}><Edit className="h-4 w-4" /></button>
                    {!isLocal ? <button onClick={() => deleteTestimonial(testimonial.id)} className="rounded bg-red-500/20 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
