
import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  avatar_url?: string | null;
};

function isValidRole(role: unknown): role is Role {
  return (
    role === 'student' ||
    role === 'teacher' ||
    role === 'admin'
  );
}

export async function getProfile(
  userId: string
): Promise<Profile | null> {
  console.log('QRATT: Fetching profile for:', userId);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('QRATT PROFILE ERROR:', error.message);
    throw error;
  }

  if (!data) return null;

  if (!isValidRole(data.role)) {
    console.error('QRATT INVALID ROLE:', data.role);
    return null;
  }

  return data as Profile;
}

export async function getUserRole(
  userId: string
): Promise<Role> {
  const profile = await getProfile(userId);

  if (!profile) {
    throw new Error(
      'Your account profile could not be found or has an invalid role.'
    );
  }

  return profile.role;
}

export async function updateProfile(
  userId: string,
  updates: {
    full_name?: string;
    avatar_url?: string | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return {
    error: error?.message ?? null,
  };
}

export async function uploadProfilePhoto(
  userId: string,
  imageUri: string,
  mimeType = 'image/jpeg'
): Promise<{ url: string | null; error: string | null }> {
  try {
    const response = await fetch(imageUri);

    if (!response.ok) {
      throw new Error('Could not read the selected photo.');
    }

    const imageBlob = await response.blob();

    const extension =
      mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/webp'
          ? 'webp'
          : mimeType === 'image/heic'
            ? 'heic'
            : 'jpg';

    const filePath = `${userId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, imageBlob, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

    const photoUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: photoUrl })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return { url: photoUrl, error: null };
  } catch (error: any) {
    console.error('QRATT PHOTO UPLOAD ERROR:', error);

    return {
      url: null,
      error: error?.message || 'Unable to upload profile photo.',
    };
  }
}
