// ==UserScript==
// @name         GeoGuessr Stats Sync
// @namespace    http://tampermonkey.net/
// @version      2025.09.14.rate-limit-fix
// @description  Adds a button to your GeoGuessr profile to sync duel stats to your web app.
// @author       You
// @match        https://www.geoguessr.com/user/*
// @match        https://www.geoguessr.com/me/profile
// @connect      gg-stats.vercel.app
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const baseUrl = 'https://gg-stats.vercel.app';
    const syncApiUrl = `${baseUrl}/api/sync`;
    const processRoundApiUrl = `${baseUrl}/api/process-round`;
    const lastSyncApiUrl = `${baseUrl}/api/last-sync`;
    const MAX_PAGES_TO_FETCH = 200; // Stops a full resync after this many pages
    const DUEL_FETCH_BATCH_SIZE = 10;
    const DUEL_FETCH_DELAY_MS = 1000;

    function addSyncButton() {
        const actionsContainer = document.querySelector('[class^="profile-header_actions__"]');
        if (!actionsContainer || document.getElementById('stats-sync-button')) return;

        // Inject custom styles for the modal
        const style = document.createElement('style');
        style.innerHTML = `
            .swal2-deny.swal2-styled.swal2-styled {
                background-color: #4a5568 !important; /* A neutral gray */
            }
            .swal2-cancel.swal2-styled.swal2-styled {
                 background-color: #c53030 !important; /* A cautionary red */
            }
        `;
        document.head.appendChild(style);

        const syncButton = document.createElement('button');
        syncButton.id = 'stats-sync-button';
        syncButton.className = 'button_button__CnARx button_variant-primary__f_x5x';
        syncButton.innerHTML = '<span>Sync Duel Stats</span>';
        syncButton.style.marginLeft = '1rem';
        syncButton.onclick = syncAllDuelStats;
        actionsContainer.appendChild(syncButton);
    }

    async function syncAllDuelStats() {
        if (typeof Swal === 'undefined') {
            return alert('Sync library is not ready. Please try again.');
        }

        const result = await Swal.fire({
            title: 'Sync Duel Stats',
            html: `
                <p>Choose a sync method.</p><br>
                <ul style="text-align: left; margin: 0 auto; max-width: 280px; font-size: 0.9em;">
                    <li><b>Sync:</b> Fetches new games since your last sync.</li>
                    <li><b>Sync Recent:</b> Fetches games from the last X days.</li>
                    <li><b>Full Resync:</b> Fetches your entire game history.</li>
                </ul>
            `,
            icon: 'info',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Sync',
            denyButtonText: 'Sync Recent',
            cancelButtonText: 'Full Resync',
            allowOutsideClick: false,
        });

        if (result.isConfirmed) {
            performSync({ mode: 'standard' });
        } else if (result.isDenied) {
            const { value: days } = await Swal.fire({
                title: 'Sync Recent Days',
                input: 'number',
                inputLabel: 'How many days of history do you want to sync?',
                inputValue: 1,
                inputAttributes: {
                    min: '1',
                    step: '1'
                },
                showCancelButton: true,
                confirmButtonText: 'Start Sync'
            });

            if (days) {
                performSync({ mode: 'dateRange', days: parseInt(days) });
            }
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            const confirmResult = await Swal.fire({
                title: 'Are you sure?',
                text: `This will fetch up to ${MAX_PAGES_TO_FETCH} pages of your history and may take a while.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, do a full resync!',
                cancelButtonText: 'Cancel'
            });
            if (confirmResult.isConfirmed) {
                performSync({ mode: 'full' });
            }
        }
    }

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function formatTimeAgo(timestamp) {
        const now = Date.now();
        const seconds = Math.floor((now - timestamp) / 1000);
        if (seconds < 60) return `${seconds} seconds ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minutes ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hours ago`;
        const days = Math.floor(hours / 24);
        return `${days} days ago`;
    }

    function getLastSyncTimestampFromServer() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: lastSyncApiUrl,
                headers: { "Accept": "application/json" },
                onload: (response) => {
                    try {
                        const data = JSON.parse(response.responseText);
                        resolve(data.lastSync || 0);
                    } catch (e) {
                        reject(new Error('Failed to parse sync info from server.'));
                    }
                },
                onerror: (error) => reject(new Error('Network error fetching sync info. Is the server running?'))
            });
        });
    }

    async function performSync(options) {
        Swal.fire({ title: 'Syncing...', text: 'Initializing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            let syncThreshold = 0; // Will be a timestamp
            const now = Date.now();

            if (options.mode === 'standard') {
                Swal.update({ text: 'Checking server for last sync date...' });
                syncThreshold = await getLastSyncTimestampFromServer();
                const lastSyncDate = new Date(syncThreshold);
                const timeAgo = formatTimeAgo(syncThreshold);
                console.log(`Server's last sync date is ${lastSyncDate.toLocaleString()}. Fetching duels newer than this.`);
                Swal.update({ text: `Last sync: ${lastSyncDate.toLocaleString()} (${timeAgo}). Looking for newer games...` });
            } else if (options.mode === 'dateRange') {
                const daysInMs = options.days * 24 * 60 * 60 * 1000;
                syncThreshold = now - daysInMs;
                const syncFromDate = new Date(syncThreshold);
                console.log(`Date Range sync initiated. Fetching duels from the last ${options.days} day(s), since ${syncFromDate.toLocaleString()}.`);
                Swal.update({ text: `Fetching duels from the last ${options.days} day(s)...` });
            } else { // full resync
                console.log('Force Full Resync initiated. Fetching all available history.');
                Swal.update({ text: 'Force Full Resync initiated. Fetching all available history.' });
            }

            let page = 0;
            let keepFetching = true;
            const BATCH_SIZE_PAGES = 40;
            const allNewDuelGameData = new Map();
            const statsByDay = {}; // To store stats
            let totalAdded = 0;
            let totalRoundsInBatch = 0;
            let roundsToProcessCount = 0;

            page_loop:
            while (keepFetching) {
                if (page >= MAX_PAGES_TO_FETCH) {
                    console.log(`Reached max page limit of ${MAX_PAGES_TO_FETCH}.`);
                    keepFetching = false;
                    break;
                }

                const response = await fetch(`https://www.geoguessr.com/api/v4/feed/private?count=25&page=${page}`, { credentials: 'include' });
                    if (!response.ok) throw new Error(`Failed to fetch activity feed (page ${page}).`);

                    const feed = await response.json();
                    if (feed.entries.length === 0) {
                        console.log(`Found an empty page (${page}). Stopping search.`);
                        keepFetching = false;
                        break;
                    }

                    const lastEntry = feed.entries[feed.entries.length - 1];
                    let dateString = 'an older date';
                    if (lastEntry && lastEntry.created) {
                        const d = new Date(lastEntry.created);
                        if (!isNaN(d)) {
                            dateString = d.toLocaleDateString();
                        }
                    }
                    Swal.update({ text: `Scanning Page ${page} (Games from ~${dateString})...` });

                    for (const entry of feed.entries) {
                        if (new Date(entry.created).getTime() <= syncThreshold) {
                            if (options.mode !== 'full') { // Don't stop for full resync
                                console.log(`Found a game older than the sync threshold. Stopping search at page ${page}.`);
                                keepFetching = false;
                                break page_loop; // Exit the outer while loop completely
                            }
                        }
                        try {
                            const payloadData = JSON.parse(entry.payload);
                            if (Array.isArray(payloadData)) {
                                for (const sub of payloadData) {
                                    if (sub.payload?.gameMode === "Duels" && !allNewDuelGameData.has(sub.payload.gameId)) {
                                        allNewDuelGameData.set(sub.payload.gameId, { created: entry.created });
                                    }
                                }
                            } else if (payloadData?.gameMode === "Duels" && !allNewDuelGameData.has(payloadData.gameId)) {
                                allNewDuelGameData.set(payloadData.gameId, { created: entry.created });
                            }
                        } catch (e) { /* Ignore */ }
                    }
                    page++;
                    await sleep(100);
                
            }

            if (allNewDuelGameData.size > 0) {
                const uniqueGameData = Array.from(allNewDuelGameData.entries());
                Swal.update({ text: `Found ${uniqueGameData.length} new duel(s). Fetching details...` });

                const allDuelData = [];
                for (let i = 0; i < uniqueGameData.length; i += DUEL_FETCH_BATCH_SIZE) {
                    const batchGameData = uniqueGameData.slice(i, i + DUEL_FETCH_BATCH_SIZE);
                    Swal.update({ text: `Fetching duel details ${i + 1}-${Math.min(i + DUEL_FETCH_BATCH_SIZE, uniqueGameData.length)} of ${uniqueGameData.length}...` });

                    const duelDataPromises = batchGameData.map(([id, data]) =>
                        fetch(`https://game-server.geoguessr.com/api/duels/${id}`, { credentials: 'include' })
                        .then(res => res.ok ? res.json() : null)
                        .then(duel => {
                            if (duel) {
                                duel.created = data.created; // Add the created timestamp
                            }
                            return duel;
                        })
                    );
                    const batchDuelData = (await Promise.all(duelDataPromises)).filter(Boolean);
                    allDuelData.push(...batchDuelData);

                    if (i + DUEL_FETCH_BATCH_SIZE < uniqueGameData.length) {
                        await sleep(DUEL_FETCH_DELAY_MS);
                    }
                }

                if (allDuelData.length > 0) {
                    Swal.update({ text: `Sending batch of ${allDuelData.length} duel(s) to server...` });
                    const res = await sendBatchToServer(allDuelData);
                    totalAdded = res.addedCount || 0;
                    roundsToProcessCount = res.roundsToProcess?.length || 0;

                    // Calculate stats from the duels that were actually added
                    const addedDuelIds = new Set((res.roundsToProcess || []).map(r => r.split('_')[0]));

                    allDuelData.forEach(duel => {
                        const date = new Date(duel.created);
                        if (isNaN(date.getTime())) return; // Skip if the date is invalid

                        const dateKey = date.toISOString().split('T')[0]; // Use YYYY-MM-DD for reliable key
                        if (!statsByDay[dateKey]) {
                            statsByDay[dateKey] = { duels: 0, locations: 0 };
                        }
                        statsByDay[dateKey].duels++;
                        if(addedDuelIds.has(duel.gameId)) {
                           statsByDay[dateKey].locations += duel.rounds?.length || 0;
                        }
                        totalRoundsInBatch += duel.rounds?.length || 0;
                    });


                    if (res.roundsToProcess && res.roundsToProcess.length > 0) {
                        await processRounds(res.roundsToProcess);
                    }
                }
            }

            const skippedLocations = totalRoundsInBatch - roundsToProcessCount;
            const foundDuelsCount = allNewDuelGameData.size;
            const skippedDuelsCount = foundDuelsCount - totalAdded;

            let summaryHtml = `
                <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
                    <b>Total Duels Found:</b> ${foundDuelsCount}<br>
                    <b>New Duels Added:</b> ${totalAdded}<br>
                    <b>Duels Skipped:</b> ${skippedDuelsCount}
                </div>
            `;

            const summaryEntries = Object.entries(statsByDay);
            if (summaryEntries.length > 0) {
                summaryHtml += '<div style="text-align: left; max-height: 150px; overflow-y: auto; padding: .5em; background-color: #f7fafc; border-radius: 5px;">';
                // Sort by date descending
                summaryEntries.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

                for (const [date, stats] of summaryEntries) {
                     const displayDate = new Date(date).toLocaleDateString();
                     summaryHtml += `<b>${displayDate}:</b> Found ${stats.duels} duels (${stats.locations} new locations)<br>`;
                }
                summaryHtml += '</div>';
            }

            if (skippedLocations > 0) {
                 summaryHtml += `<p style="margin-top: 1em; color: #718096;">Skipped ${skippedLocations} locations (already processed).</p>`;
            }

            Swal.fire({
                title: 'Sync Complete!',
                html: summaryHtml,
                icon: 'success'
            });
        } catch (error) {
            Swal.fire('An Error Occurred', error.message, 'error');
        }
    }

    function sendBatchToServer(data) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: syncApiUrl,
                data: JSON.stringify(data),
                headers: { "Content-Type": "application/json" },
                onload: (response) => {
                    try {
                        const res = JSON.parse(response.responseText);
                        if (res.status === 'success') resolve(res);
                        else reject(new Error(res.message || 'Server returned an error.'));
                    } catch (e) {
                        reject(new Error('Received an invalid response from the server.'));
                    }
                },
                onerror: (error) => reject(new Error('Could not connect to the sync server.'))
            });
        });
    }

    async function processRounds(roundIds) {
        for (let i = 0; i < roundIds.length; i++) {
            const roundId = roundIds[i];
            Swal.update({ text: `Generating embedding for round ${i + 1} of ${roundIds.length}...` });
            try {
                await processRound(roundId);
                console.log(`Successfully processed round ${roundId}`);
            } catch (error) {
                console.error(`Failed to process round ${roundId}:`, error.message);
                // Continue to the next round even if one fails
            }
            await sleep(50); // Small delay to prevent overwhelming the server and to allow UI to update
        }
    }

    function processRound(roundId) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: processRoundApiUrl,
                data: JSON.stringify({ roundId }),
                headers: { "Content-Type": "application/json" },
                onload: (response) => {
                    try {
                        const res = JSON.parse(response.responseText);
                        if (res.status === 'success') {
                            resolve(res);
                        } else {
                            reject(new Error(res.message || `Server returned an error for round ${roundId}.`));
                        }
                    } catch (e) {
                        reject(new Error(`Received an invalid response from the server for round ${roundId}.`));
                    }
                },
                onerror: (error) => reject(new Error(`Could not connect to the server to process round ${roundId}.`))
            });
        });
    }

    const observer = new MutationObserver(() => {
        if (document.querySelector('[class^="profile-header_actions__"]')) {
            addSyncButton();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
