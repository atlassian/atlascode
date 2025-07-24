import { defaultStateGuard } from '@atlassianlabs/guipi-core-controller';
import {
    Box,
    Button,
    createStyles,
    Grid,
    GridJustification,
    IconButton,
    List,
    ListItem,
    makeStyles,
    Theme,
    Typography,
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { uid } from 'react-uid';

import { ReducerAction } from '../../../../shared/reducerAction';
import { InlineTextEditor } from '../editor/InlineTextEditor';

interface InlineTextEditorListProps {
    disabled: boolean;
    addOptionButtonContent: React.ReactNode;
    inputLabel: React.ReactNode;
    options: string[];
    optionsOrdered?: boolean;
    onChange?: (newOptions: string[]) => void;
    emptyComponent?: JSX.Element;
    justifyButtons?: GridJustification;
    reverseButtons?: boolean;
    children?: JSX.Element | JSX.Element[];
}

interface EditorState {
    options: string[];
    addingNewOption: boolean;
    changesNeedFired: boolean;
}

export enum TextEditorListActionType {
    Delete = 'delete',
    Update = 'update',
    StartNew = 'startNew',
    CancelNew = 'cancelNew',
    SaveNew = 'saveNew',
    FiredChanges = 'firedChanges',
    NewOptions = 'newOptions',
}

type EditorAction =
    | ReducerAction<TextEditorListActionType.Delete, { index: number }>
    | ReducerAction<TextEditorListActionType.Update, { index: number; value: string }>
    | ReducerAction<TextEditorListActionType.StartNew>
    | ReducerAction<TextEditorListActionType.CancelNew>
    | ReducerAction<TextEditorListActionType.SaveNew, { value: string }>
    | ReducerAction<TextEditorListActionType.FiredChanges>
    | ReducerAction<TextEditorListActionType.NewOptions, { options: string[] }>;

function editorReducer(state: EditorState, action: EditorAction): EditorState {
    switch (action.type) {
        case TextEditorListActionType.Delete: {
            const newOptions = state.options.filter((value, idx, arr) => idx !== action.index);
            return { ...state, changesNeedFired: true, options: newOptions };
        }
        case TextEditorListActionType.Update: {
            const newOptions = [...state.options];
            newOptions[action.index] = action.value;
            return { ...state, changesNeedFired: true, options: newOptions };
        }
        case TextEditorListActionType.StartNew: {
            return { ...state, addingNewOption: true };
        }
        case TextEditorListActionType.CancelNew: {
            return { ...state, addingNewOption: false };
        }
        case TextEditorListActionType.SaveNew: {
            const newOptions = [...state.options];
            newOptions.push(action.value);
            return { ...state, changesNeedFired: true, addingNewOption: false, options: newOptions };
        }
        case TextEditorListActionType.FiredChanges: {
            return { ...state, changesNeedFired: false };
        }
        case TextEditorListActionType.NewOptions: {
            return { ...state, options: action.options };
        }

        default:
            return defaultStateGuard(state, action);
    }
}

const arraysEqual = (a1: string[], a2: string[], ordered?: boolean): boolean => {
    if (a1.length !== a2.length) {
        return false;
    }

    // Array.prototype.sort() sorts in place, so make a copy before sorting if needed
    const a = ordered === true ? a1 : [...a1].sort();
    const b = ordered === true ? a2 : [...a2].sort();

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
};
const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            flexGrow: 1,
        },
    }),
);

function generateListItems(
    options: string[],
    inputLabel: React.ReactNode,
    disabled: boolean,
    addingNewOption: boolean,
    dispatch: React.Dispatch<EditorAction>,
    emptyElement: JSX.Element,
): JSX.Element[] {
    const optionList =
        options.length > 0
            ? options.map((option: string, i: number) => {
                  return (
                      <ListItem disabled={disabled} key={uid(option)}>
                          <InlineTextEditor
                              disabled={disabled}
                              hideLabelOnBlur={true}
                              defaultValue={option}
                              autoComplete="off"
                              margin="dense"
                              label={inputLabel}
                              fullWidth
                              InputProps={{
                                  endAdornment: (
                                      <IconButton
                                          disabled={disabled}
                                          onClick={() => dispatch({ type: TextEditorListActionType.Delete, index: i })}
                                          onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) =>
                                              event.preventDefault()
                                          }
                                      >
                                          <DeleteIcon fontSize="small" color="inherit" />
                                      </IconButton>
                                  ),
                              }}
                              saveDisabled={(v: string) => options.includes(v)}
                              onSave={(value: string) =>
                                  dispatch({ type: TextEditorListActionType.Update, value: value, index: i })
                              }
                          />
                      </ListItem>
                  );
              })
            : !addingNewOption
              ? [
                    <ListItem disabled={disabled} key={uid('empty')}>
                        {emptyElement}
                    </ListItem>,
                ]
              : [];

    if (addingNewOption) {
        optionList.push(
            <ListItem disabled={disabled} key={uid('')}>
                <InlineTextEditor
                    autoFocus={true}
                    disabled={disabled}
                    hideLabelOnBlur={true}
                    defaultValue={''}
                    autoComplete="off"
                    margin="dense"
                    label={inputLabel}
                    fullWidth
                    onCancel={() => dispatch({ type: TextEditorListActionType.CancelNew })}
                    onSave={(value: string) => dispatch({ type: TextEditorListActionType.SaveNew, value: value })}
                    saveDisabled={(v: string) => options.includes(v)}
                />
            </ListItem>,
        );
    }

    return optionList;
}

export const InlineTextEditorList: React.FunctionComponent<InlineTextEditorListProps> = ({
    disabled,
    options,
    optionsOrdered,
    onChange,
    addOptionButtonContent,
    inputLabel,
    emptyComponent,
    children,
    justifyButtons,
    reverseButtons,
}) => {
    const [initialOptions, setInitialOptions] = useState(options);

    const emptyElement = useMemo<JSX.Element>(() => {
        if (emptyComponent !== undefined) {
            return emptyComponent;
        }

        return (
            <Box width="100%">
                <Typography align="center">No items found.</Typography>
            </Box>
        );
    }, [emptyComponent]);

    const [state, dispatch] = useReducer(editorReducer, {
        options: initialOptions,
        addingNewOption: false,
        changesNeedFired: false,
    });

    const classes = useStyles();

    useEffect(() => {
        if (state.changesNeedFired && onChange) {
            onChange(state.options);
            dispatch({ type: TextEditorListActionType.FiredChanges });
        }
    }, [state, dispatch, onChange]);

    useEffect(() => {
        setInitialOptions((oldOptions) => {
            if (!arraysEqual(oldOptions, options, optionsOrdered)) {
                dispatch({ type: TextEditorListActionType.NewOptions, options: options });
                return options;
            }
            return oldOptions;
        });
    }, [options, optionsOrdered]);

    return (
        <div className={classes.root}>
            <Grid container direction="column" spacing={1}>
                <Grid item>
                    <List>
                        {generateListItems(
                            state.options,
                            inputLabel,
                            disabled,
                            state.addingNewOption,
                            dispatch,
                            emptyElement,
                        )}
                    </List>
                </Grid>
                <Grid item>
                    <Box marginLeft={2} marginRight={2}>
                        <Grid
                            container
                            justify={justifyButtons}
                            direction={reverseButtons ? 'row-reverse' : 'row'}
                            spacing={1}
                        >
                            <Grid item>
                                <Button
                                    disabled={disabled}
                                    variant="contained"
                                    color="primary"
                                    onClick={() => dispatch({ type: TextEditorListActionType.StartNew })}
                                >
                                    {addOptionButtonContent}
                                </Button>
                            </Grid>
                            {children &&
                                React.Children.toArray(children).map((child) => {
                                    return (
                                        <Grid item key={uid('')}>
                                            {child}
                                        </Grid>
                                    );
                                })}
                        </Grid>
                    </Box>
                </Grid>
            </Grid>
        </div>
    );
};
