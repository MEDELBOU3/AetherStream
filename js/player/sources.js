
/**
 * STREAMING SOURCE DEFINITIONS
 */

export const STREAMING_PROVIDERS = [
    { 
        name: 'VidSrc.su (Official)', 
        logo: 'https://www.google.com/s2/favicons?domain=vidsrc.su&sz=128',
        urlFormat: (id, type, season, episode, data, config) => {
            const domain = 'https://vsrc.su/embed';
            
            // 1. ID LOGIC
            // Docs use 'tt...' (IMDB ID) for movies. 
            // We prioritize IMDB ID for movies to ensure they work.
            // Fallback to TMDB ID (id) if IMDB is missing.
            const useId = (type === 'movie' && data?.external_ids?.imdb_id) 
                          ? data.external_ids.imdb_id 
                          : id;

            // 2. URL Construction
            let url = `${domain}/${useId}`;
            
            if (type === 'tv' && season) {
                url += `/${season}/${episode || 1}`;
            }

            // 3. COLOR CUSTOMIZATION (From Docs)
            // Format: /color-{HEX}
            // We use your app's accent color (E50914)
            url += `/color-E50914`;

            // 4. Query Parameters
            const params = [];
            
            // Standard params usually supported by this family of players
            if (config.autoplay) params.push('autoplay=1');
            if (config.lang) params.push(`ds_lang=${config.lang}`); 

            return params.length ? `${url}?${params.join('&')}` : url;
        }
    },
    {
        name: 'VidLink (Fast + Subs)',
        logo: 'https://www.google.com/s2/favicons?domain=vidlink.pro&sz=128',
        urlFormat: (id, type, season, episode, data, config) => {
            let url = `https://vidlink.pro/${type}/${id}`;
            const params = [];

            if (type === 'tv' && season) {
                params.push(`season=${season}`);
                params.push(`episode=${episode || 1}`);
            }
            
            if (config.autoplay) params.push('autoplay=true');
            params.push('primaryColor=E50914'); // VidLink also supports color

            // Inject External Subtitles if available
            if (config.subtitleUrl) {
                params.push(`sub.file=${encodeURIComponent(config.subtitleUrl)}`);
                params.push(`sub.label=${config.lang || 'English'}`);
            }

            return `${url}?${params.join('&')}`;
        }
    },
    {
        name: 'AutoEmbed (Multi-Lang)',
        logo: 'https://www.google.com/s2/favicons?domain=autoembed.co&sz=128',
        urlFormat: (id, type, season, episode, data, config) => {
            let url = `https://autoembed.co/${type}/tmdb/${id}`;
            if (type === 'tv' && season) url += `-${season}-${episode || 1}`;
            
            const params = [];
            if (config.lang) params.push(`lang=${config.lang}`);
            
            return params.length ? `${url}?${params.join('&')}` : url;
        }
    },
    { 
        name: 'VidSrc.to (Backup)', 
        logo: 'https://www.google.com/s2/favicons?domain=vidsrc.to&sz=128',
        urlFormat: (id, type, season, episode, data, config) => {
            // Old domain backup, strictly TMDB based
            let url = `https://vidsrc.to/embed/${type}/${id}`;
            if (type === 'tv' && season) url += `/${season}/${episode || 1}`;

            const params = [];
            if (config.autoplay) params.push('autoplay=1');
            if (config.lang) params.push(`ds_lang=${config.lang}`); 

            return params.length ? `${url}?${params.join('&')}` : url;
        }
    },
    {
        name: 'SmashyStream',
        logo: 'https://www.google.com/s2/favicons?domain=smashystream.com&sz=128',
        urlFormat: (id, type, season, episode, data, config) => {
            let url = `https://embed.smashystream.com/playere.php?tmdb=${id}`;
            if (type === 'tv' && season) url += `&season=${season}&episode=${episode || 1}`;
            if (config.autoplay) url += '&autoplay=1';
            return url;
        }
    },
    {
        name: 'NontonGo',
        logo: 'https://www.google.com/s2/favicons?domain=nontongo.win&sz=128',
        urlFormat: (id, type, season, episode, data, config) => {
            let url = `https://www.nontongo.win/embed/${type}/${id}`;
            if (type === 'tv' && season) url += `/${season}/${episode || 1}`;
            return url;
        }
    },
    {
        name: 'Vidrock',
        logo: 'https://vidrock.net/Rock.png',
        urlFormat: (id, type, season, episode, data, config) => {
            let url = `https://vidrock.net/embed/${type}/${id}`;
            if (type === 'tv' && season) {
                url += `/${season}/${episode || 1}`;
            }
            const params = [];
            if (config.autoplay) params.push('autoplay=1');
            return params.length ? `${url}?${params.join('&')}` : url;
        }

    }
];
/**
 * STREAMING SOURCE DEFINITIONS
 * 
 * Logic handles:
 * 1. Base URL construction (Movie vs TV)
 * 2. URL Parameters (Autoplay, Language)
 * 3. External Subtitle Injection (for VidLink)
 */
/*
export const STREAMING_PROVIDERS = [
    {
        name: 'VidLink (Fast + Ext Subs)',
        urlFormat: (id, type, season, episode, data, config) => {
            let url = `https://vidlink.pro/${type}/${id}`;
            const params = [];

            // VidLink uses query params for seasons
            if (type === 'tv' && season) {
                params.push(`season=${season}`);
                params.push(`episode=${episode || 1}`);
            }

            if (config.autoplay) params.push('autoplay=true');

            // --- EXTERNAL SUBTITLE INJECTION ---
            // Only VidLink reliably supports passing a direct URL to an .srt file
            if (config.subtitleUrl) {
                params.push(`sub.file=${encodeURIComponent(config.subtitleUrl)}`);
                params.push(`sub.label=${config.lang || 'English'}`);
            }

            // Fallback: If no external file, try to set player default color/theme
            if (!config.subtitleUrl) {
                params.push('primaryColor=E50914');
            }

            return `${url}?${params.join('&')}`;
        }
    },
    { 
        name: 'VidSrc.me (Reliable)', 
        urlFormat: (id, type, season, episode, data, config) => {
            // FIX: Reverted to using TMDB ID (id) for movies.
            // The endpoint /embed/movie/{id} works best with TMDB IDs.
            
            let url = `https://vidsrc.me/embed/${type}/${id}`;
            
            if (type === 'tv' && season) {
                url += `/${season}/${episode || 1}`;
            }

            const params = [];
            if (config.autoplay) params.push('autoplay=1');
            
            // VidSrc Internal Language Selector
            if (config.lang) params.push(`ds_lang=${config.lang}`); 

            return params.length ? `${url}?${params.join('&')}` : url;
        }
    },
    {
        name: 'VidSrc.pro (Backup)',
        urlFormat: (id, type, season, episode, data, config) => {
            let url = `https://vidsrc.pro/embed/${type}/${id}`;
            if (type === 'tv' && season) {
                url += `/${season}/${episode || 1}`;
            }

            const params = [];
            if (config.autoplay) params.push('autoplay=1');

            return params.length ? `${url}?${params.join('&')}` : url;
        }
    },
    {
        name: 'AutoEmbed (Multi-Lang)',
        urlFormat: (id, type, season, episode, data, config) => {
            let url = `https://autoembed.co/${type}/tmdb/${id}`;

            if (type === 'tv' && season) {
                url += `-${season}-${episode || 1}`;
            }

            const params = [];
            // AutoEmbed specific language param
            if (config.lang) params.push(`lang=${config.lang}`);

            return params.length ? `${url}?${params.join('&')}` : url;
        }
    },
    {
        name: 'NontonGo',
        urlFormat: (id, type, season, episode, data, config) => {
            let url = `https://www.nontongo.win/embed/${type}/${id}`;
            if (type === 'tv' && season) {
                url += `/${season}/${episode || 1}`;
            }
            return url;
        }
    },
    {
        name: 'SmashyStream',
        urlFormat: (id, type, season, episode, data, config) => {
            let url = `https://embed.smashystream.com/playere.php?tmdb=${id}`;

            if (type === 'tv' && season) {
                url += `&season=${season}&episode=${episode || 1}`;
            }

            if (config.autoplay) url += '&autoplay=1';

            return url;
        }
    },
    {
        name: 'SuperEmbed',
        urlFormat: (id, type, season, episode, data, config) => {
            let url = `https://multiembed.mov/?video_id=${id}&tmdb=1`;
            if (type === 'tv' && season) {
                url += `&s=${season}&e=${episode || 1}`;
            }
            return url;
        }
    }
];*/