import { useNavigate } from 'react-router-dom';
import { CheckCircle, Star, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SellerCard({ seller, listingLocation }) {
  const navigate = useNavigate();
  if (!seller) return null;

  const avg = seller.rating ? seller.rating.toFixed(1) : null;

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
          {avg && (
            <div className="flex items-center gap-1 mt-1">
              {Array(5).fill(0).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(Number(avg)) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
              ))}
              <span className="text-sm text-muted-foreground ml-1">{avg} · {seller.total_reviews} reviews</span>
            </div>
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