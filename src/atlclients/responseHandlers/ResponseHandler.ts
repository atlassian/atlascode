import { AccessibleResource, UserInfo } from '../authInfo';
import { Tokens } from '../tokens';

export abstract class ResponseHandler {
    public abstract tokens(code: string): Promise<Tokens>;
    public abstract user(authHeader: string, resource: AccessibleResource): Promise<UserInfo>;
    public abstract accessibleResources(accessToken: string): Promise<AccessibleResource[]>;
}
