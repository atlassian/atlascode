import { createVerifier, base64URLEncode, sha256, basicAuth } from './strategyCrypto';
import { OAuthProvider } from './authInfo';
import { StrategyProps, OAuthStrategyData } from './strategyData';

export function strategyForProvider(provider: OAuthProvider): Strategy {
    switch (provider) {
        case OAuthProvider.JiraCloud: {
            return new JiraStrategy(OAuthStrategyData.JiraProd);
        }
        case OAuthProvider.JiraCloudStaging: {
            return new JiraStrategy(OAuthStrategyData.JiraStaging);
        }
        case OAuthProvider.BitbucketCloud: {
            return new BitbucketStrategy(OAuthStrategyData.BitbucketProd);
        }
        case OAuthProvider.BitbucketCloudStaging: {
            return new BitbucketStrategy(OAuthStrategyData.BitbucketStaging);
        }
        case OAuthProvider.JiraCloudRemote: {
            return new JiraDevStrategy(OAuthStrategyData.JiraRemote);
        }
        default: {
            throw new Error(`Unknown provider: ${provider}`);
        }
    }
}

export abstract class Strategy {
    verifier: string;
    data: StrategyProps;

    public constructor(data: StrategyProps) {
        this.data = data;
        this.verifier = createVerifier();
    }

    public provider(): OAuthProvider {
        return this.data.provider;
    }

    public accessibleResourcesUrl(): string {
        return this.data.accessibleResourcesURL || '';
    }

    public tokenUrl(): string {
        return this.data.tokenURL;
    }

    public apiUrl(): string {
        return this.data.apiURL;
    }

    public profileUrl(): string {
        return this.data.profileURL || '';
    }

    public emailsUrl(): string {
        return this.data.emailsURL || '';
    }

    abstract authorizeUrl(state: string): string;
    abstract tokenAuthorizationData(code: string): string;
    abstract refreshHeaders(): any;
    abstract tokenRefreshData(refreshToken: string): string;
}

class JiraStrategy extends Strategy {
    public constructor(data: StrategyProps) {
        super(data);
    }

    public authorizeUrl(state: string): string {
        if (!this.data.scope || !this.data.authParams) {
            throw new Error('No scope or authParams for this strategy');
        }

        const codeChallenge = base64URLEncode(sha256(this.verifier));
        const params = new URLSearchParams({
            client_id: this.data.clientID,
            redirect_uri: this.data.callbackURL,
            response_type: 'code',
            scope: this.data.scope,
            audience: this.data.authParams.audience,
            prompt: this.data.authParams.prompt,
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });

        return this.data.authorizationURL + '?' + params.toString();
    }

    public tokenAuthorizationData(code: string): string {
        const data = JSON.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: this.data.callbackURL,
            client_id: this.data.clientID,
            code_verifier: this.verifier,
        });
        return data;
    }

    public tokenRefreshData(refreshToken: string): string {
        const dataString = JSON.stringify({
            grant_type: 'refresh_token',
            client_id: this.data.clientID,
            refresh_token: refreshToken,
        });
        return dataString;
    }

    public refreshHeaders() {
        return {
            'Content-Type': 'application/json',
        };
    }
}

class JiraDevStrategy extends JiraStrategy {
    public tokenAuthorizationData(code: string): string {
        const data = JSON.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: this.data.callbackURL,
            client_id: this.data.clientID,
            client_secret: this.data.clientSecret,
        });

        return data;
    }

    public authorizeUrl(state: string): string {
        if (!this.data.scope || !this.data.authParams) {
            throw new Error('No scope or authParams for this strategy');
        }

        const params = new URLSearchParams({
            client_id: this.data.clientID,
            redirect_uri: this.data.callbackURL,
            response_type: 'code',
            scope: this.data.scope,
            audience: this.data.authParams.audience,
            prompt: this.data.authParams.prompt,
            state: state,
        });

        return this.data.authorizationURL + '?' + params.toString();
    }
}

class BitbucketStrategy extends Strategy {
    public constructor(data: StrategyProps) {
        super(data);
    }

    public authorizeUrl(state: string): string {
        const url = new URL(this.data.authorizationURL);
        url.searchParams.append('client_id', this.data.clientID);
        url.searchParams.append('response_type', 'code');
        url.searchParams.append('state', state);

        return url.toString();
    }

    public tokenAuthorizationData(code: string): string {
        return `grant_type=authorization_code&code=${code}`;
    }

    public tokenRefreshData(refreshToken: string): string {
        return `grant_type=refresh_token&refresh_token=${refreshToken}`;
    }

    public refreshHeaders() {
        if (!this.data.clientSecret) {
            throw new Error('No client secret for this strategy');
        }

        return {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: basicAuth(this.data.clientID, this.data.clientSecret),
        };
    }
}
