export interface TagInterface {
  id: number;
  board_id?: number;
  name: string;
  color: string;
  // 'channel' tags (WhatsApp/Email/Phone/Instagram) are seeded per board with
  // locked names; 'custom' tags are the free-form labels users create.
  kind?: "channel" | "custom";
}
