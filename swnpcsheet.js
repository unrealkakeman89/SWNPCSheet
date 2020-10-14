/**
 * @author Felix M�ller aka syl3r86
 */
 

import ActorSheet5eNPC from "../../systems/sw5e/module/actor/sheets/npc.js";

//let Actor5eSheet = CONFIG.Actor.sheetClass;
export class BetterNPCActor5eSheet extends ActorSheet5eNPC {
								//  ActorSheet5eNPC
    get template() {
        // adding the #equals and #unequals handlebars helper
        Handlebars.registerHelper('equals', function (arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('unequals', function (arg1, arg2, options) {
            return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
        });

        const path = "systems/sw5e/templates/actors/";
        if (!game.user.isGM && this.actor.limited) return path + "limited-sheet.html";
        return "modules/swnpcsheet5e/template/npc-sheet.html";
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        mergeObject(options, {
            classes: ["sheet","better-npc-sheet-container"],
            width: 600,
            height: 300,
            blockFavTab: true
        });
        return options;
    }
    
    getData() {
        const data = super.getData();

        data.config = CONFIG.SW5E;

        // setting to display either the Icon of the item (true) or a generic d20 icon (false)
        this.useFeatIcons = false;
        this.useWeaponIcons = false;
        this.usePowerIcons = false;

        data['useFeatIcons'] = this.useFeatIcons;
        data['useWeaponIcons'] = this.useWeaponIcons;
        data['usePowerIcons'] = this.usePowerIcons;
        return data;
    }


    activateListeners(html) {
        super.activateListeners(html);

        // only do stuff if its for npcs
        if (this.actor.data.type === "character") {
            return;
        }

        // rebind roll function
        html.find('.item .rollable').click(event => this._onItemRoll(event));


        // register settings
        game.settings.register("BetterNPCSheet", this.object.data._id, {
            name: "Settings specific to NPC display",
            hint: "Settings to exclude packs from loading",
            default: "",
            type: String,
            scope: 'user',
            onChange: settings => {
                this.settings = JSON.parse(settings);
            }
        });
        // load settings from container
        let settings = game.settings.get("BetterNPCSheet", this.object.data._id);
        if (settings == '') { // if settings are empty create the settings data
            console.log("NPC Settings | Creating settings");
            settings = {};
            for (let item of this.object.data.items) {
                if (item.type == 'power') {
                    let target = `.item[data-item-id=${item.id}] .item-description`;
                    settings[target] = false;
                }
            }
            settings.editMode = false;
            game.settings.set('BetterNPCSheet', this.object.data._id, JSON.stringify(settings));
        } else {
            settings = JSON.parse(settings);
        }
        // apply them
        console.log("NPC Settings | Loading settings");
        for (let key in settings) {
            let target = html.find(key);
            if (settings[key] == true) {
                target.show();
            } else {
                target.hide();
            }
        }
        this.settings = settings;



        // hide elements that are part of the edit mode or empty
        this._applySettingsMode(this.settings.editMode, html);

        // toggle edit mode button event
        html.find('.editBtn').click(e => {
            this.settings.editMode = !this.settings.editMode;
            game.settings.set('BetterNPCSheet', this.object.data._id, JSON.stringify(this.settings));
            this._applySettingsMode(this.settings.editMode, html);
        });

        // set dynamic input width
        let inputs = html.find('.npc-textinput,.npc-textinput-small');
        inputs.keyup(e => {
            let input = e.target;
            let inputText = e.target.value || e.target.placeholder;
            let prop = ["font-style", "font-variant", "font-weight", "font-size", "font-family"];
            let font = "";
            for (let x in prop)
                font += window.getComputedStyle(input, null).getPropertyValue(prop[x]) + " ";

            let element = document.createElement("canvas").getContext("2d");
            element.font = font;
            let txtWidth = element.measureText(inputText).width * 1.1 + 5;

            e.target.style.width = txtWidth + "px";
        });

        inputs.change(e => {
            inputs.trigger('keyup');
        });

        inputs.trigger('keyup');

        // adding toggle for item detail
        html.find('.npc-item-name').click(event => {
            this._onItemSummary(event)
        });

        this.saveState = false;
        for (let element of html.find('.npc-item-name')) {
            let item = this.actor.getOwnedItem($(element).parents('.item').data("item-id"));
            if (hasProperty(item, 'data.flags.swnpcsheet5e.showItemSummary') && item.data.flags.swnpcsheet5e.showItemSummary) {
                $(element).trigger('click');
            }
        }
        this.saveState = true;
            

        html.find('.body-tile-name').click(e => {
            let target = e.target.getAttribute('data-tile');
            let collapsTarget = e.target.getAttribute('data-target') || 'item';
            let targetTile = `.body-tile[data-tile=${target}] .${collapsTarget}`;
            if (this.settings[targetTile] === undefined || this.settings[targetTile] === true) {
                html.find(targetTile).hide(100);
                this.settings[targetTile] = false;
            } else {
                html.find(targetTile).show(100);
                this.settings[targetTile] = true;
            }
            game.settings.set('BetterNPCSheet', this.object.data._id, JSON.stringify(this.settings));
        });

        // remove window padding
        $('.better-npc-sheet').parent().css('padding', '0');
        
        
        // powerslot control buttons
        html.find('.powerslot-mod').click(ev => {
            let mod = event.target.getAttribute("data-mod");
            let level = event.target.getAttribute("data-level");
            let slotElement = $(html.find(`input[name="data.powers.power${level}.value"]`));
            let newValue = mod == '+' ? Number(slotElement.val()) + 1 : Number(slotElement.val()) - 1;
            slotElement.val(newValue >= 0 ? newValue : 0);
            slotElement.trigger('submit');
        });

        // list changing logic:
        html.find('.item-change-list').click(ev => {
            let target = $(ev.target).parents('.item').find('.type-list');
            target.toggle(200);
        });
        html.find('.npc-item-name').contextmenu(ev => {
            let target = $(ev.target).parents('.item').find('.type-list');
            target.toggle(200);
        });

        html.find('.type-list a').click(ev => {
            let targetList = ev.target.dataset.value
            let itemId = $(ev.target).parents('.item').attr('data-item-id');
            let item = this.actor.getOwnedItem(itemId);
            item.update({ "flags.asw5e.itemInfo.type": targetList });
        });

        // Rollable Health Formula
        html.find(".npc-roll-hp").click(this._onRollHPFormula.bind(this));

    }

    render(force = false, options = {}) {
        if (this.supressRender) {
            return;
        }

        if (force) {
            let newWidth = getProperty(this.object.data.flags, 'betterNpcSheet.sheet.width');
            let newHeight = getProperty(this.object.data.flags, 'betterNpcSheet.sheet.height');

            if (newWidth === undefined || newHeight === undefined) {
                let columnCount = 2;
                if (this.object.data.items.length > 10) {
                    columnCount = 3;
                }
                newWidth = columnCount * 300;
                newHeight = columnCount * 300;
            }

            this.position.width = newWidth;
            this.position.height = newHeight;
        }
        return super.render(force,options);
    }

    async close() {        
        this.object.update({ 'flags.betterNpcSheet.sheet.height': this.position.height, 'flags.betterNpcSheet.sheet.width': this.position.width });
        super.close();
    }

    async _onPowerSlotOverride(event) {
        let span = event.currentTarget.parentElement;
        let level = span.dataset.level;
        let override = this.actor.data.data.powers[level].override || this.actor.data.data.powers[level].max;
        let input = $(span).children('.powerslot-input');
        input.attr('name', `data.powers.${level}.override`);
        input.attr('readonly', false);

        $(span).children('.slot-max-override').remove();
        /*
        input.type = "text";
        input.value = override;
        input.placeholder = span.dataset.slots;
        input.dataset.dtype = "Number";

        // Replace the HTML
        const parent = span.parentElement;
        parent.removeChild(span);
        parent.appendChild(input);*/
    }

    async _onItemSummary(event) {
        super._onItemSummary(event);
        if (this.saveState !== false) {
            let li = $(event.currentTarget).parents(".item");
            let item = this.actor.getOwnedItem(li.data("item-id"));
            let showItemSummary = true;
            if (hasProperty(item, 'data.flags.swnpcsheet5e.showItemSummary')) {
                showItemSummary = !item.data.flags.swnpcsheet5e.showItemSummary;
            }
            this.supressRender = true;
            await item.setFlag('swnpcsheet5e', 'showItemSummary', showItemSummary);
            this.supressRender = false;
        }
    }

    _applySettingsMode(editMode, html) {
        let hidable = html.find('.hidable');
        for (let obj of hidable) {
            let data = obj.getAttribute('data-hidable-attr');
            if (data == '' || data == 0) {
                if (editMode == false) {
                    obj.style.display = 'none';
                } else {
                    obj.style.display = '';
                }
            }
            //let hidableAttr = obj.getElementsByClassName('.hidable-attr');
        }
        if (editMode) {
            html.find('.show-on-edit').show();
            html.find('.hide-on-edit').hide();
            html.find('input').addClass('white-input');//.css('background', 'white');
            html.find('.saves-div').show();
            html.find('.skills-div').show();
        } else {
            html.find('.show-on-edit:not(.hidable)').hide();
            html.find('.hide-on-edit').show();
            html.find('input').removeClass('white-input');//.css('background', 'none');
            if (html.find('.saves-div .hidable[data-hidable-attr="1"]').length == 0) {
                html.find('.saves-div').hide();
            }
            if (html.find('.skills-div .hidable[data-hidable-attr="1"], .skills-div .hidable[data-hidable-attr="0.5"], .skills-div .hidable[data-hidable-attr="2"]').length == 0) {
                html.find('.skills-div').hide();
            }
        }
    }
    
    /**
    * Organize and classify Items for NPC sheets
    * @private
    */
    _prepareItems(actorData) {

        // Features
        const features = [];

        // Weapons
        const weapons = [];

        const legendarys = [];
        const reactions = [];
        const lair = [];

        const loot = [];

        // Powerbook
        const powerbook = {};

        // Iterate through items, allocating to containers
        for (let i of actorData.items) {
            i.img = i.img || DEFAULT_TOKEN;

            i.hasUses = i.data.uses && (i.data.uses.max > 0);
            i.isOnCooldown = i.data.recharge && !!i.data.recharge.value && (i.data.recharge.charged === false);

            // Powers
            if (i.type === "power") {


                if (!hasProperty(i, 'flags.swnpcsheet5e')) {
                    i.flags.swnpcsheet5e = {};
                }
                if (!hasProperty(i, 'flags.swnpcsheet5e.showItemSummary')) {
                    i.flags.swnpcsheet5e.showItemSummary = game.settings.get("swnpcsheet5e", "expandPowers");
                }

                let lvl = i.data.level || 0;
                let section = lvl;
                let sectionLabel = CONFIG.SW5E.powerLevels[lvl];
                let isCantrip = lvl === 0 ? true : false;
                switch (i.data.preparation.mode) {
                    case 'always':
                        section = 'always';
                        sectionLabel = 'At Will';
                        isCantrip = true; break;
                    case 'innate':
                        section = 'innate';
                        sectionLabel = 'Innate Powercasting';
                        isCantrip = true; break;
                    case 'pact':
                        section = 'pact';
                        sectionLabel = 'Pact';
                        isCantrip = true; break;
                }
                let uses = {
                    value: 0,
                    max:0
                }
                if (!isCantrip) {
                    uses.value = actorData.data.powers["power" + lvl].value;
                    uses.max = actorData.data.powers["power" + lvl].max;
                    if (actorData.data.powers["power" + lvl].override) uses.override = actorData.data.powers["power" + lvl].override;
                }
                powerbook[section] = powerbook[section] || {
                    isCantrip: isCantrip,
                    label: sectionLabel,
                    powers: [],
                    uses: uses
                };
                //i.data.school.str = CONFIG.SW5E.powerSchools[i.data.school.value];
                powerbook[section].powers.push(i);
                continue;
            }


            // Features
            let flag = getProperty(i, 'flags.asw5e.itemInfo.type');
            switch (flag) {
                case 'feat': features.push(i); break;
                case 'action': weapons.push(i); break;
                case 'legendary': legendarys.push(i); break;
                case 'reaction': reactions.push(i); break;
                case 'lair': lair.push(i); break;
                case 'loot': loot.push(i); break;
                default: {
                    let type = getProperty(i, 'data.activation.type');
                    switch (type) {
                        case "legendary": legendarys.push(i); continue;
                        case "lair": lair.push(i); continue;
                        case "action": weapons.push(i); continue;
                        default: {
                            if (i.type === "weapon") weapons.push(i);
                            else if (i.type === "feat") features.push(i);
                            else if (i.type === "loot") loot.push(i);
                            else if (["equipment", "consumable", "tool", "backpack"].includes(i.type)) features.push(i);
                            }
                        }
                    }
            }
        }

        let expandItem = game.settings.get("swnpcsheet5e", "expandFeats");
        for (let i of features) {
            if (!hasProperty(i, 'flags.swnpcsheet5e')) {
                i.flags.swnpcsheet5e = {};
            }
            if (!hasProperty(i, 'flags.swnpcsheet5e.showItemSummary')) {
                i.flags.swnpcsheet5e.showItemSummary = expandItem;
            }
        }
        expandItem = game.settings.get("swnpcsheet5e", "expandAttacks");
        for (let i of weapons) {
            if (!hasProperty(i, 'flags.swnpcsheet5e')) {
                i.flags.swnpcsheet5e = {};
            }
            if (!hasProperty(i, 'flags.swnpcsheet5e.showItemSummary')) {
                i.flags.swnpcsheet5e.showItemSummary = expandItem;
            }
        }

        expandItem = game.settings.get("swnpcsheet5e", "expandReactions");
        for (let i of reactions) {
            if (!hasProperty(i, 'flags.swnpcsheet5e')) {
                i.flags.swnpcsheet5e = {};
            }
            if (!hasProperty(i, 'flags.swnpcsheet5e.showItemSummary')) {
                i.flags.swnpcsheet5e.showItemSummary = expandItem;
            }
        }

        expandItem = game.settings.get("swnpcsheet5e", "expandLegendary");
        for (let i of legendarys) {
            if (!hasProperty(i, 'flags.swnpcsheet5e')) {
                i.flags.swnpcsheet5e = {};
            }
            if (!hasProperty(i, 'flags.swnpcsheet5e.showItemSummary')) {
                i.flags.swnpcsheet5e.showItemSummary = expandItem;
            }
        }

        expandItem = game.settings.get("swnpcsheet5e", "expandLair");
        for (let i of lair) {
            if (!hasProperty(i, 'flags.swnpcsheet5e')) {
                i.flags.swnpcsheet5e = {};
            }
            if (!hasProperty(i, 'flags.swnpcsheet5e.showItemSummary')) {
                i.flags.swnpcsheet5e.showItemSummary = expandItem;
            }
        }

        expandItem = game.settings.get("swnpcsheet5e", "expandLoot");
        for (let i of loot) {
            if (!hasProperty(i, 'flags.swnpcsheet5e')) {
                i.flags.swnpcsheet5e = {};
            }
            if (!hasProperty(i, 'flags.swnpcsheet5e.showItemSummary')) {
                i.flags.swnpcsheet5e.showItemSummary = expandItem;
            }
        }

        // Assign the items
        let sections = [
            { label: game.i18n.localize('SW5E.Features'), name: 'feat', type:'feat', isFeat: true, items: features },
            { label: game.i18n.localize('SW5E.Actions'), name: 'action', type: 'weapon', isAction: true, items: weapons },
            { label: game.i18n.localize('SW5E.LegAct'), name: 'legendary', type: 'feat', isLegendary: true, items: legendarys },
            { label: game.i18n.localize('SW5E.Reactions'), name: 'reaction', type: 'feat', isReaction: true, items: reactions },
            { label: game.i18n.localize('SW5E.LairActs'), name: 'lair', type: 'feat', isLair: true, items: lair },
            { label: game.i18n.localize('SW5E.Loot'), name: 'loot', type: 'loot', isLoot: true, items: loot }
        ];
        actorData.actor.powerbook = powerbook;
        actorData.actor.sections = sections;
    }

    async _onDropItem(event, data) {
        if (data.actorId !== this.object.id || data.data === undefined) {
            return super._onDropItem(event, data);
        }
        let typeFlag = data.data.flags ?.asw5e ?.itemInfo ?.type;
        let targetTile = $(event.toElement).parents('.body-tile');
        let targetType = targetTile.length > 0 ? targetTile[0].dataset.tile : '';
        
        if (targetType && targetType.indexOf('power') === -1 && targetType !== typeFlag) {
            let item = this.actor.getOwnedItem(data.data._id);
            item.update({ 'flags.asw5e.itemInfo.type': targetType });
        } else {
            super._onDropItem(event, data);
        }
    }

    _onItemCreate(event) {
        event.preventDefault();

        let itemTypeLabel = $(event.target).parents('.body-tile').attr('data-tile');
        let header = event.currentTarget;
        let itemType = $(event.currentTarget).parents('.body-tile').children('.npc-item-create').attr('data-type');
        let data = {};
        data = {
            type: header.dataset.type,
            data: {},
            flags: {
                'asw5e': {
                    'itemInfo': {
                        'type': itemTypeLabel
                    }
                }
            }
        }
        data["name"] = `New ${itemTypeLabel.capitalize()}`;
        if (itemTypeLabel === 'legendary' || itemTypeLabel === 'lair') {
            data["name"] += ' Action';
        }
        this.actor.createOwnedItem(data); // , { renderSheet: true } adding that back in once the core functionality has been fixed
    }

    _onSortItem(event, itemData) {
        // TODO - for now, don't allow sorting for Token Actor ovrrides
        if (this.actor.isToken) return;

        // Get the drag source and its siblings
        const source = this.actor.getOwnedItem(itemData._id);
        const siblings = this._getSortSiblings(source);
        // Get the drop target
        const dropTarget = event.target.closest(".item");
        const targetId = dropTarget ? dropTarget.dataset.itemId : null;
        const target = siblings.find(s => s.data._id === targetId);
        
        // Perform the sort
        const sortUpdates = SortingHelpers.performIntegerSort(source, { target: target, siblings });
        const updateData = sortUpdates.map(u => {
            const update = u.update;
            update._id = u.target.data._id;
            return update;
        });

        // Perform the update
        return this.actor.updateEmbeddedEntity("OwnedItem", updateData);
    }

    _getSortSiblings(source) {
        if (source.data.type === 'power') {
            return super._getSortSiblings(source);
        }

        let sourceType = this._getItemType(source);

        return this.actor.items.filter(i => {
            let type = this._getItemType(i);
            return (sourceType === type) && (i.data._id !== source.data._id)
        });
    }

    _getItemType(item) {
        if (item.data.type === 'power') {
            return 'power'
        }
        let sourceType = getProperty(item.data, 'flags.asw5e.itemInfo.type');
        if (sourceType === undefined) {
            let activationType = getProperty(item.data, 'data.activation.type');
            switch (activationType) {
                case "legendary": sourceType = "legendary";
                case "lair": sourceType = "lair";
                case "action": sourceType = "action";
                case "reaction": sourceType = "reaction";
                default: {
                    if (item.data.type === "weapon") sourceType = "action";
                    else if (item.data.type === "feat") sourceType = "feat";
                    else if (item.data.type === "loot") sourceType = "loot";
                    else if (["equipment", "consumable", "tool", "backpack"].includes(item.data.type)) sourceType = "feat";
                }
            }
        }
        return sourceType;
    }

    toggleEditMoed() {
        if (this.editMode == true) {
            for (let obj of html.find('.hidable')) {
                if (obj.querySelector('.hidable-attr') != undefined &&
                    (obj.querySelector('.hidable-attr').value == '' || obj.querySelector('.hidable-attr').value == 0)) {
                    obj.style.display = "none";
                }
            }
            html.find('.show-on-edit').hide(100);
            html.find('.hide-on-edit').show(100);
            this.editMode = false;
        } else {
            for (let obj of html.find('.hidable')) {
                if (obj.querySelector('.hidable-attr') != undefined &&
                    (obj.querySelector('.hidable-attr').value == '' || obj.querySelector('.hidable-attr').value == 0)) {
                    obj.style.display = "inline-block";
                }
            }
            html.find('.show-on-edit').show(100);
            html.find('.hide-on-edit').hide(100);
            this.editMode = true;
        }
    }
}

Actors.registerSheet("sw5e", BetterNPCActor5eSheet, {
    types: ["npc"],
    makeDefault: true
});

Hooks.on('init', () => {
    loadTemplates(['modules/swnpcsheet5e/template/section.hbs']);
});

Hooks.on('ready',()=> {
    game.settings.register("swnpcsheet5e", "expandFeats", {
        name: game.i18n.localize("BNPCSheet.featSetting"),
        hint: game.i18n.localize("BNPCSheet.featSettingHelp"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });
    game.settings.register("swnpcsheet5e", "expandAttacks", {
        name: game.i18n.localize("BNPCSheet.attackSetting"),
        hint: game.i18n.localize("BNPCSheet.attackSettingHelp"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });
    game.settings.register("swnpcsheet5e", "expandReactions", {
        name: game.i18n.localize("BNPCSheet.reactionSetting"),
        hint: game.i18n.localize("BNPCSheet.reactionSettingHelp"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });
    game.settings.register("swnpcsheet5e", "expandLegendary", {
        name: game.i18n.localize("BNPCSheet.legendarySetting"),
        hint: game.i18n.localize("BNPCSheet.legendarySettingHelp"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });
    game.settings.register("swnpcsheet5e", "expandLair", {
        name: game.i18n.localize("BNPCSheet.lairSetting"),
        hint: game.i18n.localize("BNPCSheet.lairSettingHelp"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });
    game.settings.register("swnpcsheet5e", "expandPowers", {
        name: game.i18n.localize("BNPCSheet.powersSetting"),
        hint: game.i18n.localize("BNPCSheet.powersSettingHelp"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });
    game.settings.register("swnpcsheet5e", "expandLoot", {
        name: game.i18n.localize("BNPCSheet.lootSetting"),
        hint: game.i18n.localize("BNPCSheet.lootSettingHelp"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });
});