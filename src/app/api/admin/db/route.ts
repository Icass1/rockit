import { getSession } from "@/lib/auth/getSession";
import { type Column } from "@/lib/db/db";
import { getDB } from "@/lib/db/getDB";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    const session = await getSession();

    if (!session?.user?.admin) {
        return new NextResponse("Not found", { status: 404 });
    }

    const data = (await request.json()) as {
        table: string;
        primaryKey: { column: string; value: string };
        dbFile: string;
    };

    const { db, shouldClose } = getDB(data.dbFile);
    try {
        db.prepare(
            `DELETE FROM ${data.table} WHERE ${data.primaryKey.column} = ?`
        ).run(data.primaryKey.value);
        if (shouldClose) db.close();
        return new NextResponse("OK");
    } catch (error) {
        if (shouldClose) db.close();
        return new NextResponse(error?.toString(), { status: 500 });
    }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
    const session = await getSession();
    if (!session?.user?.admin) {
        return new NextResponse("Not found", { status: 404 });
    }
    const data = (await request.json()) as
        | {
              type: "UPDATE";
              table: string;
              data: {
                  primaryKey: { column: string; value: string };
                  editedColumns: { column: string; newValue: string }[];
              };
              dbFile: string;
          }
        | {
              type: "INSERT";
              table: string;
              fields: { [key: string]: string };
              dbFile: string;
          }
        | undefined;

    if (!data?.dbFile) {
        return new NextResponse("Database file not provided", { status: 400 });
    }

    const { db, shouldClose } = getDB(data.dbFile);

    if (data?.type == "INSERT") {
        try {
            db.prepare(
                `INSERT INTO ${data.table} (${Object.keys(data.fields).join(",")}) VALUES(${Array(
                    Object.keys(data.fields).length
                )
                    .fill(0)
                    .map(() => "?")
                    .join(",")})`
            ).run(...Object.values(data.fields));
            if (shouldClose) db.close();
            return new NextResponse("OK");
        } catch (error) {
            if (shouldClose) db.close();

            return new NextResponse(error?.toString(), { status: 500 });
        }
    } else if (data?.type == "UPDATE") {
        try {
            db.prepare(
                `UPDATE ${data.table} SET ${data.data.editedColumns.map((column) => `${column.column} = ? `)} WHERE ${data.data.primaryKey.column} = ?`
            ).run(
                ...data.data.editedColumns.map((column) => column.newValue),
                data.data.primaryKey.value
            );
            if (shouldClose) db.close();
            return new NextResponse("OK");
        } catch (error) {
            if (shouldClose) db.close();
            return new NextResponse(error?.toString(), { status: 500 });
        }
    } else {
        if (shouldClose) db.close();
        return new NextResponse(
            `Request type '${JSON.stringify(data)}' not implmented`,
            {
                status: 400,
            }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const session = await getSession();

    if (!session?.user?.admin) {
        return new NextResponse("Not found", { status: 404 });
    }
    const data: {
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
        dbFile: string;
    } = await request.json();

    let whereString = "";

    if (data.filter && data.filter?.length > 0) {
        whereString += "WHERE";
        data.filter.forEach((filter, index) => {
            if (filter.text == "NULL") {
                if (filter.invert) {
                    whereString += ` ${filter.column} IS NOT NULL`;
                } else {
                    whereString += ` ${filter.column} IS NULL`;
                }
            } else {
                if (filter.exact) {
                    if (filter.invert) {
                        whereString += ` ${filter.column} != '${filter.text}'`;
                    } else {
                        whereString += ` ${filter.column} = '${filter.text}'`;
                    }
                } else {
                    if (filter.invert) {
                        whereString += ` ${filter.column} NOT LIKE '%${filter.text}%'`;
                    } else {
                        whereString += ` ${filter.column} LIKE '%${filter.text}%'`;
                    }
                }
            }

            if (data.filter && index < data.filter?.length - 1) {
                whereString += " AND";
            }
        });
    }

    const { db, shouldClose } = getDB(data.dbFile);

    const response = db
        .prepare(
            `SELECT ${data.columns ? data.columns.join(",") : "*"} FROM ${data.table} ${whereString} ${data.sortColumn ? `ORDER BY ${data.sortColumn} ${data.ascending ? "ASC" : "DESC"}` : ""} LIMIT ${data.maxRows} ${data.offset ? "OFFSET " + data.offset : ""} `
        )
        .all();

    const totalRows = db
        .prepare(
            `SELECT id FROM ${data.table} ${whereString} ${data.sortColumn ? `ORDER BY ${data.sortColumn} ${data.ascending ? "ASC" : "DESC"}` : ""}`
        )
        .all().length;

    const columns = db
        .prepare(`PRAGMA table_info(${data.table})`)
        .all() as Column[];

    if (shouldClose) db.close();

    return new NextResponse(
        JSON.stringify({
            totalRows: totalRows,
            offset: data.offset ?? 0,
            columns: columns,
            data: response,
        }),
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );
}
