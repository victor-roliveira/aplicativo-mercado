import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

const PRODUCT_IMAGE_BUCKET = "product-images";
const PROFILE_AVATAR_BUCKET = "profile-avatars";

export type UploadableProductImage = {
  uri: string;
  base64: string;
  mimeType?: string | null;
  fileName?: string | null;
};

export type UploadableProfileAvatar = UploadableProductImage;

function getClient() {
  if (!supabase) {
    throw new Error("Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.");
  }

  return supabase;
}

function getExtension(fileName?: string | null, mimeType?: string | null) {
  const normalizedFileName = fileName?.trim();

  if (normalizedFileName?.includes(".")) {
    return normalizedFileName.split(".").pop()?.toLowerCase() ?? "jpg";
  }

  if (mimeType?.includes("/")) {
    return mimeType.split("/")[1]?.toLowerCase() ?? "jpg";
  }

  return "jpg";
}

function sanitizeFileSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 24) || "produto";
}

async function uploadImageToBucket(bucket: string, folder: string, asset: UploadableProductImage) {
  const client = getClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Entre novamente para enviar imagens.");
  }

  if (!asset.base64) {
    throw new Error("Nao foi possivel ler a imagem selecionada.");
  }

  const extension = getExtension(asset.fileName, asset.mimeType);
  const fileName = sanitizeFileSegment(asset.fileName?.replace(/\.[^.]+$/, "") ?? "imagem");
  const objectPath = `${folder}/${user.id}/${Date.now()}-${fileName}.${extension}`;
  const contentType = asset.mimeType ?? `image/${extension}`;
  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(objectPath, decode(asset.base64), {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function uploadProductImage(asset: UploadableProductImage) {
  return uploadImageToBucket(PRODUCT_IMAGE_BUCKET, "products", asset);
}

export async function uploadProfileAvatar(asset: UploadableProfileAvatar) {
  return uploadImageToBucket(PROFILE_AVATAR_BUCKET, "avatars", asset);
}

function getPublicObjectPath(imageUrl: string, bucket: string) {
  try {
    const { pathname } = new URL(imageUrl);
    const publicPrefix = `/storage/v1/object/public/${bucket}/`;

    if (!pathname.includes(publicPrefix)) {
      return null;
    }

    return decodeURIComponent(pathname.split(publicPrefix)[1] ?? "");
  } catch {
    return null;
  }
}

export async function removeProductImageByUrl(imageUrl?: string) {
  if (!imageUrl?.trim()) {
    return;
  }

  const objectPath = getPublicObjectPath(imageUrl, PRODUCT_IMAGE_BUCKET);

  if (!objectPath) {
    return;
  }

  const client = getClient();
  const { error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).remove([objectPath]);

  if (error) {
    throw error;
  }
}

export async function removeProfileAvatarByUrl(imageUrl?: string) {
  if (!imageUrl?.trim()) {
    return;
  }

  const objectPath = getPublicObjectPath(imageUrl, PROFILE_AVATAR_BUCKET);

  if (!objectPath) {
    return;
  }

  const client = getClient();
  const { error } = await client.storage.from(PROFILE_AVATAR_BUCKET).remove([objectPath]);

  if (error) {
    throw error;
  }
}
