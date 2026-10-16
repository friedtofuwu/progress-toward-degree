// Fisher-Yates sampling: no duplicates within a run; separate runs may overlap.
function selectStudents(index, count = 10, random = Math.random) {
    if (!Array.isArray(index.students) || index.students.length < count) throw new Error('The sample pool does not contain enough students.');
    const entries = index.students.slice();
    for (let i = 0; i < count; i++) {
        const j = i + Math.floor(random() * (entries.length - i));
        [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    return entries.slice(0, count);
}
async function loadSample(indexURL, fetchJSON) {
    const index = await fetchJSON(indexURL);
    const selection = selectStudents(index, 10);
    const chunks = [...new Set(selection.map(([, chunk]) => chunk))];
    const loaded = await Promise.all(chunks.map(chunk => fetchJSON(new URL(index.chunks[chunk], indexURL).href)));
    const records = new Map(loaded.flat().map(student => [student.id, student]));
    const selected = selection.map(([id]) => {
        if (!records.has(id)) throw new Error('A sample record could not be loaded. Please try again.');
        return records.get(id);
    });
    return { records: selected, headers: index.headers };
}
module.exports = { selectStudents, loadSample };
