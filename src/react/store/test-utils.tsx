import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import { setupStore } from './store';

export function renderWithStore(ui: React.ReactElement, { preloadedState = {}, store = setupStore(preloadedState) }) {
    function Wrapper({ children }: { children: React.ReactNode }) {
        return <Provider store={store}>{children}</Provider>;
    }
    return { ...render(ui, { wrapper: Wrapper }), store };
}
