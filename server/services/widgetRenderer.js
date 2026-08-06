const { marked } = require('marked');
const { escapeHtml } = require('./templateEngine');

function renderText(widget) {
  const title = widget.title ? `<h3 class="widget-title">${escapeHtml(widget.title)}</h3>` : '';
  const content = marked.parse(widget.config?.content || '');
  return `<div class="widget widget-text">${title}${content}</div>`;
}

function renderRecentPosts(widget, publishedPosts) {
  const count = Number(widget.config?.count) > 0 ? Number(widget.config.count) : 5;
  const items = publishedPosts.slice(0, count);
  const title = widget.title ? `<h3 class="widget-title">${escapeHtml(widget.title)}</h3>` : '';
  const list = items.map((p) => `<li><a href="${escapeHtml(p.slug)}.html">${escapeHtml(p.title)}</a></li>`).join('');
  return `<div class="widget widget-recent-posts">${title}<ul>${list}</ul></div>`;
}

function renderSocialLinks(widget) {
  const title = widget.title ? `<h3 class="widget-title">${escapeHtml(widget.title)}</h3>` : '';
  const links = (widget.config?.links || [])
    .filter((l) => l && l.url)
    .map((l) => `<li><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label || l.url)}</a></li>`)
    .join('');
  return `<div class="widget widget-social-links">${title}<ul>${links}</ul></div>`;
}

function render(widget, publishedPosts) {
  if (widget.type === 'text') return renderText(widget);
  if (widget.type === 'recentPosts') return renderRecentPosts(widget, publishedPosts);
  if (widget.type === 'socialLinks') return renderSocialLinks(widget);
  return '';
}

module.exports = { render };
