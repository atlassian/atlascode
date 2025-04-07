import { Experiments, Features } from 'src/util/featureFlags';
import { DetailedSiteInfo, Product } from '../../../atlclients/authInfo';
// eslint-disable-next-line no-restricted-imports
import { WebviewPanel } from 'vscode';

export type MessagePoster = (m: any) => Thenable<boolean>;

export interface WebviewController<FD> {
    requiredFeatureFlags: Features[];
    requiredExperiments: Experiments[];

    onShown(panel: WebviewPanel): void;
    title(): string;
    screenDetails(): { id: string; site?: DetailedSiteInfo; product?: Product };
    onMessageReceived(msg: any): void;
    update(factoryData?: FD): void;
}
