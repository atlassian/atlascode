import { spawn } from 'child_process';

export interface Result {
    code: number | null;
    stdout: string;
    stderr: string;
}

/**
 * Git-specific hardening: environment variables and config flags that prevent
 * repository-controlled .git/config from executing arbitrary programs.
 *
 * Without these safeguards a malicious repository can set `core.fsmonitor` or
 * `core.hooksPath` in `.git/config` to point at an attacker-supplied executable,
 * which git then runs automatically during index refresh operations (blame, status,
 * diff, etc.), achieving arbitrary code execution simply by opening the repository.
 *
 * References: VULN-2216191
 */
const GIT_SAFE_ENV: NodeJS.ProcessEnv = {
    ...process.env,
    // Disable system-wide and global git config so only the command-line -c flags apply.
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '',
};

const GIT_SAFE_ARGS_PREFIX = ['-c', 'core.fsmonitor=', '-c', 'core.hooksPath='];

export class Shell {
    constructor(private readonly workingDirectory: string) {}

    /**
     * Execute a command with arguments safely, without spawning a shell.
     * Arguments are passed directly to the process, preventing shell injection attacks.
     *
     * When the command is `git`, extra hardening flags and environment variables are
     * automatically prepended to neutralise repository-local config keys that could
     * otherwise cause git to execute attacker-supplied programs (e.g. `core.fsmonitor`,
     * `core.hooksPath`).
     *
     * @param command - The executable to run (e.g. 'git')
     * @param args - Arguments passed directly to the process (not interpreted by a shell)
     */
    public async exec(command: string, ...args: string[]): Promise<Result> {
        const isGit = command === 'git';
        const safeArgs = isGit ? [...GIT_SAFE_ARGS_PREFIX, ...args] : args;
        const spawnEnv = isGit ? GIT_SAFE_ENV : process.env;

        return new Promise<Result>((resolve, reject) => {
            const proc = spawn(command, safeArgs, {
                cwd: this.workingDirectory,
                shell: false,
                env: spawnEnv,
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
