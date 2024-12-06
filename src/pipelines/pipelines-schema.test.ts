import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as schema from '../../resources/schemas/pipelines-schema.json';

describe('Pipeline schema', () => {
    const ajv = new Ajv();
    addFormats(ajv);
    ajv.addVocabulary(['components', 'example']);

    it('Schema should be valid', () => {
        expect(ajv.compile(schema)).toBeTruthy();
    });

    it('Validation should work on simple pipeline definition', () => {
        const validate = ajv.compile(schema);
        const pipeline = {
            image: 'node:18',
            pipelines: {
                default: [
                    {
                        step: {
                            script: ["echo 'Hello, world!'"],
                        },
                    },
                ],
            },
        };
        expect(validate(pipeline)).toBe(true);
    });
});
