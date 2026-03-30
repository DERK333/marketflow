import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, MessageSquare, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

export default function AskSellerThread({ listing, user, seller }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const convId = user && listing ? [user.id, listing.seller_id].sort().join('_') + '_' + listing.id : null;

  useEffect(() => {
    if (!convId) return;
    setLoading(true);
    base44.entities.Message.filter({ conversation_id: convId }, 'created_date', 100)
      .then(msgs => {
        setMessages(msgs);
        msgs.filter(m => !m.read && m.recipient_id === user.id)
          .forEach(m => base44.entities.Message.update(m.id, { read: true }).catch(() => {}));
      })
      .finally(() => setLoading(false));

    // Real-time subscription
    const unsub = base44.entities.Message.subscribe((event) => {
      const msg = event.data;
      if (!msg || msg.conversation_id !== convId) return;
      if (event.type === 'create') {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        // Mark incoming messages as read immediately
        if (msg.recipient_id === user?.id && !msg.read) {
          base44.entities.Message.update(msg.id, { read: true }).catch(() => {});
        }
      }
    });

    return () => unsub();
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    if (!user) { base44.auth.redirectToLogin(); return; }
    setSending(true);
    const msg = await base44.entities.Message.create({
      conversation_id: convId,
      sender_id: user.id,
      sender_name: user.full_name,
      recipient_id: listing.seller_id,
      listing_id: listing.id,
      listing_title: listing.title,
      content: text.trim(),
    });
    setMessages(prev => [...prev, msg]);
    setText('');
    setSending(false);
    toast.success('Message sent');
  };

  if (!user) return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
      <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto" />
      <p className="text-sm text-muted-foreground">Sign in to message the seller and ask if the item is available.</p>
      <Button onClick={() => base44.auth.redirectToLogin()} className="bg-primary text-primary-foreground">
        Sign In to Message
      </Button>
    </div>
  );

  const isSeller = user.id === listing.seller_id;
  if (isSeller) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <MessageSquare className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Ask the Seller</h3>
        {messages.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Thread */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="px-5 py-5 text-sm text-muted-foreground">
          Start a conversation — ask if the item is available, request more photos, or negotiate.
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3 max-h-80 overflow-y-auto">
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === user.id;
            const showDate = i === 0 || format(new Date(messages[i-1].created_date), 'yyyy-MM-dd') !== format(new Date(msg.created_date), 'yyyy-MM-dd');
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="text-center text-[10px] text-muted-foreground my-2">
                    {format(new Date(msg.created_date), 'MMM d, yyyy')}
                  </div>
                )}
                <div className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                    <AvatarFallback className={`text-xs font-semibold ${isMe ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {msg.sender_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary text-foreground rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 px-1">
                      {msg.sender_name?.split(' ')[0]} · {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Compose */}
      <div className="px-4 pb-4 pt-3 border-t border-border flex gap-2 items-end">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
          placeholder={`Message ${seller?.full_name?.split(' ')[0] || 'seller'}…`}
          className="bg-secondary border-border resize-none text-sm min-h-[44px] max-h-32"
          rows={1}
        />
        <Button onClick={send} disabled={sending || !text.trim()} size="icon"
          className="h-11 w-11 shrink-0 bg-primary text-primary-foreground rounded-xl">
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <div className="px-5 pb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>All payments stay on TradeVault for your protection</span>
      </div>
    </div>
  );
}