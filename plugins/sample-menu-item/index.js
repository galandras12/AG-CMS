function register(hooks) {
  hooks.on('admin:menu:register', ({ registerItem }) => {
    registerItem({
      id: 'sample-plugin-help',
      label: 'nav.help',
      icon: '❓',
      order: 999,
      url: 'https://github.com/galandras12/AG-CMS',
    });
  });
}

module.exports = { register };
