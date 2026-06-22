import { supabase } from "@/integrations/supabase/client";

/** Storage path or legacy public URL → signed URL for private buckets */
export async function resolveStorageUrl(
  bucket: string,
  pathOrUrl: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!pathOrUrl) return null;

  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = pathOrUrl.indexOf(marker);
    if (idx === -1) return pathOrUrl;
    pathOrUrl = pathOrUrl.slice(idx + marker.length);
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(pathOrUrl, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
