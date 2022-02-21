import { syb5eConfig } from './syb5e-configs.js';
Hooks.once('init', () => {
  game.settings.register('symbaroum5ecore', 'charBGChoice', {
    restricted: false,
    type: String,
    config: false,
    scope: 'client',
    default: 'url(../images/background/bg-green.webp) repeat',
  });
  game.settings.register('symbaroum5ecore', 'npcBGChoice', {
    restricted: false,
    type: String,
    config: false,
    scope: 'client',
    default: 'url(../images/background/bg-green.webp) repeat',
  });

  game.settings.register('symbaroum5ecore', 'switchCharBGColour', {
    name: 'symbaroum5ecore.OPTIONAL_PC_COLOUR_SELECTOR',
    restricted: false,
    type: String,
    config: false,
    scope: 'client',
    default: 'url(../images/background/bg-green.webp) repeat',
  });
  game.settings.register('symbaroum5ecore', 'switchNpcBGColour', {
    name: 'symbaroum5ecore.OPTIONAL_NPC_COLOUR_SELECTOR',
    restricted: false,
    type: String,
    config: false,
    scope: 'client',
    default: 'url(../images/background/bg-red.webp) repeat',
  });

  game.settings.registerMenu('symbaroum5ecore', 'symbaroumSettings', {
    name: 'symbaroum5ecore.OPTIONAL_CONFIG_MENULABEL',
    label: 'symbaroum5ecore.OPTIONAL_CONFIG_MENULABEL',
    hint: 'symbaroum5ecore.OPTIONAL_CONFIG_MENUHINT',
    icon: 'fas fa-palette',
    type: symbaroum5ecoreConfig,
    restricted: false,
  });

  // register setting for add/remove menu button
  game.settings.register('symbaroum5ecore', 'addMenuButton', {
    name: 'symbaroum5ecore.OPTIONAL_ADD_MENUNAME',
    hint: 'symbaroum5ecore.OPTIONAL_ADD_MENUHINT',
    scope: 'world',
    config: true,
    default: syb5eConfig.getDefaults.addMenuButton,
    type: Boolean,
    onChange: (enabled) => {
      SymbaroumConfig.toggleConfigButton(enabled);
    },
  });

  Hooks.once('ready', () => {
    setupConfigOptions();
    syb5eConfig();
  });

  async function setupConfigOptions() {
    let r = document.querySelector(':root');
    await r.style.setProperty('--syb5e-pc-background-image', game.settings.get('symbaroum5ecore', 'switchCharBGColour'));
    await r.style.setProperty('--syb5e-npc-background-image', game.settings.get('symbaroum5ecore', 'switchNpcBGColour'));
  }
});
