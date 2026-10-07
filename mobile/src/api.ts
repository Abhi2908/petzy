import { API_URL, PUBLISHABLE_KEY } from "./config";

export type Product = {
  id: string;
  title: string;
  thumbnail: string | null;
  price: string | null;
};

async function storeFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

// Same source of truth as the web storefront + Admin: the Medusa Store API.
export async function fetchProducts(): Promise<Product[]> {
  const { regions } = await storeFetch<{ regions: { id: string }[] }>("/store/regions");
  const regionId = regions[0]?.id;
  const query = `/store/products?limit=50&region_id=${regionId}&fields=id,title,thumbnail,*variants.calculated_price`;
  const { products } = await storeFetch<{ products: any[] }>(query);

  return products.map((p) => {
    const cp = p.variants?.[0]?.calculated_price;
    const price = cp ? `${cp.currency_code?.toUpperCase()} ${cp.calculated_amount}` : null;
    return { id: p.id, title: p.title, thumbnail: p.thumbnail ?? null, price };
  });
}
