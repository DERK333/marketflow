import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, Truck, MapPin, CreditCard, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const PLATFORM_FEE_PERCENT = 0.05; // 5%

export default function Checkout() {
  const { id: listingId } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  useEffect(() => {
    Promise.all([
      base44.entities.Listing.filter({ id: listingId }),
      base44.auth.me().catch(() => null),
    ]).then(([listings, u]) => {
      const l = listings[0];
      setListing(l);
      setUser(u);
      if (!u) { base44.auth.redirectToLogin(); return; }
      // Set default delivery method
      if (l?.delivery_type === 'local_pickup') setDeliveryMethod('local_pickup');
      else if (l?.delivery_type === 'shipping') setDeliveryMethod('shipping');
      else setDeliveryMethod('shipping');
    }).finally(() => setLoading(false));
  }, [listingId]);

  const shippingCost = deliveryMethod === 'shipping' ? (listing?.shipping_cost || 0) : 0;
  const subtotal = listing?.price || 0;
  const platformFee = Math.round(subtotal * PLATFORM_FEE_PERCENT * 100) / 100;
  const total = subtotal + shippingCost;

  const handlePlace = async () => {
    if (deliveryMethod === 'shipping' && !shippingAddress.trim()) {
      toast.error('Enter a shipping address');
      return;
    }
    setPlacing(true);
    await base44.entities.Transaction.create({
      listing_id: listing.id,
      listing_title: listing.title,
      buyer_id: user.id,
      buyer_name: user.full_name,
      seller_id: listing.seller_id,
      seller_name: listing.seller_name,
      amount: total,
      platform_fee: platformFee,
      seller_payout: total - platformFee,
      delivery_type: deliveryMethod,
      shipping_address: shippingAddress || undefined,
      status: 'payment_held',
    });
    // Mark listing as pending
    await base44.entities.Listing.update(listing.id, { status: 'pending' });
    setPlaced(true);
    setPlacing(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (placed) return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10 text-primary" />
      </div>
      <h1 className="font-syne text-3xl font-800 text-foreground">Order Placed!</h1>
      <p className="text-muted-foreground">Your payment is held securely by TradeVault until you confirm receipt.</p>
      <div className="flex gap-3 justify-center">
        <Button className="bg-primary text-primary-foreground rounded-xl" onClick={() => navigate('/orders')}>
          View Orders
        </Button>
        <Button variant="outline" className="border-border rounded-xl" onClick={() => navigate('/browse')}>
          Keep Shopping
        </Button>
      </div>
    </div>
  );

  if (!listing) return (
    <div className="text-center py-24 text-muted-foreground">Listing not found.</div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-syne text-3xl font-800 text-foreground mb-8">Checkout</h1>
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left */}
        <div className="space-y-6">
          {/* Item */}
          <div>
            <h2 className="font-semibold text-foreground mb-3">Item</h2>
            <div className="flex gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary shrink-0">
                {listing.images?.[0] ? (
                  <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-secondary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{listing.title}</p>
                <p className="text-sm text-muted-foreground mt-1">Seller: {listing.seller_name}</p>
                <p className="text-lg font-700 text-primary font-syne mt-1">${listing.price?.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Delivery */}
          {listing.delivery_type !== 'local_pickup' && listing.delivery_type !== 'shipping' ? (
            <div>
              <h2 className="font-semibold text-foreground mb-3">Delivery Method</h2>
              <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod} className="space-y-2">
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${deliveryMethod === 'shipping' ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                  <RadioGroupItem value="shipping" />
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Shipping</p>
                    <p className="text-xs text-muted-foreground">{listing.shipping_cost > 0 ? `+$${listing.shipping_cost}` : 'Free'}</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${deliveryMethod === 'local_pickup' ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                  <RadioGroupItem value="local_pickup" />
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Local Pickup</p>
                    <p className="text-xs text-muted-foreground">Free · {listing.location}</p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          ) : null}

          {deliveryMethod === 'shipping' && (
            <div>
              <Label className="text-sm font-semibold text-foreground mb-1.5 block">Shipping Address</Label>
              <Input value={shippingAddress} onChange={e => setShippingAddress(e.target.value)}
                placeholder="Street, City, State, ZIP" className="bg-secondary border-border rounded-xl" />
            </div>
          )}

          {/* Payment note */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
            <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Simulated checkout. In production this connects to Stripe. Your payment will be held in escrow until you confirm receipt.
            </p>
          </div>
        </div>

        {/* Right — Summary */}
        <div>
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4 sticky top-24">
            <h2 className="font-semibold text-foreground">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Item price</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>${shippingCost}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Platform fee (5%)</span>
                <span>${platformFee}</span>
              </div>
            </div>
            <Separator className="bg-border" />
            <div className="flex justify-between font-semibold text-foreground">
              <span>Total</span>
              <span className="text-primary font-syne text-xl">${total.toLocaleString()}</span>
            </div>
            <Button
              onClick={handlePlace}
              disabled={placing}
              className="w-full h-12 bg-primary text-primary-foreground text-base font-semibold rounded-xl hover:bg-primary/90"
            >
              {placing ? 'Placing Order...' : (
                <><Lock className="w-4 h-4 mr-2" /> Place Order Securely</>
              )}
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span>Protected by TradeVault escrow</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}