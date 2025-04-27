"use client";

import { createContext } from "react";
import type { TableContextType } from "./types";

export const TableContext = createContext<TableContextType | undefined>(
    undefined
);
