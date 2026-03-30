import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  MapPin, Package, Shield, Star, Tag,
  ChevronLeft, Truck, AlertCircle, CheckCircle, Eye, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import ImageGallery from '@/components/listing-detail/ImageGallery';
import SellerCard from '@/components/listing-detail/SellerCard';
import AskSellerThread from '@/components/listing-detail/AskSellerThread';

const CONDITION_LABELS = { new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor' };
const CONDITION_COLORS = {
  new: 'bg-green-500/20 text-green-400 border-green-500/30',
  like_new: 'bg-primary/20 text-primary border-primary/30',
  good: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  fair: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  poor: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function ListingDetail() {
  const { id: listingId } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [seller, setSeller] = useState(null);
  const [user, setUser] = useState(null);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Listing.filter({ id: listingId }),
      base44.auth.me().catch(() => null),
    ]).then(async ([listings, u]) => {
      const l = listings[0];
      setListing(l);
      setUser(u);
      if (l?.seller_id) {
        const [users, reviews] = await Promise.all([
          base44.entities.User.filter({ id: l.seller_id }),
          base44.entities.Review.filter({ reviewed_user_id: l.seller_id }, '-created_date', 10),
        ]);
        setSeller(users[0] || null);
        setSellerReviews(reviews);
      }
      if (l) base44.entities.Listing.update(l.id, { view_count: (l.view_count || 0) + 1 }).catch(() => {});
    }).finally(() => setLoading(false));
  }, [listingId]);

  const handleOffer = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    if (!offerAmount || isNaN(offerAmount) || Number(offerAmount) <= 0) {
      toast.error('Enter a valid offer amount');
      return;
    }
    setSubmitting(true);
    await base44.entities.Offer.create({
      listing_id: listing.id,
      listing_title: listing.title,
      buyer_id: user.id,
      buyer_name: user.full_name,
      seller_id: listing.seller_id,
      amount: Number(offerAmount),
      message: offerMessage,
    });
    toast.success('Offer sent! The seller will respond shortly.');
    setOfferOpen(false);
    setOfferAmount('');
    setOfferMessage('');
    setSubmitting(false);
  };

  const handleBuy = () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    navigate(`/checkout/${listing.id}`);
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid lg:grid-cols-[1fr_420px] gap-10">
        <div className="space-y-4">
          <div className="aspect-[4/3] rounded-2xl bg-card animate-pulse" />
          <div className="grid grid-cols-4 gap-2">
            {Array(4).fill(0).map((_, i) => <div key={i} className="aspect-square rounded-xl bg-card animate-pulse" />)}
          </div>
        </div>
        <div className="space-y-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="h-8 rounded-lg bg-card animate-pulse" />)}
        </div>
      </div>
    </div>
  );

  if (!listing) return (
    <div className="text-center py-24">
      <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
      <p className="text-lg text-muted-foreground mb-4">This listing could not be found.</p>
      <Button onClick={() => navigate('/browse')}>Browse Listings</Button>
    </div>
  );

  const isSeller = user?.id === listing.seller_id;
  const isActive = listing.status === 'active';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <span>/</span>
        <Link to="/browse" className="hover:text-foreground transition-colors">Browse</Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-48">{listing.title}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_420px] gap-10 items-start">
        {/* Left: images + description + reviews */}
        <div className="space-y-8">
          <ImageGallery images={listing.images} title={listing.title} />

          {/* Description */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-syne text-xl font-700 text-foreground mb-3">Description</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">
              {listing.description || 'No description provided.'}
            </p>

            {listing.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                {listing.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs border-border text-muted-foreground">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Message thread */}
          <AskSellerThread listing={listing} user={user} seller={seller} />

          {/* Seller Reviews */}
          {sellerReviews.length > 0 && (
            <div>
              <h2 className="font-syne text-xl font-700 text-foreground mb-4">
                Seller Reviews
                <span className="text-base font-normal text-muted-foreground ml-2">({sellerReviews.length})</span>
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {sellerReviews.map(review => (
                  <div key={review.id} className="p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-1 mb-2">
                      {Array(5).fill(0).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-primary text-primary' : 'text-muted-foreground/20'}`} />
                      ))}
                      <span className="text-sm font-medium text-foreground ml-2">{review.reviewer_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      {review.created_date && formatDistanceToNow(new Date(review.created_date), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: sticky details panel */}
        <div className="space-y-5 lg:sticky lg:top-6">
          {/* Title + price */}
          <div>
            <div className="flex gap-2 mb-3 flex-wrap">
              <Badge className="bg-secondary text-muted-foreground border-border capitalize">
                {listing.category?.replace(/_/g, ' ')}
              </Badge>
              <Badge className={CONDITION_COLORS[listing.condition] || 'bg-secondary text-muted-foreground'}>
                {CONDITION_LABELS[listing.condition]}
              </Badge>
              {listing.auction_enabled && <Badge className="bg-accent/20 text-accent border-accent/30">Auction</Badge>}
            </div>
            <h1 className="font-syne text-2xl font-800 text-foreground leading-snug">{listing.title}</h1>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span>{listing.view_count || 0} views</span>
              {listing.created_date && (
                <>
                  <span>·</span>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Listed {formatDistanceToNow(new Date(listing.created_date), { addSuffix: true })}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-syne text-4xl font-800 text-primary">${listing.price?.toLocaleString()}</span>
            {listing.allows_offers && (
              <span className="text-sm text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Offers welcome
              </span>
            )}
          </div>

          {/* Delivery */}
          <div className="flex flex-wrap gap-3 text-sm">
            {(listing.delivery_type === 'shipping' || listing.delivery_type === 'both') && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-muted-foreground">
                <Truck className="w-3.5 h-3.5" />
                <span>Ships · {listing.shipping_cost > 0 ? `$${listing.shipping_cost}` : 'Free'}</span>
              </div>
            )}
            {(listing.delivery_type === 'local_pickup' || listing.delivery_type === 'both') && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>Local pickup</span>
              </div>
            )}
          </div>

          <Separator className="bg-border" />

          {/* Actions */}
          {!isActive && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">This listing is no longer available</span>
            </div>
          )}

          {isActive && !isSeller && (
            <div className="space-y-3">
              <Button onClick={handleBuy}
                className="w-full h-12 bg-primary text-primary-foreground text-base font-semibold rounded-xl hover:bg-primary/90">
                Buy Now · ${listing.price?.toLocaleString()}
              </Button>

              {listing.allows_offers && (
                <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-11 border-border rounded-xl">
                      <Tag className="w-4 h-4 mr-2" /> Make an Offer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Make an Offer</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground -mt-1">for <span className="text-foreground font-medium">{listing.title}</span></p>
                    <div className="space-y-4 mt-2">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Your Offer Amount ($)</label>
                        <Input value={offerAmount} onChange={e => setOfferAmount(e.target.value)}
                          placeholder={`Listed at $${listing.price?.toLocaleString()}`}
                          type="number" className="bg-secondary border-border" />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Message to Seller (optional)</label>
                        <Textarea value={offerMessage} onChange={e => setOfferMessage(e.target.value)}
                          placeholder="Explain your offer or ask a question…"
                          className="bg-secondary border-border resize-none" rows={3} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-3 rounded-lg bg-secondary">
                        <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>If accepted, payment is processed securely through TradeVault escrow.</span>
                      </div>
                      <Button onClick={handleOffer} disabled={submitting} className="w-full bg-primary text-primary-foreground">
                        {submitting ? 'Sending…' : 'Send Offer'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span>Secure payment · TradeVault escrow protection</span>
              </div>
            </div>
          )}

          {isSeller && (
            <Button onClick={() => navigate(`/my-listings`)} variant="outline" className="w-full border-border rounded-xl">
              Manage My Listings
            </Button>
          )}

          <SellerCard seller={seller} listingLocation={listing.location} />
        </div>
      </div>
    </div>
  );
}