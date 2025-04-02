import React, { useCallback, useEffect, useState } from 'react';

import sanitizeHtml from 'sanitize-html';

import InlineEdit from '@atlaskit/inline-edit';
import Textfield from '@atlaskit/textfield';

import { makeStyles } from '@material-ui/core';
import { Theme } from '@atlaskit/theme/dist/types/types';
import RenderedTitle, { RenderedContent } from './RenderedTitle';

const useStyles = makeStyles((theme: Theme) => ({
    readViewWrapper: {
        paddingTop: '6px',
        paddingBottom: '6px',
        paddingRight: '6px',
        letterSpacing: 0,
    },
}));

const newlineOrTabRegex = /[\n\r\t]+/g;

const messages = {
    editButtonLabel: {
        id: 'frontbucket.repository.pullrequest.editableTitle.editButtonLabel',
        description: 'Text for accessibility label for button which is used to enter edit view from keyboard.',
        defaultMessage: 'Edit pull request title',
    },
    confirmButtonLabel: {
        id: 'frontbucket.repository.pullrequest.editableTitle.confirmButtonLabel',
        description: 'Text for accessibility label for the confirm action button.    ',
        defaultMessage: 'Confirm pull request title changes',
    },
    cancelButtonLabel: {
        id: 'frontbucket.repository.pullrequest.editableTitle.cancelButtonLabel',
        description: 'Text for accessibility label for the cancel action button.    ',
        defaultMessage: 'Cancel editing pull request title',
    },
};

export type EditableTitleProps = {
    renderedTitle: RenderedContent;
    isDisabled: boolean;
    onUpdate: (title: string) => void;
    isLoading: boolean;
};

export const EditableTitle = ({ renderedTitle, isDisabled, isLoading, onUpdate }: EditableTitleProps) => {
    const classes = useStyles();
    const rawTitle = renderedTitle.raw.replace(newlineOrTabRegex, ' ');
    const [textFieldValue, setTextFieldValue] = useState(rawTitle);
    const isPrTitleUpdatePending = isLoading;

    const beforeUnloadHandler = useCallback((event: BeforeUnloadEvent) => {
        event.preventDefault();
        // Necessary for Google Chrome
        event.returnValue = null;
    }, []);

    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTextFieldValue(e.target.value);
        window.addEventListener('beforeunload', beforeUnloadHandler, false);
    };

    useEffect(() => {
        return function cleanup() {
            window.removeEventListener('beforeunload', beforeUnloadHandler, false);
        };
    }, [beforeUnloadHandler]);

    return isDisabled ? (
        <InlineEdit
            defaultValue={rawTitle}
            isRequired
            keepEditViewOpenOnBlur
            readViewFitContainerWidth
            editButtonLabel={messages.editButtonLabel.defaultMessage}
            confirmButtonLabel={messages.confirmButtonLabel.defaultMessage}
            cancelButtonLabel={messages.cancelButtonLabel.defaultMessage}
            editView={(fieldProps) => {
                return (
                    <Textfield
                        {...fieldProps}
                        // disable textfield to prevent editing while update is in-progress
                        isDisabled={isPrTitleUpdatePending}
                        autoFocus
                        onChange={handleOnChange}
                        value={textFieldValue}
                        css={{
                            fontSize: '24px',
                            fontWeight: 500,
                            padding: '1px 0px 1px 0px',
                            letterSpacing: '0px',
                            height: 'inherit',
                        }}
                    />
                );
            }}
            readView={() => {
                let renderedContent: RenderedContent;

                // While request is being processed, we want to optimistically display the updated
                // version of the title. If the request fails, the UI will show an error flag
                // and return to the original title.
                if (isPrTitleUpdatePending) {
                    // UGC needs to be escaped, this may not match server's sanitized text but is uncommon usage
                    // tags will always be escaped while attrs will not as this content is placed in span
                    // and won't be interpreted as HTML to render
                    const sanitizedContent = sanitizeHtml(textFieldValue, {
                        allowedTags: [],
                        allowedAttributes: false,
                        disallowedTagsMode: 'escape',
                    });
                    renderedContent = {
                        ...renderedTitle,
                        raw: textFieldValue,
                        html: `<p>${sanitizedContent}</p>`,
                    };
                } else {
                    renderedContent = renderedTitle;
                    setTextFieldValue(rawTitle);
                }

                window.removeEventListener('beforeunload', beforeUnloadHandler, false);

                return (
                    <div className={classes.readViewWrapper}>
                        <RenderedTitle renderedContent={renderedContent} />
                    </div>
                );
            }}
            onConfirm={() => {
                onUpdate(textFieldValue);
            }}
        />
    ) : (
        <div className={classes.readViewWrapper}>
            <RenderedTitle renderedContent={renderedTitle} />
        </div>
    );
};
