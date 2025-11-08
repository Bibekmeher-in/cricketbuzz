import React, { useState } from 'react';
import { scoreCardStyles } from '../assets/dummyStyles';

export default function ScoreCard({ innings = [], collapsed = false, className = '' }) {
    const [openIndex, setOpenIndex] = useState(collapsed ? -1 : 0);

    if (!Array.isArray(innings)) {
        return (
            <div className={`${scoreCardStyles.noDataContainer} ${className}`}>
                <div className="text-sm text-slate-600">No innings data provided</div>
            </div>
        );
    }

    if (innings.length === 0) {
        // Provide a subtle skeleton / empty UI
        return (
            <div className={`${scoreCardStyles.emptyStateContainer} ${className}`}>
                <div className="text-sm text-slate-600">No scorecard available yet</div>
            </div>
        );
    }

    return (
        <div className={`${scoreCardStyles.container} ${className}`}>
            {innings.map((inn, idx) => {
                const isOpen = openIndex === idx;
                return (
                    <div key={idx} className={scoreCardStyles.inningsContainer}>
                        {/* header (glass) */}
                        <div className={scoreCardStyles.header}>
                            <div>
                                <div className={scoreCardStyles.headerTitle}>
                                    {inn.title || inn.id || `Innings ${idx + 1}`}
                                </div>
                                <div className={scoreCardStyles.headerScore}>{inn.score || ''}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                                    className={scoreCardStyles.expandButton}
                                >
                                    {isOpen ? 'Collapse' : 'Expand'}
                                </button>
                            </div>
                        </div>

                        {/* body */}
                        {isOpen ? (
                            <div className={scoreCardStyles.body}>
                                {/* batsmen table */}
                                <div>
                                    <div className={scoreCardStyles.battingSection}>Batting</div>
                                    {Array.isArray(inn.batsmen) && inn.batsmen.length > 0 ? (
                                        <div className={scoreCardStyles.battingTableContainer}>
                                            <table className={scoreCardStyles.battingTable}>
                                                <thead>
                                                    <tr className={scoreCardStyles.tableHeader}>
                                                        <th className={scoreCardStyles.tableHeaderCell}>Batsman</th>
                                                        <th className={scoreCardStyles.tableHeaderCell}>R</th>
                                                        <th className={scoreCardStyles.tableHeaderCell}>B</th>
                                                        <th className={scoreCardStyles.tableHeaderCell}>4s</th>
                                                        <th className={scoreCardStyles.tableHeaderCell}>6s</th>
                                                        <th className={scoreCardStyles.tableHeaderCell}>SR</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {inn.batsmen.map((b, i) => (
                                                        <tr key={i} className={scoreCardStyles.tableRow}>
                                                            <td className={scoreCardStyles.tableCell}>
                                                                <div className={scoreCardStyles.batsmanName}>{b.name}</div>
                                                                {b.desc && <div className={scoreCardStyles.batsmanDesc}>{b.desc}</div>}
                                                            </td>
                                                            <td className={scoreCardStyles.tableCell}>{b.runs ?? '-'}</td>
                                                            <td className={scoreCardStyles.tableCell}>{b.balls ?? '-'}</td>
                                                            <td className={scoreCardStyles.tableCell}>{b.four ?? '-'}</td>
                                                            <td className={scoreCardStyles.tableCell}>{b.six ?? '-'}</td>
                                                            <td className={scoreCardStyles.tableCell}>{b.strikeRate ?? '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className={scoreCardStyles.noBatsmenText}>No batsmen data</div>
                                    )}
                                </div>

                                {/* bowlers */}
                                <div>
                                    <div className={scoreCardStyles.bowlingSection}>Bowling</div>
                                    {Array.isArray(inn.bowlers) && inn.bowlers.length > 0 ? (
                                        <div className={scoreCardStyles.bowlersGrid}>
                                            {inn.bowlers.map((bw, i) => (
                                                <div key={i} className={scoreCardStyles.bowlerCard}>
                                                    <div className={scoreCardStyles.bowlerHeader}>
                                                        <div>
                                                            <div className={scoreCardStyles.bowlerName}>{bw.name}</div>
                                                            <div className={scoreCardStyles.bowlerRole}>{bw.role ?? ''}</div>
                                                        </div>
                                                        <div className={scoreCardStyles.bowlerStats}>
                                                            {bw.wickets ?? 0}/{bw.runs ?? 0}
                                                        </div>
                                                    </div>
                                                    <div className={scoreCardStyles.bowlerDetails}>
                                                        Overs: {bw.overs ?? '-'}, Econ: {bw.econ ?? '-'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={scoreCardStyles.noBowlersText}>No bowlers data</div>
                                    )}
                                </div>

                                {/* extras / summary */}
                                {inn.summary && (
                                    <div className={scoreCardStyles.summarySection}>
                                        <div className={scoreCardStyles.summaryTitle}>Summary</div>
                                        <div>{inn.summary}</div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // collapsed preview
                            <div className={scoreCardStyles.collapsedPreview}>
                                Click expand to see full scorecard
                            </div>
                        )}

                        {/* footer (glass) */}
                        <div className={scoreCardStyles.footer}>
                            <div>{inn.overs ? `Overs: ${inn.overs}` : '—'}</div>
                            <div className={scoreCardStyles.oversText}>
                                {inn.runRate ? `RR: ${inn.runRate}` : ''}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}