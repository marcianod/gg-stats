// ==UserScript==
// @name         GeoGuessr Stats Sync
// @namespace    http://tampermonkey.net/
// @version      2025.09.15.final-fix
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
    const MAX_PAGES_TO_FETCH = 200;
    const DUEL_FETCH_BATCH_SIZE = 25; // Match the feed size
    const DUEL_FETCH_DELAY_MS = 1000;

    function addSyncButton() {
        const actionsContainer = document.querySelector('[class^="profile-header_actions__"]');
        if (!actionsContainer || document.getElementById('stats-sync-button')) return;

        const style = document.createElement('style');
        style.innerHTML = `
            .swal2-deny.swal2-styled.swal2-styled { background-color: #4a5568 !important; }
            .swal2-cancel.swal2-styled.swal2-styled { background-color: #c53030 !important; }
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
        if (typeof Swal === 'undefined') return alert('Sync library is not ready. Please try again.');

        const result = await Swal.fire({
            title: 'Sync Duel Stats',
            html: `<p>Choose a sync method.</p><br>
                   <ul style="text-align: left; margin: 0 auto; max-width: 280px; font-size: 0.9em;">
                       <li><b>Sync:</b> Fetches new games since your last sync.</li>
                       <li><b>Sync Recent:</b> Fetches games from the last X days.</li>
                       <li><b>Full Resync:</b> Fetches your entire game history.</li>
                   </ul>`,
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
                inputAttributes: { min: '1', step: '1' },
                showCancelButton: true,
                confirmButtonText: 'Start Sync'
            });
            if (days) performSync({ mode: 'dateRange', days: parseInt(days) });
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            const confirmResult = await Swal.fire({
                title: 'Are you sure?',
                text: `This will fetch up to ${MAX_PAGES_TO_FETCH} pages of your history and may take a while.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, do a full resync!',
                cancelButtonText: 'Cancel'
            });
            if (confirmResult.isConfirmed) performSync({ mode: 'full' });
        }
    }

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function formatTimeAgo(timestamp) {
        if (timestamp === 0) return 'Never';
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
                        resolve(JSON.parse(response.responseText).lastSync || 0);
                    } catch (e) {
                        reject(new Error('Failed to parse sync info from server.'));
                    }
                },
                onerror: () => reject(new Error('Network error fetching sync info.'))
            });
        });
    }

    async function performSync(options) {
        Swal.fire({ title: 'Syncing...', text: 'Initializing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            let syncThreshold = 0;
            if (options.mode === 'standard') {
                Swal.update({ text: 'Checking server for last sync date...' });
                syncThreshold = await getLastSyncTimestampFromServer();
                const lastSyncDate = new Date(syncThreshold);
                const timeAgo = formatTimeAgo(syncThreshold);
                Swal.update({ text: `Last sync: ${lastSyncDate.toLocaleString()} (${timeAgo}). Looking for newer games...` });
            } else if (options.mode === 'dateRange') {
                syncThreshold = Date.now() - (options.days * 24 * 60 * 60 * 1000);
                Swal.update({ text: `Fetching duels from the last ${options.days} day(s)...` });
            } else { // full resync
                Swal.update({ text: 'Force Full Resync initiated. Fetching all available history.' });
            }

            let page = 0;
            let keepFetching = true;
            const allDuelsToSend = [];

            while (keepFetching && page < MAX_PAGES_TO_FETCH) {
                const feedResponse = await fetch(`https://www.geoguessr.com/api/v4/feed/private?count=${DUEL_FETCH_BATCH_SIZE}&page=${page}`, { credentials: 'include' });
                if (!feedResponse.ok) throw new Error(`Failed to fetch activity feed (page ${page}).`);

                const feed = await feedResponse.json();
                if (feed.entries.length === 0) {
                    console.log(`Found an empty page (${page}). Stopping search.`);
                    break;
                }

                const gameIds = feed.entries.flatMap(entry => {
                    try {
                        const payload = JSON.parse(entry.payload);
                        return Array.isArray(payload)
                            ? payload.filter(sub => sub.payload?.gameMode === "Duels").map(sub => sub.payload.gameId)
                            : (payload?.gameMode === "Duels" ? [payload.gameId] : []);
                    } catch {
                        return [];
                    }
                }).filter((id, index, self) => self.indexOf(id) === index); // Unique IDs

                if (gameIds.length === 0) {
                    page++;
                    continue;
                }

                Swal.update({ text: `Scanning Page ${page}: Found ${gameIds.length} duels. Fetching details...` });

                const duelDataPromises = gameIds.map(id =>
                    fetch(`https://game-server.geoguessr.com/api/duels/${id}`, { credentials: 'include' })
                    .then(res => res.ok ? res.json() : null)
                );
                const duelDetails = (await Promise.all(duelDataPromises)).filter(Boolean);

                if (duelDetails.length > 0) {
                    const lastDuelInBatch = duelDetails[duelDetails.length - 1];
                    const lastDuelTimestamp = new Date(lastDuelInBatch.teams[0]?.players[0]?.guesses[0]?.created).getTime();
                    if (!isNaN(lastDuelTimestamp)) {
                         Swal.update({ text: `Scanning Page ${page} (Games from ~${new Date(lastDuelTimestamp).toLocaleDateString()})...` });
                    }

                    for (const duel of duelDetails) {
                        const duelTimestamp = new Date(duel.teams[0]?.players[0]?.guesses[0]?.created).getTime();
                        if (isNaN(duelTimestamp)) continue;

                        if (duelTimestamp <= syncThreshold && options.mode !== 'full') {
                            keepFetching = false;
                            break;
                        }
                        // Attach the correct timestamp for the server
                        duel.created = new Date(duelTimestamp).toISOString();
                        allDuelsToSend.push(duel);
                    }
                }
                
                if (keepFetching) {
                    page++;
                    await sleep(DUEL_FETCH_DELAY_MS);
                }
            }

            let totalAdded = 0;
            let totalRounds = 0;
            let skippedLocations = 0;

            if (allDuelsToSend.length > 0) {
                Swal.update({ text: `Sending ${allDuelsToSend.length} duel(s) to server...` });
                const res = await sendBatchToServer(allDuelsToSend);
                totalAdded = res.addedCount || 0;
                totalRounds = res.roundsToProcess?.length || 0;
                
                const totalLocationsInBatch = allDuelsToSend.reduce((sum, duel) => sum + (duel.rounds?.length || 0), 0);
                skippedLocations = totalLocationsInBatch - totalRounds;

                if (res.roundsToProcess && res.roundsToProcess.length > 0) {
                    await processRounds(res.roundsToProcess);
                }
            }

            const foundDuelsCount = allDuelsToSend.length;
            const skippedDuelsCount = foundDuelsCount - totalAdded;

            let summaryHtml = `
                <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
                    <b>Total Duels Found:</b> ${foundDuelsCount}<br>
                    <b>New Duels Added:</b> ${totalAdded}<br>
                    <b>Duels Skipped:</b> ${skippedDuelsCount}<br>
                    <b>New Locations:</b> ${totalRounds}<br>
                    <b>Skipped Locations:</b> ${skippedLocations}
                </div>`;

            Swal.fire({ title: 'Sync Complete!', html: summaryHtml, icon: 'success' });

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
                        resolve(JSON.parse(response.responseText));
                    } catch (e) {
                        reject(new Error('Received an invalid response from the server.'));
                    }
                },
                onerror: () => reject(new Error('Could not connect to the sync server.'))
            });
        });
    }

    async function processRounds(roundIds) {
        for (let i = 0; i < roundIds.length; i++) {
            const roundId = roundIds[i];
            Swal.update({ text: `Generating embedding for round ${i + 1} of ${roundIds.length}...` });
            try {
                await processRound(roundId);
            } catch (error) {
                console.error(`Failed to process round ${roundId}:`, error.message);
            }
            await sleep(50);
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
                        if (res.status === 'success') resolve(res);
                        else reject(new Error(res.message || `Server error for round ${roundId}.`));
                    } catch (e) {
                        reject(new Error(`Invalid server response for round ${roundId}.`));
                    }
                },
                onerror: () => reject(new Error(`Could not connect to process round ${roundId}.`))
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
