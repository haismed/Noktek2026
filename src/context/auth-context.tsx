"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import { initPlatformStats } from "@/lib/platform-service";

interface AuthContextType {
  user: any | null;
  loading: boolean;
  userData: any | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userData: null,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    initPlatformStats();

    let unsubscribeUser: (() => void) | undefined;

    // Use onAuthStateChanged for robust auth state management
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Setup real-time listener for Firestore user document
        unsubscribeUser = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            
            // Auto-redirect if user hasn't selected topics yet
            if (data.followedTopics?.length === 0 && 
                !["/topics", "/terms", "/login", "/signup"].includes(pathname)) {
              router.push("/topics");
            }
          } else {
            setUserData(null);
          }
          setLoading(false);
        }, (err) => {
          console.error("Firestore listener error:", err);
          setLoading(false);
        });
      } else {
        if (unsubscribeUser) unsubscribeUser();
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [pathname, router]);

  const logout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, userData, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
