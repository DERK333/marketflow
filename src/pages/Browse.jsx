import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, SlidersHorizontal, X, ChevronDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import ListingCard from '@/components/listings/ListingCard';

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Vehicles', value: 'vehicles' },
  { label: 'Clothing', value: 'clothing' },
  { label: 'Home & Garden', value: 'home_garden' },
  { label: 'Sports', value: 'sports' },
  { label: 'Toys', value: 'toys' },
  { label: 'Books', value: 'books' },
  { label: 'Art', value: 'art' },
  { label: 'Collectibles', value: 'collectibles' },
  { label: 'Jewelry', value: 'jewelry' },
  { label: 'Music', value: 'music' },
  { label: 'Other', value: 'other' },
];

const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'];
const DELIVERY = [
  { label: 'All', value: '' },
  { label: 'Local Pickup', value: 'local_pickup' },
  { label: 'Shipping', value: 'shipping' },
  { label: 'Both', value: 'both' },
];

export default function Browse() {
  const urlParams = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(urlParams.get('q') || '');
  const [category, setCategory] = useState(urlParams.get('category') || '');
  const [locationFilter, setLocationFilter] = useState(urlParams.get('location') || '');
  const [sort, setSort] = useState(urlParams.get('sort') === 'newest' ? '-created_date' : '-view_count');
  const [delivery, setDelivery] = useState('');
  const [condition, setCondition] = useState('');
  const [maxPrice, setMaxPrice] = useState(Number(urlParams.get('maxPrice')) || 10000);
  const [minPrice, setMinPrice] = useState(Number(urlParams.get('minPrice')) || 0);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const filters = { status: 'active' };
    if (category) filters.category = category;
    if (delivery) filters.delivery_type = delivery;
    if (condition) filters.condition = condition;

    base44.entities.Listing.filter(filters, sort, 40)
      .then(results => {
        let filtered = results;
        if (query) {
          const q = query.toLowerCase();
          filtered = filtered.filter(l =>
            l.title?.toLowerCase().includes(q) ||
            l.description?.toLowerCase().includes(q) ||
            l.tags?.some(t => t.toLowerCase().includes(q))
          );
        }
        if (locationFilter) {
          const loc = locationFilter.toLowerCase();
          filtered = filtered.filter(l => l.location?.toLowerCase().includes(loc));
        }
        filtered = filtered.filter(l => l.price >= minPrice && l.price <= maxPrice);
        setListings(filtered);
      })
      .finally(() => setLoading(false));
  }, [query, category, sort, delivery, condition, maxPrice, minPrice, locationFilter]);

  const activeFilters = [
    category && CATEGORIES.find(c => c.value === category)?.label,
    delivery && DELIVERY.find(d => d.value === delivery)?.label,
    condition,
    locationFilter && `📍 ${locationFilter}`,
    minPrice > 0 && `Min $${minPrice}`,
  ].filter(Boolean);

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Category</h3>
        <div className="space-y-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                category === cat.value
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Condition</h3>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map(c => (
            <button
              key={c}
              onClick={() => setCondition(condition === c ? '' : c)}
              className={`px-3 py-1 rounded-full text-xs capitalize transition-colors ${
                condition === c
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {c.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Delivery</h3>
        <div className="space-y-1">
          {DELIVERY.map(d => (
            <button
              key={d.value}
              onClick={() => setDelivery(d.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                delivery === d.value
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Price Range</h3>
        <div className="flex items-center gap-2 mb-3">
          <Input value={minPrice || ''} onChange={e => setMinPrice(Number(e.target.value) || 0)}
            placeholder="Min $" type="number" min="0" className="bg-secondary border-border h-8 text-sm" />
          <span className="text-muted-foreground text-sm shrink-0">–</span>
          <Input value={maxPrice === 10000 ? '' : maxPrice} onChange={e => setMaxPrice(Number(e.target.value) || 10000)}
            placeholder="Max $" type="number" min="0" className="bg-secondary border-border h-8 text-sm" />
        </div>
        <Slider
          value={[maxPrice]}
          onValueChange={([v]) => setMaxPrice(v)}
          min={0} max={50000} step={100}
          className="w-full"
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Location</h3>
        <div className="relative">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
            placeholder="City, State..." className="pl-8 bg-secondary border-border h-8 text-sm" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search listings..."
            className="pl-9 bg-card border-border rounded-xl focus:border-primary/50"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40 bg-card border-border rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="-view_count">Most Popular</SelectItem>
            <SelectItem value="-created_date">Newest</SelectItem>
            <SelectItem value="price">Price: Low–High</SelectItem>
            <SelectItem value="-price">Price: High–Low</SelectItem>
          </SelectContent>
        </Select>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden border-border">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card border-border w-72">
            <SheetHeader>
              <SheetTitle className="text-foreground">Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4 overflow-y-auto">
              <FilterPanel />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {activeFilters.map(f => (
            <Badge key={f} className="bg-primary/20 text-primary border-primary/30 capitalize">
              {f}
            </Badge>
          ))}
          <button onClick={() => { setCategory(''); setDelivery(''); setCondition(''); setLocationFilter(''); setMinPrice(0); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="w-3 h-3" /> Clear all
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 hidden md:block">
          <FilterPanel />
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array(9).fill(0).map((_, i) => (
                <div key={i} className="h-64 rounded-xl bg-card animate-pulse" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-foreground">No listings found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-4">{listings.length} results</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {listings.map(listing => <ListingCard key={listing.id} listing={listing} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}