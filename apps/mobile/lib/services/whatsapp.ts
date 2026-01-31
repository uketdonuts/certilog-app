import * as Linking from 'expo-linking';

/**
 * Format phone number for Panama (+507)
 * Panama mobile numbers: 8 digits starting with 6
 * Panama landline: 8 digits starting with 2 or 3
 */
function formatPanamaPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');

  // If 8 digits (Panama local number), add country code
  if (cleanPhone.length === 8) {
    return `507${cleanPhone}`;
  }

  // If already has Panama country code (11 digits starting with 507)
  if (cleanPhone.length === 11 && cleanPhone.startsWith('507')) {
    return cleanPhone;
  }

  // If starts with +507, remove the + (already handled by regex)
  if (cleanPhone.startsWith('507') && cleanPhone.length >= 11) {
    return cleanPhone;
  }

  // Return as-is for other formats (international numbers)
  return cleanPhone;
}

export async function openWhatsApp(phone: string, message?: string): Promise<void> {
  // Format for Panama
  const fullPhone = formatPanamaPhone(phone);

  // Build URL
  const url = message
    ? `whatsapp://send?phone=${fullPhone}&text=${encodeURIComponent(message)}`
    : `whatsapp://send?phone=${fullPhone}`;

  // Check if WhatsApp is installed
  const canOpen = await Linking.canOpenURL(url);

  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // Fallback to web
    const webUrl = message
      ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${fullPhone}`;
    await Linking.openURL(webUrl);
  }
}

export async function callPhone(phone: string): Promise<void> {
  const cleanPhone = phone.replace(/\D/g, '');
  await Linking.openURL(`tel:${cleanPhone}`);
}
