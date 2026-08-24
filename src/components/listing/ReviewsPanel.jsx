import { useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi, getAuthData } from '../../lib/api';

function initials(name) {
  return String(name || 'G')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'G';
}

function Avatar({ author }) {
  if (author?.avatarUrl) {
    return <img src={author.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />;
  }
  return (
    <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-sm font-black text-white">
      {initials(author?.name)}
    </div>
  );
}

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={onChange ? 'button' : 'button'}
          onClick={onChange ? () => onChange(star) : undefined}
          className={`text-xl leading-none ${star <= value ? 'text-amber-400' : 'text-slate-300'}`}
          aria-label={`${star} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ReviewsPanel({ hotelId, reviews = [], ratingAverage = 0, reviewCount = 0, isAuthenticated, onUpdated }) {
  const token = getAuthData()?.token;
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await publicApi.saveReview(token, hotelId, { rating, comment });
      setMessage(response.message || 'Review saved.');
      setComment('');
      const list = await publicApi.getReviews(hotelId);
      onUpdated?.(list);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="reviews" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Guest reviews</h2>
          <p className="mt-1 text-sm text-slate-600">
            {reviewCount ? `${ratingAverage || '—'} average from ${reviewCount} review${reviewCount === 1 ? '' : 's'}` : 'No reviews yet. Be the first to share your experience.'}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <Avatar author={review.author} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-slate-950">{review.author?.name || 'Guest'}</p>
                  {review.verifiedStay ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black uppercase text-emerald-800">Stayed here</span> : null}
                </div>
                <Stars value={Number(review.rating || 0)} />
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{review.comment}</p>
                {review.createdAt ? <p className="mt-2 text-xs font-semibold text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</p> : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {isAuthenticated ? (
        <form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-black text-slate-950">Write a review</p>
          <p className="mt-1 text-sm text-slate-600">You can review this listing if you booked it, stayed here, or know it well enough to recommend it.</p>
          <div className="mt-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Rating</p>
            <Stars value={rating} onChange={setRating} />
          </div>
          <textarea
            required
            minLength={8}
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What should other guests know?"
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
          />
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
          <button disabled={busy} className="mt-3 rounded-xl bg-primary px-4 py-3 text-sm font-black text-white disabled:opacity-50">
            {busy ? 'Saving…' : 'Publish review'}
          </button>
        </form>
      ) : (
        <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Link to="/login" className="font-black text-primary">Log in</Link> to add a review.
        </p>
      )}
    </section>
  );
}
