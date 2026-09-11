import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, AlertTriangle, Clock, DollarSign, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DisputeCard from '@/components/admin/DisputeCard';
import { format } from 'date-fns';

export default function DisputeDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [transactions, setTransactions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      if (u.role !== 'admin') { navigate('/'); return; }
      const [dsps, txs] = await Promise.all([
        base44.entities.Dispute.filter({}, '-created_date', 100),
        base44.entities.Transaction.filter({}, '-created_date', 100),
      ]);
      setDisputes(dsps);
      setTransactions(Object.fromEntries(txs.map(t => [t.id, t])));
    }).catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!user || user.role !== 'admin') return null;

  const activeDisputes = disputes.filter(d => d.status === 'open' || d.status === 'under_review');
  const amountAtStake = activeDisputes.reduce((sum, d) => sum + (d.amount || 0), 0);

  const handleResolved = (disputeId) => {
    setDisputes(prev => prev.filter(d => d.id !== disputeId));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="font-syne text-3xl font-800 text-foreground">Dispute Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Review evidence and process refunds for active disputes</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="border-border rounded-lg" asChild>
          <Link to="/admin"><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Admin Panel</Link>
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Open Disputes', value: disputes.filter(d => d.status === 'open').length, color: 'text-yellow-400', icon: AlertTriangle },
          { label: 'Under Review', value: disputes.filter(d => d.status === 'under_review').length, color: 'text-blue-400', icon: Clock },
          { label: 'Amount at Stake', value: `$${amountAtStake.toLocaleString()}`, color: 'text-primary', icon: DollarSign, isText: true },
        ].map(({ label, value, color, icon: Icon, isText }) => (
          <div key={label} className="p-4 rounded-xl bg-card border border-border">
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <p className={`font-syne text-2xl font-800 ${color} ${isText ? '' : ''}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Active disputes */}
      {activeDisputes.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-card border border-border">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-semibold">No active disputes</p>
          <p className="text-sm text-muted-foreground mt-1">All caught up — new disputes will appear here for review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeDisputes.map(dispute => (
            <DisputeCard
              key={dispute.id}
              dispute={dispute}
              transaction={transactions[dispute.transaction_id]}
              onResolved={() => handleResolved(dispute.id)}
            />
          ))}
        </div>
      )}

      {/* Recently resolved */}
      {disputes.filter(d => d.status.startsWith('resolved')).length > 0 && (
        <div className="mt-10 space-y-2">
          <p className="text-sm font-semibold text-foreground">Recently Resolved</p>
          {disputes.filter(d => d.status.startsWith('resolved')).slice(0, 5).map(d => (
            <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border text-sm flex-wrap">
              <div className="min-w-0">
                <p className="text-foreground font-medium truncate">{d.listing_title}</p>
                <p className="text-xs text-muted-foreground">Buyer: {d.buyer_name} · Seller: {d.seller_name}</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  {d.resolved_at ? format(new Date(d.resolved_at), 'MMM d, h:mm a') : ''}
                </span>
                <span className="text-primary font-semibold">
                  {d.status === 'resolved_buyer'
                    ? `Refunded${d.refund_amount ? ` $${d.refund_amount.toLocaleString()}` : ''}`
                    : 'Released to seller'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}