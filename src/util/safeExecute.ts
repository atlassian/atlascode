export function safeExecute(body: () => void): void;
export function safeExecute(body: () => void, finallyBody: () => void): void;
export function safeExecute(body: () => void, finallyBody?: () => void): void {
    try {
        body();
    } catch {
    } finally {
        try {
            if (finallyBody) {
                finallyBody();
            }
        } catch {}
    }
}

export async function safeExecuteAsync(body: () => Promise<void>): Promise<void>;
export async function safeExecuteAsync(
    body: () => Promise<void>,
    finallyBody: () => void | Promise<void>,
): Promise<void>;
export async function safeExecuteAsync(
    body: () => Promise<void>,
    finallyBody?: () => void | Promise<void>,
): Promise<void> {
    try {
        await body();
    } catch {
    } finally {
        try {
            if (finallyBody) {
                await finallyBody();
            }
        } catch {}
    }
}
