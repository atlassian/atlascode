import * as React from "react";
import { Branch } from "../../../typings/git";
import SectionMessage from '@atlaskit/section-message';
import styled from "styled-components";

const Padding = styled.div`
  padding: 8px;
`;

export default class BranchWarning extends React.Component<{ sourceBranch: Branch | undefined, sourceRemoteBranchName: string | undefined, remoteBranches: Branch[] }, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        if (!this.props.sourceBranch || !this.props.sourceRemoteBranchName) {
            return null;
        }

        const remoteBranch = this.props.remoteBranches.find(remoteBranch => this.props.sourceRemoteBranchName === remoteBranch.name);
        if (!remoteBranch) {
            return (
                <Padding>
                    <SectionMessage appearance="warning" title="No upstream branch">
                        <p>Upstream branch ({this.props.sourceRemoteBranchName}) not found.</p>
                        <p>Check the box above to push the local changes to remote while creating the pull request.</p>
                    </SectionMessage>
                </Padding>
            );
        }

        if (this.props.sourceBranch.commit !== remoteBranch.commit) {
            return (
                <Padding>
                    <SectionMessage appearance="warning" title="Upstream branch not up to date">
                        <p>Upstream branch ({this.props.sourceRemoteBranchName}) commit hash does not match with local branch ({this.props.sourceBranch.name}).</p>
                        <p>Check the box above to push the local changes to remote while creating the pull request.</p>
                    </SectionMessage>
                </Padding>
            );
        }

        return null;
    }
}