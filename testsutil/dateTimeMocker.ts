export abstract class DateTimeMocker {
    private static dateNowMock = 0;

    public static initialize(date?: Date): void {
        this.dateNowMock = date?.getTime() || 0;
        jest.spyOn(Date, 'now').mockImplementation(() => this.dateNowMock);
    }

    public static advanceTime(msToRun: number): void {
        jest.advanceTimersByTime(msToRun);
        this.dateNowMock += msToRun;
    }
}