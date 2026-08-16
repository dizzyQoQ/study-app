import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebase, isFirebaseConfigured } from "./app";
import { newId } from "../repos/types";

export async function uploadEvidenceFile(file: File, groupId: string, uid: string): Promise<{
  fileUrl: string;
  contentType: string;
}> {
  const contentType = file.type || "image/jpeg";
  if (!isFirebaseConfigured()) {
    return { fileUrl: URL.createObjectURL(file), contentType };
  }
  const evidenceId = newId("file");
  const storageRef = ref(getFirebase().storage, `groups/${groupId}/evidence/${uid}/${evidenceId}`);
  await uploadBytes(storageRef, file, { contentType });
  const fileUrl = await getDownloadURL(storageRef);
  return { fileUrl, contentType };
}
