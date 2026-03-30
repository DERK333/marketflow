import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, Package, ShoppingBag, AlertTriangle, CheckCircle, XCircle, Eye, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partialAmounts, setPartialAmounts] = useState({});
  const [adminNotes, setAdminNotes] = useState({});
  const [stats, setStats] = useState({ users: 0, listings: 0, transactions: 0, pending: 0 });

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      if (u.role !== 'admin') { navigate('/'); return; }
      const [vrs, txs, lstgs, dsps] = await Promise.all([
        base44.entities.VerificationRequest.filter({}, '-created_date', 50),
        base44.entities.Transaction.filter({}, '-created_date', 20),
        base44.entities.Listing.filter({ status: 'active' }, '-created_date', 20),
        base44.entities.Dispute.filter({}, '-created_date', 50),
      ]);
      setVerifications(vrs);
      setTransactions(txs);
      setListings(lstgs);
      setDisputes(dsps);
      setStats({
        pending: vrs.filter(v => v.status === 'pending').length,
        transactions: txs.length,
        listings: lstgs.length,
      });
    }).catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, []);

  const reviewVerification = async (vr, status, note = '') => {
    await base44.entities.VerificationRequest.update(vr.id, {
      status,
      admin_notes: note || undefined,
      reviewed_at: new Date().toISOString(),
    });
    // Update user verification_status
    const users = await base44.entities.User.filter({ id: vr.user_id });
    if (users[0]) await base44.entities.User.update(users[0].id, { verification_status: status === 'approved' ? 'verified' : 'rejected' });
    setVerifications(prev => prev.map(v => v.id === vr.id ? { ...v, status } : v));
    toast.success(`Verification ${status}`);
  };

  const removeListing = async (id) => {
    await base44.entities.Listing.update(id, { status: 'removed' });
    setListings(prev => prev.filter(l => l.id !== id));
    toast.success('Listing removed');
  };

  const resolveDispute = async (dispute, resolution, refundAmount = null) => {
    const txStatus = resolution === 'resolved_buyer' ? 'refunded' : 'completed';
    const note = adminNotes[dispute.id] || '';
    await Promise.all([
      base44.entities.Dispute.update(dispute.id, {
        status: resolution,
        admin_notes: note || undefined,
        refund_amount: refundAmount || undefined,
        resolved_at: new Date().toISOString(),
      }),
      base44.entities.Transaction.update(dispute.transaction_id, { status: txStatus, notes: note || undefined }),
    ]);
    setDisputes(prev => prev.map(d => d.id === dispute.id ? { ...d, status: resolution } : d));
    toast.success(resolution === 'resolved_buyer' ? 'Refund issued to buyer' : 'Funds released to seller');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!user || user.role !== 'admin') return null;

  const pendingVerifications = verifications.filter(v => v.status === 'pending');
  const disputedTx = transactions.filter(t => t.status === 'disputed');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <h1 className="font-syne text-3xl font-800 text-foreground">Admin Panel</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pending Verifications', value: stats.pending, color: 'text-yellow-400', icon: AlertTriangle },
          { label: 'Total Transactions', value: stats.transactions, color: 'text-primary', icon: ShoppingBag },
          { label: 'Active Listings', value: stats.listings, color: 'text-green-400', icon: Package },
          { label: 'Open Disputes', value: disputes.filter(d => d.status === 'open' || d.status === 'under_review').length, color: 'text-destructive', icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="p-4 rounded-xl bg-card border border-border">
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <p className={`font-syne text-2xl font-800 ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="verifications">
        <TabsList className="bg-card border border-border mb-6">
          <TabsTrigger value="verifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Verifications {pendingVerifications.length > 0 && `(${pendingVerifications.length} pending)`}
          </TabsTrigger>
          <TabsTrigger value="disputes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Disputes {disputes.filter(d => d.status === 'open' || d.status === 'under_review').length > 0 && `(${disputes.filter(d => d.status === 'open' || d.status === 'under_review').length})`}
          </TabsTrigger>
          <TabsTrigger value="listings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Listings
          </TabsTrigger>
        </TabsList>

        {/* Verifications */}
        <TabsContent value="verifications" className="space-y-4">
          {verifications.length === 0 && <p className="text-muted-foreground text-center py-12">No verification requests.</p>}
          {verifications.map(vr => (
            <div key={vr.id} className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{vr.user_name}</p>
                    <Badge className={
                      vr.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      vr.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      'bg-destructive/20 text-destructive border-destructive/30'
                    }>{vr.status}</Badge>
                    <Badge className="bg-secondary text-muted-foreground border-border capitalize">{vr.account_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{vr.user_email}</p>
                  {vr.business_name && <p className="text-sm text-muted-foreground">Business: {vr.business_name}</p>}
                  <p className="text-xs text-muted-foreground">{format(new Date(vr.created_date), 'MMM d, yyyy h:mm a')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {vr.id_document_url && (
                    <a href={vr.id_document_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="border-border rounded-lg h-8 text-xs">
                        <Eye className="w-3 h-3 mr-1" /> View ID
                      </Button>
                    </a>
                  )}
                  {vr.status === 'pending' && (
                    <>
                      <Button size="sm" className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 rounded-lg h-8 text-xs"
                        onClick={() => reviewVerification(vr, 'approved')}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg h-8 text-xs"
                        onClick={() => reviewVerification(vr, 'rejected', 'Documents unclear')}>
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Disputes */}
        <TabsContent value="disputes" className="space-y-4">
          {disputes.length === 0 && <p className="text-muted-foreground text-center py-12">No disputes filed.</p>}
          {disputes.map(dispute => {
            const isOpen = dispute.status === 'open' || dispute.status === 'under_review';
            const REASON_LABELS = {
              item_not_received: 'Item not received',
              item_not_as_described: 'Not as described',
              damaged_item: 'Damaged item',
              wrong_item: 'Wrong item',
              other: 'Other',
            };
            const STATUS_COLORS = {
              open: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
              under_review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
              resolved_buyer: 'bg-green-500/20 text-green-400 border-green-500/30',
              resolved_seller: 'bg-primary/20 text-primary border-primary/30',
              closed: 'bg-secondary text-muted-foreground border-border',
            };
            return (
              <div key={dispute.id} className="p-5 rounded-xl bg-card border border-border space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{dispute.listing_title}</p>
                      <Badge className={`border text-xs ${STATUS_COLORS[dispute.status]}`}>{dispute.status.replace('_', ' ')}</Badge>
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">{REASON_LABELS[dispute.reason]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Buyer: <span className="text-foreground">{dispute.buyer_name}</span> · Seller: <span className="text-foreground">{dispute.seller_name}</span></p>
                    <p className="text-xs text-muted-foreground">{format(new Date(dispute.created_date), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                  <p className="text-lg font-syne font-800 text-primary">${dispute.amount?.toLocaleString()}</p>
                </div>

                {/* Description */}
                {dispute.description && (
                  <div className="p-3 rounded-lg bg-secondary/50 text-sm text-foreground">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Buyer's statement:</p>
                    {dispute.description}
                  </div>
                )}

                {/* Evidence */}
                {dispute.evidence_urls?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5" /> Evidence ({dispute.evidence_urls.length} photo{dispute.evidence_urls.length !== 1 ? 's' : ''})
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {dispute.evidence_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="w-20 h-20 rounded-lg overflow-hidden border border-border bg-secondary block hover:opacity-80 transition-opacity">
                          <img src={url} alt={`Evidence ${i+1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin actions */}
                {isOpen && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <Textarea
                      value={adminNotes[dispute.id] || ''}
                      onChange={e => setAdminNotes(prev => ({ ...prev, [dispute.id]: e.target.value }))}
                      placeholder="Admin notes (visible on resolution)..."
                      className="bg-secondary border-border resize-none text-sm"
                      rows={2}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-40">
                        <span className="text-xs text-muted-foreground shrink-0">Partial refund $</span>
                        <Input
                          type="number" min="0" max={dispute.amount}
                          value={partialAmounts[dispute.id] || ''}
                          onChange={e => setPartialAmounts(prev => ({ ...prev, [dispute.id]: e.target.value }))}
                          placeholder={`Max $${dispute.amount}`}
                          className="bg-secondary border-border h-8 text-sm"
                        />
                        <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 rounded-lg h-8 text-xs shrink-0"
                          onClick={() => resolveDispute(dispute, 'resolved_buyer', Number(partialAmounts[dispute.id]))}>
                          Issue Partial
                        </Button>
                      </div>
                      <Button size="sm" className="bg-primary text-primary-foreground rounded-lg h-8 text-xs"
                        onClick={() => resolveDispute(dispute, 'resolved_seller')}>
                        Release to Seller
                      </Button>
                      <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg h-8 text-xs"
                        onClick={() => resolveDispute(dispute, 'resolved_buyer', dispute.amount)}>
                        Full Refund
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>

        {/* Listings */}
        <TabsContent value="listings" className="space-y-3">
          {listings.map(l => (
            <div key={l.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0">
                {l.images?.[0] && <img src={l.images[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{l.title}</p>
                <p className="text-xs text-muted-foreground">{l.seller_name} · ${l.price?.toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate(`/listing/${l.id}`)}>
                  <Eye className="w-3 h-3 mr-1" /> View
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => removeListing(l.id)}>
                  <XCircle className="w-3 h-3 mr-1" /> Remove
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}