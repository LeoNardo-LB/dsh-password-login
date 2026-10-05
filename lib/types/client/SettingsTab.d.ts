/**
 * dsh-password-login settings tab: password lifecycle over dsh UI
 * primitives only (vendored types, no third-party UI — user ruling
 * 2026-10-05). One availability gate: when the host does not serve the
 * primitives module the whole tab renders one error state.
 */
import * as React from 'react';
import type { PasswordStore, PasswordUiState } from './store.ts';
export interface SettingsTabProps {
    state: PasswordUiState;
    store: PasswordStore;
}
export declare function SettingsTab(props: SettingsTabProps): React.ReactNode;
//# sourceMappingURL=SettingsTab.d.ts.map