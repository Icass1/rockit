import { RecommendationArtworkManager as SharedArtworkManager } from "@rockit/shared";
import { Http } from "@/lib/api/browser";

export class RecommendationArtworkManager extends SharedArtworkManager {
    constructor() {
        super(Http);
    }
}
