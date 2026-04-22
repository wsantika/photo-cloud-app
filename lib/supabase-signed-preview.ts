import "server-only";
import { supabase } from "@/lib/supabase";

export async function getSignedPreviewUrl(
  filePath: string,
  expiresInSeconds = 60 * 60,
) {
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET;

  if (!bucketName) {
    throw new Error("SUPABASE_STORAGE_BUCKET belum dikonfigurasi");
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error("CREATE_SIGNED_PREVIEW_URL_ERROR", {
      filePath,
      error,
    });

    return null;
  }

  return data.signedUrl;
}
