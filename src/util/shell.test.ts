import { Shell } from './shell';

const mockedChildProcess = {
    stdout: {
        on: jest.fn(),
    },
    stderr: {
        on: jest.fn(),
    },
    on: jest.fn(),
};

const mockSpawn = jest.fn((..._args: any[]) => mockedChildProcess);

jest.mock('child_process', () => ({
    spawn: (...args: any[]) => mockSpawn(...args),
}));

describe('shell', () => {
    beforeEach(() => {
        mockSpawn.mockClear();
        mockSpawn.mockReturnValue(mockedChildProcess);
    });

    it('constructor works', () => {
        const instance = new Shell('workingDirectory');
        expect(instance).toBeDefined();
    });

    describe('git hardening (VULN-2216191)', () => {
        it('prepends core.fsmonitor and core.hooksPath neutralisation flags for git commands', () => {
            const instance = new Shell('workingDirectory');
            instance.exec('git', 'blame', '--root', '-l', '-L1,1', '--', 'file.ts');

            expect(mockSpawn).toHaveBeenCalledWith(
                'git',
                ['-c', 'core.fsmonitor=', '-c', 'core.hooksPath=', 'blame', '--root', '-l', '-L1,1', '--', 'file.ts'],
                expect.objectContaining({ shell: false }),
            );
        });

        it('sets GIT_CONFIG_NOSYSTEM=1 and GIT_CONFIG_GLOBAL="" in the env for git commands', () => {
            const instance = new Shell('workingDirectory');
            instance.exec('git', 'rev-parse', '--show-toplevel');

            const spawnOptions = (mockSpawn.mock.calls[0] as any[])[2] as { env: NodeJS.ProcessEnv };
            expect(spawnOptions.env).toBeDefined();
            expect(spawnOptions.env!['GIT_CONFIG_NOSYSTEM']).toBe('1');
            expect(spawnOptions.env!['GIT_CONFIG_GLOBAL']).toBe('');
        });

        it('does NOT prepend git hardening flags for non-git commands', () => {
            const instance = new Shell('workingDirectory');
            instance.exec('echo', 'hello');

            expect(mockSpawn).toHaveBeenCalledWith('echo', ['hello'], expect.objectContaining({ shell: false }));

            const spawnArgs = (mockSpawn.mock.calls[0] as any[])[1] as string[];
            expect(spawnArgs).not.toContain('core.fsmonitor=');
        });

        it('does NOT set GIT_CONFIG_NOSYSTEM for non-git commands', () => {
            const instance = new Shell('workingDirectory');
            instance.exec('echo', 'hello');

            const spawnOptions = (mockSpawn.mock.calls[0] as any[])[2] as { env?: NodeJS.ProcessEnv };
            expect(spawnOptions?.env?.['GIT_CONFIG_NOSYSTEM']).toBeUndefined();
        });
    });

    describe('exec', () => {
        it('registers to stdout, stderr, close, and error events', () => {
            const instance = new Shell('workingDirectory');
            instance.exec('sudo rm -rf /*');

            expect(mockedChildProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
            expect(mockedChildProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
            expect(mockedChildProcess.on).toHaveBeenCalledWith('close', expect.any(Function));
            expect(mockedChildProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
        });

        it('promise resolves when the close event triggers', async () => {
            let closeCallback: Function = undefined!;
            (mockedChildProcess.on as jest.Mock).mockImplementation((eventName, callback) => {
                if (eventName === 'close') {
                    closeCallback = callback;
                }
            });

            const instance = new Shell('workingDirectory');
            const execPromise = instance.exec('sudo rm -rf /*');

            expect(execPromise).toBeDefined();
            expect(closeCallback).toBeDefined();

            closeCallback(123);

            const result = await execPromise;
            expect(result).toBeDefined();
        });

        it('promise rejects when the error event triggers', async () => {
            let errorCallback: Function = undefined!;
            (mockedChildProcess.on as jest.Mock).mockImplementation((eventName, callback) => {
                if (eventName === 'error') {
                    errorCallback = callback;
                }
            });

            const instance = new Shell('workingDirectory');
            const execPromise = instance.exec('sudo rm -rf /*');

            expect(execPromise).toBeDefined();
            expect(errorCallback).toBeDefined();

            errorCallback(new Error('errrrrror'));

            await expect(execPromise).rejects.toThrow('errrrrror');
        });
    });

    describe('cmd execution', () => {
        let stdoutCallback: Function = undefined!;
        let stderrCallback: Function = undefined!;
        let closeCallback: Function = undefined!;

        beforeEach(() => {
            stdoutCallback = undefined!;
            stderrCallback = undefined!;
            closeCallback = undefined!;

            mockedChildProcess.stdout.on.mockImplementation((eventName, callback) => {
                if (eventName === 'data') {
                    stdoutCallback = callback;
                }
            });
            mockedChildProcess.stderr.on.mockImplementation((eventName, callback) => {
                if (eventName === 'data') {
                    stderrCallback = callback;
                }
            });
            (mockedChildProcess.on as jest.Mock).mockImplementation((eventName, callback) => {
                if (eventName === 'close') {
                    closeCallback = callback;
                }
            });
        });

        it('via exec returns an object with errorcode, stdout and stderr captured from the process', async () => {
            const instance = new Shell('workingDirectory');
            const execPromise = instance.exec('sudo rm -rf /*');

            expect(execPromise).toBeDefined();

            stdoutCallback('hello');
            stdoutCallback(' my');
            stdoutCallback(' friend');
            stderrCallback('who are you');
            stderrCallback('???');
            closeCallback(0);

            const result = await execPromise;
            expect(result.code).toEqual(0);
            expect(result.stdout).toEqual('hello my friend');
            expect(result.stderr).toEqual('who are you???');
        });

        it('via output returns an the stdout if the errorcode is 0', async () => {
            const instance = new Shell('workingDirectory');
            const outputPromise = instance.output('sudo rm -rf /*');

            expect(outputPromise).toBeDefined();

            stdoutCallback('hello');
            stdoutCallback(' my');
            stdoutCallback(' friend');
            stderrCallback('who are you');
            stderrCallback('???');
            closeCallback(0);

            const result = await outputPromise;
            expect(result).toEqual('hello my friend');
        });

        it('via output fails if the errorcode is not 0', async () => {
            const instance = new Shell('workingDirectory');
            const outputPromise = instance.output('sudo rm -rf /*');

            expect(outputPromise).toBeDefined();

            stdoutCallback('hello');
            stdoutCallback(' my');
            stdoutCallback(' friend');
            stderrCallback('who are you');
            stderrCallback('???');
            closeCallback(1);

            await expect(outputPromise).rejects.toThrow(`Error executing command sudo rm -rf /*: who are you???`);
        });

        it('via lines returns an the stdout split in lines if the errorcode is 0', async () => {
            const instance = new Shell('workingDirectory');
            const linesPromise = instance.lines('sudo rm -rf /*');

            expect(linesPromise).toBeDefined();

            stdoutCallback('hello\n');
            stdoutCallback('my\n');
            stdoutCallback('friend\n');
            stderrCallback('who are you\n');
            stderrCallback('???');
            closeCallback(0);

            const result = await linesPromise;
            expect(result).toHaveLength(3);
            expect(result[0]).toEqual('hello');
            expect(result[1]).toEqual('my');
            expect(result[2]).toEqual('friend');
        });

        it('via lines fails if the errorcode is not 0', async () => {
            const instance = new Shell('workingDirectory');
            const linesPromise = instance.lines('sudo rm -rf /*');

            expect(linesPromise).toBeDefined();

            stdoutCallback('hello');
            stdoutCallback(' my');
            stdoutCallback(' friend');
            stderrCallback('who are you');
            stderrCallback('???');
            closeCallback(1);

            await expect(linesPromise).rejects.toThrow(`Error executing command sudo rm -rf /*: who are you???`);
        });
    });
});
