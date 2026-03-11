import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

export async function uploadReviewProof(file: File, uid: string, folder: 'bills' | 'restaurants') {
  const path = `${folder}/${uid}/${Date.now()}-${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}