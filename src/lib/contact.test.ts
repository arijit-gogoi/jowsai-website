import { describe, expect, test } from 'bun:test';
import { contactLinks, enquiryLinks, type Contact } from './contact';

const empty: Contact = { whatsapp: '', email: '', instagram: '' };
const filled: Contact = { whatsapp: '911234567890', email: 'studio@jowsai.test', instagram: 'jowsai_studio' };

describe('contactLinks (footer)', () => {
  test('V5: empty values render no links', () => {
    expect(contactLinks(empty)).toEqual([]);
    expect(contactLinks({ ...empty, email: 'studio@jowsai.test' }).map((link) => link.kind)).toEqual(['email']);
  });

  test('I.link: WhatsApp, Email and Instagram hrefs', () => {
    expect(contactLinks(filled)).toEqual([
      { kind: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/911234567890' },
      { kind: 'email', label: 'Email', href: 'mailto:studio@jowsai.test' },
      { kind: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/jowsai_studio/' },
    ]);
  });
});

describe('enquiryLinks (design CTA)', () => {
  test('V5: empty WhatsApp and email render no CTA links, even with Instagram set', () => {
    expect(enquiryLinks({ ...empty, instagram: 'jowsai_studio' }, 'Eri Silk Stole — Ivory')).toEqual([]);
  });

  test('I.link: WhatsApp text and email subject carry the design name', () => {
    const [whatsapp, email] = enquiryLinks(filled, 'Eri Silk Stole — Red Motif');
    expect(whatsapp?.href.startsWith('https://wa.me/911234567890?text=')).toBe(true);
    expect(decodeURIComponent(whatsapp!.href.split('?text=')[1]!)).toContain('Eri Silk Stole — Red Motif');
    expect(email?.href).toBe(`mailto:studio@jowsai.test?subject=${encodeURIComponent('Eri Silk Stole — Red Motif')}`);
  });
});

describe('validation', () => {
  test.each(['+911234567890', '91 12345 67890', '1234567', '1234567890123456', 'abc'])(
    'V5: WhatsApp "%s" fails the build',
    (whatsapp) => {
      expect(() => contactLinks({ ...empty, whatsapp })).toThrow('contact.whatsapp');
    },
  );

  test('V5: placeholder values fail the build', () => {
    expect(() => contactLinks({ ...empty, email: 'TODO' })).toThrow('placeholder');
    expect(() => contactLinks({ ...empty, email: 'you@example.com' })).toThrow('placeholder');
    expect(() => contactLinks({ ...empty, instagram: 'todo' })).toThrow('placeholder');
  });

  test('V5: malformed email or Instagram handle fails the build', () => {
    expect(() => contactLinks({ ...empty, email: 'studio.jowsai' })).toThrow('contact.email');
    expect(() => contactLinks({ ...empty, instagram: '@jowsai' })).toThrow('contact.instagram');
  });
});
