/**
 * ZeroTox // FORENSIC DOSSIER & INVESTIGATIVE EDITORIAL LOGIC
 * Automated NLP Hate Speech & Social Media Moderation
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
            alert('Please input a valid target Instagram URI.');
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
        scrapeStatusText.innerHTML = `CONNECTING TO RECONNAISSANCE STREAM FOR: <code>${escapeHtml(url)}</code>...`;

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

            scrapeStatusText.innerHTML = `✓ FORENSIC INGESTION COMPLETE: ${escapeHtml(data.post_info.status_message)}`;
            setTimeout(() => {
                scrapeStatusBar.classList.add('hidden');
            }, 6000);

        } catch (err) {
            scrapeStatusText.innerHTML = `⚠️ FORENSIC INTERRUPT: ${escapeHtml(err.message)}`;
            alert(`Scraping Interruption: ${err.message}`);
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
        postShortcode.textContent = `REF: ${post.shortcode}`;
        postCaption.textContent = `"${post.caption || 'No publication caption recorded.'}"`;
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
        percentHate.textContent = `${pcts['Hate Speech'] || 0}% OF TOTAL`;

        countOffensive.textContent = counts['Offensive Language'] || 0;
        percentOffensive.textContent = `${pcts['Offensive Language'] || 0}% OF TOTAL`;

        countNormal.textContent = counts['Normal Speech'] || 0;
        percentNormal.textContent = `${pcts['Normal Speech'] || 0}% OF TOTAL`;

        // Proportion Ratio Bar
        barHateWidth.style.width = `${pcts['Hate Speech'] || 0}%`;
        barOffensiveWidth.style.width = `${pcts['Offensive Language'] || 0}%`;
        barNormalWidth.style.width = `${pcts['Normal Speech'] || 0}%`;
        proportionSummary.textContent = `${summary.total_comments} AUDIT PAYLOADS`;

        // Moderation Directive Plan
        const hateCount = counts['Hate Speech'] || 0;
        const offCount = counts['Offensive Language'] || 0;
        let planHtml = "";
        if (hateCount > 0) {
            planHtml = `<strong>CRITICAL DIRECTIVE:</strong> Found ${hateCount} prohibited hate speech violation(s). Recommended automated account purge & reporting. ${offCount} offensive comments placed under sensitive content filter.`;
        } else if (offCount > 0) {
            planHtml = `<strong>ELEVATED WARNING:</strong> Thread contains ${offCount} offensive/profane statements. Enforce sensitivity shadow-mask protocol on comments forum.`;
        } else {
            planHtml = `<strong>CLEARED FOR FORUM:</strong> All ${summary.total_comments} comments comply with community moderation standards. No punitive sanctions required.`;
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
                <div style="text-align:center; padding: 36px; color: var(--ash-gray); font-family: var(--font-mono); font-size: 12px;">
                    [NO EVIDENCE RECORDS MATCHING QUERY FILTERS]
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
            const author = c.author || 'suspect_user';
            const logNum = String(idx + 1).padStart(3, '0');

            // Format verdict label
            let verdictStamp = `[${escapeHtml(c.label).toUpperCase()}]`;
            if (c.label === 'Hate Speech') verdictStamp = `[SEV-1: HATE]`;
            else if (c.label === 'Offensive Language') verdictStamp = `[WARN: OFFENSIVE]`;
            else verdictStamp = `[CLEARED: BENIGN]`;

            // Severity color class
            const sevColor = c.label === 'Hate Speech' ? 'text-crimson' : (c.label === 'Offensive Language' ? 'text-amber' : 'text-slate');

            card.innerHTML = `
                <div class="c-author-group">
                    <div class="c-avatar font-mono">#${logNum}</div>
                    <div class="c-author-name" title="@${escapeHtml(author)}">@${escapeHtml(author)}</div>
                </div>
                <div class="c-text-content font-mono">
                    ${highlightSensitiveTokens(text, c.tokens)}
                </div>
                <div>
                    <span class="class-pill ${pillClass}">${verdictStamp}</span>
                </div>
                <div class="c-severity-badge font-mono ${sevColor}">
                    SEV: ${c.severity_score}
                </div>
                <div>
                    <button class="c-action-btn font-mono" data-comment-id="${c.id || ''}">[DECONSTRUCT]</button>
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
            alert('No evidence records available to export.');
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
            a.download = `dossier_audit_${state.currentScrapedData.post_info.shortcode || 'records'}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to export CSV: ' + err.message);
        }
    });

    // =================================================================
    // TAB 2: REAL-TIME INTERROGATOR
    // =================================================================
    btnInspectComment.addEventListener('click', runSingleCommentInspection);

    singleCommentInput.addEventListener('input', () => {
        singleCharCount.textContent = `${singleCommentInput.value.length} CHARACTERS`;
    });

    sampleChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const sampleText = chip.getAttribute('data-text');
            singleCommentInput.value = sampleText;
            singleCharCount.textContent = `${sampleText.length} CHARACTERS`;
            runSingleCommentInspection();
        });
    });

    async function runSingleCommentInspection() {
        const text = singleCommentInput.value.trim();
        if (!text) {
            alert('Please input a text payload to interrogate.');
            return;
        }

        try {
            const response = await fetch('/api/analyze-comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });

            if (!response.ok) throw new Error('API interrogation failed');
            const data = await response.json();
            renderInspectorResults(data);

        } catch (err) {
            alert('Interrogation Error: ' + err.message);
        }
    }

    function renderInspectorResults(res) {
        inspectorLabel.textContent = res.label.toUpperCase();
        inspectorLabel.className = 'verdict-stamp-text ' + (
            res.label === 'Hate Speech' ? 'text-crimson' : (res.label === 'Offensive Language' ? 'text-amber' : 'text-slate')
        );

        inspectorConfidence.textContent = `${(res.confidence * 100).toFixed(1)}%`;
        inspectorActionPill.textContent = `[${res.action_badge.toUpperCase()}]`;
        inspectorActionPill.className = 'action-stamp-pill font-mono ' + (
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
        inspectorSeverity.className = 'readout-val ' + (
            res.label === 'Hate Speech' ? 'text-crimson' : (res.label === 'Offensive Language' ? 'text-amber' : 'text-slate')
        );

        const pol = res.sentiment.polarity;
        const polLabel = pol > 0.1 ? '(POSITIVE)' : (pol < -0.1 ? '(NEGATIVE)' : '(NEUTRAL)');
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
                span.textContent = tok.word + (tok.weight ? ` [Δ+${tok.weight}]` : '');
                inspectorTokensFlow.appendChild(span);
            });
        } else {
            inspectorTokensFlow.innerHTML = '<span class="text-ash font-mono">[NO ABERRANT TOKENS DETECTED]</span>';
        }

        // Policy Explanation
        inspectorExplanation.textContent = `[DIRECTIVE RATIONALE]: ${res.explanation}`;
    }

    // =================================================================
    // TAB 3: BATCH INGESTION TERMINAL
    // =================================================================
    btnRunBatch.addEventListener('click', async () => {
        const text = batchInputArea.value.trim();
        if (!text) {
            alert('Please paste comment records to moderate.');
            return;
        }

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return;

        btnRunBatch.disabled = true;
        btnRunBatch.querySelector('.btn-text').textContent = '[ PROCESSING BATCH STREAM... ]';

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
            btnRunBatch.querySelector('.btn-text').textContent = '[ EXECUTE BATCH MODERATION ]';
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
            "fucking nigger scum get out of here right now",
            "Clean and elegant design. Will definitely star this repository on GitHub!"
        ].join('\n');
        btnRunBatch.click();
    });

    function renderBatchResults(data) {
        batchResultsWrapper.innerHTML = `
            <div class="forensic-card" style="margin-top: 14px;">
                <div class="card-header-bar">
                    <div class="card-classification-tag">BATCH EVIDENCE AUDIT LEDGER</div>
                    <div class="card-dossier-num">${data.total_comments} PAYLOADS PROCESSED</div>
                </div>

                <div class="evidence-indicators-grid" style="margin-bottom: 16px;">
                    <div class="indicator-block block-hate">
                        <div class="indicator-header font-mono"><span>[HATE SPEECH]</span></div>
                        <div class="indicator-big-count font-mono">${data.summary_counts['Hate Speech']}</div>
                        <div class="indicator-ratio font-mono">${data.percentages['Hate Speech']}% OF BATCH</div>
                    </div>
                    <div class="indicator-block block-offensive">
                        <div class="indicator-header font-mono"><span>[OFFENSIVE LANGUAGE]</span></div>
                        <div class="indicator-big-count font-mono">${data.summary_counts['Offensive Language']}</div>
                        <div class="indicator-ratio font-mono">${data.percentages['Offensive Language']}% OF BATCH</div>
                    </div>
                    <div class="indicator-block block-normal">
                        <div class="indicator-header font-mono"><span>[NORMAL BENIGN]</span></div>
                        <div class="indicator-big-count font-mono">${data.summary_counts['Normal Speech']}</div>
                        <div class="indicator-ratio font-mono">${data.percentages['Normal Speech']}% OF BATCH</div>
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
                                    <div class="c-author-name">RECORD-${c.id}</div>
                                </div>
                                <div class="c-text-content font-mono">${escapeHtml(c.raw_text || c.text)}</div>
                                <div><span class="class-pill ${pillClass}">[${escapeHtml(c.label).toUpperCase()}]</span></div>
                                <div class="c-severity-badge font-mono ${sevColor}">SEV: ${c.severity_score}</div>
                                <div><span class="font-mono" style="font-size:10px; color:var(--ash-gray);">${escapeHtml(c.action_badge)}</span></div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    // =================================================================
    // TAB 4: MODEL TELEMETRY & AUDIT DOCS
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

        const headers = ['', 'PRED HATE', 'PRED OFF', 'PRED NORM'];
        headers.forEach(h => {
            const cell = document.createElement('div');
            cell.className = 'matrix-cell matrix-header font-mono';
            cell.textContent = h;
            cmContainer.appendChild(cell);
        });

        const rowLabels = ['TRUE HATE', 'TRUE OFF', 'TRUE NORM'];
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
            span.textContent = `${f.feature} [+${f.weight}]`;
            container.appendChild(span);
        });
    }

    // =================================================================
    // MODAL HANDLERS: DETAILED EVIDENCE INTERROGATION
    // =================================================================
    function showCommentDetailModal(c) {
        const text = c.raw_text || c.text || '';
        const probas = c.probabilities || {};
        const pillClass = c.label === 'Hate Speech' ? 'pill-hate' : (c.label === 'Offensive Language' ? 'pill-offensive' : 'pill-normal');

        modalContentArea.innerHTML = `
            <div style="margin-bottom: 16px;">
                <div class="font-mono" style="font-size: 10px; color: var(--ash-gray); margin-bottom: 4px;">RAW EVIDENCE TEXT PAYLOAD:</div>
                <div style="background: var(--surface-sunken); padding: 12px 14px; border: 1px solid var(--border-chalk); font-size: 13px; font-family: var(--font-mono); line-height: 1.45;">
                    ${highlightSensitiveTokens(text, c.tokens)}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: var(--surface-sunken); padding: 10px 12px; border: 1px solid var(--border-chalk);">
                    <div class="font-mono" style="font-size: 9.5px; color: var(--ash-gray); margin-bottom: 4px;">LINGUISTIC VERDICT:</div>
                    <span class="class-pill ${pillClass}">[${escapeHtml(c.label).toUpperCase()}]</span>
                    <span class="font-mono" style="font-size: 11px; margin-left: 8px;">CONF: ${(c.confidence * 100).toFixed(1)}%</span>
                </div>
                <div style="background: var(--surface-sunken); padding: 10px 12px; border: 1px solid var(--border-chalk);">
                    <div class="font-mono" style="font-size: 9.5px; color: var(--ash-gray); margin-bottom: 4px;">POLICY SANCTION DIRECTIVE:</div>
                    <div class="font-mono" style="font-weight: 700; font-size: 12px; color: var(--chalk-white);">${escapeHtml(c.action_badge || c.action)}</div>
                </div>
            </div>

            <div style="background: var(--surface-sunken); padding: 12px 14px; border: 1px solid var(--border-chalk); margin-bottom: 16px;">
                <div class="font-mono" style="font-size: 10px; color: var(--ash-gray); margin-bottom: 6px;">CALIBRATED PROBABILITY SPREAD:</div>
                <div class="font-mono" style="display: flex; justify-content: space-between; font-size: 11.5px;">
                    <span class="text-crimson font-bold">HATE: ${((probas['Hate Speech'] || 0) * 100).toFixed(1)}%</span>
                    <span class="text-amber font-bold">OFFENSIVE: ${((probas['Offensive Language'] || 0) * 100).toFixed(1)}%</span>
                    <span class="text-slate font-bold">NORMAL: ${((probas['Normal Speech'] || 0) * 100).toFixed(1)}%</span>
                </div>
            </div>

            <div class="font-mono" style="background: rgba(245, 245, 240, 0.03); padding: 12px 14px; border: 1px solid var(--border-chalk); font-size: 12px; color: var(--bone-white); line-height: 1.45;">
                <strong>[EVIDENCE RATIONALE]:</strong> ${escapeHtml(c.explanation || 'No forensic narrative available.')}
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
