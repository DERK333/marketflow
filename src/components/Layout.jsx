import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  MessageSquare, PlusCircle, User, 
  ShoppingBag, ChevronDown, LogOut, Settings, Shield,
  Menu, X, Home, Tag, Package, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import NavSearch from '@/components/NavSearch';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    // Initial count
    base44.entities.Message.filter({ recipient_id: user.id, read: false })
      .then(msgs => setUnreadMessages(msgs.length))
      .catch(() => {});
    // Real-time subscription for new messages
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data?.recipient_id === user.id && !event.data?.read) {
        setUnreadMessages(prev => prev + 1);
      }
      if (event.type === 'update' && event.data?.recipient_id === user.id && event.data?.read) {
        setUnreadMessages(prev => Math.max(0, prev - 1));
      }
    });
    return () => unsub();
  }, [user]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => base44.auth.logout('/');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-syne font-800 text-xl text-foreground hidden sm:block">
              Trade<span className="text-primary">Vault</span>
            </span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-xl hidden md:block">
            <NavSearch />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex items-center gap-2 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate('/create-listing')}
            >
              <PlusCircle className="w-4 h-4" />
              Sell
            </Button>

            {user && (
              <>
                <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/messages')}>
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground text-xs">
                      {unreadMessages}
                    </Badge>
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <User className="w-4 h-4 text-muted-foreground" />
                        }
                      </div>
                      <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-card border-border">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold truncate">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      {user.verification_status === 'verified' && (
                        <Badge className="mt-1 text-xs bg-primary/20 text-primary border-primary/30">Verified</Badge>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(`/profile/${user.id}`)}>
                      <User className="w-4 h-4 mr-2" /> My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/my-listings')}>
                      <Tag className="w-4 h-4 mr-2" /> My Listings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/orders')}>
                      <Package className="w-4 h-4 mr-2" /> Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/favorites')}>
                      <Heart className="w-4 h-4 mr-2" /> My Favorites
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/verification')}>
                      <Shield className="w-4 h-4 mr-2" /> Verification
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/admin')}>
                          <Settings className="w-4 h-4 mr-2" /> Admin Panel
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {!user && (
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => base44.auth.redirectToLogin()}>
                Sign In
              </Button>
            )}

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-3">
            <NavSearch />
            <div className="flex gap-2">
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => { navigate('/create-listing'); setMobileOpen(false); }}>
                <PlusCircle className="w-4 h-4 mr-2" /> Sell Now
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { navigate('/browse'); setMobileOpen(false); }}>
                <Home className="w-4 h-4 mr-2" /> Browse
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <span className="font-syne font-700 text-lg">Trade<span className="text-primary">Vault</span></span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 TradeVault. All rights reserved.</p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link to="/browse" className="hover:text-foreground transition-colors">Browse</Link>
              <Link to="/create-listing" className="hover:text-foreground transition-colors">Sell</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}