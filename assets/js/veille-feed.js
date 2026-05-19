(() => {
  const state = {
    dataset: null,
    sourceFilter: 'all',
    refreshInFlight: false,
  }

  const REFRESH_ENDPOINT = '/api/veille-refresh'
  const REFRESH_TIMEOUT_MS = 4000
  const AUTO_REFRESH_INTERVAL_MS = 15 * 60 * 1000

  function isLocalPreview() {
    const host = window.location.hostname || ''
    return (
      window.location.protocol === 'file:' ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0'
    )
  }

  function qs(id) {
    return document.getElementById(id)
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function formatDate(value) {
    const date = new Date(value)
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  function formatDateTime(value) {
    const date = new Date(value)
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  function formatRelativeAge(value) {
    const date = new Date(value)
    const deltaMs = Date.now() - date.getTime()
    const deltaHours = Math.round(deltaMs / (1000 * 60 * 60))
    if (deltaHours < 1) return 'mise à jour à l’instant'
    if (deltaHours < 24) return `mise à jour il y a ${deltaHours} h`
    const deltaDays = Math.round(deltaHours / 24)
    return `mise à jour il y a ${deltaDays} jour${deltaDays > 1 ? 's' : ''}`
  }

  function bySource(items) {
    if (state.sourceFilter === 'all') return items
    return items.filter((item) => item.source_id === state.sourceFilter)
  }

  function renderStats(dataset) {
    qs('veille-topic').textContent = dataset.topic
    qs('veille-refresh').textContent = formatDateTime(dataset.generated_at_iso)
    qs('veille-source-count').textContent = `${dataset.stats.source_count} sources`
    qs('veille-item-count').textContent = `${dataset.stats.selected_items} articles retenus`
    qs('veille-window').textContent = dataset.tracked_since_iso
      ? `Historique consolidé depuis le ${formatDate(dataset.tracked_since_iso)}`
      : `Fenêtre active ${dataset.latest_window_days} jours`
    qs('veille-summary').textContent = dataset.focus
    qs('veille-refresh-note').textContent = `Dernière synchronisation automatique : ${formatDateTime(dataset.generated_at_iso)} · ${formatRelativeAge(dataset.generated_at_iso)}`
    qs('veille-history-note').textContent = dataset.history_note || 'Historique RSS filtré et conservé localement pour l’oral.'
    qs('veille-count-latest').textContent = dataset.stats.latest_items
    qs('veille-count-archive').textContent = dataset.stats.archive_items
    qs('veille-count-sources').textContent = dataset.stats.source_count
  }

  function renderFilters(dataset) {
    const wrap = qs('source-filters')
    const buttons = [
      { id: 'all', label: 'Toutes les sources' },
      ...dataset.sources.map((source) => ({ id: source.id, label: source.label })),
    ]
    wrap.innerHTML = buttons
      .map((source) => {
        const active = source.id === state.sourceFilter ? ' is-active' : ''
        return `<button type="button" class="veille-filter${active}" data-source="${escapeHtml(source.id)}">${escapeHtml(source.label)}</button>`
      })
      .join('')

    wrap.querySelectorAll('[data-source]').forEach((button) => {
      button.addEventListener('click', () => {
        state.sourceFilter = button.getAttribute('data-source') || 'all'
        renderFilters(dataset)
        renderFeeds(dataset)
      })
    })
  }

  function renderNewsCard(item, isLatest) {
    const badgeKind = item.source_kind.toLowerCase() === 'officiel' ? 'officiel' : 'media'
    const tags = (item.matched_keywords || []).slice(0, 3)
    const freshness = item.published_at_iso ? formatRelativeAge(item.published_at_iso) : ''
    return `
      <article class="news-card${isLatest ? ' news-card--latest' : ''}">
        <div class="news-card__meta">
          <span class="news-badge news-badge--${badgeKind}">${escapeHtml(item.source_label)}</span>
          <time datetime="${escapeHtml(item.published_at_iso)}">${escapeHtml(formatDate(item.published_at_iso))}</time>
        </div>
        <h3><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a></h3>
        <p class="news-card__summary">${escapeHtml(item.summary || 'Résumé indisponible.')}</p>
        <div class="news-card__footer">
          <div class="news-tags">${freshness ? `<span class="news-tag news-tag--freshness">${escapeHtml(freshness)}</span>` : ''}${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
          <a class="news-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">Lire l'article <i class="ri-arrow-right-up-line"></i></a>
        </div>
      </article>
    `
  }

  function renderFeedGroup(targetId, items, isLatest, emptyText) {
    const target = qs(targetId)
    if (!items.length) {
      target.innerHTML = `<div class="news-empty">${escapeHtml(emptyText)}</div>`
      return
    }
    target.innerHTML = items.map((item) => renderNewsCard(item, isLatest)).join('')
  }

  function renderFeeds(dataset) {
    const latest = bySource(dataset.latest_items)
    const archive = bySource(dataset.archive_items)
    renderFeedGroup('latest-feed', latest, true, 'Aucune actualité récente ne correspond au filtre sélectionné.')
    renderFeedGroup('archive-feed', archive, false, 'Aucune actualité historique ne correspond au filtre sélectionné.')
  }

  function renderSources(dataset) {
    const target = qs('source-board')
    const sources = [...dataset.sources].sort((a, b) => {
      const countDiff = (b.selected_count || 0) - (a.selected_count || 0)
      if (countDiff !== 0) return countDiff
      return String(a.label || '').localeCompare(String(b.label || ''), 'fr')
    })
    target.innerHTML = sources.map((source) => {
      const countLabel = `${source.selected_count} cas retenu${source.selected_count > 1 ? 's' : ''}`
      const statusNote = source.status === 'error' && source.error
        ? `<p style="margin-top:10px; color:#ff8ea3;">Flux non joignable : ${escapeHtml(source.error)}</p>`
        : ''
      const usageNote = source.selected_count > 0
        ? `<p class="veille-source__note">Cette source alimente actuellement l'historique affiché dans la veille.</p>`
        : source.kind.toLowerCase() === 'officiel'
          ? `<p class="veille-source__note">Source active de cadre et de contextualisation. Aucun cas n'a été retenu dans la période actuelle après filtrage.</p>`
          : `<p class="veille-source__note">Flux surveillé en continu. Aucun article n'a été retenu dans la période actuelle après filtrage.</p>`
      const roleLabel = source.status === 'manual'
        ? 'Cas officiel consolidé'
        : source.kind.toLowerCase() === 'officiel'
          ? 'Cadre / alertes'
          : 'Cas concrets'
      const activityLabel = source.selected_count > 0 ? 'Source actuellement contributrice' : 'Source surveillée'
      const secondaryLink = source.feed_url
        ? `<a href="${escapeHtml(source.feed_url)}" target="_blank" rel="noopener">Flux RSS</a>`
        : `<a href="${escapeHtml(source.site_url)}" target="_blank" rel="noopener">Publication officielle</a>`
      return `
        <article class="veille-source">
          <div class="veille-source__top">
            <div>
              <h3>${escapeHtml(source.label)}</h3>
              <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
                <div class="news-badge news-badge--${source.kind.toLowerCase() === 'officiel' ? 'officiel' : 'media'}">${escapeHtml(source.kind)}</div>
                <div class="news-badge news-badge--${source.kind.toLowerCase() === 'officiel' ? 'officiel' : 'media'}">${escapeHtml(roleLabel)}</div>
                <div class="news-badge news-badge--${source.selected_count > 0 ? 'media' : 'officiel'}">${escapeHtml(activityLabel)}</div>
              </div>
            </div>
            <span class="veille-source__count">${escapeHtml(countLabel)}</span>
          </div>
          <p>${escapeHtml(source.description)}</p>
          ${usageNote}
          ${statusNote}
          <div class="veille-source__links">
            <a href="${escapeHtml(source.site_url)}" target="_blank" rel="noopener">Site source</a>
            ${secondaryLink}
          </div>
        </article>
      `
    }).join('')
  }

  function showError(message) {
    qs('latest-feed').innerHTML = `<div class="news-empty">${escapeHtml(message)}</div>`
    qs('archive-feed').innerHTML = `<div class="news-empty">Le fichier de données n'a pas pu être chargé. Tu peux toujours présenter la méthode via la fiche E4.</div>`
  }

  function setServerStatus(message) {
    const target = qs('veille-refresh-note')
    if (!target) return
    target.textContent = message
  }

  async function loadDataset() {
    try {
      const response = await fetch(`data/veille-breaches.json?ts=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const dataset = await response.json()
      state.dataset = dataset
      renderStats(dataset)
      renderFilters(dataset)
      renderFeeds(dataset)
      renderSources(dataset)
    } catch (error) {
      showError(`Impossible de charger les flux RSS filtrés (${error.message}).`)
    }
  }

  async function refreshDatasetInBackground() {
    if (state.refreshInFlight || isLocalPreview()) return
    state.refreshInFlight = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS)
    try {
      setServerStatus('Vérification côté serveur des flux RSS…')
      const response = await fetch(`${REFRESH_ENDPOINT}?ts=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const payload = await response.json()
      if (payload.status === 'updated') {
        setServerStatus(`Mise à jour serveur effectuée : ${formatDateTime(payload.generated_at_iso)}`)
        await loadDataset()
        return
      }
      if (payload.status === 'fresh') {
        setServerStatus('Jeu de données déjà à jour côté serveur.')
        return
      }
      if (payload.status === 'busy') {
        setServerStatus('Une autre visite déclenche déjà la mise à jour des flux.')
        return
      }
      setServerStatus('Le serveur n’a pas renvoyé d’état exploitable pour le refresh RSS.')
    } catch (error) {
      setServerStatus('Actualisation serveur non disponible. Affichage du dernier cache local.')
    } finally {
      state.refreshInFlight = false
      window.clearTimeout(timeout)
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadDataset().then(() => refreshDatasetInBackground())

    window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshDatasetInBackground()
      }
    }, AUTO_REFRESH_INTERVAL_MS)

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshDatasetInBackground()
      }
    })
  })
})()
