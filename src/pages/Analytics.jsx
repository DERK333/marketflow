import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Eye, Star, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, sub, color = 'text-primary' }) => (
  <div className="p-5 rounded-xl bg-card border border-border">
    <div className={`w-9 h-9 rounded-lg bg-secondary flex items-center justify-center mb-3`}>
      <Icon className={`w-4.5 h-4.5 ${color}`} />
    </div>
    <p className={`font-syne text-2xl font-800 ${color}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-sm">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name === 'revenue' ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [listings, setListings] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      const [txs, lstgs, reviews] = await Promise.all([
        base44.entities.Transaction.filter({ seller_id: u.id, status: 'completed' }, '-created_date', 200),
        base44.entities.Listing.filter({ seller_id: u.id }, '-created_date', 100),
        base44.entities.Review.filter({ reviewed_user_id: u.id }, '-created_date', 100),
      ]);
      setSales(txs);
      setListings(lstgs);
      if (reviews.length > 0) {
        setAvgRating((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1));
        setReviewCount(reviews.length);
      }
    }).catch(() => base44.auth.redirectToLogin())
      .finally(() => setLoading(false));
  }, []);

  // ── Derived metrics ────────────────────────────────────────────────
  const totalRevenue = sales.reduce((s, t) => s + (t.seller_payout || t.amount), 0);
  const totalOrders = sales.length;
  const totalViews = listings.reduce((s, l) => s + (l.view_count || 0), 0);
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

  // Monthly revenue for the last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const interval = { start: startOfMonth(date), end: endOfMonth(date) };
    const monthSales = sales.filter(t => isWithinInterval(new Date(t.created_date), interval));
    return {
      month: format(date, 'MMM'),
      revenue: monthSales.reduce((s, t) => s + (t.seller_payout || t.amount), 0),
      orders: monthSales.length,
    };
  });

  // Top-performing listings (by sales volume via transaction match)
  const listingSalesMap = {};
  sales.forEach(t => {
    listingSalesMap[t.listing_id] = (listingSalesMap[t.listing_id] || 0) + (t.seller_payout || t.amount);
  });
  const topListings = listings
    .filter(l => listingSalesMap[l.id])
    .map(l => ({ ...l, salesRevenue: listingSalesMap[l.id] }))
    .sort((a, b) => b.salesRevenue - a.salesRevenue)
    .slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-syne text-3xl font-800 text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Your seller performance overview</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} color="text-primary" />
        <StatCard icon={ShoppingBag} label="Completed Sales" value={totalOrders} color="text-green-400" />
        <StatCard icon={Eye} label="Total Views" value={totalViews.toLocaleString()} color="text-accent" />
        <StatCard icon={Star} label="Avg. Rating" value={avgRating ?? '—'} sub={reviewCount ? `${reviewCount} reviews` : 'No reviews yet'} color="text-yellow-400" />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Revenue Area Chart */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <p className="font-syne font-700 text-foreground mb-1">Monthly Revenue</p>
          <p className="text-xs text-muted-foreground mb-4">Last 6 months</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38,92%,58%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(38,92%,58%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,15%,18%)" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(210,15%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(210,15%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="hsl(38,92%,58%)" strokeWidth={2} fill="url(#revenueGrad)" dot={{ fill: 'hsl(38,92%,58%)', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Bar Chart */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <p className="font-syne font-700 text-foreground mb-1">Monthly Orders</p>
          <p className="text-xs text-muted-foreground mb-4">Last 6 months</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,15%,18%)" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(210,15%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(210,15%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="orders" name="orders" fill="hsl(262,80%,60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performing Listings */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="font-syne font-700 text-foreground">Top Performing Items</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ranked by sales revenue</p>
        </div>
        {topListings.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No completed sales yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {topListings.map((listing, i) => (
              <div key={listing.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/listing/${listing.id}`)}>
                <span className="w-6 text-center text-sm font-semibold text-muted-foreground">{i + 1}</span>
                <div className="w-11 h-11 rounded-lg overflow-hidden bg-secondary shrink-0">
                  {listing.images?.[0]
                    ? <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground/30" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{listing.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className="bg-secondary text-muted-foreground border-border text-xs capitalize">{listing.status}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="w-3 h-3" />{listing.view_count || 0} views
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-primary shrink-0">${listing.salesRevenue.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avg order value footer */}
      {totalOrders > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-6">
          Average order value: <span className="text-foreground font-semibold">${avgOrderValue.toFixed(2)}</span>
        </p>
      )}
    </div>
  );
}