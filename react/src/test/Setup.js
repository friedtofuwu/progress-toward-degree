// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

import App from '../App';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';

module.exports.setup = async (component = <App />) => {
    render(component);
    await waitForElementToBeRemoved(screen.getByText(/loading/i))
}
