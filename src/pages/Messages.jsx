import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, MessageSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Messages() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const [sent, received] = await Promise.all([
        base44.entities.Message.filter({ sender_id: u.id }, '-created_date', 100),
        base44.entities.Message.filter({ recipient_id: u.id }, '-created_date', 100),
      ]);
      const all = [...sent, ...received];
      // Group by conversation_id
      const convMap = {};
      all.forEach(msg => {
        const cid = msg.conversation_id;
        if (!convMap[cid] || new Date(msg.created_date) > new Date(convMap[cid].last_message.created_date)) {
          const otherName = msg.sender_id === u.id ? msg.recipient_id : msg.sender_name;
          const otherId = msg.sender_id === u.id ? msg.recipient_id : msg.sender_id;
          convMap[cid] = {
            id: cid,
            other_name: msg.sender_id === u.id ? 'Recipient' : msg.sender_name,
            other_id: otherId,
            listing_title: msg.listing_title,
            listing_id: msg.listing_id,
            last_message: msg,
            unread: 0,
          };
        }
        if (msg.recipient_id === u.id && !msg.read) convMap[cid].unread++;
      });
      setConversations(Object.values(convMap).sort((a, b) => new Date(b.last_message.created_date) - new Date(a.last_message.created_date)));
    }).catch(() => base44.auth.redirectToLogin())
      .finally(() => setLoading(false));
  }, []);

  const loadMessages = async (conv) => {
    setSelectedConv(conv);
    const msgs = await base44.entities.Message.filter({ conversation_id: conv.id }, 'created_date', 100);
    setMessages(msgs);
    // Mark as read
    msgs.filter(m => m.recipient_id === user.id && !m.read).forEach(m =>
      base44.entities.Message.update(m.id, { read: true }).catch(() => {})
    );
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedConv) return;
    setSending(true);
    await base44.entities.Message.create({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      sender_name: user.full_name,
      recipient_id: selectedConv.other_id,
      listing_id: selectedConv.listing_id,
      listing_title: selectedConv.listing_title,
      content: newMsg,
    });
    const msgs = await base44.entities.Message.filter({ conversation_id: selectedConv.id }, 'created_date', 100);
    setMessages(msgs);
    setNewMsg('');
    setSending(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-syne text-3xl font-800 text-foreground mb-6">Messages</h1>
      <div className="grid md:grid-cols-3 gap-4 h-[600px]">
        {/* Conversations */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 bg-secondary border-0 rounded-xl h-9 text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => loadMessages(conv)}
                className={`w-full flex items-start gap-3 p-3 hover:bg-secondary/50 transition-colors text-left border-b border-border/50 ${selectedConv?.id === conv.id ? 'bg-secondary' : ''}`}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                    {conv.other_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground truncate">{conv.other_name}</span>
                    {conv.unread > 0 && <Badge className="bg-primary text-primary-foreground text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">{conv.unread}</Badge>}
                  </div>
                  {conv.listing_title && <p className="text-xs text-primary truncate mt-0.5">{conv.listing_title}</p>}
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message.content}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="md:col-span-2 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border">
                <p className="font-semibold text-foreground">{selectedConv.other_name}</p>
                {selectedConv.listing_title && <p className="text-xs text-primary">{selectedConv.listing_title}</p>}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm ${
                      msg.sender_id === user.id
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-secondary text-foreground rounded-bl-sm'
                    }`}>
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.sender_id === user.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        {format(new Date(msg.created_date), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Textarea
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                  placeholder="Type a message..."
                  className="resize-none bg-secondary border-0 rounded-xl flex-1 text-sm"
                  rows={1}
                />
                <Button onClick={sendMessage} disabled={sending || !newMsg.trim()} size="icon" className="bg-primary text-primary-foreground rounded-xl h-10 w-10">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}