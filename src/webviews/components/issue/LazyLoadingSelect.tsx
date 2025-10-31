import { AsyncSelect } from '@atlaskit/select';
import { components } from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import React, { useCallback, useMemo } from 'react';

interface LazyLoadingSelectProps
    extends Omit<React.ComponentProps<typeof AsyncSelect>, 'defaultOptions' | 'onMenuScrollToBottom'> {
    options: any[];
    onLoadMore?: (startAt: number) => void;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    loadedCount?: number;
    totalCount?: number;
    pageSize?: number;
}

const LoadingOption = (props: any) => (
    <components.Option {...props}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size="small" />
        </div>
    </components.Option>
);

export const LazyLoadingSelect: React.FC<LazyLoadingSelectProps> = ({
    options,
    onLoadMore,
    hasMore = false,
    isLoadingMore = false,
    loadedCount = 0,
    totalCount = 0,
    pageSize = 50,
    loadOptions,
    ...selectProps
}) => {
    const handleMenuScrollToBottom = useCallback(() => {
        if (hasMore && !isLoadingMore && onLoadMore) {
            onLoadMore(loadedCount);
        }
    }, [hasMore, isLoadingMore, onLoadMore, loadedCount]);

    const finalOptions = useMemo(() => {
        if (hasMore && isLoadingMore) {
            return [...options, { value: '__loading__', label: 'Loading...', isDisabled: true }];
        }
        return options;
    }, [options, hasMore, isLoadingMore]);

    const customComponents = useMemo(() => {
        const customComponents = { ...selectProps.components };

        if (hasMore && isLoadingMore) {
            const OriginalOption = selectProps.components?.Option || components.Option;
            customComponents.Option = (props: any) => {
                if (props.data.value === '__loading__') {
                    return <LoadingOption {...props} />;
                }
                return <OriginalOption {...props} />;
            };
        }

        return customComponents;
    }, [hasMore, isLoadingMore, selectProps.components]);

    // If loadOptions is provided, use it, otherwise filter current options by input
    const handleLoadOptions = useCallback(
        (inputValue: string, callback: any) => {
            if (loadOptions) {
                return loadOptions(inputValue, callback);
            }
            if (!inputValue) {
                return Promise.resolve(finalOptions);
            }
            const filtered = finalOptions.filter((option: any) => {
                const label = option.label || option.name || '';
                return label.toLowerCase().includes(inputValue.toLowerCase());
            });
            return Promise.resolve(filtered);
        },
        [loadOptions, finalOptions],
    );

    return (
        <AsyncSelect
            {...selectProps}
            defaultOptions={finalOptions}
            loadOptions={handleLoadOptions}
            onMenuScrollToBottom={handleMenuScrollToBottom}
            components={customComponents}
            cacheOptions={false}
        />
    );
};
