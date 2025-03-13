import { featureFlagClientInitializedEvent, featureFlagClientInitializationFailedEvent } from '../../analytics';
import { EventBuilderInterface } from './analytics';

// Stopgap solution to prevent React dependencies on vscode-internal stuff
// Putting this in place for now until we can refactor the analytics module
export class EventBuilder implements EventBuilderInterface {
    public featureFlagClientInitializedEvent() {
        return featureFlagClientInitializedEvent();
    }

    public featureFlagClientInitializationFailedEvent() {
        return featureFlagClientInitializationFailedEvent();
    }
}
