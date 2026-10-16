let years = {};
function setRules(rows, declaredYears = []) {
    years = {};
    for (const year of declaredYears) years[year] = {};
    for (const row of rows) {
        const [year, subject, category, course_number, credit_hours, passing_grade, repeatable, conc_eligible, substitutes] = row;
        const grouped = years[year] ||= {};
        (grouped[category] ||= []).push({ year, subject, category, course_number, credit_hours, passing_grade, repeatable, conc_eligible, substitutes });
    }
}
function getRules(year) {
    if (!years[year]) throw new Error(`No checksheet is available for ${year}. Add or copy that year in Course Requirements first.`);
    return { ...years[year], year: Number(year) };
}
function snapshot() {
    const rows = Object.values(years).flatMap(groups => Object.values(groups).flat().map(c => [c.year, c.subject, c.category, c.course_number, c.credit_hours, c.passing_grade, c.repeatable, c.conc_eligible, c.substitutes]));
    return { rows, years: Object.keys(years).map(Number) };
}
module.exports = { setRules, getRules, snapshot, getYear: async year => ({ result: getRules(year), status: 200 }), getYears: () => Object.keys(years).map(Number) };
