import { jwtDecode } from 'jwt-decode';

export declare interface Tokens {
    accessToken: string;
    refreshToken?: string;
    expiration?: number;
    iat?: number;
    receivedAt: number;
}

export function tokensFromResponseData(data: any): Tokens {
    const token = data.access_token;
    const decodedToken: any = jwtDecode(token);
    const iat = decodedToken ? (decodedToken.iat ? decodedToken.iat * 1000 : 0) : 0;
    const expiresIn = data.expires_in;
    const expiration = Date.now() + expiresIn * 1000;
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiration: expiration,
        iat: iat,
        receivedAt: Date.now(),
    };
}
