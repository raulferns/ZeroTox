/**
 * ZeroTox // Intelligent Social Media Content Moderation
 * Frontend Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // State Store
    const state = {
        activeTab: 'tab-instagram',
        currentScrapedData: null,
        activeFilter: 'all',
        searchTerm: '',
        modelTelemetry: null
    };

    // DOM Elements
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Instagram Scraper Elements
    const inputInstagramUrl = document.getElementById('instagram-url-input');
    const btnScrapeModerate = document.getElementById('btn-scrape-moderate');
    const scrapeSpinner = document.getElementById('scrape-spinner');
    const scrapeStatusBar = document.getElementById('scrape-status-bar');
    const scrapeStatusText = document.getElementById('scrape-status-text');
    const presetChips = document.querySelectorAll('.preset-chip');

    // Instagram Results Elements
    const resultsArea = document.getElementById('instagram-results-area');
    const postAuthor = document.getElementById('post-author');
    const postShortcode = document.getElementById('post-shortcode');
    const postCaption = document.getElementById('post-caption');
    const postLikes = document.getElementById('post-likes');
    const postTotalComments = document.getElementById('post-total-comments');
    const threatScoreVal = document.getElementById('threat-score-val');
    const threatMeterFill = document.getElementById('threat-meter-fill');
    const postStatusBadge = document.getElementById('post-status-badge');

    const countHate = document.getElementById('count-hate');
    const percentHate = document.getElementById('percent-hate');
    const countOffensive = document.getElementById('count-offensive');
    const percentOffensive = document.getElementById('percent-offensive');
    const countNormal = document.getElementById('count-normal');
    const percentNormal = document.getElementById('percent-normal');

    const barHateWidth = document.getElementById('bar-hate-width');
    const barOffensiveWidth = document.getElementById('bar-offensive-width');
    const barNormalWidth = document.getElementById('bar-normal-width');
    const proportionSummary = document.getElementById('proportion-summary');
    const actionPlanText = document.getElementById('action-plan-text');

    const commentsStreamContainer = document.getElementById('comments-stream-container');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const commentSearchInput = document.getElementById('comment-search-input');
    const btnExportCsv = document.getElementById('btn-export-csv');

    // Inspector Elements
    const singleCommentInput = document.getElementById('single-comment-input');
    const btnInspectComment = document.getElementById('btn-inspect-comment');
    const singleCharCount = document.getElementById('single-char-count');
    const sampleChips = document.querySelectorAll('.scenario-btn');

    const inspectorLabel = document.getElementById('inspector-label');
    const inspectorConfidence = document.getElementById('inspector-confidence');
    const inspectorActionPill = document.getElementById('inspector-action-pill');
    const probaHatePct = document.getElementById('proba-hate-pct');
    const probaHateFill = document.getElementById('proba-hate-fill');
    const probaOffPct = document.getElementById('proba-off-pct');
    const probaOffFill = document.getElementById('proba-off-fill');
    const probaNormPct = document.getElementById('proba-norm-pct');
    const probaNormFill = document.getElementById('proba-norm-fill');
    const inspectorSeverity = document.getElementById('inspector-severity');
    const inspectorPolarity = document.getElementById('inspector-polarity');
    const inspectorTokensFlow = document.getElementById('inspector-tokens-flow');
    const inspectorExplanation = document.getElementById('inspector-explanation');

    // Batch Studio Elements
    const batchInputArea = document.getElementById('batch-input-area');
    const btnRunBatch = document.getElementById('btn-run-batch');
    const btnLoadSampleBatch = document.getElementById('btn-load-sample-batch');
    const batchResultsWrapper = document.getElementById('batch-results-wrapper');

    // Modal Elements
    const commentModal = document.getElementById('comment-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const modalContentArea = document.getElementById('modal-content-area');

    // =================================================================
    // TAB NAVIGATION
    // =================================================================
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-tab');
            state.activeTab = targetId;

            navTabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');

            if (targetId === 'tab-telemetry' && !state.modelTelemetry) {
                loadModelTelemetry();
            }
        });
    });

    // =================================================================
    // PRESET CLICKS
    // =================================================================
    presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            presetChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const url = chip.getAttribute('data-url');
            inputInstagramUrl.value = url;
            runInstagramScrapeAndModeration(url);
        });
    });

    // =================================================================
    // INSTAGRAM SCRAPE & MODERATE
    // =================================================================
    btnScrapeModerate.addEventListener('click', () => {
        const url = inputInstagramUrl.value.trim();
        if (!url) {
            alert('Please enter a valid Instagram URL.');
            return;
        }
        runInstagramScrapeAndModeration(url);
    });

    inputInstagramUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnScrapeModerate.click();
        }
    });

    async function runInstagramScrapeAndModeration(url) {
        setScrapingLoading(true);
        scrapeStatusBar.classList.remove('hidden');
        scrapeStatusText.innerHTML = `Analyzing comments for: <code>${escapeHtml(url)}</code>...`;

        try {
            const response = await fetch('/api/scrape-instagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url, max_comments: 30 })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error (${response.status})`);
            }

            const data = await response.json();
            state.currentScrapedData = data;
            renderInstagramResults(data);

            scrapeStatusText.innerHTML = `✓ Complete: ${escapeHtml(data.post_info.status_message || 'Comments processed successfully.')}`;
            setTimeout(() => {
                scrapeStatusBar.classList.add('hidden');
            }, 4000);

        } catch (err) {
            scrapeStatusText.innerHTML = `⚠️ Error: ${escapeHtml(err.message)}`;
            alert(`Error: ${err.message}`);
        } finally {
            setScrapingLoading(false);
        }
    }

    function setScrapingLoading(isLoading) {
        if (isLoading) {
            btnScrapeModerate.disabled = true;
            scrapeSpinner.classList.remove('hidden');
        } else {
            btnScrapeModerate.disabled = false;
            scrapeSpinner.classList.add('hidden');
        }
    }

    function renderInstagramResults(data) {
        resultsArea.classList.remove('hidden');

        const post = data.post_info;
        const summary = data.moderation_summary;
        const comments = data.comments;

        // Post Metadata
        postAuthor.textContent = post.author ? `@${post.author}` : '@instagram_user';
        postShortcode.textContent = `${post.shortcode}`;
        postCaption.textContent = `"${post.caption || 'No caption provided.'}"`;
        postLikes.textContent = Number(post.likes_count || 0).toLocaleString();
        postTotalComments.textContent = summary.total_comments;

        // Threat Severity Gauge
        const severity = summary.average_severity;
        threatScoreVal.textContent = `${severity} / 100`;
        threatMeterFill.style.width = `${Math.min(100, Math.max(5, severity))}%`;

        postStatusBadge.textContent = summary.post_badge;
        postStatusBadge.className = 'forensic-stamp-badge ' + (
            summary.post_status === 'CRITICAL_THREAT' ? 'stamp-critical' :
                summary.post_status === 'ELEVATED_TOXICITY' ? 'stamp-elevated' : 'stamp-safe'
        );

        // 3-Class Counts & Percentages
        const counts = summary.summary_counts;
        const pcts = summary.percentages;

        countHate.textContent = counts['Hate Speech'] || 0;
        percentHate.textContent = `${pcts['Hate Speech'] || 0}% of total`;

        countOffensive.textContent = counts['Offensive Language'] || 0;
        percentOffensive.textContent = `${pcts['Offensive Language'] || 0}% of total`;

        countNormal.textContent = counts['Normal Speech'] || 0;
        percentNormal.textContent = `${pcts['Normal Speech'] || 0}% of total`;

        // Proportion Ratio Bar
        barHateWidth.style.width = `${pcts['Hate Speech'] || 0}%`;
        barOffensiveWidth.style.width = `${pcts['Offensive Language'] || 0}%`;
        barNormalWidth.style.width = `${pcts['Normal Speech'] || 0}%`;
        proportionSummary.textContent = `${summary.total_comments} Comments`;

        // Moderation Directive Plan
        const hateCount = counts['Hate Speech'] || 0;
        const offCount = counts['Offensive Language'] || 0;
        let planHtml = "";
        if (hateCount > 0) {
            planHtml = `<strong>Recommended Action:</strong> Found ${hateCount} hate speech violation(s). Recommended comment removal & user warning. ${offCount} offensive comments placed under sensitive content filter.`;
        } else if (offCount > 0) {
            planHtml = `<strong>Recommended Action:</strong> Discussion contains ${offCount} offensive or profane comments. Apply sensitivity filter to protect readers.`;
        } else {
            planHtml = `<strong>Approved:</strong> All ${summary.total_comments} comments comply with community moderation guidelines.`;
        }
        actionPlanText.innerHTML = planHtml;

        // Update Filter Counters
        document.getElementById('filter-all-cnt').textContent = summary.total_comments;
        document.getElementById('filter-hate-cnt').textContent = hateCount;
        document.getElementById('filter-off-cnt').textContent = offCount;
        document.getElementById('filter-norm-cnt').textContent = counts['Normal Speech'] || 0;

        // Render Comment List
        renderCommentsStream(comments);
    }

    function renderCommentsStream(comments) {
        commentsStreamContainer.innerHTML = '';

        const filtered = comments.filter(c => {
            const matchesFilter = state.activeFilter === 'all' || c.label === state.activeFilter;
            const textToSearch = (c.author + ' ' + (c.raw_text || c.text)).toLowerCase();
            const matchesSearch = !state.searchTerm || textToSearch.includes(state.searchTerm.toLowerCase());
            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            commentsStreamContainer.innerHTML = `
                <div style="text-align:center; padding: 36px; color: var(--text-muted); font-size: 13px;">
                    No comments match the selected filter.
                </div>
            `;
            return;
        }

        filtered.forEach((c, idx) => {
            const card = document.createElement('div');
            const rowClass = c.label === 'Hate Speech' ? 'row-hate' : (c.label === 'Offensive Language' ? 'row-offensive' : 'row-normal');
            card.className = `comment-row-card ${rowClass}`;

            const pillClass = c.label === 'Hate Speech' ? 'pill-hate' : (c.label === 'Offensive Language' ? 'pill-offensive' : 'pill-normal');

            const text = c.raw_text || c.text || '';
            const author = c.author || 'anonymous_user';
            const logNum = String(idx + 1).padStart(2, '0');

            // Format label text
            const verdictStamp = escapeHtml(c.label);

            // Severity color class
            const sevColor = c.label === 'Hate Speech' ? 'text-crimson' : (c.label === 'Offensive Language' ? 'text-amber' : 'text-slate');

            card.innerHTML = `
                <div class="c-author-group">
                    <div class="c-avatar font-mono">#${logNum}</div>
                    <div class="c-author-name" title="@${escapeHtml(author)}">@${escapeHtml(author)}</div>
                </div>
                <div class="c-text-content">
                    ${highlightSensitiveTokens(text, c.tokens)}
                </div>
                <div>
                    <span class="class-pill ${pillClass}">${verdictStamp}</span>
                </div>
                <div class="c-severity-badge font-mono ${sevColor}">
                    Score: ${c.severity_score}
                </div>
                <div>
                    <button class="c-action-btn" data-comment-id="${c.id || ''}">Inspect</button>
                </div>
            `;

            const btnInspect = card.querySelector('.c-action-btn');
            btnInspect.addEventListener('click', () => {
                showCommentDetailModal(c);
            });

            commentsStreamContainer.appendChild(card);
        });
    }

    function highlightSensitiveTokens(rawText, tokens) {
        if (!tokens || tokens.length === 0) return escapeHtml(rawText);

        let highlighted = escapeHtml(rawText);
        tokens.forEach(tok => {
            if (tok.type === 'hate' || tok.type === 'offensive') {
                const regex = new RegExp(`\\b(${escapeRegex(tok.word)})\\b`, 'gi');
                const badgeClass = tok.type === 'hate' ? 'token-hate' : 'token-offensive';
                highlighted = highlighted.replace(regex, `<span class="token-badge ${badgeClass}">$1</span>`);
            }
        });
        return highlighted;
    }

    // Filter Buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeFilter = btn.getAttribute('data-filter');
            if (state.currentScrapedData) {
                renderCommentsStream(state.currentScrapedData.comments);
            }
        });
    });

    // Search Input
    commentSearchInput.addEventListener('input', (e) => {
        state.searchTerm = e.target.value.trim();
        if (state.currentScrapedData) {
            renderCommentsStream(state.currentScrapedData.comments);
        }
    });

    // Export CSV
    btnExportCsv.addEventListener('click', async () => {
        if (!state.currentScrapedData || !state.currentScrapedData.comments) {
            alert('No comments available to export.');
            return;
        }

        try {
            const response = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    comments: state.currentScrapedData.comments,
                    format: 'csv'
                })
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `moderation_report_${state.currentScrapedData.post_info.shortcode || 'comments'}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to export CSV: ' + err.message);
        }
    });

    // =================================================================
    // TAB 2: SINGLE COMMENT INSPECTOR
    // =================================================================
    btnInspectComment.addEventListener('click', runSingleCommentInspection);

    singleCommentInput.addEventListener('input', () => {
        singleCharCount.textContent = `${singleCommentInput.value.length} characters`;
    });

    sampleChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const sampleText = chip.getAttribute('data-text');
            singleCommentInput.value = sampleText;
            singleCharCount.textContent = `${sampleText.length} characters`;
            runSingleCommentInspection();
        });
    });

    async function runSingleCommentInspection() {
        const text = singleCommentInput.value.trim();
        if (!text) {
            alert('Please enter a comment to analyze.');
            return;
        }

        try {
            const response = await fetch('/api/analyze-comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });

            if (!response.ok) throw new Error('API analysis failed');
            const data = await response.json();
            renderInspectorResults(data);

        } catch (err) {
            alert('Analysis Error: ' + err.message);
        }
    }

    function renderInspectorResults(res) {
        inspectorLabel.textContent = res.label;
        inspectorLabel.className = 'verdict-stamp-text ' + (
            res.label === 'Hate Speech' ? 'text-crimson' : (res.label === 'Offensive Language' ? 'text-amber' : 'text-slate')
        );

        inspectorConfidence.textContent = `${(res.confidence * 100).toFixed(1)}%`;
        inspectorActionPill.textContent = res.action_badge;
        inspectorActionPill.className = 'action-stamp-pill ' + (
            res.label === 'Hate Speech' ? 'badge-critical' : (res.label === 'Offensive Language' ? 'badge-elevated' : 'badge-safe')
        );

        // Probabilities
        const probas = res.probabilities;
        const pHate = (probas['Hate Speech'] * 100).toFixed(1);
        const pOff = (probas['Offensive Language'] * 100).toFixed(1);
        const pNorm = (probas['Normal Speech'] * 100).toFixed(1);

        probaHatePct.textContent = `${pHate}%`;
        probaHateFill.style.width = `${pHate}%`;

        probaOffPct.textContent = `${pOff}%`;
        probaOffFill.style.width = `${pOff}%`;

        probaNormPct.textContent = `${pNorm}%`;
        probaNormFill.style.width = `${pNorm}%`;

        // Threat Severity & Polarity
        inspectorSeverity.textContent = `${res.severity_score} / 100`;
        inspectorSeverity.className = 'readout-val font-mono ' + (
            res.label === 'Hate Speech' ? 'text-crimson' : (res.label === 'Offensive Language' ? 'text-amber' : 'text-slate')
        );

        const pol = res.sentiment.polarity;
        const polLabel = pol > 0.1 ? '(Positive)' : (pol < -0.1 ? '(Negative)' : '(Neutral)');
        inspectorPolarity.textContent = `${pol} ${polLabel}`;

        // Token Heatmap Flow
        inspectorTokensFlow.innerHTML = '';
        if (res.tokens && res.tokens.length > 0) {
            res.tokens.forEach(tok => {
                const span = document.createElement('span');
                const badgeClass = tok.type === 'hate' ? 'tag-hate' : (
                    tok.type === 'offensive' ? 'tag-offensive' : (tok.type === 'normal' ? 'tag-normal' : '')
                );
                span.className = `censor-tag font-mono ${badgeClass}`;
                span.textContent = tok.word + (tok.weight ? ` (+${tok.weight})` : '');
                inspectorTokensFlow.appendChild(span);
            });
        } else {
            inspectorTokensFlow.innerHTML = '<span class="text-ash">No abusive keywords detected.</span>';
        }

        // Policy Explanation
        inspectorExplanation.textContent = res.explanation;
    }

    // =================================================================
    // TAB 3: BATCH MODERATION
    // =================================================================
    btnRunBatch.addEventListener('click', async () => {
        const text = batchInputArea.value.trim();
        if (!text) {
            alert('Please paste comments to analyze.');
            return;
        }

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return;

        btnRunBatch.disabled = true;
        btnRunBatch.querySelector('.btn-text').textContent = 'Analyzing Batch...';

        try {
            const response = await fetch('/api/analyze-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: lines })
            });

            if (!response.ok) throw new Error('Batch processing failed');
            const data = await response.json();
            renderBatchResults(data);

        } catch (err) {
            alert('Batch Processing Error: ' + err.message);
        } finally {
            btnRunBatch.disabled = false;
            btnRunBatch.querySelector('.btn-text').textContent = 'Analyze Batch';
        }
    });

    btnLoadSampleBatch.addEventListener('click', () => {
        batchInputArea.value = [
            "Awesome feature! Really helps our team's workflow every day.",
            "shut the fuck up you ugly bitch stop posting this trash",
            "This is such an inspirational project. Congratulations to the developers!",
            "all of these filthy immigrants should be eliminated and wiped out",
            "What a ridiculous buggy app, fix your awful servers",
            "kill yourself you dumbass nobody cares about your stupid product",
            "Does this model support real-time token explainability out of the box?",
            "fucking scum get out of here right now",
            "Clean and elegant design. Will definitely star this repository on GitHub!"
        ].join('\n');
        btnRunBatch.click();
    });

    function renderBatchResults(data) {
        batchResultsWrapper.innerHTML = `
            <div class="forensic-card" style="margin-top: 14px;">
                <div class="card-header-bar">
                    <div class="card-classification-tag">Batch Summary</div>
                    <div class="card-dossier-num">${data.total_comments} Comments Processed</div>
                </div>

                <div class="evidence-indicators-grid" style="margin-bottom: 16px;">
                    <div class="indicator-block block-hate">
                        <div class="indicator-header"><span>Hate Speech</span></div>
                        <div class="indicator-big-count font-mono">${data.summary_counts['Hate Speech']}</div>
                        <div class="indicator-ratio font-mono">${data.percentages['Hate Speech']}% of batch</div>
                    </div>
                    <div class="indicator-block block-offensive">
                        <div class="indicator-header"><span>Offensive Language</span></div>
                        <div class="indicator-big-count font-mono">${data.summary_counts['Offensive Language']}</div>
                        <div class="indicator-ratio font-mono">${data.percentages['Offensive Language']}% of batch</div>
                    </div>
                    <div class="indicator-block block-normal">
                        <div class="indicator-header"><span>Normal Speech</span></div>
                        <div class="indicator-big-count font-mono">${data.summary_counts['Normal Speech']}</div>
                        <div class="indicator-ratio font-mono">${data.percentages['Normal Speech']}% of batch</div>
                    </div>
                </div>

                <div class="unmasking-stream-table">
                    ${data.comments.map(c => {
            const rowClass = c.label === 'Hate Speech' ? 'row-hate' : (c.label === 'Offensive Language' ? 'row-offensive' : 'row-normal');
            const pillClass = c.label === 'Hate Speech' ? 'pill-hate' : (c.label === 'Offensive Language' ? 'pill-offensive' : 'pill-normal');
            const sevColor = c.label === 'Hate Speech' ? 'text-crimson' : (c.label === 'Offensive Language' ? 'text-amber' : 'text-slate');
            return `
                            <div class="comment-row-card ${rowClass}">
                                <div class="c-author-group">
                                    <div class="c-avatar font-mono">#${c.id}</div>
                                    <div class="c-author-name">Item ${c.id}</div>
                                </div>
                                <div class="c-text-content">${escapeHtml(c.raw_text || c.text)}</div>
                                <div><span class="class-pill ${pillClass}">${escapeHtml(c.label)}</span></div>
                                <div class="c-severity-badge font-mono ${sevColor}">Score: ${c.severity_score}</div>
                                <div><span class="font-mono" style="font-size:11px; color:var(--text-muted);">${escapeHtml(c.action_badge)}</span></div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    // =================================================================
    // TAB 4: MODEL TELEMETRY & METRICS
    // =================================================================
    async function loadModelTelemetry() {
        try {
            const response = await fetch('/api/model-info');
            if (!response.ok) return;
            const data = await response.json();
            state.modelTelemetry = data;
            renderTelemetryData(data);
        } catch (err) {
            console.error('Failed to load model telemetry:', err);
        }
    }

    function renderTelemetryData(data) {
        if (!data || !data.confusion_matrix) return;

        // Render Confusion Matrix
        const cmContainer = document.getElementById('confusion-matrix-container');
        cmContainer.innerHTML = '';

        const headers = ['', 'Pred: Hate', 'Pred: Offensive', 'Pred: Normal'];
        headers.forEach(h => {
            const cell = document.createElement('div');
            cell.className = 'matrix-cell matrix-header font-mono';
            cell.textContent = h;
            cmContainer.appendChild(cell);
        });

        const rowLabels = ['True: Hate', 'True: Offensive', 'True: Normal'];
        const matrix = data.confusion_matrix;

        for (let r = 0; r < 3; r++) {
            const labelCell = document.createElement('div');
            labelCell.className = 'matrix-cell matrix-header font-mono';
            labelCell.textContent = rowLabels[r];
            cmContainer.appendChild(labelCell);

            for (let c = 0; c < 3; c++) {
                const cell = document.createElement('div');
                const isHit = (r === c);
                cell.className = `matrix-cell font-mono ${isHit ? 'matrix-hit' : 'matrix-miss'}`;
                cell.textContent = Number(matrix[r][c]).toLocaleString();
                cmContainer.appendChild(cell);
            }
        }

        // Top Feature Tokens
        if (data.top_features) {
            renderFeatureChips('features-hate-chips', data.top_features['Hate Speech'] || []);
            renderFeatureChips('features-offensive-chips', data.top_features['Offensive Language'] || []);
            renderFeatureChips('features-normal-chips', data.top_features['Normal Speech'] || []);
        }
    }

    function renderFeatureChips(containerId, features) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        features.slice(0, 16).forEach(f => {
            const span = document.createElement('span');
            span.className = 'feat-chip font-mono';
            span.textContent = `${f.feature} (+${f.weight})`;
            container.appendChild(span);
        });
    }

    // =================================================================
    // MODAL HANDLERS: DETAILED COMMENT INSPECTION
    // =================================================================
    function showCommentDetailModal(c) {
        const text = c.raw_text || c.text || '';
        const probas = c.probabilities || {};
        const pillClass = c.label === 'Hate Speech' ? 'pill-hate' : (c.label === 'Offensive Language' ? 'pill-offensive' : 'pill-normal');

        modalContentArea.innerHTML = `
            <div style="margin-bottom: 16px;">
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px; font-weight: 600;">Comment Text:</div>
                <div style="background: var(--surface-sunken); padding: 14px; border: 1px solid var(--border-subtle); font-size: 14px; line-height: 1.5; border-radius: 4px;">
                    ${highlightSensitiveTokens(text, c.tokens)}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: var(--surface-sunken); padding: 12px; border: 1px solid var(--border-subtle); border-radius: 4px;">
                    <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px; font-weight: 600;">Classification:</div>
                    <span class="class-pill ${pillClass}">${escapeHtml(c.label)}</span>
                    <span class="font-mono" style="font-size: 12px; margin-left: 8px; color: var(--text-secondary);">Confidence: ${(c.confidence * 100).toFixed(1)}%</span>
                </div>
                <div style="background: var(--surface-sunken); padding: 12px; border: 1px solid var(--border-subtle); border-radius: 4px;">
                    <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px; font-weight: 600;">Recommended Action:</div>
                    <div style="font-weight: 700; font-size: 13px; color: var(--text-primary);">${escapeHtml(c.action_badge || c.action)}</div>
                </div>
            </div>

            <div style="background: var(--surface-sunken); padding: 12px 14px; border: 1px solid var(--border-subtle); margin-bottom: 16px; border-radius: 4px;">
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; font-weight: 600;">Class Probabilities:</div>
                <div class="font-mono" style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span class="text-crimson font-bold">Hate: ${((probas['Hate Speech'] || 0) * 100).toFixed(1)}%</span>
                    <span class="text-amber font-bold">Offensive: ${((probas['Offensive Language'] || 0) * 100).toFixed(1)}%</span>
                    <span class="text-slate font-bold">Normal: ${((probas['Normal Speech'] || 0) * 100).toFixed(1)}%</span>
                </div>
            </div>

            <div style="background: rgba(255, 255, 255, 0.03); padding: 14px; border: 1px solid var(--border-subtle); font-size: 13px; color: var(--text-secondary); line-height: 1.5; border-radius: 4px;">
                <strong style="color: var(--text-primary);">Reasoning:</strong> ${escapeHtml(c.explanation || 'No additional explanation available.')}
            </div>
        `;

        commentModal.classList.remove('hidden');
    }

    btnCloseModal.addEventListener('click', () => {
        commentModal.classList.add('hidden');
    });

    commentModal.addEventListener('click', (e) => {
        if (e.target === commentModal) {
            commentModal.classList.add('hidden');
        }
    });

    // Helper Utilities
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Initial Execution: Load preset 1 on startup
    runInstagramScrapeAndModeration('https://www.instagram.com/p/C8_TechAI_Keynote/');
    runSingleCommentInspection();
    loadModelTelemetry();
});
