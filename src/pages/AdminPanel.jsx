import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, Package, ShoppingBag, AlertTriangle, CheckCircle, XCircle, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ViewDocButton from '@/components/admin/ViewDocButton';
import DisputeCard from '@/components/admin/DisputeCard';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const reviewVerification = async (vr, status) => {
    const note = adminNotes[vr.id] || '';
    await base44.entities.VerificationRequest.update(vr.id, {
      status,
      admin_notes: note || undefined,
      reviewed_at: new Date().toISOString(),
    });
    // Update user verification_status
    const users = await base44.entities.User.filter({ id: vr.user_id });
    if (users[0]) await base44.entities.User.update(users[0].id, { verification_status: status === 'approved' ? 'verified' : 'rejected' });
    // Email the requester about the decision (fails silently: decision is already saved)
    await base44.functions.invoke('processVerificationEvent', { request_id: vr.id, event_type: 'update' }).catch(() => null);
    setVerifications(prev => prev.map(v => v.id === vr.id ? { ...v, status, admin_notes: note || v.admin_notes, reviewed_at: new Date().toISOString() } : v));
    setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - (vr.status === 'pending' ? 1 : 0)) }));
    toast.success(`Verification ${status}`);
  };

  const removeListing = async (id) => {
    await base44.entities.Listing.update(id, { status: 'removed' });
    setListings(prev => prev.filter(l => l.id !== id));
    toast.success('Listing removed');
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
            <div key={vr.id} className="p-4 rounded-xl bg-card border border-border space-y-3">
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
                  <p className="text-xs text-muted-foreground">Submitted {format(new Date(vr.created_date), 'MMM d, yyyy h:mm a')}</p>
                  {vr.reviewed_at && <p className="text-xs text-muted-foreground">Reviewed {format(new Date(vr.reviewed_at), 'MMM d, yyyy h:mm a')}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {vr.id_document_url && (
                    <ViewDocButton recordType="verification" recordId={vr.id} fileUri={vr.id_document_url} label="View ID" />
                  )}
                  {vr.business_document_url && (
                    <ViewDocButton recordType="verification" recordId={vr.id} fileUri={vr.business_document_url} label="View Business Doc" />
                  )}
                  {vr.status !== 'pending' && (
                    <Button size="sm" variant="outline"
                      className={vr.status === 'approved'
                        ? 'border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg h-8 text-xs'
                        : 'border-green-500/30 text-green-400 hover:bg-green-500/10 rounded-lg h-8 text-xs'}
                      onClick={() => reviewVerification(vr, vr.status === 'approved' ? 'rejected' : 'approved')}>
                      {vr.status === 'approved'
                        ? <XCircle className="w-3 h-3 mr-1" />
                        : <CheckCircle className="w-3 h-3 mr-1" />} {vr.status === 'approved' ? 'Revoke' : 'Approve'}
                    </Button>
                  )}
                </div>
              </div>
              {vr.status === 'pending' ? (
                <div className="space-y-2 pt-3 border-t border-border">
                  <Textarea
                    value={adminNotes[vr.id] || ''}
                    onChange={e => setAdminNotes(prev => ({ ...prev, [vr.id]: e.target.value }))}
                    placeholder="Review notes (shared with the user if rejected)..."
                    className="bg-secondary border-border resize-none text-sm"
                    rows={2}
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 rounded-lg h-8 text-xs"
                      onClick={() => reviewVerification(vr, 'approved')}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg h-8 text-xs"
                      onClick={() => reviewVerification(vr, 'rejected')}>
                      <XCircle className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ) : vr.admin_notes && (
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">Notes: {vr.admin_notes}</p>
              )}
            </div>
          ))}
        </TabsContent>

        {/* Disputes */}
        <TabsContent value="disputes" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">All disputes, newest first.</p>
            <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 rounded-lg h-8 text-xs"
              onClick={() => navigate('/admin/disputes')}>
              <ExternalLink className="w-3 h-3 mr-1" /> Open Dispute Dashboard
            </Button>
          </div>
          {disputes.length === 0 && <p className="text-muted-foreground text-center py-12">No disputes filed.</p>}
          {disputes.map(dispute => (
            <DisputeCard
              key={dispute.id}
              dispute={dispute}
              onResolved={(resolution) => setDisputes(prev => prev.map(d => d.id === dispute.id ? { ...d, status: resolution } : d))}
            />
          ))}
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