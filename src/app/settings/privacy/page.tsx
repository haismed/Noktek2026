
'use client';

import { useAuth } from "@/context/auth-context";
import { useState, useEffect } from "react";
import { updatePrivacySettings } from "@/lib/profile-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ShieldCheck, Lock, Users, Eye, Globe, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function PrivacySettingsPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [privacy, setPrivacy] = useState<any>(null);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (userData) {
      setPrivacy(userData.privacy || {
        profileVisibility: "public",
        showPoints: "friends",
        showPosts: "public",
        showEarnings: false,
        allowFriendRequests: true,
        showLocation: true
      });
      setCountry(userData.country || "");
      setCity(userData.city || "");
    }
  }, [userData]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Update location directly on user doc
      await updateDoc(doc(db, "users", user.uid), {
        country,
        city,
        privacy: privacy
      });
      toast({ title: "تم حفظ الإعدادات", description: "تم تحديث تفضيلاتك بنجاح." });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل الحفظ، حاول مرة أخرى." });
    } finally {
      setLoading(false);
    }
  };

  if (!privacy) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight className="rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <ShieldCheck className="text-primary" />
          الإعدادات والخصوصية
        </h1>
      </div>

      <div className="space-y-6">
        {/* Location Section */}
        <Card className="rounded-3xl border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <MapPin size={20} className="text-primary" />
              الموقع الجغرافي للمعلنين
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="text-[10px] text-muted-foreground mb-4">إضافة موقعك الجغرافي يساعد المعلنين في استهدافك، مما يزيد من أرباحك من الحملات الإعلانية.</p>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">الدولة</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="مثال: المغرب" className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">المدينة</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: الدار البيضاء" className="rounded-xl h-12" />
                </div>
             </div>
             <div className="flex items-center justify-between bg-muted/30 p-4 rounded-2xl mt-4">
              <Switch 
                checked={privacy.showLocation} 
                onCheckedChange={(c) => setPrivacy({...privacy, showLocation: c})} 
              />
              <div className="text-right">
                <p className="font-bold text-sm">إظهار الموقع للعامة</p>
                <p className="text-[10px] text-muted-foreground">تمكين المعلنين من رؤية دولتك ومدينتك</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Visibility */}
        <Card className="rounded-3xl border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Eye size={20} className="text-primary" />
              ظهور الملف الشخصي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="font-bold">من يمكنه رؤية ملفك وتفاصيلك؟</Label>
              <Select value={privacy.profileVisibility} onValueChange={(v) => setPrivacy({...privacy, profileVisibility: v})}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="public">للجميع (العامة) 🌍</SelectItem>
                  <SelectItem value="friends">للأصدقاء فقط 👥</SelectItem>
                  <SelectItem value="private">خاص بي فقط 🔒</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handleSave} 
          disabled={loading} 
          className="w-full h-14 rounded-2xl font-black text-lg shadow-lg"
        >
          {loading ? <Loader2 className="animate-spin" /> : "حفظ التغييرات"}
        </Button>
      </div>
    </div>
  );
}
