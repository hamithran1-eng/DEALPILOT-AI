/**
 * Formats numeric values to Indian Rupee (INR) format (₹) with en-IN numbering grouping (Lakhs, Crores)
 * e.g., 45000 -> ₹45,000
 * 150000 -> ₹1,50,000
 * 2500000 -> ₹25,00,000
 */
export function formatINR(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Compact Indian formatting for tight spaces / badges
 * e.g., 50000 -> ₹50K, 1500000 -> ₹15L, 25000000 -> ₹2.5Cr
 */
export function formatCompactINR(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }

  const abs = Math.abs(amount);
  if (abs >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1).replace(/\.0$/, '')} Cr`;
  }
  if (abs >= 100000) {
    return `₹${(amount / 100000).toFixed(1).replace(/\.0$/, '')} L`;
  }
  if (abs >= 1000) {
    return `₹${(amount / 1000).toFixed(1).replace(/\.0$/, '')} K`;
  }

  return `₹${amount.toLocaleString('en-IN')}`;
}
