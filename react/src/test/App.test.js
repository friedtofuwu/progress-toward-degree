import { render, screen } from '@testing-library/react';
import { setup } from './Setup'

describe('Homepage', () => {
    beforeEach(async () => {
        await setup()
    })

    it('displays login link', () => {
        expect(screen.queryByRole('link', { name: /login/i })).toBeInTheDocument()
    })
})
