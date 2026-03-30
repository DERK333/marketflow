import { Link } from 'react-router-dom';
import { MapPin, Package, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CONDITION_LABELS = {
  new: { label: 'New', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  like_new: { label: 'Like New', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  good: { label: 'Good', color: 'bg-primary/20 text-primary border-primary/30' },
  fair: { label: 'Fair', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  poor: { label: 'Poor', color: 'bg-destructive/20 text-destructive border-destructive/30' },
};

export default function ListingCard({ listing, isFavorited = false, onToggleFavorite }) {
  const cond = CONDITION_LABELS[listing.condition] || CONDITION_LABELS.good;
  const hasImage = listing.images && listing.images.length > 0;

  const handleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.();
  };

  return (
    <Link to={`/listing/${listing.id}`} className="group block">
      <div className="card-glow rounded-xl bg-card border border-border overflow-hidden">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-secondary">
          {hasImage ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge className={`text-xs border ${cond.color}`}>{cond.label}</Badge>
          </div>
          {listing.auction_enabled && (
            <div className="absolute top-2 right-8">
              <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">Auction</Badge>
            </div>
          )}

          {/* Heart button */}
          {onToggleFavorite && (
            <button
              onClick={handleFavorite}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <Heart className={`w-3.5 h-3.5 transition-colors ${isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
          )}

          {listing.delivery_type === 'local_pickup' && (
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-black/60 text-white border-0 text-xs backdrop-blur-sm">
                <MapPin className="w-2.5 h-2.5 mr-1" />Local
              </Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {listing.title}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-base font-700 text-primary font-syne">
              ${listing.price?.toLocaleString()}
            </span>
            {listing.allows_offers && (
              <span className="text-xs text-muted-foreground">+ offers</span>
            )}
          </div>
          {listing.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{listing.location}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}