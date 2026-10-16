const { selectStudents, loadSample } = require('./samplePool');
const index = require('../../public/data/demo-students/index.json');
const chunk = require('../../public/data/demo-students/pool-000.json');
test('draws ten distinct students and can select a different cohort on the next run', () => {
    const first = selectStudents(index, 10, () => 0);
    const second = selectStudents(index, 10, () => 0.9);
    expect(new Set(first.map(([id]) => id)).size).toBe(10);
    expect(first.map(([id]) => id)).not.toEqual(second.map(([id]) => id));
});
test('loads each required chunk once and preserves the selected original rows', async () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    const fetchJSON = jest.fn(async url => url.endsWith('index.json') ? index : chunk);
    try {
        const selected = await loadSample('https://example.invalid/data/demo-students/index.json', fetchJSON);
        expect(fetchJSON).toHaveBeenCalledTimes(2);
        expect(selected.headers).toEqual(index.headers);
        expect(selected.records).toEqual(chunk.slice(0, 10));
    } finally { random.mockRestore(); }
});
