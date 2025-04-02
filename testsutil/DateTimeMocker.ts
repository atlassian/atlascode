export abstract class DateTimeMocker {
    private static dateNowMock = 0;

    public static initialize(): void {
        jest.spyOn(Date, 'now').mockImplementation(() => this.dateNowMock);
    }

    public static advanceTime(msToRun: number): void {
        jest.advanceTimersByTime(msToRun);
        this.dateNowMock += msToRun;
    }
}