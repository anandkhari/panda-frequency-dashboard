export function getCustomerLabel(customerType, count = 1, capitalize = false) {
  let label
  if (customerType === 'sub') {
    label = count === 1 ? 'subscriber' : 'subscribers'
  } else if (customerType === 'non') {
    label = count === 1 ? 'non-subscriber' : 'non-subscribers'
  } else {
    label = count === 1 ? 'customer' : 'customers'
  }
  if (capitalize) {
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return label
}
