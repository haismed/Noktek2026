TypeScript
"use client";

import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";

import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  limit,
} from "firebase/firestore";

import { useEffect, useState } from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  UserPlus,
  Check,
  X,
  Search,
  Clock,
  ArrowRight,
  Users,
  Loader2,
  Trash2,
  UserCheck,
} from "lucide-react";

import Link from "next/link";

import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "@/lib/friends";

import { useToast } from "@/hooks/use-toast";

import BottomNav from "@/components/BottomNav";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface UserItem {
  id: string;
  uid?: string;
  displayName?: string;
  username?: string;
  photoURL?: string;
}

interface FriendRequestItem {
  id: string;
  senderId?: string;
  senderName?: string;
  senderPhoto?: string;
  receiverId?: string;
}

export default function FriendsPage() {
  const { user } = useAuth();

  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");

  const [searchResults, setSearchResults] = useState<UserItem[]>([]);

  const [receivedRequests, setReceivedRequests] = useState<
    FriendRequestItem[]
  >([]);

  const [sentRequests, setSentRequests] = useState<
    FriendRequestItem[]
  >([]);

  const [myFriends, setMyFriends] = useState<UserItem[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // الطلبات الواردة
    const qReceived = query(
      collection(db, "friendRequests"),
      where("receiverId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubReceived = onSnapshot(qReceived, (snap) => {
      setReceivedRequests(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
    });

    // الطلبات المرسلة
    const qSent = query(
      collection(db, "friendRequests"),
      where("senderId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubSent = onSnapshot(qSent, (snap) => {
      setSentRequests(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
    });

    // الأصدقاء
    const qFriends = query(
      collection(db, "friendships"),
      where("users", "array-contains", user.uid)
    );

    const unsubFriends = onSnapshot(qFriends, async (snap) => {
      try {
        const friendIds = snap.docs
          .map((d) =>
            d.data().users?.find(
              (id: string) => id !== user.uid
            )
          )
          .filter(Boolean);

        if (friendIds.length === 0) {
          setMyFriends([]);
          return;
        }

        const usersQ = query(
          collection(db, "users"),
          where("uid", "in", friendIds.slice(0, 10))
        );

        const usersSnap = await getDocs(usersQ);

        setMyFriends(
          usersSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
        );

      } catch (error) {
        console.error(error);
      }
    });

    return () => {
      unsubReceived();
      unsubSent();
      unsubFriends();
    };
  }, [user]);

  const handleSearch = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    setLoading(true);

    try {
      const q = query(
        collection(db, "users"),
        where("displayName", ">=", searchQuery),
        where(
          "displayName",
          "<=",
          searchQuery + "\uf8ff"
        ),
        limit(10)
      );

      const snap = await getDocs(q);

      const users = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      setSearchResults(
        users.filter(
          (u: any) => u.uid !== user?.uid
        )
      );

    } catch (error) {
      console.error(error);

      toast({
        variant: "destructive",
        title: "فشل البحث",
      });

    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (
    target: UserItem
  ) => {
    try {
      if (!target.uid) return;

      await sendFriendRequest(
        target.uid,
        target.displayName || "مستخدم",
        target.photoURL || ""
      );

      toast({
        title: "تم إرسال الطلب",
      });

    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "فشل الإرسال",
        description: e.message,
      });
    }
  };

  const handleAccept = async (
    req: FriendRequestItem
  ) => {
    try {
      if (!req.senderId) return;

      await acceptFriendRequest(
        req.id,
        req.senderId
      );

      toast({
        title: "تم قبول الصداقة",
      });

    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: e.message,
      });
    }
  };

  const handleReject = async (
    reqId: string
  ) => {
    try {
      await rejectFriendRequest(reqId);

      toast({
        title: "تم رفض الطلب",
      });

    } catch (error) {
      console.error(error);
    }
  };

  const handleUnfriend = async (
    friendId?: string
  ) => {
    if (!friendId) return;

    const confirmed = window.confirm(
      "هل أنت متأكد من حذف الصديق؟"
    );

    if (!confirmed) return;

    try {
      await removeFriend(friendId);

      toast({
        title: "تم حذف الصديق",
      });

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-32">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <ArrowRight />
          </Button>
        </Link>

        <h1 className="text-2xl font-black flex items-center gap-2">
          <Users className="text-primary" />
          الأصدقاء
        </h1>
      </div>

      <Tabs
        defaultValue="find"
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 bg-card h-14 rounded-2xl p-1 mb-8 border border-border">

          <TabsTrigger
            value="find"
            className="rounded-xl font-bold"
          >
            بحث
          </TabsTrigger>

          <TabsTrigger
            value="friends"
            className="rounded-xl font-bold"
          >
            أصدقائي
          </TabsTrigger>

          <TabsTrigger
            value="received"
            className="rounded-xl font-bold relative"
          >
            الواردة

            {receivedRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-[10px] flex items-center justify-center rounded-full">
                {receivedRequests.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="sent"
            className="rounded-xl font-bold"
          >
            المرسلة
          </TabsTrigger>
        </TabsList>

        {/* البحث */}
        <TabsContent
          value="find"
          className="space-y-6"
        >
          <form
            onSubmit={handleSearch}
            className="relative"
          >
            <Input
              placeholder="ابحث عن أصدقاء..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="h-14 pr-12 rounded-2xl"
            />

            <Search className="absolute right-4 top-4 text-muted-foreground" />

            <Button
              type="submit"
              className="absolute left-2 top-2 h-10 px-6 rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "بحث"
              )}
            </Button>
          </form>

          <div className="space-y-4">
            {searchResults.map((result) => (
              <Card
                key={result.id}
                className="rounded-2xl"
              >
                <CardContent className="p-4 flex items-center justify-between">

                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={result.photoURL}
                      />

                      <AvatarFallback>
                        {result.displayName?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <h4 className="font-bold">
                        {result.displayName}
                      </h4>

                      <p className="text-xs text-muted-foreground">
                        @{result.username || "user"}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() =>
                      handleAddFriend(result)
                    }
                    className="rounded-xl gap-2"
                  >
                    <UserPlus size={16} />
                    إضافة
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* الأصدقاء */}
        <TabsContent value="friends">
          <div className="space-y-4">

            {myFriends.map((friend) => (
              <Card
                key={friend.id}
                className="rounded-2xl"
              >
                <CardContent className="p-4 flex items-center justify-between">

                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={friend.photoURL}
                      />

                      <AvatarFallback>
                        {friend.displayName?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <h4 className="font-bold">
                        {friend.displayName}
                      </h4>

                      <div className="flex items-center gap-1 text-xs text-green-500 font-bold">
                        <UserCheck size={10} />
                        صديق
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() =>
                      handleUnfriend(friend.uid)
                    }
                  >
                    <Trash2 size={18} />
                  </Button>
                </CardContent>
              </Card>
            ))}

            {myFriends.length === 0 && (
              <p className="text-center py-20 text-muted-foreground">
                لا يوجد أصدقاء بعد..
              </p>
            )}
          </div>
        </TabsContent>

        {/* الواردة */}
        <TabsContent value="received">
          <div className="space-y-4">

            {receivedRequests.map((req) => (
              <Card
                key={req.id}
                className="rounded-2xl border-primary/20 bg-primary/5"
              >
                <CardContent className="p-4 flex items-center justify-between">

                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={req.senderPhoto}
                      />

                      <AvatarFallback>
                        {req.senderName?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <h4 className="font-bold">
                        {req.senderName}
                      </h4>

                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={10} />
                        طلب صداقة جديد
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="destructive"
                      className="rounded-xl"
                      onClick={() =>
                        handleReject(req.id)
                      }
                    >
                      <X size={18} />
                    </Button>

                    <Button
                      size="icon"
                      className="rounded-xl bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        handleAccept(req)
                      }
                    >
                      <Check size={18} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {receivedRequests.length === 0 && (
              <p className="text-center py-20 text-muted-foreground">
                لا توجد طلبات واردة
              </p>
            )}
          </div>
        </TabsContent>

        {/* المرسلة */}
        <TabsContent value="sent">
          <div className="space-y-4">

            {sentRequests.map((req) => (
              <Card
                key={req.id}
                className="rounded-2xl"
              >
                <CardContent className="p-4 flex items-center justify-between">

                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback>
                        {req.receiverId?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <h4 className="font-bold">
                        طلب معلق
                      </h4>

                      <p className="text-xs text-muted-foreground">
                        بانتظار الموافقة..
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    className="text-destructive font-bold"
                    onClick={() =>
                      handleReject(req.id)
                    }
                  >
                    إلغاء
                  </Button>
                </CardContent>
              </Card>
            ))}

          </div>
        </TabsContent>

      </Tabs>

      <BottomNav />
    </div>
  );
}
