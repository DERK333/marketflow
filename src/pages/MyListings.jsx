import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { PlusCircle, Edit2, Trash2, Eye, Tag, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  sold: 'bg-primary/20 text-primary border-primary/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  draft: 'bg-secondary text-muted-foreground border-border',
  removed: 'bg-destructive/20 text-destructive border-destructive/30',
};

export default function MyListings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const all = await base44.entities.Listing.filter({ seller_id: u.id }, '-created_date', 50);
      setListings(all);
    }).catch(() => base44.auth.redirectToLogin())
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    await base44.entities.Listing.update(id, { status });
    setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    toast.success(`Listing marked as ${status}`);
  };

  const deleteListing = async (id) => {
    await base44.entities.Listing.delete(id);
    setListings(prev => prev.filter(l => l.id !== id));
    toast.success('Listing deleted');
  };

  const filtered = filter === 'all' ? listings : listings.filter(l => l.status === filter);

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-syne text-3xl font-800 text-foreground">My Listings</h1>
        <div className="flex gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36 bg-card border-border rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-primary text-primary-foreground rounded-xl" onClick={() => navigate('/create-listing')}>
            <PlusCircle className="w-4 h-4 mr-2" /> New Listing
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
          <p className="font-semibold text-foreground">No listings yet</p>
          <p className="text-sm text-muted-foreground mt-1">Start selling by creating your first listing</p>
          <Button className="mt-4 bg-primary text-primary-foreground rounded-xl" onClick={() => navigate('/create-listing')}>
            Create Listing
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(listing => (
            <div key={listing.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-border/80 transition-colors">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary shrink-0">
                {listing.images?.[0] ? (
                  <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-foreground truncate">{listing.title}</h3>
                  <Badge className={`text-xs border ${STATUS_COLORS[listing.status]} capitalize`}>{listing.status}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="text-primary font-semibold">${listing.price?.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{listing.view_count || 0}</span>
                  <span>{format(new Date(listing.created_date), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/listing/${listing.id}`)}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/edit-listing/${listing.id}`)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                {listing.status === 'active' && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => updateStatus(listing.id, 'sold')}>
                    <Tag className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteListing(listing.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}