import { Star } from 'lucide-react';

/**
 * Reusable star rating display/input component.
 * - interactive=false → display only
 * - interactive=true  → clickable stars for input
 */
export default function StarRating({ rating, max = 5, size = 'md', interactive = false, onRate }) {
  const sizes = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-6 h-6', xl: 'w-7 h-7' };
  const cls = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-0.5">
      {Array(max).fill(0).map((_, i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRate?.(i + 1)}
          className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
        >
          <Star className={`${cls} ${i < rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
        </button>
      ))}
    </div>
  );
}