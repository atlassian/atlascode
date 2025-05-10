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

jest.mock('child_process', () => ({
    spawn: () => mockedChildProcess,
}));

describe('shell', () => {
    it('constructor works', () => {
        const instance = new Shell('workingDirectory');
        expect(instance).toBeDefined();
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
