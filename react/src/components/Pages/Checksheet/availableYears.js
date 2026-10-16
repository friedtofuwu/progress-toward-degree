export function availableYears(rows) {
    return [...new Set(rows.map(row => Number(row.year)).filter(Number.isFinite))]
        .sort((a, b) => b - a).map(year => ({ year }));
}
export function selectAvailableYear(rows, requested) {
    return rows.some(row => String(row.year) === String(requested))
        ? String(requested) : rows.length ? String(rows[0].year) : '';
}
