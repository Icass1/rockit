import { RecommendationArtworkManager as SharedArtworkManager } from "@/managers/recommendationArtworkManager";
import { Http } from "@/lib/api/browser";

export class RecommendationArtworkManager extends SharedArtworkManager {
    constructor() {
        super(Http);
    }
}
