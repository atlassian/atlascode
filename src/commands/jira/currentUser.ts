import { User } from "jira-pi-client";
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { Container } from "../../container";


export async function currentUserJira(site: DetailedSiteInfo): Promise<User> {
    const client = await Container.clientManager.jiraClient(site);
    const resp = await client.getCurrentUser();
    return resp;
}
