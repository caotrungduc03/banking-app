import type { User as FirebaseUser } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import type { User } from "../types";
import { AuthContext } from "./AuthContextValue";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = useCallback(async () => {
    if (!currentUser) return;

    try {
      console.log("Attempting to fetch user data from Firestore");
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUserData(userData);
        console.log("Successfully retrieved user data");
      } else {
        console.error("User document does not exist");
      }
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      console.error("Error details:", error.code, error.message);

      // Try to determine if it's a permission issue
      if (error.code === "permission-denied") {
        console.error("Firestore permission denied - check your security rules");
      }
      // Network related errors
      if (error.code === "unavailable" || error.code === "failed-precondition") {
        console.error("Network issue or Firestore connection problem");
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        console.log("User authenticated, fetching user data...");
        await refreshUserData();
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [refreshUserData]);

  async function signIn(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }

  async function signUp(email: string, password: string, displayName: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      displayName,
      accountBalance: 1000, // Starting balance for new users
    });
  }

  async function signOut() {
    setUserData(null);
    setCurrentUser(null);
    await firebaseSignOut(auth);
  }

  async function signInWithToken(token: string) {
    await signInWithCustomToken(auth, token);
  }

  const value = {
    currentUser,
    userData,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithToken,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
