import * as z from "zod";
import { RockItAlbumWithoutSongsResponse } from "./rockItAlbumWithoutSongsResponse";

export const FeaturedListsResponse = z.array(RockItAlbumWithoutSongsResponse);
