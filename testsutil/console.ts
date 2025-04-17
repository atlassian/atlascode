export function disableConsole(...methods: ("log" | "warn" | "error")[]) {
    methods.forEach((m) => jest.spyOn(console, m).mockImplementation(() => { }));
}