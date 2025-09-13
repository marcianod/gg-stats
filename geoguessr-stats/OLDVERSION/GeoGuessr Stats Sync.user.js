// ==UserScript==
// @name         GeoGuessr Stats Sync
// @namespace    http://tampermonkey.net/
// @version      2025.08.18.UI-Feedback-Fix
// @description  Adds a button to your GeoGuessr profile to sync duel stats to your web app.
// @author       You
// @match        https://www.geoguessr.com/user/*
// @match        https://www.geoguessr.com/me/profile
// @connect      localhost
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    function getWebAppUrl() {
        const port = GM_getValue('syncPort', '3000'); // Default to 3000 if not set
        return `http://localhost:${port}/api/sync`;
    }

    GM_registerMenuCommand('Set Sync Port', () => {
        const currentPort = GM_getValue('syncPort', '3000');
        const newPort = prompt('Enter the port your local dev server is running on:', currentPort);
        if (newPort && /^\d+$/.test(newPort)) {
            GM_setValue('syncPort', newPort);
            alert(`Sync port updated to ${newPort}.`);
        } else if (newPort) {
            alert('Invalid port. Please enter numbers only.');
        }
    });

    const webAppUrl = getWebAppUrl(); // This will be called once on script load
    const MAX_PAGES_TO_FETCH = 200; // Stops a full resync after this many pages

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
            text: `Click "Start Sync" to find new duels. "Force Full Resync" will fetch up to ${MAX_PAGES_TO_FETCH} pages of your history.`,
            icon: 'info',
            showDenyButton: true,
            confirmButtonText: 'Start Sync',
            denyButtonText: 'Force Full Resync',
            allowOutsideClick: false
        });

        if (result.isConfirmed) {
            performSync(false); // Standard sync
        } else if (result.isDenied) {
            const confirmResult = await Swal.fire({
                title: 'Are you sure?',
                text: 'This will fetch a large amount of history and may take a while.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, do a full resync!',
                cancelButtonText: 'Cancel'
            });
            if (confirmResult.isConfirmed) {
                performSync(true); // Forced full resync
            }
        }
    }

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function getSyncInfoFromServer() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: getWebAppUrl(), // Use function to get latest URL
                headers: { "Accept": "application/json" },
                onload: (response) => {
                    try {
                        const data = JSON.parse(response.responseText);
                        resolve(data);
                    } catch (e) {
                        reject(new Error('Failed to parse sync info from server.'));
                    }
                },
                onerror: (error) => reject(new Error('Network error fetching sync info. Is your local server running?'))
            });
        });
    }

    async function performSync(forceResync = false) {
        Swal.fire({ title: 'Syncing...', text: 'Checking server for last sync date...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            let lastSyncTimestamp = 0;
            if (!forceResync) {
                const syncInfo = await getSyncInfoFromServer();
                lastSyncTimestamp = syncInfo.lastSyncTimestamp || 0;
                const lastSyncDate = new Date(lastSyncTimestamp);
                console.log(`Server's last sync date is ${lastSyncDate.toLocaleString()}. Fetching duels newer than this.`);
            } else {
                console.log('Force Full Resync initiated. Fetching all available history.');
            }

            let page = 0;
            let keepFetching = true;
            let totalAdded = 0;
            const BATCH_SIZE_PAGES = 40;

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

                    // FIXED: More robustly handle cases where the 'created' date might be invalid.
                    const firstEntry = feed.entries[0];
                    let dateString = 'an older date';
                    if (firstEntry && firstEntry.created) {
                        const d = new Date(firstEntry.created);
                        if (!isNaN(d)) { // Check if the date is valid before trying to format it
                            dateString = d.toLocaleDateString();
                        }
                    }
                    Swal.update({ text: `Scanning Page ${page} (Games from ~${dateString})...` });

                    for (const entry of feed.entries) {
                        if (new Date(entry.created).getTime() <= lastSyncTimestamp) {
                            console.log(`Found a game older than the last sync. Stopping search at page ${page}.`);
                            keepFetching = false;
                            break;
                        }
                        try {
                            const payloadData = JSON.parse(entry.payload);
                            if (Array.isArray(payloadData)) {
                                for (const sub of payloadData) if (sub.payload?.gameMode === "Duels") batchDuelIds.add(sub.payload.gameId);
                            } else if (payloadData?.gameMode === "Duels") batchDuelIds.add(payloadData.gameId);
                        } catch (e) { /* Ignore */ }
                    }
                    page++;
                    await sleep(100);
                }

                if (batchDuelIds.size > 0) {
                    const uniqueIds = [...batchDuelIds];
                    Swal.update({ text: `Found ${uniqueIds.length} duel(s). Fetching details...` });

                    const duelDataPromises = uniqueIds.map(id =>
                        fetch(`https://game-server.geoguessr.com/api/duels/${id}`, { credentials: 'include' })
                        .then(res => res.ok ? res.json() : null)
                    );
                    const batchDuelData = (await Promise.all(duelDataPromises)).filter(Boolean);

                    if (batchDuelData.length > 0) {
                        Swal.update({ text: `Sending batch of ${batchDuelData.length} duel(s)...` });
                        const res = await sendBatchToServer(batchDuelData);
                        totalAdded += res.addedCount || 0;
                    }
                }
            }
            Swal.fire('Sync Complete!', `Finished syncing. Added ${totalAdded} new duel(s).`, 'success');
        } catch (error) {
            Swal.fire('An Error Occurred', error.message, 'error');
        }
    }

    function sendBatchToServer(data) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: getWebAppUrl(), // Use function to get latest URL
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
                onerror: (error) => reject(new Error('Could not connect to the local sync server. Is it running?'))
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
