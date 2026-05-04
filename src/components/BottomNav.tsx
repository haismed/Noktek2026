
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Plus, Trophy, User, ShoppingBag, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import NewPostForm from "./NewPostForm";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navItems = [
    { name: "الرئيسية", icon: Home, href: "/" },
    { name: "استكشف", icon: Sparkles, href: "/explore" },
    { name: "السوق", icon: ShoppingBag, href: "/marketplace" },
    { name: "بروفايل", icon: User, href: "/profile" },
  ];

  const handleNewPostClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يجب عليك تسجيل الدخول لتتمكن من إضافة نقاط جديدة.",
      });
      router.push("/login");
    }
  };

  return (
    <nav className="bottom-nav h-20 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-3xl border-t border-border/50">
      {navItems.slice(0, 2).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "nav-item transition-all duration-300",
            pathname === item.href ? "text-primary scale-110" : "text-muted-foreground hover:text-primary/70"
          )}
        >
          <item.icon size={24} className={pathname === item.href ? "fill-primary/10" : ""} />
          <span className="text-[9px] mt-1 font-black">{item.name}</span>
        </Link>
      ))}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <button 
            onClick={handleNewPostClick}
            className="flex flex-col items-center justify-center -mt-12 group"
          >
            <div className="w-16 h-16 bg-gradient-to-tr from-primary to-secondary rounded-full flex items-center justify-center shadow-2xl text-white group-hover:scale-110 group-active:scale-95 transition-all ring-4 ring-background">
              <Plus size={32} strokeWidth={3} />
            </div>
            <span className="text-[10px] mt-2 font-black text-primary">نشر</span>
          </button>
        </DialogTrigger>
        {user && (
          <DialogContent className="sm:max-w-[550px] bg-card border-border p-0 overflow-hidden rounded-3xl">
            <DialogHeader>
              <VisuallyHidden.Root>
                <DialogTitle>نشر نقطة جديدة</DialogTitle>
              </VisuallyHidden.Root>
            </DialogHeader>
            <NewPostForm onClose={() => setIsModalOpen(false)} />
          </DialogContent>
        )}
      </Dialog>

      {navItems.slice(2).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "nav-item transition-all duration-300",
            pathname === item.href ? "text-primary scale-110" : "text-muted-foreground hover:text-primary/70"
          )}
        >
          <item.icon size={24} className={pathname === item.href ? "fill-primary/10" : ""} />
          <span className="text-[9px] mt-1 font-black">{item.name}</span>
        </Link>
      ))}
    </nav>
  );
}
