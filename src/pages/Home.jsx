import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, ArrowRight, Shield, Zap, Star, TrendingUp, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ListingCard from '@/components/listings/ListingCard';

const CATEGORIES = [
  { label: 'Electronics', value: 'electronics', icon: '💻' },
  { label: 'Vehicles', value: 'vehicles', icon: '🚗' },
  { label: 'Clothing', value: 'clothing', icon: '👗' },
  { label: 'Home & Garden', value: 'home_garden', icon: '🏡' },
  { label: 'Sports', value: 'sports', icon: '⚽' },
  { label: 'Toys', value: 'toys', icon: '🧸' },
  { label: 'Books', value: 'books', icon: '📚' },
  { label: 'Art', value: 'art', icon: '🎨' },
  { label: 'Collectibles', value: 'collectibles', icon: '🏆' },
  { label: 'Jewelry', value: 'jewelry', icon: '💎' },
  { label: 'Music', value: 'music', icon: '🎵' },
  { label: 'Other', value: 'other', icon: '📦' },
];

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [featured, setFeatured] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Listing.filter({ status: 'active' }, '-view_count', 8),
      base44.entities.Listing.filter({ status: 'active' }, '-created_date', 8),
    ]).then(([feat, rec]) => {
      setFeatured(feat);
      setRecent(rec);
    }).finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5 pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1.5 text-sm">
            🔒 Verified sellers only · Escrow payments
          </Badge>
          <h1 className="font-syne text-5xl md:text-7xl font-800 leading-tight">
            The Premium
            <span className="text-gold block">Marketplace</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Buy and sell anything — locally or shipped. Every seller verified, every payment protected.
          </p>
          <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="What are you looking for?"
                className="pl-12 h-14 text-base bg-card border-border rounded-2xl focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" className="h-14 px-8 bg-primary text-primary-foreground rounded-2xl text-base font-semibold hover:bg-primary/90">
              Search
            </Button>
          </form>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
            {['Electronics', 'Vehicles', 'Clothing', 'Collectibles'].map(cat => (
              <button key={cat} onClick={() => navigate(`/browse?category=${cat.toLowerCase()}`)}
                className="px-3 py-1 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-secondary-foreground">
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-10 px-4 border-y border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Shield, label: 'ID Verified Sellers', color: 'text-primary' },
            { icon: Zap, label: 'Escrow Protection', color: 'text-accent' },
            { icon: Star, label: 'Buyer Reviews', color: 'text-yellow-400' },
            { icon: TrendingUp, label: 'Fair Pricing', color: 'text-green-400' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-syne text-2xl font-700 text-foreground">Browse Categories</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => navigate(`/browse?category=${cat.value}`)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-secondary/50 transition-all group"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-6 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-syne text-2xl font-700 text-foreground">Featured Listings</h2>
          <Button variant="ghost" className="text-primary hover:text-primary/80" onClick={() => navigate('/browse')}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map(listing => <ListingCard key={listing.id} listing={listing} />)}
          </div>
        )}
      </section>

      {/* Recent */}
      <section className="py-6 px-4 max-w-7xl mx-auto pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-syne text-2xl font-700 text-foreground">Recently Listed</h2>
          <Button variant="ghost" className="text-primary hover:text-primary/80" onClick={() => navigate('/browse?sort=newest')}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recent.map(listing => <ListingCard key={listing.id} listing={listing} />)}
          </div>
        )}
      </section>
    </div>
  );
}