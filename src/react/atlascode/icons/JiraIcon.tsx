import { SvgIcon, SvgIconProps, Theme, useTheme } from '@material-ui/core';
import React from 'react';
import { uid } from 'react-uid';

export function JiraIcon(props: SvgIconProps) {
    const themeColor = props.color ? props.color : '';
    const theme = useTheme<Theme>();
    let color = '#3794ff';

    if (theme) {
        switch (themeColor.toLowerCase()) {
            case 'primary': {
                color = theme.palette.primary.main;
                break;
            }

            case 'secondary': {
                color = theme.palette.secondary.main;
                break;
            }

            case 'action': {
                color = theme.palette.action.active;
                break;
            }

            case 'error': {
                color = theme.palette.error.main;
                break;
            }

            case 'inherit': {
                color = 'currentColor';
                break;
            }

            default: {
                color = '#3794ff';
            }
        }
    }

    const id = uid({ iconGradientStart: color });
    return (
        <SvgIcon
            {...props}
            viewBox="0 0 32 32"
            component={(svgProps: SvgIconProps) => {
                return (
                    <svg {...svgProps}>
                        <defs>
                            <linearGradient x1="94.092%" x2="56.535%" y1="6.033%" y2="43.087%" id={id}>
                                <stop stopColor={color} stopOpacity="0.4" offset="18%"></stop>
                                <stop stopColor={color} offset="100%"></stop>
                            </linearGradient>
                        </defs>

                        <path
                            d="M26.0406546,5 L14.9983562,5 C14.9983562,6.32163748 15.5233746,7.58914413 16.4579134,8.52368295 C17.3924523,9.45822178 18.6599589,9.98324022 19.9815964,9.98324022 L22.0151159,9.98324022 L22.0151159,11.9465283 C22.0168782,14.6974491 24.2474348,16.9265768 26.9983562,16.9265762 L26.9983562,5.95770152 C26.9983562,5.42877757 26.5695786,5 26.0406546,5 Z"
                            fill={color}
                        ></path>
                        <path
                            d="M20.0420436,11 L9,11 C9.00176139,13.7504065 11.2309666,15.9796117 13.9813731,15.9813731 L16.0154337,15.9813731 L16.0154337,17.9451836 C16.0154337,19.2671728 16.5405919,20.5350167 17.4753794,21.4698042 C18.4101669,22.4045917 19.6780108,22.9297499 21,22.9297499 L21,11.9579564 C21,11.4288917 20.5711083,11 20.0420436,11 Z"
                            fill={`url(#${id})`}
                        ></path>
                        <path
                            d="M14.0420436,17 L3,17 C3.00176275,19.7516528 5.23291286,21.9813736 7.98456626,21.9813731 L10.0250133,21.9813731 L10.0250133,23.9451836 C10.0250082,26.6943468 12.2508419,28.9244664 15,28.9297499 L15,17.9579564 C15,17.4288917 14.5711083,17 14.0420436,17 Z"
                            fill={`url(#${id})`}
                        ></path>
                    </svg>
                );
            }}
        />
    );
}
