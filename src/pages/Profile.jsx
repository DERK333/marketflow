import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, CheckCircle, Package, MapPin, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ListingCard from '@/components/listings/ListingCard';
import StarRating from '@/components/reviews/StarRating';
import RatingSummary from '@/components/reviews/RatingSummary';
import ReviewCard from '@/components/reviews/ReviewCard';

export default function Profile() {
  const { id: profileId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.User.filter({ id: profileId }),
      base44.entities.Listing.filter({ seller_id: profileId, status: 'active' }, '-created_date', 20),
      base44.entities.Review.filter({ reviewed_user_id: profileId }, '-created_date', 20),
      base44.auth.me().catch(() => null),
    ]).then(([users, lstgs, revs, me]) => {
      setProfile(users[0] || null);
      setListings(lstgs);
      setReviews(revs);
      setCurrentUser(me);
    }).finally(() => setLoading(false));
  }, [profileId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="text-center py-24 text-muted-foreground">User not found.</div>
  );

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const isOwn = currentUser?.id === profileId;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-8 p-6 rounded-2xl bg-card border border-border">
        <Avatar className="w-24 h-24">
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
            {profile.full_name?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-syne text-2xl font-800 text-foreground">{profile.full_name}</h1>
                {profile.verification_status === 'verified' && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
              </div>
              {profile.account_type === 'business' && profile.business_name && (
                <p className="text-sm text-muted-foreground">{profile.business_name}</p>
              )}
            </div>
            {isOwn && (
              <Button variant="outline" size="sm" className="border-border" onClick={() => navigate('/settings')}>
                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {profile.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.location}</span>
            )}
            {avgRating !== null && (
              <span className="flex items-center gap-1.5">
                <StarRating rating={Math.round(avgRating)} size="sm" />
                <span>{avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> {profile.total_sales || 0} sales
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge className={
              profile.verification_status === 'verified'
                ? 'bg-primary/20 text-primary border-primary/30'
                : profile.verification_status === 'pending'
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                : 'bg-secondary text-muted-foreground border-border'
            }>
              <Shield className="w-3 h-3 mr-1" />
              {profile.verification_status === 'verified' ? 'ID Verified' : 
               profile.verification_status === 'pending' ? 'Verification Pending' : 'Unverified'}
            </Badge>
            {profile.account_type === 'business' && (
              <Badge className="bg-accent/20 text-accent border-accent/30">Business</Badge>
            )}
          </div>
          {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="listings">
        <TabsList className="bg-card border border-border w-full md:w-auto mb-6">
          <TabsTrigger value="listings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Listings ({listings.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Reviews ({reviews.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="listings">
          {listings.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No active listings.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </TabsContent>
        <TabsContent value="reviews">
          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No reviews yet.</p>
          ) : (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-card border border-border">
                <RatingSummary reviews={reviews} />
              </div>
              <div className="space-y-3">
                {reviews.map(review => <ReviewCard key={review.id} review={review} />)}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}