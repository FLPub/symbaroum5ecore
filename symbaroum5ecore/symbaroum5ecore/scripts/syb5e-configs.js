export class syb5eConfig extends FormApplication {
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
      const title = game.i18n.localize('symbaroum5ecore.OPTIONAL_CONFIG_MENULABEL');

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
      title: game.i18n.localize('symbaroum5ecore.OPTIONAL_CONFIG_MENULABEL'),
      id: 'symbaroum5ecoreSettings',
      icon: 'fas fa-cogs',
      template: 'systems/symbaroum/template/symbaroumSettings.html',
      width: 700,
      closeOnSubmit: true,
    });
  }

  getData(options) {
    const newData = {
      charBGChoice: game.settings.get('symbaroum5ecore', 'charBGChoice'),
      npcBGChoice: game.settings.get('symbaroum5ecore', 'npcBGChoice'),
      titleBGChoice: game.settings.get('symbaroum5ecore', 'titleBGChoice'),
      editableChoice: game.settings.get('symbaroum5ecore', 'editableChoice'),
      noneditableChoice: game.settings.get('symbaroum5ecore', 'nonEditableChoice'),
    };
    if (game.settings.get('symbaroum5ecore', 'charBGChoice') === 'none') {
      newData['charBGColour'] = game.settings.get('symbaroum5ecore', 'switchCharBGColour');
    } else {
      newData['charBGColour'] = '#000000';
    }
    if (game.settings.get('symbaroum5ecore', 'npcBGChoice') === 'none') {
      newData['npcBGColour'] = game.settings.get('symbaroum5ecore', 'switchNpcBGColour');
    } else {
      newData['npcBGColour'] = '#000000';
    }
    if (game.settings.get('symbaroum5ecore', 'titleBGChoice') === 'none') {
      newData['titleBGColour'] = game.settings.get('symbaroum5ecore', 'switchTitleColour');
    } else {
      newData['titleBGColour'] = '#000000';
    }
    if (game.settings.get('symbaroum5ecore', 'editableChoice') === 'none') {
      newData['editableColour'] = game.settings.get('symbaroum5ecore', 'switchEditableColour');
    } else {
      newData['editableColour'] = '#000000';
    }
    if (game.settings.get('symbaroum5ecore', 'nonEditableChoice') === 'none') {
      newData['noneditableColour'] = game.settings.get('symbaroum5ecore', 'switchNoNEditableColour');
    } else {
      newData['noneditableColour'] = '#000000';
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

    document.getElementById('charBGImage').value = game.settings.get('symbaroum5ecore', 'charBGChoice');
    document.getElementById('npcBGImage').value = game.settings.get('symbaroum5ecore', 'npcBGChoice');

    if (game.settings.get('symbaroum5ecore', 'charBGChoice') === 'none') {
      document.getElementById('pcColPanel').style.display = 'block';
    }
    if (game.settings.get('symbaroum5ecore', 'npcBGChoice') === 'none') {
      document.getElementById('npcColPanel').style.display = 'block';
    }
  }

  onResetPC() {
    game.settings.set('symbaroum5ecore', 'charBGChoice', 'url(../images/background/bg-green.webp) repeat');
    game.settings.set('symbaroum5ecore', 'switchCharBGColour', 'url(../images/background/bg-green.webp) repeat');
    location.reload();
  }

  onResetNPC() {
    game.settings.set('symbaroum5ecore', 'npcBGChoice', 'url(../images/background/bg-red.webp) repeat');
    game.settings.set('symbaroum5ecore', 'switchNpcBGColour', 'url(../images/background/bg-red.webp) repeat');
    location.reload();
  }

  onResetAll() {
    game.settings.set('symbaroum5ecore', 'charBGChoice', 'url(../images/background/bg-green.webp) repeat');
    game.settings.set('symbaroum5ecore', 'switchCharBGColour', 'url(../images/background/bg-green.webp) repeat');
    game.settings.set('symbaroum5ecore', 'npcBGChoice', 'url(../images/background/bg-red.webp) repeat');
    game.settings.set('symbaroum5ecore', 'switchNpcBGColour', 'url(../images/background/bg-red.webp) repeat');
    location.reload();
  }

  async _updateObject(event, formData) {
    await game.settings.set('symbaroum5ecore', 'charBGChoice', formData.charBGImage);
    await game.settings.set('symbaroum5ecore', 'npcBGChoice', formData.npcBGImage);

    if (charBGImage.value === 'none') {
      if (formData.charBGColour.length > 0 && formData.charBGColour[0] != '#') {
        formData.charBGColour = '#000000';
      }
      await game.settings.set('symbaroum5ecore', 'switchCharBGColour', formData.charBGColour);
    } else {
      await game.settings.set('symbaroum5ecore', 'switchCharBGColour', formData.charBGImage);
    }

    if (npcBGImage.value === 'none') {
      if (formData.npcBGColour.length > 0 && formData.npcBGColour[0] != '#') {
        formData.npcBGColour = '#000000';
      }
      await game.settings.set('symbaroum5ecore', 'switchNpcBGColour', formData.npcBGColour);
    } else {
      await game.settings.set('symbaroum5ecore', 'switchNpcBGColour', formData.npcBGImage);
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
