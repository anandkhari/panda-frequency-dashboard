// Handles both the new Stripe customers export format (id, Total Spend, ...)
// and the old aggregated format (customer_id, net_volume, ...) for backward compat.

function isNewFormat(firstRow) {
  return 'Total Spend' in firstRow || 'id' in firstRow
}

function parseNewRow(row) {
  return {
    id: row['id'] || '',
    name: row['Name'] || 'Unknown',
    email: row['Email'] || '',
    city: row['Address City'] || '',
    country: row['Address Country'] || '',
    createdAt: row['Created (UTC)'] ? new Date(row['Created (UTC)']) : null,
    totalSpend: parseFloat(row['Total Spend'] || 0),
    paymentCount: parseInt(row['Payment Count'] || 0),
    refundedVolume: parseFloat(row['Refunded Volume'] || 0),
    disputeLosses: parseFloat(row['Dispute Losses'] || 0),
    firebaseUid: row['firebaseUid (metadata)'] || '',
  }
}

function parseOldRow(row) {
  return {
    id: row['customer_id'] || '',
    name: row['name'] || 'Unknown',
    email: row['email'] || '',
    city: '',
    country: '',
    createdAt: row['created'] ? new Date(row['created']) : null,
    totalSpend: parseFloat(row['net_volume'] || 0),
    paymentCount: parseInt(row['payment_count'] || 0),
    refundedVolume: parseFloat(row['refund_volume'] || 0),
    disputeLosses: 0,
    firebaseUid: '',
  }
}

export function parseCustomers(rawRows) {
  if (!rawRows.length) return []
  const useNew = isNewFormat(rawRows[0])
  return rawRows
    .map(row => useNew ? parseNewRow(row) : parseOldRow(row))
    .filter(c => c.id && c.totalSpend > 0)
}
