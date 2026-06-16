// -------------------------------------------------------------
// BigQuery Release Notes Hub - Client Side Javascript
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let releaseData = [];
    let selectedUpdateIds = new Set();
    let currentFilter = 'all';
    let searchQuery = '';

    // Cache DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn.querySelector('.icon-spin-container');
    const syncText = document.getElementById('sync-text');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const typeFiltersContainer = document.getElementById('type-filters');
    const dateNavigator = document.getElementById('date-navigator');
    const timeline = document.getElementById('timeline');
    const timelineLoading = document.getElementById('timeline-loading');
    const timelineEmpty = document.getElementById('timeline-empty');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    
    // Theme and Actions Elements
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    
    // Selection Bar
    const selectionBar = document.getElementById('selection-bar');
    const selectionCount = document.getElementById('selection-count');
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    const tweetSelectedBtn = document.getElementById('tweet-selected-btn');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const tweetWarning = document.getElementById('tweet-warning');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');
    const toastContainer = document.getElementById('toast-container');

    // Fetch and display data
    async function loadReleases(forceRefresh = false) {
        setLoadingState(true);
        try {
            const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            releaseData = data.releases || [];
            
            // Handle last updated text
            if (data.last_fetched) {
                const date = new Date(data.last_fetched * 1000);
                syncText.textContent = `Synced: ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
            
            // Handle error banner
            if (data.error) {
                showErrorBanner(data.error);
            } else {
                errorBanner.style.display = 'none';
            }
            
            // Clear selected updates on refresh/load
            selectedUpdateIds.clear();
            updateSelectionBar();
            
            renderTimeline();
            showToast('Release notes loaded successfully!', 'success');
        } catch (error) {
            console.error('Fetch error:', error);
            showErrorBanner(`Error loading release notes: ${error.message}`);
            showToast('Failed to load release notes.', 'error');
            timelineLoading.style.display = 'none';
            if (releaseData.length === 0) {
                timelineEmpty.style.display = 'flex';
            }
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshIcon.classList.add('spinning');
            syncText.textContent = 'Syncing...';
            timelineLoading.style.display = 'flex';
            timeline.style.display = 'none';
            timelineEmpty.style.display = 'none';
        } else {
            refreshIcon.classList.remove('spinning');
            timelineLoading.style.display = 'none';
        }
    }

    function showErrorBanner(message) {
        errorMessage.textContent = message;
        errorBanner.style.display = 'flex';
    }

    // Filter and search logic
    function getFilteredData() {
        const query = searchQuery.toLowerCase().trim();
        
        return releaseData.map(entry => {
            // Filter the updates in this entry
            const filteredUpdates = entry.updates.filter(update => {
                const matchesType = (currentFilter === 'all' || update.type.toLowerCase() === currentFilter.toLowerCase());
                const matchesSearch = !query || 
                    update.type.toLowerCase().includes(query) || 
                    update.text.toLowerCase().includes(query) || 
                    entry.date.toLowerCase().includes(query);
                
                return matchesType && matchesSearch;
            });
            
            return {
                ...entry,
                updates: filteredUpdates
            };
        }).filter(entry => entry.updates.length > 0); // Only keep days with matching updates
    }

    // Rendering
    function renderTimeline() {
        const filteredData = getFilteredData();
        
        if (filteredData.length === 0) {
            timeline.style.display = 'none';
            timelineEmpty.style.display = 'flex';
            renderDateNavigator([]);
            return;
        }
        
        timelineEmpty.style.display = 'none';
        timeline.style.display = 'block';
        timeline.innerHTML = '';
        
        filteredData.forEach(entry => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'timeline-group';
            // Set ID for linking/navigation
            const groupId = `date-${entry.date.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            groupDiv.id = groupId;
            
            // Timeline dot
            const dot = document.createElement('div');
            dot.className = 'timeline-dot';
            groupDiv.appendChild(dot);
            
            // Date Header
            const header = document.createElement('div');
            header.className = 'timeline-date-header';
            header.innerHTML = `
                <span>${entry.date}</span>
                <a href="${entry.link}" target="_blank" class="timeline-date-link" title="Open official notes for this date">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
            `;
            groupDiv.appendChild(header);
            
            // Updates Container
            const updatesContainer = document.createElement('div');
            updatesContainer.className = 'timeline-updates';
            
            entry.updates.forEach(update => {
                const card = document.createElement('div');
                card.className = `update-card ${selectedUpdateIds.has(update.id) ? 'selected' : ''}`;
                card.setAttribute('data-id', update.id);
                card.setAttribute('data-type', update.type);
                
                // Set badge class
                let badgeClass = 'update';
                if (update.type.toLowerCase() === 'feature') badgeClass = 'feature';
                else if (update.type.toLowerCase() === 'issue') badgeClass = 'issue';
                else if (update.type.toLowerCase() === 'deprecation') badgeClass = 'deprecation';
                
                card.innerHTML = `
                    <div class="update-card-select">
                        <div class="custom-checkbox">
                            <i class="fa-solid fa-check"></i>
                        </div>
                    </div>
                    <div class="update-card-body">
                        <div class="update-card-header">
                            <span class="badge ${badgeClass}">${update.type}</span>
                        </div>
                        <div class="update-description">
                            ${update.html}
                        </div>
                        <div class="update-actions" style="gap: 0.5rem;">
                            <button class="btn btn-card-tweet copy-note-btn" data-id="${update.id}" title="Copy update to clipboard">
                                <i class="fa-regular fa-copy"></i> Copy
                            </button>
                            <button class="btn btn-card-tweet single-tweet-btn" data-id="${update.id}">
                                <i class="fa-brands fa-x-twitter"></i> Tweet
                            </button>
                        </div>
                    </div>
                `;
                
                // Card selection toggle on click (avoid trigger on links or buttons)
                card.addEventListener('click', (e) => {
                    if (e.target.tagName === 'A' || e.target.closest('a') || e.target.closest('.single-tweet-btn') || e.target.closest('.copy-note-btn')) {
                        return; // Let links and buttons act normally
                    }
                    toggleSelection(update.id);
                });
                
                // Wire up card copy button
                card.querySelector('.copy-note-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        await navigator.clipboard.writeText(update.text);
                        showToast('Update copied to clipboard!', 'success');
                    } catch (err) {
                        console.error('Failed to copy note:', err);
                        showToast('Failed to copy update.', 'error');
                    }
                });
                
                // Wire up single card tweet button
                card.querySelector('.single-tweet-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    openTweetComposer([update]);
                });
                
                updatesContainer.appendChild(card);
            });
            
            groupDiv.appendChild(updatesContainer);
            timeline.appendChild(groupDiv);
        });
        
        renderDateNavigator(filteredData);
    }

    function renderDateNavigator(filteredData) {
        dateNavigator.innerHTML = '';
        if (filteredData.length === 0) {
            dateNavigator.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0.75rem;">No dates available</div>';
            return;
        }
        
        filteredData.forEach(entry => {
            const dateId = `date-${entry.date.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            const navItem = document.createElement('a');
            navItem.className = 'date-nav-item';
            navItem.href = `#${dateId}`;
            navItem.textContent = entry.date;
            
            navItem.addEventListener('click', (e) => {
                e.preventDefault();
                // Smooth scroll to the timeline group
                const target = document.getElementById(dateId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Highlight active in nav
                    document.querySelectorAll('.date-nav-item').forEach(item => item.classList.remove('active'));
                    navItem.classList.add('active');
                }
            });
            
            dateNavigator.appendChild(navItem);
        });
    }

    // Toggle card selection state
    function toggleSelection(updateId) {
        if (selectedUpdateIds.has(updateId)) {
            selectedUpdateIds.delete(updateId);
            const card = document.querySelector(`.update-card[data-id="${updateId}"]`);
            if (card) card.classList.remove('selected');
        } else {
            selectedUpdateIds.add(updateId);
            const card = document.querySelector(`.update-card[data-id="${updateId}"]`);
            if (card) card.classList.add('selected');
        }
        updateSelectionBar();
    }

    function updateSelectionBar() {
        const count = selectedUpdateIds.size;
        selectionCount.textContent = count;
        
        if (count > 0) {
            selectionBar.classList.add('visible');
        } else {
            selectionBar.classList.remove('visible');
        }
    }

    // Compose Tweet Content
    function composeTweetText(updates) {
        // Base tags and links
        const hashtag = " #BigQuery #GoogleCloud";
        
        if (updates.length === 1) {
            const update = updates[0];
            // Find parent entry to get the link and date
            let date = "";
            let sourceLink = "";
            
            for (const entry of releaseData) {
                const found = entry.updates.find(u => u.id === update.id);
                if (found) {
                    date = entry.date;
                    sourceLink = entry.link;
                    break;
                }
            }
            
            // Format: "[BigQuery - Feature (June 15)] Description... Link #BigQuery #GoogleCloud"
            const dateShort = date.replace(', 2026', '').replace(', 2025', ''); // strip year to save characters
            const prefix = `[BigQuery Release - ${update.type} (${dateShort})] `;
            
            const remainingLen = 280 - prefix.length - sourceLink.length - hashtag.length - 5; // buffer
            let description = update.text;
            if (description.length > remainingLen) {
                description = description.substring(0, remainingLen) + '...';
            }
            
            return `${prefix}${description}\n\nDetails: ${sourceLink}${hashtag}`;
        } else {
            // Multi-tweet combined
            let text = `Google Cloud BigQuery Updates summary:\n\n`;
            
            updates.forEach((update, index) => {
                let date = "";
                for (const entry of releaseData) {
                    if (entry.updates.some(u => u.id === update.id)) {
                        date = entry.date.replace(', 2026', '').replace(', 2025', '');
                        break;
                    }
                }
                const bullet = `• (${date}) [${update.type}] ${update.text}`;
                text += bullet + '\n';
            });
            
            const generalLink = "https://cloud.google.com/bigquery/docs/release-notes";
            
            // Truncate bullet list if needed
            const baseSuffix = `\nFull updates: ${generalLink}${hashtag}`;
            const limit = 280 - baseSuffix.length;
            
            if (text.length > limit) {
                text = text.substring(0, limit - 4) + '...\n';
            }
            
            return text + baseSuffix;
        }
    }

    // Get selected update objects from list
    function getSelectedUpdates() {
        const selected = [];
        releaseData.forEach(entry => {
            entry.updates.forEach(update => {
                if (selectedUpdateIds.has(update.id)) {
                    selected.push(update);
                }
            });
        });
        return selected;
    }

    // Modal Handler
    function openTweetComposer(updates) {
        const text = composeTweetText(updates);
        tweetTextarea.value = text;
        updateCharCount();
        tweetModal.style.display = 'flex';
    }

    function updateCharCount() {
        const text = tweetTextarea.value;
        const length = text.length;
        charCount.textContent = length;
        
        if (length > 280) {
            charCount.classList.add('error');
            tweetWarning.style.display = 'flex';
            submitTweetBtn.disabled = true;
            submitTweetBtn.style.opacity = '0.5';
        } else {
            charCount.classList.remove('error');
            tweetWarning.style.display = 'none';
            submitTweetBtn.disabled = false;
            submitTweetBtn.style.opacity = '1';
        }
    }

    // Toast Notification System
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        else if (type === 'error') icon = 'fa-triangle-exclamation';
        
        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Remove after 3.5 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3500);
    }

    // Event Listeners
    refreshBtn.addEventListener('click', () => loadReleases(true));
    
    // Search
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderTimeline();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderTimeline();
        searchInput.focus();
    });

    // Filters
    typeFiltersContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        pill.classList.add('active');
        
        currentFilter = pill.getAttribute('data-type');
        renderTimeline();
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-pill[data-type="all"]').classList.add('active');
        currentFilter = 'all';
        
        renderTimeline();
    });

    // Multi select buttons
    clearSelectionBtn.addEventListener('click', () => {
        selectedUpdateIds.clear();
        document.querySelectorAll('.update-card').forEach(card => card.classList.remove('selected'));
        updateSelectionBar();
    });

    tweetSelectedBtn.addEventListener('click', () => {
        const selected = getSelectedUpdates();
        if (selected.length === 0) {
            showToast('No updates selected for tweeting.', 'error');
            return;
        }
        openTweetComposer(selected);
    });

    // Modal behavior
    closeModalBtn.addEventListener('click', () => {
        tweetModal.style.display = 'none';
    });

    // Close modal on click outside content card
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            tweetModal.style.display = 'none';
        }
    });

    tweetTextarea.addEventListener('input', updateCharCount);

    copyTweetBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(tweetTextarea.value);
            showToast('Tweet text copied to clipboard!', 'success');
        } catch (err) {
            console.error('Copy failed:', err);
            showToast('Failed to copy text. Please select and copy manually.', 'error');
        }
    });

    submitTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        if (text.length > 280) {
            showToast('Tweet is too long (max 280 characters).', 'error');
            return;
        }
        
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        tweetModal.style.display = 'none';
        showToast('Redirected to Twitter / X!', 'success');
    });

    // Theme Toggle Listener
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        
        if (isLight) {
            themeToggleIcon.classList.remove('fa-sun');
            themeToggleIcon.classList.add('fa-moon');
            showToast('Switched to Light Mode', 'info');
        } else {
            themeToggleIcon.classList.remove('fa-moon');
            themeToggleIcon.classList.add('fa-sun');
            showToast('Switched to Dark Mode', 'info');
        }
    });

    // Export to CSV Listener
    exportCsvBtn.addEventListener('click', () => {
        const filtered = getFilteredData();
        let totalUpdates = 0;
        filtered.forEach(entry => totalUpdates += entry.updates.length);
        
        if (totalUpdates === 0) {
            showToast('No updates to export.', 'error');
            return;
        }
        
        const csvRows = [["Date", "Type", "Description", "Link"]];
        filtered.forEach(entry => {
            entry.updates.forEach(up => {
                const descEscaped = up.text.replace(/"/g, '""');
                csvRows.push([
                    `"${entry.date}"`,
                    `"${up.type}"`,
                    `"${descEscaped}"`,
                    `"${entry.link}"`
                ]);
            });
        });
        
        const csvString = csvRows.map(row => row.join(",")).join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Exported ${totalUpdates} updates to CSV!`, 'success');
    });

    // Theme Initialization
    const initialTheme = localStorage.getItem('theme') || 'dark';
    if (initialTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleIcon.classList.remove('fa-sun');
        themeToggleIcon.classList.add('fa-moon');
    } else {
        document.body.classList.remove('light-theme');
        themeToggleIcon.classList.remove('fa-moon');
        themeToggleIcon.classList.add('fa-sun');
    }

    // Load initial releases
    loadReleases();
});
