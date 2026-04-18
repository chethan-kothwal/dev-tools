const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const yaml = require('js-yaml');

class FakeClassList {
  constructor() {
    this._set = new Set();
  }
  add(name) { this._set.add(name); }
  remove(name) { this._set.delete(name); }
  toggle(name, force) {
    if (typeof force === 'boolean') {
      if (force) {
        this._set.add(name);
        return true;
      }
      this._set.delete(name);
      return false;
    }
    if (this._set.has(name)) {
      this._set.delete(name);
      return false;
    }
    this._set.add(name);
    return true;
  }
  contains(name) { return this._set.has(name); }
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.innerHTML = '';
    this.textContent = '';
    this.placeholder = '';
    this.scrollTop = 0;
    this.offsetWidth = 8;
    this.style = {};
    this.classList = new FakeClassList();
  }

  addEventListener() {}
  removeEventListener() {}
  setAttribute() {}
  getAttribute() { return null; }
  focus() {}
  setSelectionRange() {}
  getBoundingClientRect() { return { left: 0, width: 1200 }; }
}

function loadApp() {
  const appPath = path.resolve(__dirname, '..', 'app.js');
  const source = fs.readFileSync(appPath, 'utf8');

  const byId = new Map();
  const ensure = (id) => {
    if (!byId.has(id)) byId.set(id, new FakeElement(id));
    return byId.get(id);
  };

  const doc = {
    getElementById(id) {
      return ensure(id);
    },
    querySelector(selector) {
      if (selector === '.container') return ensure('container');
      if (selector === '#leftPanel .btn-group .btn-secondary') return ensure('left-clear');
      if (selector === '#rightPanel .panel-header .btn-secondary') return ensure('right-copy');
      return ensure(selector);
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    documentElement: { setAttribute() {} },
    body: { classList: new FakeClassList(), style: {} }
  };

  const localStorageStore = new Map();
  const localStorage = {
    getItem(key) {
      return localStorageStore.has(key) ? localStorageStore.get(key) : null;
    },
    setItem(key, value) {
      localStorageStore.set(key, String(value));
    }
  };

  const context = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    JSON,
    Number,
    String,
    Boolean,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    encodeURIComponent,
    decodeURIComponent,
    escape: global.escape || ((s) => s),
    atob: global.atob || ((s) => Buffer.from(s, 'base64').toString('binary')),
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    alert() {},
    localStorage,
    window: {
      matchMedia: () => ({ matches: false }),
      getComputedStyle: () => ({ lineHeight: '21' })
    },
    document: doc,
    jsyaml: yaml
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: appPath });

  return {
    api: context.module.exports,
    elements: byId,
    context
  };
}

module.exports = { loadApp };
