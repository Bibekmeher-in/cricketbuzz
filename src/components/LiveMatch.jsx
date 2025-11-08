import React, { useState, useEffect } from 'react'
import { liveMatchStyles, pickColors, getGradientStyle } from '../assets/dummyStyles'
import { getLiveMatches } from '../api/cricApi';
import Loader from "./Loader";
import { flagForTeamName } from "./Flag";

const LiveMatch = ({ onSelect }) => {
  const [matches, setMatches] = useState([]);
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [quotaMode, setQuotaMode] = useState(false);

  // helpers - original parsing logic (kept intact)
  const toNumberSafe = (v) => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const fmtEpochString = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const n = toNumberSafe(val);
    if (!n) return String(val);
    const ms = n < 1e12 && n > 1e9 ? n * 1000 : n;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString();
  };

  const formatInningsScore = (innings) => {
    if (!innings) return '';
    const runs = innings.runs ?? innings.runs;
    const wkts = innings.wickets ?? innings.wkts ?? innings.wktsTaken ?? '';
    const overs = innings.overs ?? innings.oversPlayed ?? innings.oversString ?? '';
    const score = (runs || runs === 0) ? `${runs}/${wkts || 0}` : '';
    return overs ? `${score} (${overs} ov)` : score;
  };

  const formatTeamScore = (matchScore, teamKey) => {
    if (!matchScore || !matchScore[teamKey]) return '';
    const obj = matchScore[teamKey];
    const inns2 = obj.inngs2 || obj.inngs || obj.inns2 || (obj.inngs1 && obj.inngs2 ? obj.inngs2 : null);
    if (inns2 && (inns2.runs != null)) return formatInningsScore(inns2);
    if (obj.inngs1 && (obj.inngs1.runs != null)) return formatInningsScore(obj.inngs1);
    if (obj.runs != null) {
      const runs = obj.runs, wkts = obj.wickets ?? obj.wkts ?? '';
      return `${runs}/${wkts}`;
    }
    return '';
  };

  // preserve your original extraction:
  const extractFromPayload = (payload) => {
    if (!payload) return [];
    const root = payload.data ?? payload;
    const typeMatches = root.typeMatches || root.type_matches || root;
    if (!Array.isArray(typeMatches)) return [];

    const out = [];
    for (const tm of typeMatches) {
      const seriesMatches = tm?.seriesMatches || tm?.series_matches || [];
      if (!Array.isArray(seriesMatches)) continue;

      for (const sEntry of seriesMatches) {
        const saw = sEntry?.seriesAdWrapper || sEntry;
        const matchesArr = (saw && (saw.matches || saw.matchesList)) || sEntry?.matches || [];
        if (Array.isArray(matchesArr) && matchesArr.length) {
          for (const mm of matchesArr) {
            const info = mm.matchInfo || mm.matchinfo || mm?.match || mm;
            const score = mm.matchScore || mm.matchScore || mm.score || {};
            const t1 = info?.team1 || info?.teamA || info?.teamA || {};
            const t2 = info?.team2 || info?.teamB || info?.teamB || {};
            const mId = (info && (info.matchId || info.matchid || info.match_id || info.mid)) ||
              (t1?.teamName || t1?.teamSName) + '-' + (t2?.teamName || t2?.teamSName) + '-' + (info?.startDate || info?.start_date || info?.start || '');
            const title = info?.status || info?.stateTitle || info?.matchDesc || info?.matchFormat || '';
            const start = info?.startDate || info?.start_date || info?.start || info?.startTime || info?.startTimeStamp || '';

            out.push({
              matchId: String(mId),
              team1: { name: t1?.teamSName || t1?.teamName || t1?.team || t1?.name || 'Team 1' },
              team2: { name: t2?.teamSName || t2?.teamName || t2?.team || t2?.name || 'Team 2' },
              status: info?.status || info?.stateTitle || title || '',
              venue: info?.venueInfo?.ground || info?.venueInfo?.city || info?.venue || '',
              time: fmtEpochString(start),
              score1: formatTeamScore(score, 'team1Score'),
              score2: formatTeamScore(score, 'team2Score'),
              raw: mm,
            });
          }
        }
      }
    }
    return out;
  };

  const dedupeByMatchId = (arr) => {
    const map = new Map();
    for (const a of arr) {
      if (!a) continue;
      const key = a.matchId || (a.team1?.name + '|' + a.team2?.name + '|' + a.time);
      if (!map.has(key)) map.set(key, a);
    }
    return Array.from(map.values());
  };

  async function fetchLive() {
    setLoading(true);
    setError(null);
    try {
      const res = await getLiveMatches({ cacheTTL: 30 });
      const payload = res.data ?? (res.rawResponse && res.rawResponse.data) ?? res;
      setRaw(payload);
      setQuotaMode(Boolean(res.quotaExceeded || res.fallback || res.quota_exceeded));

      const candidates = extractFromPayload(payload);
      const deduped = dedupeByMatchId(candidates);

      const mapped = deduped.map((m) => {
        const teamAName = m.team1?.name || '';
        const teamBName = m.team2?.name || '';
        const flagA = flagForTeamName(teamAName || '');
        const flagB = flagForTeamName(teamBName || '');
        return {
          id: m.matchId,
          teamA: { name: teamAName, score: m.score1, flag: flagA },
          teamB: { name: teamBName, score: m.score2, flag: flagB },
          status: m.status,
          venue: m.venue,
          time: m.time,
          raw: m.raw,
        };
      });

      setMatches(mapped);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[LiveMatch] error', err);
      setError(err?.message || 'Failed to load live matches');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FlagAndLabel component (same approach you used)
  function FlagAndLabel({ flagObj, fallbackLabel }) {
    const srcPng = flagObj?.srcPng ?? flagObj?.src ?? null;
    const srcSvg = flagObj?.srcSvg ?? null;
    const emoji = flagObj?.emoji ?? null;
    const initials = flagObj?.initials ?? null;
    const label = flagObj?.label ?? fallbackLabel ?? '';

    const [currentSrc, setCurrentSrc] = useState(srcPng || srcSvg || null);
    const [triedSvg, setTriedSvg] = useState(false);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
      setCurrentSrc(srcPng || srcSvg || null);
      setTriedSvg(false);
      setImgError(false);
    }, [srcPng, srcSvg, emoji, initials, label]);

    function handleImgError() {
      if (srcSvg && !triedSvg && currentSrc !== srcSvg) {
        setTriedSvg(true);
        setCurrentSrc(srcSvg);
        return;
      }
      setImgError(true);
    }

    if (currentSrc && !imgError) {
      return (
        <img
          src={currentSrc}
          alt={label ? `${label} flag` : 'flag'}
          className={liveMatchStyles.flagImage}
          onError={handleImgError}
        />
      );
    }
    if (emoji) {
      return (
        <div className={liveMatchStyles.emojiContainer}>
          {emoji}
        </div>
      );
    }

    const text = initials || (label || '').split(' ').map(s => s[0] || '').slice(0, 2).join('').toUpperCase() || '?';
    const [c1, c2] = pickColors(label || text);
    return (
      <div
        className={liveMatchStyles.initialsContainer}
        style={getGradientStyle(c1, c2)}
        aria-hidden
      >
        <span className="text-sm">{text}</span>
      </div>
    );
  }

  return (
    <div className={liveMatchStyles.container}>
      <div className={liveMatchStyles.headerContainer}>
        <div>
          <div className={liveMatchStyles.titleWrapper}>
            <div className={liveMatchStyles.title}>Live Matches</div>
            <span className={liveMatchStyles.dotPulse}></span>
            <span className={liveMatchStyles.dotBase}></span>
          </div>
          <div className={liveMatchStyles.subtitle}>Manual refresh (no polling) - protects quota</div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && <div className={liveMatchStyles.subtitle}>Last: {lastUpdated.toLocaleString()}</div>}
          <button onClick={fetchLive} className={liveMatchStyles.refreshButton} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {quotaMode && (
        <div className={liveMatchStyles.quotaAlert}>
          Quota may be exceeded - showing cached/sample data.
        </div>
      )}

      {loading && matches.length === 0 ? (
        <div className={liveMatchStyles.loadingContainer}>
          <Loader message='Loading live matches...'/>
        </div>
      ) : error ? (
          <div className={liveMatchStyles.errorContainer}>
            Error: {error}
          </div>
        ) : matches.length > 0 ? (
            <div className={liveMatchStyles.matchesGrid}>
              {matches.map((m) => (
                <div key={m.id} role="button" tabIndex={0} onClick={() => onSelect && onSelect(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === " ")
                      onSelect && onSelect(m.id)
                  }} className={liveMatchStyles.matchCard}>
                  <div className={liveMatchStyles.matchCardInner}>
                    <div className={liveMatchStyles.matchHeader}>
                      <div className={liveMatchStyles.matchStatus}>
                        {m.status || 'Match'}
                      </div>

                      <div className={liveMatchStyles.matchTime}>
                        {m.time ? m.time.split(",")[0] : ""}
                      </div>
                    </div>
                    <div className={liveMatchStyles.teamsContainer}>
                      <div className={liveMatchStyles.teamContainer}>
                        <FlagAndLabel flagObj={m.teamA.flag} fallbackLabel={m.teamA.name} />
                        <div className="min-w-0">
                          <div className={liveMatchStyles.teamName}>{m.teamA.name}</div>
                          <div className={liveMatchStyles.teamScore}>{m.teamA.score || ''}</div>
                        </div>
                      </div>

                      <div className={liveMatchStyles.vsText}>vs</div>

                      <div className={liveMatchStyles.teamContainerReversed}>
                        <div className="text-right min-w-0">
                          <div className={liveMatchStyles.teamName}>{m.teamB.name}</div>
                          <div className={liveMatchStyles.teamScore}>{m.teamB.score || ''}</div>
                        </div>
                        <FlagAndLabel flagObj={m.teamB.flag} fallbackLabel={m.teamB.name} />
                      </div>
                    </div>
                    <div className={liveMatchStyles.matchFooter}>
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => {
                          e.stopPropagation();
                          onSelect && onSelect(m.id);
                        }} className={liveMatchStyles.detailsButton}>
                          Details
                        </button>
                        <div className={liveMatchStyles.matchId}>#{m.id}</div>
                      </div>
                      <div className={liveMatchStyles.venue}>{m.venue || ''}</div>
                    </div>
                  </div>

                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ boxShadow: '0 6px 20px rgba(59,130,246,0.12)' }}
                  />
                  </div>
              ))}
            </div>
          ) : (
              <div className={liveMatchStyles.noMatchesContainer}>
                <div className='mb-3'> 
                  No parsed live matches. Raw API for debugging.
                </div>
                <pre className={liveMatchStyles.rawDataPre}>
                  {JSON.stringify(raw ?? "No data", null, 2)}
                </pre>
              </div>
      )}
    </div>
  );
};

export default LiveMatch;