import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function updateUserProfile(uid: string, data: {
  name?: string;
  phone?: string;
  address?: string;
  premiumPlan?: string;
}) {
  await updateDoc(doc(db, 'users', uid), data);
}