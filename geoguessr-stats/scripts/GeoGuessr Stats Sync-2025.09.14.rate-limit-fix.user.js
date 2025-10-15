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
            text: 'Choose a sync method.',
            icon: 'info',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Start Sync (New)',
            denyButtonText: 'Sync Recent Days',
            cancelButtonText: 'Force Full Resync',
            allowOutsideClick: false
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
                console.log(`Server's last sync date is ${lastSyncDate.toLocaleString()}. Fetching duels newer than this.`);
                Swal.update({ text: `Last sync: ${lastSyncDate.toLocaleString()}. Looking for newer games...` });
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
            let totalAdded = 0;
            const BATCH_SIZE_PAGES = 40;
            const allNewDuelIds = new Set();

            while (keepFetching) {
                const batchDuelIds = new Set();

                for (let i = 0; i < BATCH_SIZE_PAGES; i++) {
                    if (!keepFetching) break;

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

                    const firstEntry = feed.entries[0];
                    let dateString = 'an older date';
                    if (firstEntry && firstEntry.created) {
                        const d = new Date(firstEntry.created);
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
                                break;
                            }
                        }
                        try {
                            const payloadData = JSON.parse(entry.payload);
                            if (Array.isArray(payloadData)) {
                                for (const sub of payloadData) if (sub.payload?.gameMode === "Duels") allNewDuelIds.add(sub.payload.gameId);
                            } else if (payloadData?.gameMode === "Duels") allNewDuelIds.add(payloadData.gameId);
                        } catch (e) { /* Ignore */ }
                    }
                    page++;
                    await sleep(100);
                }
            }

            if (allNewDuelIds.size > 0) {
                const uniqueIds = [...allNewDuelIds];
                Swal.update({ text: `Found ${uniqueIds.length} new duel(s). Fetching details...` });

                const allDuelData = [];
                for (let i = 0; i < uniqueIds.length; i += DUEL_FETCH_BATCH_SIZE) {
                    const batchIds = uniqueIds.slice(i, i + DUEL_FETCH_BATCH_SIZE);
                    Swal.update({ text: `Fetching duel details ${i + 1}-${Math.min(i + DUEL_FETCH_BATCH_SIZE, uniqueIds.length)} of ${uniqueIds.length}...` });

                    const duelDataPromises = batchIds.map(id =>
                        fetch(`https://game-server.geoguessr.com/api/duels/${id}`, { credentials: 'include' })
                        .then(res => res.ok ? res.json() : null)
                    );
                    const batchDuelData = (await Promise.all(duelDataPromises)).filter(Boolean);
                    allDuelData.push(...batchDuelData);

                    if (i + DUEL_FETCH_BATCH_SIZE < uniqueIds.length) {
                        await sleep(DUEL_FETCH_DELAY_MS);
                    }
                }

                if (allDuelData.length > 0) {
                    Swal.update({ text: `Sending batch of ${allDuelData.length} duel(s) to server...` });
                    const res = await sendBatchToServer(allDuelData);
                    totalAdded += res.addedCount || 0;

                    if (res.roundsToProcess && res.roundsToProcess.length > 0) {
                        await processRounds(res.roundsToProcess);
                    }
                }
            }

            Swal.fire('Sync Complete!', `Finished syncing. Added ${totalAdded} new duel(s) and processed all new rounds.`, 'success');
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
