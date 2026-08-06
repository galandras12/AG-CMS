function register(hooks, context) {
  hooks.on('server:ready', ({ port }) => {
    context.logger.info(`[sample-hello-logger] A szerver elindult a ${port} porton, plugin aktiv.`);
  });
}

module.exports = { register };
