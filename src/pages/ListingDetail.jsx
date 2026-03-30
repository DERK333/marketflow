import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  MapPin, Package, Shield, Star, MessageSquare, Tag,
  ChevronLeft, ChevronRight, Truck, Clock, AlertCircle, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CONDITION_LABELS = {
  new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor'
};

export default function ListingDetail() {
  const { id: listingId } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [seller, setSeller] = useState(null);
  const [user, setUser] = useState(null);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [currentImg, setCurrentImg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);
  const [msgContent, setMsgContent] = useState('');
  const [msgOpen, setMsgOpen] = useState(false);
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
      // increment view count
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
    toast.success('Offer sent!');
    setOfferOpen(false);
    setOfferAmount('');
    setOfferMessage('');
    setSubmitting(false);
  };

  const handleMessage = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    if (!msgContent.trim()) { toast.error('Write a message first'); return; }
    setSubmitting(true);
    const convId = [user.id, listing.seller_id].sort().join('_') + '_' + listing.id;
    await base44.entities.Message.create({
      conversation_id: convId,
      sender_id: user.id,
      sender_name: user.full_name,
      recipient_id: listing.seller_id,
      listing_id: listing.id,
      listing_title: listing.title,
      content: msgContent,
    });
    toast.success('Message sent!');
    setMsgOpen(false);
    setMsgContent('');
    setSubmitting(false);
  };

  const handleBuy = () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    navigate(`/checkout/${listing.id}`);
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-2xl bg-card animate-pulse" />
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => <div key={i} className="h-8 rounded bg-card animate-pulse" />)}
        </div>
      </div>
    </div>
  );

  if (!listing) return (
    <div className="text-center py-24">
      <p className="text-muted-foreground">Listing not found.</p>
      <Button onClick={() => navigate('/browse')} className="mt-4">Browse Listings</Button>
    </div>
  );

  const images = listing.images?.length > 0 ? listing.images : [];
  const isSeller = user?.id === listing.seller_id;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border">
            {images.length > 0 ? (
              <img src={images[currentImg]} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-20 h-20 text-muted-foreground/20" />
              </div>
            )}
            {images.length > 1 && (
              <>
                <button onClick={() => setCurrentImg(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button onClick={() => setCurrentImg(i => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button key={i} onClick={() => setCurrentImg(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${currentImg === i ? 'border-primary' : 'border-border'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <div className="flex gap-2 mb-2 flex-wrap">
              <Badge className="bg-secondary text-muted-foreground border-border capitalize">{listing.category?.replace('_', ' ')}</Badge>
              <Badge className={listing.condition === 'new' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-primary/20 text-primary border-primary/30'}>
                {CONDITION_LABELS[listing.condition]}
              </Badge>
              {listing.auction_enabled && <Badge className="bg-accent/20 text-accent border-accent/30">Auction</Badge>}
            </div>
            <h1 className="font-syne text-3xl font-800 text-foreground">{listing.title}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-syne text-4xl font-800 text-primary">${listing.price?.toLocaleString()}</span>
            {listing.allows_offers && <span className="text-sm text-muted-foreground">· Offers accepted</span>}
          </div>

          {listing.location && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="w-4 h-4" />
              <span>{listing.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            {listing.delivery_type === 'shipping' || listing.delivery_type === 'both' ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Truck className="w-4 h-4" />
                <span>Shipping available {listing.shipping_cost > 0 ? `· $${listing.shipping_cost}` : '· Free'}</span>
              </div>
            ) : null}
            {listing.delivery_type === 'local_pickup' || listing.delivery_type === 'both' ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Local pickup</span>
              </div>
            ) : null}
          </div>

          <Separator className="bg-border" />

          {/* Seller */}
          {seller && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 border border-border">
              <Avatar className="w-12 h-12">
                <AvatarImage src={seller.avatar_url} />
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {seller.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground truncate">{seller.full_name}</span>
                  {seller.verification_status === 'verified' && (
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {seller.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-primary text-primary" />
                      {seller.rating.toFixed(1)} ({seller.total_reviews} reviews)
                    </span>
                  )}
                  {seller.total_sales > 0 && <span>· {seller.total_sales} sales</span>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/profile/${seller.id}`)}>View</Button>
            </div>
          )}

          {/* Actions */}
          {listing.status === 'active' && !isSeller && (
            <div className="space-y-3">
              <Button onClick={handleBuy} className="w-full h-12 bg-primary text-primary-foreground text-base font-semibold rounded-xl hover:bg-primary/90">
                Buy Now · ${listing.price?.toLocaleString()}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                {listing.allows_offers && (
                  <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-11 border-border rounded-xl">
                        <Tag className="w-4 h-4 mr-2" /> Make Offer
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Make an Offer</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div>
                          <label className="text-sm text-muted-foreground mb-1.5 block">Offer Amount ($)</label>
                          <Input value={offerAmount} onChange={e => setOfferAmount(e.target.value)}
                            placeholder={`Listed at $${listing.price}`}
                            type="number" className="bg-secondary border-border" />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-1.5 block">Message (optional)</label>
                          <Textarea value={offerMessage} onChange={e => setOfferMessage(e.target.value)}
                            placeholder="Why are you offering this amount?"
                            className="bg-secondary border-border resize-none" rows={3} />
                        </div>
                        <Button onClick={handleOffer} disabled={submitting} className="w-full bg-primary text-primary-foreground">
                          {submitting ? 'Sending...' : 'Send Offer'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-11 border-border rounded-xl">
                      <MessageSquare className="w-4 h-4 mr-2" /> Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Message Seller</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <p className="text-sm text-muted-foreground">About: {listing.title}</p>
                      <Textarea value={msgContent} onChange={e => setMsgContent(e.target.value)}
                        placeholder="Ask about the item..."
                        className="bg-secondary border-border resize-none" rows={4} />
                      <Button onClick={handleMessage} disabled={submitting} className="w-full bg-primary text-primary-foreground">
                        {submitting ? 'Sending...' : 'Send Message'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}

          {isSeller && (
            <Button onClick={() => navigate(`/edit-listing/${listing.id}`)} variant="outline" className="w-full border-border rounded-xl">
              Edit Listing
            </Button>
          )}

          {listing.status !== 'active' && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">This listing is no longer available</span>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="font-semibold text-foreground mb-2">Description</h3>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{listing.description || 'No description provided.'}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>Payment protected by TradeVault escrow</span>
          </div>
        </div>
      </div>

      {/* Reviews */}
      {sellerReviews.length > 0 && (
        <div className="mt-12">
          <h2 className="font-syne text-2xl font-700 text-foreground mb-4">Seller Reviews</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {sellerReviews.map(review => (
              <div key={review.id} className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-1 mb-2">
                  {Array(5).fill(0).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">{review.reviewer_name}</span>
                </div>
                <p className="text-sm text-foreground">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}