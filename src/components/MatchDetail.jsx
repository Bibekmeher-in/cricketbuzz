import React, { useEffect, useState, useCallback } from 'react'
import { getMatchCenter, getScard, getHscard } from '../api/cricApi'
import { matchDetailStyles } from '../assets/dummyStyles'
import Loader from './Loader';
import ScoreCard from './ScoreCard';
import Scoreboard from './Scoreboard';
import PlayerList from './PlayerList';

const MatchDetail = ({ matchId, className = '' }) => {
    const [center, setCenter] = useState(null);
    const [scard, setScard] = useState(null);
    const [hscard, setHscard] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showRaw, setShowRaw] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const tryExtract = (resp) => {
        if (!resp) return null;
        if (resp.data) return resp.data;
        if (resp.rawResponse && resp.rawResponse.data) return resp.rawResponse.data;
        if (resp.data && resp.data.data) return resp.data.data;
        if (resp.body && typeof resp.body === 'string') {
            try {
                return JSON.parse(resp.body);
            } catch (e) {
                console.error("Error parsing response:", e)
            }
        }
        return resp;
    };

    // map the lowercase "scorecard" shape into innings used by ScoreCard
    const mapLowercaseScorecard = (node) => {
        if (!node) return [];
        const arr = Array.isArray(node.scorecard) ? node.scorecard : (Array.isArray(node.scoreCard) ? node.scoreCard : (Array.isArray(node) ? node : []));
        if (!arr || !arr.length) return [];
        return arr.map((inn) => {
            const title = inn.batteamname || inn.batTeamName || `Innings ${inn.inningsid ?? ''}`;
            const score = (inn.score != null ? `${inn.score}/${inn.wickets ?? ''}` : (inn.scoreDetails ? `${inn.scoreDetails.runs ?? ''}/${inn.scoreDetails.wickets ?? ''}` : ''));
            const overs = inn.overs ?? (inn.scoreDetails && inn.scoreDetails.overs) ?? '';
            const batsmen = (inn.batsman || inn.batsmen || []).map((b) => ({
                name: b.name || b.batName || `${b.id || ''}`,
                runs: b.runs ?? b.r ?? null,
                balls: b.balls ?? b.b ?? null,
                four: b.fours ?? 0,
                six: b.sixes ?? 0,
            }));
            const bowlers = (inn.bowler || inn.bowlers || []).map((bw) => ({
                name: bw.name || bw.bowlName || `${bw.id || ''}`,
                overs: bw.overs ?? bw.o ?? null,
                wickets: bw.wickets ?? bw.w ?? null,
                runs: bw.runs ?? bw.r ?? null,
                econ: bw.economy ?? bw.eco ?? null,
            }));
            return { title, score, overs, batsmen, bowlers, summary: inn.status || '' };
        });
    }; // this function map the lowercase scoreboard and return a detail overview.

    const fetchAll = useCallback(async () => {
        if (!matchId && matchId !== 0) return;
        setLoading(true);
        setError(null);
        setCenter(null);
        setScard(null);
        setHscard(null);

        const mid = String(matchId).match(/\d{1,}/) ? Number(String(matchId).match(/\d{1,}/)[0]) : matchId;

        try {
            const promises = [getMatchCenter(mid), getScard(mid)];
            if (typeof getHscard === 'function') promises.push(getHscard(mid));
            const results = await Promise.allSettled(promises);

            const centerRes = results[0];
            const scardRes = results[1];
            const hscardRes = results.length > 2 ? results[2] : null;

            const centerPayload = centerRes.status === 'fulfilled' ? tryExtract(centerRes.value) : null;
            const scardPayload = scardRes.status === 'fulfilled' ? tryExtract(scardRes.value) : null;
            const hscardPayload = hscardRes && hscardRes.status === 'fulfilled' ? tryExtract(hscardRes.value) : null;

            console.log('[MatchDetail] centerPayload keys:', centerPayload ? Object.keys(centerPayload).slice(0, 8) : null);
            console.log('[MatchDetail] scardPayload keys:', scardPayload ? Object.keys(scardPayload).slice(0, 8) : null);
            console.log('[MatchDetail] hscardPayload keys:', hscardPayload ? Object.keys(hscardPayload).slice(0, 8) : null);

            setCenter(centerPayload);
            setHscard(hscardPayload);

            // normalize scard -> innings
            let innings = [];
            // first try scardPayload (may already be correct)
            if (scardPayload) {
                // prefer scardPayload.innings
                if (Array.isArray(scardPayload.innings)) {
                    innings = scardPayload.innings;
                } else {
                    // try lowercase scorecard shape inside scardPayload
                    innings = mapLowercaseScorecard(scardPayload);
                }
            }

            // fallback to hscardPayload (which may be lower-case in your wrapper)
            if ((!innings || innings.length === 0) && hscardPayload) {
                // hscard may live under hscardPayload.scorecard (lowercase)
                const tryLower = mapLowercaseScorecard(hscardPayload);
                if (tryLower && tryLower.length) innings = tryLower;
            }

            // final fallback: try to map scardPayload via previous mapping (if scardPayload had .data.innings etc.)
            if ((!innings || innings.length === 0) && scardPayload) {
                if (scardPayload.data && Array.isArray(scardPayload.data.innings)) innings = scardPayload.data.innings;
            }

            if (innings && innings.length) {
                setScard({ innings });
            } else {
                // keep raw scard/hscard for debugging
                setScard(scardPayload || hscardPayload || null);
            }

            setLastUpdated(new Date());
        } catch (err) {
            console.error('[MatchDetail] fetch error', err);
            setError(err?.message || 'Failed to load match details');
        } finally {
            setLoading(false);
        }
    }, [matchId]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]); // it will fetch the details from the API of center

    const innings = (scard && scard.innings) || [];
    const players = (() => {
        // try center squads
        const squads = center && (center.squads || center.teamSquads || (center.data && center.data.squads));
        if (Array.isArray(squads) && squads.length) {
            return squads.flatMap((t) => (t.players || t.squad || []).map((p) => ({ id: p.id || p.pid, name: p.name || p.fullName || p.player })));
        }
        // try hscard header teams
        if (hscard && hscard.matchHeader) {
            const header = hscard.matchHeader;
            const list = [];
            if (header.team1 && Array.isArray(header.team1.playerDetails)) list.push(...header.team1.playerDetails.map((p) => ({ id: p.id, name: p.name })));
            if (header.team2 && Array.isArray(header.team2.playerDetails)) list.push(...header.team2.playerDetails.map((p) => ({ id: p.id, name: p.name })));
            if (list.length) return list;
        }
        // fallback: collect batsmen from innings
        if (Array.isArray(innings) && innings.length) {
            return innings.flatMap((inn) => (inn.batsmen || inn.batsman || []).map((b) => ({ id: b.name || b.id, name: b.name || b.batName })));
        }
        return [];
    })();

    const matchTitle = (center && (center.match?.title || center.series || center.title)) || (hscard && (hscard.matchHeader?.matchDescription || hscard.matchHeader?.matchDesc)) || `Match ${matchId}`;


    return (
        <div className={`${matchDetailStyles.container} ${className}`}>
            <div className={matchDetailStyles.headerContainer}>
                <div>
                    <div className={matchDetailStyles.headerTitle}>Match Detail</div>
                    <div className={matchDetailStyles.headerSubtitle}>{matchTitle}</div>
                </div>
                <div className={matchDetailStyles.headerButtonGroup}>
                    {lastUpdated && (
                        <div className={matchDetailStyles.lastUpdatedText}>
                            Last: {lastUpdated.toLocaleTimeString()}
                        </div>
                    )}

                    <button onClick={() => fetchAll()} className={matchDetailStyles.refreshButton} disabled={loading}>
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                    <button onClick={() => setShowRaw((s) => !s)} className={matchDetailStyles.rawToggleButton}>
                        {showRaw ? "Hide raw" : "Show raw"}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={matchDetailStyles.loadingContainer}>
                    <Loader message='Loading match details...' />
                </div>
            ) : error ? (
                <div className={matchDetailStyles.errorContainer}>Error: {error}</div>
            ) : (
                <div className={matchDetailStyles.mainGrid}>
                    <div className={matchDetailStyles.leftColumn}>
                        <ScoreCard innings={innings} />

                        <div className={matchDetailStyles.scoreboardContainer}>
                            <Scoreboard matchId={String(matchId)} />
                        </div>

                        {showRaw && (
                            <div className={matchDetailStyles.rawDataContainer}>
                                <div className={matchDetailStyles.rawDataTitle}>Raw payloads</div>
                                <div className={matchDetailStyles.rawDataSectionTitle}>center:</div>
                                <pre className={matchDetailStyles.rawDataPre}>{JSON.stringify(center || {}, null, 2)}</pre>
                                <div className={matchDetailStyles.rawDataSectionTitle}>scard (normalized/raw):</div>
                                <pre className={matchDetailStyles.rawDataPre}>{JSON.stringify(scard || {}, null, 2)}</pre>
                                <div className={matchDetailStyles.rawDataSectionTitle}>hscard (raw):</div>
                                <pre className={matchDetailStyles.rawDataPre}>{JSON.stringify(hscard || {}, null, 2)}</pre>
                            </div>
                        )}
                    </div>

                    <aside className={matchDetailStyles.sidebarContainer}>
                        <div className={matchDetailStyles.summaryCard}>
                            <div className={matchDetailStyles.summaryTitle}>
                                Match Summary
                            </div>

                            <div className={matchDetailStyles.summaryText}>
                                {(center && center.match?.status) || (hscard && hscard.status) || (scard && scard.status) || "-"}
                            </div>

                            {center?.match?.venueInfo && (
                                <div className={matchDetailStyles.venueText}>
                                    {center.match.venueInfo.ground} •{""}
                                    {center.match.venueInfo.city}
                                </div>
                            )}
                        </div>

                        <div className={matchDetailStyles.playersCard}>
                            <div className={matchDetailStyles.playersTitle}>Players</div>
                            <PlayerList players={players} onSelect={(p) => console.log("player select", p)} compact />

                            {(!players || players.length === 0) && (
                                <div className={matchDetailStyles.noPlayersText}>No player data available</div>
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    )
}

export default MatchDetail