export interface PasswordStatus {
    configured: boolean;
    stale: boolean;
    v: number;
}
export interface PasswordUiState {
    loaded: boolean;
    unauthorized: boolean;
    status?: PasswordStatus;
    busy: boolean;
    message?: {
        kind: 'ok' | 'error';
        text: string;
    };
}
export interface PasswordStore {
    getSnapshot(): PasswordUiState;
    subscribe(listener: (state: PasswordUiState) => void): () => void;
    refresh(): Promise<void>;
    rotate(input: {
        current?: string;
        next: string;
    }): Promise<boolean>;
}
export type FetchLike = (input: string, init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}) => Promise<{
    status: number;
    ok: boolean;
    json(): Promise<unknown>;
}>;
export declare function createInitialUiState(): PasswordUiState;
export declare function createStore(fetchLike: FetchLike): PasswordStore;
//# sourceMappingURL=store.d.ts.map