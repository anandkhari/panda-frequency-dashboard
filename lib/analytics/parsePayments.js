export function parsePayments(rawRows) {
  return rawRows
    .filter(row => {
      const status = row['Status']
      return status === 'Paid' || status === 'Refunded'
    })
    .map(row => ({
      id: row['id'] || '',
      createdAt: new Date(row['Created date (UTC)']),
      amount: parseFloat(row['Amount'] || 0),
      amountRefunded: parseFloat(row['Amount Refunded'] || 0),
      status: row['Status'],
      description: row['Description'] || '',
      customerId: row['Customer ID'] || '',
      invoiceId: row['Invoice ID'] || '',
      packageId: row['packageId (metadata)'] || '',
    }))
}
