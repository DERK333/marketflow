import { Star } from 'lucide-react';
import StarRating from './StarRating';

/** Shows average star rating + breakdown bars. */
export default function RatingSummary({ reviews }) {
  if (!reviews || reviews.length === 0) return null;

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const counts = [5, 4, 3, 2, 1].map(n => ({
    n,
    count: reviews.filter(r => r.rating === n).length,
  }));

  return (
    <div className="flex gap-6 items-center flex-wrap">
      {/* Big average */}
      <div className="text-center shrink-0">
        <p className="text-5xl font-syne font-800 text-foreground leading-none">{avg.toFixed(1)}</p>
        <StarRating rating={Math.round(avg)} size="md" />
        <p className="text-xs text-muted-foreground mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
      </div>
      {/* Breakdown */}
      <div className="flex-1 min-w-[160px] space-y-1">
        {counts.map(({ n, count }) => (
          <div key={n} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 shrink-0">{n}</span>
            <Star className="w-3 h-3 fill-primary text-primary shrink-0" />
            <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
              />
            </div>
            <span className="w-4 text-right shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}