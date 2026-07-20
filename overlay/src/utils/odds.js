/**
 * Odds Conversion Utils
 */

export function decimalToAmerican(decimal) {
    if (decimal <= 1) return 0;
    return decimal >= 2.0
        ? `+${Math.round((decimal - 1) * 100)}`
        : `${Math.round(-100 / (decimal - 1))}`;
}

export function decimalToFractional(decimal) {
    if (decimal <= 1) return '0/1';
    const h = Math.round((decimal - 1) * 100);
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const d = 100;
    const g = gcd(h, d);
    return `${h / g}/${d / g}`;
}

export function americanToDecimal(american) {
    if (american > 0) return 1 + american / 100;
    return 1 + 100 / Math.abs(american);
}

export function calculatePayout(stake, odds) {
    return stake * odds;
}

export function calculateProfit(stake, odds) {
    return stake * (odds - 1);
}

export function calculateRoi(profit, totalStake) {
    if (totalStake === 0) return 0;
    return (profit / totalStake) * 100;
}

export function calculateBreakeven(totalStake, maxPayout) {
    if (maxPayout === 0) return 0;
    return (totalStake / maxPayout) * 100;
}
