import type { Contact } from './lib/contact';

/**
 * Contact details for the footer and the "Enquire about this design" links.
 * Leave a value as '' to hide its link; when WhatsApp and email are both '',
 * design pages show no enquiry block.
 */
export const contact: Contact = {
  /** Digits only, country code first, no '+' or spaces. */
  whatsapp: '',
  email: '',
  /** Instagram handle without '@'. */
  instagram: '',
};
