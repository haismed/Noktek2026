
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Clock, Loader2, Check } from 'lucide-react';
import { FriendshipStatus, sendFriendRequest, acceptFriendRequest } from '@/lib/profile-service';
import { useToast } from '@/hooks/use-toast';

interface Props {
  targetUserId: string;
  currentUserId: string;
  initialStatus: FriendshipStatus;
  requestedBy: string;
  requestId?: string;
  onStatusChange: () => void;
}

export default function FriendshipButton({ targetUserId, currentUserId, initialStatus, requestedBy, requestId, onStatusChange }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAction = async () => {
    if (!currentUserId) {
      toast({ variant: "destructive", title: "دخول مطلوب", description: "سجل دخولك أولاً لإضافة أصدقاء." });
      return;
    }
    setLoading(true);
    try {
      if (initialStatus === 'none') {
        await sendFriendRequest(currentUserId, targetUserId);
        toast({ title: "تم إرسال الطلب", description: "بانتظار موافقة الطرف الآخر." });
      } else if (initialStatus === 'pending' && requestedBy !== currentUserId && requestId) {
        await acceptFriendRequest(requestId, requestedBy);
        toast({ title: "أصبحتم أصدقاء!", description: "تم قبول طلب الصداقة بنجاح." });
      }
      onStatusChange();
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message || "فشلت العملية، حاول لاحقاً." });
    } finally {
      setLoading(false);
    }
  };

  if (initialStatus === 'self') return null;

  if (initialStatus === 'accepted') {
    return (
      <Button variant="outline" className="w-full rounded-2xl font-bold gap-2 text-green-500 border-green-500/20 bg-green-500/5 h-12">
        <UserCheck size={20} />
        أصدقاء
      </Button>
    );
  }

  if (initialStatus === 'pending') {
    if (requestedBy === currentUserId) {
      return (
        <Button variant="secondary" disabled className="w-full rounded-2xl font-bold gap-2 opacity-70 h-12">
          <Clock size={20} />
          الطلب معلق
        </Button>
      );
    } else {
      return (
        <Button onClick={handleAction} disabled={loading} className="w-full rounded-2xl font-black gap-2 bg-green-600 hover:bg-green-700 h-12 text-white">
          {loading ? <Loader2 className="animate-spin" /> : <><Check size={20} /> قبول الصداقة</>}
        </Button>
      );
    }
  }

  return (
    <Button 
      onClick={handleAction} 
      disabled={loading} 
      className="w-full rounded-2xl font-black gap-2 h-12 shadow-lg shadow-primary/20"
    >
      {loading ? <Loader2 className="animate-spin" /> : <><UserPlus size={20} /> إضافة صديق</>}
    </Button>
  );
}
