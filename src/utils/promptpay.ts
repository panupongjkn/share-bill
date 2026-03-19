/**
 * Generate PromptPay QR Payload (EMVCo format)
 */

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function f(id: string, value: string): string {
  return id.padStart(2, '0') + value.length.toString().padStart(2, '0') + value;
}

export function generatePromptPayPayload(id: string, amount?: number): string {
  // sanitize id: remove dashes, spaces
  const targetId = id.replace(/[- ]/g, '');
  
  // Format ID for PromptPay
  // If length is 10, it's a phone number. Format: 0066 + 9 digits (remove leading 0)
  // If length is 13, it's an ID card.
  let formattedId = targetId;
  if (targetId.length === 10 && targetId.startsWith('0')) {
    formattedId = '0066' + targetId.substring(1);
  }

  const merchantInfo = f('00', 'A000000677010111') + f('01', formattedId);
  
  let payload = 
    f('00', '01') + // Payload Format Indicator
    f('01', amount ? '12' : '11') + // Point of Initiation Method (11: Static, 12: Dynamic)
    f('29', merchantInfo) + // Merchant Account Information
    f('53', '764') + // Transaction Currency (THB)
    (amount ? f('54', amount.toFixed(2)) : '') + // Transaction Amount
    f('58', 'TH'); // Country Code

  payload += '6304'; // CRC checksum ID and length
  payload += crc16(payload);

  return payload;
}
