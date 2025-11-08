import React, { useEffect, useState } from "react";
import { getHscard } from "../api/cricApi";
import { flagForTeamName } from "./Flag";
import { scoreboardStyles } from "../assets/dummyStyles";

export default function Scoreboard({ matchId }) {
    const [payload, setPayload] = useState(null);
    const [parsed, setParsed] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showRaw, setShowRaw] = useState(false);
    const [openInnings, setOpenInnings] = useState({});

    // --- utils (keep the same logic) ---
    const tryExtract = (resp) => {
        if (!resp) return null;
        if (resp.data) return resp.data;
        if (resp.rawResponse && resp.rawResponse.data) return resp.rawResponse.data;
        if (resp.data && resp.data.data) return resp.data.data;
        if (resp.response) return resp.response;
        if (resp.body) {
            if (typeof resp.body === "string") {
                try {
                    return JSON.parse(resp.body);
                } catch {
                    console.error("Something went wrong");
                }
            }
            return resp.body;
        }
        return resp;
    };

    const looksLikeScorecard = (node) => {
        if (!node || typeof node !== "object") return false;
        if (Array.isArray(node.scoreCard) || Array.isArray(node.scorecard))
            return true;
        if (Array.isArray(node) && node.length && typeof node[0] === "object") {
            const first = node[0];
            if (
                first.batsman ||
                first.batteamname ||
                first.batTeamDetails ||
                first.scoreDetails
            )
                return true;
        }
        if (
            node.matchHeader ||
            node.matchHeader ||
            node.status ||
            node.scorecard ||
            node.scoreCard
        )
            return true;
        if (node.batTeamDetails || node.bowlTeamDetails || node.scoreDetails)
            return true;
        return false;
    };

    function deepFind(node, visited = new WeakSet(), depth = 0) {
        if (!node || typeof node !== "object" || visited.has(node) || depth > 8)
            return null;
        visited.add(node);
        if (looksLikeScorecard(node)) return node;
        for (const k of Object.keys(node)) {
            try {
                const child = node[k];
                if (child && typeof child === "object") {
                    const found = deepFind(child, visited, depth + 1);
                    if (found) return found;
                }
                if (typeof child === "string") {
                    const s = child.trim();
                    if (s.startsWith("{") || s.startsWith("[")) {
                        try {
                            const parsedInner = JSON.parse(s);
                            const found = deepFind(parsedInner, visited, depth + 1);
                            if (found) return found;
                        } catch {
                            console.error("Something went wrong");
                        }
                    }
                }
            } catch (e) {
                console.error("Error:", e);
                /* ignore */
            }
        }
        return null;
    }

    const safe = (v, fallback = "") =>
        v === undefined || v === null ? fallback : v;
    const toStr = (v) => (v === undefined || v === null ? "" : String(v));

    function mapScorecardToInnings(node) {
        if (!node) return [];
        const arr = Array.isArray(node.scorecard)
            ? node.scorecard
            : Array.isArray(node.scoreCard)
                ? node.scoreCard
                : Array.isArray(node)
                    ? node
                    : [];
        if (!arr.length) return [];

        return arr.map((inn) => {
            const title =
                safe(inn.batteamname) ||
                (inn.batTeamDetails && inn.batTeamDetails.batTeamName) ||
                inn.teamName ||
                `Innings ${safe(inn.inningsid, "")}`;

            const scoreFromTop =
                inn.score != null ? `${inn.score}/${inn.wickets ?? ""}` : "";
            const scoreFromDetails =
                inn.scoreDetails && inn.scoreDetails.runs != null
                    ? `${inn.scoreDetails.runs}/${inn.scoreDetails.wickets ?? ""}`
                    : "";
            const score = scoreFromTop || scoreFromDetails || "";

            const overs =
                inn.overs ?? (inn.scoreDetails && inn.scoreDetails.overs) ?? "";

            const rawBats = Array.isArray(inn.batsman)
                ? inn.batsman
                : Array.isArray(inn.batsmen)
                    ? inn.batsmen
                    : inn.batTeamDetails && inn.batTeamDetails.batsmenData
                        ? Object.values(inn.batTeamDetails.batsmenData || {})
                        : [];
            const batsmen = (rawBats || []).map((b) => {
                return {
                    name:
                        b.name ||
                        b.batName ||
                        b.batsman ||
                        b.batName ||
                        b.batName ||
                        b.batName ||
                        toStr(b.batName) ||
                        toStr(b.id) ||
                        "Batsman",
                    runs: b.runs ?? b.r ?? b.runs ?? null,
                    balls: b.balls ?? b.b ?? null,
                    four: b.fours ?? b.boundaries ?? b.four ?? 0,
                    six: b.sixes ?? b.sixers ?? b.six ?? 0,
                    strikeRate: b.strikeRate ?? b.sr ?? null,
                    outDesc: b.outDesc || b.wicket || "",
                };
            });

            const rawBowl = Array.isArray(inn.bowler)
                ? inn.bowler
                : Array.isArray(inn.bowlers)
                    ? inn.bowlers
                    : inn.bowlTeamDetails && inn.bowlTeamDetails.bowlersData
                        ? Object.values(inn.bowlTeamDetails.bowlersData || {})
                        : [];
            const bowlers = (rawBowl || []).map((bw) => ({
                name:
                    bw.name ||
                    bw.bowlName ||
                    bw.bowler ||
                    toStr(bw.bowlName) ||
                    toStr(bw.id) ||
                    "Bowler",
                overs: bw.overs ?? bw.o ?? null,
                maidens: bw.maidens ?? bw.m ?? 0,
                runs: bw.runs ?? bw.r ?? null,
                wickets: bw.wickets ?? bw.w ?? null,
                econ: bw.economy ?? bw.eco ?? null,
            }));

            return { title, score, overs, batsmen, bowlers, raw: inn };
        });
    }

    function extractHeaderTeams(candidate) {
        const header =
            candidate.matchHeader ||
            candidate.header ||
            candidate.data?.matchHeader ||
            {};
        let teamA = null;
        let teamB = null;

        const mti =
            header.matchTeamInfo || header.matchTeam || header.matchTeamInfo || null;
        if (Array.isArray(mti) && mti.length >= 1) {
            const first = mti[0];
            const second = mti[1] || null;
            teamA =
                first?.battingTeamShortName ||
                first?.battingTeamId ||
                first?.battingTeam ||
                first?.teamName ||
                first?.team ||
                null;
            teamB =
                second?.battingTeamShortName ||
                second?.battingTeamId ||
                second?.battingTeam ||
                second?.teamName ||
                second?.team ||
                null;
        }

        if (!teamA && header.team1)
            teamA =
                header.team1?.shortName || header.team1?.name || header.team1?.teamName;
        if (!teamB && header.team2)
            teamB =
                header.team2?.shortName || header.team2?.name || header.team2?.teamName;

        if (
            (!teamA || !teamB) &&
            Array.isArray(candidate.scorecard || candidate.scoreCard || candidate)
        ) {
            const arr = Array.isArray(candidate.scorecard)
                ? candidate.scorecard
                : Array.isArray(candidate.scoreCard)
                    ? candidate.scoreCard
                    : Array.isArray(candidate)
                        ? candidate
                        : [];
            if (arr && arr.length >= 1) {
                const first = arr[0];
                if (!teamA && first.batteamname) teamA = first.batteamname;
                if (
                    !teamB &&
                    first.bowlTeamDetails &&
                    first.bowlTeamDetails.bowlTeamName
                )
                    teamB = first.bowlTeamDetails.bowlTeamName;
            }
        }

        return {
            header,
            teamA: safe(teamA, ""),
            teamB: safe(teamB, ""),
        };
    }

    useEffect(() => {
        if (!matchId && matchId !== 0) return;
        let mounted = true;
        setLoading(true);
        setError(null);
        setPayload(null);
        setParsed(null);

        (async () => {
            try {
                const resp = await getHscard(matchId);
                if (!mounted) return;

                let candidate = tryExtract(resp);
                let chosenPath = "resp.data / resp.rawResponse.data / resp.body";

                if (!looksLikeScorecard(candidate)) {
                    const found = deepFind(resp);
                    if (found) {
                        candidate = found;
                        chosenPath = "deepFind";
                    }
                }
                console.log("Chosen data path:", chosenPath);

                if (!candidate || !looksLikeScorecard(candidate)) {
                    setPayload(resp);
                    setParsed(null);
                    return;
                }

                setPayload(candidate);

                const innings = mapScorecardToInnings(candidate);
                const { header, teamA, teamB } = extractHeaderTeams(candidate);

                setParsed({
                    header: {
                        ...header,
                        matchDescription:
                            header.matchDescription ||
                            header.matchDesc ||
                            header.matchDesc ||
                            header.seriesName ||
                            header.seriesDesc ||
                            header.matchDescription,
                        status: header.status || header.state || header.result || "",
                    },
                    teams: { a: String(teamA || ""), b: String(teamB || "") },
                    innings,
                });

                setOpenInnings(() => {
                    const obj = {};
                    innings.forEach((_, i) => {
                        obj[i] = i === 0;
                    });
                    return obj;
                });
            } catch (err) {
                console.error("[Scoreboard] error", err);
                if (!mounted) return;
                setError(err?.message || "Failed to load scoreboard");
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [matchId]);

    // --- Flag UI ---
    function FlagSmall({ teamName }) {
        const f = flagForTeamName(teamName || "");
        const src = f?.src ?? null;
        const emoji = f?.emoji ?? null;
        const initials = f?.initials ?? null;
        const label = f?.label ?? teamName ?? "";

        const [imgError, setImgError] = useState(false);

        useEffect(() => {
            setImgError(false);
        }, [teamName]);

        if (src && !imgError) {
            return (
                <img
                    src={src}
                    alt={`${label} flag`}
                    className={scoreboardStyles.flagImage}
                    onError={() => setImgError(true)}
                />
            );
        }

        if (emoji) {
            return <div className={scoreboardStyles.flagEmoji}>{emoji}</div>;
        }

        const text =
            initials ||
            (label || "")
                .split(" ")
                .map((s) => s[0] || "")
                .slice(0, 2)
                .join("")
                .toUpperCase() ||
            "?";
        const palette = ["#06b6d4", "#3b82f6", "#7c3aed", "#ef4444", "#10b981"];
        const color = palette[(text.charCodeAt(0) || 0) % palette.length];
        return (
            <div
                className={scoreboardStyles.flagInitials}
                style={{ background: color }}
            >
                <span>{text}</span>
            </div>
        );
    }

    const toggleInnings = (idx) =>
        setOpenInnings((s) => ({ ...s, [idx]: !s[idx] }));

    // Render helpers with styles
    const renderBatsmen = (batsmen) => {
        if (!batsmen || !batsmen.length)
            return <div className={scoreboardStyles.noBatsmen}>No batsmen data</div>;
        return (
            <ul className={scoreboardStyles.batsmenList}>
                {batsmen.map((b, i) => (
                    <li key={`${b.name}-${i}`} className={scoreboardStyles.batsmanItem}>
                        <div className={scoreboardStyles.batsmanInfo}>
                            <div className={scoreboardStyles.batsmanName}>{b.name}</div>
                            {b.outDesc && (
                                <div className={scoreboardStyles.batsmanOutDesc}>
                                    {b.outDesc}
                                </div>
                            )}
                        </div>
                        <div className={scoreboardStyles.batsmanStats}>
                            <div>
                                {safe(b.runs, "-")} ({safe(b.balls, "-")})
                            </div>
                            <div className={scoreboardStyles.batsmanExtras}>
                                4s {safe(b.four, 0)} • 6s {safe(b.six, 0)}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        );
    }; // helps in rendering in batsman details

    const renderBowlers = (bowlers) => {
        if (!bowlers || !bowlers.length)
            return <div className={scoreboardStyles.noBowlers}>No bowlers data</div>;
        return (
            <ul className={scoreboardStyles.bowlersList}>
                {bowlers.map((bw, i) => (
                    <li key={`${bw.name}-${i}`} className={scoreboardStyles.bowlerItem}>
                        <div className={scoreboardStyles.bowlerName}>{bw.name}</div>
                        <div className={scoreboardStyles.bowlerStats}>
                            {safe(bw.overs, "-")} ov • {safe(bw.wickets, 0)} wkts • Econ{" "}
                            {safe(bw.econ, "-")}
                        </div>
                    </li>
                ))}
            </ul>
        );
    };

    // --- RENDER ---
    return (
        <div className={scoreboardStyles.container}>
            <div className={scoreboardStyles.innerContainer}>
                <div className={scoreboardStyles.header}>
                    <div>
                        <div className={scoreboardStyles.title}>Scoreboard</div>
                        <div className={scoreboardStyles.matchId}>Match: {matchId}</div>
                    </div>

                    <div className={scoreboardStyles.updateStatus}>
                        {loading ? "Loading…" : "Updated a few seconds ago"}
                    </div>
                </div>

                <div className={scoreboardStyles.content}>
                    {loading && (
                        <div className={scoreboardStyles.loading}>Loading scoreboard…</div>
                    )}
                    {error && (
                        <div className={scoreboardStyles.error}>Error: {error}</div>
                    )}

                    {/* parsed display */}
                    {!loading && !error && parsed && (
                        <>
                            {/* header: teams, flags, title/status */}
                            <div className={scoreboardStyles.teamsHeader}>
                                <div className={scoreboardStyles.teamsContainer}>
                                    <div className={scoreboardStyles.teamWrapper}>
                                        <div className={scoreboardStyles.teamFlagContainer}>
                                            <FlagSmall
                                                teamName={parsed.teams?.a || parsed.header?.teamA || ""}
                                            />
                                        </div>
                                        <div className={scoreboardStyles.teamInfo}>
                                            <div className={scoreboardStyles.teamName}>
                                                {parsed.teams?.a || parsed.header?.teamA || "Team A"}
                                            </div>
                                            <div className={scoreboardStyles.teamMeta}>
                                                {parsed.header?.seriesName ||
                                                    parsed.header?.matchDescription ||
                                                    ""}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={scoreboardStyles.vs}>vs</div>

                                    <div
                                        className={`${scoreboardStyles.teamWrapper} justify-end`}
                                    >
                                        <div className={scoreboardStyles.teamInfo}>
                                            <div className={scoreboardStyles.teamName}>
                                                {parsed.teams?.b || parsed.header?.teamB || "Team B"}
                                            </div>
                                            <div className={scoreboardStyles.teamMeta}>
                                                {parsed.header?.status || ""}
                                            </div>
                                        </div>
                                        <FlagSmall
                                            teamName={parsed.teams?.b || parsed.header?.teamB || ""}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* innings */}
                            <div className={scoreboardStyles.inningsContainer}>
                                {parsed.innings && parsed.innings.length ? (
                                    parsed.innings.map((inn, idx) => {
                                        const isOpen = Boolean(openInnings[idx]);
                                        return (
                                            <div key={idx} className={scoreboardStyles.inningsItem}>
                                                <div
                                                    className={scoreboardStyles.inningsHeader}
                                                    onClick={() => toggleInnings(idx)}
                                                >
                                                    <div>
                                                        <div className={scoreboardStyles.inningsTitle}>
                                                            {inn.title}
                                                        </div>
                                                        <div className={scoreboardStyles.inningsSummary}>
                                                            {inn.summary || ""}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={scoreboardStyles.inningsScore}>
                                                            {inn.score || ""}
                                                        </div>
                                                        <div className={scoreboardStyles.inningsOvers}>
                                                            {inn.overs ? `${inn.overs} ov` : ""}
                                                        </div>
                                                    </div>
                                                </div>

                                                {isOpen ? (
                                                    <div className={scoreboardStyles.expandedInnings}>
                                                        <div>
                                                            <div className={scoreboardStyles.sectionTitle}>
                                                                Batsmen
                                                            </div>
                                                            {renderBatsmen(inn.batsmen)}
                                                        </div>

                                                        <div>
                                                            <div className={scoreboardStyles.sectionTitle}>
                                                                Bowlers
                                                            </div>
                                                            {renderBowlers(inn.bowlers)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 bg-white text-sm text-slate-600">
                                                        Click to expand for full innings details
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className={scoreboardStyles.noData}>
                                        No innings found in parsed scorecard.
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* fallback: found payload but not parsed */}
                    {!loading && !error && !parsed && payload && (
                        <div>
                            <div className={scoreboardStyles.rawPayload}>
                                Raw hscard payload (unexpected shape)
                            </div>
                            <pre className={scoreboardStyles.rawPre}>
                                {JSON.stringify(payload, null, 2)}
                            </pre>
                            <div className="mt-3">
                                <button
                                    onClick={() => setShowRaw((s) => !s)}
                                    className={scoreboardStyles.rawToggle}
                                >
                                    {showRaw ? "Hide raw wrapper" : "Show raw wrapper"}
                                </button>
                            </div>
                            {showRaw && (
                                <pre className={scoreboardStyles.rawWrapper}>
                                    {JSON.stringify(payload, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                    {/* toggle btn to hide and show wrapper */}

                    {!loading && !error && !payload && (
                        <div className={scoreboardStyles.loading}>
                            No data available for this match
                        </div>
                    )}
                </div>

                <div className={scoreboardStyles.footer}>
                    <div>Full scorecard</div>
                    <div className={scoreboardStyles.footerDetails}>Share</div>
                </div>
            </div>
        </div>
    );
}