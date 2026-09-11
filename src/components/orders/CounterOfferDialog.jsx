import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function CounterOfferDialog({ offer, onCountered }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const value = Number(amount);
    if (!amount || isNaN(value) || value <= 0) {
      toast.error('Enter a valid counteroffer amount');
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.Offer.update(offer.id, {
        status: 'countered',
        counter_amount: value,
      });
      toast.success(`Counteroffer of $${value.toLocaleString()} sent to ${offer.buyer_name}`);
      setOpen(false);
      setAmount('');
      onCountered(offer.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 rounded-lg h-8 text-xs">
          <ArrowLeftRight className="w-3 h-3 mr-1" /> Counter
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Counteroffer</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          {offer.buyer_name} offered{' '}
          <span className="text-primary font-semibold">${offer.amount?.toLocaleString()}</span>{' '}
          for <span className="text-foreground font-medium">{offer.listing_title}</span>
        </p>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Your counteroffer ($)</label>
            <Input value={amount} onChange={e => setAmount(e.target.value)}
              type="number" className="bg-secondary border-border"
              placeholder="Enter an amount" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-border" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-primary text-primary-foreground">
              {submitting ? 'Sending…' : 'Send Counteroffer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}