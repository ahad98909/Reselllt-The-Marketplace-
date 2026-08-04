import React, { useState, useEffect } from 'react';
import { favoritesAPI } from '../services/api';
import ProductCard from '../components/ProductCard';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await favoritesAPI.getFavorites();
        setFavorites(res.data);
      } catch (err) {
        console.error("Failed to load favorites:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-extrabold tracking-tight mb-8">My Favorites</h2>

      {favorites.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-slate-150 p-8 text-slate-400">
          <p className="text-lg">No saved listings yet.</p>
          <p className="text-xs text-slate-400 mt-1">Tap the heart icon on any listing card to save it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {favorites.map((fav) => (
            <ProductCard key={fav.id} product={fav.product} initialIsFavorited={true} />
          ))}
        </div>
      )}
    </div>
  );
}
