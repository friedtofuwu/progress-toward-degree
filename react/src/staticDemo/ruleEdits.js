function validYear(value) {
    if (!/^\d{4}$/.test(String(value))) throw new Error('Enter a four-digit year.');
    return Number(value);
}
function key(row) { return JSON.stringify(row.slice(0, 4)); }
function editRules(previous, path, method, payload) {
    const next = { rows: previous.rows.slice(), years: previous.years.slice() };
    const create = path === '/api/checksheet/year' && method === 'post';
    const copy = path.match(/^\/api\/checksheet\/copy\/(\d+)\/to\/(\d+)$/);
    if (create || copy) {
        const year = validYear(create ? payload.year : copy[2]);
        if (next.years.includes(year)) throw new Error('That checksheet year already exists.');
        if (copy) {
            const source = validYear(copy[1]);
            if (!next.years.includes(source)) throw new Error('The source year does not exist.');
            next.rows.push(...previous.rows.filter(row => Number(row[0]) === source).map(row => [year, ...row.slice(1)]));
        }
        next.years.push(year);
    } else if (path === '/api/checksheet/add' && method === 'post') {
        const p = payload || {}, year = validYear(p.year);
        if (!p.subject?.trim() || !p.category || !String(p.course_number || '').trim()) throw new Error('Subject, course number and category are required.');
        if (!Number.isFinite(Number(p.credit_hours)) || Number(p.credit_hours) < 0) throw new Error('Enter valid credit hours.');
        let substitutes = p.substitutes || [];
        if (typeof substitutes === 'string') substitutes = JSON.parse(substitutes);
        if (!Array.isArray(substitutes)) throw new Error('Course substitutes must be a list.');
        const row = [year, p.subject.trim(), p.category, String(p.course_number), Number(p.credit_hours), p.passing_grade || 'D-', p.repeatable ? 1 : 0, p.conc_eligible || 'cs', substitutes];
        if (next.rows.some(existing => key(existing) === key(row))) throw new Error('Error: Duplicate entry. Course already exists.');
        next.rows.push(row);
        if (!next.years.includes(year)) next.years.push(year);
    } else if (path === '/api/checksheet/delete' && method === 'delete') {
        if (!Array.isArray(payload) || !payload.length) throw new Error('Select at least one course to delete.');
        const keys = new Set(payload.map(p => key([validYear(p.year), p.subject, p.category, String(p.course_number)])));
        next.rows = next.rows.filter(row => !keys.has(key(row)));
    } else { throw new Error('This course rule action is unavailable.'); }
    return next;
}
module.exports = { editRules };
