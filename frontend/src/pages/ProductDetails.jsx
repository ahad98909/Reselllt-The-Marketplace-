import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { productsAPI, chatsAPI, transactionsAPI, usersAPI, getImageUrl, aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MapPin, Eye, Heart, MessageSquare, CreditCard, ChevronLeft, Trash2, CheckCircle, Sparkles, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ProductDetails() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [suggestPriceOpen, setSuggestPriceOpen] = useState(false);
  const [suggestedPriceData, setSuggestedPriceData] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState('meetup');
  const [shippingAddress, setShippingAddress] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await productsAPI.getProduct(id);
        setProduct(res.data);
        setActiveImageIdx(0);
      } catch (err) {
        setError('Listing not found or has been removed.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-250 mb-4">{error || 'Something went wrong'}</h2>
        <Link to="/" className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700 dark:bg-brand-500">
          Back to Listings
        </Link>
      </div>
    );
  }

  const isOwner = user?.id && product?.seller_id && String(user.id) === String(product.seller_id);

  const handleContactSeller = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const res = await chatsAPI.createChat(product.id);
      navigate(`/chat?chat_id=${res.data.id}`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Could not start a chat session. Please try again.');
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setCheckoutModalOpen(true);
  };

  const submitCheckout = async (e) => {
    if (e) e.preventDefault();
    if (deliveryOption === 'courier' && !shippingAddress.trim()) {
      alert("Please provide a valid shipping address.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutModalOpen(false);
    try {
      const res = await transactionsAPI.createCheckout(product.id);
      const finalAddress = deliveryOption === 'courier' ? shippingAddress : 'Self Meetup / Handover';
      await transactionsAPI.completeCheckout(product.id, user.id, res.data.session_id, finalAddress);
      
      alert('🎉 Purchase successful! Funds have been securely deposited into Escrow. Please take a moment to review the seller.');
      setReviewOpen(true);
      
      // Refresh product details
      const prodRes = await productsAPI.getProduct(product.id);
      setProduct(prodRes.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Checkout failed. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleMarkSold = async () => {
    if (!window.confirm('Mark this listing as Sold? This action cannot be undone.')) return;
    try {
      const res = await productsAPI.markSold(product.id);
      setProduct({ ...product, is_sold: true });
    } catch (err) {
      alert('Error updating status.');
    }
  };

  const handleDeleteListing = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this listing?')) return;
    try {
      await productsAPI.deleteProduct(product.id);
      navigate('/');
    } catch (err) {
      alert('Error deleting listing.');
    }
  };

  const handleSuggestPrice = async () => {
    setSuggestLoading(true);
    setSuggestPriceOpen(true);
    try {
      const res = await aiAPI.getPriceSuggest(product.title, product.category_id, product.item_condition);
      setSuggestedPriceData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleReport = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reports', { product_id: product.id, reason: reportReason, details: reportDetails });
      setReportSuccess('Listing reported successfully. Admin will review it shortly.');
      setReportReason('');
      setReportDetails('');
      setTimeout(() => {
        setReportOpen(false);
        setReportSuccess('');
      }, 3000);
    } catch (err) {
      alert('Failed to submit report.');
    }
  };

  const handleLeaveReview = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.addReview(product.seller_id, { 
        reviewee_id: product.seller_id,
        rating: reviewRating, 
        comment: reviewComment 
      });
      setReviewSuccess('Review left successfully!');
      setReviewComment('');
      setTimeout(() => {
        setReviewOpen(false);
        setReviewSuccess('');
      }, 3000);
    } catch (err) {
      const errorMsg = typeof err.response?.data?.detail === 'object'
        ? (err.response.data.detail.msg || JSON.stringify(err.response.data.detail))
        : err.response?.data?.detail || 'Failed to submit review.';
      alert(errorMsg);
    }
  };

  const imagesList = product.images && product.images.length > 0
    ? product.images
    : [{ id: 0, image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800' }];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-sm font-semibold hover:text-brand-600">
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left Side: Images */}
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800 aspect-video w-full">
            {/* Blurred backdrop image to fill empty gaps */}
            <img 
              src={getImageUrl(imagesList[activeImageIdx].image_url)} 
              alt="" 
              className="absolute inset-0 h-full w-full object-cover blur-md scale-110 opacity-30 select-none pointer-events-none" 
            />
            <img 
              src={getImageUrl(imagesList[activeImageIdx].image_url)} 
              alt={product.title} 
              className="relative z-10 h-full w-full object-contain"
            />
            {product.is_sold && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                <span className="rounded-xl border-4 border-red-500 px-6 py-2.5 text-2xl font-black uppercase tracking-wider text-red-500 rotate-12">
                  Sold
                </span>
              </div>
            )}
          </div>

          {imagesList.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {imagesList.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`relative h-16 w-24 overflow-hidden rounded-xl bg-slate-100 ${activeImageIdx === idx ? 'ring-2 ring-brand-500' : 'opacity-70 hover:opacity-100'}`}
                >
                  <img src={getImageUrl(img.image_url)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Details & Actions */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="rounded-full bg-slate-150 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {product.category?.name || "General"}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Eye className="h-4 w-4" />
                {product.view_count} views
              </span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 mb-2">{product.title}</h1>
            
            <div className="flex items-baseline gap-2 mb-4 text-3xl font-black text-brand-600 dark:text-brand-400">
              <span>Rs. {parseFloat(product.price).toLocaleString()}</span>
            </div>

            {/* Seller profile box */}
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <img src={getImageUrl(product.seller?.profile_picture, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150')} alt="Avatar" className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{product.seller?.name || 'Seller'}</h4>
                  <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{(product.seller?.rating || 0).toFixed(1)} Rating</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-450 font-medium">
                    <div>Email: <a href={`mailto:${product.contact_email || product.seller?.email}`} className="text-brand-500 hover:underline">{product.contact_email || product.seller?.email}</a></div>
                    {product.contact_phone && <div>Phone: <span className="font-semibold text-slate-700 dark:text-slate-300">{product.contact_phone}</span></div>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/profile?user_id=${product.seller?.id}`} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800">
                  View Profile
                </Link>
                {!isOwner && isAuthenticated && (
                  <button onClick={() => setReviewOpen(true)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800 text-amber-500">
                    Write Review
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Item Condition</h4>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                  {product.item_condition}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Location</h4>
                <div className="flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-350">
                  <MapPin className="h-4 w-4" />
                  <span>{product.location}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Description</h4>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {product.description}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {isOwner ? (
              <>
                {!product.is_sold && (
                  <button
                    onClick={handleMarkSold}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Mark as Sold
                  </button>
                )}

                <button
                  onClick={handleSuggestPrice}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-800 text-brand-500"
                >
                  <Sparkles className="h-5 w-5" />
                  AI Price Suggest
                </button>

                <button
                  onClick={handleDeleteListing}
                  className="rounded-2xl border border-red-200 px-5 py-3.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:border-red-950/20"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                {!product.is_sold && (
                  <button
                    onClick={handleBuyNow}
                    disabled={checkoutLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
                  >
                    <CreditCard className="h-5 w-5" />
                    {checkoutLoading ? 'Processing...' : t('buy_now')}
                  </button>
                )}

                <button
                  onClick={handleContactSeller}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-800"
                >
                  <MessageSquare className="h-5 w-5" />
                  {t('contact_seller')}
                </button>

                {isAuthenticated && (
                  <button
                    onClick={() => setReportOpen(true)}
                    className="rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-400 hover:text-red-500 dark:border-slate-800"
                    title="Report Listing"
                  >
                    Flag
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Suggest Price Modal */}
      {suggestPriceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="flex items-center gap-2 font-black text-xl mb-4 text-slate-850 dark:text-slate-100">
              <Sparkles className="h-5 w-5 text-brand-550" />
              AI Price Suggestion
            </h3>

            {suggestLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-650"></div>
                <span className="text-xs text-slate-400">Asking the marketplace copilot...</span>
              </div>
            ) : suggestedPriceData ? (
              <div className="space-y-4">
                <div className="text-center rounded-2xl bg-brand-50/50 p-4 dark:bg-brand-900/10">
                  <span className="text-xs font-bold uppercase text-brand-500">Recommended Price</span>
                  <div className="text-3xl font-black text-brand-600 dark:text-brand-400 mt-1">Rs. {parseFloat(suggestedPriceData.suggested_price).toLocaleString()}</div>
                  <div className="text-xs text-slate-400 mt-1">Suggested Range: Rs. {parseFloat(suggestedPriceData.min_price).toLocaleString()} - Rs. {parseFloat(suggestedPriceData.max_price).toLocaleString()}</div>
                </div>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{suggestedPriceData.rationale}</p>
              </div>
            ) : (
              <div className="py-4 text-sm text-red-500">Failed to load price suggestion.</div>
            )}

            <button
              onClick={() => setSuggestPriceOpen(false)}
              className="w-full mt-6 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Flag Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleReport} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="font-black text-xl mb-4">Report Product</h3>
            
            {reportSuccess ? (
              <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-600 dark:bg-emerald-950/20">{reportSuccess}</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Reason</label>
                  <select 
                    required
                    value={reportReason} 
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:outline-none dark:border-slate-800"
                  >
                    <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Select a reason...</option>
                    <option value="Spam / Fake Listing" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Spam / Fake Listing</option>
                    <option value="Miscategorized" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Miscategorized</option>
                    <option value="Inappropriate Content" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Inappropriate Content</option>
                    <option value="Suspected Fraud" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Suspected Fraud</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Details (Optional)</label>
                  <textarea 
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide additional details..."
                    className="w-full h-24 rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:outline-none dark:border-slate-800"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="submit"
                disabled={!reportReason || reportSuccess}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Submit Report
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 dark:border-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Review Modal */}
      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleLeaveReview} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="font-black text-xl mb-4">Leave a Seller Review</h3>
            
            {reviewSuccess ? (
              <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-600 dark:bg-emerald-950/20">{reviewSuccess}</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Rating</label>
                  <div className="flex gap-2 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="text-2xl hover:scale-110 transition"
                      >
                        {star <= reviewRating ? '★' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Comment (Optional)</label>
                  <textarea 
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Write your comment..."
                    className="w-full h-24 rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:outline-none dark:border-slate-800"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="submit"
                disabled={reviewSuccess}
                className="flex-1 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500"
              >
                Submit Review
              </button>
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 dark:border-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="flex items-center gap-2 font-black text-xl mb-2 text-slate-850 dark:text-slate-100">
              <CreditCard className="h-5 w-5 text-brand-550" />
              Secure Escrow Checkout
            </h3>
            <p className="text-xs text-slate-400 mb-4">Your payment will be held safely in escrow and only released to the seller after delivery confirmation.</p>

            <form onSubmit={submitCheckout} className="space-y-4">
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-955 p-3 border border-slate-100 dark:border-slate-800 flex justify-between text-sm">
                <div>
                  <span className="font-semibold block text-slate-500">Item</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{product.title}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold block text-slate-500">Total Price</span>
                  <span className="font-black text-brand-600 dark:text-brand-400">Rs. {parseFloat(product.price).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Delivery Method</label>
                <select
                  value={deliveryOption}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:outline-none dark:border-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="meetup" className="bg-white text-slate-950 dark:bg-slate-900 dark:text-slate-100">Self Meetup / Handover (Free)</option>
                  <option value="courier" className="bg-white text-slate-950 dark:bg-slate-900 dark:text-slate-100">Home Delivery / Courier (Escrow Shipping)</option>
                </select>
              </div>

              {deliveryOption === 'courier' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Shipping Address</label>
                  <textarea
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Enter your street address, city, and zip code..."
                    className="w-full h-20 rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:outline-none dark:border-slate-850 text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}

              <div className="rounded-xl bg-amber-50 dark:bg-amber-955/20 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                ⚠️ <b>Escrow Protection:</b> Never make payments direct to sellers via bank transfer. By continuing, you agree that your payment is held securely in escrow by our system.
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                  Confirm & Pay
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 dark:border-slate-850 text-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
