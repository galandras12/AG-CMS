function register(hooks, context) {
  hooks.on('server:ready', ({ port }) => {
    context.logger.info(`[sample-hello-logger] A szerver elindult a ${port} porton, plugin aktiv.`);
  });

  hooks.on('post:afterSave', (post) => {
    context.logger.info(`[sample-hello-logger] Bejegyzes mentve: "${post.title}" (${post.status}).`);
    return post;
  });

  hooks.on('media:afterUpload', (media) => {
    context.logger.info(`[sample-hello-logger] Uj mediafajl feltoltve: ${media.originalName}.`);
    return media;
  });
}

module.exports = { register };
