"use client";

import type { Dispatch, SetStateAction } from "react";
import pkg from "lodash";

export type ColumnFiltersType = {
    [key: string]: { text: string; invert: boolean; exact: boolean };
};
export type ColumnType = {
    name: string;
    width: number;
    key: boolean;
    type: string;
};

export type TableContextType = {
    table: string;
    setSortBy: Dispatch<SetStateAction<string | undefined>>;
    columns: ColumnType[] | undefined;
    sortBy: string | undefined;
    sortAscending: boolean;
    setSortAscending: Dispatch<SetStateAction<boolean>>;
    setInsertPopOpen: Dispatch<SetStateAction<boolean>>;
    fetchDebounce: React.RefObject<DebounceFetchType | null>;
    maxRows: number;
    totalRows: number;
    data: object[] | undefined;
    setEditPopup: Dispatch<SetStateAction<number | undefined>>;
    offset: number;
    columnFilters:
        | {
              [key: string]: {
                  text: string;
                  invert: boolean;
                  exact: boolean;
              };
          }
        | undefined;
    setColumnFilters: Dispatch<
        SetStateAction<
            | {
                  [key: string]: {
                      text: string;
                      invert: boolean;
                      exact: boolean;
                  };
              }
            | undefined
        >
    >;
};

export type DebounceFetchType = pkg.DebouncedFunc<
    (
        maxRows: number,
        columnFilters: ColumnFiltersType | undefined,
        offset: number,
        sortBy: string | undefined,
        sortAscending: boolean
    ) => void
>;
export type RequestType = {
    table: string;
    maxRows: number;
    offset?: number;
    sortColumn?: string;
    ascending?: boolean;
    columns?: string[];
    filter?: {
        column: string;
        text: string;
        invert: boolean;
        exact: boolean;
    }[];
    dbFile: string
};

export type Row = {
    index: number;
    row: { [key: string]: string | number | undefined };
};
