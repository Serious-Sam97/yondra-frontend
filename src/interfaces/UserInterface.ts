// The authenticated user, as returned by GET /api/user, PUT /api/user and the
// login/register payloads (Laravel User model; secrets are hidden server-side).
export interface UserInterface {
  id: number;
  name: string;
  email: string;
  // Destination for WhatsApp-channel notifications; null when not configured.
  whatsapp_number?: string | null;
  is_admin?: boolean;
  email_verified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
