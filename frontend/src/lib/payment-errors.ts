/**
 * Traduce los errores de Mercado Pago (que el backend reenvía como "Mercado Pago: ...")
 * a mensajes que dicen qué pasó y cómo resolverlo.
 */
export function friendlyPaymentError(raw: string): string {
  const m = raw.toLowerCase()
  if (m.includes('different site') || m.includes('guest_site_mismatch'))
    return 'Ese email pertenece a una cuenta de Mercado Pago de otro país. Usa una cuenta de Colombia.'
  if (m.includes('same user') || m.includes('collector') || m.includes('cannot pay yourself'))
    return 'Ese email es el de la cuenta que recibe el pago. Usa el email de quien paga.'
  if (m.includes('card_token') || m.includes('cc_val') || m.includes('card token'))
    return 'Mercado Pago no pudo validar la tarjeta. Revisa los datos e inténtalo de nuevo.'
  if (m.includes('rejected') || m.includes('insufficient') || m.includes('declined'))
    return 'Mercado Pago rechazó la tarjeta. Prueba con otra tarjeta.'
  if (m.includes('ya tienes una suscripción')) return 'Ya tienes una suscripción en curso. Gestiónala desde Mi cuenta.'
  if (m.includes('network error')) return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
  return raw.replace(/^Mercado Pago:\s*/i, 'Mercado Pago respondió: ')
}
