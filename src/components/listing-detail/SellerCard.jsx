import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import StarRating from '@/components/reviews/StarRating';

export default function SellerCard({ seller, listingLocation }) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!seller?.id) return;
    base44.entities.Review.filter({ reviewed_user_id: seller.id }, '-created_date', 50)
      .then(setReviews).catch(() => {});
  }, [seller?.id]);

  if (!seller) return null;

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Seller</h3>
      <div className="flex items-center gap-4">
        <Avatar className="w-14 h-14 border-2 border-border">
          <AvatarImage src={seller.avatar_url} />
          <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
            {seller.full_name?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-lg leading-tight">{seller.full_name}</span>
            {seller.verification_status === 'verified' && (
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs gap-1">
                <CheckCircle className="w-3 h-3" /> Verified
              </Badge>
            )}
          </div>
          {avg !== null ? (
            <div className="flex items-center gap-1.5 mt-1">
              <StarRating rating={Math.round(avg)} size="sm" />
              <span className="text-sm text-muted-foreground">{avg.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">No reviews yet</p>
          )}
          {seller.total_sales > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{seller.total_sales} successful sales</p>
          )}
        </div>
      </div>

      {listingLocation && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Location:</span> {listingLocation}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
        <Shield className="w-3.5 h-3.5 text-primary" />
        <span>ID verified · TradeVault protected payments</span>
      </div>

      <Button variant="outline" className="w-full border-border" onClick={() => navigate(`/profile/${seller.id}`)}>
        View Full Profile
      </Button>
    </div>
  );
}