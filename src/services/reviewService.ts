import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function addRestaurantReview(payload: {
  uid: string;
  restaurantId: string;
  restaurantName: string;
  rating: number;
  text: string;
  imageUrl?: string;
  proofType?: 'bill' | 'storefront';
  verified: boolean;
  area?: string;
}) {
  await addDoc(collection(db, 'restaurant_reviews'), {
    ...payload,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'users', payload.uid), {
    points: increment(10),
  });
}

export async function addDishReview(payload: {
  uid: string;
  restaurantId: string;
  restaurantName: string;
  dishName: string;
  rating: number;
  text: string;
  billImageUrl?: string;
  verified: boolean;
}) {
  await addDoc(collection(db, 'dish_reviews'), {
    ...payload,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'users', payload.uid), {
    points: increment(50),
  });
}