import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Heart, Package } from 'lucide-react';
import ListingCard from '@/components/listings/ListingCard';
import { useFavorites } from '@/hooks/useFavorites';

export default function MyFavorites() {
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { favoriteMap, toggle } = useFavorites(user);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      return base44.entities.Favorite.filter({ user_id: u.id }, '-created_date', 100);
    }).then(async (favs) => {
      if (!favs.length) { setLoading(false); return; }
      const ids = favs.map(f => f.listing_id);
      // Fetch each listing
      const results = await Promise.all(ids.map(id => base44.entities.Listing.filter({ id }).then(r => r[0]).catch(() => null)));
      setListings(results.filter(Boolean).filter(l => l.status === 'active'));
      setLoading(false);
    }).catch(() => { base44.auth.redirectToLogin(); });
  }, []);

  // Remove from view when unfavorited
  const activeFavoriteIds = new Set(Object.keys(favoriteMap));
  const visibleListings = listings.filter(l => activeFavoriteIds.has(l.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="w-7 h-7 fill-primary text-primary" />
        <h1 className="text-3xl font-syne font-800 text-foreground">My Favorites</h1>
        <span className="text-muted-foreground text-sm ml-1">({visibleListings.length})</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : visibleListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Package className="w-16 h-16 text-muted-foreground/30" />
          <p className="text-xl font-semibold text-foreground">No favorites yet</p>
          <p className="text-muted-foreground text-sm max-w-xs">
            Tap the heart icon on any listing to save it here for later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {visibleListings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorited={true}
              onToggleFavorite={() => toggle(listing.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}