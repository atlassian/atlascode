import { gql } from 'graphql-request';

export const unseenNotificationCountVSCode = gql`
    query unseenNotificationCountVSCode {
        notifications {
            unseenNotificationCount
        }
    }
`;

export const notificationFeedVSCode = gql`
    query notificationFeedVSCode($first: Int, $collabContextRoutingAri: String) {
        notifications {
            notificationFeed(
                filter: { readStateFilter: unread, categoryFilter: direct }
                flat: true
                first: $first
                collabContextRoutingAri: $collabContextRoutingAri
            ) {
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
