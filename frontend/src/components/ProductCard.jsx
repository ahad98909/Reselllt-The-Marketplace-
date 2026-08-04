import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Eye, ShoppingCart } from 'lucide-react';
import { favoritesAPI, getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function ProductCard({ product, initialIsFavorited = false }) {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isFav, setIsFav] = useState(initialIsFavorited);
  const [loadingFav, setLoadingFav] = useState(false);

  const imageUrl = product.images && product.images.length > 0
    ? getImageUrl(product.images[0].image_url)
    : 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600';

  const handleFavorite = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setLoadingFav(true);
    try {
      const res = await favoritesAPI.toggleFavorite(product.id);
      setIsFav(res.data.favorited);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFav(false);
    }
  };

  const getConditionColor = (cond) => {
    switch (cond) {
      case 'New': return 'bg-emerald-500 text-white';
      case 'Like New': return 'bg-cyan-500 text-white';
      case 'Good': return 'bg-brand-500 text-white';
      case 'Fair': return 'bg-amber-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div 
      onClick={() => navigate(`/products/${product.id}`)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl hover:border-brand-500/30 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
    >
      {/* Product Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {/* Blurred background to fill left/right empty gaps */}
        <img 
          src={imageUrl} 
          alt="" 
          className="absolute inset-0 h-full w-full object-cover blur-md scale-110 opacity-30 select-none pointer-events-none" 
        />
        <img 
          src={imageUrl} 
          alt={product.title} 
          className="relative z-10 h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-105"
        />
        
        {/* Condition Badge */}
        <span className={`absolute left-3 top-3 z-20 rounded-full px-2.5 py-0.5 text-xs font-bold ${getConditionColor(product.item_condition)}`}>
          {t(`condition_${product.item_condition.toLowerCase().replace(' ', '_')}`)}
        </span>

        {/* Favorite Button */}
        <button
          onClick={handleFavorite}
          disabled={loadingFav}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-slate-700 shadow hover:bg-white hover:text-red-500 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-red-500"
        >
          <Heart className={`h-4 w-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Sold Overlay */}
        {product.is_sold && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <span className="rounded-lg border-2 border-red-500 px-4 py-1.5 text-lg font-black uppercase tracking-wider text-red-500 rotate-12">
              Sold
            </span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">
          {product.category?.name || "General"}
        </span>
        <h3 className="line-clamp-1 font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400">
          {product.title}
        </h3>
        
        {/* Price */}
        <div className="mt-2 flex items-baseline gap-1 font-extrabold text-brand-600 dark:text-brand-400">
          <span className="text-lg">Rs. {parseFloat(product.price).toLocaleString()}</span>
        </div>

        {/* Location & View Count */}
        <div className="mt-auto pt-4 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 min-w-0 flex-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {product.location.split(',')[0]} 
              {product.distance !== undefined && product.distance !== null && (
                <span className="ml-1 text-[10px] font-bold text-brand-600 dark:text-brand-400">
                  ({product.distance < 1 ? `${Math.round(product.distance * 1000)}m` : `${product.distance.toFixed(1)}km`})
                </span>
              )}
            </span>
          </span>
          <span className="flex items-center gap-1 shrink-0 ml-2">
            <Eye className="h-3 w-3" />
            {product.view_count} views
          </span>
        </div>
      </div>
    </div>
  );
}
