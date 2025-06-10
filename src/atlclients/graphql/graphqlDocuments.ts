import { gql } from 'graphql-request';

export const unseenNotificationCountVSCode = gql`
    query unseenNotificationCountVSCode {
        notifications {
            unseenNotificationCount
        }
    }
`;

export const notificationFeedVSCode = gql`
    query notificationFeedVSCode($first: Int) {
        notifications {
            notificationFeed(filter: { readStateFilter: unread, categoryFilter: direct }, flat: true, first: $first) {
                nodes {
                    headNotification {
                        notificationId
                        timestamp
                        content {
                            actor {
                                displayName
                            }
                            bodyItems {
                                document {
                                    format
                                    data
                                }
                            }
                            url
                            type
                            message
                        }
                    }
                }
            }
        }
    }
`;
