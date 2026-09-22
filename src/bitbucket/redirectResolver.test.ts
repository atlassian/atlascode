import axios from 'axios';

import { resolveRedirectHostname } from './redirectResolver';

jest.mock('axios');
jest.mock('../logger');

describe('resolveRedirectHostname', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return the resolved hostname when the server responds with a redirect', async () => {
        (axios.get as jest.Mock).mockResolvedValueOnce({
            headers: { location: 'https://real-host.example.com/' },
        });

        const result = await resolveRedirectHostname('old-alias.example.com');

        expect(result).toEqual('real-host.example.com');
        expect(axios.get).toHaveBeenCalledWith(
            'https://old-alias.example.com/',
            expect.objectContaining({ maxRedirects: 0 }),
        );
    });

    it('should return undefined when there is no location header', async () => {
        (axios.get as jest.Mock).mockResolvedValue({ headers: {} });

        const result = await resolveRedirectHostname('no-redirect.example.com');

        expect(result).toBeUndefined();
    });

    it('should return undefined when the redirect points to the same hostname', async () => {
        (axios.get as jest.Mock).mockResolvedValue({
            headers: { location: 'https://same-host.example.com/other-path' },
        });

        const result = await resolveRedirectHostname('same-host.example.com');

        expect(result).toBeUndefined();
    });

    it('should try http after https fails and still resolve a redirect', async () => {
        (axios.get as jest.Mock)
            .mockRejectedValueOnce(new Error('TLS error'))
            .mockResolvedValueOnce({ headers: { location: 'http://real-host.example.com/' } });

        const result = await resolveRedirectHostname('old-alias.example.com');

        expect(result).toEqual('real-host.example.com');
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('should return undefined when both protocols fail', async () => {
        (axios.get as jest.Mock).mockRejectedValue(new Error('connection refused'));

        const result = await resolveRedirectHostname('unreachable.example.com');

        expect(result).toBeUndefined();
    });
});
