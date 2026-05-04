
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, increment, collection, getDocs, writeBatch } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Plus, AlertCircle, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const TOPICS_LIST = [
  { id: "tech", name: "التقنية", icon: "💻" },
  { id: "business", name: "ريادة الأعمال", icon: "💼" },
  { id: "design", name: "التصميم", icon: "🎨" },
  { id: "marketing", name: "التسويق", icon: "📈" },
  { id: "health", name: "الصحة", icon: "🏥" },
  { id: "education", name: "التعليم", icon: "📚" },
  { id: "crypto", name: "العملات الرقمية", icon: "₿" },
  { id: "ai", name: "الذكاء الاصطناعي", icon: "🤖" },
];

export default function TopicsSelectionPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedTopicToReplace, setSelectedTopicToReplace] = useState("");
  const [pendingTopicToAdd, setPendingTopicToAdd] = useState<any>(null);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const followedTopics = userData?.followedTopics || [];

  const handleTopicClick = async (topic: any) => {
    if (followedTopics.includes(topic.id)) {
      // Unfollow
      setSaving(true);
      try {
        await updateDoc(doc(db, "users", user.uid), {
          followedTopics: arrayRemove(topic.id)
        });
      } catch (e) {
        console.error(e);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (followedTopics.length >= 3) {
      setPendingTopicToAdd(topic);
      setIsReplaceModalOpen(true);
      return;
    }

    // Follow
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        followedTopics: arrayUnion(topic.id)
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const confirmReplacement = async () => {
    if (!selectedTopicToReplace || !pendingTopicToAdd) return;

    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const newTopics = followedTopics.filter((id: string) => id !== selectedTopicToReplace);
      newTopics.push(pendingTopicToAdd.id);
      
      await updateDoc(userRef, {
        followedTopics: newTopics
      });
      
      setIsReplaceModalOpen(false);
      setSelectedTopicToReplace("");
      setPendingTopicToAdd(null);
      toast({ title: "تم التحديث", description: `تم استبدال المجال بنجاح.` });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowRight />
          </Button>
          <div>
            <h1 className="text-2xl font-black">اختر اهتماماتك</h1>
            <p className="text-muted-foreground text-sm">اختر حتى 3 مجالات لمتابعتها</p>
          </div>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl font-bold">
          {followedTopics.length} / 3
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {TOPICS_LIST.map((topic) => {
          const isSelected = followedTopics.includes(topic.id);
          return (
            <Card 
              key={topic.id}
              onClick={() => !saving && handleTopicClick(topic)}
              className={`cursor-pointer transition-all duration-300 rounded-3xl border-2 overflow-hidden ${
                isSelected ? "border-primary bg-primary/5 shadow-lg scale-[1.02]" : "border-border hover:border-primary/50"
              } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <span className="text-4xl">{topic.icon}</span>
                <span className="font-bold text-lg">{topic.name}</span>
                {isSelected ? (
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                    <Check size={18} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Plus size={18} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <Button 
          disabled={followedTopics.length === 0}
          onClick={() => router.push("/")}
          className="h-14 px-12 rounded-2xl text-lg font-black"
        >
          ابدأ التصفح الآن
        </Button>
      </div>

      <Dialog open={isReplaceModalOpen} onOpenChange={setIsReplaceModalOpen}>
        <DialogContent className="rounded-3xl bg-card border-border max-w-[90vw] sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-center">وصلت للحد الأقصى</DialogTitle>
            <DialogDescription className="text-center pt-2">
              لمتابعة <span className="text-primary font-bold">"{pendingTopicToAdd?.name}"</span> يجب عليك إلغاء متابعة أحد مجالاتك الحالية:
            </DialogDescription>
          </DialogHeader>

          <RadioGroup 
            value={selectedTopicToReplace} 
            onValueChange={setSelectedTopicToReplace}
            className="py-6 space-y-3"
          >
            {followedTopics.map((topicId: string) => {
              const topic = TOPICS_LIST.find(t => t.id === topicId);
              return (
                <div key={topicId} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedTopicToReplace === topicId ? "border-primary bg-primary/5" : "border-border"}`}>
                  <Label htmlFor={topicId} className="flex items-center gap-3 cursor-pointer flex-1">
                    <span className="text-2xl">{topic?.icon}</span>
                    <span className="font-bold">{topic?.name}</span>
                  </Label>
                  <RadioGroupItem value={topicId} id={topicId} className="w-6 h-6" />
                </div>
              );
            })}
          </RadioGroup>

          <DialogFooter className="flex gap-2">
             <Button variant="ghost" onClick={() => setIsReplaceModalOpen(false)} className="flex-1 rounded-xl">إلغاء</Button>
             <Button 
              disabled={!selectedTopicToReplace || saving} 
              onClick={confirmReplacement} 
              className="flex-1 rounded-xl font-bold gap-2"
             >
              {saving ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
              تأكيد الاستبدال
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
