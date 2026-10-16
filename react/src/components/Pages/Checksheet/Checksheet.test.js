import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import Checksheet from './index';
import { installStaticDemo } from '../../../staticDemo/client';
import { availableYears, selectAvailableYear } from './availableYears';
import { indexedDB } from 'fake-indexeddb';
const v8 = require('node:v8');
global.indexedDB = indexedDB;
global.structuredClone = value => v8.deserialize(v8.serialize(value));
jest.mock('../../../staticDemo/workerClient', () => ({ runWorker: jest.fn() }));
const courseRules = require('../../../../public/data/checksheets.json');

test('defaults to the latest real checksheet and shows its courses when the calendar year is missing', async () => {
    const date = jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    const previousFetch = global.fetch;
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => courseRules }));
    installStaticDemo();
    const view = render(<Checksheet />);
    try {
        await screen.findByText('2025');
        expect(screen.queryByText('2026')).toBeNull();
        const heading = screen.getByRole('heading', { name: 'CS Core' });
        const table = heading.closest('.class-table-list');
        const core = courseRules.filter(row => row[0] === 2025 && row[2] === 'core');
        const expectedCredits = core.reduce((sum, row) => sum + Number(row[4]), 0);
        await waitFor(() => expect(table.textContent).toContain(`Credits: ${expectedCredits}`));
        fireEvent.click(heading);
        expect(within(table).getAllByText(new RegExp(`${core[0][1]}${core[0][3]}`)).length).toBeGreaterThan(0);
        expect(screen.getByRole('button', {name: /Add New Year/})).toBeTruthy();
        expect(within(table).getByRole('button', {name: 'add'})).toBeTruthy();
        expect(within(table).getByRole('button', {name: 'delete'})).toBeTruthy();
    } finally {
        view.unmount();
        global.fetch = previousFetch;
        date.mockRestore();
    }
});

test('preserves an existing selected year and sorts the available SQL rule years', () => {
    const years = availableYears([{year: 2021}, {year: '2025'}, {year: 2021}]);
    expect(selectAvailableYear(years, 2026)).toBe('2025');
    expect(selectAvailableYear(years, '2021')).toBe('2021');
    expect(selectAvailableYear([], 2026)).toBe('');
});
