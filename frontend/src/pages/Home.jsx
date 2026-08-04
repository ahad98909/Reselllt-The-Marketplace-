import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productsAPI } from '../services/api';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { id: 1, name: 'Electronics', icon: '💻', slug: 'electronics' },
  { id: 2, name: 'Vehicles', icon: '🚗', slug: 'vehicles' },
  { id: 3, name: 'Property', icon: '🏠', slug: 'property' },
  { id: 4, name: 'Fashion', icon: '👕', slug: 'fashion' },
  { id: 5, name: 'Home & Garden', icon: '🏡', slug: 'home-garden' },
  { id: 6, name: 'Hobbies & Sports', icon: '⚽', slug: 'hobbies-sports' }
];

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gpsCoords, setGpsCoords] = useState(null);

  // Filters state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'newest');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [showFilters, setShowFilters] = useState(false);
  const [isSemantic, setIsSemantic] = useState(false);
  const [visualSearchLoading, setVisualSearchLoading] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [activeSearchImage, setActiveSearchImage] = useState('');

  useEffect(() => {
    // Sync URL parameters to state
    setSearch(searchParams.get('search') || '');
    setCategoryId(searchParams.get('category_id') || '');
    setSortBy(searchParams.get('sort_by') || 'newest');
    setMinPrice(searchParams.get('min_price') || '');
    setMaxPrice(searchParams.get('max_price') || '');
    setLocation(searchParams.get('location') || '');
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          size: 12,
          sort_by: sortBy
        };

        if (sortBy === 'closest') {
          if (user?.latitude && user?.longitude) {
            params.user_lat = user.latitude;
            params.user_lon = user.longitude;
          } else if (gpsCoords) {
            params.user_lat = gpsCoords.lat;
            params.user_lon = gpsCoords.lon;
          } else {
            // Trigger GPS query
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setGpsCoords({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude
                  });
                },
                (err) => {
                  console.error(err);
                  alert("Location access is required to sort by closest distance.");
                  updateFilters({ sort_by: "newest" });
                }
              );
            } else {
              alert("Geolocation is not supported by your browser.");
              updateFilters({ sort_by: "newest" });
            }
            setLoading(false);
            return;
          }
        }

        if (search) params.search = search;
        if (categoryId) params.category_id = parseInt(categoryId, 10);
        if (minPrice) params.min_price = parseFloat(minPrice);
        if (maxPrice) params.max_price = parseFloat(maxPrice);
        if (location) params.location = location;

        const res = await productsAPI.getProducts(params);
        setProducts(res.data.items);
        setTotal(res.data.total);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [page, categoryId, sortBy, search, minPrice, maxPrice, location, gpsCoords, user]);

  const updateFilters = (newFilters) => {
    const nextParams = new URLSearchParams(searchParams);
    
    // Reset to page 1 on filter change
    nextParams.set('page', '1');

    Object.entries(newFilters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        nextParams.set(key, val);
      } else {
        nextParams.delete(key);
      }
    });

    setSearchParams(nextParams);
  };

  const handleVisualSearch = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result;
      setVisualSearchLoading(true);
      setLoading(true);
      try {
        const res = await productsAPI.searchVisual(base64);
        setProducts(res.data);
        setTotal(res.data.length);
        setActiveSearchImage(base64);
        setActiveSearchQuery('');
      } catch (err) {
        console.error("Visual search failed:", err);
        alert("Visual search failed to match listings.");
      } finally {
        setVisualSearchLoading(false);
        setLoading(false);
      }
    };
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (isSemantic) {
      if (!search.trim()) return;
      setLoading(true);
      try {
        const res = await productsAPI.searchSemantic(search);
        setProducts(res.data);
        setTotal(res.data.length);
        setActiveSearchQuery(search);
        setActiveSearchImage('');
      } catch (err) {
        console.error("Semantic search failed:", err);
        alert("AI Semantic search failed.");
      } finally {
        setLoading(false);
      }
    } else {
      setActiveSearchQuery('');
      setActiveSearchImage('');
      updateFilters({ search });
    }
  };

  const handleCategorySelect = (id) => {
    const activeId = categoryId === String(id) ? '' : String(id);
    updateFilters({ category_id: activeId });
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategoryId('');
    setSortBy('newest');
    setMinPrice('');
    setMaxPrice('');
    setLocation('');
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Premium Hero Search Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#123c26] to-[#1c5d3d] px-6 py-12 text-white shadow-xl sm:px-12 sm:py-16">
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[#dbf1e5]">
            Find Curated Finds in Pakistan
          </h1>
          <p className="mt-3 text-sm text-emerald-100/85">
            Search items standardly, semantically using AI descriptors, or visually using a photo!
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-8 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={isSemantic ? "Describe what you want (e.g. lightweight gaming computer)..." : "Search products..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border-none bg-white/10 px-5 py-4 pl-12 pr-5 text-sm text-white placeholder-emerald-100/60 focus:bg-white focus:text-slate-900 focus:placeholder-slate-400 focus:outline-none transition-all duration-200"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-emerald-100/60 pointer-events-none" />
            </div>
            
            <button
              type="submit"
              className="rounded-2xl bg-[#f0f9f4] px-6 py-4 text-sm font-bold text-[#123c26] hover:bg-[#dbf1e5] transition shadow-md shrink-0 animate-pulse"
            >
              Search
            </button>
          </form>

          {/* Toggle Switches */}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs font-semibold text-emerald-100/90">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSemantic}
                onChange={(e) => setIsSemantic(e.target.checked)}
                className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 bg-white/10"
              />
              <span>✨ AI Semantic Search</span>
            </label>
          </div>
        </div>
        
        {/* Decorative background shapes */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-2xl"></div>
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-white/5 blur-2xl"></div>
      </div>

      {/* Active AI search query indicator info bubble */}
      {activeSearchQuery && (
        <div className="mb-6 flex items-center justify-between rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#123c26] dark:text-[#a3d9bc]">
              ✨ AI Semantic Results for "{activeSearchQuery}"
            </span>
          </div>
          <button
            onClick={() => {
              setActiveSearchQuery('');
              handleClearFilters();
            }}
            className="text-xs font-black text-emerald-800 dark:text-emerald-400 hover:underline"
          >
            Clear AI Search
          </button>
        </div>
      )}

      {/* Category Horizontal Bar */}
      <div className="mb-8 flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const isActive = categoryId === String(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-200 shrink-0 shadow-sm border ${
                isActive
                  ? 'bg-brand-600 text-white border-brand-600 scale-105 shadow-md dark:bg-brand-500'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800'
              }`}
            >
              <span className="text-lg">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Filters and Sort Controls */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-end">
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex flex-1 md:flex-initial items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-semibold transition ${
              showFilters
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4.5 w-4.5" />
            Filters
          </button>

          <div className="relative flex-1 md:flex-initial">
            <select
              value={sortBy}
              onChange={(e) => updateFilters({ sort_by: e.target.value })}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-5 py-3.5 pr-10 text-sm font-semibold focus:outline-none dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="newest" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Newest First</option>
              <option value="price_asc" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Price: Low to High</option>
              <option value="price_desc" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Price: High to Low</option>
              <option value="closest" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Closest to Me</option>
            </select>
            <ArrowUpDown className="absolute right-4 top-4.5 h-4 w-4 pointer-events-none text-slate-400" />
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900 transition-all duration-300">
          <h3 className="font-bold text-lg mb-4">Advanced Search Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">Price Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:outline-none dark:border-slate-800"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:outline-none dark:border-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">Location</label>
              <input
                type="text"
                placeholder="City, State"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:outline-none dark:border-slate-800"
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                onClick={() => updateFilters({ min_price: minPrice, max_price: maxPrice, location })}
                className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 dark:bg-brand-500"
              >
                Apply Filters
              </button>
              <button
                onClick={handleClearFilters}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-800"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listings Section */}
      <h2 className="mb-6 text-2xl font-bold tracking-tight">{t('recent_listings')}</h2>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 p-4 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="h-48 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
              <div className="mt-4 h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-800"></div>
              <div className="mt-2 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800"></div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-slate-500 dark:text-slate-400">{t('no_listings')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="mt-12 flex justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => updateFilters({ page: page - 1 })}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900"
              >
                Previous
              </button>
              <span className="flex items-center px-4 text-sm font-semibold">
                Page {page} of {Math.ceil(total / 12)}
              </span>
              <button
                disabled={page >= Math.ceil(total / 12)}
                onClick={() => updateFilters({ page: page + 1 })}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
