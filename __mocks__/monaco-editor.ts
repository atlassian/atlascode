module.exports = {
    editor: {
        create: jest.fn(() => ({
            addCommand: jest.fn(),
            dispose: jest.fn(),
            setValue: jest.fn(),
            getValue: jest.fn(),
            onDidChangeModelContent: jest.fn(),
            onDidContentSizeChange: jest.fn(),
            getContentHeight: jest.fn(() => 100),
            getContainerDomNode: jest.fn(() => ({ style: { height: '' } })),
            getModel: jest.fn(),
            focus: jest.fn(),
            layout: jest.fn(),
            updateOptions: jest.fn(),
            trigger: jest.fn(),
        })),
        registerCommand: jest.fn(),
        defineTheme: jest.fn(),
    },
};
