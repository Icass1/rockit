import {
    GetServerSidePropsContext,
    NextApiRequest,
    NextApiResponse,
} from "next";
import { getServerSession, User } from "next-auth";
import { nextAuthOptions } from "./options";

export function getSession(
    ...args:
        | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
        | [NextApiRequest, NextApiResponse]
        | []
) {
    return getServerSession(...args, nextAuthOptions) as Promise<
        | {
              user: User;
          }
        | undefined
    >;
}
