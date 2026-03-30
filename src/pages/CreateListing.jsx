import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Upload, X, Plus, AlertCircle, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const CATEGORIES = ['electronics','vehicles','clothing','home_garden','sports','toys','books','music','art','jewelry','collectibles','other'];
const CONDITIONS = ['new','like_new','good','fair','poor'];

export default function CreateListing() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    location: '',
    delivery_type: 'both',
    shipping_cost: '',
    allows_offers: true,
    auction_enabled: false,
    starting_bid: '',
    tags: '',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.verification_status !== 'verified') {
        toast.error('You must be verified to create listings.', { action: { label: 'Get Verified', onClick: () => navigate('/verification') } });
      }
    }).catch(() => base44.auth.redirectToLogin());
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 8) { toast.error('Max 8 images'); return; }
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImages(prev => [...prev, file_url]);
    }
    setUploading(false);
  };

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.category || !form.condition) {
      toast.error('Fill in all required fields'); return;
    }
    setSubmitting(true);
    const listing = await base44.entities.Listing.create({
      ...form,
      price: Number(form.price),
      shipping_cost: form.shipping_cost ? Number(form.shipping_cost) : 0,
      starting_bid: form.starting_bid ? Number(form.starting_bid) : undefined,
      images,
      seller_id: user.id,
      seller_name: user.full_name,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      status: 'active',
      view_count: 0,
    });
    toast.success('Listing created!');
    navigate(`/listing/${listing.id}`);
  };

  if (!user) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-syne text-3xl font-800 text-foreground mb-8">Create Listing</h1>

      {user.verification_status !== 'verified' && (
        <div className="flex gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive mb-6">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Verification Required</p>
            <p className="text-sm mt-1">You need to verify your identity before listing items.</p>
            <Button size="sm" variant="destructive" className="mt-2" onClick={() => navigate('/verification')}>
              Get Verified
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Images */}
        <div>
          <Label className="text-sm font-semibold text-foreground mb-3 block">Photos (up to 8)</Label>
          <div className="grid grid-cols-4 gap-3">
            {images.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {images.length < 8 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Add Photo</span>
                  </>
                )}
              </label>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold text-foreground mb-1.5 block">Title *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="What are you selling?" className="bg-secondary border-border focus:border-primary/50 rounded-xl" />
          </div>
          <div>
            <Label className="text-sm font-semibold text-foreground mb-1.5 block">Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe your item — condition details, size, features..."
              className="bg-secondary border-border focus:border-primary/50 rounded-xl resize-none" rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-foreground mb-1.5 block">Price ($) *</Label>
              <Input value={form.price} onChange={e => set('price', e.target.value)} type="number" min="0"
                placeholder="0.00" className="bg-secondary border-border focus:border-primary/50 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-foreground mb-1.5 block">Location</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)}
                placeholder="City, State" className="bg-secondary border-border focus:border-primary/50 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-foreground mb-1.5 block">Category *</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger className="bg-secondary border-border rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold text-foreground mb-1.5 block">Condition *</Label>
              <Select value={form.condition} onValueChange={v => set('condition', v)}>
                <SelectTrigger className="bg-secondary border-border rounded-xl">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {CONDITIONS.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Delivery */}
        <div>
          <Label className="text-sm font-semibold text-foreground mb-1.5 block">Delivery Options</Label>
          <Select value={form.delivery_type} onValueChange={v => set('delivery_type', v)}>
            <SelectTrigger className="bg-secondary border-border rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="local_pickup">Local Pickup Only</SelectItem>
              <SelectItem value="shipping">Shipping Only</SelectItem>
              <SelectItem value="both">Local Pickup & Shipping</SelectItem>
            </SelectContent>
          </Select>
          {(form.delivery_type === 'shipping' || form.delivery_type === 'both') && (
            <div className="mt-3">
              <Label className="text-sm text-muted-foreground mb-1.5 block">Shipping Cost ($) — 0 for free</Label>
              <Input value={form.shipping_cost} onChange={e => set('shipping_cost', e.target.value)} type="number" min="0"
                placeholder="0.00" className="bg-secondary border-border focus:border-primary/50 rounded-xl" />
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-4 p-4 rounded-xl bg-secondary/30 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Accept Offers</p>
              <p className="text-xs text-muted-foreground">Buyers can make offers below your price</p>
            </div>
            <Switch checked={form.allows_offers} onCheckedChange={v => set('allows_offers', v)} />
          </div>
        </div>

        {/* Tags */}
        <div>
          <Label className="text-sm font-semibold text-foreground mb-1.5 block">Tags (comma separated)</Label>
          <Input value={form.tags} onChange={e => set('tags', e.target.value)}
            placeholder="e.g. vintage, rare, signed" className="bg-secondary border-border focus:border-primary/50 rounded-xl" />
        </div>

        <Button type="submit" disabled={submitting || user.verification_status !== 'verified'}
          className="w-full h-12 bg-primary text-primary-foreground text-base font-semibold rounded-xl hover:bg-primary/90">
          {submitting ? 'Creating...' : 'Publish Listing'}
        </Button>
      </form>
    </div>
  );
}