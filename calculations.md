Yes absolutely. Let me read it carefully and map every calculation.

---

### SECTION 1 — WHO COUNTS AS A REAL CUSTOMER

**Rule 1 — Full refund exclusion**
```
Net Spend = Total Spend - Refunded Volume - Dispute Losses
If Net Spend <= 0 → excluded
```
A customer who paid $300 and got $300 back kept no money with the business. They are not counted as a customer at all. This affects 169 customers in the US dataset.

**Rule 2 — Zero payment count**
```
If Payment Count == 0 → excluded
```
Some Stripe records exist for people who never completed a payment. 133 such records in the US data.

**Rule 3 — Dispute losses**
Same net spend formula catches these. If a customer paid $300 and lost a chargeback for $300, net = $0. Excluded automatically.

---

### SECTION 2 — BOOKING METRICS KPIs

**Total Customers**
```
Source: joined dataset after all exclusions
Formula: count of valid joined records
US Last 90 days: 1,719
```
Every customer who made at least one real booking with net spend > 0 and had activity in the last 90 days.

**Total LTV**
```
Source: net field per customer (gross - refunded - disputes)
Formula: sum of all customer net values
US Last 90 days: $416,048
```
The total real money the business kept from all active customers in the period.

**Avg LTV**
```
Formula: Total LTV / Total Customers
= $416,048 / 1,719 = $242
```
What the average customer has spent with the business over their entire history with the business — not just this period.

**P50 LTV (Median)**
```
Formula: 
1. Sort all customer LTV values low to high
2. Find the middle value
3. If even number of customers interpolate 
   between the two middle values
US Last 90 days: $241
```
Half the customers spent less than $241, half spent more. More honest than the average because it is not pulled up by a few very high spenders. The slider lets you move this to P75 or P90 to see what top spenders look like.

**Repeat Rate**
```
Formula: 
customers with booking_count >= threshold
divided by total customers × 100
Default threshold = 2
US Last 90 days: 8.4%
```
Only 8.4% of active customers booked more than once in the last 90 days. The threshold slider lets the client redefine loyalty — at threshold 3 it shows only customers who came back twice or more.

---

### SECTION 3 — BUSINESS HEALTH KPIs

**Gross Revenue**
```
Source: gross field per customer 
        (sum of all payment amounts before deductions)
Formula: sum of customer.gross across all valid customers
US Last 90 days: $435,371
```
Total amount charged to all customers before any refunds or disputes.

**Refund Losses**
```
Source: refunded field per customer
Formula: sum of customer.refunded
US Last 90 days: $19,323
```
Total money returned to customers. This is real money that left the business.

**Dispute Losses**
```
Source: Dispute Losses column from customers CSV
Formula: sum of customer.disputeLosses
US Last 90 days: $1,365
```
Money lost to chargebacks — customers who disputed payments with their bank. More serious than refunds because the business also pays a chargeback fee to Stripe.

**Net Revenue**
```
Formula: Gross Revenue - Refund Losses - Dispute Losses
= $435,371 - $19,323 - $1,365 = $414,683
```
The real money the business actually kept after all deductions.

**Refund Rate**
```
Formula: 
(Refund Losses + Dispute Losses) / Gross Revenue × 100
= ($19,323 + $1,365) / $435,371 × 100 = 4.8%
```
For every $100 the business charges, $4.80 comes back as a refund or dispute. Industry healthy benchmark is under 5% so 4.8% is right on the edge.

---

### SECTION 4 — BOOKING OUTCOMES

**How a booking is identified**
```
Source: payments CSV
A payment is a booking if:
  Status == Paid OR Refunded
  AND description does NOT contain:
    tip, subscription creation, 
    payment for invoice, fee, 
    parking, change of service request
```

**Full Profit Booking**
```
Formula: Amount Refunded == 0
Count: 1,776 bookings
```
Business kept 100% of what was charged.

**Partial Refund Booking**
```
Formula: Amount Refunded > 0 
         AND (Amount - Amount Refunded) > 0
Count: 120 bookings
Revenue lost: $19,323
Revenue kept: portion of original charge
```
Customer got some money back but the business kept something. Could be a complaint resolved with a partial discount.

**Full Refund Booking**
```
Formula: Net == 0 after refund
Count: 8 bookings
Total loss: sum of original amounts
```
Business kept nothing from these bookings. Complete revenue loss.

**Dispute Loss**
```
Source: Dispute Losses column in customers CSV
Formula: customers where dispute_losses > 0
Count: 8 customers
Total loss: $1,365
```
Customers who filed chargebacks. Unlike refunds these are initiated by the customer's bank not the business.

---

### SECTION 5 — BOOKING FREQUENCY BUCKETS

**How buckets are assigned**
```
Source: booking_count per customer from payments CSV
        (count of valid booking payments in the period)

1 booking  → booked exactly once
2 bookings → booked exactly twice
3 bookings → booked exactly 3 times
4 bookings → booked exactly 4 times
5+ bookings → booked 5 or more times
```

**Why booking_count comes from payments not customers CSV**
The customers CSV has a lifetime `Payment Count` column but it includes all time history — tips, subscription fees, everything. The payments CSV lets us count only real bookings in the selected date period. More accurate and period-specific.

---

### SECTION 6 — BUCKET CHARTS

**Bar Chart — Customer count per bucket**
```
Source: bucketStats computed from viewCustomers
X axis: bucket name
Y axis: count of customers in that bucket
Colors: fixed per bucket (dark blue → orange)
US Last 90 days:
  1 booking:  1,575 customers
  2 bookings: 118 customers
  3 bookings: 19 customers
  4 bookings: 4 customers
  5+ bookings: 3 customers
```
Shows where the customer base is concentrated. For this business 91.6% of active customers only booked once.

**Donut Chart — LTV share per bucket**
```
Formula per slice: 
  bucket.totalLTV / grandTotalLTV × 100
US Last 90 days:
  1 booking:  $360k = 86.6% of total LTV
  2 bookings: $42k  = 10.3%
  3 bookings: $8k   = 2.0%
  4 bookings: $2.7k = 0.7%
  5+ bookings: $1.8k = 0.4%
```
Even though 1-booking customers are the most numerous they also drive 86.6% of revenue. This is because there are so many of them.

**Avg vs Percentile Chart**
```
For each bucket two bars:
  Dark bar  = avg LTV = sum(ltvs) / count
  Light bar = P{slider} LTV = percentile value

Also shows subscriber split:
  Dark blue  = all customers avg
  Light blue = all customers percentile
  Dark green = subscriber avg
  Light green = non-subscriber avg
```
When avg is much higher than P50 it means a small number of high spenders are pulling the average up. The bucket is skewed.

---

### SECTION 7 — DATE RANGE FILTER

**How the filter works**
```
Step 1: Find the latest payment date 
        in the payments CSV
        US: June 14 2026

Step 2: Subtract the selected range
        Last 90 days: cutoff = March 16 2026

Step 3: Include only customers whose 
        last payment >= cutoff date

Why anchored to dataset not today:
  The CSV could be from any point in time.
  Anchoring to today would show wrong 
  results for historical data.
```

---

### SECTION 8 — SUBSCRIBER DETECTION

**How subscribers are identified**
```
Source: payments CSV
Rule: Customer ID appears in at least one 
      payment where:
        Description == 'Subscription creation'
        AND Status == 'Paid'

US result: 56 unique subscribers
Active in last 90 days: 53
```
These are customers paying the $9.99/month membership. The subscriber toggle filters all charts and KPIs to show only this group or exclude them entirely.

---

### SECTION 9 — DATA FLOW SUMMARY

In plain English, here is the journey from CSV to chart:

```
1. Admin uploads 4 CSV files

2. Browser reads payments CSV
   → removes non-bookings (tips, fees etc)
   → identifies subscribers
   → classifies each payment as 
     full profit / partial refund / full refund

3. Browser reads customers CSV
   → gets identity (name, email)
   → gets dispute losses

4. Two files are joined on Customer ID
   → one record per customer combining 
     period booking data + lifetime identity

5. Invalid customers removed (net <= 0)

6. Result saved to Supabase
   → team can open dashboard without uploading

7. Dashboard applies date range filter
   → keeps only customers active in period

8. Subscriber toggle applies
   → further filters to sub/non-sub/all

9. All KPIs, charts, tables computed
   from the filtered customer list

10. Sliders update percentile and 
    repeat rate threshold dynamically
    without re-fetching any data
```

---

This covers every calculation in the codebase. Want me to format this as a proper client-facing document with cleaner language?