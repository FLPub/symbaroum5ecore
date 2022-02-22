import { COMMON } from '../../common.js';

export class SybConfigApp extends FormApplication {
  static get getDefaults() {
    return {
      addMenuButton: true,
    };
  }

  // * Creates or removes the quick access config button
  // * @param  {Boolean} shown true to add, false to remove

  static toggleConfigButton(shown) {
    const button = $('#SymbaroumButton');
    if (button) button.remove();

    if (shown) {
      const title = COMMON.localize('SYB5E.setting.config-menu-label.name');

      $(`<button id="SymbaroumButton" data-action="symbaroumConfig" title="${title}">
         <i class="fas fa-palette"></i> ${title}
       </button>`)
        .insertAfter('button[data-action="configure"]')
        .on('click', (event) => {
          const menu = game.settings.menus.get('symbaroum.symbaroumSettings');
          if (!menu) return ui.notifications.error('No submenu found for the provided key');
          const app = new menu.type();
          return app.render(true);
        });
    }
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: COMMON.localize('SYB5E.setting.config-menu-label.name'),
      id: 'symbaroum5ecoreSettings',
      icon: 'fas fa-cogs',
      template: `${COMMON.DATA.path}/templates/apps/config-app.html`,
      width: 700,
      closeOnSubmit: true,
    });
  }

  getData(options) {
    const newData = {
      charBGChoice: COMMON.setting('charBGChoice'),
      charTextColour: COMMON.setting('charTextColour'),
      npcBGChoice: COMMON.setting('npcBGChoice'),
      npcTextColour: COMMON.setting('npcTextColour'),
      fontFamily: COMMON.setting('fontFamily'),
      actorBorder: COMMON.setting('actorBorder'),
    };
    if (COMMON.setting('charBGChoice') === 'none') {
      newData['charBGColour'] = COMMON.setting('switchCharBGColour');
    } else {
      newData['charBGColour'] = '#000000';
    }
    if (COMMON.setting('npcBGChoice') === 'none') {
      newData['npcBGColour'] = COMMON.setting('switchNpcBGColour');
    } else {
      newData['npcBGColour'] = '#000000';
    }

    return foundry.utils.mergeObject(newData);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('#charBGImage').change((ev) => this._showColOption(ev, '#pcColPanel', charBGImage.value));
    html.find('#npcBGImage').change((ev) => this._showColOption(ev, '#npcColPanel', npcBGImage.value));

    html.find('button[name="resetPC"]').click(this.onResetPC.bind(this));
    html.find('button[name="resetNPC"]').click(this.onResetNPC.bind(this));
    html.find('button[name="resetAll"]').click(this.onResetAll.bind(this));

    html.find('button[name="dnd5eSettings"]').click(this.dnd5eSettings.bind(this));

    document.getElementById('charBGImage').value = COMMON.setting('charBGChoice');
    document.getElementById('charTextColour').value = COMMON.setting('charTextColour');
    document.getElementById('npcBGImage').value = COMMON.setting('npcBGChoice');
    document.getElementById('npcTextColour').value = COMMON.setting('npcTextColour');

    if (COMMON.setting('charBGChoice') === 'none') {
      document.getElementById('pcColPanel').style.display = 'block';
    }
    if (COMMON.setting('npcBGChoice') === 'none') {
      document.getElementById('npcColPanel').style.display = 'block';
    }
  }

  async onResetPC() {
    await COMMON.setting('charBGChoice', 'url(../images/background/bg-green.webp) repeat');
    await COMMON.setting('switchCharBGColour', 'url(../images/background/bg-green.webp) repeat');
    await COMMON.setting('charTextColour', '#ffffff');
    location.reload();
  }

  async onResetNPC() {
    await COMMON.setting('npcBGChoice', 'url(../images/background/bg-red.webp) repeat');
    await COMMON.setting('switchNpcBGColour', 'url(../images/background/bg-red.webp) repeat');
    await COMMON.setting('npcTextColour', '#ffffff');
    location.reload();
  }

  async onResetAll() {
    await COMMON.setting('charBGChoice', 'url(../images/background/bg-green.webp) repeat');
    await COMMON.setting('switchCharBGColour', 'url(../images/background/bg-green.webp) repeat');
    await COMMON.setting('charTextColour', '#ffffff');
    await COMMON.setting('npcBGChoice', 'url(../images/background/bg-red.webp) repeat');
    await COMMON.setting('switchNpcBGColour', 'url(../images/background/bg-red.webp) repeat');
    await COMMON.setting('switchNpcBGColour', 'url(../images/background/bg-red.webp) repeat');
    await COMMON.setting('npcTextColour', '#ffffff');

    location.reload();
  }

  async dnd5eSettings() {
    await COMMON.setting('charBGChoice', '#dad8cc');
    await COMMON.setting('switchCharBGColour', '#dad8cc');
    await COMMON.setting('charTextColour', '#000000');
    await COMMON.setting('npcBGChoice', '#dad8cc');
    await COMMON.setting('switchNpcBGColour', '#dad8cc');
    await COMMON.setting('switchNpcBGColour', '#dad8cc');
    await COMMON.setting('npcTextColour', '#000000');
    await COMMON.setting('fontFamily', 'none');
    await COMMON.setting('actorBorder', 'none');

    location.reload();
  }

  async _updateObject(event, formData) {
    await COMMON.setting('charBGChoice', formData.charBGImage);
    await COMMON.setting('npcBGChoice', formData.npcBGImage);
    await COMMON.setting('charTextColour', formData.charTextColour);
    await COMMON.setting('npcTextColour', formData.npcTextColour);

    if (charBGImage.value === 'none') {
      if (formData.charBGColour.length > 0 && formData.charBGColour[0] != '#') {
        formData.charBGColour = '#000000';
      }
      await COMMON.setting('switchCharBGColour', formData.charBGColour);
    } else {
      await COMMON.setting('switchCharBGColour', formData.charBGImage);
    }

    if (npcBGImage.value === 'none') {
      if (formData.npcBGColour.length > 0 && formData.npcBGColour[0] != '#') {
        formData.npcBGColour = '#000000';
      }
      await COMMON.setting('switchNpcBGColour', formData.npcBGColour);
    } else {
      await COMMON.setting('switchNpcBGColour', formData.npcBGImage);
    }

    location.reload();
  }

  close() {
    super.close();
  }

  async _showColOption(event, mChild, iValue) {
    event.preventDefault();
    let li = $(event.currentTarget).parents('.tab-active');
    let li2 = li.children(mChild);
    let tHeight = parseInt(li[0].offsetParent.style.height.replace(/[^0-9]/g, ''));
    if (li2[0].style.display === 'none' && iValue === 'none') {
      tHeight = tHeight + 30;
      li[0].offsetParent.style.height = tHeight.toString() + 'px';
      li2[0].style.display = 'block';
    } else if (li2[0].style.display != 'none') {
      tHeight = tHeight - 30;
      li[0].offsetParent.style.height = tHeight.toString() + 'px';
      li2[0].style.display = 'none';
    }
  }
}
