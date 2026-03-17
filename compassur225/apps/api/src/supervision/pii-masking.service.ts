import { Injectable } from '@nestjs/common';

/**
 * PII Masking Service
 * Masks personally identifiable information by default.
 * Unmasking requires explicit permission + reason + audit logging.
 */
@Injectable()
export class PiiMaskingService {
  /**
   * Mask a phone number: +22507123456 → +225****3456
   */
  maskPhone(phone: string | null | undefined): string {
    if (!phone) return '***';
    if (phone.length <= 4) return '****';
    return phone.slice(0, 4) + '****' + phone.slice(-4);
  }

  /**
   * Mask an email: john.doe@example.com → j***@example.com
   */
  maskEmail(email: string | null | undefined): string {
    if (!email) return '***';
    const [local, domain] = email.split('@');
    if (!domain) return '***@***';
    return local.charAt(0) + '***@' + domain;
  }

  /**
   * Mask a name: Jean Dupont → J*** D***
   */
  maskName(name: string | null | undefined): string {
    if (!name) return '***';
    return name
      .split(' ')
      .map((part) => (part.length > 0 ? part.charAt(0) + '***' : '***'))
      .join(' ');
  }

  /**
   * Mask a generic string (e.g., vehicle plate): AB-1234-CD → AB-****-CD
   */
  maskGeneric(value: string | null | undefined): string {
    if (!value) return '***';
    if (value.length <= 4) return '****';
    return value.slice(0, 2) + '****' + value.slice(-2);
  }

  /**
   * Apply masking to an object's PII fields.
   * Returns a new object with masked fields.
   */
  maskRecord<T extends Record<string, any>>(
    record: T,
    fieldRules: Record<string, 'phone' | 'email' | 'name' | 'generic'>,
  ): T {
    const masked = { ...record };
    for (const [field, rule] of Object.entries(fieldRules)) {
      if (masked[field] !== undefined && masked[field] !== null) {
        switch (rule) {
          case 'phone':
            (masked as any)[field] = this.maskPhone(masked[field]);
            break;
          case 'email':
            (masked as any)[field] = this.maskEmail(masked[field]);
            break;
          case 'name':
            (masked as any)[field] = this.maskName(masked[field]);
            break;
          case 'generic':
            (masked as any)[field] = this.maskGeneric(masked[field]);
            break;
        }
      }
    }
    return masked;
  }

  /**
   * Apply masking to an array of records.
   */
  maskRecords<T extends Record<string, any>>(
    records: T[],
    fieldRules: Record<string, 'phone' | 'email' | 'name' | 'generic'>,
  ): T[] {
    return records.map((r) => this.maskRecord(r, fieldRules));
  }
}
