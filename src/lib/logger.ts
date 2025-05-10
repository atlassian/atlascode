export interface Logger {
    info(message?: any, ...params: any[]): void;
    debug(message?: any, ...params: any[]): void;
    warn(message?: any, ...params: any[]): void;
    error(ex: Error, errorMessage?: string): void;
}
