import { buildRovoDevPrompt } from './rovoDevPrompt';

describe('rovoDevPrompt', () => {
    describe('buildRovoDevPrompt', () => {
        it('should create prompt with summary and description', () => {
            const summary = 'Fix authentication bug';
            const description = 'Users cannot login after update';

            const result = buildRovoDevPrompt(summary, description);

            expect(result).toContain("Let's work on this issue:");
            expect(result).toContain('Summary:');
            expect(result).toContain(summary);
            expect(result).toContain('Description:');
            expect(result).toContain(description);
            expect(result).toContain('Please provide a detailed plan to resolve this issue');
        });

        it('should create prompt with summary only when description is empty', () => {
            const summary = 'Add new feature';
            const description = '';

            const result = buildRovoDevPrompt(summary, description);

            expect(result).toContain("Let's work on this issue:");
            expect(result).toContain('Summary:');
            expect(result).toContain(summary);
            expect(result).not.toContain('Description:');
        });

        it('should handle undefined description', () => {
            const summary = 'Test task';
            const description = undefined as any;

            const result = buildRovoDevPrompt(summary, description);

            expect(result).toContain('Summary:');
            expect(result).toContain(summary);
            expect(result).not.toContain('Description:');
        });

        it('should clean Jira markup from description', () => {
            const summary = 'Task with markup';
            const description = '+bold text+ and [~accountid:123:john.doe] mentioned !image.png! in text';

            const result = buildRovoDevPrompt(summary, description);

            expect(result).toContain('bold text'); // without + +
            expect(result).toContain('@user'); // instead of user mention
            expect(result).toContain('[image attachment]'); // instead of !image.png!
            expect(result).not.toContain('+bold text+');
            expect(result).not.toContain('[~accountid:123:john.doe]');
            expect(result).not.toContain('!image.png!');
        });

        it('should handle complex Jira markup', () => {
            const summary = 'Complex task';
            const description = '+Header+ from [~accountid:123:user] with !pic.png! and +another bold+';

            const result = buildRovoDevPrompt(summary, description);

            expect(result).toContain('Header from @user with [image attachment] and another bold');
            expect(result).not.toContain('+Header+');
            expect(result).not.toContain('[~accountid:123:user]');
            expect(result).not.toContain('!pic.png!');
        });

        it('should trim whitespace from description', () => {
            const summary = 'Task with spaces';
            const description = '   description with spaces   ';

            const result = buildRovoDevPrompt(summary, description);

            expect(result).toContain('description with spaces');
            expect(result).not.toContain('   description with spaces   ');
        });
    });
});
