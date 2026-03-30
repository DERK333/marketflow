import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, MessageSquare, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

function buildConversations(all, userId) {
  const convMap = {};
  all.forEach(msg => {
    const cid = msg.conversation_id;
    const isMe = msg.sender_id === userId;
    const otherName = isMe ? (msg.recipient_name || 'Seller') : msg.sender_name;
    const otherId = isMe ? msg.recipient_id : msg.sender_id;

    if (!convMap[cid] || new Date(msg.created_date) > new Date(convMap[cid].last_message.created_date)) {
      convMap[cid] = {
        id: cid,
        other_name: otherName,
        other_id: otherId,
        listing_title: msg.listing_title,
        listing_id: msg.listing_id,
        last_message: msg,
        unread: 0,
      };
    }
    if (msg.recipient_id === userId && !msg.read) convMap[cid].unread++;
  });
  return Object.values(convMap).sort((a, b) =>
    new Date(b.last_message.created_date) - new Date(a.last_message.created_date)
  );
}

export default function Messages() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  const refreshConversations = async (u) => {
    const [sent, received] = await Promise.all([
      base44.entities.Message.filter({ sender_id: u.id }, '-created_date', 200),
      base44.entities.Message.filter({ recipient_id: u.id }, '-created_date', 200),
    ]);
    setConversations(buildConversations([...sent, ...received], u.id));
  };

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      await refreshConversations(u);
      setLoading(false);

      // Real-time: subscribe to new/updated messages
      const unsub = base44.entities.Message.subscribe((event) => {
        const msg = event.data;
        if (!msg) return;
        if (msg.sender_id === u.id || msg.recipient_id === u.id) {
          refreshConversations(u);
          // If this message belongs to the open conversation, append it
          if (event.type === 'create') {
            setMessages(prev => {
              if (!prev.length || prev[0].conversation_id === msg.conversation_id) {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
              }
              return prev;
            });
          }
        }
      });
      return () => unsub();
    }).catch(() => base44.auth.redirectToLogin());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (conv) => {
    setSelectedConv(conv);
    const msgs = await base44.entities.Message.filter({ conversation_id: conv.id }, 'created_date', 200);
    setMessages(msgs);
    // Mark as read
    msgs.filter(m => m.recipient_id === user.id && !m.read).forEach(m =>
      base44.entities.Message.update(m.id, { read: true }).catch(() => {})
    );
    // Update unread count locally
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedConv || sending) return;
    setSending(true);
    const msg = await base44.entities.Message.create({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      sender_name: user.full_name,
      recipient_id: selectedConv.other_id,
      listing_id: selectedConv.listing_id,
      listing_title: selectedConv.listing_title,
      content: newMsg.trim(),
    });
    setMessages(prev => [...prev, msg]);
    setNewMsg('');
    setSending(false);
  };

  const filteredConvs = conversations.filter(c =>
    !search || c.other_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.listing_title?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-syne text-3xl font-800 text-foreground mb-6">Messages</h1>
      <div className="grid md:grid-cols-3 gap-0 h-[calc(100vh-220px)] min-h-[500px] rounded-2xl overflow-hidden border border-border">
        
        {/* Conversations sidebar */}
        <div className={`bg-card flex flex-col border-r border-border ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="pl-9 bg-secondary border-0 rounded-xl h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{search ? 'No results' : 'No messages yet'}</p>
              </div>
            ) : filteredConvs.map(conv => (
              <button
                key={conv.id}
                onClick={() => loadMessages(conv)}
                className={`w-full flex items-start gap-3 p-4 hover:bg-secondary/50 transition-colors text-left border-b border-border/40 ${selectedConv?.id === conv.id ? 'bg-secondary' : ''}`}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                    {conv.other_name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-sm font-semibold text-foreground truncate">{conv.other_name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(conv.last_message.created_date), { addSuffix: false })}
                    </span>
                  </div>
                  {conv.listing_title && (
                    <p className="text-xs text-primary truncate mb-0.5">{conv.listing_title}</p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-muted-foreground truncate flex-1">{conv.last_message.content}</p>
                    {conv.unread > 0 && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] h-4 w-4 p-0 flex items-center justify-center rounded-full shrink-0">
                        {conv.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className={`md:col-span-2 bg-card flex flex-col ${selectedConv ? 'flex' : 'hidden md:flex'}`}>
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-3">
                <MessageSquare className="w-14 h-14 mx-auto opacity-10" />
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelectedConv(null)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                    {selectedConv.other_name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{selectedConv.other_name}</p>
                  {selectedConv.listing_title && (
                    <button
                      onClick={() => navigate(`/listing/${selectedConv.listing_id}`)}
                      className="text-xs text-primary hover:underline truncate block"
                    >
                      {selectedConv.listing_title}
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8 opacity-60">No messages yet. Say hello!</div>
                )}
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id;
                  const showDate = i === 0 || format(new Date(messages[i-1].created_date), 'yyyy-MM-dd') !== format(new Date(msg.created_date), 'yyyy-MM-dd');
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center text-[11px] text-muted-foreground my-3">
                          {format(new Date(msg.created_date), 'MMMM d, yyyy')}
                        </div>
                      )}
                      <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                          <AvatarFallback className={`text-xs font-semibold ${isMe ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                            {msg.sender_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary text-foreground rounded-tl-sm'
                          }`}>
                            {msg.content}
                          </div>
                          <span className="text-[11px] text-muted-foreground mt-1 px-1">
                            {format(new Date(msg.created_date), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div className="px-4 pb-4 pt-3 border-t border-border flex gap-2 items-end shrink-0">
                <Textarea
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                  placeholder={`Message ${selectedConv.other_name?.split(' ')[0] || 'them'}…`}
                  className="resize-none bg-secondary border-border rounded-xl flex-1 text-sm min-h-[44px] max-h-28"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={sending || !newMsg.trim()}
                  size="icon"
                  className="bg-primary text-primary-foreground rounded-xl h-11 w-11 shrink-0"
                >
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