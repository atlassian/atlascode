import { spawn } from 'child_process';

export interface Result {
    code: number | null;
    stdout: string;
    stderr: string;
}

export class Shell {
    constructor(private readonly workingDirectory: string) {}

    public async exec(command: string, ...args: string[]): Promise<Result> {
        return new Promise<Result>((resolve, reject) => {
            const proc = spawn(command, args, {
                cwd: this.workingDirectory,
                shell: true,
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                stdout += data;
            });

            proc.stderr.on('data', (data) => {
                stderr += data;
            });

            proc.on('close', (code) => resolve({ code, stdout, stderr }));
            proc.on('error', (err) => reject(err));
        });
    }

    public async output(command: string, ...args: string[]): Promise<string> {
        const result = await this.exec(command, ...args);
        if (result.code !== 0) {
            throw new Error(`Error executing command ${command}: ${result.stderr}`);
        }
        return result.stdout.trim();
    }

    public async lines(command: string, ...args: string[]): Promise<string[]> {
        const output = await this.output(command, ...args);
        return output.split(/\r?\n/).filter((value) => value.length > 0);
    }
}
