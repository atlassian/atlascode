import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import {
    Avatar,
    Button,
    CircularProgress,
    Container,
    ExpansionPanel,
    ExpansionPanelDetails,
    ExpansionPanelSummary,
    Grid,
    makeStyles,
    Theme,
    Toolbar,
    Typography,
} from '@material-ui/core';
import AccessTimeIcon from '@material-ui/icons/AccessTime';
import CalendarTodayIcon from '@material-ui/icons/CalendarToday';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import React, { useCallback, useMemo } from 'react';
import { emptyPipeline } from '../../../lib/ipc/models/pipelineSummary';
import {
    Pipeline,
    PipelineCommand,
    PipelineLogRange,
    PipelineLogReference,
    PipelineLogStage,
    PipelineState,
    PipelineStep,
    Status,
    statusForState,
} from '../../../pipelines/model';
import FailedIcon from '../icons/FailedIcon';
import InProgressIcon from '../icons/InProgressIcon';
import NotRunIcon from '../icons/NotRunIcon';
import PausedIcon from '../icons/PausedIcon';
import StoppedIcon from '../icons/StoppedIcon';
import SuccessIcon from '../icons/SuccessIcon';
import { PipelineSummaryControllerContext, usePipelineSummaryController } from './pipelineSummaryController';
import { AtlascodeErrorBoundary } from '../common/ErrorBoundary';
import { AnalyticsView } from 'src/analyticsTypes';
import * as l10n from '@vscode/l10n';

const failureRed = 'rgb(255, 86, 48)';
const successGreen = 'rgb(54, 178, 126)';
const suspenseBlue = 'rgb(0, 101, 255)';
const otherOrange = 'rgb(255, 171, 0)';
const ambiguousGray = 'rgb(192, 192, 192)';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            title: {
                flexGrow: 0,
                marginRight: theme.spacing(3),
            },
            targetSelectLabel: {
                marginRight: theme.spacing(1),
            },
            floatLeft: {
                float: 'left',
            },
            floatRight: {
                float: 'right',
            },
            loadingIndicator: {
                marginTop: '20px',
            },
            logs: {
                whiteSpace: 'pre-wrap',
                fontFamily: 'Monaco, Courier New, Courier, monospace',
                fontSize: '1.2em',
                width: '100%',
            },
            logHeader: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: 'Monaco, Courier New, Courier, monospace',
                fontSize: '1.2em',
            },
            paper100: {
                overflow: 'hidden',
                height: '100%',
            },
            hiddenOverflow: {
                overflow: 'hidden',
            },
            greenHeader: {
                backgroundColor: successGreen,
                color: 'rgb(255,255,255)',
            },
            greenHeaderButton: {
                backgroundColor: 'rgba(9, 30, 66, 0.08)',
                color: 'rgb(255,255,255)',
            },
            blueHeader: {
                backgroundColor: suspenseBlue,
                color: 'rgb(255,255,255)',
            },
            blueHeaderButton: {
                backgroundColor: 'rgba(9, 30, 66, 0.133)',
                color: 'rgb(255,255,255)',
            },
            orangeHeader: {
                backgroundColor: otherOrange,
                color: 'rgb(0,0,0)',
            },
            orangeHeaderButton: {
                backgroundColor: 'rgba(9, 30, 66, 0.176)',
                color: 'rgb(0,0,0)',
            },
            redHeader: {
                backgroundColor: failureRed,
                color: 'rgb(255, 255, 255)',
            },
            redHeaderButton: {
                backgroundColor: 'rgba(9, 30, 66, 0.08)',
                color: 'rgb(255, 255, 255)',
            },
            grayHeader: {
                backgroundColor: ambiguousGray,
                color: 'rgb(0, 0, 0)',
            },
            grayHeaderButton: {
                backgroundColor: 'rgba(9, 30, 66, 0.133)',
                color: 'rgb(0, 0, 0)',
            },
            pipelineHeader: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
            },
            pipelineHeaderText: {
                display: 'flex',
                alignItems: 'center',
            },
            pipelineHeaderStatusIcon: {
                marginRight: '5px',
                display: 'flex',
            },
            stepHeader: {
                paddingRight: '24px',
                paddingLeft: '24px',
                paddingTop: '9px',
                paddingBottom: '9px',
                marginTop: '9px',
                border: '1px solid black',
                borderRadius: '5px 5px 0 0',
            },
            loglessStepHeader: {
                paddingRight: '24px',
                paddingLeft: '24px',
                paddingTop: '9px',
                paddingBottom: '9px',
                marginTop: '9px',
                border: '1px solid black',
                borderRadius: '5px 5px 5px 5px',
            },
            stepHeaderContent: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            },
            small: {
                width: theme.spacing(3),
                height: theme.spacing(3),
            },
            icon: {
                marginLeft: '15px',
                marginRight: '5px',
                verticalAlign: 'text-bottom',
            },
            stepStatusIcon: {
                marginRight: '5px',
                height: '23px',
                width: '23px',
                border: '2px solid White',
                borderRadius: '50%',
                backgroundColor: 'White',
            },
            statusIcon: {
                marginRight: '5px',
                verticalAlign: 'text-bottom',
            },
            avatar: {
                marginRight: '12px',
                width: '32px',
                height: '32px',
                border: '2px solid White',
            },
            flex: {
                display: 'flex',
                alignItems: 'center',
            },
        }) as const,
);

function durationString(totalSeconds?: number): string {
    if (!totalSeconds) {
        return '';
    }
    const seconds = totalSeconds % 60;
    const minutes = Math.trunc(totalSeconds / 60);
    if (minutes > 0) {
        return `${minutes} min ${seconds} sec`;
    }
    return `${seconds} sec`;
}

function dateString(completed_on?: string): string {
    if (!completed_on) {
        return '';
    }

    return format(parseISO(completed_on), 'MMM do yyyy, h:mm:ss aaa');
}

function formatTime(dateString: string | undefined): string {
    if (!dateString) {
        return '';
    }

    const date = parseISO(dateString);

    if (!date) {
        return '';
    }
    return `${formatDistanceToNow(date)} ago`;
}

function isPaused(step: PipelineStep) {
    return step.state?.stage?.name === 'PAUSED';
}

function stepFailed(step: PipelineStep) {
    return step.state?.result?.name === 'FAILED';
}

function isStoppable(pipeline: Pipeline): boolean {
    const status = statusForState(pipeline.state);
    return status === Status.Pending || status === Status.InProgress;
}

type LogSectionProps = {
    aKey: string;
    name: string;
    logs: string | undefined;
    logRange: PipelineLogRange | undefined;
    onChange: (event: React.ChangeEvent<{}>, expanded: boolean) => void;
};

const PipelineSummaryPage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [state, controller] = usePipelineSummaryController();

    function colorsForPipeline(pipeline: Pipeline): string[] {
        switch (statusForState(pipeline.state)) {
            case Status.Pending:
                return [classes.blueHeader, classes.blueHeaderButton];
            case Status.InProgress:
                return [classes.blueHeader, classes.blueHeaderButton];
            case Status.Paused:
                return [classes.greenHeader, classes.greenHeaderButton];
            case Status.Stopped:
                return [classes.orangeHeader, classes.orangeHeaderButton];
            case Status.Successful:
                return [classes.greenHeader, classes.greenHeaderButton];
            case Status.Error:
                return [classes.redHeader, classes.redHeaderButton];
            case Status.Failed:
                return [classes.redHeader, classes.redHeaderButton];
            default:
                return [classes.grayHeader, classes.grayHeaderButton];
        }
    }

    function colorStyleForState(state: PipelineState): any {
        let styleColor = ambiguousGray;
        switch (statusForState(state)) {
            case Status.Pending:
            // Fall through
            case Status.InProgress:
                styleColor = suspenseBlue;
                break;
            case Status.Paused:
            // Fall through
            case Status.Successful:
                styleColor = successGreen;
                break;
            case Status.Stopped:
                styleColor = otherOrange;
                break;
            case Status.Error:
            // Fall through
            case Status.Failed:
                styleColor = failureRed;
                break;
            default:
                styleColor = ambiguousGray;
        }

        return { color: styleColor };
    }

    function logsExpansionPanelDetails(logs?: string): any {
        return (
            <ExpansionPanelDetails>
                {logs ? (
                    <pre className={classes.logs}>{logs}</pre>
                ) : (
                    <Grid container justify="center">
                        <CircularProgress />
                    </Grid>
                )}
            </ExpansionPanelDetails>
        );
    }

    function LogSection({ aKey, name, logs, logRange, onChange }: LogSectionProps): any {
        return (
            <ExpansionPanel
                key={aKey}
                square={false}
                onChange={onChange}
                disabled={logRange === undefined || logRange.lastByte < 0}
            >
                <ExpansionPanelSummary className={classes.hiddenOverflow} expandIcon={<ExpandMoreIcon />} id={aKey}>
                    <div className={classes.logHeader}>{name}</div>
                </ExpansionPanelSummary>
                {logsExpansionPanelDetails(logs)}
            </ExpansionPanel>
        );
    }

    const iconForPipelineState = useCallback((pipelineState: PipelineState, className: string) => {
        if (!pipelineState) {
            return Status.Unknown;
        }
        switch (statusForState(pipelineState)) {
            case Status.Successful:
                return <SuccessIcon className={className} titleAccess="Success" />;
            case Status.Paused:
                return <PausedIcon className={className} titleAccess="Paused" />;
            case Status.Pending:
                return <InProgressIcon className={className} titleAccess="Pending" />;
            case Status.InProgress:
                return <InProgressIcon className={className} titleAccess="Building" />;
            case Status.Stopped:
                return <StoppedIcon className={className} titleAccess="Stopped" />;
            case Status.Error:
                return <FailedIcon className={className} titleAccess="Error" />;
            case Status.Failed:
                return <FailedIcon className={className} titleAccess="Failed" />;
            case Status.NotRun:
                return <NotRunIcon className={className} titleAccess="Not Run" />;
            default:
                return <FailedIcon className={className} titleAccess="Failed" />;
        }
    }, []);

    function setupAndTeardownSection(
        stepUuid: string,
        stepIndex: number,
        stage: PipelineLogStage,
        logs: string | undefined,
        logRange: PipelineLogRange | undefined,
        fetchLogs: (stepUuid: string, logReference: PipelineLogReference) => void,
    ) {
        const title = stage === PipelineLogStage.SETUP ? 'Build setup' : 'Build teardown';
        return (
            <LogSection
                aKey={`${title}-${stepUuid}`}
                name={title}
                logs={logs}
                logRange={logRange}
                onChange={(event: React.ChangeEvent<{}>, expanded: boolean) => {
                    if (expanded && !logs) {
                        fetchLogs(stepUuid, {
                            stepIndex: stepIndex,
                            stage: stage,
                        });
                    }
                }}
                key={`${title}-${stepUuid}`}
            />
        );
    }

    function buildSection(
        stepUuid: string,
        stepIndex: number,
        commands: PipelineCommand[],
        fetchLogs: (stepUuid: string, logReference: PipelineLogReference) => void,
    ) {
        return (
            <div>
                {commands.map((command, index) => {
                    return (
                        <LogSection
                            aKey={`${stepUuid}-${index}`}
                            name={command.name}
                            logs={command.logs}
                            logRange={command.log_range}
                            onChange={(event: React.ChangeEvent<{}>, expanded: boolean) => {
                                if (expanded && !command.logs) {
                                    fetchLogs(stepUuid, {
                                        stepIndex: stepIndex,
                                        stage: PipelineLogStage.BUILD,
                                        commandIndex: index,
                                    });
                                }
                            }}
                            key={`${stepUuid}-${index}`}
                        />
                    );
                })}
            </div>
        );
    }

    const stepHeader = useCallback(
        (step: PipelineStep, className: string, style: any, index: number) => {
            return (
                <div className={className} style={style}>
                    <Typography variant="h4">
                        <div className={classes.stepHeaderContent}>
                            <div className={classes.flex}>
                                {step.state ? (
                                    <div style={colorStyleForState(step.state)} className={classes.flex}>
                                        {iconForPipelineState(step.state, classes.stepStatusIcon)}
                                    </div>
                                ) : (
                                    ''
                                )}
                                <span>{step.name ?? `Step ${index + 1} `}</span>
                            </div>
                            <span>
                                {!step.duration_in_seconds || isPaused(step)
                                    ? 'Not run'
                                    : durationString(step.duration_in_seconds)}
                            </span>
                        </div>
                    </Typography>
                </div>
            );
        },
        [classes.stepHeaderContent, classes.flex, iconForPipelineState, classes.stepStatusIcon],
    );

    const pipelineStepItem = useCallback(
        (step: PipelineStep, index: number) => {
            const key = `${step.uuid}-${index}`;

            if (step.state?.result?.name === 'NOT_RUN') {
                return <div key={key}>{stepHeader(step, classes.loglessStepHeader, {}, index)}</div>;
            }
            const style = stepFailed(step)
                ? {
                      color: 'White',
                      backgroundColor: failureRed,
                  }
                : {};
            return (
                <div key={key}>
                    {stepHeader(step, classes.stepHeader, style, index)}
                    <div>
                        {setupAndTeardownSection(
                            step.uuid,
                            index,
                            PipelineLogStage.SETUP,
                            step.setup_logs,
                            step.setup_log_range,
                            controller.fetchLogs,
                        )}
                        {buildSection(step.uuid, index, step.script_commands, controller.fetchLogs)}
                        {setupAndTeardownSection(
                            step.uuid,
                            index,
                            PipelineLogStage.TEARDOWN,
                            step.teardown_logs,
                            step.teardown_log_range,
                            controller.fetchLogs,
                        )}
                    </div>
                </div>
            );
        },
        [classes.loglessStepHeader, classes.stepHeader, controller.fetchLogs, stepHeader], // eslint-disable-line react-hooks/exhaustive-deps
    );

    const renderPipelineStep = useCallback(
        (step: PipelineStep, index: number) => {
            return pipelineStepItem(step, index);
        },
        [pipelineStepItem],
    );

    const pipelineSteps = useMemo(() => {
        return state.steps ? (
            state.steps.map((step, index) => renderPipelineStep(step, index))
        ) : (
            <Grid container justify="center">
                <CircularProgress className={classes.loadingIndicator} />
            </Grid>
        );
    }, [renderPipelineStep, state.steps, classes.loadingIndicator]);

    const [headerClass, buttonClass] = colorsForPipeline(state.pipeline);

    return (
        <PipelineSummaryControllerContext.Provider value={controller}>
            <AtlascodeErrorBoundary
                postMessageFunc={controller.postMessage}
                context={{ view: AnalyticsView.PipelineSummaryPage }}
            >
                <Container maxWidth="xl">
                    <Toolbar className={headerClass}>
                        {state.pipeline === emptyPipeline ? (
                            <div />
                        ) : (
                            <div className={classes.pipelineHeader}>
                                <Typography variant="h3" className={classes.pipelineHeaderText}>
                                    <div className={classes.pipelineHeaderStatusIcon}>
                                        {iconForPipelineState(state.pipeline.state, classes.pipelineHeaderStatusIcon)}
                                    </div>
                                    <a
                                        className={headerClass}
                                        href={`${state.pipeline.repository!.url}/addon/pipelines/home#!/results/${
                                            state.pipeline.build_number
                                        }`}
                                    >{`Pipeline #${state.pipeline.build_number}`}</a>
                                    {state.pipeline.duration_in_seconds ? (
                                        <AccessTimeIcon className={classes.icon} />
                                    ) : (
                                        ''
                                    )}
                                    {`${durationString(state.pipeline.duration_in_seconds)}`}
                                    {state.pipeline.completed_on ? <CalendarTodayIcon className={classes.icon} /> : ''}
                                    <span title={dateString(state.pipeline.completed_on)}>{`${formatTime(
                                        state.pipeline.completed_on,
                                    )}`}</span>
                                </Typography>
                                <div className={classes.flex}>
                                    <Avatar
                                        alt={state.pipeline.creator_name}
                                        src={state.pipeline.creator_avatar}
                                        className={classes.avatar}
                                    />
                                    {isStoppable(state.pipeline) ? (
                                        ''
                                    ) : (
                                        <Button variant="contained" className={buttonClass} onClick={controller.rerun}>
                                            {l10n.t('Rerun')}
                                        </Button>
                                    )}
                                    <RefreshButton loading={state.isRefreshing} onClick={controller.refresh} />
                                </div>
                            </div>
                        )}
                    </Toolbar>
                    {pipelineSteps}
                </Container>
            </AtlascodeErrorBoundary>
        </PipelineSummaryControllerContext.Provider>
    );
};

export default PipelineSummaryPage;
