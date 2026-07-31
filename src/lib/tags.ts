import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faInstagram, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { faEnvelope, faPhone } from "@fortawesome/free-solid-svg-icons";

// The combining-diacritics block that NFD splits accents into. Written as
// escapes because the literal marks are invisible in source.
const DIACRITICS = /[\u0300-\u036f]/g;

// Accent-insensitive compare so "regulatorio" matches "Regulatório" and
// "educacao" matches "Educação" — tag names are largely Portuguese.
export const foldAccents = (s: string): string =>
  s.normalize("NFD").replace(DIACRITICS, "").toLowerCase();

// Channel tags (YON-60) are seeded per board with locked names, so they can be
// matched by name and drawn as an icon — four cost one short row, not four.
const CHANNEL_ICONS: Record<string, IconDefinition> = {
  whatsapp: faWhatsapp,
  email: faEnvelope,
  phone: faPhone,
  instagram: faInstagram,
};

// Returns null for custom tags, and for any channel tag whose name we don't
// recognise — those fall back to a normal text chip rather than vanishing.
export const channelIcon = (tag: {
  name: string;
  kind?: string;
}): IconDefinition | null =>
  tag.kind === "channel"
    ? (CHANNEL_ICONS[tag.name.trim().toLowerCase()] ?? null)
    : null;
