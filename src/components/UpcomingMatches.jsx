import React, { useEffect, useState } from 'react'
import { upcomingMatchesStyles, pickColors, getGradientStyle } from '../assets/dummyStyles'
import { getUpcomingMatches } from '../api/cricApi'
import Loader from './Loader';
import { flagForTeamName } from './Flag';

const UpcomingMatches = ({ onSelect }) => {
    const [groups, setGroups] = useState([]);
    const [raw, setRaw] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [quotaMode, setQuotaMode] = useState(false);

    function fmtEpochString(val) {
        if (val === undefined || val === null || val === '') return '';
        const n = Number(val);
        if (Number.isNaN(n)) return String(val);
        const ms = n < 1e12 && n > 1e9 ? n * 1000 : n;
        const d = new Date(ms);
        if (isNaN(d.getTime())) return String(val);
        return d.toLocaleString();
    } //helper function

    function extractAndGroup(payload) {
        if (!payload) return [];
        const root = payload.data ?? payload;
        const typeMatches = root.typeMatches || root.type_matches || root;
        if (!Array.isArray(typeMatches)) return [];

        const temp = [];
        for (const tm of typeMatches) {
            const seriesMatches = tm?.seriesMatches || tm?.series_matches || [];
            for (const sEntry of seriesMatches) {
                const saw = sEntry?.seriesAdWrapper || sEntry;
                const matchesArr = (saw && (saw.matches || saw.matchesList)) || sEntry?.matches || [];
                if (Array.isArray(matchesArr)) {
                    for (const mm of matchesArr) {
                        const info = mm.matchInfo || mm.matchinfo || mm || {};
                        const t1 = info?.team1 || info?.teamA || {};
                        const t2 = info?.team2 || info?.teamB || {};
                        const start = info?.startDate || info?.start_date || info?.start || info?.startTime || '';
                        const seriesName = sEntry?.seriesAdWrapper?.seriesName || sEntry?.seriesName || info?.seriesName || info?.series || (tm?.seriesName || tm?.type || 'All matches');
                        temp.push({
                            matchId: String(info?.matchId ?? info?.matchId ?? `${t1?.teamName}-${t2?.teamName}-${start}`),
                            series: seriesName || 'All matches',
                            team1: { name: t1?.teamSName || t1?.teamName || t1?.name || 'Team 1' },
                            team2: { name: t2?.teamSName || t2?.teamName || t2?.name || 'Team 2' },
                            time: fmtEpochString(start),
                            venue: info?.venueInfo?.ground || info?.venueInfo?.city || info?.venue || '',
                            raw: mm,
                        });
                    }
                }
            }
        }
        // group by series and dedupe
        const groupsObj = {};
        for (const g of temp) {
            const key = g.series || 'All matches';
            if (!groupsObj[key]) groupsObj[key] = [];
            if (!groupsObj[key].find((x) => x.matchId === g.matchId)) groupsObj[key].push(g);
        }

        // produce ordered list (preserve insertion order)
        return Object.keys(groupsObj).map((k) => ({ title: k, matches: groupsObj[k] }));
    }
    //payload like livematches

    async function fetchUpcoming() {
        setLoading(true);
        setError(null);
        try {
            const res = await getUpcomingMatches({ cacheTTL: 300 });
            const payload = res.data ?? res.rawResponse?.data ?? res;
            setRaw(payload);
            setQuotaMode(Boolean(res.quotaExceeded || res.fallback || res.quota_exceeded));

            const grouped = extractAndGroup(payload);
            setGroups(grouped);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('[UpcomingMatches] error', err);
            setError(err?.message || 'Failed to load upcoming matches');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUpcoming();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); //this function helps us to fetch the details from the API given
    
    // Flag + initial fallback UI component
    function Flag({ name }) {
        const f = flagForTeamName(name || '');
        const srcPng = f?.srcPng ?? f?.src ?? null;
        const srcSvg = f?.srcSvg ?? null;
        const emoji = f?.emoji ?? null;
        const initials = f?.initials ?? null;
        const label = f?.label ?? name ?? '';

        const [src, setSrc] = useState(srcPng || srcSvg || null);
        const [triedSvg, setTriedSvg] = useState(false);
        const [imgError, setImgError] = useState(false);

        useEffect(() => {
            setSrc(srcPng || srcSvg || null);
            setTriedSvg(false);
            setImgError(false);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [name]);

        const onImgError = () => {
            if (srcSvg && !triedSvg && src !== srcSvg) {
                setTriedSvg(true);
                setSrc(srcSvg);
                return;
            }
            setImgError(true);
        };

        if (src && !imgError) {
            return (
                <img
                    src={src}
                    alt={`${label} flag`}
                    className={upcomingMatchesStyles.flagImage}
                    onError={onImgError}
                />
            );
        }

        if (emoji) {
            return (
                <div className={upcomingMatchesStyles.emojiContainer}>
                    {emoji}
                </div>
            );
        }

        const text = (initials || (label || '').split(' ').map(s => s[0] || '').slice(0, 2).join('').toUpperCase() || '?');
        const [c1, c2] = pickColors(label || text);
        return (
            <div
                className={upcomingMatchesStyles.initialsContainer}
                style={getGradientStyle(c1, c2)}
                title={label}
            >
                <span className="text-xs">{text}</span>
            </div>
        );
    } //this function is for flag selection.

    if (loading && groups.length === 0) {
        return (
            <div className={upcomingMatchesStyles.loadingContainer}>
                <Loader message='Loading upcoming' />
            </div>
        );
    }

    if (error) {
        return (
            <div className={upcomingMatchesStyles.errorContainer}>
                Error: {error}
            </div>
        )
    }

    return (
        <div className={upcomingMatchesStyles.container}>
            <div className={upcomingMatchesStyles.headerContainer}>
                <div>
                    <div className={upcomingMatchesStyles.headerTitle}>Upcoming Matches</div>
                    <div className={upcomingMatchesStyles.headerSubtitle}>
                        Manual refresh - protects quota
                    </div>
                </div>

                <div className='flex items-center gap-3'>
                    {lastUpdated && (
                        <div className={upcomingMatchesStyles.lastUpdatedText}>
                            Last: {lastUpdated.toLocaleDateString()}
                        </div>
                    )}
                    <button onClick={fetchUpcoming} className={upcomingMatchesStyles.refreshButton} disabled={loading}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {quotaMode && (
                <div className={upcomingMatchesStyles.quotaAlert}>
                    Quota may be exceeded - showing cached/sample data.
                </div>
            )}
            {groups.length > 0 ? (
                <div className={upcomingMatchesStyles.groupsContainer}>
                    {groups.map((g, gi) => (
                        <section key={gi} className={upcomingMatchesStyles.seriesSection}>
                            <div className={upcomingMatchesStyles.seriesHeader}>
                                <div>
                                    <div className={upcomingMatchesStyles.seriesTitle}>
                                        {g.title}
                                    </div>
                                    <div className={upcomingMatchesStyles.seriesMatchCount}>
                                        {g.matches.length} match{g.matches.length > 1 ? 'es' : ''}
                                    </div>
                                </div>
                                <div className={upcomingMatchesStyles.seriesLabel}>Series</div>
                            </div>

                            <div className={upcomingMatchesStyles.matchesGrid}>
                                {g.matches.map((m) => (
                                    <article
                                        key={m.matchId}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onSelect && onSelect(m.matchId)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect && onSelect(m.matchId); }}
                                        className={upcomingMatchesStyles.matchArticle}
                                        aria-label={`Upcoming match ${m.team1.name} vs ${m.team2.name}`}
                                    >
                                        <div className={upcomingMatchesStyles.matchArticleInner}>
                                            <div className={upcomingMatchesStyles.matchHeader}>
                                                <div className={upcomingMatchesStyles.matchTime}>
                                            {m.time || m.venue || 'TBA'}
                                                </div>
                                                <div className={upcomingMatchesStyles.matchVenue}>
                                                    {m.venue || ''}
                                                </div>
                                            </div>

                                            <div className={upcomingMatchesStyles.teamsContainer}>
                                                <div className={upcomingMatchesStyles.teamContainer}>
                                                    <Flag name={m.team1.name} />
                                                    <div className="min-w-0">
                                                        <div className={upcomingMatchesStyles.teamName}>{m.team1.name}</div>
                                                        <div className={upcomingMatchesStyles.teamStatus}>Upcoming</div>
                                                    </div>
                                                </div>

                                                <div className={upcomingMatchesStyles.vsText}>vs</div>

                                                <div className={upcomingMatchesStyles.teamContainerReversed}>
                                                    <div className="text-right min-w-0">
                                                        <div className={upcomingMatchesStyles.teamName}>{m.team2.name}</div>
                                                        <div className={upcomingMatchesStyles.teamStatus}>{m.venue || ''}</div>
                                                    </div>
                                                    <Flag name={m.team2.name} />
                                                </div>
                                            </div>

                                            <div className={upcomingMatchesStyles.matchFooter}>
                                                <div className=' flex items-center gap-3'>
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelect && onSelect(m.matchId);
                                                    }} className={upcomingMatchesStyles.detailsButton}>
                                                        Details
                                                    </button>
                                                    <div className={upcomingMatchesStyles.matchId}>
                                                        #{m.matchId}
                                                    </div>
                                                </div>

                                                <div className={upcomingMatchesStyles.matchDate}>
                                                    {m.time ? m.time.split(',')[0] : 'TBA'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* hover ring */}
                                        <div
                                            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            style={{ boxShadow: '0 8px 28px rgba(59,130,246,0.10)' }}
                                        />
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            ) : (
                    <div className={upcomingMatchesStyles.noMatchesContainer}>
                        <div className='mb-3'>
                            No upcomming matches parsed. Raw API response for debugging.
                        </div>
                        <pre className={upcomingMatchesStyles.rawDataPre}>
                            {JSON.stringify(raw ?? "No data", null, 2)}
                        </pre>
                    </div>
            )}
        </div>
    );
};

export default UpcomingMatches