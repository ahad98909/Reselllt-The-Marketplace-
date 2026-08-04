import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usersAPI, productsAPI, authAPI, transactionsAPI, getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import { User, CheckCircle, Mail, Star, Edit3, Camera, Clock, Share2, ShoppingCart, Trophy, Shield, Award, Heart } from 'lucide-react';

export default function Profile() {
  const { user: currentUser, updateProfile, verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const profileUserId = searchParams.get('user_id');

  const [profileUser, setProfileUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Edit profile states
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const isOwnProfile = !profileUserId || parseInt(profileUserId, 10) === currentUser?.id;

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const userId = isOwnProfile ? currentUser?.id : parseInt(profileUserId, 10);
        if (!userId) return;

        // Fetch profile user details
        const profileRes = await usersAPI.getProfile(userId);
        setProfileUser(profileRes.data);
        setName(profileRes.data.name);
        setAvatar(profileRes.data.profile_picture || '');

        // Fetch reviews
        const reviewsRes = await usersAPI.getReviews(userId);
        setReviews(reviewsRes.data);

        // Fetch listings
        const productsRes = await productsAPI.getProducts({ page: 1, size: 50 });
        const userProducts = productsRes.data.items.filter(p => p.seller_id === userId);
        setProducts(userProducts);

        // Fetch transactions (only if own profile)
        if (isOwnProfile) {
          const txRes = await transactionsAPI.getHistory();
          setTransactions(txRes.data);
        }
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfileData();
  }, [profileUserId, isOwnProfile, currentUser]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const updated = await updateProfile({ name, profile_picture: avatar });
      setProfileUser(updated);
      setEditMode(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      await verifyEmail();
      setProfileUser({ ...profileUser, email_verified: true });
      alert('✉️ Verification email simulation successful! Your account is now verified.');
    } catch (err) {
      alert('Verification failed.');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading || !profileUser) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* 1. Cover Banner & Quick Profile Info */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        
        {/* Colorful Gradient Header Banner */}
        <div className="h-48 w-full bg-gradient-to-r from-brand-800 via-emerald-800 to-brand-900 relative flex items-center justify-between px-8 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shop Premium Centered title */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xl font-bold tracking-wider opacity-90 uppercase">Shop Premium</span>
          </div>
          {/* Top-Right icons */}
          <div className="absolute top-4 right-6 flex items-center gap-4 text-white/95">
            <button className="hover:scale-105 transition" title="Share Storefront" onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("📋 Profile Storefront link copied to clipboard!");
              }}>
              <Share2 className="h-5 w-5" />
            </button>
            <button className="hover:scale-105 transition" title="Cart">
              <ShoppingCart className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Profile Card Overlay with overlapping avatar */}
        <div className="px-6 pb-6 pt-16 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative">
          
          {/* Avatar Positioned Overlapping Banner */}
          <div className="absolute -top-16 left-6 sm:left-8">
            <div className="relative">
              <img 
                src={getImageUrl(profileUser.profile_picture, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150')} 
                alt="Avatar" 
                className="h-28 w-28 rounded-full border-4 border-white object-cover dark:border-slate-900 shadow-xl" 
              />
              {/* Blue Verified Checkmark overlay at top right */}
              {profileUser.email_verified && (
                <span className="absolute top-0 right-0 bg-blue-500 text-white rounded-full p-1 border-2 border-white dark:border-slate-900 shadow-md">
                  <CheckCircle className="h-3.5 w-3.5 fill-current" />
                </span>
              )}
              {/* Rating counter overlay at bottom right */}
              <span className="absolute bottom-0 right-0 bg-blue-600 text-white text-[11px] font-bold rounded-full h-7 w-7 flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                28
              </span>
              {editMode && (
                <label className="absolute bottom-0 left-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand-600 text-white shadow hover:bg-brand-700">
                  <Camera className="h-4.5 w-4.5" />
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left sm:pl-32">
            {editMode ? (
              <form onSubmit={handleUpdateProfile} className="max-w-xs space-y-3">
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:outline-none dark:border-slate-800"
                  placeholder="Your Name"
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={editLoading} className="rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700">Save</button>
                  <button type="button" onClick={() => setEditMode(false)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="space-y-1">
                <h3 className="font-extrabold text-2xl uppercase tracking-tight text-slate-850 dark:text-white">
                  {profileUser.name.toUpperCase()}'S CURATED FINDS
                </h3>
                <p className="text-xs text-slate-500 font-semibold dark:text-slate-400">
                  {profileUser.address || 'San Francisco, CA'} • Member since {new Date(profileUser.created_at).getFullYear()}
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span className="text-amber-500 font-bold text-sm flex items-center gap-0.5">
                    {profileUser.rating.toFixed(1)} <Star className="h-4 w-4 fill-amber-500 text-amber-500 inline-block" />
                  </span>
                  <span>({reviews.length} Reviews)</span>
                </div>
                
                {/* Custom Badges row */}
                <div className="flex items-center gap-3 pt-2 justify-center sm:justify-start">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-55/15 px-2.5 py-1 rounded-full dark:text-amber-400 border border-amber-500/20">
                    <Trophy className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
                    <span>SUPER SELLER</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-55/15 px-2.5 py-1 rounded-full dark:text-emerald-400 border border-emerald-500/20">
                    <Shield className="h-3.5 w-3.5 fill-emerald-500 text-emerald-600" />
                    <span>TRUSTED ESCROW</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Custom Storefront Stats Row (4 Columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Rating card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-center flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Ratings</span>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-1 flex items-center justify-center gap-0.5">
            {profileUser.rating.toFixed(1)} <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
          </div>
          <span className="text-xs text-slate-400 mt-0.5">{reviews.length} reviews (250 verified)</span>
        </div>
        {/* Listings card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-center flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Listings</span>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            {products.length} <span className="text-xs text-slate-400 font-semibold">Active</span> / 49 <span className="text-xs text-slate-400 font-semibold">Sold</span>
          </div>
          <span className="text-xs text-slate-400 mt-0.5">Storefront inventory</span>
        </div>
        {/* Response time card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-center flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Resp. Time</span>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            &lt;1 Hour
          </div>
          <span className="text-xs text-slate-400 mt-0.5">99% response rate</span>
        </div>
        {/* Sales card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-center flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Sales</span>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            734
          </div>
          <span className="text-xs text-slate-400 mt-0.5">Total items sold</span>
        </div>
      </div>

      {/* 3. Action Buttons Row */}
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <button className="flex-1 rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white hover:bg-brand-700 transition shadow-md dark:bg-brand-500">
          Message Seller
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("📋 Profile Storefront link copied to clipboard!");
          }}
          className="flex-1 rounded-2xl border-2 border-brand-200 bg-brand-50/20 py-3.5 text-sm font-bold text-brand-600 hover:bg-brand-50 transition dark:border-brand-900/40 dark:bg-brand-950/10 dark:text-brand-400 flex items-center justify-center gap-1.5"
        >
          <Share2 className="h-4.5 w-4.5" />
          Share Storefront
        </button>
        {isOwnProfile && (
          <button 
            onClick={() => setEditMode(!editMode)}
            className="rounded-2xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850 px-6 py-3.5 text-sm font-bold"
          >
            {editMode ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        )}
      </div>

      {/* 4. Active Listings & Reviews / Transactions Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        
        {/* Active Listings Grid (Spans 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-extrabold text-xl uppercase tracking-wider text-slate-855 dark:text-white">Active Listings</h3>
          {products.length === 0 ? (
            <div className="rounded-2xl border border-slate-150 p-8 text-center text-slate-400">No active listings.</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {products.map((p, idx) => (
                <div key={p.id} className="relative group">
                  {/* Number Overlay at top left of card */}
                  <span className="absolute top-3 left-3 z-10 bg-slate-900/80 text-white font-mono font-bold text-xs h-6 w-6 rounded-lg flex items-center justify-center shadow-lg">
                    {idx + 1}
                  </span>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Panel: Reviews & History (Spans 1 column) */}
        <div className="lg:col-span-1 space-y-8">
          {/* Transactions (Only shown on own profile) */}
          {isOwnProfile && transactions.length > 0 && (
            <div>
              <h3 className="font-extrabold text-xl mb-4">Transaction History</h3>
              <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow dark:border-slate-800 dark:bg-slate-900">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((tx) => {
                    const isBuyer = tx.buyer_id === currentUser.id;
                    return (
                      <div key={tx.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                        <div>
                          <span className={`text-[10px] font-bold uppercase rounded px-2 py-0.5 ${isBuyer ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/10' : 'bg-green-50 text-green-600 dark:bg-green-900/10'}`}>
                            {isBuyer ? 'Bought' : 'Sold'}
                          </span>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-1">Transaction ID: #{tx.id}</h4>
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(tx.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-slate-800 dark:text-slate-200">Rs. {parseFloat(tx.amount).toLocaleString()}</span>
                          <span className={`block text-xs font-bold mt-1 ${tx.status === 'released' ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {tx.status === 'escrow' ? 'Funds in Escrow' : 'Funds Released'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Reviews list */}
          <div>
            <h3 className="font-extrabold text-xl mb-4">Reviews & Feedback</h3>
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-slate-150 p-8 text-center text-slate-400">No reviews yet.</div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{rev.reviewer_id === currentUser.id ? 'You' : 'Anonymous Buyer'}</span>
                        <div className="flex gap-0.5 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < rev.rating ? 'fill-current' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-650 dark:text-slate-300">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
