import { Token } from '@atlassianlabs/moo-relexed';

import { lexerTestData } from './__fixtures__/lexerTestData';
import { TokenTypes } from './jqlConstants';
import { JqlLexer } from './jqlLexer';

interface ExpectedToken {
    t: string;
    v: string;
}

describe.each(lexerTestData)('lexerTest %s', (jqlInput: string, expectedTokens: ExpectedToken[]) => {
    JqlLexer.reset(jqlInput);
    const rawTokens = Array.from(JqlLexer);
    const tokens = rawTokens.filter((token: Token) => token.type !== TokenTypes.WS);

    test('has matching token count', () => {
        expect(tokens.length).toBe(expectedTokens.length);
    });

    test('has matching tokens', () => {
        tokens.forEach((token: Token, i: number) => {
            expect(token.type).toBe(expectedTokens[i].t);
            expect(token.value).toBe(expectedTokens[i].v);
        });
    });
});
