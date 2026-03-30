import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  { label: 'All Categories', value: '' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Vehicles', value: 'vehicles' },
  { label: 'Clothing', value: 'clothing' },
  { label: 'Home & Garden', value: 'home_garden' },
  { label: 'Sports', value: 'sports' },
  { label: 'Toys', value: 'toys' },
  { label: 'Books', value: 'books' },
  { label: 'Music', value: 'music' },
  { label: 'Art', value: 'art' },
  { label: 'Jewelry', value: 'jewelry' },
  { label: 'Collectibles', value: 'collectibles' },
  { label: 'Other', value: 'other' },
];

export default function NavSearch({ className = '' }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category) params.set('category', category);
    if (location.trim()) params.set('location', location.trim());
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    setExpanded(false);
    navigate(`/browse?${params.toString()}`);
  };

  const hasFilters = category || location || minPrice || maxPrice;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Main search bar */}
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder="Search listings..."
            className="pl-9 pr-24 bg-muted border-border focus:border-primary/50 rounded-xl h-9"
          />
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className={`absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
              hasFilters
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            {hasFilters ? 'Filtered' : 'Filters'}
          </button>
          <button type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
            <ChevronDown className="w-3.5 h-3.5 rotate-[-90deg]" />
          </button>
        </div>
      </form>

      {/* Dropdown filter panel */}
      {expanded && (
        <div className="absolute top-full mt-2 left-0 right-0 min-w-[340px] bg-card border border-border rounded-2xl shadow-2xl z-50 p-4 space-y-4">
          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Category</label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.slice(0, 7).map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value === category ? '' : cat.value)}
                  className={`px-2 py-1.5 text-xs rounded-lg border transition-all text-left truncate ${
                    category === cat.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
              {CATEGORIES.slice(7).map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value === category ? '' : cat.value)}
                  className={`px-2 py-1.5 text-xs rounded-lg border transition-all text-left truncate ${
                    category === cat.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Price Range</label>
            <div className="flex items-center gap-2">
              <Input
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                placeholder="Min $"
                type="number"
                min="0"
                className="bg-secondary border-border h-8 text-sm"
              />
              <span className="text-muted-foreground text-sm shrink-0">to</span>
              <Input
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                placeholder="Max $"
                type="number"
                min="0"
                className="bg-secondary border-border h-8 text-sm"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Location</label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="City, State..."
                className="pl-8 bg-secondary border-border h-8 text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => { setCategory(''); setLocation(''); setMinPrice(''); setMaxPrice(''); }}
            >
              Clear filters
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 bg-primary text-primary-foreground"
              onClick={handleSubmit}
            >
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Search
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}