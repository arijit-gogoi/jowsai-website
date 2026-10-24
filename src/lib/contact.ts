/**
 * Contact links built from src/config.ts. An empty value renders no link;
 * a malformed or placeholder value fails the build instead of shipping a
 * broken href.
 */
export interface Contact {
  /** Digits only, country code first, no '+'. */
  whatsapp: string;
  email: string;
  /** Handle without '@'. */
  instagram: string;
}

export interface ContactLink {
  kind: keyof Contact;
  label: string;
  href: string;
}

const PLACEHOLDER = /todo|example|placeholder/i;

function validate(contact: Contact): void {
  for (const [key, value] of Object.entries(contact)) {
    if (PLACEHOLDER.test(value)) {
      throw new Error(`src/config.ts: contact.${key} "${value}" looks like a placeholder. Use the real value or ''.`);
    }
  }
  if (contact.whatsapp && !/^\d{8,15}$/.test(contact.whatsapp)) {
    throw new Error(`src/config.ts: contact.whatsapp must be 8-15 digits, country code first, no '+' or spaces.`);
  }
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    throw new Error(`src/config.ts: contact.email "${contact.email}" is not an email address.`);
  }
  if (contact.instagram && !/^[A-Za-z0-9._]{1,30}$/.test(contact.instagram)) {
    throw new Error(`src/config.ts: contact.instagram must be a handle without '@' (letters, digits, '.' and '_').`);
  }
}

/** Footer links in WhatsApp · Email · Instagram order. */
export function contactLinks(contact: Contact): ContactLink[] {
  validate(contact);
  const links: ContactLink[] = [];
  if (contact.whatsapp) links.push({ kind: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/${contact.whatsapp}` });
  if (contact.email) links.push({ kind: 'email', label: 'Email', href: `mailto:${contact.email}` });
  if (contact.instagram) {
    links.push({ kind: 'instagram', label: 'Instagram', href: `https://www.instagram.com/${contact.instagram}/` });
  }
  return links;
}

/** Design CTA links: WhatsApp message and email subject name the design. */
export function enquiryLinks(contact: Contact, designName: string): ContactLink[] {
  validate(contact);
  const links: ContactLink[] = [];
  if (contact.whatsapp) {
    const text = encodeURIComponent(`Hello, I would like to enquire about ${designName}.`);
    links.push({ kind: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/${contact.whatsapp}?text=${text}` });
  }
  if (contact.email) {
    links.push({ kind: 'email', label: 'Email', href: `mailto:${contact.email}?subject=${encodeURIComponent(designName)}` });
  }
  return links;
}
