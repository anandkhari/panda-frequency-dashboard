export const BUCKETS = [
  '1 booking',
  '2 bookings',
  '3 bookings',
  '4 bookings',
  '5+ bookings',
]

export const BUCKET_COLORS = [
  '#185FA5',
  '#378ADD',
  '#639922',
  '#97C459',
  '#D85A30',
]

export const AVG_BOOKING_VALUE = 225

export const NON_BOOKING_KEYWORDS = [
  'tip',
  'subscription creation',
  'payment for invoice',
  'fee',
  'parking',
  'change of service request',
]

export function getBucket(bookingCount) {
  const n = parseInt(bookingCount)
  if (n === 1) return '1 booking'
  if (n === 2) return '2 bookings'
  if (n === 3) return '3 bookings'
  if (n === 4) return '4 bookings'
  return '5+ bookings'
}