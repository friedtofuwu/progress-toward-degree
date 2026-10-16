let years = {};
function setRules(rows) {
    years = {};
    for (const row of rows) {
        const [year, subject, category, course_number, credit_hours, passing_grade, repeatable, conc_eligible, substitutes] = row;
        const grouped = years[year] ||= {};
        (grouped[category] ||= []).push({ year, subject, category, course_number, credit_hours, passing_grade, repeatable, conc_eligible, substitutes });
    }
}
function getRules(year) {
    if (!years[year]) throw new Error(`No checksheet is available for ${year}. Use an admit year from 2007 to 2025.`);
    return { ...years[year], year: Number(year) };
}
module.exports = { setRules, getRules, getYear: async year => ({ result: getRules(year), status: 200 }), getYears: () => Object.keys(years).map(Number) };
