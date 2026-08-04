import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { usersAPI } from '../services/api';

export default function ReviewModal({ isOpen, onClose, sellerName, sellerId, onReviewSubmitted }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await usersAPI.addReview(sellerId, { 
        reviewee_id: sellerId,
        rating, 
        comment 
      });
      if (onReviewSubmitted) onReviewSubmitted();
      alert('🌟 Thank you! Your review has been submitted successfully.');
      onClose();
    } catch (err) {
      console.error(err);
      const errorMsg = typeof err.response?.data?.detail === 'object'
        ? (err.response.data.detail.msg || JSON.stringify(err.response.data.detail))
        : err.response?.data?.detail || 'Failed to submit review. You may have already reviewed this seller.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
          <h3 className="font-black text-xl text-slate-850 dark:text-slate-100">Review Seller</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-slate-500">
            Please share your feedback about your transaction with <span className="font-bold text-slate-700 dark:text-slate-300">{sellerName}</span>.
          </p>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-500 dark:bg-red-950/20">
              {error}
            </div>
          )}

          {/* Stars Selection */}
          <div className="flex flex-col items-center justify-center py-2 bg-slate-50/50 dark:bg-slate-950/25 rounded-2xl border border-slate-100 dark:border-slate-850">
            <span className="text-xs font-bold text-slate-400 mb-2">YOUR RATING</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = hoverRating ? star <= hoverRating : star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition duration-150 transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        isFilled 
                          ? 'fill-amber-500 text-amber-500' 
                          : 'text-slate-350 dark:text-slate-700'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment text area */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">YOUR REVIEW (OPTIONAL)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was your experience? Describe item condition, delivery, and seller communication..."
              className="w-full h-24 rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
