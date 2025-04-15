function pRetry(
	input: (attemptCount: number) => PromiseLike<any> | any,
	options?: any
): Promise<any> {
    return Promise.resolve('');
}

module.exports = pRetry;