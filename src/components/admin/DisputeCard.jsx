import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import EvidenceGrid from '@/components/admin/EvidenceGrid';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

const DELIVERY_LABELS = {
  local_pickup: 'Local pickup',
  shipping: 'Shipping',
};

export default function DisputeCard({ dispute, transaction, onResolved }) {
  const [notes, setNotes] = useState('');
  const [partial, setPartial] = useState('');
  const [resolving, setResolving] = useState(false);

  const isOpen = dispute.status === 'open' || dispute.status === 'under_review';

  const resolveDispute = async (resolution, refundAmount = null) => {
    setResolving(true);
    try {
      const txStatus = resolution === 'resolved_buyer' ? 'refunded' : 'completed';
      await Promise.all([
        base44.entities.Dispute.update(dispute.id, {
          status: resolution,
          admin_notes: notes || undefined,
          refund_amount: refundAmount || undefined,
          resolved_at: new Date().toISOString(),
        }),
        base44.entities.Transaction.update(dispute.transaction_id, { status: txStatus, notes: notes || undefined }),
      ]);
      toast.success(resolution === 'resolved_buyer' ? 'Refund issued to buyer' : 'Funds released to seller');
      onResolved?.(resolution);
    } finally {
      setResolving(false);
    }
  };

  const issuePartial = () => {
    const value = Number(partial);
    if (!partial || isNaN(value) || value <= 0) {
      toast.error('Enter a refund amount');
      return;
    }
    if (value > dispute.amount) {
      toast.error(`Refund can't exceed the dispute amount ($${dispute.amount?.toLocaleString()})`);
      return;
    }
    resolveDispute('resolved_buyer', value);
  };

  return (
    <div className="p-5 rounded-xl bg-card border border-border space-y-4">
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

      {/* Item / transaction details */}
      {transaction && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-secondary/50">
          {[
            { label: 'Order status', value: (transaction.status || '').replace('_', ' ') },
            { label: 'Delivery', value: DELIVERY_LABELS[transaction.delivery_type] || '—' },
            { label: 'Order date', value: format(new Date(transaction.created_date), 'MMM d, yyyy') },
            { label: 'Tracking #', value: transaction.tracking_number || '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm text-foreground capitalize">{value}</p>
            </div>
          ))}
          {transaction.delivery_type === 'shipping' && transaction.shipping_address && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-xs text-muted-foreground">Shipping address</p>
              <p className="text-sm text-foreground">{transaction.shipping_address}</p>
            </div>
          )}
        </div>
      )}

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
          <EvidenceGrid disputeId={dispute.id} evidenceUrls={dispute.evidence_urls} />
        </div>
      )}

      {/* Admin actions */}
      {isOpen && (
        <div className="space-y-3 pt-2 border-t border-border">
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Admin notes (visible on resolution)..."
            className="bg-secondary border-border resize-none text-sm"
            rows={2}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-40">
              <span className="text-xs text-muted-foreground shrink-0">Partial refund $</span>
              <Input
                type="number" min="0" max={dispute.amount}
                value={partial}
                onChange={e => setPartial(e.target.value)}
                placeholder={`Max $${dispute.amount}`}
                className="bg-secondary border-border h-8 text-sm"
              />
              <Button size="sm" variant="outline" disabled={resolving} className="border-primary/30 text-primary hover:bg-primary/10 rounded-lg h-8 text-xs shrink-0"
                onClick={issuePartial}>
                Issue Partial
              </Button>
            </div>
            <Button size="sm" disabled={resolving} className="bg-primary text-primary-foreground rounded-lg h-8 text-xs"
              onClick={() => resolveDispute('resolved_seller')}>
              Release to Seller
            </Button>
            <Button size="sm" variant="outline" disabled={resolving} className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg h-8 text-xs"
              onClick={() => resolveDispute('resolved_buyer', dispute.amount)}>
              Full Refund
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}