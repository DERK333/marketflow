import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Returns the current user's favorites set and a toggle function.
 * favoriteMap: { [listing_id]: favorite_record_id }
 */
export function useFavorites(user) {
  const [favoriteMap, setFavoriteMap] = useState({});

  useEffect(() => {
    if (!user) return;
    base44.entities.Favorite.filter({ user_id: user.id })
      .then(favs => {
        const map = {};
        favs.forEach(f => { map[f.listing_id] = f.id; });
        setFavoriteMap(map);
      })
      .catch(() => {});
  }, [user?.id]);

  const toggle = async (listingId) => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    if (favoriteMap[listingId]) {
      // Remove
      const recordId = favoriteMap[listingId];
      setFavoriteMap(prev => { const n = { ...prev }; delete n[listingId]; return n; });
      await base44.entities.Favorite.delete(recordId);
    } else {
      // Add
      const fav = await base44.entities.Favorite.create({ user_id: user.id, listing_id: listingId });
      setFavoriteMap(prev => ({ ...prev, [listingId]: fav.id }));
    }
  };

  return { favoriteMap, toggle };
}