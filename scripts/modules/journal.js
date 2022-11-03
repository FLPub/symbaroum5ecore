export class SymbaroumJournalSheet extends JournalSheet {
    get journal() {
        return this.object;
    }

    _onConfigureSheet(event) {
        event.preventDefault();
        new DocumentSheetConfig(this.journal, {
            top: this.position.top + 40,
            left: this.position.left + ((this.position.width - 400) / 2)
        }).render(true);
    };
}

export class SymbaroumWide extends SymbaroumJournalSheet {
    static NAME = 'SymbaroumWide';
    
    static register() {
      Journal.registerSheet('SYB5E', SymbaroumWide, { label: game.i18n.localize('SYB5E.journal.widejournal.name'), makeDefault: false });
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.width = 1268
        // edit below for a custom css class
        options.classes.push('symbaroum-dnd5e-mod');
        return options;
    }
}
