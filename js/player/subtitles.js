/* js/player/subtitles.js */


const OS_API_KEY = 'eHOkGb9hokdh9edW2sMJH1ZaiWQxetgI'; 
const BASE_URL = 'https://api.opensubtitles.com/api/v1';

export class SubtitleManager {
    
    /**
     * Search by Text (Title + Season/Episode)
     */
    async getSubtitleUrl(tmdbId, season, episode, lang = 'en', mediaTitle, releaseYear) {
        if (!OS_API_KEY || OS_API_KEY.includes('YOUR_')) {
            console.warn("[SubManager] API Key missing.");
            return null;
        }

        // 1. Construct the Search Query
        let queryText = '';

        if (season && episode) {
            // TV Format: "Breaking Bad S01E01" (Standard Scene Format)
            // We pad numbers with 0 (e.g., 1 -> 01)
            const s = season.toString().padStart(2, '0');
            const e = episode.toString().padStart(2, '0');
            queryText = `${mediaTitle} S${s}E${e}`;
        } else {
            // Movie Format: "Inception 2010" (Helps filter remakes)
            queryText = `${mediaTitle} ${releaseYear || ''}`;
        }

        console.log(`[SubManager] Searching text: "${queryText}" in ${lang}`);

        try {
            // 2. Call API with 'query' parameter
            // Note: We also pass tmdb_id as a fallback filter if the API supports hybrid search
            const params = new URLSearchParams({
                query: queryText,
                languages: lang,
                tmdb_id: tmdbId // Optional: helps ranking
            });

            const searchRes = await fetch(`${BASE_URL}/subtitles?${params}`, {
                headers: {
                    'Api-Key': OS_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            const searchData = await searchRes.json();

            // 3. Process Results
            if (searchData.data && searchData.data.length > 0) {
                // Get the best match (first result)
                const fileId = searchData.data[0].attributes.files[0].file_id;
                console.log(`[SubManager] Match found: ${searchData.data[0].attributes.feature_details.movie_name}`);

                // 4. Get Download Link
                const linkRes = await fetch(`${BASE_URL}/download`, {
                    method: 'POST',
                    headers: {
                        'Api-Key': OS_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ file_id: fileId })
                });

                const linkData = await linkRes.json();
                return linkData.link;
            } else {
                console.warn("[SubManager] No subtitles found for query.");
            }

        } catch (e) {
            console.error("[SubManager] Error:", e);
        }

        return null;
    }
}

export const subs = new SubtitleManager();