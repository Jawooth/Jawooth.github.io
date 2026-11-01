/* global hexo */
/* 静态文件路径助手函数 */

'use strict';

const { version } = require('../../package.json');
const themeVersion = version;

hexo.extend.helper.register('static_link', name => {
  const css_list = {
    '/images/loading.svg': '/images/loading.svg'
  };

  const path = renderPath(css_list[name]);
  if (path.indexOf('http') === 0 || path.indexOf('//') === 0) {
    return path;
  }

  const url_for = hexo.extend.helper.get('url_for').bind(hexo);
  return url_for(path);
});

hexo.extend.helper.register('css_link', name => {
  const config = cdnConfig();
  /* 白名单只保留本主题 source 里真实存在、且有模板引用的文件。
     jquery / fancybox / simple-lightbox 三套曾服务于 photo_zoom（已关），
     本地文件本就不存在，2026-11 清理时删掉。gitalk/twikoo 保留给 comment.ejs。 */
  const css_list = {
    'theme_main': '/style/main.css',
    'gitalk': '/style/gitalk.min.css'
  };

  const boot_css_list = {
    'theme_main': '/style/main.css',
    'gitalk': 'https://cdn.bootcdn.net/ajax/libs/gitalk/1.7.2/gitalk.min.css'
  };

  let path = renderPath(css_list[name] ? css_list[name] : name);

  if (config.enable && config.provider === 'bootcdn') {
    path = boot_css_list[name] ? boot_css_list[name] : name;
  }

  if (path.indexOf('http') === 0 || path.indexOf('//') === 0) {
    return path;
  }

  const url_for = hexo.extend.helper.get('url_for').bind(hexo);
  return url_for(path);
});

hexo.extend.helper.register('js_link', name => {
  const config = cdnConfig();
  const js_list = {
    'theme_main': '/js/main.js',
    'gitalk': '/js/gitalk.min.js',
    'twikoo': '/js/twikoo.min.js'
  };

  const boot_js_list = {
    'theme_main': '/js/main.js',
    'gitalk': 'https://cdn.bootcdn.net/ajax/libs/gitalk/1.7.2/gitalk.min.js',
    'twikoo': 'https://cdn.bootcdn.net/ajax/libs/twikoo/1.6.16/twikoo.min.js'
  };

  let path = renderPath(js_list[name] ? js_list[name] : name);

  if (config.enable && config.provider === 'bootcdn') {
    path = boot_js_list[name] ? boot_js_list[name] : name;
  }

  if (path.indexOf('http') === 0 || path.indexOf('//') === 0) {
    return path;
  }

  const url_for = hexo.extend.helper.get('url_for').bind(hexo);
  return url_for(path);
});

function cdnConfig() {
  const { cdn } = Object.assign({cdn: {
    enable: false,
    provider: 'jsdelivr'
  }}, hexo.theme.config);

  // 兼容历史配置
  if (cdn.use_bootcdn && !cdn.enable) {
    cdn.enable = true;
    cdn.provider = 'bootcdn';
  }

  return cdn;
}

function renderPath(path) {
  const config = cdnConfig();

  path = path.replace(/^\//, '');

  if (config.enable) {
    switch (config.provider) {
      case 'jsdelivr':
        return `https://cdn.jsdelivr.net/npm/hexo-theme-minimalism@${themeVersion}/source/${path}`;
      case 'unpkg':
        return `https://unpkg.com/hexo-theme-minimalism@${themeVersion}/source/${path}`;
    }
  }

  return path;
}
