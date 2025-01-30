import FileIcon from '@atlaskit/icon/glyph/file';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import UploadIcon from '@atlaskit/icon/glyph/upload';
import TableTree from '@atlaskit/table-tree';
import { FieldUI } from '@atlassianlabs/jira-pi-meta-models';
import filesize from 'filesize';
import React, { useEffect, useReducer } from 'react';
import { FileWithPath, useDropzone } from 'react-dropzone';

type ItemData = {
    file: FileWithPreview;
    delfunc: (file: any) => void;
};

const Delete = (data: ItemData) => {
    return (
        <div className="ac-delete" onClick={() => data.delfunc(data.file)}>
            <TrashIcon label="trash" />
        </div>
    );
};

const Thumbnail = (data: ItemData) => {
    if (data.file.isImage) {
        return (
            <div className="ac-attachment-thumb-img-inline">
                <img src={data.file.preview} />
            </div>
        );
    }

    return (
        <div className="ac-attachment-thumb-img-inline">
            <FileIcon label="no preview" />
        </div>
    );
};
const Filename = (data: ItemData) => <p style={{ display: 'inline' }}>{data.file.name}</p>;
const Size = (data: ItemData) => {
    const numSize = typeof data.file.size === 'number' ? data.file.size : parseFloat(data.file.size);
    const size = filesize(numSize);
    return <p style={{ display: 'inline' }}>{size}</p>;
};

interface FileWithPreview extends FileWithPath {
    preview: string;
    isImage: boolean;
}

export const previewableTypes: string[] = ['image/gif', 'image/jpeg', 'image/png', 'image/webp'];

type ActionType = {
    type: 'addFiles' | 'removeFile' | 'reset';
    payload?: any;
};

type AttachmentFormProps = {
    isInline?: boolean;
    // TODO: remove field param when we clean up ui
    field?: FieldUI;
    onFilesChanged(files: FileWithPath[], field?: FieldUI): void;
};

const initialState: FileWithPreview[] = [];

const filesReducer = (state: FileWithPreview[], action: ActionType) => {
    switch (action.type) {
        case 'addFiles': {
            return [...state, ...action.payload];
        }
        case 'removeFile': {
            return state.filter((file: FileWithPath) => {
                if (file.path) {
                    return file.path !== action.payload.path;
                }
                return file.name !== action.payload.name;
            });
        }
        case 'reset': {
            return [];
        }
    }
};

const dialogEditor = (
    files: any[],
    dispatch: any,
    getRootProps: (props?: any | undefined) => any,
    getInputProps: (props?: any | undefined) => any,
) => {
    return (
        <div className="ac-attachment-container">
            <div {...getRootProps({ className: 'ac-attachment-dropzone' })}>
                <div className="ac-attachment-instructions">
                    <img className="ac-attachment-filesbg" src={'images/files-bg.png'} />
                    <div className="ac-attachment-drag-and-button">
                        <div className="ac-attachment-drag-text">
                            <span>Drag and drop your files anywhere or</span>
                        </div>
                        <input {...getInputProps()} />
                        <p className="ac-attachment-upload-button">Click to upload</p>
                    </div>
                </div>
            </div>
            <div className="ac-attachment-thumbs-container">
                {files.map((file) => (
                    <div className="ac-attachment-thumb" key={file.name}>
                        <div className="ac-attachment-thumb-item">
                            <div className="ac-attachment-thumb-inner">
                                <div className="ac-attachment-thumb-img-wrapper">
                                    {file.isImage && <img src={file.preview} className="ac-attachment-thumb-img" />}
                                    {!file.isImage && <FileIcon label="no preview" />}
                                    <div className="ac-attachment-overlay-container">
                                        <div className="ac-attachment-overlay">
                                            <div className="ac-attachment-filename-container">
                                                <div className="ac-attachment-filename">{file.name}</div>
                                            </div>
                                            <div className="ac-attachment-delete-container">
                                                <div
                                                    className="ac-attachment-delete"
                                                    onClick={() => dispatch({ type: 'removeFile', payload: file })}
                                                >
                                                    <TrashIcon label="trash" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const inlineEditor = (
    files: FileWithPreview[],
    dispatch: any,
    getRootProps: (props?: any | undefined) => any,
    getInputProps: (props?: any | undefined) => any,
) => {
    return (
        <div className="ac-attachment-container">
            <div {...getRootProps({ className: 'ac-attachment-dropzone-inline' })}>
                <div className="ac-attachment-instructions">
                    <div className="ac-attachment-filesbg-inline">
                        <UploadIcon label="upload" />
                    </div>
                    <div className="ac-attachment-drag-and-button">
                        <div className="ac-attachment-drag-text-inline">
                            <span>Drop files or click to browse</span>
                        </div>
                        <input {...getInputProps()} />
                    </div>
                </div>
            </div>
            <TableTree
                columns={[Thumbnail, Filename, Size, Delete]}
                columnWidths={['36px', '100%', '150px', '50px']}
                items={files.map((file) => {
                    return {
                        id: file.path,
                        content: {
                            file: file,
                            delfunc: () => dispatch({ type: 'removeFile', payload: file }),
                        },
                    };
                })}
            />
        </div>
    );
};

export const AttachmentForm: React.FunctionComponent<AttachmentFormProps> = ({ field, onFilesChanged, isInline }) => {
    const [files, dispatch] = useReducer(filesReducer, initialState);
    const { getRootProps, getInputProps } = useDropzone({
        onDrop: (acceptedFiles: File[]) => {
            const newFiles = acceptedFiles.map((file) => {
                if (previewableTypes.includes(file.type)) {
                    return Object.assign(file, { preview: URL.createObjectURL(file), isImage: true });
                } else {
                    return Object.assign(file, { preview: '', isImage: false });
                }
            });

            dispatch({ type: 'addFiles', payload: newFiles });
        },
    });

    useEffect(
        () => () => {
            // Make sure to revoke the data uris to avoid memory leaks
            files.forEach((file) => URL.revokeObjectURL(file.preview));
        },
        [files],
    );

    useEffect(() => {
        onFilesChanged(files, field);
    }, [field, files, onFilesChanged]);

    if (isInline) {
        return inlineEditor(files, dispatch, getRootProps, getInputProps);
    }

    return dialogEditor(files, dispatch, getRootProps, getInputProps);
};
