import { Experiments, Features } from 'src/util/featureFlags';
import { DetailedSiteInfo, Product } from '../../../atlclients/authInfo';

export type MessagePoster = (m: any) => Thenable<boolean>;

export interface WebviewController<FD> {
    requiredFeatureFlags: Features[];
    requiredExperiments: Experiments[];

    title(): string;
    screenDetails(): { id: string; site?: DetailedSiteInfo; product?: Product };
    onMessageReceived(msg: any): void;
    update(factoryData?: FD): void;
}
