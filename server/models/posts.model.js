const crypto = require('crypto');
const { getStore } = require('../core/store');
const hooks = require('../core/hooks');

const store = getStore('posts', { posts: [] });
const VALID_STATUS = ['draft', 'scheduled', 'published'];
// A statikus generator "index.html"-t ir a fooldalnak - egy "index" slugu
// bejegyzes felulirna azt, ezert ezt a slugot sosem engedjuk kiadni.
const RESERVED_SLUGS = ['index'];

function slugify(value) {
  const base = (value || '')
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'bejegyzes';
}

/** Az utemezett bejegyzesek a publishAt idopont elerese utan "published"-kent jelennek meg. */
function effectiveStatus(post) {
  if (post.status === 'scheduled' && post.publishAt && new Date(post.publishAt) <= new Date()) {
    return 'published';
  }
  return post.status;
}

function withEffectiveStatus(post) {
  return { ...post, effectiveStatus: effectiveStatus(post) };
}

function uniqueSlug(posts, baseSlug, excludeId) {
  let slug = RESERVED_SLUGS.includes(baseSlug) ? `${baseSlug}-post` : baseSlug;
  let i = 2;
  while (posts.some((p) => p.slug === slug && p.id !== excludeId)) {
    slug = `${baseSlug}-${i}`;
    i += 1;
  }
  return slug;
}

async function list({ status } = {}) {
  const { posts } = store.read();
  return posts
    .map(withEffectiveStatus)
    .filter((p) => !status || p.effectiveStatus === status)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function findByIdRaw(id) {
  const post = store.read().posts.find((p) => p.id === id);
  return post ? withEffectiveStatus(post) : null;
}

async function create(input, author) {
  const now = new Date().toISOString();
  let post = {
    id: crypto.randomUUID(),
    title: (input.title || '').trim(),
    slug: slugify(input.slug || input.title),
    excerpt: input.excerpt || '',
    contentMarkdown: input.contentMarkdown || '',
    status: VALID_STATUS.includes(input.status) ? input.status : 'draft',
    publishAt: input.publishAt || null,
    authorId: author.sub,
    authorName: author.displayName,
    createdAt: now,
    updatedAt: now,
  };

  post = (await hooks.trigger('post:beforeSave', post)) || post;

  await store.update((data) => {
    post.slug = uniqueSlug(data.posts, post.slug, post.id);
    data.posts.push({ ...post });
    return data;
  });

  await hooks.trigger('post:afterSave', post);
  return withEffectiveStatus(post);
}

async function update(id, patch) {
  const existing = store.read().posts.find((p) => p.id === id);
  if (!existing) {
    throw Object.assign(new Error('Bejegyzes nem talalhato.'), { status: 404 });
  }

  let merged = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
  if (patch.status && !VALID_STATUS.includes(patch.status)) {
    throw Object.assign(new Error('Ervenytelen statusz.'), { status: 400 });
  }
  if (patch.slug || patch.title) {
    merged.slug = slugify(patch.slug || merged.title);
  }

  merged = (await hooks.trigger('post:beforeSave', merged)) || merged;

  await store.update((data) => {
    const post = data.posts.find((p) => p.id === id);
    if (!post) {
      throw Object.assign(new Error('Bejegyzes nem talalhato.'), { status: 404 });
    }
    merged.slug = uniqueSlug(data.posts, merged.slug, id);
    Object.assign(post, merged);
    return data;
  });

  await hooks.trigger('post:afterSave', merged);
  return withEffectiveStatus(merged);
}

async function remove(id) {
  const existing = store.read().posts.find((p) => p.id === id);
  if (!existing) {
    throw Object.assign(new Error('Bejegyzes nem talalhato.'), { status: 404 });
  }

  await hooks.trigger('post:beforeDelete', existing);

  await store.update((data) => {
    const before = data.posts.length;
    data.posts = data.posts.filter((p) => p.id !== id);
    if (data.posts.length === before) {
      throw Object.assign(new Error('Bejegyzes nem talalhato.'), { status: 404 });
    }
    return data;
  });

  await hooks.trigger('post:afterDelete', existing);
}

module.exports = { list, findByIdRaw, create, update, remove, VALID_STATUS, slugify };
