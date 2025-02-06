import { FilterSearchResult, FilterSearchResults } from '@atlassianlabs/jira-pi-common-models';
import {
    Checkbox,
    CircularProgress,
    makeStyles,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Toolbar,
    Typography,
} from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import StarIcon from '@material-ui/icons/Star';
import StarBorderIcon from '@material-ui/icons/StarBorder';
import clsx from 'clsx';
import React, { useContext, useEffect, useState } from 'react';
import { DetailedSiteInfo } from '../../../../../atlclients/authInfo';
import { VSCodeStyles, VSCodeStylesContext } from '../../../../vscode/theme/styles';
import { ConfigControllerContext } from '../../configController';
import { useFilterSearch } from './useFilterSearch';
import * as l10n from '@vscode/l10n';

type FilterTableToolbarProps = {
    numSelected: number;
    inputText: string;
    setInputText: (text: string) => void;
    loading: boolean;
};

type FilterTableHeadProps = {
    onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
    numSelected: number;
    rowCount: number;
};

type FilterSearchResultsTableProps = {
    site: DetailedSiteInfo;
    onSelected?: (filters: FilterSearchResult[]) => void;
};

type HeadCell = {
    id: string;
    disablePadding: boolean;
    label: string;
    align: 'inherit' | 'left' | 'center' | 'right' | 'justify' | undefined;
};

const headCells: HeadCell[] = [
    { id: 'name', disablePadding: true, label: 'Filter Name', align: 'left' },
    { id: 'owner', disablePadding: false, label: 'Owner', align: 'left' },
    { id: 'favorite', disablePadding: false, label: 'Favorite', align: 'center' },
];

const emptyResults: FilterSearchResults = {
    filters: [],
    isLast: true,
    maxResults: 25,
    offset: 0,
    total: 0,
};

const useToolbarStyles = makeStyles((theme) => ({
    root: {
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(1),
        marginBottom: theme.spacing(2),
    },
    highlight: (props: VSCodeStyles) => ({
        color: props.listActiveSelectionForeground,
        backgroundColor: props.listActiveSelectionBackground,
    }),

    title: {
        flex: '1 1 100%',
    },
}));

const useTableStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
    },
    paper: {
        width: '100%',
        marginBottom: theme.spacing(2),
    },
    container: {
        maxHeight: 440,
    },
}));

const FilterTableToolbar: React.FunctionComponent<FilterTableToolbarProps> = ({
    numSelected,
    inputText,
    setInputText,
    loading,
}) => {
    const vscStyles = useContext(VSCodeStylesContext);
    const classes = useToolbarStyles(vscStyles);

    return (
        <Toolbar
            className={clsx(classes.root, {
                [classes.highlight]: numSelected > 0,
            })}
        >
            {numSelected > 0 ? (
                <Typography className={classes.title} color="inherit" variant="subtitle1">
                    {numSelected} selected
                </Typography>
            ) : (
                <Typography className={classes.title} variant="h6" id="tableTitle">
                    Jira Filters
                </Typography>
            )}

            <TextField
                label={l10n.t('Search for filters')}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                fullWidth
                variant="standard"
                InputProps={{
                    startAdornment: (
                        <React.Fragment>
                            <SearchIcon fontSize="small" />
                        </React.Fragment>
                    ),
                    endAdornment: (
                        <React.Fragment>
                            {loading ? <CircularProgress color="inherit" size={20} /> : null}
                        </React.Fragment>
                    ),
                }}
            />
        </Toolbar>
    );
};

const FilterTableHead: React.FunctionComponent<FilterTableHeadProps> = ({
    onSelectAllClick,
    numSelected,
    rowCount,
}) => {
    return (
        <TableHead>
            <TableRow>
                <TableCell padding="checkbox">
                    <Checkbox
                        indeterminate={numSelected > 0 && numSelected < rowCount}
                        checked={rowCount > 0 && numSelected === rowCount}
                        onChange={onSelectAllClick}
                        color="primary"
                    />
                </TableCell>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.align}
                        padding={headCell.disablePadding ? 'none' : 'default'}
                    >
                        {headCell.label}
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
};

export const FilterSearchResultsTable: React.FunctionComponent<FilterSearchResultsTableProps> = ({
    site,
    onSelected,
}) => {
    const classes = useTableStyles();
    const [selected, setSelected] = useState<FilterSearchResult[]>([]);
    const [page, setPage] = React.useState(0);
    const [offset, setOffset] = React.useState(0);
    const rowsPerPage = 25;
    const controller = useContext(ConfigControllerContext);
    const { inputText, setInputText, filterSearch } = useFilterSearch(
        controller.fetchFilterSearchResults,
        site,
        offset,
        25,
    );

    const results: FilterSearchResults = filterSearch.result ? filterSearch.result : emptyResults;

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelecteds = [...results.filters];
            setSelected(newSelecteds);
            return;
        }
        setSelected([]);
    };

    const handleClick = (event: React.MouseEvent, filter: FilterSearchResult) => {
        const selectedIndex = selected.findIndex((f) => f.id === filter.id);
        let newSelected: FilterSearchResult[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, filter);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
        }

        setSelected(newSelected);
    };

    const handleChangePage = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, newPage: number) => {
        setPage(newPage);
        setOffset(25 * newPage);
        //filterSearch.execute();
    };

    const isSelected = (id: string) => selected.findIndex((f) => f.id === id) !== -1;

    //const emptyRows = rowsPerPage - Math.min(rowsPerPage, results.filters.length - page * rowsPerPage);

    useEffect(() => {
        setPage(0);
        setOffset(0);
    }, [site]);

    useEffect(() => {
        if (onSelected) {
            onSelected(selected);
        }
    }, [onSelected, selected]);

    return (
        <div className={classes.root}>
            <Paper className={classes.paper}>
                <FilterTableToolbar
                    numSelected={selected.length}
                    inputText={inputText}
                    setInputText={setInputText}
                    loading={filterSearch.loading}
                />
                <TableContainer className={classes.container}>
                    <Table stickyHeader size="small">
                        <FilterTableHead
                            numSelected={selected.length}
                            onSelectAllClick={handleSelectAllClick}
                            rowCount={results.filters.length}
                        />
                        <TableBody>
                            {results.filters.map((row, index) => {
                                const isItemSelected = isSelected(row.id);
                                const labelId = `enhanced-table-checkbox-${index}`;
                                const favIcon = row.favorite ? <StarIcon /> : <StarBorderIcon />;
                                return (
                                    <TableRow
                                        hover
                                        onClick={(event) => handleClick(event, row)}
                                        role="checkbox"
                                        aria-checked={isItemSelected}
                                        tabIndex={-1}
                                        key={row.id}
                                        selected={isItemSelected}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={isItemSelected}
                                                inputProps={{ 'aria-labelledby': labelId }}
                                                color="primary"
                                            />
                                        </TableCell>
                                        <TableCell component="th" id={labelId} scope="row" padding="none">
                                            {row.name}
                                        </TableCell>
                                        <TableCell>{row.owner}</TableCell>
                                        <TableCell align="center">{favIcon}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[25]}
                    component="div"
                    count={results.total}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                />
            </Paper>
        </div>
    );
};
