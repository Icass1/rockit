import { HttpResult, type LibraryMediasResponse } from "@rockit/shared";
import { Http } from "@/lib/http";

export async function getLibraryMedias(): Promise<
    HttpResult<LibraryMediasResponse>
> {
    return await Http.getUserLibraryMedias();
}
