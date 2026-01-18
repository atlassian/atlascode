import { Logger } from 'src/logger';

import { configuration } from './configuration';
import { LastCreatePreSelectedValues } from './model';

// Saves the last selected site, project, and issue type to the configuration.
// Errors are logged but not thrown, so settings failures won't block the main operation

export async function saveLastCreatePreferences(values?: LastCreatePreSelectedValues): Promise<void> {
    try {
        await configuration.setLastCreateSiteAndProject(values);
    } catch (error) {
        Logger.warn(error, 'Failed to save last selected site, project, and issue type preferences');
    }
}
