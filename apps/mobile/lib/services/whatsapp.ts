import * as Linking from 'expo-linking';

export async function openWhatsApp(phone: string, message?: string): Promise<void> {
  // Clean phone number (only digits)
  const cleanPhone = phone.replace(/\D/g, '');

  // Ensure country code (assuming Dominican Republic +1 if no code)
  // Adjust this based on your target country
  const fullPhone = cleanPhone.length === 10 ? `1${cleanPhone}` : cleanPhone;

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
