import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import StarRating from './StarRating';

export default function ReviewCard({ review }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
              {review.reviewer_name?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">{review.reviewer_name}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(review.created_date), 'MMM d, yyyy')}</p>
          </div>
        </div>
        <Badge className="bg-secondary text-muted-foreground border-border text-xs capitalize shrink-0">{review.role}</Badge>
      </div>
      <StarRating rating={review.rating} size="sm" />
      {review.comment && <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>}
    </div>
  );
}