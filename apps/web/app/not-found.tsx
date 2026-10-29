import { JSX } from "react";
import ErrorPage from "@/components/ErrorPage/ErrorPage";

export default function NotFound(): JSX.Element {
    return <ErrorPage code={404} />;
}
