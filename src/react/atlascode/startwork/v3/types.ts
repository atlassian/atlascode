import { StartWorkControllerApi, StartWorkState } from '../startWorkController';

export interface SectionProps {
    state: StartWorkState;
    controller: StartWorkControllerApi;
}

export type TaskInfoSectionProps = SectionProps;
export type CreateBranchSectionProps = SectionProps;
export type UpdateStatusSectionProps = SectionProps;
