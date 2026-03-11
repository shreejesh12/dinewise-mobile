import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export async function registerWithFirebase(name: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });

  await setDoc(doc(db, 'users', cred.user.uid), {
    name,
    email,
    phone: '',
    address: '',
    points: 0,
    premiumPlan: 'free',
    coupons: [],
    createdAt: serverTimestamp(),
  });

  return {
    token: await cred.user.getIdToken(),
    user: {
      id: cred.user.uid,
      name,
      email,
      role: 'user',
      points: 0,
    },
  };
}

export async function loginWithFirebase(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'users', cred.user.uid));
  const profile = snap.exists() ? snap.data() : {};

  return {
    token: await cred.user.getIdToken(),
    user: {
      id: cred.user.uid,
      name: profile.name || cred.user.displayName || 'User',
      email: cred.user.email,
      role: 'user',
      points: profile.points || 0,
      phone: profile.phone || '',
      address: profile.address || '',
    },
  };
}

export async function logoutFirebase() {
  await signOut(auth);
}