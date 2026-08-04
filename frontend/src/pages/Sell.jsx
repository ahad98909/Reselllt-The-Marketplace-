import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsAPI, aiAPI } from '../services/api';
import { Sparkles, Image as ImageIcon, MapPin, DollarSign, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import MapPickerModal from '../components/MapPickerModal';

const CATEGORIES = [
  { id: 1, name: 'Electronics' },
  { id: 2, name: 'Vehicles' },
  { id: 3, name: 'Property' },
  { id: 4, name: 'Fashion' },
  { id: 5, name: 'Home & Garden' },
  { id: 6, name: 'Hobbies & Sports' }
];

export default function Sell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [itemCondition, setItemCondition] = useState('New');
  const [price, setPrice] = useState('');
  const [secretMinPrice, setSecretMinPrice] = useState('');
  const [location, setLocation] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState('');
  const [images, setImages] = useState([]); // Base64 data URLs
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // AI Assistance states
  const [aiSuggestingPrice, setAiSuggestingPrice] = useState(false);
  const [aiGeneratingDesc, setAiGeneratingDesc] = useState(false);
  const [aiVerifyingImage, setAiVerifyingImage] = useState(false);
  const [aiVerificationResult, setAiVerificationResult] = useState(null);

  const runImageVerification = async (currentImages = images, currentTitle = title, currentCatId = categoryId) => {
    if (currentImages.length === 0 || !currentTitle || !currentCatId) return;
    setAiVerifyingImage(true);
    try {
      const categoryObj = CATEGORIES.find(c => c.id === parseInt(currentCatId, 10));
      const catName = categoryObj ? categoryObj.name : 'General';
      const res = await aiAPI.verifyImage(currentImages[0], currentTitle, catName);
      setAiVerificationResult(res.data);
      if (res.data.suggested_condition) {
        setItemCondition(res.data.suggested_condition);
      }
    } catch (err) {
      console.error("AI image verification failed", err);
    } finally {
      setAiVerifyingImage(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const primaryFile = files[0];
    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageBase64 = reader.result;
      setImages((prev) => {
        const newImages = [...prev, imageBase64];
        if (title && categoryId) {
          runImageVerification(newImages, title, categoryId);
        }
        return newImages;
      });
    };
    reader.readAsDataURL(primaryFile);

    if (files.length > 1) {
      files.slice(1).forEach((file) => {
        const r = new FileReader();
        r.onloadend = () => {
          setImages((prev) => [...prev, r.result]);
        };
        r.readAsDataURL(file);
      });
    }
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      const newImages = prev.filter((_, i) => i !== idx);
      if (idx === 0) {
        setAiVerificationResult(null);
      }
      return newImages;
    });
  };

  const handleSuggestPrice = async () => {
    if (!title || !categoryId) {
      alert('Please fill in Title and Category first.');
      return;
    }
    setAiSuggestingPrice(true);
    try {
      const res = await aiAPI.getPriceSuggest(title, parseInt(categoryId, 10), itemCondition);
      const suggested = res.data.suggested_price;
      setPrice(suggested);
      alert(`💡 AI suggested price: Rs. ${parseFloat(suggested).toLocaleString()}\n\nRationale:\n${res.data.rationale}`);
    } catch (err) {
      console.error(err);
      alert('Failed to suggest price. Make sure title/category are set.');
    } finally {
      setAiSuggestingPrice(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!title) {
      alert('Please enter a product title first so the AI can suggest a description.');
      return;
    }
    setAiGeneratingDesc(true);
    try {
      const res = await aiAPI.getDescriptionSuggest(title, parseInt(categoryId, 10) || 1, itemCondition);
      setDescription(res.data.suggestion);
    } catch (err) {
      console.error(err);
      alert('Failed to generate description.');
    } finally {
      setAiGeneratingDesc(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (images.length === 0) {
      setError('Please upload at least one image of your item.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
        description,
        category_id: parseInt(categoryId, 10) || 1,
        item_condition: itemCondition,
        price: parseFloat(price),
        secret_min_price: secretMinPrice ? parseFloat(secretMinPrice) : null,
        location,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        latitude,
        longitude,
        images: images // list of base64 data URLs
      };

      const res = await productsAPI.createProduct(payload);
      navigate(`/products/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to list product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 border-b border-slate-100 pb-4 dark:border-slate-800">
          <h2 className="text-3xl font-extrabold tracking-tight">List an Item</h2>
          <p className="mt-2 text-sm text-slate-500">Reach thousands of buyers in seconds</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-500 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Images Section */}
          <div>
            <label className="block text-sm font-bold mb-2">Item Images</label>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {images.map((img, idx) => (
                <div key={idx} className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <img src={img} alt="Product" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              {images.length < 8 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-500 dark:border-slate-700">
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                  <span className="mt-2 text-xs font-semibold text-slate-500">Add Photo</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* AI Image Verification Status */}
          {images.length > 0 && (
            <div className="mt-1 p-4 rounded-2xl border bg-slate-50 dark:bg-slate-900/40 dark:border-slate-800 flex items-center justify-between text-sm">
              <div className="flex-1 pr-4">
                <span className="font-bold flex items-center gap-1 text-slate-800 dark:text-slate-200">
                  🔍 AI Photo Analyzer
                </span>
                {aiVerifyingImage ? (
                  <span className="text-xs text-slate-500 animate-pulse mt-0.5 block">Analyzing photo authenticity and stock patterns...</span>
                ) : aiVerificationResult ? (
                  <div className="mt-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      {aiVerificationResult.status === 'VERIFIED' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">✓ Image Authentic</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-500 flex items-center gap-0.5">⚠ Potential stock photo or mismatch</span>
                      )}
                      <span className="text-xs text-slate-400 font-normal">({Math.round(aiVerificationResult.confidence * 100)}% match)</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{aiVerificationResult.feedback}</p>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 mt-1 block">Specify Title & Category to run full authentication checks.</span>
                )}
              </div>
              {!aiVerifyingImage && !aiVerificationResult && title && categoryId && (
                <button
                  type="button"
                  onClick={() => runImageVerification()}
                  className="text-xs font-bold text-brand-600 hover:underline shrink-0 dark:text-brand-400"
                >
                  Analyze Photo
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold mb-1">Listing Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are you selling? (e.g. iPhone 13 Pro Slate Gray)"
                className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-bold mb-1">Category</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800"
              >
                <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Select Category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-bold mb-1">Condition</label>
              <select
                required
                value={itemCondition}
                onChange={(e) => setItemCondition(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800"
              >
                <option value="New" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">New</option>
                <option value="Like New" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Like New</option>
                <option value="Good" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Good</option>
                <option value="Fair" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Fair</option>
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-bold mb-1 flex items-center justify-between">
                <span>Price</span>
                <button
                  type="button"
                  onClick={handleSuggestPrice}
                  disabled={aiSuggestingPrice}
                  className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
                >
                  <Sparkles className="h-3 w-3" />
                  {aiSuggestingPrice ? 'Analyzing...' : 'Suggest Price'}
                </button>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-200 bg-transparent pl-12 pr-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800"
                />
                <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">Rs.</span>
              </div>
            </div>

            {/* Secret Minimum Price */}
            <div>
              <label className="block text-sm font-bold mb-1">
                Secret Minimum Price <span className="text-xs font-normal text-slate-400">(for auto-bargaining)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={secretMinPrice}
                  onChange={(e) => setSecretMinPrice(e.target.value)}
                  placeholder="e.g. 10% below standard price"
                  className="w-full rounded-xl border border-slate-200 bg-transparent pl-12 pr-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800"
                />
                <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">Rs.</span>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-bold mb-1">Location</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Karachi, Lahore"
                    className="w-full rounded-xl border border-slate-200 bg-transparent pl-10 pr-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-850 text-slate-800 dark:text-slate-200"
                  />
                  <MapPin className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsMapOpen(true)}
                  className="rounded-xl border border-slate-300 hover:border-brand-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850 px-4 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0"
                  title="Select on Map"
                >
                  <MapPin className="h-5 w-5 text-brand-500" />
                </button>
              </div>
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-bold mb-1">Contact Email</label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="seller@example.com"
                className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm font-bold mb-1">Contact Phone Number</label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="e.g. +1 555-0199"
                className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold mb-1 flex items-center justify-between">
                <span>Description</span>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={aiGeneratingDesc}
                  className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
                >
                  <Sparkles className="h-3 w-3" />
                  {aiGeneratingDesc ? 'Writing...' : 'AI Autofill'}
                </button>
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Give details about your item (features, flaws, reason for selling)..."
                className="w-full h-40 rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500"
          >
            {loading ? 'Creating Listing...' : 'Publish Listing'}
          </button>
        </form>
      </div>

      <MapPickerModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSelect={(selected) => {
          setLocation(selected.address);
          setLatitude(selected.latitude);
          setLongitude(selected.longitude);
          setIsMapOpen(false);
        }}
        initialLat={latitude}
        initialLon={longitude}
        initialAddress={location}
      />
    </div>
  );
}
