import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Package, ShoppingBag, Truck, CheckCircle, Clock, AlertCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  pending_payment: { label: 'Pending Payment', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  payment_held: { label: 'Payment Held', color: 'bg-primary/20 text-primary border-primary/30', icon: ShoppingBag },
  shipped: { label: 'Shipped', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-accent/20 text-accent border-accent/30', icon: Package },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  disputed: { label: 'Disputed', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: AlertCircle },
  refunded: { label: 'Refunded', color: 'bg-secondary text-muted-foreground border-border', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-secondary text-muted-foreground border-border', icon: AlertCircle },
};

export default function Orders() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewingTx, setReviewingTx] = useState(null);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const [buys, sells, ofrs] = await Promise.all([
        base44.entities.Transaction.filter({ buyer_id: u.id }, '-created_date', 20),
        base44.entities.Transaction.filter({ seller_id: u.id }, '-created_date', 20),
        base44.entities.Offer.filter({ seller_id: u.id, status: 'pending' }, '-created_date', 20),
      ]);
      setPurchases(buys);
      setSales(sells);
      setOffers(ofrs);
    }).catch(() => base44.auth.redirectToLogin())
      .finally(() => setLoading(false));
  }, []);

  const confirmDelivery = async (tx) => {
    await base44.entities.Transaction.update(tx.id, { status: 'completed' });
    setPurchases(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'completed' } : t));
    toast.success('Delivery confirmed! Funds released to seller.');
  };

  const handleOfferResponse = async (offer, response) => {
    await base44.entities.Offer.update(offer.id, { status: response });
    setOffers(prev => prev.filter(o => o.id !== offer.id));
    toast.success(`Offer ${response}`);
  };

  const submitReview = async () => {
    if (!reviewingTx) return;
    await base44.entities.Review.create({
      reviewer_id: user.id,
      reviewer_name: user.full_name,
      reviewed_user_id: reviewingTx.seller_id,
      listing_id: reviewingTx.listing_id,
      transaction_id: reviewingTx.id,
      rating: reviewRating,
      comment: reviewComment,
      role: 'buyer',
    });
    toast.success('Review submitted!');
    setReviewingTx(null);
    setReviewComment('');
    setReviewRating(5);
  };

  const TransactionRow = ({ tx, isBuyer }) => {
    const config = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending_payment;
    const Icon = config.icon;
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{tx.listing_title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="text-primary font-semibold">${tx.amount?.toLocaleString()}</span>
            <span>{isBuyer ? `Seller: ${tx.seller_name}` : `Buyer: ${tx.buyer_name}`}</span>
            <span>{format(new Date(tx.created_date), 'MMM d, yyyy')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`border text-xs ${config.color}`}>
            <Icon className="w-3 h-3 mr-1" />{config.label}
          </Badge>
          {isBuyer && tx.status === 'delivered' && (
            <Button size="sm" className="bg-primary text-primary-foreground rounded-lg h-7 text-xs" onClick={() => confirmDelivery(tx)}>
              Confirm Receipt
            </Button>
          )}
          {isBuyer && tx.status === 'completed' && (
            <Dialog onOpenChange={(o) => { if (!o) { setReviewingTx(null); setReviewComment(''); setReviewRating(5); } }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-border rounded-lg h-7 text-xs" onClick={() => setReviewingTx(tx)}>
                  <Star className="w-3 h-3 mr-1" /> Review
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Leave a Review</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setReviewRating(n)}>
                        <Star className={`w-7 h-7 ${n <= reviewRating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                    placeholder="Share your experience..." className="bg-secondary border-border resize-none" rows={3} />
                  <Button onClick={submitReview} className="w-full bg-primary text-primary-foreground">Submit Review</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-syne text-3xl font-800 text-foreground mb-6">Orders & Offers</h1>
      <Tabs defaultValue="purchases">
        <TabsList className="bg-card border border-border mb-6">
          <TabsTrigger value="purchases" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Purchases ({purchases.length})
          </TabsTrigger>
          <TabsTrigger value="sales" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Sales ({sales.length})
          </TabsTrigger>
          <TabsTrigger value="offers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Offers {offers.length > 0 && `(${offers.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-3">
          {purchases.length === 0 ? <p className="text-muted-foreground text-center py-12">No purchases yet.</p>
            : purchases.map(tx => <TransactionRow key={tx.id} tx={tx} isBuyer={true} />)}
        </TabsContent>

        <TabsContent value="sales" className="space-y-3">
          {sales.length === 0 ? <p className="text-muted-foreground text-center py-12">No sales yet.</p>
            : sales.map(tx => <TransactionRow key={tx.id} tx={tx} isBuyer={false} />)}
        </TabsContent>

        <TabsContent value="offers" className="space-y-3">
          {offers.length === 0 ? <p className="text-muted-foreground text-center py-12">No pending offers.</p>
            : offers.map(offer => (
              <div key={offer.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{offer.listing_title}</p>
                  <p className="text-xs text-muted-foreground mt-1">From {offer.buyer_name} · Offer: <span className="text-primary font-semibold">${offer.amount?.toLocaleString()}</span></p>
                  {offer.message && <p className="text-xs text-muted-foreground mt-1 italic">"{offer.message}"</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" className="bg-primary text-primary-foreground rounded-lg h-8 text-xs" onClick={() => handleOfferResponse(offer, 'accepted')}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" className="border-border rounded-lg h-8 text-xs" onClick={() => handleOfferResponse(offer, 'declined')}>
                    Decline
                  </Button>
                </div>
              </div>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}