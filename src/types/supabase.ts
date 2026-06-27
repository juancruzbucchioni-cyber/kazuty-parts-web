export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
  created_at: string;
  category_id?: string;
  colors?: string[] | null;
};

export type CartItem = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
  color?: string;
};

export type User = {
  id: string;
  email: string;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  created_at?: string;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  total_price: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
};

export type Testimonial = {
  id: string;
  nombre: string;
  mensaje: string;
  foto_url?: string | null;
  activo: boolean;
  orden: number;
  created_at: string;
};

export type Offer = {
  id: string;
  product_id: string;
  title: string;
  badge: string;
  offer_price?: number | null;
  activo: boolean;
  orden: number;
  created_at: string;
  products?: Product;
};

export type ProductDetails = Product & {
  category_name: string;
  category_description?: string;
  category_image_url?: string;
  images?: ProductImage[];
};


