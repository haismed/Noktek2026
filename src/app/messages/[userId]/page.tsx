'use client';

import { useAuth } from "@/context/auth-context";
import { useEffect, useState, use, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Send, ShieldCheck, Loader2, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function DirectMessagePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user, userData } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchTarget = async () => {
      const snap = await getDoc(doc(db, "users", userId));
      if (snap.exists()) setTargetUser(snap.data());
    };
    fetchTarget();

    const chatId = [user.uid, userId].sort().join('_');
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsub();
  }, [userId, user, router]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const chatId = [user.uid, userId].sort().join('_');
    const text = newMessage;
    setNewMessage("");

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
      
      await addDoc(collection(db, "notifications"), {
        userId,
        type: 'new_message',
        fromUserId: user.uid,
        fromUserName: userData?.displayName,
        message: `أرسل لك رسالة جديدة`,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (e) {}
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col h-screen bg-background max-w-2xl mx-auto border-x border-border">
      {/* Header */}
      <header className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowRight />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border border-primary/20">
              <AvatarImage src={targetUser?.photoURL} />
              <AvatarFallback>{targetUser?.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1">
                <h2 className="font-black text-sm">{targetUser?.displayName}</h2>
                {targetUser?.isVerified && <ShieldCheck size={12} className="text-primary" />}
              </div>
              <p className="text-[10px] text-green-500 font-bold">نشط الآن</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full"><Info size={20} /></Button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        <div className="text-center py-10 opacity-50 space-y-2">
           <ShieldCheck className="mx-auto text-primary" size={32} />
           <p className="text-xs font-bold">هذه المحادثة محمية بتقنية NokTek الآمنة</p>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
              msg.senderId === user?.uid 
                ? 'bg-primary text-white rounded-br-none' 
                : 'bg-card border border-border rounded-bl-none'
            }`}>
              {msg.text}
              <p className={`text-[8px] mt-1 text-right opacity-60 ${msg.senderId === user?.uid ? 'text-white' : 'text-muted-foreground'}`}>
                {msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { locale: ar }) : 'الآن'}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <footer className="p-4 bg-background border-t border-border sticky bottom-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالة..."
            className="flex-1 h-12 rounded-2xl bg-card border-border px-6 focus:ring-primary"
          />
          <Button type="submit" disabled={!newMessage.trim()} className="h-12 w-12 rounded-2xl p-0 shadow-lg shadow-primary/20">
            <Send size={20} className={ar ? 'rotate-180' : ''} />
          </Button>
        </form>
      </footer>
    </div>
  );
}