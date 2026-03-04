import QuestionCircleIcon from '@atlaskit/icon/core/question-circle';
import React from 'react';
import { RovoDevAskUserQuestionsToolArgs } from 'src/rovo-dev/client';

import { AskUserQuestionsResultMessage } from '../utils';

interface AskUserQuestionsComponentProps {
    toolCallId: string;
    args: RovoDevAskUserQuestionsToolArgs;
    onSubmit: (payload: AskUserQuestionsResultMessage) => void;
}

export const AskUserQuestionsComponent: React.FC<AskUserQuestionsComponentProps> = ({ toolCallId, args, onSubmit }) => {
    const [answers, setAnswers] = React.useState<Record<string, { option: string }>>(() =>
        Object.fromEntries(args.questions.map((question) => [question.question, { option: '' }])),
    );

    const onSelectOption = React.useCallback((question: string, option: string) => {
        setAnswers((prev) => ({
            ...prev,
            [question]: { option },
        }));
    }, []);

    const handleSubmit = React.useCallback(() => {
        const result = Object.entries(answers).map(([question, { option }]) => ({
            question,
            answer: option,
        }));
        onSubmit({ toolCallId, result });
    }, [answers, onSubmit, toolCallId]);

    return (
        <div className="form-container form-body" style={{ zIndex: 2000 }}>
            <div className="form-header">
                <QuestionCircleIcon label="Ask user questions" spacing="none" />
                Additional information required
            </div>
            <div className="form-fields">
                {args.questions.map((question) => (
                    <div className="form-field" key={question.question}>
                        <div style={{ fontWeight: 'bold' }}>{question.header}</div>
                        <span>{question.question}</span>
                        <select
                            className="form-select"
                            onChange={(e) => onSelectOption(question.question, e.target.value)}
                            value={answers[question.question].option}
                        >
                            <option value="" disabled>
                                Select an option
                            </option>
                            {question.options.map((option) => (
                                <option key={option.label} value={option.label}>
                                    {`${option.label} - ${option.description}`}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
            <div className="form-actions">
                <button className="form-submit-button" onClick={handleSubmit}>
                    Submit
                </button>
            </div>
        </div>
    );
};
