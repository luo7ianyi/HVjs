// ==UserScript==
// @name         JPX NEXT
// @namespace    ijpx
// @version      26.11.01.01
// @description  jpx
// @run-at       document-end
// @match        *://*.hentaiverse.org/*
// @exclude      *hentaiverse.org/equip/*
// @exclude      *hentaiverse.org/isekai/equip/*
// @grant        unsafeWindow
// ==/UserScript==

// 声音提醒
let battleEndSoundPlayed = false;

const BATTLE_END_SOUNDS = {
    Victory: 'https://act-upload.mihoyo.com/sr-wiki/2023/10/28/91130434/182c2ddfa6f8d0904c17c9efc915b694_5922011063446068790.wav',
    Defeat:  'https://us-tuna-sounds-files.voicemod.net/8a77e560-c3a4-4b36-9893-1fade6924fb7-1659767099682.mp3',
    Flee:    'https://uploadstatic.mihoyo.com/ys-obc/2022/05/12/8797197/00f73cbe63fceb10b0e0d2d9f12bbcd8_185512756131729570.mp3'
};

function playBattleEndSound(result) {
    try {
        ensureCfgMissPink();
        let snd = cfgMissPink.soundReminder;
        if (!snd || !snd.enabled) return;

        let entry = snd.battleEnd?.[result];
        if (!entry || !entry.enabled || !entry.url) return;

        const audio = new Audio(entry.url);
        audio.volume = typeof snd.volume === 'number'
        ? Math.max(0, Math.min(1, snd.volume))
        : 0.7;
        audio.play().catch(e => console.error('播放结束提示音失败:', e));
    } catch (e) {
        console.error('播放结束提示音失败:', e);
    }
}

function getBattleResult() {
    if (log.innerHTML.includes('You are Victorious!') && roundInfo.current === roundInfo.total) {
        return 'Victory';
    } else if (log.innerHTML.includes('You have been defeated.')) {
        return 'Defeat';
    } else if (log.innerHTML.includes('You have escaped from the battle.')) {
        return 'Flee';
    }
    return null;
}
//

let cfgBattle = {};
let defaultCfgBattle = {
    "battleVersion": 20251216,
    "advanceToNextRound": false,
    "ajaxRound": false,
    "showCooldowns": false,
    "quickbarExtend": [],
    "showDurations": false,
    "showRealTimeProficiency": false,
    "showMonsterIndex": true,
    "showMonsterInfo": true,
    "showMonsterHP": true,
    "recordBattleLog": false,
    "dailyStaminaQuotaPlus": 0,
    "ctrlWidgetStyleText": [],
    "ctrlWidgetMouseEnter": false,
    "ctrlWidgetRows": [
        {"id":"isActiveBattle"},
        {"id":"readyNext"},
        {"id":"networkDelay"},
        {"id":"battleStyle"},
        {"id":"battleType"},
        {"id":"round"}
    ],
    "OneHanded_General": {
        "supports": [
            {"type":"item","name":"Spirit Gem","conditions":[{"key":"pSP","value":[0,0.9]}]},
            {"type":"item","name":"Spirit Potion","conditions":[{"key":"pSP","value":[0,0.5]}]},
            {"type":"item","name":"Last Elixir","conditions":[{"key":"pSP","value":[0,0.4]}]},
            {"type":"item","name":"Spirit Elixir","conditions":[{"key":"pSP","value":[0,0.4]}]},
            {"type":"stop","customMessage":"Can't use Spirit Elixir","conditions":[{"key":"pSP","value":[0,0.4]}]},
            {"type":"item","name":"Health Gem","conditions":[]},
            {"type":"spellSupport","name":"Cure","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"item","name":"Health Potion","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"spellSupport","name":"Full-Cure","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"item","name":"Health Elixir","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"stop","customMessage":"Can't use Health Elixir","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"item","name":"Mana Gem","conditions":[{"key":"pMP","value":[0,0.8]}]},
            {"type":"item","name":"Mana Potion","conditions":[{"key":"pMP","value":[0,0.4]}]},
            {"type":"item","name":"Mana Elixir","conditions":[{"key":"pMP","value":[0,0.2]}]},
            {"type":"stop","customMessage":"Can't use Mana Elixir","conditions":[{"key":"pMP","value":[0,0.2]}]},
            {"type":"item","name":"Mystic Gem","conditions":[{"key":"pIgnoredEffects","value":[0,9999,"Channeling"]}]},
            {"type":"spellSupport","name":"Heartseeker","conditions":[{"key":"pEffects","value":[0,9999,"Channeling"]},{"key":"pEffects","value":[-1,100,"Heartseeker"]}]},
            {"type":"spellSupport","name":"Regen","conditions":[{"key":"pEffects","value":[0,9999,"Channeling"]},{"key":"pEffects","value":[-1,50,"Regen"]}]},
            {"type":"toggle","name":"Spirit","toggled":true,"conditions":[{"key":"pOC","value":[6,10]}]},
            {"type":"spellSupport","name":"Heartseeker","conditions":[{"key":"pEffects","value":[-1,0,"Heartseeker"]}]},
            {"type":"spellSupport","name":"Regen","conditions":[{"key":"pEffects","value":[-1,0,"Regen"]}]},
            {"type":"item","name":"Health Draught","conditions":[{"key":"pEffects","value":[-1,0,"Regeneration"]},{"key":"monsters","value":[4,10]},{"key":"battleTypes","value":["Arena","Colosseum","Battle1000","Tower","Item"]}]},
            {"type":"item","name":"Mana Draught","conditions":[{"key":"pEffects","value":[-1,0,"Replenishment"]},{"key":"pMP","value":[0,0.85]},{"key":"battleTypes","value":["Arena","Colosseum","Battle1000","Tower","Item"]}]},
            {"type":"item","name":"Spirit Draught","conditions":[{"key":"pEffects","value":[-1,0,"Refreshment"]},{"key":"pSP","value":[0,0.9]},{"key":"battleTypes","value":["Arena","Colosseum","Battle1000","Tower","Item"]}]}
        ],
        "attacks": [
            {"type":"smartDebuff","name":"Weaken","targetCount":3,"tailSkip":0,"bottomUp":false,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tTypes","value":["Arena400","Arena500"],"offset":[0,0],"matched":[1,1]},{"key":"tIgnoredEffects","value":[1,9999,"Weakened"],"offset":[0,0],"matched":[1,1]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[{"key":"world","value":["Persistent"]},{"key":"tDaysSinceUpdate","value":[46,9999],"offset":[0,0],"matched":[1,1]},{"key":"tIgnoredEffects","value":[0,9999,"Imperiled","Searing Skin","Freezing Limbs","Turbulent Air","Deep Burns","Breached Defense","Blunted Attack"],"offset":[0,0],"matched":[1,1]}]},
            {"type":"skill","name":"Scan","conditions":[{"key":"pActionCounts","value":[0,0,"Scan"]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[{"key":"tName","value":"Yggdrasil","offset":[0,0],"matched":[1,1]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[{"key":"tTypes","value":["Rare","Legendary","Ultimate","Arena300","Arena400","Arena500"],"offset":[0,0],"matched":[1,1]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[]},
            {"type":"skill","name":"Orbital Friendship Cannon","conditions":[{"key":"activeMonsters","value":[6,10]},{"key":"pOC","value":[9,10]},{"key":"pSpiritStatus","value":true}]},
            {"type":"smartDebuff","name":"Imperil","targetCount":3,"bottomUp":false,"tailSkip":0,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Imperiled"],"offset":[0,0],"matched":[1,1]},{"key":"tTypes","value":["Rare","Legendary","Ultimate","Arena300","Arena400","Arena500"],"offset":[0,0],"matched":[1,1]}]},
            {"type":"smartDebuff","name":"Imperil","targetCount":3,"bottomUp":false,"tailSkip":-1,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Imperiled"],"offset":[0,0],"matched":[1,1]},{"key":"activeBosses","value":[0,0]}]},
            {"type":"skill","name":"Merciful Blow","conditions":[{"key":"tTypes","value":["Ultimate","Arena300","Arena400","Arena500"],"offset":[0,0],"matched":[1,1]},{"key":"tEffects","value":[0,9999,"Bleeding Wound"],"offset":[0,0],"matched":[1,1]},{"key":"tHP","value":[0.04,0.22],"offset":[0,0],"matched":[1,1]},{"key":"pOC","value":[4.5,10]}]},
            {"type":"skill","name":"Vital Strike","conditions":[{"key":"tTypes","value":["Ultimate","Arena300","Arena400","Arena500"],"offset":[0,0],"matched":[1,1]},{"key":"tEffects","value":[0,9999,"Stunned"],"offset":[0,0],"matched":[1,1]},{"key":"tHP","value":[0.05,1],"offset":[0,0],"matched":[1,1]},{"key":"pOC","value":[2.5,10]}]},
            {"type":"normalAttack"}
        ]
    },
    "OneHanded_Tower": {
        "supports": [
            {"type":"item","name":"Spirit Gem","conditions":[{"key":"pSP","value":[0,0.9]}]},
            {"type":"item","name":"Spirit Potion","conditions":[{"key":"pSP","value":[0,0.6]}]},
            {"type":"item","name":"Last Elixir","conditions":[{"key":"pSP","value":[0,0.6]}]},
            {"type":"item","name":"Spirit Elixir","conditions":[{"key":"pSP","value":[0,0.6]}]},
            {"type":"stop","customMessage":"Can't use Spirit Elixir","conditions":[{"key":"pSP","value":[0,0.6]}]},
            {"type":"item","name":"Health Gem","conditions":[]},
            {"type":"spellSupport","name":"Cure","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"item","name":"Health Potion","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"spellSupport","name":"Full-Cure","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"item","name":"Health Elixir","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"stop","customMessage":"Can't use Health Elixir","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"item","name":"Mana Gem","conditions":[{"key":"pMP","value":[0,0.8]}]},
            {"type":"item","name":"Mana Potion","conditions":[{"key":"pMP","value":[0,0.4]}]},
            {"type":"item","name":"Mana Elixir","conditions":[{"key":"pMP","value":[0,0.2]}]},
            {"type":"stop","customMessage":"Can't use Mana Elixir","conditions":[{"key":"pMP","value":[0,0.2]}]},
            {"type":"item","name":"Mystic Gem","conditions":[{"key":"pIgnoredEffects","value":[0,9999,"Channeling"]}]},
            {"type":"spellSupport","name":"Heartseeker","conditions":[{"key":"pEffects","value":[0,9999,"Channeling"]},{"key":"pEffects","value":[-1,100,"Heartseeker"]}]},
            {"type":"spellSupport","name":"Regen","conditions":[{"key":"pEffects","value":[0,9999,"Channeling"]},{"key":"pEffects","value":[-1,50,"Regen"]}]},
            {"type":"toggle","name":"Spirit","toggled":true,"conditions":[{"key":"pOC","value":[6,10]},{"key":"defeatedMonsters","value":[1,10]}]},
            {"type":"spellSupport","name":"Heartseeker","conditions":[{"key":"pEffects","value":[-1,0,"Heartseeker"]}]},
            {"type":"spellSupport","name":"Regen","conditions":[{"key":"pEffects","value":[-1,0,"Regen"]}]},
            {"type":"item","name":"Health Draught","conditions":[{"key":"pEffects","value":[-1,0,"Regeneration"]},{"key":"monsters","value":[4,10]}]},
            {"type":"item","name":"Mana Draught","conditions":[{"key":"pEffects","value":[-1,0,"Replenishment"]},{"key":"pMP","value":[0,0.85]}]},
            {"type":"item","name":"Spirit Draught","conditions":[{"key":"pEffects","value":[-1,0,"Refreshment"]},{"key":"pSP","value":[0,0.9]}]}
        ],
        "attacks": [
            {"type":"smartDebuff","targetCount":3,"name":"Sleep","bottomUp":true,"tailSkip":1,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Asleep"],"offset":[0,0],"matched":[1,1]},{"key":"roundCurrent","value":[0,9999]},{"key":"floor","value":[36,9999]}]},
            {"type":"smartDebuff","targetCount":3,"name":"Weaken","bottomUp":false,"tailSkip":0,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Weakened","Asleep"],"offset":[0,0],"matched":[1,1]},{"key":"roundCurrent","value":[10,9999]},{"key":"floor","value":[40,9999]}]},
            {"type":"smartDebuff","targetCount":3,"name":"Silence","bottomUp":true,"tailSkip":0,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Asleep","Silenced"],"offset":[0,0],"matched":[1,1]},{"key":"roundCurrent","value":[15,9999]},{"key":"floor","value":[40,9999]}]},
            {"type":"smartDebuff","targetCount":3,"name":"Imperil","bottomUp":false,"tailSkip":-1,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Imperiled"],"offset":[0,0],"matched":[1,1]},{"key":"roundCurrent","value":[0,9999]},{"key":"floor","value":[40,9999]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[]},
            {"type":"toggle","name":"Spirit","toggled":true,"conditions":[{"key":"pOC","value":[6,10]}]},
            {"type":"skill","name":"Merciful Blow","conditions":[{"key":"tEffects","value":[0,9999,"Bleeding Wound"],"offset":[0,0],"matched":[1,1]},{"key":"tHP","value":[0.04,0.22],"offset":[0,0],"matched":[1,1]},{"key":"pOC","value":[4.5,10]},{"key":"roundCurrent","value":[0,9999]},{"key":"floor","value":[95,9999]}]},
            {"type":"skill","name":"Vital Strike","conditions":[{"key":"tEffects","value":[0,9999,"Stunned"],"offset":[0,0],"matched":[1,1]},{"key":"tHP","value":[0.05,1],"offset":[0,0],"matched":[1,1]},{"key":"pOC","value":[2.5,10]},{"key":"pSpiritStatus","value":true},{"key":"roundCurrent","value":[0,9999]},{"key":"floor","value":[60,9999]}]},
            {"type":"normalAttack"}
        ]
    },
    "1H_Mage_General": {
        "supports": [

        ],
        "attacks": [

        ]
    },
    "TwoHanded_General": {
        "supports": [

        ],
        "attacks": [

        ]
    },
    "2H_Mage_General": {
        "supports": [

        ],
        "attacks": [

        ]
    },
    "DualWielding_General": {
        "supports": [

        ],
        "attacks": [

        ]
    },
    "DW_Mage_General": {
        "supports": [

        ],
        "attacks": [

        ]
    },
    "NitenIchiryu_General": {
        "supports": [

        ],
        "attacks": [

        ]
    },
    "NI_Mage_General": {
        "supports": [

        ],
        "attacks": [

        ]
    },
    "Staff_General": {
        "supports": [
            {"type":"item","name":"Spirit Gem","conditions":[{"key":"pSP","value":[0,0.9]}]},
            {"type":"item","name":"Spirit Potion","conditions":[{"key":"pSP","value":[0,0.5]}]},
            {"type":"item","name":"Last Elixir","conditions":[{"key":"pSP","value":[0,0.4]}]},
            {"type":"item","name":"Spirit Elixir","conditions":[{"key":"pSP","value":[0,0.4]}]},
            {"type":"stop","customMessage":"Can't use Spirit Elixir","conditions":[{"key":"pSP","value":[0,0.4]}]},
            {"type":"item","name":"Health Gem","conditions":[]},
            {"type":"spellSupport","name":"Cure","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"item","name":"Health Potion","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"spellSupport","name":"Full-Cure","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"item","name":"Health Elixir","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"stop","customMessage":"Can't use Health Elixir","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"item","name":"Mana Gem","conditions":[{"key":"pMP","value":[0,0.8]}]},
            {"type":"item","name":"Mana Potion","conditions":[{"key":"pMP","value":[0,0.4]}]},
            {"type":"item","name":"Mana Elixir","conditions":[{"key":"pMP","value":[0,0.2]}]},
            {"type":"stop","customMessage":"Can't use Mana Elixir","conditions":[{"key":"pMP","value":[0,0.2]}]},
            {"type":"item","name":"Mystic Gem","conditions":[{"key":"pIgnoredEffects","value":[0,9999,"Channeling"]}]},
            {"type":"spellSupport","name":"Arcane Focus","conditions":[{"key":"pEffects","value":[0,9999,"Channeling"]},{"key":"pEffects","value":[-1,100,"Arcane Focus"]}]},
            {"type":"spellSupport","name":"Regen","conditions":[{"key":"pEffects","value":[0,9999,"Channeling"]},{"key":"pEffects","value":[-1,50,"Regen"]}]},
            {"type":"spellSupport","name":"Arcane Focus","conditions":[{"key":"pEffects","value":[-1,0,"Arcane Focus"]}]},
            {"type":"spellSupport","name":"Regen","conditions":[{"key":"pEffects","value":[-1,0,"Regen"]}]},
            {"type":"item","name":"Health Draught","conditions":[{"key":"pEffects","value":[-1,0,"Regeneration"]},{"key":"monsters","value":[4,10]},{"key":"battleTypes","value":["Arena","Colosseum","Battle1000","Tower","Item"]}]},
            {"type":"item","name":"Mana Draught","conditions":[{"key":"pEffects","value":[-1,0,"Replenishment"]},{"key":"pMP","value":[0,0.85]},{"key":"battleTypes","value":["Arena","Colosseum","Battle1000","Tower","Item"]}]},
            {"type":"item","name":"Spirit Draught","conditions":[{"key":"pEffects","value":[-1,0,"Refreshment"]},{"key":"pSP","value":[0,0.9]},{"key":"battleTypes","value":["Arena","Colosseum","Battle1000","Tower","Item"]}]}
        ],
        "attacks": [
            {"type":"smartDebuff","targetCount":3,"name":"Weaken","bottomUp":false,"tailSkip":0,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Weakened"],"offset":[0,0],"matched":[1,1]},{"key":"tTypes","value":["Arena400","Arena500"],"offset":[0,0],"matched":[1,1]}]},
            {"type":"smartDebuff","targetCount":3,"name":"Silence","bottomUp":false,"tailSkip":0,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Silenced"],"offset":[0,0],"matched":[1,1]},{"key":"tTypes","value":["Arena400","Arena500"],"offset":[0,0],"matched":[1,1]}]},
            {"type":"smartDebuff","targetCount":3,"name":"Imperil","bottomUp":false,"tailSkip":0,"maxAtFirst":3,"minMonstersLeft":5,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Imperiled"],"offset":[0,0],"matched":[1,1]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[{"key":"tDaysSinceUpdate","value":[46,9999],"offset":[0,0],"matched":[1,1]},{"key":"tIgnoredEffects","value":[0,9999,"Imperiled","Searing Skin","Freezing Limbs","Turbulent Air","Deep Burns","Breached Defense","Blunted Attack"],"offset":[0,0],"matched":[1,1]}]},
            {"type":"skill","name":"Scan","conditions":[{"key":"pActionCounts","value":[0,0,"Scan"]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[{"key":"tName","value":"Yggdrasil","offset":[0,0],"matched":[1,1]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[{"key":"tEffects","value":[0,9999,"Imperiled","Coalesced Mana"],"offset":[0,0],"matched":[1,1]},{"key":"tTypes","value":["Rare","Legendary","Ultimate","Arena300","Arena400","Arena500"],"offset":[0,0],"matched":[1,1]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[{"key":"tEffects","value":[0,9999,"Coalesced Mana"],"offset":[0,0],"matched":[1,1]},{"key":"tTypes","value":["Rare","Legendary","Ultimate","Arena300","Arena400","Arena500"],"offset":[0,0],"matched":[1,1]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[{"key":"tEffects","value":[0,9999,"Imperiled","Coalesced Mana"],"offset":[0,0],"matched":[1,1]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[{"key":"tEffects","value":[0,9999,"Imperiled"],"offset":[0,0],"matched":[1,1]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[]},
            {"type":"spellDamage","name":"T3","conditions":[{"key":"activeMonsters","value":[2,10]}]},
            {"type":"spellDamage","name":"T2","conditions":[{"key":"activeMonsters","value":[2,10]}]},
            {"type":"spellDamage","name":"T1","conditions":[{"key":"activeMonsters","value":[2,10]}]},
            {"type":"spellDamage","name":"T3","conditions":[{"key":"pMP","value":[0.2,1]}]},
            {"type":"spellDamage","name":"T2","conditions":[{"key":"pMP","value":[0.2,1]}]},
            {"type":"spellDamage","name":"T1","conditions":[{"key":"pMP","value":[0.2,1]}]},
            {"type":"normalAttack"}
        ]
    },
    "Unarmed_General": {
        "supports": [
            {"type":"item","name":"Spirit Gem","conditions":[{"key":"pSP","value":[0,0.9]}]},
            {"type":"item","name":"Spirit Potion","conditions":[{"key":"pSP","value":[0,0.6]}]},
            {"type":"item","name":"Last Elixir","conditions":[{"key":"pSP","value":[0,0.6]}]},
            {"type":"item","name":"Spirit Elixir","conditions":[{"key":"pSP","value":[0,0.6]}]},
            {"type":"stop","customMessage":"Can't use Spirit Elixir","conditions":[{"key":"pSP","value":[0,0.6]}]},
            {"type":"item","name":"Health Gem","conditions":[]},
            {"type":"spellSupport","name":"Cure","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"item","name":"Health Potion","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"spellSupport","name":"Full-Cure","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"item","name":"Health Elixir","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"stop","customMessage":"Can't use Health Elixir","conditions":[{"key":"pHP","value":[0,0.4]}]},
            {"type":"item","name":"Mana Gem","conditions":[{"key":"pMP","value":[0,0.8]}]},
            {"type":"item","name":"Mana Potion","conditions":[{"key":"pMP","value":[0,0.4]}]},
            {"type":"item","name":"Mana Elixir","conditions":[{"key":"pMP","value":[0,0.2]}]},
            {"type":"stop","customMessage":"Can't use Mana Elixir","conditions":[{"key":"pMP","value":[0,0.2]}]},
            {"type":"item","name":"Mystic Gem","conditions":[{"key":"pIgnoredEffects","value":[0,9999,"Channeling"]}]},
            {"type":"spellSupport","name":"Heartseeker","conditions":[{"key":"pEffects","value":[0,9999,"Channeling"]},{"key":"pEffects","value":[-1,100,"Heartseeker"]}]},
            {"type":"spellSupport","name":"Regen","conditions":[{"key":"pEffects","value":[0,9999,"Channeling"]},{"key":"pEffects","value":[-1,50,"Regen"]}]},
            {"type":"toggle","name":"Spirit","toggled":true,"conditions":[{"key":"pOC","value":[6,10]},{"key":"defeatedMonsters","value":[1,10]}]},
            {"type":"spellSupport","name":"Heartseeker","conditions":[{"key":"pEffects","value":[-1,0,"Heartseeker"]}]},
            {"type":"spellSupport","name":"Regen","conditions":[{"key":"pEffects","value":[-1,0,"Regen"]}]},
            {"type":"item","name":"Health Draught","conditions":[{"key":"pEffects","value":[-1,0,"Regeneration"]},{"key":"monsters","value":[4,10]}]},
            {"type":"item","name":"Mana Draught","conditions":[{"key":"pEffects","value":[-1,0,"Replenishment"]},{"key":"pMP","value":[0,0.85]}]},
            {"type":"item","name":"Spirit Draught","conditions":[{"key":"pEffects","value":[-1,0,"Refreshment"]},{"key":"pSP","value":[0,0.9]}]}
        ],
        "attacks": [
            {"type":"smartDebuff","targetCount":3,"name":"Sleep","bottomUp":true,"tailSkip":1,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Asleep"],"offset":[0,0],"matched":[1,1]},{"key":"roundCurrent","value":[0,9999]},{"key":"floor","value":[36,9999]}]},
            {"type":"smartDebuff","targetCount":3,"name":"Weaken","bottomUp":false,"tailSkip":0,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Weakened","Asleep"],"offset":[0,0],"matched":[1,1]},{"key":"roundCurrent","value":[10,9999]},{"key":"floor","value":[40,9999]}]},
            {"type":"smartDebuff","targetCount":3,"name":"Silence","bottomUp":true,"tailSkip":0,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Asleep","Silenced"],"offset":[0,0],"matched":[1,1]},{"key":"roundCurrent","value":[15,9999]},{"key":"floor","value":[40,9999]}]},
            {"type":"smartDebuff","targetCount":3,"name":"Imperil","bottomUp":false,"tailSkip":-1,"maxAtFirst":10,"minMonstersLeft":10,"conditions":[{"key":"tIgnoredEffects","value":[1,9999,"Imperiled"],"offset":[0,0],"matched":[1,1]},{"key":"roundCurrent","value":[0,9999]},{"key":"floor","value":[40,9999]}]},
            {"type":"target","priorityRule":"Top Down","conditions":[]},
            {"type":"toggle","name":"Spirit","toggled":true,"conditions":[{"key":"pOC","value":[6,10]}]},
            {"type":"skill","name":"Merciful Blow","conditions":[{"key":"tEffects","value":[0,9999,"Bleeding Wound"],"offset":[0,0],"matched":[1,1]},{"key":"tHP","value":[0.04,0.22],"offset":[0,0],"matched":[1,1]},{"key":"pOC","value":[4.5,10]},{"key":"roundCurrent","value":[0,9999]},{"key":"floor","value":[95,9999]}]},
            {"type":"skill","name":"Vital Strike","conditions":[{"key":"tEffects","value":[0,9999,"Stunned"],"offset":[0,0],"matched":[1,1]},{"key":"tHP","value":[0.05,1],"offset":[0,0],"matched":[1,1]},{"key":"pOC","value":[2.5,10]},{"key":"pSpiritStatus","value":true},{"key":"roundCurrent","value":[0,9999]},{"key":"floor","value":[60,9999]}]},
            {"type":"normalAttack"}
        ]
    },
};
let cfgStats = {};
let defaultCfgStats = {
    "statsVersion": 20260109,
    "darkMode": false,
    "combatRows": [
        {"id":"fire"},
        {"id":"cold"},
        {"id":"wind"},
        {"id":"elec"},
        {"id":"holy"},
        {"id":"dark"},
        {"id":"crushing","s_pt":"background-color: #ff6a6a;"},
        {"id":"slashing","s_pt":"background-color: #ff6a6a;"},
        {"id":"piercing","s_pt":"background-color: #ff6a6a;"},
        {"id":"void"},
        {"id":"damagePlus"},
        {"id":"damageTotal"},
        {"id":"glance","s_pt":"background-color: #e58a8a;"},
        {"id":"hit","s_pt":"background-color: #e58a8a;"},
        {"id":"crit","s_pt":"background-color: #e58a8a;"},
        {"id":"miss","s_pt":"background-color: #66cc33;"},
        {"id":"evade","s_pt":"background-color: #66cc33;"},
        {"id":"parry","s_pt":"background-color: #66cc33;"},
        {"id":"resist","s_md":"background-color: #8f7ee6;"},
        {"id":"block","s_pt":"background-color: #66cc33;"},
        {"id":"resultTotal"},
        {"id":"parryPartially","s_pt":"background-color: #9fd67a;"},
        {"id":"resistPartially","s_md":"background-color: #b5a8f2;"},
        {"id":"blockPartially","s_pt":"background-color: #9fd67a;"}
    ],
    "revenueRows": [
        {"id":"exp"},
        {"id":"proficiency"},
        {"id":"credit","styleText":"color: #a89000;"},
        {"id":"equipment","styleText":"color: #f00;"},
        {"id":"material","styleText":"color: #f00;"},
        {"id":"consumable","styleText":"color: #00b000;"},
        {"id":"token","styleText":"color: #3a7540;"},
        {"id":"food","styleText":"color: #489eff;"},
        {"id":"figurine","styleText":"color: #25f;"},
        {"id":"artifact","styleText":"color: #25f;"},
        {"id":"trophy","styleText":"color: #7c4bff;"},
        {"id":"crystal","styleText":"color: #ba05b4;"},
        {"id":"crystalTotal","styleText":"color: #ba05b4;"},
        {"id":"totalProfit"},
        {"id":"stamina"},
        {"id":"finalProfit"}
    ],
    "statsColumns": [
        {"id":"date"},
        {"id":"world"},
        {"id":"level"},
        {"id":"persona"},
        {"id":"battleType"},
        {"id":"round"},
        {"id":"deltaTime"},
        {"id":"turns"},
        {"id":"tps"},
        {"id":"finalProfit"},
        {"id":"credit"},
        {"id":"eqP"},
        {"id":"eqL"},
        {"id":"eqM"},
        {"id":"cha"},
        {"id":"blo"},
        {"id":"food"},
        {"id":"fig"},
        {"id":"arti"},
        {"id":"crys"},
        {"id":"t2"},
        {"id":"t36"},
        {"id":"lCharm"},
        {"id":"gCharm"},
        {"id":"seed"},
        {"id":"hd"},
        {"id":"md"},
        {"id":"sd"},
        {"id":"hp"},
        {"id":"mp"},
        {"id":"sp"},
        {"id":"he"},
        {"id":"me"},
        {"id":"se"},
        {"id":"le"},
        {"id":"swif"},
        {"id":"prot"},
        {"id":"avat"},
        {"id":"abso"},
        {"id":"shad"},
        {"id":"life"},
        {"id":"gods"},
        {"id":"staminaCost"},
        {"id":"totalProfit"}
    ]
};
let cfgMissPink = {};
let cfgMissPinkInited = false;

let defaultCfgMissPink = {
    misspinkVersion: 202610250002,   // ← 升级版本号，让旧占位结构被重建

    // 📢语音提醒（保持不变）
    soundReminder: {
        enabled: true,
        volume: 0.7,
        battleEnd: {
            Victory: {
                enabled: true,
                url: 'https://act-upload.mihoyo.com/sr-wiki/2023/10/28/91130434/182c2ddfa6f8d0904c17c9efc915b694_5922011063446068790.wav',
            },
            Defeat: {
                enabled: true,
                url: 'https://us-tuna-sounds-files.voicemod.net/8a77e560-c3a4-4b36-9893-1fade6924fb7-1659767099682.mp3',
            },
            Flee: {
                enabled: true,
                url: 'https://uploadstatic.mihoyo.com/ys-obc/2022/05/12/8797197/00f73cbe63fceb10b0e0d2d9f12bbcd8_185512756131729570.mp3',
            },
        },
    },

    // 🎨外观（占位，待实现）
    appearance: {
        enabled: false,

        // 🎛️脚本内（仅作用于 jpx 设置窗口）
        scriptPanel: {
            titleBarBg: '#66ccff',
            titleBarBgAlpha: 0.95,
            titleBarTextColor: '#ffffff',
            contentBg: '#ffffff',
            contentBgAlpha: 0.85,
            contentTextColor: '#000000',
            configButtonX: 1238,
            configButtonY: 4,
        },

        // 🌍全局按钮
        globalButton: {
            textColor: '',        // 空 = 不修改
            bgColor: '',
            borderColor: '',
            borderRadius: '',     // 数字（px），空 = 不修改
            theme: 'classic',     // default | 3d | material | classic
        },
        ctrlWidget: {
            theme: 'default',
            separator: ' | ',
            colorAuto: '#44ff44',      // 自动时颜色（绿）
            colorError: '#ffff55',     // 错误时颜色（黄）
            colorManual: '#ffffff',    // 不在自动时颜色（白）
        },
    },
};
function ensureCfgMissPink() {
    if (cfgMissPinkInited) return cfgMissPink;

    let stored = {};
    try {
        stored = JSON.parse(localStorage.getItem(prefix + 'cfgMissPink' + isekaiSuffix) || '{}');
    } catch (err) {
        stored = {};
    }
    mergeCfg(stored, defaultCfgMissPink, cfgMissPink, 'misspink');
    jpxUtils.deepFillMissing(cfgMissPink, defaultCfgMissPink);
    cfgMissPinkInited = true;
    return cfgMissPink;
}

function hexToRgba(hex, alpha) {
    if (!hex) return '';
    if (typeof alpha !== 'number' || isNaN(alpha)) alpha = 1;
    alpha = Math.max(0, Math.min(1, alpha));
    let h = String(hex).trim().replace(/^#/, '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return '';
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}
function _hexToRgb(hex) {
    let h = String(hex || '').replace(/^#/, '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

function _rgbToHex({ r, g, b }) {
    const to = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return '#' + to(r) + to(g) + to(b);
}

// amount > 0：向白色混合；amount < 0：向黑色混合；范围 -1 ~ 1
function _shade(hex, amount) {
    const rgb = _hexToRgb(hex);
    if (!rgb) return hex;
    if (amount >= 0) {
        return _rgbToHex({
            r: rgb.r + (255 - rgb.r) * amount,
                         g: rgb.g + (255 - rgb.g) * amount,
                         b: rgb.b + (255 - rgb.b) * amount,
        });
    }
    const k = 1 + amount;
    return _rgbToHex({ r: rgb.r * k, g: rgb.g * k, b: rgb.b * k });
}

function _isLight(hex) {
    const rgb = _hexToRgb(hex);
    if (!rgb) return true;
    return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 > 0.5;
}

function applyAppearance() {
    ensureCfgMissPink();

    let styleEl = document.getElementById('jpx-appearance-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'jpx-appearance-style';
        document.head.appendChild(styleEl);
    }

    let css = '';
    let ap = cfgMissPink.appearance;

    if (ap && ap.enabled) {
        // ===== 🎛️脚本内 =====
        let sp = ap.scriptPanel || {};
        let titleBg = hexToRgba(sp.titleBarBg, sp.titleBarBgAlpha ?? 1);
        let contentBg = hexToRgba(sp.contentBg, sp.contentBgAlpha ?? 1);

        css += `#settings-title-bar {`;
            if (titleBg) css += `background-color: ${titleBg} !important;`;
            if (sp.titleBarTextColor) css += `color: ${sp.titleBarTextColor} !important;`;
            css += `}\n`;

            css += `#settings-content {`;
                if (contentBg) css += `background-color: ${contentBg} !important;`;
                if (sp.contentTextColor) css += `color: ${sp.contentTextColor} !important;`;
                css += `}\n`;

                // 让 settings-container 透明，否则 content 透明度看不出效果
                css += `#settings-container { background: transparent !important; }\n`;

                // 配置按钮位置
                let cbX = sp.configButtonX;
                let cbY = sp.configButtonY;
                if ((typeof cbX === 'number' && !isNaN(cbX)) || (typeof cbY === 'number' && !isNaN(cbY))) {
                    css += `.JPXconfigButton_mp {`;
                        if (typeof cbX === 'number' && !isNaN(cbX)) css += `left: ${cbX}px !important;`;
                        if (typeof cbY === 'number' && !isNaN(cbY)) css += `top: ${cbY}px !important;`;
                        css += `}\n`;
                }

                // ===== 🌍全局按钮 =====
                let gb = ap.globalButton || {};
                let theme = gb.theme || 'default';

                switch (theme) {
                    case '3d':
                        css += `
                        input[type="submit"], input[type="button"], button {
                            background-image: linear-gradient(to bottom, #f8f8f8 0%, #e0e0e0 50%, #c8c8c8 100%) !important;
                            border: 1px solid #999 !important;
                            box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 3px rgba(0,0,0,0.2) !important;
                            text-shadow: 0 1px 0 rgba(255,255,255,0.6) !important;
                            transition: all 0.1s ease !important;
                        }
                        input[type="submit"]:hover, input[type="button"]:hover, button:hover {
                            background-image: linear-gradient(to bottom, #ffffff 0%, #f0f0f0 50%, #d8d8d8 100%) !important;
                        }
                        input[type="submit"]:active, input[type="button"]:active, button:active {
                            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3) !important;
                            background-image: linear-gradient(to bottom, #c8c8c8 0%, #d8d8d8 50%, #e0e0e0 100%) !important;
                        }
                        `;
                        break;
                    case 'material':
                        css += `
                        input[type="submit"], input[type="button"], button {
                            background-color: #6200ee !important;
                            color: #ffffff !important;
                            border: none !important;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                            text-transform: uppercase !important;
                            letter-spacing: 0.5px !important;
                            transition: all 0.2s ease !important;
                        }
                        input[type="submit"]:hover, input[type="button"]:hover, button:hover {
                            background-color: #7c43f0 !important;
                            box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
                        }
                        input[type="submit"]:active, input[type="button"]:active, button:active {
                            background-color: #4a00b0 !important;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
                        }
                        `;
                        break;
                    case 'classic':
                        css += `
                        input[type="submit"], input[type="button"], button {
                            background-color: #d4d0c8 !important;
                            color: #000 !important;
                            border-top: 1px solid #ffffff !important;
                            border-left: 1px solid #ffffff !important;
                            border-right: 1px solid #404040 !important;
                            border-bottom: 1px solid #404040 !important;
                            box-shadow: inset 1px 1px 0 #e8e5e0, inset -1px -1px 0 #808080 !important;
                            border-radius: 0 !important;
                            font-family: 'MS Sans Serif', 'Microsoft Sans Serif', sans-serif !important;
                        }
                        input[type="submit"]:active, input[type="button"]:active, button:active {
                            border-top: 1px solid #404040 !important;
                            border-left: 1px solid #404040 !important;
                            border-right: 1px solid #ffffff !important;
                            border-bottom: 1px solid #ffffff !important;
                            box-shadow: inset 1px 1px 0 #808080 !important;
                        }
                        `;
                        break;
                }

                // 用户颜色 / 圆角覆盖（放在主题之后，优先级更高）
                let override = '';
                if (gb.textColor) override += `color: ${gb.textColor} !important;`;
                if (gb.bgColor) override += `background-color: ${gb.bgColor} !important; background-image: none !important;`;
                if (gb.borderColor) override += `border-color: ${gb.borderColor} !important;`;
                if (gb.borderRadius !== '' && gb.borderRadius != null && !isNaN(+gb.borderRadius)) {
                    override += `border-radius: ${+gb.borderRadius}px !important;`;
                }
                if (override) {
                    css += `input[type="submit"], input[type="button"], button { ${override} }\n`;
                }
    }
    // ===== 🍳战斗中状态面板：底部状态栏 =====
    if (ap.ctrlWidget?.theme === 'bottomBar') {
        css += `
        #ctrl-widget {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        top: auto !important;
        width: 100% !important;
        height: 28px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 0 10px !important;
        box-sizing: border-box !important;
        font-size: 12px !important;
        border: none !important;
        border-top: 1px solid #555 !important;
        border-radius: 0 !important;
        background-color: #222 ;
        color: #eee ;
        z-index: 10000 !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        transform: none !important;
        opacity: 1 !important;
        text-align: left !important;
        box-shadow: none !important;
        }
        #ctrl-widget > div:first-child {
        flex: 1 1 auto !important;
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        text-align: left !important;
        color: #eee ;
        }
        #ctrl-widget > .ctrl-widget-stats-btn {
        flex: 0 0 auto !important;
        margin-left: 12px !important;
        padding: 2px 10px !important;
        border: 1px solid #888 !important;
        border-radius: 3px !important;
        background: #444 !important;
        color: #fff ;
        font-size: 11px !important;
        line-height: 16px !important;
        white-space: nowrap !important;
        }
        body { padding-bottom: 28px !important; }
        `;
    }
    styleEl.textContent = css;
}

let cwPreviewEl = null;
let cwPreviewTimer = null;

function previewCtrlWidget(state = 'auto') {
    ensureCfgMissPink();
    let ap = cfgMissPink.appearance;

    // 清掉旧的预览
    if (cwPreviewEl) {
        clearTimeout(cwPreviewTimer);
        cwPreviewEl.remove();
        cwPreviewEl = null;
    }

    let theme = ap.ctrlWidget?.theme || 'default';
    let separator = ap.ctrlWidget?.separator || ' | ';

    let el = document.createElement('div');
    el.id = 'ctrl-widget-preview';
    el.style.cssText = 'position: fixed; font-family: arial, helvetica, sans-serif; z-index: 10001;';

    let bgColor = jpxPanelManager.getStateColor(state);
    let stateLabel = state === 'auto' ? '自动' : state === 'error' ? '错误' : '手动';

    if (theme === 'bottomBar') {
        let textColor = _isLight(bgColor) ? '#222222' : '#eeeeee';
        let sampleLines = [
            `🧪预览状态: ${stateLabel}`,
            '⏭️准备好下一步: 0',
            '📶网络延迟: -',
            '🤷战斗风格: 🛡单手 (🔥火)',
            '🎛战斗类型: 🧱竞技场 (WL100)',
            '🔄轮次: 1 / 100',
        ];
        let info = document.createElement('div');
        info.textContent = sampleLines.join(separator);
        info.style.cssText = `flex: 1 1 auto; min-width: 0; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${textColor};`;

        let btn = document.createElement('div');
        btn.textContent = '📊打开实时统计';
        btn.style.cssText = `flex: 0 0 auto; margin-left: 12px; padding: 2px 10px; border: 1px solid rgba(128,128,128,0.6); border-radius: 3px; background: rgba(0,0,0,0.2); color: ${textColor}; font-size: 11px; line-height: 16px; white-space: nowrap;`;

        el.append(info, btn);
        el.style.cssText += `bottom: 0; left: 0; right: 0; height: 28px; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; box-sizing: border-box; background-color: ${bgColor}; color: ${textColor}; border-top: 1px solid #555; overflow: hidden;`;
    } else {
        let textColor = _isLight(bgColor) ? '#000' : '#fff';
        el.style.cssText += `top: 752px; left: 1186px; width: 174px; padding: 2px; border: 1px solid black; background: ${bgColor}; color: ${textColor}; text-align: center; transform: translate(-100%, 0); opacity: 0.75; white-space: pre-line; font-size: 15px;`;
        el.textContent = `🧪预览状态: ${stateLabel}\n⏭️准备好下一步: 0\n📶网络延迟: -\n🤷战斗风格: 🛡单手\n🎛战斗类型: 🧱竞技场\n🔄轮次: 1 / 100`;
    }

    el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (cwPreviewEl) {
            clearTimeout(cwPreviewTimer);
            cwPreviewEl.remove();
            cwPreviewEl = null;
        }
    });

    document.body.appendChild(el);
    cwPreviewEl = el;

    cwPreviewTimer = setTimeout(() => {
        if (cwPreviewEl) {
            cwPreviewEl.remove();
            cwPreviewEl = null;
        }
    }, 5000);

    jpxUtils.createToast(`5 秒预览已开始（${stateLabel}状态），点击预览可提前关闭`);
}

function rebuildCtrlWidget() {
    let old = document.getElementById('ctrl-widget');
    if (old) old.remove();
    jpxPanelManager.ctrlWidget = null;
    jpxPanelManager.infoDiv = null;

    if (document.querySelector('#textlog')) {
        jpxPanelManager.createCtrlWidget('battle');
        jpxPanelManager.updateContent('battle');
    }
}

let cfg = {
    //CSS
    styleText: `
    #ctrl-widget {
    position: absolute;
    top: 752px;
    left: 1186px;
    width: 174px;
    height: auto;
    transform: translate(-100%, 0);
    opacity: 0.75;
    z-index: 100;
    cursor: pointer;
    color: #000;
    font-size: 15px;
    font-family: arial, helvetica, sans-serif;
    text-align: center;
    padding: 2px;
    border: 1px solid black;
    }

    #proficiency-record {
    position: absolute;
    top: 752px;
    left: 50px;
    white-space: nowrap;
    text-align: left;
    }

    @media (min-width: 600px) and (orientation:landscape) {
        #ctrl-widget { top: 702px; left: 1260px; transform: translate(0, -100%); }
        #proficiency-record { top: 50px; left: 1240px; }
    }

    #battle_right {
    position: absolute;
    top: 42px;
    left: 681px;
    width: 364px;
    overflow: visible;

    .btm6 {
        min-width: 200px;
    }
    }

    .effect-duration {
        display: inline-block;
        width: 30px;
        margin-right: -30px;
        position: relative;
        text-align: center;
        z-index: 1;

        div {
            display: inline-block;
            min-width: 16px;
            padding: 0 2px;
            background: #edebdf;
            color: black;
            font-weight: bold;
            border: 1px solid black;
        }
    }

    .cooldown {
        width: 37px;
        margin-top: 7px;
        position: relative;
        z-index: 3;
        color: black;
        font-size: 20px;
        font-weight: bold;
    }

    .monster-hp {
        display: inline-block;
        position: relative;
        top: -20px;
        left: 204px;
    }

    #info-records-div { font-weight: bold; }
    #info-records-div, #time-records-div { text-align: center; white-space: pre; }

    .records-table {
        border-top: 1px solid;
        border-bottom: 1px solid;
        border-collapse: collapse;
        background-color: #fff;

        & tr:nth-child(1) > td, & tr:nth-child(2) > td { text-align: center; }
        & tr:not(:nth-child(1), :nth-child(2)) > td:nth-child(1) { text-align: left; }
        & td { min-width: 40px; padding: 2px 4px; border-left: 1px solid; border-right: 1px solid; text-align: right; }
    }

    #info-records-div.dark-mode,
    #time-records-div.dark-mode,
    #combat-records-use-table.dark-mode,
    #combat-records-table.dark-mode,
    #revenue-records-table.dark-mode {
    color: #eee;
    background-color: #121212;
    border-color: #555;
    }

    #combat-records-table { margin: 10px 0px; }
    #combat-records-table tr:nth-child(1) > td:not(:nth-child(1)), #combat-records-table tr:nth-child(2) > td { border-bottom: 1px solid; }

    #combat-records-use-table {
    border-collapse: collapse;
    background-color: #fff;

    & th, & td { border: 1px solid; min-width: 40px; padding: 2px 4px; }
    & th { text-align: center; }
    & td { text-align: left; }
    }

    #revenue-records-table { margin: 10px auto; }
    #revenue-records-table .surplus { color: #000; !important; background-color: #a5f779 !important; }
    #revenue-records-table .deficit { color: #000 !important; background-color: #ff6a6a !important; }
    #revenue-records-table .noData { color: #000 !important; background-color: #a796fa !important; }
    #revenue-records-table.dark-mode .surplus { color: #eee !important; background-color: #226709 !important; }
    #revenue-records-table.dark-mode .deficit { color: #eee !important; background-color: #7c1010 !important; }
    #revenue-records-table.dark-mode .noData { color: #eee !important; background-color: #433483 !important; }

    .heading { font-weight: bold; margin: 8px 0; border-bottom: 1px solid #ccc; padding-bottom: 2px; }

    .array-row:not(.array-row .array-row) { border: 1px solid #888; background: #eee; padding: 4px; margin: 4px 0; position: relative; }

    .drag-handle { cursor: grab; user-select: none; }
    .drag-handle:active { cursor: grabbing; }

    .field-picker-select { width: 200px; padding: 4px; border: 1px solid #ccc; border-radius: 4px; }
    .field-picker-select option:checked { background-color: #e0e0e0; }
    /* ========== Ribbon Tab（一级） ========== */
    .settings-tab-header {
        display: flex;
        align-items: flex-end;
        gap: 2px;
        border-bottom: 2px solid #bbb;
        margin-bottom: 15px;
        padding-left: 4px;
    }
    .settings-tab-btn {
        padding: 8px 20px;
        border: 1px solid transparent;
        border-bottom: 2px solid transparent;
        border-radius: 6px 6px 0 0;
        background: #e8e8e8;
        color: #444;
        cursor: pointer;
        font-size: 10pt;
        font-family: inherit;
        transition: background 0.1s ease;
    }
    .settings-tab-btn:hover:not(.active) {
        background: #f0f0f0;
    }
    .settings-tab-btn.active {
        background: #fff;
        color: #2196f3;
        font-weight: bold;
        border-color: #bbb;
        border-bottom-color: #fff;
        margin-bottom: -2px;
    }

    /* ========== Ribbon Tab（子） ========== */
    .settings-subtab-header {
        display: flex;
        align-items: flex-end;
        gap: 1px;
        border-bottom: 1px solid #ccc;
        margin-bottom: 12px;
        padding-left: 4px;
    }
    .settings-subtab-btn {
        padding: 6px 14px;
        border: 1px solid transparent;
        border-bottom: 1px solid transparent;
        border-radius: 5px 5px 0 0;
        background: #ececec;
        color: #555;
        cursor: pointer;
        font-size: 9pt;
        font-family: inherit;
        transition: background 0.1s ease;
    }
    .settings-subtab-btn:hover:not(.active) {
        background: #f5f5f5;
    }
    .settings-subtab-btn.active {
        background: #fff;
        color: #2196f3;
        font-weight: bold;
        border-color: #ccc;
        border-bottom-color: #fff;
        margin-bottom: -1px;
    }
    `,
};

jpxPanelManager();
jpxMarket();
jpxUtils();

let doInitDoBattle = false;
let isActiveBattle = false;

let originalTitle = document.title;

let riddleStartTime = null;
let riddleTimer = null;

function updateTitle() {
    if (!log) {
        document.title = originalTitle;
        return;
    }

    const world = isekaiSuffix ? '异' : '主';
    const hasRiddle = document.querySelector('#riddlemaster') || document.querySelector('#riddle-panel');

    // ===== Riddle 状态 =====
    if (hasRiddle) {
        if (!riddleStartTime) {
            riddleStartTime = Date.now();

            if (riddleTimer) clearInterval(riddleTimer);
            riddleTimer = setInterval(() => {
                if (document.querySelector('#riddlemaster') || document.querySelector('#riddle-panel')) {
                    updateTitle();
                } else {
                    clearInterval(riddleTimer);
                    riddleTimer = null;
                    riddleStartTime = null;
                    updateTitle();
                }
            }, 1000);
        }

        const elapsed = Math.floor((Date.now() - riddleStartTime) / 1000);
        document.title = `${world}⚠️识马🐴 ${elapsed}s`;
        return;
    }

    // 没有 riddle，清除定时器
    if (riddleTimer) {
        clearInterval(riddleTimer);
        riddleTimer = null;
    }
    riddleStartTime = null;

    // ===== 战斗状态 =====
    const finishBattle = document.querySelector('img[src$="finishbattle.png"]');
    let statusIcon;
    if (finishBattle) {
        statusIcon = '✅';
    } else {
        statusIcon = isActiveBattle ? '▶️' : '⏸️';
    }

    const delay = (lastLogTimestamp > lastActionTimestamp)
    ? (lastLogTimestamp - lastActionTimestamp) + 'ms'
    : '-';
    const round = roundInfo.total
    ? `${roundInfo.current}/${roundInfo.total}`
    : '-';
    const totalTurns = timeRecords.turn || 0;

    document.title = `${statusIcon}${world}|${round}|${totalTurns}|${delay}`;
}

let readyNext = 0;
let lastActionTimestamp = Date.now();
let lastLogTimestamp = Date.now();

let prefix = 'jpx_';
let isekaiSuffix = document.URL.includes('isekai') ? '_isekai' : '';
let regExp = {
    locationQueries: /\w+=\w+/g,
    playerInfo: /(\w+) Lv\.(\d+)/,
    staminaInfo: /Stamina:\s(\d+)/,
    spellInfo: /\('([\w\s-]+)'.*, '(\w+)', (\d+), (\d+), (\d+)\)/, //Name, iconID, MP, OC, CD
    itemInfo: /set_infopane_item\((\d+)/,
                                  battleTypeLog: /Initializing (.*) \.\.\./,
                                  floor: /Floor (\d+)/,
                                  round: /Round (\d+) \/ (\d+)/,
                                  monster: /MID=(\d+) \(([^<>]+)\) \LV=(\d+) HP=(\d+)/g,
                                  effectGain: /([\w\s-]+) gains the effect ([\w\s-]+)\./g,
                                  effectExpired: /The effect ([\w\s-]+) on ([\w\s-]+) has expired\./g,
                                  effectWear: /The effect ([\w\s-]+) on ([\w\s-]+) has worn off\./g,
                                  effectWearAsleep: /([^<>]+) has been roused from its sleep\./g,
                                  effectWearConfused: /([^<>]+) got knocked out of confuse\./g,
                                  oc: /div/g,
                                  ocHalf: /vcr/g,
                                  spellMatch: /\('(?<name>[\w\s-]+)(?:\s\(x(?<stack>\d+)\))?',\s?(?<description>.*),\s?'?(?<turns>[\w\s-]+)'?\)/,
                                  //battleRecorder
                                  turnLog: /([^]+?)<tr><td class="tls">/,
                                  //timeRecorder
                                  action: />([^<>]+)<\/td><\/tr>(<tr><td class="tlb">Spirit Stance Exhausted<\/td><\/tr>)*<tr><td class="tls"/,
                                  action2: />([^<>]+)<\/td><\/tr><tr><td class="tlb?">[^<>]+<\/td><\/tr>(<tr><td class="tlb">Spirit Stance Exhausted<\/td><\/tr>)*<tr><td class="tls"/,
                                  zeroturn: /You use\s*(\w* (?:Gem|Draught|Potion|Elixir|Drink|Candy|Infusion|Scroll|Vase|Bubble))/,
                                  use: /You (cast|use) ([\w\s-]+)/,
                                  //combatRecorder
                                  damage: /[^<>]+damage/g,
                                  damageTaken1: /(?<v>glances|hits|crits) you.*?(?<n>\d+).*?(?<t>\w+) damage/,
                                  damageTaken2: /which (?<v>glances|hits|crits).*?(?<n>\d+).*?(?<t>\w+) damage/,
                                  spiritShield: /absorbs (\d+)/,
                                  damageDealt1: /(?:You|Your offhand attack|Arcane Blow) (?:(?<s>\d)x-)*(?<v>glance|hit|crit).*?(?<n>\d+).*?(?<t>\w+) damage/,
                                  damageDealt2: /(?:(?<s>\d)x-)*(?<v>glanced|hit|crit|eviscerated) for (?<n>\d+) (?<t>\w+) damage/,
                                  strike: /(Fire|Cold|Wind|Elec|Holy|Dark|Void) Strike hits.*?(\d+).*?(\w+) damage/,
                                  explode: /explodes for (\d+) (\w+) damage/,
                                  damagePlus: /for (\d+) damage/,
                                  damagePhysicalPlus: /(Bleeding Wound|Spreading Poison)/,
                                  damagePoints: /for (\d+) points of (\w+) damage/,
                                  debuffLog: /(?:<tr><td class="tlb?">[^<>]+(?: gains the effect | partially resists the effects of your spell\.| shrugs off the effects of your spell\.)+[^<>]*<\/td><\/tr>)+<tr><td class="tl">You cast [a-zA-Z]+\.<\/td><\/tr>/,
                                  debuffResist0: / gains the effect (?!Coalesced Mana)/g,
                                  debuffResist1: / partially resists the effects of your spell\./g,
                                  debuffResist3: / shrugs off the effects of your spell\./g,
                                  counter: />You counter/g,
                                  //    dealt magical
                                  magicalDealtMiss: / to connect\./g,
                                  magicalDealtEvade: / evades your spell\./g,
                                  magicalDealtResistPartially: / resists, and was/g,
                                  magicalDealtResist: / resists your spell\./g,
                                  //    dealt physical
                                  physicalDealtMiss: / its mark\./g,
                                  physicalDealtEvade: / dodges your attack\./g,
                                  physicalDealtParryPartially: / parries[^<>]+?(\d+)[^<>]+?(\w+) damage/g,
                                  physicalDealtParry: / parries your attack\./g,
                                  //    taken magical
                                  magicalTakenMiss: /(?:casts[^<>]+, but misses the attack\.|casts[^<>]+, missing you completely\.)/g,
                                  magicalTakenEvade: />You evade the attack\./g,
                                  magicalTakenResistPartially: / resist the attack/g,
                                  magicalTakenBlockPartially: /casts[^<>]+partially block (?:and|resist| )*the attack/g,
                                  magicalTakenBlock: /(?<!partially )block (?:and|resist| )*the attack\./g,
                                  //    taken physical
                                  physicalTakenMiss: /(?:uses[^<>]+, but misses the attack\.|(?:vigorously whiffs at a shadow|uses[^<>]+), missing you completely\.)/g,
                                  physicalTakenEvade: />You evade the attack from/g,
                                  physicalTakenParryPartially: /partially parry the attack/g,
                                  physicalTakenParry: /(?<!partially )parry the attack/g,
                                  physicalTakenBlockPartially: /(?:(?:uses[^<>]+|>)You|you) partially block (?:and|partially|parry| )*the attack/g,
                                  physicalTakenBlock: /(?<!partially )block (?:and|partially|parry| )*the attack/g,
                                  //revenueRecorder
                                  gainExp: /gain (\d+) EXP/,
                                  gainCredit: /gain (\d+) Credit/,
                                  proficiencies: /\d+\.\d+ points of [^<>]+ proficiency/g,
                                  proficiency: /(\d+\.\d+) points of ([^<>]+) proficiency/,
                                  dropsLogs: /\S+ <span style="color:.{7}">\[[^<>]+\](<\/span><\/td><\/tr><tr><td class="tlb">A traveling)*/g,
                                  drop: /(\S+) \<.*#(.{6}).*\[(.*)\](.)*/,
                                  quality: /(Crude|Fair|Average|Superior|Exquisite|Magnificent|Legendary|Peerless)/,
                                  credit: /(\d+) Credit/,
                                  crystal: /(?:(\d+)x )?(Crystal of \w+)/,
}

let log;
let battleStyle = '';
let battleType = '';
let worldLevel = 0;
let towerFloor = 0;
let roundInfo = { current: 0, total: 0 };
let monsterData = [];
let allMonsterInfo = {};
let prevMonsterIds = '';
let monstersEffects = {};
let actionCounts = {};
let battleLogRecord = [];
let battleLogRecordCurrent = [];
let timeRecords = {};
let combatRecords = {};
let revenueRecords = {};
let spellDamageBonus = JSON.parse(localStorage.getItem(prefix + 'spellDamageBonus' + isekaiSuffix) || '{"maxType":"fire","maxValue":0}');

let dummy = document.createElement('div');
const jpxPageWindow = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
let newWindow;
let statsFreezeSettings = {     // ← 新增
    rows: 3,
    cols: 6,
    bgColor: '#66ccff',
};

const difficumpMap = { Normal: 1, Hard: 2, Nightmare: 4, Hell: 7, Nintendo: 10, IWBTH: 15, PFUDOR: 20 };
const itemMap = {
    10005: 'Health Gem', 10006: 'Mana Gem', 10007: 'Spirit Gem', 10008: 'Mystic Gem',
    11191: 'Health Draught', 11195: 'Health Potion', 11199: 'Health Elixir',
    11291: 'Mana Draught', 11295: 'Mana Potion', 11299: 'Mana Elixir',
    11391: 'Spirit Draught', 11395: 'Spirit Potion', 11399: 'Spirit Elixir',
    11401: 'Energy Drink', 11402: 'Caffeinated Candy', 11501: 'Last Elixir',
    12101: 'Infusion of Flames', 12201: 'Infusion of Frost', 12301: 'Infusion of Lightning', 12401: 'Infusion of Storms', 12501: 'Infusion of Divinity', 12601: 'Infusion of Darkness',
    13101: 'Scroll of Swiftness', 13111: 'Scroll of Protection', 13199: 'Scroll of the Avatar', 13201: 'Scroll of Absorption', 13211: 'Scroll of Shadows', 13221: 'Scroll of Life', 13299: 'Scroll of the Gods',
    19111: 'Flower Vase', 19131: 'Bubble-Gum',
};
const itemSrc = [
    { keys: ['Health', 'Last Elixir'], src: '/y/e/healthpot.png' },
    { keys: ['Mana'], src: '/y/e/manapot.png' },
    { keys: ['Spirit'], src: '/y/e/spiritpot.png' },
    { keys: ['Drink', 'Candy'], src: '/y/e/soulstone.png' },
    { keys: ['Flames'], src: '/y/e/fireinfusion.png' },
    { keys: ['Frost'], src: '/y/e/coldinfusion.png' },
    { keys: ['Storms'], src: '/y/e/windinfusion.png' },
    { keys: ['Lightning'], src: '/y/e/elecinfusion.png' },
    { keys: ['Divinity'], src: '/y/e/holyinfusion.png' },
    { keys: ['Darkness'], src: '/y/e/darkinfusion.png' },
    { keys: ['Protection','vatar'], src: '/y/e/protection_scroll.png' },
    { keys: ['Swiftness'], src: '/y/e/haste_scroll.png' },
    { keys: ['Absorption'], src: '/y/e/absorb_scroll.png' },
    { keys: ['Shadows'], src: '/y/e/shadowveil_scroll.png' },
    { keys: ['Life','Gods'], src: '/y/e/sparklife_scroll.png' },
    { keys: ['Vase'], src: '/y/e/flowers.png' },
    { keys: ['Gum'], src: '/y/e/gum.png' }
];
const effectSrc = {
    'Vital Theft': { scr: '/y/e/drainhp.png' },
    'Ether Theft': { scr: '/y/e/drainmp.png' },
    'Spirit Theft': { scr: '/y/e/drainsp.png' },

    'Weakened': { scr: '/y/e/weaken.png' },
    'Imperiled': { scr: '/y/e/imperil.png' },
    'Slowed': { scr: '/y/e/slow.png' },
    'Asleep': { scr: '/y/e/sleep.png' },
    'Confused': { scr: '/y/e/confuse.png' },
    'Blinded': { scr: '/y/e/blind.png' },
    'Silenced': { scr: '/y/e/silence.png' },
    'Immobilized': { scr: '/y/e/magnet.png' },
    'Stunned': { scr: '/y/e/wpn_stun.png' },
    'Penetrated Armor': { scr: '/y/e/wpn_ap.png' },
    'Bleeding Wound': { scr: '/y/e/wpn_bleed.png' },
    'Spreading Poison': { scr: '/y/e/poison.png' },
    'Coalesced Mana': { scr: '/y/e/coalescemana.png' },

    'Searing Skin': { scr: '/y/e/firedot.png' },
    'Freezing Limbs': { scr: '/y/e/coldslow.png' },
    'Turbulent Air': { scr: '/y/e/windmiss.png' },
    'Deep Burns': { scr: '/y/e/elecweak.png' },
    'Breached Defense': { scr: '/y/e/holybreach.png' },
    'Blunted Attack': { scr: '/y/e/darknerf.png' },
    'Burning Soul': { scr: '/y/e/soulfire.png' },
    'Ripened Soul': { scr: '/y/e/ripesoul.png' },

    'Fury of the Sisters': { scr: '/y/e/trio_furyofthesisters.png' },
    'Lamentations of the Future': { scr: '/y/e/trio_skuld.png' },
    'Screams of the Past': { scr: '/y/e/trio_urd.png' },
    'Wails of the Present': { scr: '/y/e/trio_verdandi.png' },
    'Absorbing Ward': { scr: '/y/e/absorb.png' },
};
const spellsDamageObj = {
    fire: ['Fiery Blast', 'Inferno', 'Flames of Loki'],
    cold: ['Freeze', 'Blizzard', 'Fimbulvetr'],
    wind: ['Gale', 'Downburst', 'Storms of Njord'],
    elec: ['Shockblast', 'Chained Lightning', 'Wrath of Thor'],
    holy: ['Smite', 'Banishment', 'Paradise Lost'],
    dark: ['Corruption', 'Disintegrate', 'Ragnarok'],
};
const bossTypes = {
    Rare: new Set(['Manbearpig', 'White Bunneh', 'Mithra', 'Dalek']),
                                  Legendary: new Set(['Konata', 'Mikuru Asahina', 'Ryouko Asakura', 'Yuki Nagato']),
                                  Ultimate: new Set(['Skuld', 'Urd', 'Verdandi', 'Yggdrasil', 'Real Life', 'Invisible Pink Unicorn', 'Flying Spaghetti Monster']),
                                  Arena300: new Set(['Drogon', 'Rhaegal', 'Viserion']),
                                  Arena400: new Set(['New Game +', 'Bottomless Dungeon', 'Recycled Boss Rush', 'Time Trial Mode', 'Achievement Grind', 'Hardcore Mode']),
                                  Arena500: new Set(['Angel Bunny', 'Applejack', 'Fluttershy', 'Gummy', 'Pinkie Pie', 'Rarity', 'Spike', 'Rainbow Dash', 'Twilight Sparkle']),
};

const BATTLE_STYLES = ['OneHanded', '1H_Mage', 'TwoHanded', '2H_Mage', 'DualWielding', 'DW_Mage', 'NitenIchiryu', 'NI_Mage', 'Staff', 'Unarmed'];
const BATTLE_TYPES = ['Arena', 'Encounter', 'Colosseum', 'Battle1000', 'Item', 'Tower'];
const BATTLE_MODES = BATTLE_STYLES.flatMap(style => ['General', ...BATTLE_TYPES].map(type => `${style}_${type}`));
const PRIORITY_RULES = ['Top Down', 'Bottom Up', 'Current HP Low to High', 'Current HP High to Low', 'Current HP Percent Low to High', 'Current HP Percent High to Low'];
const MONSTER_TYPES = ['Normal', 'Rare', 'Legendary', 'Ultimate', 'Arena300', 'Arena400', 'Arena500'];
const MONSTER_CLASSES = ['Arthropod', 'Avion', 'Beast', 'Celestial', 'Daimon', 'Dragonkin', 'Elemental',
'Giant', 'Humanoid', 'Mechanoid', 'Reptilian', 'Sprite', 'Undead'];
const PLAYER_EFFECTS = ['Channeling', 'Regeneration', 'Replenishment', 'Refreshment', 'Regen', 'Heartseeker', 'Arcane Focus',
'Hastened', 'Protection', 'Absorbing Ward', 'Shadow Veil', 'Spark of Life', 'Spirit Shield',
'Infused Flames', 'Infused Frost', 'Infused Storm', 'Infused Lightning', 'Infused Divinity', 'Infused Darkness',
'Energized', 'Sleeper Imprint', 'Kicking Ass',
'Overwhelming Strikes', 'Ether Tap', 'Cloak of the Fallen', 'Blessing of the RiddleMaster', 'Defending', 'Focusing'];
const TOGGLE = ['Spirit', 'Defend', 'Focus'];
const SKILLS = ['Shield Bash', 'Vital Strike', 'Merciful Blow', 'Iris Strike', 'Backstab', 'Frenzied Blows', 'Great Cleave',
'Rending Blow', 'Shatter Strike', 'Skyward Sword', 'Concussive Strike', 'Flee', 'Scan', 'FUS RO DAH', 'Orbital Friendship Cannon'];
const SPELLS_SUPPORT = ['Cure', 'Full-Cure', 'Regen', 'Haste', 'Protection', 'Absorb', 'Shadow Veil', 'Spark of Life', 'Spirit Shield', 'Heartseeker', 'Arcane Focus'];
const ITEMS = ['Mystic Gem', 'Health Gem', 'Health Draught', 'Health Potion', 'Health Elixir', 'Mana Gem', 'Mana Draught', 'Mana Potion', 'Mana Elixir',
'Spirit Gem', 'Spirit Draught', 'Spirit Potion', 'Spirit Elixir', 'Last Elixir', 'Infusion of Flames', 'Infusion of Frost', 'Infusion of Storms', 'Infusion of Lightning',
'Infusion of Divinity', 'Infusion of Darkness', 'Scroll of Swiftness', 'Scroll of Protection', 'Scroll of the Avatar', 'Scroll of Absorption', 'Scroll of Shadows',
'Scroll of Life', 'Scroll of the Gods', 'Caffeinated Candy', 'Energy Drink', 'Flower Vase', 'Bubble-Gum'];
const SPELLS_DAMAGE = ['T1', 'T2', 'T3', 'Fiery Blast', 'Inferno', 'Flames of Loki', 'Freeze', 'Blizzard', 'Fimbulvetr', 'Gale', 'Downburst', 'Storms of Njord',
'Shockblast', 'Chained Lightning', 'Wrath of Thor', 'Smite', 'Banishment', 'Paradise Lost', 'Corruption', 'Disintegrate', 'Ragnarok'];
const SPELLS_DEBUFF = ['Drain', 'Weaken', 'Imperil', 'Slow', 'Sleep', 'Confuse', 'Blind', 'Silence', 'Immobilize'];

const CTRLWIDGET_FIELDS = [
    { id: 'isActiveBattle', get: () => isActiveBattle ? t('cW.auto') : t('cW.manual') },
                                  { id: 'readyNext', get: () => readyNext },
                                  { id: 'networkDelay', get: () => (lastLogTimestamp > lastActionTimestamp ? lastLogTimestamp - lastActionTimestamp : '-') },
                                  { id: 'battleStyle', get: () => t(`cW.${battleStyle}`) + (/Staff|Mage/.test(battleStyle) ? ` (${t(`cW.${spellDamageBonus.maxType}`)})` : '') },
                                  { id: 'battleType', get: () => t(`cW.${battleType}`) + (worldLevel ? ` (WL${worldLevel})` : '') + (towerFloor ? ` (${towerFloor}F)` : '') },
                                  { id: 'battleMode', get: () => getBattleMode() },
                                  { id: 'round', get: () => roundInfo.total ? `${roundInfo.current} / ${roundInfo.total}` : '-' },
].map(f => ({ ...f, label: `cW.${f.id}` }));
const COMBAT_FIELDS = [
    { id: 'fire', type: 'damage' },
    { id: 'cold', type: 'damage' },
    { id: 'wind', type: 'damage' },
    { id: 'elec', type: 'damage' },
    { id: 'holy', type: 'damage' },
    { id: 'dark', type: 'damage' },
    { id: 'crushing', type: 'damage' },
    { id: 'slashing', type: 'damage' },
    { id: 'piercing', type: 'damage' },
    { id: 'void', type: 'damage' },
    { id: 'damagePlus', type: 'damage' },
    { id: 'damageTotal', type: 'damage', isTotal: true },

    { id: 'glance', type: 'result' },
    { id: 'hit', type: 'result' },
    { id: 'crit', type: 'result' },
    { id: 'miss', type: 'result' },
    { id: 'evade', type: 'result' },
    { id: 'parry', type: 'result' },
    { id: 'resist', type: 'result' },
    { id: 'block', type: 'result' },
    { id: 'resultTotal', type: 'result', isTotal: true },

    { id: 'parryPartially', type: 'resultPartially' },
    { id: 'resistPartially', type: 'resultPartially' },
    { id: 'blockPartially', type: 'resultPartially' },
    { id: 'resultPartiallyTotal', type: 'resultPartially', isTotal: true },
].map(f => ({ ...f, label: `cP.${f.id}` }));
const COMBAT_USE_FIELDS = [
    { id: 'action', keys: ['Attack', ...TOGGLE] },
    { id: 'item', keys: ['Mystic Gem', 'Health Gem', 'Mana Gem', 'Spirit Gem', 'Caffeinated Candy', 'Energy Drink'] },
    { id: 'skill', keys: SKILLS },
    { id: 'spellSupport', keys: SPELLS_SUPPORT },
    { id: 'spellDamage', keys: SPELLS_DAMAGE },
    { id: 'spellDebuff', keys: SPELLS_DEBUFF },
].map(f => ({ ...f, label: `cP.${f.id}`, keys: f.keys.map(key => ({ key, label: `cB.${key}`})) }));
const REVENUE_FIELDS = [
    { id: 'exp', type: 'simple' },
    { id: 'proficiency', type: 'list_paired',
        order: [
            'one-handed weapon', 'two-handed weapon', /*legacy901*/'dual wielding'/*legacy902*/, 'dual-wielding', 'staff',
            'cloth armor', 'light armor', 'heavy armor', 'elemental magic', 'divine magic', 'forbidden magic', 'supportive magic', 'deprecating magic'
        ]
    },
    { id: 'credit', type: 'simple' },
    { id: 'equipment', type: 'list_flat', order: ['Peerless', 'Legendary', 'Magnificent', 'Exquisite', 'Superior', 'Average', 'Fair', 'Crude'] },
    { id: 'material', type: 'grid',
        order: [
            'Low-Grade Cloth', 'Mid-Grade Cloth', 'High-Grade Cloth',
            'Low-Grade Leather', 'Mid-Grade Leather', 'High-Grade Leather',
            'Low-Grade Metals', 'Mid-Grade Metals', 'High-Grade Metals',
            'Low-Grade Wood', 'Mid-Grade Wood', 'High-Grade Wood',
            'Scrap Cloth', 'Scrap Leather', 'Scrap Metal', 'Scrap Wood', 'Energy Cell',
        ]
    },
    { id: 'consumable', type: 'grid_detailed',
        order: [
            'Health Draught', 'Health Potion', 'Health Elixir',
            'Mana Draught', 'Mana Potion', 'Mana Elixir',
            'Spirit Draught', 'Spirit Potion', 'Spirit Elixir', 'Last Elixir',
            'Infusion of Flames', 'Infusion of Frost', 'Infusion of Storms', 'Infusion of Lightning', 'Infusion of Divinity', 'Infusion of Darkness',
            'Scroll of Swiftness', 'Scroll of Protection', 'Scroll of the Avatar', 'Scroll of Absorption', 'Scroll of Shadows', 'Scroll of Life', 'Scroll of the Gods',
            'Voidseeker Shard', 'Aether Shard', 'Featherweight Shard', 'Amnesia Shard', 'World Seed',
            'Flower Vase', 'Bubble-Gum'
        ]
    },
    { id: 'consumableProfit', type: 'simple', source: 'consumable', key: 'profit' },
    { id: 'token', type: 'grid', order: ['Token of Blood', 'Chaos Token', 'Soul Fragment'] },
    { id: 'tokenProfit', type: 'simple', source: 'token', key: 'profit' },
    { id: 'food', type: 'grid', order: ['Monster Chow', 'Monster Edibles', 'Monster Cuisine', 'Happy Pills'] },
    { id: 'foodProfit', type: 'simple', source: 'food', key: 'profit' },
    { id: 'figurine', type: 'grid',
        order: [
            'Twilight Sparkle Figurine', 'Rainbow Dash Figurine', 'Applejack Figurine', 'Fluttershy Figurine', 'Pinkie Pie Figurine', 'Rarity Figurine',
            'Trixie Figurine', 'Princess Celestia Figurine', 'Princess Luna Figurine', 'Apple Bloom Figurine', 'Scootaloo Figurine', 'Sweetie Belle Figurine',
            'Big Macintosh Figurine', 'Spitfire Figurine', 'Derpy Hooves Figurine', 'Lyra Heartstrings Figurine', 'Octavia Figurine', 'Zecora Figurine',
            'Cheerilee Figurine', 'Vinyl Scratch Figurine', 'Daring Do Figurine', 'Doctor Whooves Figurine', 'Berry Punch Figurine', 'Bon-Bon Figurine',
            'Fluffle Puff Figurine', 'Angel Bunny Figurine', 'Gummy Figurine',
        ]
    },
    { id: 'figurineProfit', type: 'simple', source: 'figurine', key: 'profit' },
    { id: 'artifact', type: 'grid', order: ['Precursor Artifact'] },
    { id: 'artifactProfit', type: 'simple', source: 'artifact', key: 'profit' },
    { id: 'trophy', type: 'grid',
        order: [
            'ManBearPig Tail', 'Holy Hand Grenade of Antioch', "Mithra's Flower", 'Dalek Voicebox', 'Lock of Blue Hair',
            'Bunny-Girl Costume', 'Hinamatsuri Doll', 'Broken Glasses', 'Black T-Shirt', 'Sapling', 'Unicorn Horn', 'Noodly Appendage',
        ]
    },
    { id: 'trophyProfit', type: 'simple', source: 'trophy', key: 'profit' },
    { id: 'crystal', type: 'grid',
        order: [
            'Crystal of Vigor', 'Crystal of Finesse', 'Crystal of Swiftness', 'Crystal of Fortitude', 'Crystal of Cunning', 'Crystal of Knowledge',
            'Crystal of Flames', 'Crystal of Frost', 'Crystal of Tempest', 'Crystal of Lightning', 'Crystal of Devotion', 'Crystal of Corruption',
        ]
    },
    { id: 'crystalTotal', type: 'total', source: 'crystal' },
    { id: 'totalProfit', type: 'summary' },
    { id: 'stamina', type: 'stamina' },
    { id: 'finalProfit', type: 'summary' }
].map(f => ({ ...f, label: `rP.${f.id}` }));
const STATS_FILTERS = [
    { id: 'filter-aggregate', key: 'aggregate', type: 'checkbox', options: ['Aggregate by Day'] },
    { id: 'filter-world', key: 'world', type: 'checkbox', options: ['Persistent', 'Isekai'] },
    { id: 'filter-battleType', key: 'battleType', type: 'checkbox', options: ['Arena', 'Encounter', 'Colosseum', 'Battle1000', 'Item', 'Tower'] },
    { id: 'filter-difficulties', key: 'difficulties', type: 'checkbox', options: ['20', '15', '10', '7', '4', '2', '1'] },
    { id: 'filter-result', key: 'result', type: 'checkbox', options: ['Victory', 'Defeat', 'Flee'] },
    { id: 'filter-roundTotal', key: 'roundTotal', type: 'rangeNumber', value: [0, 1000] },
    { id: 'filter-rows', key: 'rows', type: 'number', value: 50 }
].map(f => ({ ...f, label: `sP.${f.key}` }));
const sumRevenueCategory = (record, category) => {
    let data = record.revenueRecords?.[category];
    if (!data) return '0';
    let total = 0;
    for (const [key, value] of Object.entries(data)) {
        if (key !== 'total' && key !== 'profit') total += value;
    }
    return Math.round(total * 100) / 100;
};
const sumTrophies = (record, type) => {
    let data = record.revenueRecords?.trophy;
    if (!data) return '0';

    const TROPHIES_T2 = ['ManBearPig Tail', 'Holy Hand Grenade of Antioch', "Mithra's Flower", 'Dalek Voicebox', 'Lock of Blue Hair'];
    let total = 0;
    for (const [key, value] of Object.entries(data)) {
        if (key === 'total' || key === 'profit') continue;
        let isLesser = key.match(/Lesser .+ Charm/);
        let isGreater = key.match(/Greater .+ Charm/);
        let isT2 = TROPHIES_T2.includes(key);
        switch (type) {
            case 'lesserCharm':
                if (isLesser) total += value;
                break;
            case 'greaterCharm':
                if (isGreater) total += value;
                break;
            case 'T2':
                if (isT2) total += value;
                break;
            case 'T36':
                if (!isT2 && !isLesser && !isGreater) total += value;
                break;
        }
    }
    return total;
};
const getConsumable = (record, field) => {
    let item = record.revenueRecords?.consumable?.[field];
    if (!item) return { drop: 0, use: 0, balance: 0 };
    return { drop: item.drop || 0, use: item.use || 0, balance: item.balance || 0 };
};
const STATS_FIELDS = [
    { id: 'date', get: d => d.date || '' },
    { id: 'world', style: 'min-width: 60px;', get: d => d.world || '', doI18n: true },
    { id: 'level', get: d => d.playerLevel || '' },
    { id: 'persona', style: 'min-width: 150px;', get: d => d.persona || '' },
    { id: 'battleType', get: d => (d.battleType || '') + (d.worldLevel ? ` (WL${d.worldLevel})` : '') + (d.towerFloor ? ` (${d.towerFloor}F)` : ''), doI18n: true },
                                  { id: 'round', get: d => d.roundInfo?.current || '' },
                                  { id: 'deltaTime', get: d => d.deltaTime || '' },
                                  { id: 'turns', style: 'min-width: 60px;', get: d => d.turns || '' },
                                  { id: 'tps', get: d => d.tps || '' },
                                  { id: 'finalProfit', get: d => d.revenueRecords?.finalProfit || 0 },
                                  { id: 'credit', get: d => d.revenueRecords?.credit || 0 },
                                  { id: 'staminaCost', get: d => d.revenueRecords?.staminaCost || 0 },
                                  { id: 'totalProfit', get: d => d.revenueRecords?.totalProfit || 0 },

                                  { id: 'pDGlance', get: d => d.combatRecords?.physicalDealt?.glance || 0 },
                                  { id: 'pDHit', get: d => d.combatRecords?.physicalDealt?.hit || 0 },
                                  { id: 'pDCrit', get: d => d.combatRecords?.physicalDealt?.crit || 0 },
                                  { id: 'mDGlance', get: d => d.combatRecords?.magicalDealt?.glance || 0 },
                                  { id: 'mDHit', get: d => d.combatRecords?.magicalDealt?.hit || 0 },
                                  { id: 'mDCrit', get: d => d.combatRecords?.magicalDealt?.crit || 0 },
                                  { id: 'mDRes', get: d => d.combatRecords?.magicalDealt?.resist || 0 },
                                  { id: 'mDRes50', get: d => d.combatRecords?.magicalDealt?.resist50 || 0 },
                                  { id: 'mDRes75', get: d => d.combatRecords?.magicalDealt?.resist75 || 0 },
                                  { id: 'mDRes90', get: d => d.combatRecords?.magicalDealt?.resist90 || 0 },
                                  { id: 'mDResP', get: d => d.combatRecords?.magicalDealt?.resistPartially || 0 },
                                  { id: 'mDDRes0', get: d => d.combatRecords?.magicalDealt?.debuffResist0 || 0 },
                                  { id: 'mDDRes12', get: d => d.combatRecords?.magicalDealt?.debuffResist1 || 0 },
                                  { id: 'mDDRes3', get: d => d.combatRecords?.magicalDealt?.debuffResist3 || 0 },

                                  { id: 'uCure', get: d => d.combatRecords?.use?.Cure || 0 },
                                  { id: 'uFullCure', get: d => d.combatRecords?.use?.['Full-Cure'] || 0 },
                                  { id: 'uCloakOfTheFallen', get: d => d.combatRecords?.use?.['Cloak of the Fallen'] || 0 },
                                  { id: 'uImperil', get: d => d.combatRecords?.use?.Imperil || 0 },

                                  { id: 'eqP', get: d => d.revenueRecords?.equipment?.Peerless_Avg ?? d.revenueRecords?.equipment?.Peerless?.length ?? 0 },
                                  { id: 'eqL', get: d => d.revenueRecords?.equipment?.Legendary_Avg ?? d.revenueRecords?.equipment?.Legendary?.length ?? 0 },
                                  { id: 'eqM', get: d => d.revenueRecords?.equipment?.Magnificent_Avg ?? d.revenueRecords?.equipment?.Magnificent?.length ?? 0 },
                                  { id: 'cha', get: d => d.revenueRecords?.token?.['Chaos Token'] || 0 },
                                  { id: 'blo', get: d => d.revenueRecords?.token?.['Token of Blood'] || 0 },

                                  { id: 'food', get: d => sumRevenueCategory(d, 'food') },
                                  { id: 'fig', get: d => sumRevenueCategory(d, 'figurine') },
                                  { id: 'arti', get: d => sumRevenueCategory(d, 'artifact') },
                                  { id: 'crys', get: d => sumRevenueCategory(d, 'crystal') },

                                  { id: 't2', get: d => sumTrophies(d, 'T2') },
                                  { id: 't36', get: d => sumTrophies(d, 'T36') },
                                  { id: 'lCharm', get: d => sumTrophies(d, 'lesserCharm') },
                                  { id: 'gCharm', get: d => sumTrophies(d, 'greaterCharm') },

                                  { id: 'seed', get: d => getConsumable(d, 'World Seed') },
                                  { id: 'hd', get: d => getConsumable(d, 'Health Draught') },
                                  { id: 'md', get: d => getConsumable(d, 'Mana Draught') },
                                  { id: 'sd', get: d => getConsumable(d, 'Spirit Draught') },
                                  { id: 'hp', get: d => getConsumable(d, 'Health Potion') },
                                  { id: 'mp', get: d => getConsumable(d, 'Mana Potion') },
                                  { id: 'sp', get: d => getConsumable(d, 'Spirit Potion') },
                                  { id: 'he', get: d => getConsumable(d, 'Health Elixir') },
                                  { id: 'me', get: d => getConsumable(d, 'Mana Elixir') },
                                  { id: 'se', get: d => getConsumable(d, 'Spirit Elixir') },
                                  { id: 'le', get: d => getConsumable(d, 'Last Elixir') },
                                  { id: 'swif', get: d => getConsumable(d, 'Scroll of Swiftness') },
                                  { id: 'prot', get: d => getConsumable(d, 'Scroll of Protection') },
                                  { id: 'avat', get: d => getConsumable(d, 'Scroll of the Avatar') },
                                  { id: 'abso', get: d => getConsumable(d, 'Scroll of Absorption') },
                                  { id: 'shad', get: d => getConsumable(d, 'Scroll of Shadows') },
                                  { id: 'life', get: d => getConsumable(d, 'Scroll of Life') },
                                  { id: 'gods', get: d => getConsumable(d, 'Scroll of the Gods') },
                                  { id: 'vase', get: d => d.revenueRecords?.consumable?.['Flower Vase'] || 0 },
                                  { id: 'gum', get: d => d.revenueRecords?.consumable?.['Bubble-Gum'] || 0 },

                                  { id: 'caff', get: d => -d.combatRecords?.use?.['Caffeinated Candy'] || 0 },
                                  { id: 'ed', get: d => -d.combatRecords?.use?.['Energy Drink'] || 0 },
].map(f => ({ ...f, label: `sP.${f.id}` }));

const KEYBINDS = {
    openBattleRecords: { key: 'z', ctrl: false, alt: false, shift: false },
    toggleActive: { key: 'm', ctrl: false, alt: false, shift: false },
    openSettings: { key: ',', ctrl: false, alt: false, shift: false }
};
let userKeybinds = JSON.parse(localStorage.getItem(prefix + 'userKeybinds' + isekaiSuffix)) || { ...KEYBINDS };
let idCounter = 0;
const mkF = (key, type, extra = {}) => {
    const { prefix = 'cB.', label, ...otherExtra } = extra;
    const field = {
        key,
        type,
        label: label || (type === 'constant' ? `${prefix}${extra.value || key}` : `${prefix}${key}`),
                                  ...otherExtra
    };

    ['options', 'multiSelectOptions'].forEach(opts => {
        if (type !== 'conditionsArray' && Array.isArray(field[opts])) field[opts] = field[opts].map(opt => ({ value: opt, label: `${prefix}${opt}` }));
    });

    return field;
};
const mkItem = (type, nameList = null, extra = [], useGeneral = true, useTarget = false) => {
    const properties = [mkF('type', 'constant', { value: type, class: 'heading' })];

    if (nameList) properties.push(mkF('name', 'dropdown', { options: nameList }));
    if (extra.length > 0) properties.push(...extra.map(item => mkF(item.key, item.type, { ...item })));

    let conds = [];
    if (useGeneral) conds = conds.concat(conditionsGeneral);
    if (useTarget) conds = conds.concat(conditionsTarget);
    if (conds.length > 0) properties.push(mkF('conditions', 'conditionsArray', { options: conds }));

    return { type: 'object', properties };
};
const conditionsGeneral = [
    mkF('world', 'array', { multiSelectOptions: ['Persistent', 'Isekai'], itemSchema: { type: 'text' } }),
                                  mkF('pLevel', 'rangeNumber'),
                                  mkF('pMaxSpellType', 'array', { multiSelectOptions: Object.keys(spellsDamageObj), popup: true, itemSchema: { type: 'text' } }),
                                  mkF('battleTypes', 'array', { multiSelectOptions: BATTLE_TYPES, popup: true, itemSchema: { type: 'text' } }),
                                  mkF('difficump', 'array', { multiSelectOptions: Object.keys(difficumpMap), popup: true, itemSchema: { type: 'text' } }),
                                  mkF('roundCurrent', 'rangeNumber'),
                                  mkF('roundLeft', 'rangeNumber'),
                                  mkF('roundTotal', 'rangeNumber'),
                                  mkF('floor', 'rangeNumber'),
                                  mkF('pActionCooldown', 'array', { multiSelectOptions: [
                                      ...SKILLS, ...SPELLS_SUPPORT, ...ITEMS, ...SPELLS_DAMAGE, ...SPELLS_DEBUFF,
                                  ], hasRange: 'cB.cooldownRange', popup: true, itemSchema: { type: 'text' } }),
                                  mkF('pActionCounts', 'array', { multiSelectOptions: [
                                      'Attack', ...TOGGLE, ...SKILLS, ...SPELLS_SUPPORT, ...ITEMS, ...SPELLS_DAMAGE, ...SPELLS_DEBUFF,
                                  ], hasRange: 'cB.usesPerRoundRange', popup: true, itemSchema: { type: 'text' } }),
                                  mkF('pHP', 'rangeNumber'),
                                  mkF('pMP', 'rangeNumber'),
                                  mkF('pSP', 'rangeNumber'),
                                  mkF('pOC', 'rangeNumber'),
                                  mkF('pSpiritStatus', 'boolean'),
                                  mkF('pEffects', 'array', { multiSelectOptions: PLAYER_EFFECTS, hasRange: 'cB.remainingTurnsRange', popup: true, itemSchema: { type: 'text' } }),
                                  mkF('pIgnoredEffects', 'array', { multiSelectOptions: PLAYER_EFFECTS, hasRange: 'cB.remainingTurnsRange', popup: true, itemSchema: { type: 'text' } }),
                                  mkF('pEffectStacks', 'array', { multiSelectOptions: PLAYER_EFFECTS, hasRange: 'cB.stacksRange', popup: true, itemSchema: { type: 'text' } }),
                                  mkF('monsters', 'rangeNumber'),
                                  mkF('activeMonsters', 'rangeNumber'),
                                  mkF('defeatedMonsters', 'rangeNumber'),
                                  mkF('bosses', 'rangeNumber'),
                                  mkF('activeBosses', 'rangeNumber'),
                                  mkF('defeatedBosses', 'rangeNumber'),
                                  mkF('mLevel', 'rangeNumber'),
                                  mkF('mWithoutEffects', 'array', { multiSelectOptions: Object.keys(effectSrc), hasRange: 'cB.monsterCountRange', popup: true, itemSchema: { type: 'text' } }),
];
const conditionsTarget = [
    mkF('tName', 'text'),
                                  mkF('tTypes', 'array', { multiSelectOptions: MONSTER_TYPES, popup: true, itemSchema: { type: 'text' } }),
                                  mkF('tClasses', 'array', { multiSelectOptions: MONSTER_CLASSES, popup: true, itemSchema: { type: 'text' } }),
                                  mkF('tPowerLevel', 'rangeNumber'),
                                  mkF('tIndex', 'rangeNumber'),
                                  mkF('tHP', 'rangeNumber'),
                                  mkF('tMP', 'rangeNumber'),
                                  mkF('tSP', 'rangeNumber'),
                                  mkF('tEffects', 'array', { multiSelectOptions: Object.keys(effectSrc), hasRange: 'cB.remainingTurnsRange', popup: true, itemSchema: { type: 'text' } }),
                                  mkF('tIgnoredEffects', 'array', { multiSelectOptions: Object.keys(effectSrc), hasRange: 'cB.remainingTurnsRange', popup: true, itemSchema: { type: 'text' } }),
                                  mkF('tEffectStacks', 'array', { multiSelectOptions: Object.keys(effectSrc), hasRange: 'cB.stacksRange', popup: true, itemSchema: { type: 'text' } }),
                                  mkF('tDaysSinceUpdate', 'rangeNumber'),
].map(f => ({
    ...f,
    extraFields: [
        { key: 'offset', type: 'rangeNumber' },
        { key: 'matched', type: 'rangeNumber', defaultValue: [1, 1] },
    ].map(ef => ({ ...ef, label: `cB.${ef.key}` }))
}));
const cfgBattleSchema = {
    type: 'object',
    properties: [
        mkF('basic', 'heading', { class: 'heading' }),
                                  mkF('advanceToNextRound', 'boolean'),
                                  mkF('ajaxRound', 'boolean'),
                                  mkF('showCooldowns', 'boolean'),
                                  mkF('quickbarExtend', 'array', { itemSchema: { type: 'text' } }),
                                  mkF('showDurations', 'boolean'),
                                  mkF('showRealTimeProficiency', 'boolean'),
                                  mkF('showMonsterIndex', 'boolean'),
                                  mkF('showMonsterInfo', 'boolean'),
                                  mkF('showMonsterHP', 'boolean'),
                                  mkF('recordBattleLog', 'boolean'),
                                  mkF('dailyStaminaQuotaPlus', 'number'),
                                  mkF('ctrlWidgetStyleText', 'text', { placeholder: 'opacity: 0.75;' }),
                                  mkF('ctrlWidgetMouseEnter', 'boolean'),
                                  mkF('ctrlWidgetRows', 'fieldPicker', { prefix: 'cW.', size: 8, allFields: CTRLWIDGET_FIELDS }),

                                  mkF('battleModeSettings', 'heading', { class: 'heading' }),
                                  {
                                      key: 'modes', type: 'dropdown', label: 'cB.modes',
                                      hasModeDropdown: 'battleMode',
                                      options: {
                                          battleStyle: BATTLE_STYLES.map(key => ({ value: key, label: `cB.${key}` })),
                                  battleType: ['General', ...BATTLE_TYPES].map(key => ({ value: key, label: `cB.${key}` })),
                                      },
                                      flatten: '_',
                                      itemSchema: {
                                          type: 'object',
                                          properties: [
                                              mkF('keyBindings', 'keyBasedObjectArray', {
                                                  class: 'heading',
                                                  canDisable: true,
                                                  flatten: true,
                                                  itemSchema: {
                                                      type: 'object',
                                                      discriminator: 'type',
                                                      oneOf: {
                                                          target: mkItem('target', null, [{ key: 'priorityRule', type: 'dropdown', options: PRIORITY_RULES }], true, true),
                                                  spellSupport: mkItem('spellSupport', SPELLS_SUPPORT, true, true),
                                                  item: mkItem('item', ITEMS, true, true),
                                                  toggle: mkItem('toggle', TOGGLE, [{ key: 'toggled', type: 'boolean' }], true, true),
                                                  stop: mkItem('stop', null, [{ key: 'customMessage', type: 'text' }]),
                                                  smartDebuff: mkItem('smartDebuff', SPELLS_DEBUFF, [
                                                      { key: 'targetCount', type: 'dropdown', options: [3, 2, 1] },
                                                      { key: 'bottomUp', type: 'boolean' },
                                                      { key: 'tailSkip', type: 'number' },
                                                      { key: 'maxAtFirst', type: 'number' },
                                                      { key: 'minMonstersLeft', type: 'number' }
                                                  ], true, true),
                                                  spellDebuff: mkItem('spellDebuff', SPELLS_DEBUFF, [], true, true),
                                                  spellDamage: mkItem('spellDamage', SPELLS_DAMAGE, [], true, true),
                                                  skill: mkItem('skill', SKILLS, [], true, true),
                                                  normalAttack: mkItem('normalAttack', null, [], false, false),
                                                  kamisamaniNattaHi: mkItem('kamisamaniNattaHi', null, [
                                                      { key: 'code', skipLabel: true, type: 'textarea' }
                                                  ], false, false),
                                                      }
                                                  }
                                              }),
                                              mkF('supports', 'array', {
                                                  class: 'heading',
                                                  canDisable: true,
                                                  itemSchema: {
                                                      type: 'object',
                                                      discriminator: 'type',
                                                      oneOf: {
                                                          spellSupport: mkItem('spellSupport', SPELLS_SUPPORT, true, true),
                                                  item: mkItem('item', ITEMS, true, true),
                                                  toggle: mkItem('toggle', TOGGLE, [{ key: 'toggled', type: 'boolean' }]),
                                                  stop: mkItem('stop', null, [{ key: 'customMessage', type: 'text' }]),
                                                      }
                                                  }
                                              }),
                                              mkF('attacks', 'array', {
                                                  class: 'heading',
                                                  canDisable: true,
                                                  itemSchema: {
                                                      type: 'object',
                                                      discriminator: 'type',
                                                      oneOf: {
                                                          target: mkItem('target', null, [{ key: 'priorityRule', type: 'dropdown', options: PRIORITY_RULES }], true, true),
                                                  toggle: mkItem('toggle', TOGGLE, [{ key: 'toggled', type: 'boolean' }], true, true),
                                                  smartDebuff: mkItem('smartDebuff', SPELLS_DEBUFF, [
                                                      { key: 'targetCount', type: 'dropdown', options: [3, 2, 1] },
                                                      { key: 'bottomUp', type: 'boolean' },
                                                      { key: 'tailSkip', type: 'number' },
                                                      { key: 'maxAtFirst', type: 'number' },
                                                      { key: 'minMonstersLeft', type: 'number' }
                                                  ], true, true),
                                                  spellDebuff: mkItem('spellDebuff', SPELLS_DEBUFF, [], true, true),
                                                  spellDamage: mkItem('spellDamage', SPELLS_DAMAGE, [], true, true),
                                                  skill: mkItem('skill', SKILLS, [], true, true),
                                                  normalAttack: mkItem('normalAttack', null, [], false, false),
                                                  kamisamaniNattaHi: mkItem('kamisamaniNattaHi', null, [
                                                      { key: 'code', skipLabel: true, type: 'textarea' }
                                                  ], false, false),
                                                      }
                                                  }
                                              })
                                          ]
                                      }
                                  }
    ]
};
const cfgStatsSchema = {
    type: 'object',
    properties: [
        mkF('basic', 'heading', { class: 'heading', prefix: 'cS.' }),
                                  mkF('darkMode', 'boolean', { prefix: 'cS.' }),
                                  mkF('combatRows', 'fieldPicker', {
                                      prefix: 'cS.',
                                      size: 16,
                                      allFields: COMBAT_FIELDS,
                                      editFields: [
                                          { key: 's_pd' },
                                          { key: 's_md' },
                                          { key: 's_td' },
                                          { key: 's_pt' },
                                          { key: 's_ps' },
                                          { key: 's_mt' },
                                          { key: 's_ms' },
                                          { key: 's_tt' },
                                      ].map(f => ({ ...f, label: `cS.${f.key}`, placeholder: 'background-color: red' })),
                                  }),
                                  mkF('revenueRows', 'fieldPicker', {
                                      prefix: 'cS.',
                                      size: 16,
                                      allFields: REVENUE_FIELDS,
                                      editFields: [
                                          { key: 'styleText', label: 'cS.styleText', placeholder: 'color: red;' },
                                      ],
                                  }),
                                  mkF('statsColumns', 'fieldPicker', {
                                      prefix: 'cS.',
                                      size: 16,
                                      allFields: STATS_FIELDS,
                                      editFields: [
                                          { key: 'customName', label: 'cS.customName' },
                                          { key: 'styleText', label: 'cS.styleText', placeholder: 'color: red;' },
                                          { key: 'colorThresholds', label: 'cS.colorThresholds', placeholder: '500:#c31dcf, 1000:red' },
                                      ],
                                  }),
    ]
};

let spellCooldowns;
let itemCooldowns;
let vitals;
let spiritStatus = false;
let playerEffectsObj;
let monstersObj;
let conditionsObj;

const I18N = {
    cW: {
        ctrlWidgetRows: 'ctrlWidget Rows',
        isActiveBattle: 'Active',
        OneHanded: 'OneHanded', '1H_Mage': '1H Mage', TwoHanded: 'TwoHanded', '2H_Mage': '2H Mage',
        DualWielding: 'DualWielding', DW_Mage: 'DW Mage', NitenIchiryu: 'NitenIchiryu', NI_Mage: 'NI Mage',
    },
    sGen: {
        downloadBattleLog: 'Download Battle Log',
    },
    cB: {
        advanceToNextRound: 'Auto advance to next round',
        ajaxRound: "Enable AJAX for advancing to the next round. Disable it if other scripts don't support it.",
        showCooldowns: 'Show cooldowns (show cooldowns on the quickbar)',
                                  quickbarExtend: 'Quickbar extend (ikey_p, Health Draught, Heartseeker...)',
                                  showDurations: 'Show effect durations (show effect durations)',
                                  showRealTimeProficiency: 'Show real-time proficiency (show live proficiency gains during battle)',
                                  showMonsterIndex: 'Show monster index',
                                  showMonsterInfo: '(Monster DB script required) Show monster information, includes class, attack type, and power level',
                                  showMonsterHP: 'Show monster HP (display current and max hp of monsters)',
                                  recordBattleLog: 'Record battle log (records the raw battle log, such as: "Monster hits you for 10 holy damage.", "You use a Mana Potion.")',
                                  dailyStaminaQuotaPlus: 'Daily stamina quota plus',
                                  ctrlWidgetStyleText: 'Control Widget style text',
                                  ctrlWidgetMouseEnter: 'Listen for mouse enter event on Control Widget',

                                  battleModeSettings: 'Battle Mode Settings',

                                  keyBindings: 'Key Bindings', duplicateKeys: 'Key already exists!', addNewKeyBinding: 'Add New Key Binding',

                                  spellSupport: 'Spell Support', customMessage: 'Show custom message',

                                  priorityRule: 'Priority Rule', smartDebuff: 'Smart Debuff', targetCount: 'Target Count', bottomUp: 'Bottom Up (process from monster J to A)',
                                  tailSkip: 'Tail skip (skip the last N monsters if positive, or only target the first N monsters if negative',
                                  maxAtFirst: 'Max casts if less than 2 monsters are defeated',
                                  minMonstersLeft: 'Monsters left threshold for infinite casting', spellDebuff: 'Spell Debuff', spellDamage: 'Spell Damage', normalAttack: 'Normal Attack', kamisamaniNattaHi: 'Kamisama ni Natta Hi',

                                  pLevel: 'Player Level Range', pMaxSpellType: 'Player Max Spell Type', battleTypes: 'Battle Types',
                                  roundCurrent: 'Current Round Range', roundLeft: 'Round Left Range', roundTotal: 'Total Round Range', floor: 'Floor Range',
                                  pActionCooldown: 'Player Action Cooldown Range', pActionCounts: 'Player Action Counts Range',
                                  pHP: 'Player HP Percent Range', pMP: 'Player MP Percent Range', pSP: 'Player SP Percent Range', pOC: 'Player OC Percent Range',
                                  pSpiritStatus: 'Player Spirit Status', pEffects: 'Player Effects', pIgnoredEffects: 'Player Ignored Effects', pEffectStacks: 'Player Effect Stacks',
                                  monsters: 'Monsters Range', activeMonsters: 'Monsters Left Range', defeatedMonsters: 'Monsters Defeated Range',
                                  bosses: 'Bosses Range', activeBosses: 'Bosses Left Range', defeatedBosses: 'Bosses Defeated Range',
                                  mLevel: 'Monster Level Range', mWithoutEffects: 'Monster without Effects Range',

                                  offset: 'Target offset range', matched: 'Matched count range',
                                  tName: 'Monster Name', tTypes: 'Monster Types', tClasses: 'Monster Classes', tPowerLevel: 'Monster Power Level Range', tIndex: 'Monster Index Range',
                                  tHP: 'Monster HP Range', tMP: 'Monster MP Range', tSP: 'Monster SP Range', tEffects: 'Monster Effects', tIgnoredEffects: 'Monster Ignored Effects', tEffectStacks: 'Monster Effect Stacks', tDaysSinceUpdate: 'Monster Days Since Update Range',

                                  OneHanded: 'OneHanded', '1H_Mage': '1H Mage', TwoHanded: 'TwoHanded', '2H_Mage': '2H Mage',
                                  DualWielding: 'DualWielding', DW_Mage: 'DW Mage', NitenIchiryu: 'NitenIchiryu', NI_Mage: 'NI Mage',

                                  importCustomCodeWarning: 'This configuration contains custom JavaScript code that will be executed as part of the battle automation.\n\nOnly import configurations from trusted sources. Malicious code may access or modify data available to this page or perform actions on your behalf.\n\nDo you want to continue?',
    },
    cS: {
        s_pd: 'Physical Dealt Inline Style', s_md: 'Magical Dealt Inline Style', s_td: 'Total Dealt Inline Style', s_pt: 'Physical Taken Inline Style',
        s_ps: 'Physical Taken Spirit Inline Style', s_mt: 'Magical Taken Inline Style', s_ms: 'Magical Taken Spirit Inline Style', s_tt: 'Total Taken Inline Style',
        styleText: 'Inline Style',

        exportDB: 'Export DB', importDB: 'Import DB',
        importConfirm: 'Do you want to merge the imported data?\nPress OK to only add new records (Merge), or Cancel to overwrite existing data (Overwrite).',
    },
    tP: {
        't/s': 't/s',
    },
    cP: {
        damageDealt: 'Damage Dealt', damageTaken: 'Damage Taken',
        damagePlus: 'Damage Plus', damageTotal: 'Damage Total',
        resultTotal: 'Result Total',
        resist50: 'Resist 50', resist75: 'Resist 75', resist90: 'Resist 90',
        parryPartially: 'Partial Parry', resistPartially: 'Partial Resist', blockPartially: 'Partial Block', resultPartiallyTotal: 'Partial Total',
        critStack: 'Crit Stacks', debuffResist: 'Debuff Resists', debuffResist0: 'Resist 0', 'debuffResist1-2': 'Resist 1-2', debuffResist3: 'Resist 3',
        spellSupport: 'Supportive', spellDamage: 'Offensive', spellDebuff: 'Deprecating',
    },
    rP: {
        unitPrice: 'Unit Price',
        'dual-wielding': 'dual-wielding',
        'staff': 'staff',
    },
    sP: {
        'jpxStats': 'jpx Stats',

        roundTotal: 'Total Round Range',

        pDGlance: 'PDGlance', pDHit: 'PDHit', pDCrit: 'PDCrit', mDGlance: 'MDGlance', mDHit: 'MDHit', mDCrit: 'MDCrit',
        mDRes: 'MDRes', mDRes50: 'MDRes50', mDRes75: 'MDRes75', mDRes90: 'MDRes90', mDResP: 'MDResP', mDDRes0: 'MDDRes0', mDDRes12: 'MDDRes12', mDDRes3: 'MDDRes3',

        uCure: 'Cure', uFullCure: 'FCure', uCloakOfTheFallen: 'Spark', uImperil: 'Imp',
        eqP: 'EqP', eqL: 'EqL', eqM: 'EqM',
        lCharm: 'LCh', gCharm: 'GCh',
        hd: 'HD', md: 'MD', sd: 'SD', hp: 'HP', mp: 'MP', sp: 'SP', he: 'HE', me: 'ME', se: 'SE', le: 'LE', ed: 'ED',
    }
};
const mergedI18N = {};

function initDo() {
    let style = document.createElement('style');
    style.id = 'jpx';
    style.textContent = cfg.styleText;
    document.head.appendChild(style);

    appendConfigButton();
    applyAppearance();

    window.addEventListener('beforeunload', storeTmp);
    document.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('.multiSelect-popup-panel') && !e.target.classList.contains('multiSelect-summary')) {
            document.querySelectorAll('.multiSelect-popup-panel').forEach(p => p.style.display = 'none');
        }
    });
    const throttledActionManager = jpxUtils.throttle(actionManager, 75);
    document.addEventListener('keydown', (e) => onKeyDown(e, throttledActionManager), true);

    initDoI18n();

    let queries = location.search.match(regExp.locationQueries) || [];
    let queriesObj = Object.fromEntries(queries.map(
        (query) => {
            return query.split('=', 2);
        }
    ));
    log = document.querySelector('#textlog');

    //Battle
    if (log && !doInitDoBattle) {
        initDoBattle();
        return;
    }

    //Riddle
    if (document.querySelector('#riddlemaster')) {
        riddleRecorder();
        return;
    }

    //Lobby
    if (!log) {
        if (
            (queriesObj.s === 'Bazaar' && queriesObj.ss === 'am' && queriesObj.screen === 'modify') ||
            (queriesObj.s === 'Battle' && queriesObj.ss === 'iw')
        ) {
            let equipForm = document.querySelector('#equipform');
            if (!equipForm) return;

            let observer = new MutationObserver(() => {
                let iwinfo = document.getElementById('iwinfo');
                if (!iwinfo) return;

                let info = {};
                iwinfo.querySelectorAll('tr').forEach(tr => {
                    let [keyTd, valueTd] = tr.querySelectorAll('td');
                    info[keyTd.textContent.slice(0, -1)] = valueTd.textContent;
                });
                localStorage.setItem(prefix + 'worldLevel' + isekaiSuffix, info['World Level']);
                localStorage.setItem(prefix + 'difficump' + isekaiSuffix, info['Difficump'].split(' ')[0]);
            });

            observer.observe(equipForm, { childList: true, subtree: true });
        }

        if (queriesObj.s === 'Battle') {
            let levelReadout = document.querySelector('#level_readout > div > div')?.innerText;
            let playerInfo = levelReadout.match(regExp.playerInfo);
            if (playerInfo) {
                let difficump = localStorage.getItem(prefix + 'difficump' + isekaiSuffix) || 'undefined';
                let playerLevel = parseInt(localStorage.getItem(prefix + 'playerLevel' + isekaiSuffix)) || 0;
                if (difficump != playerInfo[1]) localStorage.setItem(prefix + 'difficump' + isekaiSuffix, playerInfo[1]);
                if (playerLevel != playerInfo[1]) localStorage.setItem(prefix + 'playerLevel' + isekaiSuffix, playerInfo[2]);
            }
            let staminaReadout = document.querySelector('#stamina_readout > div > div')?.innerText;
            let staminaInfo = staminaReadout.match(regExp.staminaInfo)?.[1];
            if (staminaInfo) {
                let stamina = parseFloat(localStorage.getItem(prefix + 'stamina' + isekaiSuffix)) || 80;
                if (stamina != staminaInfo) localStorage.setItem(prefix + 'stamina' + isekaiSuffix, staminaInfo);
            }
        }

        let persona = localStorage.getItem(prefix + 'persona' + isekaiSuffix) || 'undefined';
        let personaSelected = document.querySelector('#persona_form > select > option[selected]')?.innerText;
        if (personaSelected && persona != personaSelected) {
            localStorage.setItem(prefix + 'persona' + isekaiSuffix, personaSelected);
        }

        let spcArray = Array.from(document.querySelectorAll('.spc'));
        let spellDamageBonus = spcArray.find(spc =>
        spc.innerText.includes('Spell Damage Bonus') || jpxUtils.parseHVClasses(spc.querySelector('div')).includes('Spell Damage Bonus')
        );
        if (spellDamageBonus) {
            let rows = spellDamageBonus.nextElementSibling.querySelectorAll('tr');
            let maxValue = -Infinity;
            let maxType = "";

            rows.forEach((tr) => {
                let tds = tr.querySelectorAll('td');
                if (tds.length < 2) return;

                let value = parseFloat(tds[0].textContent.trim());
                let spellsDamageType = tds[1].textContent.trim();

                if (value > maxValue) {
                    maxValue = value;
                    maxType = jpxUtils.lowerFirst(spellsDamageType);
                }
            });

            if (
                (maxType && spellDamageBonus.maxType != maxType) ||
                (maxValue > 0 && spellDamageBonus.maxValue != maxValue)
            ) {
                localStorage.setItem(prefix + 'spellDamageBonus' + isekaiSuffix, JSON.stringify({
                    maxType: maxType,
                    maxValue: maxValue,
                }));
            }
        }

        return;
    }
}

function initDoBattle() {
    doInitDoBattle = true;
    window.addEventListener('mousemove', () => {
        if (!jpxPanelManager.ready) jpxPanelManager.ready = true;
    });
        document.addEventListener('DOMContentLoaded', reDoBattle);

        let storedCfgBattle = {};
        try {
            storedCfgBattle = JSON.parse(localStorage.getItem(prefix + 'cfgBattle' + isekaiSuffix) || '{}');
        } catch (err) {
            console.error('Failed to load cfgBattle. Using default cfgBattle.');
            console.error(err);
            storedCfgBattle = {};
        }
        mergeCfg(storedCfgBattle, defaultCfgBattle, cfgBattle, 'battle');

        if (cfgBattle.recordBattleLog) {
            battleLogRecord = JSON.parse(localStorage.getItem(prefix + 'battleLogRecord' + isekaiSuffix) || '[]');
        }
        timeRecords = JSON.parse(localStorage.getItem(prefix + 'timeRecords' + isekaiSuffix) || '{}');
        if (jpxUtils.isEmpty(timeRecords)) timeRecords = jpxUtils.createTimeRecords();
        combatRecords = JSON.parse(localStorage.getItem(prefix + 'combatRecords' + isekaiSuffix) || '{}');
    if (jpxUtils.isEmpty(combatRecords)) combatRecords = jpxUtils.createCombatRecords();
    revenueRecords = JSON.parse(localStorage.getItem(prefix + 'revenueRecords' + isekaiSuffix) || '{}');
    if (jpxUtils.isEmpty(revenueRecords)) revenueRecords = jpxUtils.createRevenueRecords();

    //Battle Style
    let {
        spellCooldowns
    } = getActionCooldowns();
    let spells = Object.keys(spellCooldowns);
    if (spells.includes('Shield Bash')) {
        battleStyle = spellDamageBonus.maxValue <= 70 ? 'OneHanded' : '1H_Mage';
    } else if (spells.includes('Great Cleave')) {
        battleStyle = spellDamageBonus.maxValue <= 100 ? 'TwoHanded' : '2H_Mage';
    } else if (spells.includes('Iris Strike')) {
        battleStyle = spellDamageBonus.maxValue <= 100 ? 'DualWielding' : 'DW_Mage';
    } else if (spells.includes('Skyward Sword')) {
        battleStyle = spellDamageBonus.maxValue <= 100 ? 'NitenIchiryu' : 'NI_Mage';
    } else if (spells.includes('Concussive Strike')) {
        battleStyle = 'Staff';
    } else {
        battleStyle = 'Unarmed';
    }

    //Battle Type
    let battleTypeLog = log.innerHTML.match(regExp.battleTypeLog);
    if (battleTypeLog) {
        if (battleTypeLog[1].includes('arena challenge') && !battleTypeLog[1].includes('Round 1 / 1)')) {
            battleType = 'Arena';
        } else if (battleTypeLog[1].includes('random encounter')) {
            battleType = 'Encounter';
        } else if (battleTypeLog[1].includes('arena challenge') && battleTypeLog[1].includes('Round 1 / 1)')) {
            battleType = 'Colosseum';
        } else if (battleTypeLog[1].includes('Grindfest')) {
            battleType = 'Battle1000';
        } else if (battleTypeLog[1].includes('Item World')) {
            battleType = 'Item';
        } else if (battleTypeLog[1].includes('The Tower')) {
            battleType = 'Tower';
            let floor = battleTypeLog[1].match(regExp.floor);
            if (floor) towerFloor = floor[1];
        }
    }
    if (battleType)localStorage.setItem(prefix + 'battleType' + isekaiSuffix, battleType);
    else battleType = localStorage.getItem(prefix + 'battleType' + isekaiSuffix) || '';

    //World Level
    if (battleType === 'Item') {
        worldLevel = parseInt(localStorage.getItem(prefix + 'worldLevel' + isekaiSuffix)) || 0;
        //Tower Floor
    } else if (battleType === 'Tower') {
        if (towerFloor) localStorage.setItem(prefix + 'towerFloor' + isekaiSuffix, towerFloor);
        else towerFloor = parseInt(localStorage.getItem(prefix + 'towerFloor' + isekaiSuffix)) || 0;

        let difficump = 'PFUDOR';;
        if (jpxUtils.inRange(towerFloor, [1, 6])) difficump = 'Normal';
        else if (jpxUtils.inRange(towerFloor, [7, 13])) difficump = 'Hard';
        else if (jpxUtils.inRange(towerFloor, [14, 19])) difficump = 'Nightmare';
        else if (jpxUtils.inRange(towerFloor, [20, 26])) difficump = 'Hell';
        else if (jpxUtils.inRange(towerFloor, [27, 33])) difficump = 'Nintendo';
        else if (jpxUtils.inRange(towerFloor, [34, 39])) difficump = 'IWBTH';
        localStorage.setItem(prefix + 'difficump' + isekaiSuffix, difficump);
    }

    preDoBattle();

    if (battleType === 'Arena' && roundInfo.total >= 90) {
        localStorage.setItem(prefix + 'difficump' + isekaiSuffix, 'PFUDOR');
    }
}

function reDoBattle(e) {
    if (e?.isTrusted) return;
    if (document.querySelector('#riddlemaster')) {
        riddleRecorder();
        return;
    }
    battleEndSoundPlayed = false;
    isActiveBattle = false;
    updateTitle();
    if (cfgBattle.ctrlWidgetMouseEnter) jpxPanelManager.ready = false;
    monsterData = [];
    localStorage.removeItem(prefix + 'monsterData' + isekaiSuffix);
    allMonsterInfo = {};
    actionCounts = {};
    monstersEffects = {};
    log = document.querySelector('#textlog');
    log && preDoBattle();
    jpxPanelManager.setBackground('#fef');
    jpxPanelManager.dispatchState();
}

function preDoBattle() {
    //Round
    let round = log.innerHTML.match(regExp.round);
    let storedRoundInfo = JSON.parse(localStorage.getItem(prefix + 'roundInfo' + isekaiSuffix) || '{}');
    if (battleType !== 'Encounter') {
        if (round) {
            roundInfo.current = +round[1];
            roundInfo.total = +round[2];
            localStorage.setItem(prefix + 'roundInfo' + isekaiSuffix, JSON.stringify(roundInfo));
        } else {
            roundInfo.current = storedRoundInfo.current || 0;
            roundInfo.total = storedRoundInfo.total || 0;
        }
    }

    //Proficiency Record
    if (cfgBattle.showRealTimeProficiency) {
        let proficiencyRecord = document.querySelector('#proficiency-record');
        if (!proficiencyRecord) {
            proficiencyRecord = document.createElement('table');
            proficiencyRecord.id = 'proficiency-record';
            document.querySelector('#csp').appendChild(proficiencyRecord);
        }

        let proficiencyKeys = Object.keys(revenueRecords.proficiency);
        if (proficiencyKeys.length) {
            let innerHTMLTemp = '';
            let order = REVENUE_FIELDS.find(f => f.id === 'proficiency').order;
            let sortedKeys = jpxUtils.getSortedKeys(order, proficiencyKeys);
            for (const sortedKey of sortedKeys) {
                let value = revenueRecords.proficiency[sortedKey];
                if (value) innerHTMLTemp += `<tr><td>${Math.round(value * 1000) / 1000}</td><td>${t(`rP.${sortedKey}`)}</td></tr>`;
            }
            proficiencyRecord.innerHTML = `<tbody>${innerHTMLTemp}</tbody>`;
        }
    }

    //Monster Data
    let matches;
    while ((matches = regExp.monster.exec(log.innerHTML)) !== null) {
        monsterData.unshift({
            id: +matches[1],
            name: matches[2],
            level: +matches[3],
            maxHP: +matches[4],
        });
    }
    let storedMonsterData = JSON.parse(localStorage[prefix + 'monsterData' + isekaiSuffix] || '[]');
    if (monsterData.length) {
        localStorage.setItem(prefix + 'monsterData' + isekaiSuffix, JSON.stringify(monsterData));
    } else if (storedMonsterData) {
        monsterData = storedMonsterData;
    }

    updateMonsterInfo();

    //Riddle
    if (log.textContent.includes('You gain the effect Blessing of the RiddleMaster.') && timeRecords.riddle.lastTurn !== timeRecords.turn) {
        timeRecords.riddle.lastTurn = timeRecords.turn;
        timeRecords.riddle.total += 1;
    }

    jpxPanelManager.createCtrlWidget('battle');

    let throttledPreProcessLog = jpxUtils.throttle(preProcessLog, 200, true);
    let obs = new MutationObserver(throttledPreProcessLog);
    obs.observe(log.firstChild, { childList: true });

    preRender();
}

function preProcessLog() {
    lastActionTimestamp = lastLogTimestamp;
    lastLogTimestamp = Date.now();

    updateTitle();

    let td = Array.from(log.getElementsByTagName('td'));
    for (let i = 0; i < td.length; i++) {
        if (td[i].className == 'tls') td[i].innerHTML = '<hr>';
    }

    battleRecorder();

    let btcp = document.querySelector('#btcp');
    let finishBattle = document.querySelector('img[src$="finishbattle.png"]');
    if (finishBattle && !battleEndSoundPlayed) {
        battleEndSoundPlayed = true;
        const result = getBattleResult();
        if (result) {
            playBattleEndSound(result);
        }
    }
    if (btcp) {
        localStorage.removeItem(prefix + 'monsterData' + isekaiSuffix);

        if (finishBattle) {
            btcp.setAttribute('style', 'display: block; width: max-content; min-width: 380px; max-width: 530px; height: auto; min-height: 120px; max-height: 621px; overflow: auto;');

            battleRecordPlayer();

            localStorage.removeItem(prefix + 'battleLogRecord' + isekaiSuffix);
            localStorage.removeItem(prefix + 'timeRecords' + isekaiSuffix);
            localStorage.removeItem(prefix + 'combatRecords' + isekaiSuffix);
            localStorage.removeItem(prefix + 'revenueRecords' + isekaiSuffix);

            return;
        }
    }

    preRender();
}

function preRender() {
    ({ spellCooldowns, itemCooldowns } = getActionCooldowns(true));
    vitals = getVitals();
    spiritStatus = getSpiritStatus();
    monstersObj = getMonsters(true);
    conditionsObj = null;

    let { monsters, activeMonsters } = monstersObj;

    //Monster Effects
    updateMonsterEffects();

    //Player Effects and Render All
    playerEffectsObj = getEffectDuration(cfgBattle.showDurations);

    //Monster HP
    if (cfgBattle.showMonsterHP) {
        for (let i = 0; i < monsters.length; i++) {
            if (!monsterData[i]) break;
            if (monsters[i].hpPercentage) {
                let maxHP = monsterData[i].maxHP;
                let hpDiv = document.createElement('div');
                hpDiv.className = 'monster-hp';
                hpDiv.innerText = 'HP: ' + Math.round(maxHP * monsters[i].hpPercentage).toLocaleString() + ' / ' + maxHP.toLocaleString();
                monsters[i].monster_btm1.appendChild(hpDiv);
            }
        }
    }

    jpxPanelManager.updateContent('battle');

    goNext();
}

function goNext() {
    if (isActiveBattle) {
        jpxPanelManager.setBackground('#4f4');

        //End of Round
        let btcp = document.querySelector('#btcp');
        let finishBattle = document.querySelector('img[src$="finishbattle.png"]');
        if (!monstersObj.activeMonsters[0] || finishBattle) {
            if (btcp && !finishBattle) {
                if (cfgBattle.ajaxRound) {
                    btcp.onclick = async function() {
                        if (btcp.style.visibility === 'hidden') return;
                        btcp.style.visibility = 'hidden';

                        function bindRiddleForm(riddleform) {
                            let submitting = false;

                            riddleform.addEventListener('submit', async e => {
                                e.preventDefault();
                                if (submitting) return;
                                submitting = true;
                                const controller = new AbortController();
                                const timer = setTimeout(() => controller.abort(), 15000);
                                try {
                                    const formData = new FormData(riddleform);
                                    const submitBtn = e.submitter || riddleform.querySelector('#riddlesubmit');
                                    if (submitBtn?.name) formData.append(submitBtn.name, submitBtn.value);

                                    const response = await fetch(riddleform.action || location.href, {
                                        method: 'POST',
                                        body: new URLSearchParams(formData),
                                                                 signal: controller.signal,
                                                                 headers: {
                                                                     'Content-Type': 'application/x-www-form-urlencoded',
                                                                     'Cache-Control': 'max-age=0',
                                                                 },
                                    });
                                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                                    if (response.redirected) {
                                        location.href = response.url;
                                        return;
                                    }
                                    const html = await response.text();
                                    updateBattleMain(new DOMParser().parseFromString(html, 'text/html'));
                                } catch (err) {
                                    console.error('Submission failed: ', err);
                                    jpxUtils.createToast('Submission failed: ' + err);
                                } finally {
                                    submitting = false;
                                    clearTimeout(timer);
                                }
                            });
                        }

                        function updateBattleMain(doc) {
                            let main = document.querySelector('#battle_main');
                            let mainNew = doc.querySelector('#battle_main');

                            document.querySelector('#riddle-panel')?.remove();
                            clearInterval(window.timer);

                            if (main && mainNew) {
                                main.replaceWith(mainNew);
                            } else {
                                document.body.innerHTML = doc.body.innerHTML;
                            }

                            let t = setTimeout(() => {}, 0);
                            for (let i = t; i > 0 && i > t - 100; clearInterval(i--));
                            jpxPageWindow.battle = new jpxPageWindow.Battle()
                            document.dispatchEvent(new Event('DOMContentLoaded'));
                        }

                        await jpxUtils.xhrGet([location.href]).then((results) => {
                            for (let result of results) {
                                if (result.status === 'rejected') {
                                    console.error(result.reason);
                                    break;
                                }
                                try {
                                    let parser = new DOMParser();
                                    let doc = parser.parseFromString(result.value.responseText, 'text/html');

                                    if (doc.querySelector('#riddlemaster')) {
                                        // AJAX 弹层下仍留有上一关的 Battle 键盘处理，会误调用失效的 onclick。
                                        // 恢复战斗时 updateBattleMain() 中的 new Battle() 会重新安装。
                                        document.onkeydown = null;
                                        let riddlePanel = document.createElement('div');
                                        riddlePanel.id = 'riddle-panel';
                                        riddlePanel.style.cssText = 'position:fixed; top:0; left:0; z-index:9999; border:2px solid black; overflow:auto;';
                                        riddlePanel.appendChild(document.importNode(doc.body, true));
                                        document.body.appendChild(riddlePanel);

                                        updateTitle();

                                        bindRiddleForm(riddlePanel.querySelector('#riddleform'));

                                        let script = document.createElement('script');
                                        script.type = 'text/javascript';
                                        script.innerHTML = doc.getElementsByTagName('script')[2]?.innerHTML.replace('e("riddleform").submit();', 'e("riddleform")?.requestSubmit();');
                                        riddlePanel.querySelector('#mainpane').appendChild(script);

                                        document.dispatchEvent(new Event('DOMContentLoaded'));
                                    } else {
                                        updateBattleMain(doc);
                                    }
                                } catch (e) {
                                    console.error('Parsing error for url:', result.value.url);
                                }
                            }
                        });
                    }
                }

                if (cfgBattle.advanceToNextRound) {
                    btcp.click();
                    btcp.style.visibility = 'hidden';
                }
            }
            return;
        }

        switch (readyNext) {
            case -1:
                break;
            default:
                readyNext = -1;
                setTimeout(() => {
                    smartBattle();
                }, 0);
                break;
        }
    }
}

const keybindHandlers = {
    openBattleRecords,
    toggleActive,
    openSettings: renderSettings,
};

function onKeyDown(e, throttledActionManager) {
    if (document.querySelector('#riddle-panel #riddleform')) return;
    if (jpxUtils.keyCaptureController) return;

    let target = e.target;
    if (
        e.isComposing ||
        (target instanceof HTMLInputElement && !target.readOnly && !target.disabled) ||
        (target instanceof HTMLTextAreaElement && !target.readOnly && !target.disabled) ||
        target.isContentEditable
    ) return;

    let currentKB = 'kb_' + jpxUtils.formatKeyCombo({
        key: e.key,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey
    }, '+');

    if (!e.repeat) {
        for (const [action, bind] of Object.entries(userKeybinds)) {
            if (currentKB === ('kb_' + jpxUtils.formatKeyCombo(bind, '+'))) {
                e.preventDefault();
                keybindHandlers[action]?.();
                return;
            }
        }
    }

    if (!log || isActiveBattle || !monstersObj.activeMonsters[0]) return;
    let actions = cfgBattle[getBattleMode()][currentKB];
    if (actions) {
        e.preventDefault();
        (e.repeat ? throttledActionManager : actionManager)(actions);
    }
}

function toggleActive() {
    if (!log) return;
    isActiveBattle = !isActiveBattle;
    updateTitle();
    jpxPanelManager.updateContent('battle');
    jpxPanelManager.setBackground(isActiveBattle ? '#4f4' : '#fef');
    if (isActiveBattle) goNext();
    jpxPanelManager.dispatchState();
}

//Battle Smart
function smartBattle() {
    let { supports, attacks } = cfgBattle[getBattleMode()];
    if (supports.length < 1) {
        readyNext = '\nWith so few conditions, you might die in auto-battle.';
        jpxPanelManager.updateContent('battle');
        jpxPanelManager.setBackground('#ff5');
        return true;
    }
    if (actionManager(supports)) return true;
    if (actionManager(attacks)) return true;
    readyNext = '\nNo available action.';
    jpxPanelManager.updateContent('battle');
    jpxPanelManager.setBackground('#ff5');

    return false;
}

//Battle Utils
function doSpellsDebuffGoNext({name, targetCount = 3, tailSkip = 0, bottomUp = false, maxAtFirst = Infinity, minMonstersLeft = 10, conditions}) {
    let { monsters, activeMonsters } = monstersObj;

    if (spellCooldowns[name] !== 0) return false;

    let maxDo = 0;
    if (monsters.length - activeMonsters.length <= 1) {
        maxDo = maxAtFirst;
    } else if (activeMonsters.length <= minMonstersLeft) {
        maxDo = Infinity;
    }
    if ((actionCounts[name] ?? 0) >= maxDo) return false;

    let startIndex = 0;
    let endIndex = 0;
    let firstIndex = activeMonsters[0].index;
    let lastIndex = activeMonsters.at(-1).index;
    let dir = !bottomUp ? 1 : -1;
    if (!bottomUp) {
        startIndex = firstIndex;
        endIndex = tailSkip >= 0
        ? lastIndex + 1 - tailSkip
        : startIndex + Math.abs(tailSkip);
    } else {
        startIndex = monsters.length - 1 - lastIndex;
        endIndex = tailSkip >= 0
        ? monsters.length - (firstIndex + tailSkip)
        : startIndex + Math.abs(tailSkip);
    }
    endIndex = Math.min(endIndex, monsters.length);
    if (endIndex <= 0) return false;

    let undebuffedObj = {};
    const isUnDebuffed = (i) => {
        return undebuffedObj[i] ??= (
            !!monsters[i]?.isAlive &&
            checkConditions(conditions, monsters[i], false)
        );
    };
    const getIndex = (j) => !bottomUp ? j : monsters.length - 1 - j;

    if (targetCount >= 3) {
        for (let i = startIndex + 1; i < endIndex - 1; i++) {
            let j = getIndex(i);
            if (!isUnDebuffed(j - 1) || !isUnDebuffed(j) || !isUnDebuffed(j + 1)) continue;
            doSpellGoNext(name, monsters[j]);
            return true;
        }
    }
    if (targetCount >= 2) {
        for (let i = startIndex; i < endIndex; i++) {
            let j = getIndex(i);
            if (!isUnDebuffed(j - 1) || !isUnDebuffed(j)) continue;
            if ((targetCount === 2 && !bottomUp || targetCount === 3) && i === startIndex && monsters[j + dir]?.isAlive) {
                doSpellGoNext(name, monsters[j + dir]);
            } else if ((targetCount === 2 && bottomUp || targetCount === 3) && i === endIndex - 1 && monsters[j - dir]?.isAlive) {
                doSpellGoNext(name, monsters[j - dir]);
            } else {
                doSpellGoNext(name, monsters[j]);
            }
            return true;
        }
    }
    if (targetCount >= 3) {
        for (let i = startIndex + 1; i < endIndex - 1; i++) {
            let j = getIndex(i);
            if (!isUnDebuffed(j - 1) || !monsters[j]?.isAlive || !isUnDebuffed(j + 1)) continue;
            doSpellGoNext(name, monsters[j]);
            return true;
        }
    }
    for (let i = startIndex; i < endIndex; i++) {
        let j = getIndex(i);
        if (!isUnDebuffed(j)) continue;
        if ((targetCount === 2 && !bottomUp || targetCount === 3) && i === startIndex && monsters[j + dir]?.isAlive) {
            doSpellGoNext(name, monsters[j + dir]);
        } else if ((targetCount === 2 && bottomUp || targetCount === 3) && i === endIndex - 1 && monsters[j - dir]?.isAlive) {
            doSpellGoNext(name, monsters[j - dir]);
        } else {
            doSpellGoNext(name, monsters[j]);
        }
        return true;
    }

    return false;
}

function doSpellGoNext(spell, monster) {
    readyNext = 0;
    if (monster.isAlive && spellCooldowns[spell] === 0) {
        cast(spell);
        monster.click();
        return true;
    }
    return false;
}

function doAttackGoNext(monster) {
    readyNext = 0;
    if (monster.isAlive) {
        monster.click();
        return true;
    }
    return false;
}

function doToggleGoNext(name) {
    readyNext = 0;
    let state = document.querySelector('#ckey_' + name.toLowerCase());
    if (state) {
        dummy.setAttribute('onclick', state.getAttribute('onmouseover'));
        dummy.click();
        state.click();
        return true;
    }
    return false;
}

function cast(name) {
    let spell = document.querySelector('.bts > div[onclick][onmouseover*="\'' + name + '\'"]');
    if (document.getElementsByClassName('btii')[0].innerHTML != name && spell) {
        dummy.setAttribute('onclick', spell.getAttribute('onmouseover'));
        dummy.click();
        spell.click();
    }
}

function use(name) {
    let id = Object.entries(itemMap).find(([id, _name]) => _name === name)?.[0];
    if (!id) return;

    let itemArray = Array.from(document.querySelectorAll('.bti3 > div[onclick][onmouseover]'));
    let item = itemArray.find(div => div.outerHTML.includes(id));
    if (item) {
        dummy.setAttribute('onclick', item.getAttribute('onmouseover'));
        dummy.click();
        item.click();
    }
}

function getActionCooldowns(render = false) {
    let quickbarObj = {};

    function scan({selector, regexp, getName, getInitlCooldown}) {
        let result = {};

        for (const slot of document.querySelectorAll(selector)) {
            let tooltip = slot.getAttribute('onmouseover');
            let matches = tooltip?.match(regexp);

            let name;
            if (matches) {
                name = getName(matches);
            } else {
                name = slot.textContent?.trim() || jpxUtils.parseHVClasses(slot.querySelector('div'), true);
            }
            if (!name) continue;

            let cooldown;
            let onClick = slot.getAttribute('onclick');
            if (onClick) {
                cooldown = 0;
                result[name] = 0;
            } else {
                let lastUse = timeRecords.lastUse[name] ?? -Infinity;
                let initCooldown = getInitlCooldown(matches) ?? 0;
                cooldown = lastUse + initCooldown - timeRecords.turn;

                result[name] = cooldown > 0 ? cooldown : '-';
            }

            if (!render) continue;
            if (slot.id === 'ikey_p') {
                quickbarObj.ikey_p = {
                    name,
                    tooltip,
                    onClick,
                    cooldown,
                };
            } else {
                quickbarObj[name] = {
                    tooltip,
                    onClick,
                    cooldown,
                };
            }
        }

        return result;
    }

    function getQuickName(quick) {
        if (quick.id?.startsWith('extend_')) return quick.id.slice(7);

        let tooltip = quick.getAttribute('onmouseover');
        if (!tooltip) return;

        return tooltip.match(regExp.spellInfo)?.[1];
    }

    function renderQuickbar() {
        let quickbar = document.querySelector('#quickbar');

        for (const name of cfgBattle.quickbarExtend) {
            let quickDiv = document.createElement('div');
            quickDiv.id = `extend_${name}`;
            quickDiv.className = 'btqs extend';

            if (quickbarObj[name]) {
                let innerImg = document.createElement('img');

                let tooltip = quickbarObj[name].tooltip;
                quickDiv.setAttribute('onmouseover', tooltip ? tooltip : '');

                let onClick = quickbarObj[name].onClick;
                if (onClick) quickDiv.setAttribute('onclick', onClick);
                else innerImg.style.opacity = 0.5;

                let spellIconID = tooltip?.match(regExp.spellInfo)?.[2];
                if (spellIconID) {
                    innerImg.src = '/y/a/' + spellIconID + '.png';
                } else {
                    innerImg.src = itemSrc.find(rule => rule.keys.some(key => {
                        if (name === 'ikey_p') return quickbarObj[name].name.includes(key);
                        return name.includes(key);
                    }))?.src ?? '/y/e/channeling.png';
                }

                innerImg.className = 'btqi';
                quickDiv.appendChild(innerImg);
            }

            let outerImg = document.createElement('img');
            outerImg.src = '/y/ab/b.png';
            outerImg.className = 'btqb';
            quickDiv.appendChild(outerImg);
            quickbar.appendChild(quickDiv);
        }

        showCooldowns(quickbar);
    }

    function showCooldowns(quickbar) {
        if (!cfgBattle.showCooldowns) return;

        for (const quick of quickbar.querySelectorAll('.btqs[onmouseover]:not([onclick])')) {
            let name = getQuickName(quick);
            if (!name) continue;

            let cooldown = quickbarObj[name].cooldown;
            if (!(cooldown > 0)) continue;

            let cooldownDiv = document.createElement('div');
            cooldownDiv.className = 'cooldown';
            cooldownDiv.textContent = cooldown;
            quick.appendChild(cooldownDiv);
        }
    }

    let spellCooldowns = scan({
        selector: '.bts > div[onmouseover]',
        regexp: regExp.spellInfo,
        getName: m => m[1],
        getInitlCooldown: m => m ? +m[5] : 0
    });

    let itemCooldowns = scan({
        selector: '.bti3 > div',
        regexp: regExp.itemInfo,
        getName: m => itemMap[+m[1]],
        getInitlCooldown: () => 40
    });

    if (render) renderQuickbar();

    return {
        spellCooldowns,
        itemCooldowns
    };
}

function getVitals() {
    let ocBar = document.querySelector('img[src$="bar_orange.png"]');

    let vitalCfg = ocBar ? {
        widthHP: 414, widthMP: 414, widthSP: 414, widthOC: 414,
        idHP: ['#dvrhb', '#dvrhd'], idMP: '#dvrm', idSP: '#dvrs',
    } : {
        widthHP: 496, widthMP: 207, widthSP: 207,
        idHP: ['#vrhb', '#vrhd'], idMP: '#vrm', idSP: '#vrs',
    };

    let oc = 0;
    if (ocBar) {
        oc = Math.round(10 * parseInt(ocBar.style.width, 10) / vitalCfg.widthOC * 1000) / 1000;
    } else {
        let vcp = document.querySelector('#vcp')?.innerHTML;
        if (vcp) {
            let matches = vcp.match(regExp.oc);
            if (matches) {
                oc = matches.length / 2 - 1;
                if (vcp.match(regExp.ocHalf)) {
                    oc -= 0.5;
                }
            }
        }
    }

    let hpPercentage = Math.round(parseInt(document.querySelector('img[src$="green.png"]').style.width, 10) / vitalCfg.widthHP * 1000) / 1000;
    let mpPercentage = Math.round(parseInt(document.querySelector('img[src$="bar_blue.png"]').style.width, 10) / vitalCfg.widthMP * 1000) / 1000;
    let spPercentage = Math.round(parseInt(document.querySelector('img[src$="bar_red.png"]').style.width, 10) / vitalCfg.widthSP * 1000) / 1000;

    let hpCurrentText = vitalCfg.idHP.map(id => document.querySelector(id)?.innerText).find(Boolean) || "0";
    let hpCurrent = parseInt(hpCurrentText, 10) || 0;
    let mpCurrent = parseInt(document.querySelector(vitalCfg.idMP).innerText, 10);
    let spCurrent = parseInt(document.querySelector(vitalCfg.idSP).innerText, 10);

    let hpMax = Math.round(hpCurrent / hpPercentage * 10) / 10;
    let mpMax = Math.round(mpCurrent / mpPercentage * 10) / 10;
    let spMax = Math.round(spCurrent / spPercentage * 10) / 10;

    return {
        oc,
        hpPercentage, mpPercentage, spPercentage,
        hpCurrent, mpCurrent, spCurrent,
        hpMax, mpMax, spMax,
    }
}

function getSpiritStatus() {
    let ckey_spirit = document.querySelector('#ckey_spirit');
    let spiritStatus = ckey_spirit.outerHTML.includes('spirit_a.png');
    return spiritStatus;
}

function getEffectDuration(render = false) {
    let playerEffectObj = {};
    let effectsPane = document.querySelector('#pane_effects');
    let effects = Array.from(effectsPane.getElementsByTagName('img'));
    let playerEffectsLength = effects.length;

    if (render) effects.push(...document.querySelectorAll('.btm6 > img[onmouseover]'));

    effects.forEach((effect, index) => {
        let tooltip = effect.getAttribute('onmouseover');
        if (!tooltip) return;

        let matches = tooltip.match(regExp.spellMatch);
        if (!matches?.groups) return;

        let { name, stack, description, turns } = matches.groups;
        if (index < playerEffectsLength && name) playerEffectObj[name] = { turns, stack: stack ?? 1 };

        if (render) {
            let displayTurns = turns;
            let durationContainer = document.createElement('div');
            durationContainer.className = 'effect-duration';
            let durationDiv = document.createElement('div');
            if (turns < 9) {
                durationDiv.style.background = turns < 4 ? 'aquamarine' : 'lavender';
            } else if (turns === 'autocast') {
                displayTurns = 'auto';
            } else if (turns === 'permanent') {
                displayTurns = decodeURIComponent('%E2%88%9E');
            } else if (turns === 'decaying') {
                displayTurns = '';
            } else if (turns === '-') {
                displayTurns = '-';
            }

            durationDiv.innerHTML = displayTurns;
            if (stack) durationDiv.innerHTML += `${turns !== 'decaying' ? '&nbsp;' : ''}x${stack}`;

            durationContainer.appendChild(durationDiv);
            effect.parentNode.insertBefore(durationContainer, effect);
        }
    });

    return playerEffectObj;
}

function getMonsters(render = false) {
    let monsters = [];
    let activeMonsters = [];
    let bosses = [];
    let activeBosses = [];

    [...document.getElementsByClassName('btm1')].forEach((monster_btm1, index) => {
        let monsterInfo = allMonsterInfo?.[`mkey_${(index + 1) % 10}`];
        let monster = {
            index: index,
            click: function() {
                monster_btm1.click();
            },
            level: 0,
            name: 'Unknown',
            type: 'Normal',
            hpPercentage: 0,
            mpPercentage: 0,
            spPercentage: 0,
            isAlive: monster_btm1.hasAttribute('onclick'),
                                                         effectObj: {},
                                                         monster_btm1: monster_btm1,
        };

        //level
        let monster_btm2 = monster_btm1.querySelector('.btm2');
        let levelContainer = monster_btm2.querySelector('div:last-child');
        monster.level = parseInt(levelContainer.textContent.trim() || jpxUtils.parseHVClasses(levelContainer));
        //index
        if (render && (cfgBattle.showMonsterIndex || cfgBattle.showMonsterInfo)) {
            monster_btm2.querySelector('img').style.display = 'none';
            let monIndex = document.createElement('div');
            monIndex.textContent = index + 1;
            monIndex.style.cssText = `font-size: ${cfgBattle.showMonsterInfo ? 17 : 28}px; font-weight: bold`;
            monster_btm2.querySelector('div').appendChild(monIndex);
        }
        //info: monsterClass
        if (render && cfgBattle.showMonsterInfo) {
            let monClass = document.createElement('div');
            monClass.textContent = monsterInfo?.monsterClass ?? '?';
            monClass.dataset.field = 'monClass';
            monClass.style.cssText = 'font-size: 10px; font-weight: bold; overflow: hidden;';
            monster_btm2.querySelector('div').prepend(monClass);
        }

        //name
        let monster_btm3 = monster_btm1.querySelector('.btm3');
        let nameContainer = monster_btm3.querySelector('div');
        monster.name = nameContainer.textContent.trim() || jpxUtils.parseHVClasses(nameContainer);
        //type
        for (const [type, names] of Object.entries(bossTypes)) {
            if (names.has(monster.name)) {
                monster.type = type;
                monster.isAlive && activeBosses.push(monster);
                bosses.push(monster);
                break;
            }
        }
        //info: attackType, powerLevel, trainer
        if (render && cfgBattle.showMonsterInfo) {
            monster_btm3.querySelector(':scope > div > div').style.display = 'inline';
            let monTrAtkPl = document.createElement('span');
            if (!jpxUtils.isEmpty(monsterInfo)) monTrAtkPl.textContent = `${monsterInfo?.attack ?? '?'}, ${monsterInfo?.plvl ?? '?'}`;
            monTrAtkPl.dataset.field = 'monTrAtkPl';
            monTrAtkPl.style.cssText = 'font-weight: bold; position: absolute; right: 2px;';
            monster_btm3.querySelector('div').appendChild(monTrAtkPl);
        }

        //hpPercentage, mpPercentage, spPercentage
        let monster_btm4 = monster_btm1.querySelector('.btm4');
        let healthBar = monster_btm4.querySelector('img[src$="nbargreen.png"]');
        monster.hpPercentage = Math.round((parseInt(healthBar?.style.width, 10) / 120) * 100) / 100 || 0;
        let manaBar = monster_btm4.querySelector('img[src$="nbarblue.png"]');
        monster.mpPercentage = Math.round((parseInt(manaBar?.style.width, 10) / 120) * 100) / 100 || 0;
        let spiritBar = monster_btm4.querySelector('img[src$="nbarred.png"]');
        monster.spPercentage = Math.round((parseInt(spiritBar?.style.width, 10) / 120) * 100) / 100 || 0;

        //status
        let monster_btm6 = monster_btm1.querySelector('.btm6');
        monster_btm6.querySelectorAll('img').forEach((effect) => {
            let tooltip = effect.getAttribute('onmouseover');
            if (!tooltip) return;

            let matches = tooltip.match(regExp.spellMatch);
            if (!matches?.groups) return;

            let { name, stack, description, turns } = matches.groups;
            if (name) monster.effectObj[name] = { turns, stack: stack ?? 1 };
        });

        monsters.push(monster);
        monster.isAlive && activeMonsters.push(monster);
    });

    return {
        monsters, activeMonsters,
        bosses, activeBosses,
    }
}

function updateMonsterEffects() {
    let { monsters, activeMonsters } = monstersObj;

    function getEffectChanges(turnLog) {
        let effectsAdded = turnLog.matchAll(regExp.effectGain);
        let effectsRemoved = [...turnLog.matchAll(regExp.effectExpired), ...turnLog.matchAll(regExp.effectWear)];
        let asleepRemoved = turnLog.matchAll(regExp.effectWearAsleep);
        let confusedRemoved = turnLog.matchAll(regExp.effectWearConfused);
        let effectChanges = {};

        for (const match of effectsAdded) (effectChanges[match[1]] ??= { add: [], remove: [] }).add.push(match[2]);
        for (const match of effectsRemoved) (effectChanges[match[2]] ??= { add: [], remove: [] }).remove.push(match[1]);
        for (const match of asleepRemoved) (effectChanges[match[1]] ??= { add: [], remove: [] }).remove.push('Asleep');
        for (const match of confusedRemoved) (effectChanges[match[1]] ??= { add: [], remove: [] }).remove.push('Confused');

        return effectChanges;
    }

    function calcHiddenDelta(name, effectObj) {
        let savedEffects = monstersEffects[name];
        if (!savedEffects) return;

        let maxDecrease = 0;
        for (const effect in effectObj) {
            let savedTurns = +savedEffects[effect]?.turns;
            let effectTurns = +effectObj[effect]?.turns;
            if (!isNaN(savedTurns) && !isNaN(effectTurns)) {
                let delta = savedTurns - effectTurns;
                if (delta > 0) maxDecrease = Math.max(maxDecrease, delta);
            }
        }

        return maxDecrease;
    }

    function applyHiddenDelta(name, effectObj, delta) {
        let savedEffects = monstersEffects[name];
        if (!savedEffects) return;

        let elementEffects = ['Searing Skin', 'Freezing Limbs', 'Turbulent Air', 'Deep Burns', 'Breached Defense', 'Blunted Attack'];
        let effects = Object.keys(effectObj);
        let elementCount = effects.filter(effect => elementEffects.includes(effect)).length;

        for (const savedEffect in savedEffects) {
            if (effects.includes(savedEffect)) continue;

            if (
                (elementCount < 3 && elementEffects.includes(savedEffect)) ||
                savedEffect === 'Coalesced Mana'
            ) {
                delete savedEffects[savedEffect];
                continue;
            }

            if (!delta || delta <= 0) continue;
            let savedTurns = +savedEffects[savedEffect]?.turns;
            if (isNaN(savedTurns)) continue;

            if (savedTurns - delta < 0 && elementEffects.includes(savedEffect)) {
                delete savedEffects[savedEffect];
                continue;
            }
            savedEffects[savedEffect].turns = Math.max(0, savedTurns - delta);
        }
    }

    let turnLog = log.innerHTML.match(regExp.turnLog)?.[0];
    let effectChanges = turnLog ? getEffectChanges(turnLog) : {};

    for (const activeMonster of activeMonsters) {
        let name = activeMonster.name;
        let savedEffects = monstersEffects[name] ??= {};

        let effectObj = activeMonster.effectObj;
        let effects = Object.keys(effectObj);

        if (effects.length < 5) {
            for (const effect in savedEffects) delete savedEffects[effect];
        } else if (effects.length === 5) {
            for (const effect in savedEffects) delete savedEffects[effect];
            for (const effect of effects) savedEffects[effect] = { ...effectObj[effect] };
        } else if (effects.length === 6) {
            let delta = calcHiddenDelta(name, effectObj);
            for (const effect of effects) savedEffects[effect] = { ...effectObj[effect] };

            if (effectChanges[name]) {
                for (const effect of effectChanges[name].add) !effects.includes(effect) && (savedEffects[effect] = { turns: '-', stack: '-' });
                for (const effect of effectChanges[name].remove) (!effects.includes(effect) && (effect in savedEffects)) && delete savedEffects[effect];
            }

            applyHiddenDelta(name, effectObj, delta);

            let monster_btm6 = activeMonster.monster_btm1.querySelector('.btm6');
            monster_btm6.style.width = 'max-content';

            for (const effect in savedEffects) {
                if (!(effect in effectObj)) {
                    let { turns, stack } = savedEffects[effect];
                    effectObj[effect] = { turns, stack };
                    if (isNaN(+turns)) turns = `'${String(turns).replace(/'/g, "\\'")}'`;

                    let img = document.createElement('img');
                    img.src = (isekaiSuffix ? '/isekai' : '') + (effectSrc[effect]?.scr || '/y/e/channeling.png');
                    img.setAttribute('onmouseover', `battle.set_infopane_effect('${effect}', 'jpx Hidden Effects', ${turns})`);
                    img.setAttribute('onmouseout', 'battle.clear_infopane()');

                    monster_btm6.appendChild(img);
                }
            }
        }
    }
}

function monsterDBReady(prevInfo) {
    const getMonsterIds = info => info ? Object.values(info).map(monsterInfo => monsterInfo?.monsterId ?? '').join('|') : '';

    return new Promise((resolve, reject) => {
        let start = Date.now();

        (function loop() {
            let info = window.HVMonsterDB?.getCurrentMonstersInformation();
            let monsterIds = getMonsterIds(info);
            if (info && !jpxUtils.isEmpty(info) && monsterIds !== prevMonsterIds) {
                resolve({ info, monsterIds });
                return;
            }

            if (Date.now() - start > 250) {
                resolve();
                return;
            }

            setTimeout(loop, 10);
        })();
    });
}

function updateMonsterInfo() {
    monsterDBReady(prevMonsterIds).then((result) => {
        if (!result) return;
        allMonsterInfo = result.info;
        prevMonsterIds = result.monsterIds;

        if (!cfgBattle.showMonsterInfo) return;
        for (const monster of monstersObj.monsters) {
            let monsterInfo = allMonsterInfo?.[`mkey_${(monster.index + 1) % 10}`];
            let monClass = monster.monster_btm1.querySelector('[data-field="monClass"]');
            monClass.textContent = monsterInfo?.monsterClass ?? '?';
            let monTrAtkPl = monster.monster_btm1.querySelector('[data-field="monTrAtkPl"]')
            monTrAtkPl.textContent = `${monsterInfo?.attack ?? '?'}, ${monsterInfo?.plvl ?? '?'}`;
        }
    });
}

function initConditions() {
    let { monsters, activeMonsters, bosses, activeBosses } = monstersObj;

    const generalHandlers = {
        world: arr => arr.includes(!isekaiSuffix ? 'Persistent' : 'Isekai'),
                                  pLevel: range => jpxUtils.inRange(parseInt(localStorage.getItem(prefix + 'playerLevel' + isekaiSuffix) || 1), range),
                                  pMaxSpellType: arr => arr.includes(spellDamageBonus.maxType),
                                  battleTypes: arr => arr.includes(battleType),
                                  difficump: arr => arr.includes(localStorage.getItem(prefix + 'difficump' + isekaiSuffix) || 'PFUDOR'),
                                  roundCurrent: range => jpxUtils.inRange(roundInfo.current, range),
                                  roundLeft: range => jpxUtils.inRange(roundInfo.total - roundInfo.current, range),
                                  roundTotal: range => jpxUtils.inRange(roundInfo.total, range),
                                  floor: range => (battleType !== 'Tower' || jpxUtils.inRange(towerFloor, range)),
                                  pActionCooldown: arr => {
                                      let range = arr.slice(0, 2);
                                      let actions = arr.slice(2);

                                      return actions.every(action => {
                                          let tier = action.match(/^T(\d)$/)?.[1];
                                          let action2 = tier ? spellsDamageObj[spellDamageBonus.maxType][tier - 1] : action;
                                          let cooldown = spellCooldowns[action2] ?? itemCooldowns[action2];
                                          if (cooldown === '-') cooldown = 9999;
                                          return jpxUtils.inRange(cooldown, range);
                                      });
                                  },
                                  pActionCounts: arr => {
                                      let range = arr.slice(0, 2);
                                      let actions = arr.slice(2);

                                      return actions.every(action => {
                                          let tier = action.match(/^T(\d)$/)?.[1];
                                          let action2 = tier ? spellsDamageObj[spellDamageBonus.maxType][tier - 1] : action;
                                          return jpxUtils.inRange(actionCounts[action2] ?? 0, range);
                                      });
                                  },
                                  pHP: range => jpxUtils.inRange(vitals.hpPercentage, range),
                                  pMP: range => jpxUtils.inRange(vitals.mpPercentage, range),
                                  pSP: range => jpxUtils.inRange(vitals.spPercentage, range),
                                  pOC: range => jpxUtils.inRange(vitals.oc, range),
                                  pSpiritStatus: flag => flag === spiritStatus,
                                  pEffects: arr => {
                                      let range = arr.slice(0, 2);
                                      let effects = arr.slice(2);

                                      return effects.every(effect => {
                                          let turns = playerEffectsObj[effect]?.turns ?? -1;
                                          if (turns === 'permanent') turns = 9999;
                                          return isNaN(+turns) || jpxUtils.inRange(+turns, range);
                                      });
                                  },
                                  pIgnoredEffects: arr => {
                                      let range = arr.slice(0, 2);
                                      let effects = arr.slice(2);

                                      return !effects.some(effect => {
                                          let turns = playerEffectsObj[effect]?.turns ?? -1;
                                          if (turns === 'permanent') turns = 9999;
                                          return isNaN(+turns) || jpxUtils.inRange(+turns, range);
                                      });
                                  },
                                  pEffectStacks: arr => {
                                      let range = arr.slice(0, 2);
                                      let effects = arr.slice(2);

                                      return effects.every(effect => {
                                          let stack = playerEffectsObj[effect]?.stack ?? -1;
                                          return isNaN(+stack) || jpxUtils.inRange(+stack, range);
                                      });
                                  },
                                  monsters: range => jpxUtils.inRange(monsters.length, range),
                                  activeMonsters: range => jpxUtils.inRange(activeMonsters.length, range),
                                  defeatedMonsters: range => jpxUtils.inRange(monsters.length - activeMonsters.length, range),
                                  bosses: range => jpxUtils.inRange(bosses.length, range),
                                  activeBosses: range => jpxUtils.inRange(activeBosses.length, range),
                                  defeatedBosses: range => jpxUtils.inRange(bosses.length - activeBosses.length, range),
                                  mLevel: range => jpxUtils.inRange(monsters[0].level, range),
                                  mWithoutEffects: arr => {
                                      let range = arr.slice(0, 2);
                                      let effects = arr.slice(2);
                                      return jpxUtils.inRange(activeMonsters.filter(activeMonster => effects.some(effect => activeMonster.effectObj[effect]?.turns == null)).length, range);
                                  },
    };

    const targetHandlers = {
        tName: (str, t) => {
            let regex = jpxUtils.toRegExp(str);
            return !regex || regex.test(t.name);
        },
        tTypes: (arr, t) => arr.includes(t.type),
                                  tClasses: (arr, t) => arr.includes(allMonsterInfo?.[`mkey_${(t.index + 1) % 10}`]?.monsterClass),
                                  tPowerLevel: (range, t) => jpxUtils.inRange(allMonsterInfo?.[`mkey_${(t.index + 1) % 10}`]?.plvl, range),
                                  tIndex: (range, t) => jpxUtils.inRange(t.index, range.map(n => n = n > 0 ? n - 1 : n === 0 ? 0 : monsters.length + n)),
                                  tHP: (range, t) => jpxUtils.inRange(t.hpPercentage, range),
                                  tMP: (range, t) => jpxUtils.inRange(t.mpPercentage, range),
                                  tSP: (range, t) => jpxUtils.inRange(t.spPercentage, range),
                                  tEffects: (arr, t) => {
                                      let range = arr.slice(0, 2);
                                      let effects = arr.slice(2);

                                      return effects.every(effect => {
                                          let turns = t.effectObj[effect]?.turns ?? -1;
                                          if (turns === 'permanent') turns = 9999;
                                          return isNaN(+turns) || jpxUtils.inRange(+turns, range);
                                      });
                                  },
                                  tIgnoredEffects: (arr, t) => {
                                      let range = arr.slice(0, 2);
                                      let effects = arr.slice(2);

                                      return !effects.some(effect => {
                                          let turns = t.effectObj[effect]?.turns ?? -1;
                                          if (turns === 'permanent') turns = 9999;
                                          return isNaN(+turns) || jpxUtils.inRange(+turns, range);
                                      });
                                  },
                                  tEffectStacks: (arr, t) => {
                                      let range = arr.slice(0, 2);
                                      let effects = arr.slice(2);

                                      return effects.every(effect => {
                                          let stack = t.effectObj[effect]?.stack ?? -1;
                                          return isNaN(+stack) || jpxUtils.inRange(+stack, range);
                                      });
                                  },
                                  tDaysSinceUpdate: (range, t) => {
                                      let lastUpdate = allMonsterInfo?.[`mkey_${(t.index + 1) % 10}`]?.lastUpdate;
                                      let deltaDays = lastUpdate ? jpxUtils.daysSince(lastUpdate) : 9999;
                                      return !jpxUtils.isEmpty(allMonsterInfo) && jpxUtils.inRange(deltaDays, range);
                                  },
    };

    return { generalHandlers, targetHandlers };
}

function checkConditions(conditions, target, checkGlobal = true, checkTarget = true) {
    let { monsters, activeMonsters, bosses, activeBosses } = monstersObj;

    if (jpxUtils.isEmpty(conditionsObj)) conditionsObj = initConditions();
    let { generalHandlers, targetHandlers } = conditionsObj;

    return conditions.every(condition => {
        let { key, value, offset = [0, 0], matched = [1, 1] } = condition;

        if (key in generalHandlers && checkGlobal) {
            return generalHandlers[key](value) === true;
        }

        if (key in targetHandlers && checkTarget) {
            if (!target) return false;
            let successCount = 0;

            for (let i = target.index + offset[0]; i <= target.index + offset[1]; i++) {
                if (i < 0 || i > monsters.length - 1) continue;
                let m = activeMonsters.find(activeMonster => activeMonster.index === i);
                if (m && targetHandlers[key](value, m) === true) successCount++;
            }

            return jpxUtils.inRange(successCount, matched);
        }

        return true;
    });
}

const kamisamaCache = new Map();
function getKamisama(code) {
    if (!kamisamaCache.has(code)) kamisamaCache.set(code, new Function('jpx', `'use strict';\n${code}`));
    return kamisamaCache.get(code);
}

const actionHandlers = {
    stop(action, monster) {
        const { customMessage, conditions } = action;

        if (checkConditions(conditions, monster, true, !!monster)) {
            readyNext = `Stop: ${customMessage}`;
            jpxPanelManager.updateContent('battle');
            jpxPanelManager.setBackground('#ff5');
            jpxPanelManager.dispatchState();
            return true;
        }
        return false;
    },

    spellSupport(action, monster) {
        const { name, conditions } = action;

        if (
            spellCooldowns[name] === 0 &&
            checkConditions(conditions, monster, true, !!monster)
        ) {
            readyNext = 0;
            cast(name);
            return true;
        }
        return false;
    },

    item(action, monster) {
        const { name, conditions } = action;

        if (
            itemCooldowns[name] === 0 &&
            checkConditions(conditions, monster, true, !!monster)
        ) {
            readyNext = 0;
            use(name);
            return true;
        }
        return false;
    },

    toggle(action, monster) {
        const { name, toggled, conditions } = action;
        return (
            (name !== 'Spirit' || toggled !== spiritStatus) &&
            checkConditions(conditions, monster, true, !!monster) &&
            doToggleGoNext(name)
        );
    },

    target(action, monster) {
        const { priorityRule, conditions } = action;
        if (!checkConditions(conditions, monster, true, false)) return null;

        let { activeMonsters } = monstersObj;
        monstersObj.sorted ??= {};

        const getSorted = (fn, asc) => {
            return monstersObj.sorted[priorityRule] ??= jpxUtils.getSortedArray(activeMonsters, fn, priorityRule.includes('Low to High'));
        };

        let list = activeMonsters;
        switch (priorityRule) {
            case 'Bottom Up':
                list = monstersObj.sorted[priorityRule] ??= [...activeMonsters].reverse();
                break;
            case 'Current HP Low to High':
            case 'Current HP High to Low':
                list = getSorted(m => monsterData[m.index].maxHP * m.hpPercentage);
                break;
            case 'Current HP Percent Low to High':
            case 'Current HP Percent High to Low':
                list = getSorted(m => m.hpPercentage);
                break;
        }

        return list.find(activeMonster => checkConditions(conditions, activeMonster, false)) ?? null;
    },

    smartDebuff(action, monster) {
        const { conditions } = action;
        return (
            checkConditions(conditions, monster, true, false) &&
            doSpellsDebuffGoNext({ ...action })
        );
    },

    spellDebuff(action, monster) {
        const { name, conditions } = action;
        return (
            monster &&
            checkConditions(conditions, monster) &&
            doSpellGoNext(name, monster)
        );
    },

    spellDamage(action, monster) {
        const { name, conditions } = action;
        let tier = name.match(/^T(\d)$/)?.[1];
        let spell = tier ? spellsDamageObj[spellDamageBonus.maxType][tier - 1] : name;
        return (
            monster &&
            checkConditions(conditions, monster) &&
            doSpellGoNext(spell, monster)
        );
    },

    skill(action, monster) {
        const { name, conditions } = action;
        return (
            monster &&
            checkConditions(conditions, monster) &&
            doSpellGoNext(name, monster)
        );
    },

    normalAttack(action, monster) {
        return (
            monster &&
            doAttackGoNext(monster)
        )
    },

    kamisamaniNattaHi(action) {
        const { code } = action;
        try {
            const fn = getKamisama(code);

            return fn({
                battleStyle, battleType, worldLevel, towerFloor, roundInfo,
                monsterData, allMonsterInfo, monstersEffects, monstersObj,
                actionCounts, spellDamageBonus, spellCooldowns, itemCooldowns, vitals, spiritStatus, playerEffectsObj,
                doSpellGoNext, doAttackGoNext, doToggleGoNext,
            }) === true;
        } catch (e) {
            console.error('kamisama action error:', e);
            jpxUtils.createToast('kamisama action error: ' + e, 5000);
            isActiveBattle = false;
            if (cfgBattle.ctrlWidgetMouseEnter) jpxPanelManager.ready = false;
            readyNext = 0;
            jpxPanelManager.updateContent('battle');
            jpxPanelManager.setBackground('#fef');
            jpxPanelManager.dispatchState();
            return true;
        }
    },
};

function actionManager(actions) {
    let targetPhase = false;
    let targetMonster = null;
    let targetLocked = false;

    for (const action of actions) {
        const handler = actionHandlers[action.type];
        if (!handler) continue;
        if (action.disabled === true) continue;

        if (action.type === 'target') {
            targetPhase = true;
            if (!targetLocked) {
                targetMonster = null;

                let result = handler(action, targetMonster);
                if (result) {
                    targetMonster = result;
                    targetLocked = true;
                }
            }
            continue;
        }

        if (action.type !== 'smartDebuff' && action.type !== 'kamisamaniNattaHi' && targetPhase && !targetMonster) continue;
        if (handler(action, targetMonster)) return true;
        targetLocked = false;
    }

    return false;
}

//Battle Record
function battleRecorder() {
    let turnLog = log.innerHTML.match(regExp.turnLog)?.[0];
    if (!turnLog) return;

    let action = turnLog.match(regExp.action)?.[1];
    if (!action) {
        if (!turnLog.includes('<strong>Scanning')) return;
        turnLog = turnLog.replace(/[\t\r\n]+/g, '').replace(/>\s+</g, '><');
        action = 'You use Scan';
    }
    if (action.includes('gains the effect')) {
        let action2 = turnLog.match(regExp.action2)?.[1];
        action2 && (action = action2);
    }

    let use = action.match(regExp.use)?.[2];
    if (cfgBattle.recordBattleLog) battleLogRecorder();
    timeRecorder(turnLog, action, use);
    combatRecorder(turnLog, action, use);
    revenueRecorder(turnLog, action, use);
}

function battleLogRecorder() {
    let tdArray = Array.from(log.querySelectorAll('td'));
    let tlsArray = Array.from(log.querySelectorAll('.tls'));
    if (regExp.battleTypeLog.test(tdArray.at(-1).innerHTML) & tlsArray.length === 1) {
        for (let i = tdArray.length - 1; i > -1; i--) {
            if (!tdArray[i].textContent.trim() || tdArray[i].innerHTML.includes('<hr>')) {
                break;
            }
            battleLogRecordCurrent.unshift(tdArray[i].textContent);
        }
    }
    battleLogRecordCurrent.push('--------------------------------------------------');
    for (const td of tdArray) {
        if (!td.textContent.trim() || td.innerHTML.includes('<hr>')) {
            break;
        }
        if (td.querySelector('table')) {
            let clone = td.cloneNode(true);
            clone.querySelector('table')?.remove();
            clone = clone.textContent.replace(/\s+/g, ' ').trim();
            battleLogRecordCurrent.push(clone);
        } else {
            battleLogRecordCurrent.push(td.textContent.replace(/\s+/g, ' ').trim());
        }
    }

    let btcp = document.querySelector('#btcp');
    if (btcp) {
        battleLogRecordCurrent.push('++++++++++++++++++++++++++++++++++++++++++++++++++');
    }
    battleLogRecord = battleLogRecord.concat(battleLogRecordCurrent);
    battleLogRecordCurrent = [];
}

function timeRecorder(turnLog, action, use) {
    timeRecords['startTime'] ??= Date.now();
    timeRecords['action'] += 1;
    if (!regExp.zeroturn.test(action)) timeRecords['turn'] += 1;
    if (use) timeRecords['lastUse'][use] = timeRecords['turn'];
}

function riddleRecorder() {
    if (jpxUtils.isEmpty(timeRecords)) timeRecords = JSON.parse(localStorage.getItem(prefix + 'timeRecords' + isekaiSuffix) || JSON.stringify(jpxUtils.createTimeRecords()));
    let riddlesubmit = document.querySelector('#riddlesubmit')
    riddlesubmit && riddlesubmit.addEventListener('click', () => {
        timeRecords.riddle.solved += 1;
        localStorage.setItem(prefix + 'timeRecords' + isekaiSuffix, JSON.stringify(timeRecords));
        setTimeout(updateTitle, 100);
    }, { once: true });
}

function combatRecorder(turnLog, action, use) {
    if (use) {
        if (
            !regExp.zeroturn.test(action) ||
            use.includes('Gem') ||
            use.includes('Caffeinated Candy') ||
            use.includes('Energy Drink')
        ) {
            jpxUtils.inc(combatRecords.use, use);
            jpxUtils.inc(actionCounts, use);
            use === 'Scan' && updateMonsterInfo();
        }
    } else if (action.includes('Spirit Stance Engaged')) {
        jpxUtils.inc(combatRecords.use, 'Spirit');
        jpxUtils.inc(actionCounts, 'Spirit');
    } else if (action.includes('Defending.')) {
        jpxUtils.inc(combatRecords.use, 'Defend');
        jpxUtils.inc(actionCounts, 'Defend');
    } else if (action.includes('Focusing.')) {
        jpxUtils.inc(combatRecords.use, 'Focus');
        jpxUtils.inc(actionCounts, 'Focus');
    } else {
        jpxUtils.inc(combatRecords.use, 'Attack');
        jpxUtils.inc(actionCounts, 'Attack');
    }

    if (turnLog.includes('You gain the effect Cloak of the Fallen.')) {
        jpxUtils.inc(combatRecords.use, 'Cloak of the Fallen');
        jpxUtils.inc(actionCounts, 'Cloak of the Fallen');
    }

    let damage = turnLog.match(regExp.damage);
    if (damage) {
        for (let i = 0; i < damage.length; i++) {
            let damageTaken = jpxUtils.matchAny(damage[i], regExp.damageTaken1, regExp.damageTaken2);
            let spiritShield = damage[i].match(regExp.spiritShield);
            let damageDealt = jpxUtils.matchAny(damage[i], regExp.damageDealt1, regExp.damageDealt2);
            let strike = damage[i].match(regExp.strike);
            let explode = damage[i].match(regExp.explode);
            let damagePlus = damage[i].match(regExp.damagePlus);
            let damagePoints = damage[i].match(regExp.damagePoints);

            //Taken
            if (damageTaken?.groups) {
                let glance = damageTaken.groups.v.includes('glance');
                let crit = damageTaken.groups.v.includes('crit');
                let hit = !glance && !crit;
                let damageType = jpxUtils.lowerFirst(damageTaken.groups.t);
                //Magical Taken
                if (damage[i].includes(' casts ')) {
                    glance && (combatRecords.magicalTaken.glance += 1);
                    hit && (combatRecords.magicalTaken.hit += 1);
                    crit && (combatRecords.magicalTaken.crit += 1);
                    jpxUtils.inc(combatRecords.magicalTaken, damageType, +damageTaken.groups.n);
                    //Physical Taken
                } else {
                    glance && (combatRecords.physicalTaken.glance += 1);
                    hit && (combatRecords.physicalTaken.hit += 1);
                    crit && (combatRecords.physicalTaken.crit += 1);
                    jpxUtils.inc(combatRecords.physicalTaken, damageType, +damageTaken.groups.n);
                }
            } else if (spiritShield) {
                jpxUtils.inc(combatRecords.physicalTaken, 'spiritShield' + 'hit');
                jpxUtils.inc(combatRecords.physicalTaken, 'spiritShield' + 'damagePlus', +spiritShield[1]);
                //Dealt
            } else if (damageDealt?.groups) {
                let glance = damageDealt.groups.v.includes('glance');
                let crit = damageDealt.groups.v.includes('crit');
                let critStack = parseInt(damageDealt.groups.s) || 1;
                let hit = !glance && !crit;
                let damageType = jpxUtils.lowerFirst(damageDealt.groups.t);
                //Magical Dealt
                if (action.includes('You cast')) {
                    glance && (combatRecords.magicalDealt.glance += 1);
                    hit && (combatRecords.magicalDealt.hit += 1);
                    crit && (combatRecords.magicalDealt.crit += 1);
                    jpxUtils.inc(combatRecords.magicalDealt, damageType, +damageDealt.groups.n);
                    //Physical Dealt
                } else {
                    glance && (combatRecords.physicalDealt.glance += 1);
                    hit && (combatRecords.physicalDealt.hit += 1);
                    if (crit) {
                        combatRecords.physicalDealt.crit += 1;
                        jpxUtils.inc(combatRecords.physicalDealt, `crit${critStack}`);
                    }
                    jpxUtils.inc(combatRecords.physicalDealt, damageType, +damageDealt.groups.n);
                }
            } else if (strike) {
                let damageType = jpxUtils.lowerFirst(strike[3]);
                jpxUtils.inc(combatRecords.physicalDealt, damageType, +strike[2]);
            } else if (explode) {
                let damageType = jpxUtils.lowerFirst(explode[2]);
                jpxUtils.inc(combatRecords.magicalDealt, damageType, +explode[1]);
            } else if (damagePlus) {
                //Physical Dealt
                //    <td class="tl">Bleeding Wound hits Monster for 1000 damage.</td>
                //    <td class="tl">Spreading Poison hits Monster for 1000 damage.</td>
                if (regExp.damagePhysicalPlus.test(damage[i])) {
                    jpxUtils.inc(combatRecords.physicalDealt, 'damagePlus', +damagePlus[1]);
                    //Magical Dealt
                    //    <td class="tl">Burning Soul hits Monster for 1000 damage.</td>
                    //    <td class="tl">Ripened Soul hits Monster for 1000 damage.</td>
                } else {
                    jpxUtils.inc(combatRecords.magicalDealt, 'damagePlus', +damagePlus[1]);
                }
            } else if (damagePoints) {
                let damageType = jpxUtils.lowerFirst(damagePoints[2]);
                //counter
                //    <td class="tl">You counter Monster for 1000 points of void damage.</td>
                if (damage[i].includes('You counter')) {
                    jpxUtils.inc(combatRecords.physicalDealt, damageType, +damagePoints[1]);
                    //spike shield
                    //    <td class="tl">Your spike shield hits Monster for 1000 points of elec damage.</td>
                } else {
                    jpxUtils.inc(combatRecords.magicalDealt, damageType, +damagePoints[1]);
                }
            }
        }
    }

    //debuff
    let debuffLog = turnLog.match(regExp.debuffLog)?.[0];
    if (debuffLog) {
        let debuffResist0 = debuffLog.match(regExp.debuffResist0)?.length || 0;
        let debuffResist1 = debuffLog.match(regExp.debuffResist1)?.length || 0;
        let debuffResist3 = debuffLog.match(regExp.debuffResist3)?.length || 0;
        jpxUtils.inc(combatRecords.magicalDealt, 'debuffResist0', debuffResist0 - debuffResist1);
        jpxUtils.inc(combatRecords.magicalDealt, 'debuffResist1', debuffResist1);
        jpxUtils.inc(combatRecords.magicalDealt, 'debuffResist3', debuffResist3);
    }

    /*patch*/
    let patchBlock = turnLog.match(/You block the attack\./g);
    if (patchBlock) jpxUtils.inc(combatRecords.magicalTaken, 'block', -patchBlock.length);
    let patchBlockAndParry = turnLog.match(/You block and parry the attack/g);
    if (patchBlockAndParry) jpxUtils.inc(combatRecords.physicalTaken, 'blockAndParry', patchBlockAndParry.length);

    let combatRecordsFactory = (regexp, combatRecordsType, combatRecordsKey) => {
        let match = turnLog.match(regexp);
        if (match) jpxUtils.inc(combatRecords[combatRecordsType], combatRecordsKey, match.length);
    }

    //Magical Dealt
    combatRecordsFactory(regExp.magicalDealtMiss, 'magicalDealt', 'miss');
    combatRecordsFactory(regExp.magicalDealtEvade, 'magicalDealt', 'evade');
    combatRecordsFactory(regExp.magicalDealtResistPartially, 'magicalDealt', 'resistPartially');
    combatRecordsFactory(regExp.magicalDealtResist, 'magicalDealt', 'resist');

    //Physical Dealt
    combatRecordsFactory(regExp.physicalDealtMiss, 'physicalDealt', 'miss');
    combatRecordsFactory(regExp.physicalDealtEvade, 'physicalDealt', 'evade');
    combatRecordsFactory(regExp.physicalDealtParryPartially, 'physicalDealt', 'parryPartially');
    combatRecordsFactory(regExp.physicalDealtParry, 'physicalDealt', 'parry');

    //Magical Taken
    combatRecordsFactory(regExp.magicalTakenMiss, 'magicalTaken', 'miss');
    combatRecordsFactory(regExp.magicalTakenEvade, 'magicalTaken', 'evade');
    combatRecordsFactory(regExp.magicalTakenBlockPartially, 'magicalTaken', 'blockPartially');
    combatRecordsFactory(regExp.magicalTakenBlock, 'magicalTaken', 'block');
    combatRecordsFactory(regExp.magicalTakenResistPartially, 'magicalTaken', 'resistPartially');

    //Physical Taken
    combatRecordsFactory(regExp.physicalTakenMiss, 'physicalTaken', 'miss');
    combatRecordsFactory(regExp.physicalTakenEvade, 'physicalTaken', 'evade');
    combatRecordsFactory(regExp.physicalTakenParryPartially, 'physicalTaken', 'parryPartially');
    combatRecordsFactory(regExp.physicalTakenParry, 'physicalTaken', 'parry');
    combatRecordsFactory(regExp.physicalTakenBlockPartially, 'physicalTaken', 'blockPartially');
    combatRecordsFactory(regExp.physicalTakenBlock, 'physicalTaken', 'block');

    //Counter
    combatRecordsFactory(regExp.counter, 'use', 'Counter');
}

function revenueRecorder(turnLog, action, use) {
    if (
        use && regExp.zeroturn.test(action) &&
        !use.includes('Gem') &&
        !use.includes('Caffeinated Candy') &&
        !use.includes('Energy Drink')
    ) {
        revenueRecords['consumable'][use] ??= { use: 0, drop: 0 };
        revenueRecords['consumable'][use]['use'] += 1;
        jpxUtils.inc(actionCounts, use);
    }

    let gainExp = turnLog.match(regExp.gainExp);
    if (gainExp) revenueRecords['exp'] += +gainExp[1];

    let gainCredit = turnLog.match(regExp.gainCredit);
    if (gainCredit) revenueRecords['credit'] += +gainCredit[1];

    let proficiencies = turnLog.match(regExp.proficiencies);
    if (proficiencies) {
        for (let i = 0; i < proficiencies.length; i++) {
            let proficiency = proficiencies[i].match(regExp.proficiency);
            if (proficiency) {
                let prof = parseFloat(proficiency[1]);
                if (prof > 0) {
                    jpxUtils.inc(revenueRecords.proficiency, proficiency[2], prof);
                }
            }
        }
    }

    let dropLogs = turnLog.match(regExp.dropsLogs) || [];
    for (let dropLog of dropLogs) {
        let drop = dropLog.match(regExp.drop) || []; //drop[4]: sold, salvaged
        switch (drop[2]) {
            //Equipment, Material
            case 'FF0000': {
                if (!drop[4]){
                    let quality = drop[3].match(regExp.quality)?.[1];
                    if (quality) {
                        revenueRecords['equipment'][quality] ??= [];
                        revenueRecords['equipment'][quality].push(drop[3]);
                    } else {
                        jpxUtils.inc(revenueRecords.material, drop[3], +drop[1].match(/\d+/)?.[0] || 1);
                    }
                }
                break;
            }
            //Credit
            case 'A89000': {
                let credit = drop[3].match(regExp.credit);
                if (credit) {
                    revenueRecords['credit'] += (+credit[1] || 1);
                }
                break;
            }
            //Consumable
            //    Restorative: Draught, Potion, Elixir
            //    Infusion: Flames, Frost, Storms, Lighting, Divinity, Darkness
            //    Scroll: Swiftness, Protection, the Avatar, Absorption, Shadows, Life, the Gods
            //    Shard: Voidseeker Shard, Aether Shard, Featherweight Shard, Amnesia Shard, World Seed
            //    Special Item: Flower Vase, Bubble Gum
            case '00B000': {
                if (!drop[3].includes('Gem')) {
                    revenueRecords['consumable'][drop[3]] ??= { use: 0, drop: 0 };
                    revenueRecords['consumable'][drop[3]]['drop'] += 1;
                }
                break;
            }
            //Token
            //    Token of Blood, Chaos Token, Soul Fragment
            case '254117': {
                if (drop[3].includes('Blood')) {
                    jpxUtils.inc(revenueRecords.token, 'Token of Blood');
                } else if (drop[3].includes('Chaos')) {
                    jpxUtils.inc(revenueRecords.token, 'Chaos Token');
                } else if (drop[3].includes('Soul')) {
                    jpxUtils.inc(revenueRecords.token, 'Soul Fragment', drop[1] === 'five' ? 5 : (+drop[1].match(/\d+/)?.[0] || 1));
                }
                break;
            }
            //Food
            case '489EFF': {
                jpxUtils.inc(revenueRecords.food, drop[3]);
                break;
            }
            //Artifact, Collectable
            case '0000FF': {
                if (drop[3].includes('Figurine')) {
                    jpxUtils.inc(revenueRecords.figurine, drop[3]);
                } else {
                    jpxUtils.inc(revenueRecords.artifact, drop[3]);
                }
                break;
            }
            //Trophy, World Seed, Charm
            case '461B7E': {
                if (drop[3].includes('World Seed')) {
                    revenueRecords['consumable'][drop[3]] ??= { use: 0, drop: 0 };
                    revenueRecords['consumable'][drop[3]]['drop'] += +drop[1].match(/\d+/)?.[0] || 1;
                } else {
                    jpxUtils.inc(revenueRecords.trophy, drop[3]);
                }
                break;
            }
            //Crystal
            case 'BA05B4': {
                let crystal = drop[3].match(regExp.crystal);
                if (crystal) jpxUtils.inc(revenueRecords.crystal, crystal[2], +crystal[1] || 1);
                break;
            }
        }
    }
}

async function battleRecordPlayer(doFinal = true) {
    function revenueCalc(revenueRecords, priceData) {
        let revenueSnapshot = JSON.parse(JSON.stringify(revenueRecords));

        for (const [categoryKey, categoryValue] of Object.entries(revenueSnapshot)) {
            switch (categoryKey) {
                case ('proficiency'):
                    for (const [key, value] of Object.entries(categoryValue)) {
                        categoryValue[key] = Math.round(value * 1000) / 1000;
                    }
                    break;
                case ('consumable'):
                    for (const [key, value] of Object.entries(categoryValue)) {
                        value['balance'] = value['drop'] - value['use'];
                        jpxUtils.inc(categoryValue, 'profit', (priceData[key] || 0) * value['balance']);
                    }
                    break;
                case ('material'):
                case ('token'):
                case ('food'):
                case ('figurine'):
                case ('artifact'):
                case ('trophy'):
                    for (const [key, value] of Object.entries(categoryValue)) {
                        jpxUtils.inc(categoryValue, 'profit', (priceData[key] || 0) * value);
                    }
                    break;
                case ('crystal'):
                    for (const [key, value] of Object.entries(categoryValue)) {
                        jpxUtils.inc(categoryValue, 'total', value);
                        jpxUtils.inc(categoryValue, 'profit', (priceData[key] || 0) * value);

                    }
                    break;
            }
            if (categoryValue?.['profit']) {
                categoryValue['profit'] = Math.round(categoryValue['profit'] * 10) / 10;
                revenueSnapshot['totalProfit'] += categoryValue['profit'];
            }
        }

        revenueSnapshot['totalProfit'] = Math.round(revenueSnapshot['totalProfit'] + (revenueSnapshot['credit'] || 0));
        return revenueSnapshot;
    }

    function getStaminaCost() {
        if (battleType === 'Encounter' || battleType === 'Colosseum') return 0;

        let stamina = parseFloat(localStorage.getItem(prefix + 'stamina' + isekaiSuffix)) || 80;
        let greatCost = !isekaiSuffix ? 0.03 : 0.06;
        let normalCost = !isekaiSuffix ? 0.02 : 0.04;
        let greatRoundQuota = Math.floor(Math.max(0, stamina - (battleType === 'Battle1000' ? 1 : 0) - 60) / greatCost);
        let greatRound = Math.min(greatRoundQuota, roundInfo.current);
        let normalRound = roundInfo.current - greatRound;
        let staminaCost = greatRound * greatCost + normalRound * normalCost;

        if (battleType === 'Battle1000') staminaCost += 1;
        return staminaCost;
    }

    if (Object.keys(cfgStats).length < 1) {
        let storedCfgStats = {};
        try {
            storedCfgStats = JSON.parse(localStorage.getItem(prefix + 'cfgStats') || '{}');
        } catch (err) {
            console.warn('Failed to load cfgStats. Using default cfgStats.');
            storedCfgStats = {};
        }
        mergeCfg(storedCfgStats, defaultCfgStats, cfgStats, 'stats');
    }

    let startTime = timeRecords['startTime'] || 0;
    let timestamp = new Date(timeRecords['startTime']).toISOString().slice(0, 19).replace('T', ' ');
    let date = timestamp.slice(0, 10);
    let result = 'inProgress';
    if (log.innerHTML.includes('You are Victorious!') && roundInfo.current === roundInfo.total) {
        result = 'Victory';
    } else if (log.innerHTML.includes('You have been defeated.')) {
        result = 'Defeat';
    } else if (log.innerHTML.includes('You have escaped from the battle.')) {
        result = 'Flee';
    }
    let deltaSeconds = (Date.now() - startTime) / 1000;
    let deltaTime = jpxUtils.secondsToTime(deltaSeconds, true);
    let action = timeRecords['action'];
    let tps = Math.round(action / deltaSeconds * 100) / 100;

    let priceData = await jpxMarket.getMarketPrice(doFinal);
    let revenueSnapshot = revenueCalc(revenueRecords, priceData);
    let staminaCost = getStaminaCost();

    //    Daily 24 and LongGoneBeforeDaylight 20
    let staminaRecords = JSON.parse(localStorage.getItem(prefix + 'staminaRecords' + isekaiSuffix) || '{}');
    let currentDate = new Date().toISOString().slice(0, 10);
    if (
        !staminaRecords?.lastUpdate ||
        new Date(staminaRecords.lastUpdate).toISOString().slice(0, 10) != currentDate
    ) {
        staminaRecords = { lastUpdate: Date.now(), staminaCost: 0 };
    }

    let staminaQuota = 24 + (!isekaiSuffix ? cfgBattle.dailyStaminaQuotaPlus : 0) - staminaRecords.staminaCost;
    if (staminaCost > staminaQuota) {
        revenueSnapshot['staminaCost'] = Math.round((staminaCost - Math.max(0, staminaQuota)) * 10) / 10;
    } else {
        revenueSnapshot['staminaCost'] = 0;
    }

    if (doFinal) {
        staminaRecords.staminaCost = Math.round((staminaRecords.staminaCost + staminaCost) * 10) / 10;
        localStorage.setItem(prefix + 'staminaRecords' + isekaiSuffix, JSON.stringify(staminaRecords));
    }

    //Final Profit
    let staminaUnitPrice = priceData['Energy Drink'] / 10;
    let staminaProfit = Math.round(-revenueSnapshot['staminaCost'] * staminaUnitPrice * 10) / 10;
    revenueSnapshot['finalProfit'] = Math.round((revenueSnapshot['totalProfit'] + staminaProfit) * 10) / 10;

    let battleRecords = {
        world: !isekaiSuffix ? 'Persistent' : 'Isekai',
        timestamp: timestamp,
        date: date,
        playerLevel: parseInt(localStorage.getItem(prefix + 'playerLevel' + isekaiSuffix)) || 0,
                                  difficump: difficumpMap[localStorage.getItem(prefix + 'difficump' + isekaiSuffix)] || 0,
                                  persona: localStorage.getItem(prefix + 'persona' + isekaiSuffix),
                                  battleType: battleType,
                                  worldLevel: worldLevel,
                                  towerFloor: towerFloor,
                                  roundInfo: roundInfo,
                                  result: result,
                                  deltaSeconds: deltaSeconds,
                                  deltaTime: deltaTime,
                                  turns: timeRecords.action,
                                  tps: tps,
                                  riddle: timeRecords.riddle.total,
                                  combatRecords: combatRecords,
                                  revenueRecords: revenueSnapshot,
    }

    let battleLogEl = cfgBattle.recordBattleLog ? battleLogPlayer() : null;
    let timeRecordEl = document.querySelector('#time-records-div') || timeRecordPlayer(battleRecords);
    let combatRecordEl = document.querySelector('#combat-records-table') || combatRecordPlayer(combatRecords);
    let combatRecord_UseEl = document.querySelector('#combat-records-use-table') || combatRecordPlayer_Use(combatRecords);
    let revenueRecordEl = document.querySelector('#revenue-records-table') || revenueRecordPlayer(revenueSnapshot, priceData);

    if (doFinal) {
        document.querySelector('#btcp')?.append(timeRecordEl, revenueRecordEl);
        log.parentNode.prepend(...[battleLogEl, combatRecordEl, combatRecord_UseEl].filter(Boolean));

        storeBattleRecords(battleRecords)
        .then(result => console.log(result))
        .catch(err => console.error('Save failed: ', err));
    } else {
        newWindowRecordPlayer(document.querySelector('#time-records-div'), battleRecords, timeRecordEl, combatRecordEl, combatRecord_UseEl, revenueRecordEl);
    }

    cfgBattle.recordBattleLog && console.log(battleLogRecord);
    console.log(timeRecords);
    console.log(combatRecords);
    console.log(revenueSnapshot);
    console.log(battleRecords);
}

function battleLogPlayer() {
    let blob = new Blob([JSON.stringify(battleLogRecord, null, '\t')], { type: 'text/plain;charset=utf-8' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.innerText = t('sGen.downloadBattleLog');
    a.style.cssText = 'display: block; margin: 10px 0px; text-align: left; font-size: 200%;';
    a.href = url;
    a.download = 'battleLog.txt';
    return a;
}

function timeRecordPlayer(battleRecords) {
    let div = document.createElement('div');
    div.id = 'time-records-div';
    cfgStats.darkMode && div.classList.add('dark-mode');

    let riddleSolved =
    timeRecords?.startTime && battleRecords.timestamp === new Date(timeRecords.startTime).toISOString().slice(0, 19).replace('T', ' ') &&
    timeRecords.riddle.solved < battleRecords.riddle ? `${timeRecords.riddle.solved} / ` : '';
    div.innerText =
    `${battleRecords.turns.toLocaleString()} ${t('tP.turns')}   ${battleRecords.deltaTime}  (${battleRecords.tps} ${t('tP.t/s')})   ` +
    `${riddleSolved}${battleRecords.riddle} ${t('tP.riddle')}   ${battleRecords.combatRecords.use['Cloak of the Fallen'] || 0} ${t('tP.spark')}`;
    return div;
}

function combatRecordPlayer(combatRecords) {
    let table = document.createElement('table');
    table.id = 'combat-records-table';
    table.className = 'records-table';
    cfgStats.darkMode && table.classList.add('dark-mode');
    let tbody = document.createElement('tbody');

    let innerHTML = `
    <tr>
    <td></td>
    <td colspan="3">${t('cP.damageDealt')}</td>
    <td colspan="4">${t('cP.damageTaken')}</td>
    </tr>
    <tr>
    <td></td>
    <td>${t('cP.physical')}</td><td>${t('cP.magical')}</td><td>${t('cP.total')}</td>
    <td>${t('cP.physical')}</td><td>${t('cP.magical')}</td><td>${t('cP.spirit')}</td><td>${t('cP.total')}</td>
    </tr>`;

    function renderCombatRow(label, rowId, style, combatRecords, rowConfig) {
        let pd = combatRecords.physicalDealt[rowId] ?? 0;
        let md = combatRecords.magicalDealt[rowId] ?? 0;
        let td = pd + md;

        let pt = combatRecords.physicalTaken[rowId] ?? 0;
        let pts = combatRecords.physicalTaken['spiritShield' + rowId] ?? 0;
        let mt = combatRecords.magicalTaken[rowId] ?? 0;
        let mts = combatRecords.magicalTaken['spiritShield' + rowId] ?? 0;
        let tt = pt + pts + mt + mts;

        let dataObj = { label, pd, md, td, pt, pts, mt, mts, tt };
        let order = ['label', 'pd', 'md', 'td', 'pt', 'mt', 'pts', 'tt'];

        let html = `<tr ${style}>`;
        order.forEach((k, index) => {
            let v = dataObj[k];
            let styleStr = rowConfig[`s_${k}`] || '';
            let styleText = styleStr ? ` style="${styleStr}"` : '';
            html += `<td${styleText}>${(v === 0 && index !== 0) ? '' : v.toLocaleString()}</td>`;
        });
        html += '</tr>';
        return html;
    };

    let totals = {};
    let totalsTypes = ['damage', 'result', 'resultPartially'];
    COMBAT_FIELDS.forEach(f => {
        if (!totalsTypes.includes(f.type) || f.isTotal) return;
        totals[f.type] ??= { pd: 0, md: 0, pt: 0, pts: 0, mt: 0, mts: 0 };

        let acc = totals[f.type];
        acc.pd += (combatRecords.physicalDealt[f.id] ?? 0);
        acc.md += (combatRecords.magicalDealt[f.id] ?? 0);
        acc.pt += (combatRecords.physicalTaken[f.id] ?? 0);
        acc.pts += (combatRecords.physicalTaken['spiritShield' + f.id] ?? 0);
        acc.mt += (combatRecords.magicalTaken[f.id] ?? 0);
        acc.mts += (combatRecords.magicalTaken['spiritShield' + f.id] ?? 0);
    });

    cfgStats.combatRows.forEach(row => {
        let excludeIds = ['resist50', 'resist75', 'resist90'];
        if (excludeIds.includes(row.id)) return;

        let field = COMBAT_FIELDS.find(f => f.id === row.id);
        let styleNormal = row.styleText ? `style="${row.styleText}"` : '';
        let styleTotal = `style="border-top: 1px solid; border-bottom: 1px solid; ${row.styleText || ''}"`;

        switch (field.type) {
            case 'damage':
            case 'result':
            case 'resultPartially': {
                if (field.isTotal) {
                    let totalData = { ...(totals[field.type] || { pd: 0, md: 0, pt: 0, pts: 0, mt: 0, mts: 0 }) };
                    /*patch*/if (isekaiSuffix && field.type === 'result') totalData.pt -= combatRecords.physicalTaken.blockAndParry || 0;
                    innerHTML += renderCombatRow(t(field.label), 'total', styleTotal, {
                        physicalDealt: { total: totalData.pd || 0 },
                        magicalDealt: { total: totalData.md || 0 },
                        physicalTaken: { total: totalData.pt || 0, spiritShieldtotal: totalData.pts || 0 },
                        magicalTaken: { total: totalData.mt || 0, spiritShieldtotal: totalData.mts || 0 }
                    }, row);
                } else {
                    innerHTML += renderCombatRow(t(field.label), field.id, styleNormal, combatRecords, row);
                }
                break;
            }
        }
    });

    innerHTML += `
    <tr style="border-top: 1px solid; border-bottom: 1px solid;">
    <td colspan="2" style="text-align: center;">${t('cP.critStack')}</td>
    <td colspan="2" style="text-align: center;">${t('cP.debuffResist')}</td>
    <td colspan="4"></td>
    </tr>
    `;

    let debuffResistTotal = 0;
    let debuffMap = {
        1: { key: 'debuffResist0', label: t('cP.debuffResist0') },
                                  2: { key: 'debuffResist1', label: t('cP.debuffResist1-2') },
                                  3: { key: 'debuffResist3', label: t('cP.debuffResist3') },
    };

    for (let i = 1; i < 10; i++) {
        let critStack = combatRecords.physicalDealt[`crit${i}`];
        if (i <= 4) {
            innerHTML += `<tr><td>${i}x-${t('cP.crit')}</td><td>${(critStack || '').toLocaleString()}</td>`;
            if (i < 4) {
                let value = combatRecords.magicalDealt[debuffMap[i].key] || 0;
                debuffResistTotal += value;
                innerHTML += `<td style="text-align: left;">${debuffMap[i].label}</td><td>${(value || '').toLocaleString()}</td>`;
            } else if (i === 4) {
                innerHTML += `<td style="border: 1px solid; text-align: left;">${t('cP.total')}</td><td style="border: 1px solid;">${(debuffResistTotal || '').toLocaleString()}</td>`;
            }
            innerHTML += '<td colspan="4"></td></tr>';
        } else if (critStack) {
            innerHTML += `<tr><td>${i}x-${t('cP.crit')}</td><td>${(critStack || '').toLocaleString()}</td><td colspan="6"></td></tr>`;
        }
    }

    tbody.innerHTML = innerHTML;
    table.appendChild(tbody);
    return table;
}

function combatRecordPlayer_Use(combatRecords) {
    let table = document.createElement('table');
    table.id = 'combat-records-use-table';
    if (cfgStats.darkMode) table.classList.add('dark-mode');
    let tbody = document.createElement('tbody');

    let innerHTML = `<tr><th colspan="2">${t('cP.used')}</th></tr>`;

    function renderCombatUseRow(label, entries) {
        if (!entries.length) return;
        innerHTML += `<tr><td>${t(label)}</td><td>${entries.join(', ')}</td></tr>`;
    }

    let useKeys = new Set();
    let temp_combatUseRows = [{"id":"action"}, {"id":"item"}, {"id":"skill"}, {"id":"spellSupport"}, {"id":"spellDamage"}, {"id":"spellDebuff"}];
    temp_combatUseRows.forEach(row => {
        let field = COMBAT_USE_FIELDS.find(f => f.id === row.id);
        let entries = [];
        for (const { key, label } of field.keys) {
            let count = combatRecords.use[key];
            if (count) {
                entries.push(`${t(label)}: ${count}`);
                useKeys.add(key);
            }
        }
        renderCombatUseRow(field.label, entries);
    });

    let others = [];
    for (const [key, value] of Object.entries(combatRecords.use)) {
        if (useKeys.has(key)) continue;
        others.push(`${t(`cB.${key}`)}: ${value}`);
    }
    renderCombatUseRow(t('cP.misc'), others);

    tbody.innerHTML = innerHTML;
    table.appendChild(tbody);
    return table;
}

function revenueRecordPlayer(revenueRecords, priceData) {
    let table = document.createElement('table');
    table.id = 'revenue-records-table';
    table.className = 'records-table';
    cfgStats.darkMode && table.classList.add('dark-mode');
    let tbody = document.createElement('tbody');

    let innerHTML = `
    <tr style="border: 1px solid;"><td colspan="6">${t('rP.revenue')}</td></tr>
    <tr style="border: 1px solid;">
    <td style="text-align: left;">${t('rP.name')}</td>
    <td>${t('rP.drop')}</td><td>${t('rP.use')}</td><td>${t('rP.balance')}</td><td>${t('rP.unitPrice')}</td><td>${t('rP.profit')}</td>
    </tr>`;

    cfgStats.revenueRows.forEach(row => {
        let field = REVENUE_FIELDS.find(f => f.id === row.id);
        let data = revenueRecords[field.source || field.id];
        let styleNormal = row.styleText ? `style="${row.styleText}"` : '';
        let styleFirst = `style="border-top: 1px solid; ${row.styleText || ''}"`;

        switch (field.type) {
            case 'simple': {
                let value = field.key ? data[field.key] : data;
                if (value) {
                    innerHTML += `<tr${value < 0 ? ' class="deficit"' : ''} ${styleFirst}>
                    <td>${t(field.label)}</td>
                    <td colspan="5" style="text-align: center;">${value.toLocaleString()}</td>
                    </tr>`;
                }
                break;
            }
            case 'list_flat':
            case 'list_paired': {
                let dataKeys = Object.keys(data);
                let sortedKeys = jpxUtils.getSortedKeys(field.order || [], dataKeys);

                let items = [];
                sortedKeys.forEach(sortedKey => {
                    if (field.type === 'list_flat' && Array.isArray(data[sortedKey])) items.push(...data[sortedKey]);
                    else if (field.type === 'list_paired') items.push(`${t(`rP.${sortedKey}`)}: ${data[sortedKey]}`);
                });
                if (!items.length) break;

                let firstItem = items.shift();
                innerHTML += `<tr ${styleFirst}>
                <td rowspan="${items.length + 1}">${t(field.label)}</td>
                <td colspan="5" style="text-align: center;">${firstItem}</td>
                </tr>`;
                items.forEach(item => {
                    innerHTML += `<tr ${styleNormal}><td colspan="5" style="text-align: center;">${item}</td></tr>`;
                });
                break;
            }
            case 'grid':
            case 'grid_detailed': {
                let dataKeys = Object.keys(data).filter(key => {
                    if (key === 'total' || key === 'profit') return false;
                    let value = data[key];
                    if (value && typeof value === 'object') return !jpxUtils.isEmpty(value);
                    return value;
                });
                let sortedKeys = jpxUtils.getSortedKeys(field.order || [], dataKeys);
                if (!sortedKeys.length) break;

                const renderRow = (key, rowStyle) => {
                    let value = data[key];
                    let balance = field.type === 'grid_detailed' ? Math.round((value.drop - value.use) * 10) / 10 : value;
                    let unitPrice = priceData[key];
                    let tdClass = !isNaN(unitPrice) ? '' : ' class="noData"';
                    let tdUnitPrice = !isNaN(unitPrice) ? unitPrice.toLocaleString() : t('rP.noData');
                    let tdProfit = !isNaN(unitPrice) ? (Math.round(unitPrice * balance * 10) / 10).toLocaleString() : t('rP.noData') ;
                    let profitTds = `<td${tdClass}>${tdUnitPrice}</td><td${tdClass}>${tdProfit}</td>`;

                    if (field.type === 'grid_detailed') {
                        return `<tr${balance < 0 ? ' class="deficit"' : ''} ${rowStyle}>
                        <td>${t(`rP.${key}`)}</td><td>${value.drop}</td><td>${value.use}</td><td>${balance}</td>${profitTds}
                        </tr>`;
                    } else {
                        return `<tr ${rowStyle}>
                        <td>${t(`rP.${key}`)}</td><td colspan="3">${value}</td>${profitTds}
                        </tr>`;
                    }
                };

                let firstKey = sortedKeys.shift();
                innerHTML += renderRow(firstKey, styleFirst);
                sortedKeys.forEach(sortedKey => innerHTML += renderRow(sortedKey, styleNormal));
                break;
            }
            case 'total': {
                if (data && data.total) {
                    innerHTML += `<tr ${styleFirst}>
                    <td>${t(field.label)}</td>
                    <td colspan="3">${data.total}</td><td></td><td>${data.profit}</td>
                    </tr>`;
                }
                break;
            }
            case 'stamina': {
                let staminaRecords = JSON.parse(localStorage.getItem(prefix + 'staminaRecords' + isekaiSuffix) || '{}');
                let staminaCost = staminaRecords?.staminaCost ?? 0;
                let staminaQuotaTotal = 24 + (cfgBattle.dailyStaminaQuotaPlus && !isekaiSuffix ? cfgBattle.dailyStaminaQuotaPlus : 0);
                let unitPrice = priceData['Energy Drink'] / 10;
                let balance = -revenueRecords.staminaCost || 0;
                let profit = Math.round(balance * unitPrice * 10) / 10;
                innerHTML += `<tr${profit < 0 ? ' class="deficit"' : ''} ${styleFirst}>
                <td>${t(field.label)}</td><td>${staminaQuotaTotal}</td><td>${staminaCost}</td><td>${balance}</td>
                <td>${unitPrice.toLocaleString()}</td><td>${profit.toLocaleString()}</td>
                </tr>`;
                break;
            }
            case 'summary': {
                let trClass = data < 0 ? 'deficit' : (data > 0 ? 'surplus' : '');
                innerHTML += `<tr class="${trClass}" ${styleFirst}>
                <td>${t(field.label)}</td>
                <td colspan="5" style="text-align: center;">${data.toLocaleString()}</td>
                </tr>`;
                break;
            }
        }
    });

    tbody.innerHTML = innerHTML;
    table.appendChild(tbody);
    return table;
}

function newWindowRecordPlayer(doClone, battleRecords, timeRecordEl, combatRecordEl, combatRecord_UseEl, revenueRecordEl) {
    let newWin = window.open();
    let doc = newWin.document;
    doc.head.appendChild(doc.createElement('style')).innerHTML = `
    .container {
        display: flex;
        gap: 16px;
    }

    .left, .right {
        display: flex;
        flex: 0 0 auto;
        flex-direction: column;
        gap: 10px;
    }

    table {
        width: max-content;
    }

    body.dark-mode {
        background-color: #121212;
        color: #eee;
    }
    `;
    let style = doc.createElement('style');
    style.id = 'jpx';
    style.textContent = cfg.styleText;
    doc.head.appendChild(style);

    cfgStats.darkMode && doc.body.classList.add('dark-mode');

    let container = doc.createElement('div');
    container.className = 'container';

    let left = doc.createElement('div');
    left.className = 'left';

    let info = doc.createElement('div');
    info.id = 'info-records-div';
    cfgStats.darkMode && info.classList.add('dark-mode');
    info.textContent =
    `${battleRecords.timestamp}   ${t(`sP.${battleRecords.world}`)}   ` +
    `${t(`sP.${battleRecords.battleType || ''}`) + (battleRecords.worldLevel ? ` (WL${battleRecords.worldLevel})` : '') + (battleRecords.towerFloor ? ` (${battleRecords.towerFloor}F)` : '')}   ` +
    `${battleRecords.roundInfo.current}/${battleRecords.roundInfo.total} ${battleRecords.result !== 'Victory' ? `(${t(`sP.${battleRecords.result}`)})` : ''}   ` +
    `${t(`sP.${Object.keys(difficumpMap).find(key => difficumpMap[key] === battleRecords.difficump)}`)}   LV: ${battleRecords.playerLevel}`;
    left.appendChild(info);

    container.appendChild(left);

    let right = doc.createElement('div');
    right.className = 'right';
    container.appendChild(right);

    doc.body.appendChild(container);

    [timeRecordEl, combatRecordEl, combatRecord_UseEl].forEach(el => {
        if (!el) return;
        left.appendChild(doClone ? el.cloneNode(true) : el);
    });

    if (revenueRecordEl) {
        right.appendChild(doClone ? revenueRecordEl.cloneNode(true) : revenueRecordEl);
    }
}

//Indexed DB
function openDB() {
    return new Promise((resolve, reject) => {
        let request = window.indexedDB.open('jpx', 1);

        request.onupgradeneeded = (event) => {
            let db = event.target.result;
            if (!db.objectStoreNames.contains('battleRecords')) {
                let objectStore = db.createObjectStore('battleRecords', {
                    keyPath: 'timestamp'
                });
                objectStore.createIndex('date', 'date');
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        request.onerror = (event) => {
            reject(request.error);
        };;
    });
}

async function storeBattleRecords(battleRecords) {
    const db = await openDB();

    const transaction = db.transaction('battleRecords', 'readwrite');
    transaction.objectStore('battleRecords').put(battleRecords);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            resolve('Saved successfully');
        };
        transaction.onerror = () => {
            reject(transaction.error);
        };
    });
}

function openBattleRecords() {
    if (Object.keys(cfgStats).length < 1) {
        let storedCfgStats = {};
        try {
            storedCfgStats = JSON.parse(localStorage.getItem(prefix + 'cfgStats') || '{}');
        } catch (err) {
            console.warn('Failed to load cfgStats. Using default cfgStats.');
            storedCfgStats = {};
        }
        mergeCfg(storedCfgStats, defaultCfgStats, cfgStats, 'stats');
    }

    newWindow = window.open();
    if (newWindow === null || newWindow === undefined) return;

    let doc = newWindow.document;
    doc.title = 'JPX 战斗统计';

    // ===== 读取外观设置，动态计算标题栏与 tab 配色 =====
    ensureCfgMissPink();
    let appearanceEnabled = !!cfgMissPink.appearance?.enabled;
    let sp = cfgMissPink.appearance?.scriptPanel || {};

    let titleBarBg, titleBarTextColor;
    let tabInactiveBg, tabInactiveText, tabActiveBg, tabActiveText, tabHoverBg;

    if (appearanceEnabled) {
        titleBarBg = hexToRgba(sp.titleBarBg, sp.titleBarBgAlpha ?? 1) || '#333333';
        titleBarTextColor = sp.titleBarTextColor || '#ffffff';

        const titleBarHex = _hexToRgb(sp.titleBarBg) ? sp.titleBarBg : '#333333';
        const isLightTitleBar = _isLight(titleBarHex);

        // 深色标题栏 → 未选中 tab 稍亮；浅色标题栏 → 未选中 tab 稍暗
        tabInactiveBg = _shade(titleBarHex, isLightTitleBar ? -0.12 : 0.18);
        tabInactiveText = _shade(titleBarTextColor, isLightTitleBar ? 0 : -0.15);

        // 选中 tab 采用内容区颜色，与下方 ribbon 视觉衔接
        tabActiveBg = _hexToRgb(sp.contentBg) ? _shade(sp.contentBg, 0) : '#f8f8f8';
        tabActiveText = sp.contentTextColor || '#333333';

        tabHoverBg = isLightTitleBar
        ? _shade(tabInactiveBg, -0.08)
        : _shade(tabInactiveBg, 0.10);
    } else {
        titleBarBg = '#333';
        titleBarTextColor = '#fff';
        tabInactiveBg = '#555';
        tabInactiveText = '#ddd';
        tabActiveBg = '#f8f8f8';
        tabActiveText = '#333';
        tabHoverBg = '#666';
    }

    doc.head.appendChild(doc.createElement('style')).innerHTML = `
    html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        overflow: hidden;
        font-family: arial, helvetica, sans-serif;
        font-size: 12px;
    }
    #stats-window {
    display: flex;
    flex-direction: column;
    height: 100vh;
    }

    #stats-title-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    background-color: ${titleBarBg};
    color: ${titleBarTextColor};
    height: 36px;
    flex: 0 0 auto;
    }
    #stats-title-bar .stats-title {
    font-weight: bold;
    white-space: nowrap;
    font-size: 13px;
    }
    #stats-title-bar .stats-tabs {
    display: flex;
    gap: 2px;
    align-self: flex-end;
    }
    #stats-title-bar .stats-tabs button {
    background-color: ${tabInactiveBg};
    color: ${tabInactiveText};
    border: none;
    padding: 8px 18px 6px;
    cursor: pointer;
    border-radius: 6px 6px 0 0;
    font-size: 12px;
    font-family: inherit;
    }
    #stats-title-bar .stats-tabs button.active {
    background-color: ${tabActiveBg};
    color: ${tabActiveText};
    font-weight: bold;
    }
    #stats-title-bar .stats-tabs button:hover:not(.active) {
    background-color: ${tabHoverBg};
    }
    #stats-close-btn {
    margin-left: auto;
    background: #c33;
    color: #fff;
    border: none;
    padding: 4px 12px;
    cursor: pointer;
    border-radius: 4px;
    font-family: inherit;
    }
    #stats-close-btn:hover { background: #e44; }

    #stats-content {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    overflow: hidden;
    min-height: 0;
    }

    #stats-ribbon {
    display: flex;
    background: #f8f8f8;
    border-bottom: 1px solid #bbb;
    padding: 4px 8px;
    min-height: 60px;
    flex: 0 0 auto;
    overflow-x: auto;
    }
    #stats-panel-basic,
    #stats-panel-advanced {
    display: flex;
    align-items: stretch;
    }
    #stats-panel-advanced {
    padding: 12px 8px;
    align-items: center;
    gap: 8px;
    }

    .ribbon-group {
        display: flex;
        flex-direction: column;
        padding: 2px 12px;
        border-right: 1px solid #ddd;
        min-width: max-content;
    }
    .ribbon-group:last-child { border-right: none; }
    .ribbon-group-content {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        padding-bottom: 6px;
        flex: 1;
    }
    .ribbon-group-label {
        font-size: 11px;
        color: #666;
        text-align: center;
        border-top: 1px solid #eee;
        padding-top: 2px;
    }
    .ribbon-item label {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        cursor: pointer;
        margin-right: 6px;
    }
    .ribbon-item input[type="checkbox"] { margin: 0 2px 0 0; }

    #stats-table-container {
    flex: 1 1 auto;
    overflow: auto;
    padding: 8px;
    min-height: 0;
    }

    #battleStatsTable {
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    }
    #battleStatsTable th,
    #battleStatsTable td {
    border: 1px solid #999;
    min-width: 20px;
    padding: 2px 4px;
    white-space: nowrap;
    font-size: 80%;
    background-color: #fff;
    }
    #battleStatsTable th {
    background-color: #eee;
    text-align: center;
    }
    #battleStatsTable tbody tr:hover td:not([style*="position: sticky"]) {
    background-color: #ccd9ff;
    }

    .tooltip:hover::after {
        display: block;
        position: absolute;
        content: attr(content);
        border: 1px solid black;
        background: #eee;
        padding: .25em;
        white-space: pre;
        z-index: 99;
    }

    body.dark-mode {
        background-color: #121212;
        color: #eee;
    }
    body.dark-mode #stats-title-bar { background-color: #111; }
    body.dark-mode #stats-ribbon {
        background-color: #1e1e1e;
        border-bottom-color: #555;
    }
    body.dark-mode .ribbon-group { border-right-color: #444; }
    body.dark-mode .ribbon-group-label {
        color: #aaa;
        border-top-color: #333;
    }
    body.dark-mode #battleStatsTable th,
    body.dark-mode #battleStatsTable td {
        border-color: #555;
        background-color: #121212;
    }
    body.dark-mode #battleStatsTable th { background-color: #1e1e1e; }
    body.dark-mode #battleStatsTable tbody tr:hover td:not([style*="position: sticky"]) {
        background-color: #333;
    }
    body.dark-mode .tooltip:hover::after {
        color: #eee;
        background: #222;
        border-color: #555;
    }
    body.dark-mode input,
    body.dark-mode select {
        color: #eee;
        background-color: #1e1e1e;
        border: 1px solid #555;
    }
    body.dark-mode label { color: #eee; }
    `;

    cfgStats.darkMode && doc.body.classList.add('dark-mode');

    // ===== DOM 骨架 =====
    let statsWindow = doc.createElement('div');
    statsWindow.id = 'stats-window';
    doc.body.appendChild(statsWindow);

    let titleBar = doc.createElement('div');
    titleBar.id = 'stats-title-bar';
    titleBar.innerHTML = `
    <span class="stats-title">JPX 战斗统计</span>
    <div class="stats-tabs">
    <button data-tab="basic" class="active">📄基本</button>
    <button data-tab="advanced">🔧高级</button>
    </div>
    <button id="stats-close-btn">❌关闭</button>
    `;
    statsWindow.appendChild(titleBar);

    let content = doc.createElement('div');
    content.id = 'stats-content';
    statsWindow.appendChild(content);

    let ribbon = doc.createElement('div');
    ribbon.id = 'stats-ribbon';
    content.appendChild(ribbon);

    let panelBasic = doc.createElement('div');
    panelBasic.id = 'stats-panel-basic';
    ribbon.appendChild(panelBasic);

    let panelAdvanced = doc.createElement('div');
    panelAdvanced.id = 'stats-panel-advanced';
    panelAdvanced.style.display = 'none';
    ribbon.appendChild(panelAdvanced);

    let tableContainer = doc.createElement('div');
    tableContainer.id = 'stats-table-container';
    content.appendChild(tableContainer);

    // ===== 事件 =====
    titleBar.querySelector('#stats-close-btn').addEventListener('click', () => newWindow.close());

    let tabBtns = titleBar.querySelectorAll('.stats-tabs button');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.toggle('active', b === btn));
            let isBasic = btn.dataset.tab === 'basic';
            panelBasic.style.display = isBasic ? 'flex' : 'none';
            panelAdvanced.style.display = isBasic ? 'none' : 'flex';
        });
    });

    // ===== 内容 =====
    panelBasic.appendChild(createFilter());
    renderAdvancedPanel(panelAdvanced);

    getBattleRecordsRender().then(battleRecords => {
        renderDynamicTable(battleRecords, cfgStats.statsColumns, tableContainer);
    });
}

async function getBattleRecordsRender() {
    const db = await openDB();
    const transaction = db.transaction('battleRecords', 'readonly');
    const objectStore = transaction.objectStore('battleRecords');

    let battleRecords = [];
    let filters = getFilters();
    let indexName = filters.aggregate ? 'date' : 'default';

    let keyRange = IDBKeyRange.bound(0, 'z');
    let source = (indexName === 'default' ? objectStore : objectStore.index(indexName));
    let i = 0;

    return new Promise(resolve => {
        const req = source.openCursor(keyRange, 'prevunique');
        req.onsuccess = function(e) {
            let cursor = e.target.result;

            if (!cursor || i >= filters.rows) {
                battleRecords.unshift(generateAggregate(battleRecords, 'Total'), generateAggregate(battleRecords, 'Average'));

                resolve(battleRecords);
                return;
            }

            if (indexName === 'date') {
                let dailyReq = objectStore.index('date').getAll(cursor.key);
                dailyReq.onsuccess = function(ev) {
                    let results = ev.target.result || [];
                    results = results.filter(x => filterData(x, filters));
                    if (results.length > 0) {
                        battleRecords.push(generateAggregate(results, 'Total', results[0].date));
                        i += 1;
                    }

                    cursor.continue();
                };

                return;
            }

            let bs = filterData(cursor.value, filters);
            if (bs) {
                battleRecords.push(bs);
                i += 1;
            }

            cursor.continue();
        };
    });
}

async function exportIndexedDB() {
    const db = await openDB();
    const exportData = {
        dbName: db.name,
        version: db.version,
        stores: {},
    };

    for (const storeName of db.objectStoreNames) {
        exportData.stores[storeName] = await new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const req = objectStore.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    db.close();
    return exportData;
}

async function importIndexedDB(jsonData, merge = true) {
    const db = await openDB();

    for (const storeName in jsonData.stores) {
        const transaction = db.transaction(storeName, 'readwrite');
        const objectStore = transaction.objectStore(storeName);

        if (!merge) objectStore.clear();
        let existingKeys = null;
        if (merge) {
            existingKeys = await new Promise((resolve, reject) => {
                const req = objectStore.getAllKeys();
                req.onsuccess = () => resolve(new Set(req.result));
                req.onerror = () => reject(req.error);
            });
        }

        for (const record of jsonData.stores[storeName]) {
            const key = record[objectStore.keyPath];
            if (merge) {
                if (!existingKeys.has(key)) objectStore.put(record);
            } else {
                objectStore.put(record);
            }
        }

        await new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    db.close();
}

function filterData(data, filters) {
    if (filters.world && !filters.world.includes(data.world)) return false;
    if (filters.battleType && !filters.battleType.includes(data.battleType)) return false;
    if (filters.difficulties && !filters.difficulties.includes(data.difficump.toString())) return false;
    if (filters.result && !filters.result.includes(data.result)) return false;
    if (filters.roundTotal && !jpxUtils.inRange(data.roundInfo.total, filters.roundTotal)) return false;

    return data;
}

function generateAggregate(data_array, type, timestamp_name = null) { //type: Average, Total
    if (data_array.length === 0) {
        return false
    } else {
        let length = type === 'Average' ? data_array.length : 1;
        let new_data = {
            date: timestamp_name || t(`sP.${type}`),
                                  roundInfo: {
                                      current: Math.round(data_array.map(x => x.roundInfo.current).reduce((a,b) => a + b, 0) / length * 100) / 100,
                                  total: Math.round(data_array.map(x => x.roundInfo.total).reduce((a,b) => a + b, 0) / length * 100) / 100,
                                  },
                                  deltaSeconds: Math.round(data_array.map(x => x.deltaSeconds).reduce((a,b) => a + b, 0) / length * 1000) / 1000,
                                  deltaTime: '',
                                  turns: Math.round(data_array.map(x => x.turns).reduce((a,b) => a + b, 0) / length * 100) / 100,
                                  tps: 0,
                                  riddle: Math.round(data_array.map(x => x.riddle).reduce((a,b) => a + b, 0) / length * 100) / 100,
                                  combatRecords: jpxUtils.createCombatRecords(),
                                  revenueRecords: jpxUtils.createRevenueRecords(),
        };
        new_data.deltaTime = jpxUtils.secondsToTime(new_data.deltaSeconds, true);
        new_data.tps = Math.round(new_data.turns / new_data.deltaSeconds * 100) / 100;

        for (let i = 0; i < data_array.length; i++) {
            for (const [categoryKey, categoryValue] of Object.entries(data_array[i].combatRecords)) {
                for (const [fieldKey, fieldValue] of Object.entries(categoryValue)) {
                    jpxUtils.inc(new_data.combatRecords[categoryKey], fieldKey, fieldValue);
                }
            }
            for (const [categoryKey, categoryValue] of Object.entries(data_array[i].revenueRecords)) {
                switch (categoryKey) {
                    case ('exp'):
                    case ('credit'):
                    case ('staminaCost'):
                    case ('totalProfit'):
                    case ('finalProfit'):
                        new_data.revenueRecords[categoryKey] += categoryValue;
                        break;
                    case ('equipment'):
                        for (const [key, value] of Object.entries(categoryValue)) {
                            new_data.revenueRecords[categoryKey][key] ??= [];
                            new_data.revenueRecords[categoryKey][key] = new_data.revenueRecords[categoryKey][key].concat(value);
                        }
                        break;
                    case ('consumable'):
                        for (const [key, value] of Object.entries(categoryValue)) {
                            if (key != 'total' && key != 'profit') {
                                new_data.revenueRecords[categoryKey][key] ??= {};
                                ['drop', 'use', 'balance'].forEach(prop => {
                                    jpxUtils.inc(new_data.revenueRecords[categoryKey][key], prop, value[prop]);
                                });
                            }
                        }
                        break;
                    case ('proficiency'):
                    case ('material'):
                    case ('token'):
                    case ('food'):
                    case ('figurine'):
                    case ('artifact'):
                    case ('trophy'):
                    case ('crystal'):
                        for (const [key, value] of Object.entries(categoryValue)) {
                            if (key != 'total' && key != 'profit') {
                                jpxUtils.inc(new_data.revenueRecords[categoryKey], key, value);
                            }
                        }
                        break;
                }
            }
        }
        new_data.revenueRecords.staminaCost = Math.round(new_data.revenueRecords.staminaCost * 10) / 10;
        for (const [key, value] of Object.entries(new_data.revenueRecords.proficiency)) {
            new_data.revenueRecords.proficiency[key] = Math.round(value * 1000) / 1000;
        }

        if (type === 'Average') {
            for (const [categoryKey, categoryValue] of Object.entries(new_data.combatRecords)) {
                for (const [fieldKey, fieldValue] of Object.entries(categoryValue)) {
                    new_data.combatRecords[categoryKey][fieldKey] = Math.round(fieldValue / length * 10) / 10;
                }
            }
            for (const [categoryKey, categoryValue] of Object.entries(new_data.revenueRecords)) {
                switch (categoryKey) {
                    case ('exp'):
                    case ('credit'):
                    case ('staminaCost'):
                    case ('totalProfit'):
                    case ('finalProfit'):
                        new_data.revenueRecords[categoryKey] = Math.round(categoryValue / length * 10) / 10;
                        break;
                    case ('equipment'):
                        for (const [key, value] of Object.entries(categoryValue)) {
                            new_data.revenueRecords[categoryKey][key] ??= [];
                            new_data.revenueRecords[categoryKey][`${key}_Avg`] = Math.round(new_data.revenueRecords[categoryKey][key].length / length * 10) / 10;
                        }
                        break;
                    case ('consumable'):
                        for (const [key, value] of Object.entries(categoryValue)) {
                            if (key != 'total' && key != 'profit') {
                                ['drop', 'use', 'balance'].forEach(prop => {
                                    new_data.revenueRecords[categoryKey][key][prop] = Math.round(value[prop] / length * 10) / 10;
                                });
                            }
                        }
                        break;
                    case ('proficiency'):
                        for (const [key, value] of Object.entries(categoryValue)) {
                            if (key != 'total' && key != 'profit') {
                                new_data.revenueRecords[categoryKey][key] = Math.round(value / length * 1000) / 1000;
                            }
                        }
                        break;
                    case ('material'):
                    case ('token'):
                    case ('food'):
                    case ('figurine'):
                    case ('artifact'):
                    case ('trophy'):
                    case ('crystal'):
                        for (const [key, value] of Object.entries(categoryValue)) {
                            if (key != 'total' && key != 'profit') {
                                new_data.revenueRecords[categoryKey][key] = Math.round(value / length * 10) / 10;
                            }
                        }
                        break;
                }
            }
        }

        return new_data;
    }
}

function createFilter() {
    let filtersDiv = document.createElement('div');
    filtersDiv.id = 'filtersDiv';
    filtersDiv.style.cssText = 'display: flex; flex-wrap: nowrap;';

    const RIBBON_LABELS = {
        aggregate: '📅按日汇总',
        world: '🌍世界',
        battleType: '🎛战斗类型',
        difficulties: '🎚难度',
        result: '🏆结果',
        roundTotal: '🔢总轮次范围',
        rows: '🔢展示项目数',
    };

    STATS_FILTERS.forEach(filter => {
        let group = document.createElement('div');
        group.className = 'ribbon-group';
        group.id = `${filter.id}-group`;

        let contentDiv = document.createElement('div');
        contentDiv.className = 'ribbon-group-content';
        contentDiv.id = filter.id;
        group.appendChild(contentDiv);

        let labelDiv = document.createElement('div');
        labelDiv.className = 'ribbon-group-label';
        labelDiv.textContent = RIBBON_LABELS[filter.key] || t(filter.label) || filter.key;
        group.appendChild(labelDiv);

        filtersDiv.appendChild(group);

        switch (filter.type) {
            case 'checkbox': {
                filter.options.forEach(opt => {
                    let isChecked = true;
                    if (filter.id === 'filter-aggregate') isChecked = false;
                    if (filter.id === 'filter-world') isChecked = !isekaiSuffix ? opt === 'Persistent' : opt === 'Isekai';

                    let wrap = document.createElement('span');
                    wrap.className = 'ribbon-item';
                    wrap.innerHTML = `
                    <label>
                    <input type="checkbox" value="${opt}" ${isChecked ? 'checked' : ''}>
                    ${t(`sP.${opt}`)}
                    </label>
                    `;
                    contentDiv.appendChild(wrap);
                });
                break;
            }
            case 'rangeNumber': {
                contentDiv.innerHTML = `
                <input type="number" class="range-min" style="width: 60px;" value="${filter.value[0]}">
                <span style="margin: 0 4px;">to</span>
                <input type="number" class="range-max" style="width: 60px;" value="${filter.value[1]}">
                `;
                break;
            }
            case 'number': {
                contentDiv.innerHTML = `<input type="number" value="${filter.value}" style="width: 80px;">`;
                break;
            }
        }
    });

    filtersDiv.addEventListener('change', (e) => {
        if (e.target.tagName !== 'INPUT') return;
        getBattleRecordsRender().then(battleRecords => {
            let container = newWindow.document.querySelector('#stats-table-container');
            if (container) renderDynamicTable(battleRecords, cfgStats.statsColumns, container);
        });
    });

    return filtersDiv;
}

function getFilters() {
    let filters = {};

    STATS_FILTERS.forEach(filter => {
        let filterEl = newWindow.document.getElementById(filter.id);
        if (!filterEl) return;

        switch (filter.type) {
            case 'checkbox': {
                let checked = Array.from(filterEl.querySelectorAll('input:checked')).map(x => x.value);
                filters[filter.key] = filter.options.length === 1 ? !!checked.length : checked;
                break;
            }
            case 'rangeNumber': {
                filters[filter.key] = [parseInt(filterEl.querySelector('.range-min').value) ?? 0, parseInt(filterEl.querySelector('.range-max').value) ?? 9999];
                break;
            }
            case 'number': {
                filters[filter.key] = parseInt(filterEl.querySelector('input').value) ?? 0;
                break;
            }
        }
    });

    return filters;
}

function applyFreeze(table, freezeRows, freezeCols, bgColor) {
    if (!table) return;

    table.querySelectorAll('tr, th, td').forEach(el => {
        el.style.position = '';
        el.style.top = '';
        el.style.left = '';
        el.style.zIndex = '';
        el.style.backgroundColor = '';
    });

    if (freezeRows <= 0 && freezeCols <= 0) return;

    let thead = table.querySelector('thead');
    let tbody = table.querySelector('tbody');
    let allRows = [];
    if (thead) allRows.push(...thead.querySelectorAll('tr'));
    if (tbody) allRows.push(...tbody.querySelectorAll('tr'));
    if (!allRows.length) return;

    let rowTops = [];
    let cumTop = 0;
    for (let i = 0; i < allRows.length && i < freezeRows; i++) {
        rowTops[i] = cumTop;
        cumTop += allRows[i].getBoundingClientRect().height;
    }

    let firstRowCells = Array.from(allRows[0].children);
    let colLefts = [];
    let cumLeft = 0;
    for (let i = 0; i < firstRowCells.length && i < freezeCols; i++) {
        colLefts[i] = cumLeft;
        cumLeft += firstRowCells[i].getBoundingClientRect().width;
    }

    for (let r = 0; r < allRows.length; r++) {
        let cells = Array.from(allRows[r].children);
        let isFrozenRow = r < freezeRows;
        for (let c = 0; c < cells.length; c++) {
            let isFrozenCol = c < freezeCols;
            if (!isFrozenRow && !isFrozenCol) continue;
            let cell = cells[c];
            cell.style.position = 'sticky';
            cell.style.backgroundColor = bgColor;
            if (isFrozenRow && isFrozenCol) {
                cell.style.top = rowTops[r] + 'px';
                cell.style.left = colLefts[c] + 'px';
                cell.style.zIndex = '3';
            } else if (isFrozenRow) {
                cell.style.top = rowTops[r] + 'px';
                cell.style.zIndex = '2';
            } else {
                cell.style.left = colLefts[c] + 'px';
                cell.style.zIndex = '1';
            }
        }
    }
}

function renderAdvancedPanel(panel) {
    panel.innerHTML = '';

    const applyNow = () => {
        let table = newWindow.document.querySelector('#battleStatsTable');
        if (table) applyFreeze(table, statsFreezeSettings.rows, statsFreezeSettings.cols, statsFreezeSettings.bgColor);
    };

        // 冻结行数
        let rowsLabel = document.createElement('label');
        rowsLabel.style.cssText = 'display: inline-flex; align-items: center; gap: 4px;';
        rowsLabel.append('🧊冻结行数：');
        let rowsInput = document.createElement('input');
        rowsInput.type = 'number';
        rowsInput.min = '0';
        rowsInput.value = statsFreezeSettings.rows;
        rowsInput.style.cssText = 'width: 80px;';
        rowsInput.oninput = () => {
            let v = parseInt(rowsInput.value);
            if (!isNaN(v) && v >= 0) { statsFreezeSettings.rows = v; applyNow(); }
        };
        rowsLabel.appendChild(rowsInput);
        panel.appendChild(rowsLabel);

        // 冻结列数
        let colsLabel = document.createElement('label');
        colsLabel.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; margin-left: 16px;';
        colsLabel.append('🧊冻结列数：');
        let colsInput = document.createElement('input');
        colsInput.type = 'number';
        colsInput.min = '0';
        colsInput.value = statsFreezeSettings.cols;
        colsInput.style.cssText = 'width: 80px;';
        colsInput.oninput = () => {
            let v = parseInt(colsInput.value);
            if (!isNaN(v) && v >= 0) { statsFreezeSettings.cols = v; applyNow(); }
        };
        colsLabel.appendChild(colsInput);
        panel.appendChild(colsLabel);

        // 冻结背景色
        let colorLabel = document.createElement('label');
        colorLabel.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; margin-left: 16px;';
        colorLabel.append('🎨冻结背景色：');
        let colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = statsFreezeSettings.bgColor;
        colorInput.oninput = () => {
            statsFreezeSettings.bgColor = colorInput.value;
            applyNow();
        };
        colorLabel.appendChild(colorInput);
        panel.appendChild(colorLabel);

        // 重置
        jpxUtils.createButton(panel, {
            text: '🔄重置为 3行/6列/#66ccff',
            cssText: 'margin-left: 16px;',
            onClick: () => {
                statsFreezeSettings.rows = 3;
                statsFreezeSettings.cols = 6;
                statsFreezeSettings.bgColor = '#66ccff';
                rowsInput.value = 3;
                colsInput.value = 6;
                colorInput.value = '#66ccff';
                applyNow();
            }
        });
}

function renderDynamicTable(battleRecords, displayedColumns, parent) {
    newWindow.document.querySelector('#battleStatsTable')?.remove();

    let activeFields = displayedColumns.map(column => {
        let baseField = STATS_FIELDS.find(f => f.id === column.id);
        return baseField ? { ...baseField, ...column } : null;
    }).filter(f => f);

    let table = newWindow.document.createElement('table');
    table.id = 'battleStatsTable';

    let thead = newWindow.document.createElement('thead');
    let theadHTML = '<tr>';
    for (const field of activeFields) {
        let style = field.style ? ` style="${field.style}"` : '';
        theadHTML += `<th${style}>${field.customName || t(field.label)}</th>`;
    }
    theadHTML += '</tr>';
    thead.innerHTML = theadHTML;
    table.appendChild(thead);

    let tbody = newWindow.document.createElement('tbody');

    const parseColorThresholds = (str) => {
        if (!str) return [];
        return str.split(',').map(s => {
            const [value, color] = s.split(':');
            return { min: parseFloat(value.trim()), color: color?.trim() };
        }).filter(thr => !isNaN(thr.min)).sort((a, b) => b.min - a.min);
    };

    for (const record of battleRecords) {
        let tr = newWindow.document.createElement('tr');

        for (const field of activeFields) {
            let td = newWindow.document.createElement('td');
            let value = field.get(record);

            if (field.styleText) td.style.cssText = field.styleText;
            if (field.doI18n) value = t(`sP.${value}`);
            if (field.id === 'date') {
                td.textContent = value || '';
                td.addEventListener('pointerdown', (e) => {
                    if (e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
                    jpxMarket.getMarketPrice(false).then((priceData) => {
                        newWindowRecordPlayer(
                            false,
                            record,
                            timeRecordPlayer(record),
                                              combatRecordPlayer(record.combatRecords),
                                              combatRecordPlayer_Use(record.combatRecords),
                                              revenueRecordPlayer(record.revenueRecords, priceData)
                        );
                    });
                });
            } else if (value && typeof value === 'object' && 'drop' in value) {
                td.classList.add('tooltip');
                td.setAttribute('content', `${t('sP.drop')}: ${value.drop.toLocaleString()}\n${t('sP.use')}: ${value.use.toLocaleString()}`);
                td.textContent = value.balance.toLocaleString();
            } else if (typeof value === 'number') {
                td.textContent = value.toLocaleString();

                if (field.colorThresholds) {
                    let thresholds = parseColorThresholds(field.colorThresholds);
                    let match = thresholds.find(thr => value >= thr.min);
                    if (match) td.style.color = match.color;
                }
            } else {
                td.textContent = value || '';
            }

            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    parent.appendChild(table);
    // 表格已入 DOM，强制 reflow 让宽度/高度可读，随后立即应用冻结
    void table.offsetHeight;
    applyFreeze(table, statsFreezeSettings.rows, statsFreezeSettings.cols, statsFreezeSettings.bgColor);

    // 兜底：在表格所在窗口的下一帧再应用一次（跨窗口 rAF 比主窗口 rAF 更可靠）
    let win = table.ownerDocument && table.ownerDocument.defaultView;
    if (win && typeof win.requestAnimationFrame === 'function') {
        win.requestAnimationFrame(() => {
            if (table.isConnected) {
                applyFreeze(table, statsFreezeSettings.rows, statsFreezeSettings.cols, statsFreezeSettings.bgColor);
            }
        });
    }
}

//Settings
function getBattleMode(defaultBattleStyle = 'Unarmed') {
    //let baseStyle = battleStyle || defaultBattleStyle;
    //if (baseStyle === 'Unarmed') baseStyle = 'OneHanded';

    let modeKey = `${battleStyle || defaultBattleStyle}_${battleType}`;

    if (!jpxUtils.isEmpty(cfgBattle[modeKey])) {
        const isValid = value => Array.isArray(value) && value.length > 0;
        if (
            isValid(cfgBattle[modeKey].supports) || isValid(cfgBattle[modeKey].attacks) ||
            Object.entries(cfgBattle[modeKey]).some(([key, value]) => key.startsWith('kb_') && isValid(value))
        ) {
            return modeKey;
        }
    }

    return `${battleStyle || defaultBattleStyle}_General`;
}

function renderSchema(container, schema, data) {
    container.innerHTML = '';

    if (schema.type === 'object') {
        schema.properties.forEach(field => {
            let fieldDiv = document.createElement('div');
            fieldDiv.className = 'field-block';
            renderField(fieldDiv, field, data);
            container.appendChild(fieldDiv);
        });
    }
}

const fieldRenderers = {
    heading(container, field) {
        let div = document.createElement('div');
        div.textContent = t(field.label);
        if (field.class) div.classList.add(field.class);
        container.appendChild(div);
    },

    constant(container, field) {
        let div = document.createElement('div');
        div.textContent = t(field.label);
        if (field.class) div.classList.add(field.class);
        container.appendChild(div);
    },

    boolean(container, field, dataObj) {
        let key = field.key;
        let checkboxId = getUniqueId(key);
        container.innerHTML = `
        <label for="${checkboxId}">
        <input type="checkbox" id="${checkboxId}" ${dataObj[key] ? 'checked' : ''}>
        ${t(field.label)}
        </label>
        `;
        container.querySelector('input').onchange = event => dataObj[key] = event.target.checked;
    },

    text(container, field, dataObj) {
        let key = field.key;
        let inputId = getUniqueId(key);
        container.innerHTML = `
        ${field.skipLabel ? '' : `<label for="${inputId}">${t(field.label)}</label>`}
        <input id="${inputId}" type="text">
        `;

        let input = container.querySelector('input');
        if (field.placeholder) input.placeholder = field.placeholder;
        input.value = dataObj[key] ?? '';
        input.oninput = event => dataObj[key] = event.target.value;
    },

    textarea(container, field, dataObj) {
        let key = field.key;
        let inputId = getUniqueId(key);
        container.innerHTML = `
        ${field.skipLabel ? '' : `<label for="${inputId}">${t(field.label)}</label>`}
        <textarea id="${inputId}" rows="${field.rows ?? 10}" cols="${field.cols ?? 130}"></textarea>
        `;

        let textarea = container.querySelector('textarea');
        if (field.placeholder) textarea.placeholder = field.placeholder;
        textarea.value = dataObj[key] ?? '';
        textarea.oninput = event => dataObj[key] = event.target.value;
    },

    number(container, field, dataObj) {
        let key = field.key;
        let inputId = getUniqueId(key);
        container.innerHTML = `
        ${field.skipLabel ? '' : `<label for="${inputId}">${t(field.label)}</label>`}
        <input id="${inputId}" type="number" value="${dataObj[key] ?? 0}">
        `;
        container.querySelector('input').oninput = event => dataObj[key] = +event.target.value;
    },

    rangeNumber(container, field, dataObj) {
        let key = field.key;
        if (!Array.isArray(dataObj[key])) dataObj[key] = [0, 0];
        let idMin = getUniqueId(`${key}_min`);
        let idMax = getUniqueId(`${key}_max`);

        container.innerHTML = `
        ${field.skipLabel ? '' : `<label style="margin-right: 6px;">${t(field.label)}</label>`}
        <input id="${idMin}" type="number" style="width:60px;" value="${dataObj[key][0]}">
        <span style="margin:0 4px;">to</span>
        <input id="${idMax}" type="number" style="width:60px;" value="${dataObj[key][1]}">
        `;

        container.querySelector(`#${idMin}`).oninput = event => dataObj[key][0] = +event.target.value;
        container.querySelector(`#${idMax}`).oninput = event => dataObj[key][1] = +event.target.value;
    },

    dropdown(container, field, dataObj) {
        function createSelectComponent(field, dataObj) {
            let component = {
                element: document.createElement('div'),
                                  getValue: () => {},
                                  setValue: (value) => {},
                                  onchange: () => {}
            };

            if (!Array.isArray(field.options) && typeof field.options === 'object') {
                let selects = {};

                component.getValue = () => {
                    let values = Object.keys(field.options).map(key => jpxUtils.parseValue(selects[key].value));
                    return field.flatten ? values.join(field.flatten) : values;
                };

                component.setValue = (value) => {
                    let values = value;
                    if (field.flatten && typeof value === 'string') {
                        if (field.flatten === '_') values = value.split(/_(?!Mage(?:_|$))/);
                        else values = value.split(field.flatten);
                    }
                    Object.keys(field.options).forEach((key, i) => { if (values?.[i] !== undefined) selects[key].value = values[i]; });
                };

                for (const [subLabel, subOptions] of Object.entries(field.options)) {
                    let subWrap = document.createElement('div');
                    subWrap.style.display = 'inline-block';
                    subWrap.style.marginRight = '8px';

                    let select = createSelect(subOptions);
                    let label = document.createElement('label');
                    label.textContent = t(`cB.${subLabel}`);
                    subWrap.appendChild(label);
                    label.htmlFor = select.id;
                    select.onchange = () => component.onchange();
                    subWrap.appendChild(select);
                    selects[subLabel] = select;
                    component.element.appendChild(subWrap);
                };
            } else {
                let select = createSelect(field.options);
                component.element = select;
                component.getValue = () => jpxUtils.parseValue(select.value);
                component.setValue = (value) => { select.value = value; };
                select.onchange = () => component.onchange();
            }

            return component;
        }

        function createSelect(options) {
            let select = document.createElement('select');
            select.id = getUniqueId(field.key)
            options.forEach(opt => {
                let option = document.createElement('option');
                option.value = opt.value;
                option.textContent = t(opt.label);
                select.appendChild(option);
            });

            return select;
        }

        let selectComponent = createSelectComponent(field, dataObj);

        let initValue = dataObj[field.key];
        if (initValue === undefined) {
            if (Array.isArray(field.options)) {
                initValue = field.options[0]?.value;
            } else {
                let defaultVals = Object.values(field.options).map(opts => (opts[0]?.value));
                initValue = field.flatten ? defaultVals.join(field.flatten) : defaultVals;
            }
        }

        if (field.hasModeDropdown) {
            container.dataset.role = field.hasModeDropdown;

            let selectContent = document.createElement('div');
            selectComponent.onchange = () => {
                selectContent.innerHTML = '';
                let currentValue = selectComponent.getValue();
                container.dataset.currentValue = currentValue;
                if (jpxUtils.isEmpty(dataObj[currentValue])) dataObj[currentValue] = {};
                if (!field.skipModeContent) {
                    renderSchema(selectContent, field.itemSchema, dataObj[currentValue]);
                }
                container.dispatchEvent(new CustomEvent('battleModeChange', {
                    bubbles: true,
                    detail: { modeKey: currentValue, data: dataObj[currentValue] }
                }));
            };

            container.appendChild(selectComponent.element);
            container.appendChild(selectContent);

            let modeKey = getBattleMode('OneHanded');
            let importBtn = document.getElementById('import-button');
            let resetBtn = document.getElementById('reset-current-button');
            let finalKey = (importBtn?.dataset.battleMode) || (resetBtn?.dataset.battleMode) || modeKey;

            if (importBtn) delete importBtn.dataset.battleMode;
            if (resetBtn) delete resetBtn.dataset.battleMode;

            if (finalKey) selectComponent.setValue(finalKey);
            selectComponent.onchange();

        } else {
            let wrap = document.createElement('div');
            let label = document.createElement('label');
            label.htmlFor = selectComponent.element.id;
            label.textContent = t(field.label);
            wrap.appendChild(label);

            selectComponent.setValue(initValue);
            dataObj[field.key] = selectComponent.getValue();

            selectComponent.onchange = () => dataObj[field.key] = selectComponent.getValue();

            wrap.appendChild(selectComponent.element);
            container.appendChild(wrap);
        }
    },

    dragState: { fromIndex: null, groupId: null },
    array(container, field, dataObj) {
        if (!Array.isArray(dataObj[field.key])) dataObj[field.key] = [];
        let arrayGroupId = Symbol('array-group');

        if (!field.skipLabel) container.innerHTML = `<div${field.class ? ` class="${field.class}"` : ''} style="font-weight:bold; margin-bottom:4px;">${t(field.label)}</div>`;

        let listDiv = document.createElement('div');
        container.appendChild(listDiv);

        function renderRowButtons(row, index) {
            const isTop = index === 0;
            const isBottom = index === dataObj[field.key].length - 1;

            row.style.opacity = dataObj[field.key][index].disabled === true ? '0.5' : '1';

            let handle = jpxUtils.createButton(row, { text: decodeURIComponent('%E2%89%A1'), className: 'drag-handle' });
            handle.draggable = true;
            handle.addEventListener('dragstart', e => {
                fieldRenderers.dragState.fromIndex = index;
                fieldRenderers.dragState.groupId = arrayGroupId;
                e.dataTransfer.setDragImage(row, 0, 0);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
            });

            handle.addEventListener('dragend', () => {
                fieldRenderers.dragState.fromIndex = null;
                fieldRenderers.dragState.groupId = null;
            });

            row.addEventListener('dragover', e => {
                if (fieldRenderers.dragState.groupId === arrayGroupId) e.preventDefault();
            });
                row.addEventListener('drop', e => {
                    e.preventDefault();
                    if (fieldRenderers.dragState.groupId !== arrayGroupId) return;

                    let from = fieldRenderers.dragState.fromIndex;
                    if (from == null || from === index) return;

                    dataObj[field.key].splice(index, 0, dataObj[field.key].splice(from, 1)[0]);
                    fieldRenderers.dragState.fromIndex = null;
                    fieldRenderers.dragState.groupId = null;
                    renderArray();
                });

                jpxUtils.createButton(row, { text: decodeURIComponent('%E2%86%91%E2%86%91'), disabled: isTop, onClick: () => {
                    dataObj[field.key].unshift(dataObj[field.key].splice(index, 1)[0]);
                    renderArray();
                }});
                jpxUtils.createButton(row, { text: decodeURIComponent('%E2%86%91'), disabled: isTop, onClick: () => {
                    [dataObj[field.key][index - 1], dataObj[field.key][index]] = [dataObj[field.key][index], dataObj[field.key][index - 1]];
                    renderArray();
                }});
                jpxUtils.createButton(row, { text: decodeURIComponent('%E2%86%93'), disabled: isBottom, onClick: () => {
                    [dataObj[field.key][index + 1], dataObj[field.key][index]] = [dataObj[field.key][index], dataObj[field.key][index + 1]];
                    renderArray();
                }});
                jpxUtils.createButton(row, { text: decodeURIComponent('%E2%86%93%E2%86%93'), disabled: isBottom, onClick: () => {
                    dataObj[field.key].push(dataObj[field.key].splice(index, 1)[0]);
                    renderArray();
                }});
                jpxUtils.createButton(row, { text: decodeURIComponent('%E2%A7%89'), onClick: () => {
                    dataObj[field.key].splice(index + 1, 0, JSON.parse(JSON.stringify(dataObj[field.key][index])));
                    renderArray();
                }});
                if (field.canDisable) {
                    jpxUtils.createButton(row, {
                        text: decodeURIComponent('%E2%8A%98'),
                                          onClick: () => {
                                              if (dataObj[field.key][index]?.disabled === true) {
                                                  delete dataObj[field.key][index].disabled;
                                              } else if (dataObj[field.key][index] && typeof dataObj[field.key][index] === 'object') {
                                                  dataObj[field.key][index].disabled = true;
                                              }
                                              renderArray();
                                          }
                    });
                }
                jpxUtils.createButton(row, { text: t('delete'), onClick: () => {
                    dataObj[field.key].splice(index, 1);
                    renderArray();
                }});
        };

        function renderAddButtons(addContainer) {
            const addAction = (targetSchema) => {
                dataObj[field.key].push(targetSchema.type === 'text' ? '' : createEmptyObject(targetSchema));
                renderArray();
            };

            if (field.itemSchema.discriminator) {
                for (const [typeKey, subSchema] of Object.entries(field.itemSchema.oneOf)) {
                    jpxUtils.createButton(addContainer, {
                        text: `${t('add')} ${t(subSchema.properties.find(item => item.type === 'constant')?.label)}`,
                                          onClick: () => addAction(subSchema)
                    });
                };
            } else {
                jpxUtils.createButton(addContainer, { text: t('add'), onClick: () => addAction(field.itemSchema) });
            }
        };

        function renderMultiSelectMode() {
            if (field.hasRange) {
                if (dataObj[field.key].length < 2) dataObj[field.key].unshift(0, 0);
                let rangeBox = document.createElement('div');
                rangeBox.style.cssText = 'display: inline-flex; align-items: baseline;  margin-right: 8px;';
                fieldRenderers.rangeNumber(rangeBox, { ...field, label: field.hasRange, skipLabel: false }, dataObj);
                listDiv.appendChild(rangeBox);
            }

            if (field.popup) {
                let summary = document.createElement('input');
                summary.type = 'text';
                summary.readOnly = true;
                summary.placeholder = t('cB.clickToSelect');
                summary.className = 'multiSelect-summary';
                summary.style.cssText = 'width: 500px;';
                summary.onclick = (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.multiSelect-popup-panel').forEach(p => {
                        let isHidden = panel.style.display === 'none';
                        if (p === panel) panel.style.display = isHidden ? 'block' : 'none';
                        else p.style.display = 'none';
                    });
                };

                let panel = document.createElement('div');
                panel.className = 'multiSelect-popup-panel';
                panel.style.cssText = `
                display: none; position: absolute; z-index: 100; background: #fff; border: 1px solid #aaa; border-radius: 5px;
                padding: 5px 10px; min-width: 200px; max-width: 1000px; max-height: 300px; overflow-y: auto;
                `;
                panel.onclick = (e) => e.stopPropagation();

                listDiv.style.position = 'relative';
                listDiv.append(summary, panel);

                const updateSummary = () => {
                    let values = field.hasRange ? dataObj[field.key].slice(2) : dataObj[field.key];
                    let labels = values.map(v => t(field.multiSelectOptions.find(opt => opt.value === v)?.label || v));
                    summary.value = labels.join(', ');
                };

                renderCheckboxes(panel, updateSummary);
                updateSummary();
            } else {
                renderCheckboxes(listDiv);
            }

            function renderCheckboxes(targetContainer, onUpdate) {
                field.multiSelectOptions.forEach(opt => {
                    let id = getUniqueId(`${field.key}_${opt.value}`);
                    let span = document.createElement('span');
                    span.style.cssText = 'display: inline-flex; align-items: center; margin-right: 8px;';

                    let checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = id;
                    checkbox.checked = dataObj[field.key].includes(opt.value);
                    checkbox.onchange = e => {
                        if (e.target.checked) {
                            if (!dataObj[field.key].includes(opt.value)) dataObj[field.key].push(opt.value);
                        } else {
                            if (field.hasRange) dataObj[field.key] = [...dataObj[field.key].slice(0, 2), ...dataObj[field.key].slice(2).filter(v => v !== opt.value)];
                            else dataObj[field.key] = dataObj[field.key].filter(v => v !== opt.value);
                        }
                        if (onUpdate) onUpdate();
                    };

                        let label = document.createElement('label');
                        label.htmlFor = id;
                        label.textContent = t(opt.label);

                        span.append(checkbox, label)
                        targetContainer.appendChild(span);
                });
            }
        }

        function renderDynamicListMode() {
            dataObj[field.key].forEach((value, index) => {
                let row = document.createElement('div');
                row.className = 'array-row';
                row.dataset.arrayIndex = String(index);

                let itemSchema = field.itemSchema;
                if (itemSchema.discriminator) itemSchema = resolveSchema(itemSchema, value);

                if (itemSchema.type === 'text') {
                    renderField(row, { ...itemSchema, key: index, label: index + 1 }, dataObj[field.key]);
                } else if (itemSchema.type === 'object') {
                    let objDiv = document.createElement('div');
                    objDiv.className = 'object-item';
                    renderSchema(objDiv, itemSchema, value);
                    row.appendChild(objDiv);
                }

                renderRowButtons(row, index);
                listDiv.appendChild(row);
            });

            renderAddButtons(listDiv);
        };

        function renderArray() {
            listDiv.innerHTML = '';
            if (field.multiSelectOptions) renderMultiSelectMode();
            else renderDynamicListMode();
        }

        renderArray();
    },

    fieldPicker(container, field, dataObj) {
        let editFields = field.editFields || [];
        if (!Array.isArray(dataObj[field.key])) dataObj[field.key] = [];

        container.innerHTML = `<div${field.class ? ` class="${field.class}"` : ''} style="margin-top:8px;">${t(field.label)}</div>`;

        let pickerWrap = document.createElement('div');
        pickerWrap.style.cssText = 'display: flex; gap: 12px; align-items: center; padding-left: 10px;';
        container.appendChild(pickerWrap);

        let inputMap = {};
        let leftFields = field.allFields.filter(f => !dataObj[field.key].some(d => d.id === f.id));
        let rightFields = dataObj[field.key].map(d => {
            let base = field.allFields.find(f => f.id === d.id);
            return base ? { ...base, ...d } : null;
        }).filter(Boolean);

        const getSelectedIndexes = (select) => Array.from(select.selectedOptions, opt => +opt.value);
        const getIndexGroups = (indexes) => {
            return indexes.sort((a, b) => a - b).reduce((acc, value, i, array) => {
                if (i > 0 && value === array[i - 1] + 1) acc.at(-1).push(value);
                else acc.push([value]);
                return acc;
            }, []);
        };

        function updateDataObj() {
            dataObj[field.key] = rightFields.map(f => {
                let storageObj = { id: f.id };
                editFields.forEach(editF => {
                    let val = f[editF.key];
                    if (val !== undefined && val !== null && val !== '') {
                        storageObj[editF.key] = val;
                    }
                });
                return storageObj;
            });
        }

        function refresh(selectedItems = []) {
            leftSelect.innerHTML = leftFields.map((f, i) => `<option value="${i}">${t(f.label)}</option>`).join('');
            rightSelect.innerHTML = rightFields.map((f, i) => `<option value="${i}">${t(f.label)}</option>`).join('');
            rightFields.forEach((f, i) => {
                if (selectedItems.includes(f)) rightSelect.options[i].selected = true;
            });
                updateDataObj();
        };

        function transfer(fromArray, toArray, select, isToRight) {
            let indexes = getSelectedIndexes(select).sort((a, b) => b - a);
            if (!indexes.length) return;

            let selectedItems = indexes.map(i => {
                let item = fromArray[i];
                if (isToRight) {
                    editFields.forEach(editF => {
                        item[editF.key] = '';
                    });
                }
                return item;
            }).reverse();

            indexes.forEach(i => fromArray.splice(i, 1));
            toArray.push(...selectedItems);
            if (!isToRight) toArray.sort((a, b) => field.allFields.findIndex(f => f.id === a.id) - field.allFields.findIndex(f => f.id === b.id));
            refresh(selectedItems);
        }

        function reorder(direction) {
            let indexes = getSelectedIndexes(rightSelect);
            if (!indexes.length) return;
            let selectedItems = indexes.map(i => rightFields[i]);

            if (direction === 'top' || direction === 'bottom') {
                let unselected = rightFields.filter((f, i) => !indexes.includes(i));
                rightFields = direction === 'top' ? [...selectedItems, ...unselected] : [...unselected, ...selectedItems];
            } else {
                let groups = getIndexGroups(indexes);
                if (direction === 'up') {
                    groups.forEach(group => {
                        if (group[0] > 0) {
                            let items = rightFields.splice(group[0], group.length);
                            rightFields.splice(group[0] - 1, 0, ...items);
                        }
                    });
                } else if (direction === 'down') {
                    groups.reverse().forEach(group => {
                        if (group.at(-1) < rightFields.length - 1) {
                            let items = rightFields.splice(group[0], group.length);
                            rightFields.splice(group[0] + 1, 0, ...items);
                        }
                    });
                }
            }
            refresh(selectedItems);
        };

        let editBox = document.createElement('div');
        editBox.style.cssText = 'display: flex; flex-direction: column; gap: 8px; min-width: 350px;';
        editFields.forEach(editF => {
            let div = document.createElement('div');
            div.textContent = `${t(editF.label)}: `;

            let input = document.createElement('input');
            input.id = getUniqueId('editField');
            input.type = 'text';
            input.style.width = '100%';
            if (editF.placeholder) input.placeholder = editF.placeholder;
            input.addEventListener('input', () => {
                let indexes = getSelectedIndexes(rightSelect);
                indexes.forEach(i => {
                    rightFields[i][editF.key] = input.value;
                });
                updateDataObj();
            });

            div.appendChild(input);
            editBox.appendChild(div);

            inputMap[editF.key] = input;
        });

        let leftSelect = document.createElement('select');
        let rightSelect = document.createElement('select');
        [leftSelect, rightSelect].forEach(s => {
            s.multiple = true;
            s.size = field.size || 12;
            s.className = 'field-picker-select';
        });
        leftSelect.addEventListener('pointerdown', () => { rightSelect.selectedIndex = -1; });
        rightSelect.addEventListener('pointerdown', () => { leftSelect.selectedIndex = -1; });
        rightSelect.addEventListener('change', () => {
            let indexes = getSelectedIndexes(rightSelect);
            editFields.forEach(editF => {
                inputMap[editF.key].value = (indexes.length > 0) ? (rightFields[indexes[0]][editF.key] || '') : '';
            });
        });

        let btnBoxStyle = 'display: flex; flex-direction: column; gap: 4px;';

        let moveBox = document.createElement('div');
        moveBox.style.cssText = btnBoxStyle;
        jpxUtils.createButton(moveBox, { text: decodeURIComponent('%E2%86%92'), onClick: () => transfer(leftFields, rightFields, leftSelect, true) });
        jpxUtils.createButton(moveBox, { text: decodeURIComponent('%E2%86%90'), onClick: () => transfer(rightFields, leftFields, rightSelect, false) });

        let sortBox = document.createElement('div');
        sortBox.style.cssText = btnBoxStyle;
        jpxUtils.createButton(sortBox, { text: decodeURIComponent('%E2%86%91%E2%86%91'), onClick: () => reorder('top') });
        jpxUtils.createButton(sortBox, { text: decodeURIComponent('%E2%86%91'), onClick: () => reorder('up') });
        jpxUtils.createButton(sortBox, { text: decodeURIComponent('%E2%86%93'), onClick: () => reorder('down') });
        jpxUtils.createButton(sortBox, { text: decodeURIComponent('%E2%86%93%E2%86%93'), onClick: () => reorder('bottom') });

        pickerWrap.append(leftSelect, moveBox, rightSelect, sortBox, editBox);
        refresh();
    },

    object(container, field, dataObj) {
        renderSchema(container, field, dataObj[field.key]);
    },

    keyBasedObjectArray(container, field, dataObj) {
        let targetData = field.flatten ? dataObj : dataObj[field.key];

        container.innerHTML = `<div${field.class ? ` class="${field.class}"` : ''} style="font-weight:bold; margin-bottom:4px;">${t(field.label)}</div>`;

        let listDiv = document.createElement('div');
        container.appendChild(listDiv);

        function renderKeyBinding(key) {
            let row = document.createElement('div');
            row.style.cssText = 'border: 1px solid #444; padding: 10px; margin-bottom: 15px;';

            let header = document.createElement('div');
            header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;';

            let span = document.createElement('span');
            span.append(`${t('cB.binding')}: `);
            jpxUtils.createButton(span, {
                text: jpxUtils.formatKeyCombo(key, ' + '),
                                  onClick: (btn, e) => {
                                      let originalText = btn.textContent;
                                      btn.textContent = '...';
                                      jpxUtils.captureKeyCombo(
                                          (result) => {
                                              let newKey = 'kb_' + result.comboString;
                                              if (newKey === key) return renderAll();
                                              if (targetData[newKey]) {
                                                  jpxUtils.createToast(t('cB.duplicateKeys'));
                                                  return renderAll();
                                              }

                                              let newEntries = Object.entries(targetData).map(([k, v]) => (k === key ? [newKey, v] : [k, v]));
                                              for (const k in targetData) delete targetData[k];
                                              Object.assign(targetData, Object.fromEntries(newEntries));

                                              renderAll();
                                          },
                                          () => { btn.textContent = originalText; }
                                      );
                                  }
            });
            header.appendChild(span);

            jpxUtils.createButton(header, {
                text: t('delete'),
                                  onClick: () => { if(confirm(`${t('delete')} ${jpxUtils.formatKeyCombo(key, ' + ')}?`)) { delete targetData[key]; renderAll(); } }
            });

            row.appendChild(header);

            let arrayContainer = document.createElement('div');
            renderField(arrayContainer, {
                key,
                skipLabel: true,
                type: 'array',
                canDisable: field.canDisable,
                itemSchema: field.itemSchema,
            }, targetData);
            row.appendChild(arrayContainer);

            listDiv.appendChild(row);
        }

        function renderAll() {
            listDiv.innerHTML = '';
            Object.keys(targetData).forEach(k => {
                if (field.flatten && k.startsWith('kb_')) {
                    renderKeyBinding(k);
                } else if (!field.flatten) {
                    renderKeyBinding(k);
                }
            });
        }

        jpxUtils.createButton(container, {
            text: t('cB.addNewKeyBinding'),
                              onClick: (btn, e) => {
                                  let originalText = btn.textContent;
                                  btn.textContent = `... ${t('cB.recording')} ...`;
                                  jpxUtils.captureKeyCombo(
                                      (result) => {
                                          let newKey = 'kb_' + result.comboString;
                                          if (targetData[newKey]) {
                                              jpxUtils.createToast(t('cB.duplicateKeys'));
                                          } else {
                                              targetData[newKey] = [];
                                          }
                                          renderAll();
                                          btn.textContent = originalText;
                                      },
                                      () => { btn.textContent = originalText; }
                                  );
                              }
        });

        renderAll();
    },

    conditionsArray(container, field, dataObj) {
        if (!Array.isArray(dataObj[field.key])) dataObj[field.key] = [];

        let listDiv = document.createElement('div');
        container.appendChild(listDiv);

        function createRow(item, index) {
            let selectId = getUniqueId('condition');

            let row = document.createElement('div');
            row.className = 'dynamic-array-row';
            row.style.marginBottom = '6px';

            let select = document.createElement('select');
            select.id = selectId;
            field.options.forEach(opt => {
                let option = document.createElement('option');
                option.value = opt.key;
                option.textContent = t(opt.label);
                select.appendChild(option);
            });
            select.value = item.key ?? field.options[0]?.key;
            row.appendChild(select);

            let inputDiv = document.createElement('div');
            inputDiv.style.cssText = 'display: inline-flex; align-items: baseline; margin-left: 12px;';
            row.appendChild(inputDiv);

            let extraDiv = document.createElement('div');
            extraDiv.style.cssText = 'display: inline-flex; gap: 8px;';
            row.appendChild(extraDiv);

            function renderInput() {
                inputDiv.innerHTML = '';
                extraDiv.innerHTML = '';

                let selectedOption = field.options.find(option => option.key === select.value);
                if (!selectedOption) return;

                if ((item.key !== undefined && item.key !== select.value) || item.key === undefined) {
                    Object.keys(item).forEach(k => delete item[k]);
                    item.key = selectedOption.key;
                    item.value = getDefaultValue(selectedOption.type, selectedOption.defaultValue);
                }

                if (selectedOption.extraFields) {
                    selectedOption.extraFields.forEach(f => {
                        if (item[f.key] === undefined) item[f.key] = getDefaultValue(f.type, f.defaultValue);
                    });
                }

                if (selectedOption.type === 'array' && selectedOption.hasRange && selectedOption.extraFields) {
                    inputDiv.style.width = '100%';
                } else {
                    inputDiv.style.width = 'auto';
                }

                renderField(inputDiv, {
                    ...selectedOption,
                    key: 'value',
                    skipLabel: true,
                }, item);

                if (selectedOption.extraFields) {
                    extraDiv.style.marginLeft = '12px';
                    selectedOption.extraFields.forEach(f => {
                        let wrap = document.createElement('div');
                        wrap.style.display = 'inline-block';
                        renderField(wrap, f, item);
                        extraDiv.appendChild(wrap);
                    });
                } else {
                    extraDiv.style.marginLeft = '0';
                }
            }

            function getDefaultValue(type, defaultValue) {
                if (defaultValue !== undefined) return JSON.parse(JSON.stringify(defaultValue));

                switch (type) {
                    case 'boolean': return false;
                    case 'text': return '';
                    case 'number': return 0;
                    case 'rangeNumber': return [0, 0];
                    case 'array': return [];
                    case 'dropdown': return '';
                    default: return null;
                }
            }

            select.onchange = () => { renderInput(); };

            let deleteButton = jpxUtils.createButton(row, {
                text: 'x',
                onClick: () => {
                    dataObj[field.key].splice(index, 1);
                    renderList();
                }
            });
            deleteButton.style.marginLeft = '12px';

            renderInput();
            return row;
        }

        function renderList() {
            listDiv.innerHTML = '';
            dataObj[field.key].forEach((item, index) => {
                listDiv.appendChild(createRow(item, index));
            });
        }

        jpxUtils.createButton(container, {
            text: `${t('add')} ${t(field.key)}`,
                              onClick: () => {
                                  let newItem = {};
                                  dataObj[field.key].push(newItem);
                                  let index = dataObj[field.key].length - 1;
                                  listDiv.appendChild(createRow(newItem, index));
                              }
        });

        renderList();
    }
};

function renderField(container, field, dataObj) {
    const renderer = fieldRenderers[field.type];
    if (renderer) renderer(container, field, dataObj);
}

function resolveSchema(schema, dataObj) {
    if (!schema.discriminator) return schema;
    const typeValue = dataObj[schema.discriminator];
    return schema.oneOf[typeValue];
}

function createEmptyObject(schema) {
    const obj = {};
    schema.properties.forEach(property => {
        if (property.type === 'constant') {
            obj[property.key] = property.value;
            return;
        }

        if (property.default !== undefined) {
            obj[property.key] = property.default;
            return;
        }

        const defaults = {
            text: '',
            number: 0,
            rangeNumber: [0,0],
            boolean: false,
            array: [],
            fieldPicker: [],
            object: () => createEmptyObject(property),
                              keyBasedObjectArray: {},
        };

        obj[property.key] = typeof defaults[property.type] === 'function' ? defaults[property.type]() : defaults[property.type] ?? undefined;
    });

    return obj;
}

function getUniqueId(prefix = 'input') {
    return `${prefix}_${idCounter++}`;
}

function mergeCfg(storedCfg, defaultCfg, mergedCfg, mergedType) {
    let vKey = mergedType === 'battle' ? 'battleVersion'
    : mergedType === 'stats'  ? 'statsVersion'
    : 'misspinkVersion';
    //patch 20260109
    if (mergedType === 'battle' && storedCfg) {
        if (storedCfg.version && !storedCfg.battleVersion) {
            storedCfg.battleVersion = storedCfg.version;
            delete storedCfg.version;
        }
    }
    //-
    if (!storedCfg?.[vKey] || storedCfg[vKey] < defaultCfg[vKey]) storedCfg = {};

    if (mergedType === 'battle') {
        for (const key of BATTLE_MODES) {
            let localObj = storedCfg[key];
            //patch 20260208
            key === '1H_Mage_General' && (localObj ??= storedCfg.Battlecaster_General);
            //-
            if (localObj && Array.isArray(localObj.supports) && Array.isArray(localObj.attacks)) {
                mergedCfg[key] = localObj;
            } else {
                if (jpxUtils.isEmpty(defaultCfg[key])) continue;
                mergedCfg[key] = JSON.parse(JSON.stringify(defaultCfg[key]));
            }

            mergedCfg[key].supports.forEach(support => {
                //patch 20260309
                if (support.type === 'spellInstant' || support.type === 'spellDuration') {
                    support.type = 'spellSupport';
                } else if (support.type === 'itemInstant' || support.type === 'itemDuration') {
                    support.type = 'item';
                }
                //-
            });
            mergedCfg[key].attacks.forEach(attack => {
                //patch 20260103
                if (attack.type === 'target' && 'bottomUp' in attack) {
                    attack.priorityRule = attack.bottomUp ? 'Bottom Up' : 'Top Down';
                    delete attack.bottomUp;
                }
                //-
                //patch 20260507
                if (attack.type === 'smartDebuff') {
                    attack.targetCount = jpxUtils.parseValue(attack.targetCount);
                }
                //-
            });
        }

        for (const key in defaultCfg) {
            if (BATTLE_MODES.includes(key)) continue;
            mergedCfg[key] = (key in storedCfg) ? storedCfg[key] : defaultCfg[key];
        }
    } else if (mergedType === 'stats' || mergedType === 'misspink') {
        for (const key in defaultCfg) {
            mergedCfg[key] = (key in storedCfg) ? storedCfg[key] : defaultCfg[key];
        }
    }
}
function showWorldSyncDialog(targetWorldName) {
    return new Promise((resolve) => {
        let overlay = document.createElement('div');
        overlay.id = 'jpx-world-sync-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.55); z-index: 10000; display: flex; align-items: center; justify-content: center;';

        let dialog = document.createElement('div');
        dialog.style.cssText = 'background: #fff; border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); width: 900px; max-width: 95vw; max-height: 80vh; display: flex; flex-direction: column; font-size: 10pt; color: #333; overflow: hidden;';

        // ===== 头部 =====
        let header = document.createElement('div');
        header.style.cssText = 'padding: 12px 18px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 12pt;';
        header.textContent = `↔️ 同步到${targetWorldName}（选择要同步的项目）`;
        dialog.appendChild(header);

        // ===== 主体 =====
        let body = document.createElement('div');
        body.style.cssText = 'display: flex; flex: 1 1 auto; min-height: 0;';

        let leftContainer = document.createElement('div');
        leftContainer.style.cssText = 'flex: 0 0 200px; border-right: 1px solid #ddd; display: flex; flex-direction: column; min-height: 0;';

        let leftPane = document.createElement('div');
        leftPane.style.cssText = 'flex: 1 1 auto; overflow-y: auto; padding: 8px 0;';
        leftContainer.appendChild(leftPane);

        let leftFooter = document.createElement('div');
        leftFooter.style.cssText = 'flex: 0 0 auto; padding: 6px 10px; border-top: 1px dashed #ccc; display: flex; gap: 4px;';
        leftContainer.appendChild(leftFooter);

        let rightPane = document.createElement('div');
        rightPane.style.cssText = 'flex: 1 1 auto; overflow-y: auto; padding: 12px 16px;';

        body.append(leftContainer, rightPane);
        dialog.appendChild(body);

        // ===== 底部 =====
        let footer = document.createElement('div');
        footer.style.cssText = 'padding: 10px 18px; border-top: 1px solid #ddd; display: flex; justify-content: flex-end; gap: 8px;';
        dialog.appendChild(footer);

        // ===== 状态 =====
        const state = {
            activeCategory: 'battle',
            battle: {
                enabled: true,
                basic: true,
                keybinds: true,
                quickbar: true,
                modes: {},
            },
            stats: {
                enabled: true,
                basic: true,
                combatRows: true,
                revenueRows: true,
                statsColumns: true,
            },
            misspink: {
                enabled: true,
                sound: true,
                appearance: true,
            },
        };
        BATTLE_MODES.forEach(k => state.battle.modes[k] = true);

        const CATEGORIES = [
            { key: 'battle', label: '⚔️ 战斗' },
            { key: 'stats', label: '📊 统计' },
            { key: 'misspink', label: '♾️ NEXT专属设置' },
        ];

        // ===== 左栏 =====
        const renderLeft = () => {
            leftPane.innerHTML = '';
            CATEGORIES.forEach(cat => {
                let row = document.createElement('div');
                let isActive = state.activeCategory === cat.key;
                row.style.cssText = `display: flex; align-items: center; gap: 6px; padding: 8px 14px; cursor: pointer; user-select: none; ${isActive ? 'background: #e3f2fd; font-weight: bold; color: #1976d2; border-left: 3px solid #1976d2; padding-left: 11px;' : 'border-left: 3px solid transparent;'}`;

                let cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = state[cat.key].enabled;
                cb.onchange = () => { state[cat.key].enabled = cb.checked; };
                cb.onclick = (e) => e.stopPropagation();

                let lbl = document.createElement('span');
                lbl.textContent = cat.label;

                row.append(cb, lbl);
                row.addEventListener('click', (e) => {
                    if (e.target === cb) return;
                    state.activeCategory = cat.key;
                    renderLeft();
                    renderRight();
                });

                leftPane.appendChild(row);
            });
        };

        // ===== 右栏 =====
        const renderCheckboxRow = (label, checked, onChange) => {
            let row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 3px 0;';
            let cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = checked;
            cb.onchange = () => onChange(cb.checked);
            let lbl = document.createElement('label');
            lbl.textContent = label;
            lbl.style.cssText = 'cursor: pointer; user-select: none;';
            lbl.onclick = () => { cb.checked = !cb.checked; onChange(cb.checked); };
            row.append(cb, lbl);
            return row;
        };

        const renderGroupHeader = (text) => {
            let h = document.createElement('div');
            h.textContent = text;
            h.style.cssText = 'font-weight: bold; margin: 12px 0 6px; color: #444; border-bottom: 1px solid #eee; padding-bottom: 4px;';
            return h;
        };

        const renderRight = () => {
            rightPane.innerHTML = '';

            if (state.activeCategory === 'battle') {
                rightPane.appendChild(renderGroupHeader('⚔️ 战斗'));
                rightPane.appendChild(renderCheckboxRow('🔧 基本', state.battle.basic, v => state.battle.basic = v));
                rightPane.appendChild(renderCheckboxRow('⌨️ 按键绑定（全局快捷键）', state.battle.keybinds, v => state.battle.keybinds = v));
                rightPane.appendChild(renderCheckboxRow('📌 快捷栏', state.battle.quickbar, v => state.battle.quickbar = v));

                rightPane.appendChild(renderGroupHeader('🎮 战斗模式（各模式含补给、攻击、专属按键绑定）'));

                let grid = document.createElement('div');
                grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0 12px;';

                BATTLE_STYLES.forEach(style => {
                    let styleHeader = document.createElement('div');
                    styleHeader.textContent = t('cB.' + style);
                    styleHeader.style.cssText = 'grid-column: 1 / -1; font-weight: bold; margin: 8px 0 4px; font-size: 9pt; color: #666;';
                    grid.appendChild(styleHeader);

                    ['General', ...BATTLE_TYPES].forEach(type => {
                        let modeKey = `${style}_${type}`;
                        let label = t('cB.' + type);
                        let row = renderCheckboxRow(label, state.battle.modes[modeKey], v => state.battle.modes[modeKey] = v);
                        row.style.padding = '2px 0';
                        grid.appendChild(row);
                    });
                });

                rightPane.appendChild(grid);

            } else if (state.activeCategory === 'stats') {
                rightPane.appendChild(renderGroupHeader('📊 统计'));
                rightPane.appendChild(renderCheckboxRow('🔧 基本（深色模式等）', state.stats.basic, v => state.stats.basic = v));
                rightPane.appendChild(renderCheckboxRow('⚔️ 战斗列', state.stats.combatRows, v => state.stats.combatRows = v));
                rightPane.appendChild(renderCheckboxRow('💰 营收列', state.stats.revenueRows, v => state.stats.revenueRows = v));
                rightPane.appendChild(renderCheckboxRow('📈 统计栏目', state.stats.statsColumns, v => state.stats.statsColumns = v));

            } else if (state.activeCategory === 'misspink') {
                rightPane.appendChild(renderGroupHeader('♾️ NEXT专属设置'));
                rightPane.appendChild(renderCheckboxRow('📢 语音提醒', state.misspink.sound, v => state.misspink.sound = v));
                rightPane.appendChild(renderCheckboxRow('🎨 外观', state.misspink.appearance, v => state.misspink.appearance = v));
            }
        };

        // ===== 全选 / 全不选 =====
        let selectAllBtn = document.createElement('button');
        selectAllBtn.textContent = '全选';
        selectAllBtn.style.cssText = 'padding: 2px 8px; cursor: pointer; font-size: 9pt; flex: 1;';
        selectAllBtn.onclick = () => {
            CATEGORIES.forEach(cat => { state[cat.key].enabled = true; });
            BATTLE_MODES.forEach(k => state.battle.modes[k] = true);
            state.battle.basic = state.battle.keybinds = state.battle.quickbar = true;
            state.stats.basic = state.stats.combatRows = state.stats.revenueRows = state.stats.statsColumns = true;
            state.misspink.sound = state.misspink.appearance = true;
            renderLeft();
            renderRight();
        };
        let deselectAllBtn = document.createElement('button');
        deselectAllBtn.textContent = '全不选';
        deselectAllBtn.style.cssText = 'padding: 2px 8px; cursor: pointer; font-size: 9pt; flex: 1;';
        deselectAllBtn.onclick = () => {
            CATEGORIES.forEach(cat => { state[cat.key].enabled = false; });
            BATTLE_MODES.forEach(k => state.battle.modes[k] = false);
            state.battle.basic = state.battle.keybinds = state.battle.quickbar = false;
            state.stats.basic = state.stats.combatRows = state.stats.revenueRows = state.stats.statsColumns = false;
            state.misspink.sound = state.misspink.appearance = false;
            renderLeft();
            renderRight();
        };
        leftFooter.append(selectAllBtn, deselectAllBtn);

        // ===== 底部按钮 =====
        let cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = 'padding: 6px 20px; cursor: pointer;';

        let confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确认同步';
        confirmBtn.style.cssText = 'padding: 6px 20px; background: #d32f2f; color: #fff; border: none; cursor: pointer; border-radius: 3px;';

        footer.append(cancelBtn, confirmBtn);

        // ===== 关闭逻辑 =====
        let onKey = null;
        const cleanup = () => {
            if (onKey) document.removeEventListener('keydown', onKey, true);
        };
            const closeAndResolve = (val) => {
                cleanup();
                overlay.remove();
                resolve(val);
            };

            cancelBtn.onclick = () => closeAndResolve(null);
            confirmBtn.onclick = () => closeAndResolve(state);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeAndResolve(null);
            });
                onKey = (e) => {
                    if (e.key === 'Escape') closeAndResolve(null);
                };
                    document.addEventListener('keydown', onKey, true);

                    overlay.appendChild(dialog);
                    document.body.appendChild(overlay);

                    renderLeft();
                    renderRight();
    });
}

function syncSelectedToOtherWorld(selection) {
    let targetSuffix = isekaiSuffix ? '' : '_isekai';
    let syncedItems = [];

    // ===== 战斗 =====
    if (selection.battle && selection.battle.enabled) {
        let sel = selection.battle;
        let hasAny = sel.basic || sel.keybinds || sel.quickbar || Object.values(sel.modes || {}).some(Boolean);
        if (hasAny) {
            let targetCfgBattle = {};
            try {
                targetCfgBattle = JSON.parse(localStorage.getItem(prefix + 'cfgBattle' + targetSuffix) || '{}');
            } catch (e) {}
            mergeCfg(targetCfgBattle, defaultCfgBattle, targetCfgBattle, 'battle');

            const BASIC_FIELDS = [
                'advanceToNextRound', 'ajaxRound', 'showRealTimeProficiency', 'showMonsterIndex',
                'showMonsterInfo', 'showMonsterHP', 'recordBattleLog', 'dailyStaminaQuotaPlus',
                'ctrlWidgetStyleText', 'ctrlWidgetMouseEnter', 'ctrlWidgetRows',
            ];
            if (sel.basic) {
                BASIC_FIELDS.forEach(k => { targetCfgBattle[k] = JSON.parse(JSON.stringify(cfgBattle[k])); });
            }
            const QUICKBAR_FIELDS = ['showCooldowns', 'quickbarExtend', 'showDurations'];
            if (sel.quickbar) {
                QUICKBAR_FIELDS.forEach(k => { targetCfgBattle[k] = JSON.parse(JSON.stringify(cfgBattle[k])); });
            }
            if (sel.modes) {
                for (const modeKey of BATTLE_MODES) {
                    if (!sel.modes[modeKey]) continue;
                    targetCfgBattle[modeKey] = JSON.parse(JSON.stringify(cfgBattle[modeKey] || {}));
                }
            }
            localStorage.setItem(prefix + 'cfgBattle' + targetSuffix, JSON.stringify(targetCfgBattle));

            if (sel.keybinds) {
                localStorage.setItem(prefix + 'userKeybinds' + targetSuffix, JSON.stringify(userKeybinds));
            }
            syncedItems.push('战斗');
        }
    }

    // ===== 统计 =====
    if (selection.stats && selection.stats.enabled) {
        let sel = selection.stats;
        let hasAny = sel.basic || sel.combatRows || sel.revenueRows || sel.statsColumns;
        if (hasAny) {
            let targetCfgStats = {};
            try {
                targetCfgStats = JSON.parse(localStorage.getItem(prefix + 'cfgStats') || '{}');
            } catch (e) {}
            mergeCfg(targetCfgStats, defaultCfgStats, targetCfgStats, 'stats');

            if (sel.basic) targetCfgStats.darkMode = cfgStats.darkMode;
            if (sel.combatRows) targetCfgStats.combatRows = JSON.parse(JSON.stringify(cfgStats.combatRows));
            if (sel.revenueRows) targetCfgStats.revenueRows = JSON.parse(JSON.stringify(cfgStats.revenueRows));
            if (sel.statsColumns) targetCfgStats.statsColumns = JSON.parse(JSON.stringify(cfgStats.statsColumns));
            localStorage.setItem(prefix + 'cfgStats', JSON.stringify(targetCfgStats));
            syncedItems.push('统计');
        }
    }

    // ===== NEXT =====
    if (selection.misspink && selection.misspink.enabled) {
        let sel = selection.misspink;
        let hasAny = sel.sound || sel.appearance;
        if (hasAny) {
            ensureCfgMissPink();
            let targetCfg = {};
            try {
                targetCfg = JSON.parse(localStorage.getItem(prefix + 'cfgMissPink' + targetSuffix) || '{}');
            } catch (e) {}
            mergeCfg(targetCfg, defaultCfgMissPink, targetCfg, 'misspink');
            jpxUtils.deepFillMissing(targetCfg, defaultCfgMissPink);

            if (sel.sound) targetCfg.soundReminder = JSON.parse(JSON.stringify(cfgMissPink.soundReminder));
            if (sel.appearance) targetCfg.appearance = JSON.parse(JSON.stringify(cfgMissPink.appearance));
            localStorage.setItem(prefix + 'cfgMissPink' + targetSuffix, JSON.stringify(targetCfg));
            syncedItems.push('NEXT专属设置');
        }
    }

    return syncedItems;
}

function renderSettings() {
    let container = document.getElementById('settings-container');
    if (container) {
        container.remove();
        return;
    }

    container = document.createElement('div');
    container.id = 'settings-container';
    container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 10000; background: #fff; display: flex; flex-direction: column; text-align: left; font-size: 10pt; box-sizing: border-box;';

    // ===== 标题栏 =====
    let titleBar = document.createElement('div');
    titleBar.id = 'settings-title-bar';
    titleBar.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 4px 16px; background: #333; color: #fff; flex: 0 0 auto; font-weight: bold;';

    let titleLeftGroup = document.createElement('div');
    titleLeftGroup.style.cssText = 'display: flex; align-items: center; gap: 16px; min-width: 0;';

    let titleText = document.createElement('div');
    titleText.innerHTML = `
    <span style="display:inline;cursor:pointer;font-size:inherit;font-weight:inherit;margin:0;"
    data-arr='["For Miss Pink","JPX UI Remake","JPX NEXT"]'
    data-idx="0"
    onclick="const d=this.dataset,a=JSON.parse(d.arr);d.idx=(+d.idx+1)%a.length;this.textContent=a[d.idx]">
    JPX NEXT
    </span>
    `;
    titleLeftGroup.appendChild(titleText);

    // ===== 内联大Tab（Ribbon风格，位于标题右侧）=====
    let inlineTabsContainer = document.createElement('div');
    inlineTabsContainer.className = 'settings-tab-header-inline';
    titleLeftGroup.appendChild(inlineTabsContainer);

    titleBar.appendChild(titleLeftGroup);

    // ===== 战斗模式设定（仅战斗标签页显示）=====
    let battleModeTitleContainer = document.createElement('div');
    battleModeTitleContainer.id = 'battle-mode-title-bar';
    battleModeTitleContainer.style.cssText = 'display: none; margin: 0 16px; flex: 0 1 auto; align-items: center; gap: 8px; color: #fff; font-weight: normal;';
    titleBar.appendChild(battleModeTitleContainer);

    // 保证 cfgBattle 已初始化
    if (jpxUtils.isEmpty(cfgBattle)) {
        let storedCfgBattle = {};
        try {
            storedCfgBattle = JSON.parse(localStorage.getItem(prefix + 'cfgBattle' + isekaiSuffix) || '{}');
        } catch (err) {}
        mergeCfg(storedCfgBattle, defaultCfgBattle, cfgBattle, 'battle');
    }

    (function renderBattleModeSelector() {
        let modesField = cfgBattleSchema.properties.find(p => p.key === 'modes');
        if (!modesField) return;

        let modeLabel = document.createElement('span');
        modeLabel.textContent = t('cB.battleModeSettings') + ': ';
        modeLabel.style.cssText = 'margin-right: 8px;';
        battleModeTitleContainer.appendChild(modeLabel);

        let modesFieldCopy = { ...modesField, skipModeContent: true };
        renderField(battleModeTitleContainer, modesFieldCopy, cfgBattle);
    })();

    let titleButtons = document.createElement('div');
    titleButtons.style.cssText = 'display: flex; gap: 8px;';

    // ===== 可滚动内容区 =====
    let content = document.createElement('div');
    content.id = 'settings-content';
    content.style.cssText = 'flex: 1 1 auto; overflow: auto; padding: 8px;';

    let tabs = [
        {
            id: 'battle',
            text: t('⚔️战斗'),
                                  saveBtnText: t('cB.saveBattleConfig'),
                                  exportBtnText: t('cB.exportBattleConfig'),
                                  importBtnText: t('cB.importBattleConfig'),
                                  render: renderBattleTab,
                                  onSave() {
                                      let modeKey = document.querySelector('[data-role="battleMode"]')?.dataset.currentValue;
                                      for (const key of BATTLE_MODES) {
                                          if (
                                              key !== modeKey && !key.includes('_General') && cfgBattle[key] && jpxUtils.isEmpty(defaultCfgBattle[key]) &&
                                              Array.isArray(cfgBattle[key].supports) && cfgBattle[key].supports.length === 0 &&
                                              Array.isArray(cfgBattle[key].attacks) && cfgBattle[key].attacks.length === 0 &&
                                              !Object.keys(cfgBattle[key]).some(k => k.startsWith('kb_'))
                                          ) {
                                              delete cfgBattle[key];
                                              jpxUtils.createToast(`Removed empty ruleset: ${key}`, 5000);
                                          }
                                      }
                                      console.log(cfgBattle);
                                      localStorage.setItem(prefix + 'cfgBattle' + isekaiSuffix, JSON.stringify(cfgBattle));
                                      localStorage.setItem(prefix + 'userKeybinds' + isekaiSuffix, JSON.stringify(userKeybinds));
                                  },
                                  onExport() {
                                      return { data: cfgBattle, fileName: `cfgBattle${!isekaiSuffix ? '_Persistent' : '_Isekai'}.txt`, depth: 3 };
                                  },
                                  onImport(content) {
                                      let data = JSON.parse(content);
                                      if (BATTLE_MODES.some(key => data[key]?.attacks?.some(attack => attack.type === 'kamisamaniNattaHi')) && !confirm(t('cB.importCustomCodeWarning'))) {
                                          throw new Error('Custom code import rejected');
                                      }
                                      mergeCfg(data, cfgBattle, cfgBattle, 'battle');
                                      document.dispatchEvent(new CustomEvent('battleConfigImported'));
                                      return null;
                                  },
        },
        {
            id: 'stats',
            text: t('📊统计'),
                                  saveBtnText: t('cS.saveStatsConfig'),
                                  exportBtnText: t('cS.exportStatsConfig'),
                                  importBtnText: t('cS.importStatsConfig'),
                                  render: renderStatsTab,
                                  onSave() {
                                      console.log(cfgStats);
                                      localStorage.setItem(prefix + 'cfgStats', JSON.stringify(cfgStats));
                                  },
                                  onExport() {
                                      return { data: cfgStats, fileName: 'cfgStats.txt', depth: 2 };
                                  },
                                  onImport(content) {
                                      let data = JSON.parse(content);
                                      mergeCfg(data, cfgStats, cfgStats, 'stats');
                                      return { uiId: 'cfgStats-ui', schema: cfgStatsSchema, cfg: cfgStats };
                                  },
        },
        {
            id: 'misspink',
            text: '♾️NEXT专属',
            saveBtnText: '💾储存 NEXT 专属设定',
            exportBtnText: '📤导出 NEXT 专属设定',
            importBtnText: '📥导入 NEXT 专属设定',
            render: renderMissPinkTab,
            onSave() {
                console.log(cfgMissPink);
                localStorage.setItem(prefix + 'cfgMissPink' + isekaiSuffix, JSON.stringify(cfgMissPink));
            },
            onExport() {
                return {
                    data: cfgMissPink,
                    fileName: `cfgMissPink${!isekaiSuffix ? '_Persistent' : '_Isekai'}.txt`,
                    depth: 3,
                };
            },
            onImport(content) {
                let data = JSON.parse(content);
                mergeCfg(data, defaultCfgMissPink, cfgMissPink, 'misspink');
                // 通知已渲染的子页刷新
                document.dispatchEvent(new CustomEvent('misspinkConfigImported'));
                return null; // 走 import-button 的 null 分支，不重建 schema
            },
        },
    ];

    // ===== 标题栏按钮：保存 / 向上折叠 / 关闭 =====
    jpxUtils.createButton(titleButtons, {
        id: 'title-save-button',
        cssText: 'padding: 4px 14px; cursor: pointer;',
        text: '💾保存',
        onClick: () => {
            let activeTab = tabs.find(t => t.panel.style.display === 'block');
            if (!activeTab || !activeTab.onSave) return t('cGen.error!');
            activeTab.onSave();
            return t('cGen.saved!');
        }
    });

    let collapsed = false;
    jpxUtils.createButton(titleButtons, {
        id: 'title-collapse-button',
        cssText: 'padding: 4px 10px; cursor: pointer;',
        text: '🔼',
        onClick: (btn) => {
            collapsed = !collapsed;
            content.style.display = collapsed ? 'none' : 'block';
            container.style.height = collapsed ? 'auto' : '100vh';
            btn.textContent = collapsed ? '🔽' : '🔼';
            btn.title = collapsed ? '向下展开' : '向上折叠';
        }
    });

    jpxUtils.createButton(titleButtons, {
        id: 'title-close-button',
        cssText: 'padding: 4px 14px; cursor: pointer;',
        text: '❌关闭',
        onClick: () => container.remove()
    });

    titleBar.appendChild(titleButtons);
    container.appendChild(titleBar);
    container.appendChild(content);

    // ===== 生成 Tab 面板 =====
    tabs.forEach(tab => {
        tab.btn = jpxUtils.createButton(inlineTabsContainer, {
            className: 'settings-tab-btn-inline',
            text: tab.text,
            onClick: () => switchTab(tab.id, tabs),
        });

        tab.panel = document.createElement('div');
        tab.panel.id = `panel_${tab.id}`;
        tab.panel.style.display = 'none';

        tab.render(tab.panel);
        content.appendChild(tab.panel);
    });

    // ===== 底部按钮区（保持原有逻辑：导出 / 导入 / 关闭） =====
    let buttonsUI = document.createElement('div');
    buttonsUI.style.cssText = 'margin-top: 20px;';

    jpxUtils.createButton(buttonsUI, {
        id: 'save-button',
        onClick: () => {
            let activeTab = tabs.find(t => t.panel.style.display === 'block');
            if (!activeTab || !activeTab.onSave) return t('cGen.error!');
            activeTab.onSave();
            return t('cGen.saved!');
        }
    });

    jpxUtils.createButton(buttonsUI, {
        id: 'export-button',
        onClick: () => {
            let activeTab = tabs.find(t => t.panel.style.display === 'block');
            if (!activeTab || !activeTab.onExport) return t('cGen.exportFailed!');

            let info = activeTab.onExport();
            let blob = new Blob([jpxUtils.stringifyLimited(info.data, info.depth)], { type: 'text/plain;charset=utf-8' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = info.fileName;
            a.click();
            URL.revokeObjectURL(url);

            return t('cGen.exported!');
        }
    });

    jpxUtils.createButton(buttonsUI, {
        id: 'import-button',
        onClick: (btn) => {
            let activeTab = tabs.find(t => t.panel.style.display === 'block');
            if (!activeTab || !activeTab.onImport) return t('cGen.importFailed!');
            let input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt,.json';

            return new Promise((resolve, reject) => {
                input.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return resolve();
                    try {
                        const content = await file.text();
                        let info = activeTab.onImport(content);

                        if (info === null) {
                            resolve(t('cGen.imported!'));
                            return;
                        }

                        if (info.transModeKey) {
                            let modeKey = document.querySelector('[data-role="battleMode"]')?.dataset.currentValue;
                            if (modeKey) btn.dataset.battleMode = modeKey;
                        }

                        let oldUI = document.getElementById(info.uiId);
                        let newUI = document.createElement('div');
                        newUI.id = info.uiId;
                        if (oldUI) oldUI.replaceWith(newUI);
                        renderSchema(newUI, info.schema, info.cfg);

                        resolve(t('cGen.imported!'));
                    } catch (err) {
                        console.error(err);
                        reject(t('cGen.importFailed!'));
                    }
                });
                input.click();
            });
        }
    });
    jpxUtils.createButton(buttonsUI, {
        id: 'world-sync-button',
        text: isekaiSuffix ? '↔️ 同步到主世界' : '↔️ 同步到异世界',
        onClick: async () => {
            let targetWorldName = isekaiSuffix ? '主世界' : '异世界';
            let selection = await showWorldSyncDialog(targetWorldName);
            if (!selection) return;

            try {
                let syncedItems = syncSelectedToOtherWorld(selection);
                if (!syncedItems.length) return '⚠️未选择任何项目';
                return `✅已同步 ${syncedItems.join('、')} 到${targetWorldName}`;
            } catch (e) {
                console.error('同步失败:', e);
                return '❌同步失败';
            }
        }
    });

    jpxUtils.createButton(buttonsUI, {
        id: 'close-button',
        text: t('cGen.closeSettings'),
                          onClick: () => container.remove()
    });

    content.appendChild(buttonsUI);
    document.body.appendChild(container);

    switchTab('battle', tabs);
}

function switchTab(targetId, tabs) {
    tabs.forEach(tab => {
        let isActive = (tab.id === targetId);
        tab.btn.classList.toggle('active', isActive);
        if (tab.id === 'battle') {
            tab.panel.style.display = isActive ? 'flex' : 'none';
            tab.panel.style.flexDirection = 'column';
            tab.panel.style.height = '100%';
            tab.panel.style.minHeight = '0';
        } else {
            tab.panel.style.display = isActive ? 'block' : 'none';
        }

        if (isActive) {
            let saveBtn = document.getElementById('save-button');
            let exportBtn = document.getElementById('export-button');
            let importBtn = document.getElementById('import-button');
            if (saveBtn) saveBtn.textContent = tab.saveBtnText || 'Save Settings';
            if (exportBtn) exportBtn.textContent = tab.exportBtnText || 'Export Settings';
            if (importBtn) importBtn.textContent = tab.importBtnText || 'Import Settings';
        }
    });

    let bmTitle = document.getElementById('battle-mode-title-bar');
    if (bmTitle) bmTitle.style.display = targetId === 'battle' ? 'flex' : 'none';
}

function renderBattleTab(parent) {
    // ===== 载入 cfgBattle =====
    let storedCfgBattle = {};
    try {
        storedCfgBattle = JSON.parse(localStorage.getItem(prefix + 'cfgBattle' + isekaiSuffix) || '{}');
    } catch (err) {
        console.warn('Failed to load cfgBattle. Using default cfgBattle.');
        storedCfgBattle = {};
    }
    mergeCfg(storedCfgBattle, defaultCfgBattle, cfgBattle, 'battle');

    // ===== 工具函数 =====
    let fieldByKey = {};
    cfgBattleSchema.properties.forEach(p => fieldByKey[p.key] = p);

    function getCurrentModeKey() {
        let m = document.querySelector('[data-role="battleMode"]');
        return m?.dataset.currentValue || getBattleMode('OneHanded');
    }

    function getModeData() {
        let key = getCurrentModeKey();
        if (jpxUtils.isEmpty(cfgBattle[key])) cfgBattle[key] = {};
        return cfgBattle[key];
    }

    function renderTopField(container, key) {
        if (!fieldByKey[key]) return;
        let wrap = document.createElement('div');
        wrap.className = 'field-block';
        renderField(wrap, fieldByKey[key], cfgBattle);
        container.appendChild(wrap);
    }

    function renderModeField(container, key) {
        let modesField = fieldByKey['modes'];
        if (!modesField) return;
        let fld = modesField.itemSchema.properties.find(p => p.key === key);
        if (!fld) return;
        let wrap = document.createElement('div');
        renderField(wrap, fld, getModeData());
        container.appendChild(wrap);
    }

    // ===== 子标签页 =====
    let subTabs = [
        { id: 'basic', text: '⚙️基本与按键绑定' },
        { id: 'quickbar', text: '🎛️快捷栏' },
        { id: 'supports', text: t('cB.supports') },
                                  { id: 'attacks', text: t('cB.attacks') },
                                  { id: 'manage', text: '💾配置文件管理' },
    ];

    let subTabHeader = document.createElement('div');
    subTabHeader.className = 'settings-subtab-header';
    parent.appendChild(subTabHeader);

    let panels = {};
    subTabs.forEach(tab => {
        tab.btn = jpxUtils.createButton(subTabHeader, {
            className: 'settings-subtab-btn',
            text: tab.text,
            onClick: () => switchSubTab(tab.id),
        });
        let panel = document.createElement('div');
        panel.id = `battle-subpanel-${tab.id}`;
        panel.style.display = 'none';
        panel.style.flex = '1 1 auto';
        panel.style.minHeight = '0';
        panel.style.flexDirection = 'column';
        panel.style.overflow = 'auto';
        parent.appendChild(panel);
        tab.panel = panel;
        panels[tab.id] = panel;
    });

    function switchSubTab(id) {
        subTabs.forEach(tab => {
            let isActive = tab.id === id;
            let panel = tab.panel || panels[tab.id];
            if (panel) panel.style.display = isActive ? 'flex' : 'none';
            tab.btn.classList.toggle('active', isActive);
        });
    }

    // ===== 保存 / 导出 / 导入辅助 =====
    function saveBattleCfg() {
        let modeKey = document.querySelector('[data-role="battleMode"]')?.dataset.currentValue;
        for (const key of BATTLE_MODES) {
            if (
                key !== modeKey && !key.includes('_General') && cfgBattle[key] && jpxUtils.isEmpty(defaultCfgBattle[key]) &&
                Array.isArray(cfgBattle[key].supports) && cfgBattle[key].supports.length === 0 &&
                Array.isArray(cfgBattle[key].attacks) && cfgBattle[key].attacks.length === 0 &&
                !Object.keys(cfgBattle[key]).some(k => k.startsWith('kb_'))
            ) {
                delete cfgBattle[key];
                jpxUtils.createToast(`Removed empty ruleset: ${key}`, 5000);
            }
        }
        console.log(cfgBattle);
        localStorage.setItem(prefix + 'cfgBattle' + isekaiSuffix, JSON.stringify(cfgBattle));
        localStorage.setItem(prefix + 'userKeybinds' + isekaiSuffix, JSON.stringify(userKeybinds));
    }

    function exportBattleCfg() {
        let blob = new Blob([jpxUtils.stringifyLimited(cfgBattle, 3)], { type: 'text/plain;charset=utf-8' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = `cfgBattle${!isekaiSuffix ? '_Persistent' : '_Isekai'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function importBattleCfgFromFile() {
        return new Promise((resolve, reject) => {
            let input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt,.json';
            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return resolve();
                try {
                    const content = await file.text();
                    let data = JSON.parse(content);
                    if (BATTLE_MODES.some(key => data[key]?.attacks?.some(attack => attack.type === 'kamisamaniNattaHi')) && !confirm(t('cB.importCustomCodeWarning'))) {
                        throw new Error('Custom code import rejected');
                    }
                    mergeCfg(data, cfgBattle, cfgBattle, 'battle');
                    renderAllPages();
                    resolve(t('cGen.imported!'));
                } catch (err) {
                    console.error(err);
                    reject(t('cGen.importFailed!'));
                }
            });
            input.click();
        });
    }

    // ===== 各页渲染 =====
    function renderBasicPage() {
        let panel = panels.basic;
        panel.innerHTML = '';

        ['basic','advanceToNextRound','ajaxRound','showRealTimeProficiency','showMonsterIndex',
        'showMonsterInfo','showMonsterHP','recordBattleLog','dailyStaminaQuotaPlus',
        'ctrlWidgetStyleText','ctrlWidgetMouseEnter','ctrlWidgetRows']
        .forEach(k => renderTopField(panel, k));

        // 全局快捷键
        let kbSection = document.createElement('div');
        kbSection.style.cssText = 'margin-top: 16px;';
        let kbHeading = document.createElement('div');
        kbHeading.textContent = '全局按键绑定';
        kbHeading.style.cssText = 'font-weight: bold; margin-bottom: 6px;';
        kbSection.appendChild(kbHeading);

        Object.keys(KEYBINDS).forEach(action => {
            let row = document.createElement('div');
            let span = document.createElement('span');
            span.textContent = t(`cB.${action}`) + ': ';
            row.appendChild(span);

            jpxUtils.createButton(row, {
                id: `btn_${action}`,
                text: jpxUtils.formatKeyCombo(userKeybinds[action], ' + '),
                                  onClick: (btn, e) => {
                                      e.stopPropagation();
                                      let originalText = btn.textContent;
                                      btn.textContent = '...';
                                      jpxUtils.captureKeyCombo(
                                          (result) => {
                                              userKeybinds[action] = {
                                                  key: result.key,
                                                  ctrl: result.ctrl,
                                                  alt: result.alt,
                                                  shift: result.shift
                                              };
                                              btn.textContent = jpxUtils.formatKeyCombo(userKeybinds[action], ' + ');
                                          },
                                          () => { btn.textContent = originalText; }
                                      );
                                  }
            });
            kbSection.appendChild(row);
        });
        panel.appendChild(kbSection);

        // 战斗模式按键绑定（动态）
        let modeKbSection = document.createElement('div');
        modeKbSection.style.cssText = 'margin-top: 16px;';
        let modeKbHeading = document.createElement('div');
        modeKbHeading.textContent = `战斗模式按键绑定（当前模式：${getCurrentModeKey()}）`;
        modeKbHeading.style.cssText = 'font-weight: bold; margin-bottom: 6px;';
        modeKbSection.appendChild(modeKbHeading);

        let kbContent = document.createElement('div');
        modeKbSection.appendChild(kbContent);
        renderModeField(kbContent, 'keyBindings');
        panel.appendChild(modeKbSection);
    }

    function renderQuickbarPage() {
        let panel = panels.quickbar;
        panel.innerHTML = '';
        ['showCooldowns','quickbarExtend','showDurations']
        .forEach(k => renderTopField(panel, k));
    }
    function renderTwoColumnPage(panel, fieldKey) {
        panel.innerHTML = '';

        let modeData = getModeData();
        let modesField = fieldByKey['modes'];
        if (!modesField) return;
        let fieldDef = modesField.itemSchema.properties.find(p => p.key === fieldKey);
        if (!fieldDef) return;

        let selectedItems = new Set();   // Set<item object>，跨渲染稳定
        let lastClickedIndex = -1;

        let layout = document.createElement('div');
        layout.style.cssText = 'display: flex; gap: 12px; align-items: stretch; flex: 1 1 auto; min-height: 0;';

        let leftWrapper = document.createElement('div');
        leftWrapper.style.cssText = 'flex: 0 0 280px; display: flex; flex-direction: column; border-right: 1px solid #ddd; padding-right: 8px; min-height: 0;';

        let leftScroll = document.createElement('div');
        leftScroll.style.cssText = 'flex: 1 1 auto; overflow-y: auto; min-height: 0;';

        let leftFooter = document.createElement('div');
        leftFooter.style.cssText = 'flex: 0 0 auto; position: relative; padding-top: 6px; border-top: 1px dashed #ccc; margin-top: 6px;';

        leftWrapper.append(leftScroll, leftFooter);

        let rightPanel = document.createElement('div');
        rightPanel.style.cssText = 'flex: 1 1 auto; min-width: 0; overflow-y: auto; min-height: 0;';

        layout.append(leftWrapper, rightPanel);
        panel.appendChild(layout);

        let debounceTimer = null;
        let draggingIndex = null;
        let draggingSet = null;
        let activeMenu = null;
        let activeAddMenu = null;
        let activeSubMenu = null;
        let rightObserver = null;

        // ===== 菜单管理 =====
        function closeSubMenu() {
            if (activeSubMenu && activeSubMenu.parentNode) activeSubMenu.parentNode.removeChild(activeSubMenu);
            activeSubMenu = null;
        }
        function closeAddMenu() {
            if (activeAddMenu && activeAddMenu.parentNode) activeAddMenu.parentNode.removeChild(activeAddMenu);
            activeAddMenu = null;
        }
        function closeContextMenu() {
            closeSubMenu();
            if (activeMenu && activeMenu.parentNode) activeMenu.parentNode.removeChild(activeMenu);
            activeMenu = null;
        }
        function closeAllMenus() {
            closeSubMenu();
            closeAddMenu();
            closeContextMenu();
        }

        let outsideListener = (e) => {
            if (!layout.isConnected) {
                document.removeEventListener('pointerdown', outsideListener, true);
                closeAllMenus();
                if (rightObserver) { rightObserver.disconnect(); rightObserver = null; }
                return;
            }
            let inAnyMenu = [activeMenu, activeSubMenu, activeAddMenu].some(m => m && m.contains(e.target));
            if (!inAnyMenu && !(e.target.closest && e.target.closest('.jpx-outline-add-btn'))) {
                closeAllMenus();
            }
        };
        document.addEventListener('pointerdown', outsideListener, true);

        // ===== 大纲标签 =====
        function getOutlineLabel(item) {
            if (!item || typeof item !== 'object') return '?';
            let parts = [];
            if (item.type) parts.push(t('cB.' + item.type));
            if (item.priorityRule) parts.push(t('cB.' + item.priorityRule));
            else if (item.name) parts.push(t('cB.' + item.name));
            return parts.join(' ');
        }

        // ===== 选中集辅助 =====
        function getSelectedItemsInOrder() {
            let arr = modeData[fieldKey] || [];
            return arr.filter(x => selectedItems.has(x));
        }
        function cleanSelected() {
            let arr = modeData[fieldKey] || [];
            for (let item of Array.from(selectedItems)) {
                if (!arr.includes(item)) selectedItems.delete(item);
            }
        }

        // ===== 移动操作（作用于传入的一组 item） =====
        function moveAffectedUp(affectedItems) {
            let arr = modeData[fieldKey];
            let affected = new Set(affectedItems);
            let idxs = [];
            arr.forEach((x, i) => { if (affected.has(x)) idxs.push(i); });
            if (!idxs.length) return;
            let minIdx = idxs[0];
            if (minIdx === 0) return;
            let anchor = arr[minIdx - 1];
            if (affected.has(anchor)) return;   // 已经连续在前，不必移
            let affectedList = arr.filter(x => affected.has(x));
            let remaining = arr.filter(x => !affected.has(x));
            let pos = remaining.indexOf(anchor);
            arr.length = 0;
            arr.push(...remaining.slice(0, pos), ...affectedList, ...remaining.slice(pos));
        }

        function moveAffectedDown(affectedItems) {
            let arr = modeData[fieldKey];
            let affected = new Set(affectedItems);
            let idxs = [];
            arr.forEach((x, i) => { if (affected.has(x)) idxs.push(i); });
            if (!idxs.length) return;
            let maxIdx = idxs[idxs.length - 1];
            if (maxIdx === arr.length - 1) return;
            let anchor = arr[maxIdx + 1];
            if (affected.has(anchor)) return;
            let affectedList = arr.filter(x => affected.has(x));
            let remaining = arr.filter(x => !affected.has(x));
            let pos = remaining.indexOf(anchor) + 1;
            arr.length = 0;
            arr.push(...remaining.slice(0, pos), ...affectedList, ...remaining.slice(pos));
        }

        function moveAffectedTop(affectedItems) {
            let arr = modeData[fieldKey];
            let affected = new Set(affectedItems);
            let affectedList = arr.filter(x => affected.has(x));
            if (!affectedList.length) return;
            let remaining = arr.filter(x => !affected.has(x));
            arr.length = 0;
            arr.push(...affectedList, ...remaining);
        }

        function moveAffectedBottom(affectedItems) {
            let arr = modeData[fieldKey];
            let affected = new Set(affectedItems);
            let affectedList = arr.filter(x => affected.has(x));
            if (!affectedList.length) return;
            let remaining = arr.filter(x => !affected.has(x));
            arr.length = 0;
            arr.push(...remaining, ...affectedList);
        }

        function duplicateAffectedBelow(affectedItems) {
            let arr = modeData[fieldKey];
            let affected = new Set(affectedItems);
            let idxs = [];
            arr.forEach((x, i) => { if (affected.has(x)) idxs.push(i); });
            if (!idxs.length) return;
            let lastIdx = idxs[idxs.length - 1];
            let copies = idxs.map(i => JSON.parse(JSON.stringify(arr[i])));
            arr.splice(lastIdx + 1, 0, ...copies);
        }

        function toggleAffectedDisabled(affectedItems) {
            let anyEnabled = affectedItems.some(x => x.disabled !== true);
            affectedItems.forEach(x => {
                if (anyEnabled) x.disabled = true;
                else delete x.disabled;
            });
        }

        function deleteAffected(affectedItems) {
            let arr = modeData[fieldKey];
            let affected = new Set(affectedItems);
            let newArr = arr.filter(x => !affected.has(x));
            arr.length = 0;
            arr.push(...newArr);
            affected.forEach(x => selectedItems.delete(x));
        }

        function addAt(anchorItem, position, subSchema) {
            let arr = modeData[fieldKey];
            let idx = arr.indexOf(anchorItem);
            if (idx < 0) return;
            let newItem = createEmptyObject(subSchema);
            arr.splice(position === 'before' ? idx : idx + 1, 0, newItem);
        }

        // ===== 二级"新增"菜单 =====
        function buildAddSubMenu(anchorItem, position) {
            let sub = document.createElement('div');
            sub.style.cssText = 'position: fixed; z-index: 10002; background: #fff; border: 1px solid #999; box-shadow: 2px 2px 8px rgba(0,0,0,0.2); padding: 4px 0; min-width: 180px; max-height: 300px; overflow-y: auto; font-size: 9pt; border-radius: 3px; color: #333; text-align: left;';

            let itemSchema = fieldDef.itemSchema;
            if (itemSchema?.discriminator && itemSchema.oneOf) {
                for (const [typeKey, subSchema] of Object.entries(itemSchema.oneOf)) {
                    let typeConst = subSchema.properties.find(p => p.type === 'constant');
                    let typeLabel = typeConst ? t(typeConst.label || ('cB.' + typeConst.value)) : typeKey;

                    let el = document.createElement('div');
                    el.textContent = `➕ 新增 ${typeLabel}`;
                    el.style.cssText = 'padding: 5px 14px; white-space: nowrap; cursor: pointer;';
                    el.addEventListener('mouseenter', () => el.style.background = '#e0e8ff');
                    el.addEventListener('mouseleave', () => el.style.background = '');
                    el.addEventListener('pointerdown', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        addAt(anchorItem, position, subSchema);
                        closeAllMenus();
                        refreshAll();
                    });
                    sub.appendChild(el);
                }
            }
            return sub;
        }

        function showAddSubMenu(parentEl, anchorItem, position) {
            closeSubMenu();
            let sub = buildAddSubMenu(anchorItem, position);
            document.body.appendChild(sub);
            activeSubMenu = sub;

            let rect = parentEl.getBoundingClientRect();
            let subRect = sub.getBoundingClientRect();
            let vw = document.documentElement.clientWidth;
            let vh = document.documentElement.clientHeight;

            // 优先右侧空白处，否则左侧；尽量不遮挡一级菜单
            let left = rect.right + 2;
            if (left + subRect.width > vw) {
                left = rect.left - subRect.width - 2;
            }
            if (left < 0) left = 0;

            let top = rect.top;
            if (top + subRect.height > vh) top = vh - subRect.height - 4;
            if (top < 0) top = 0;

            sub.style.left = left + 'px';
            sub.style.top = top + 'px';
        }

        // ===== 右键菜单 =====
        function showContextMenu(x, y, index) {
            closeAllMenus();
            let arr = modeData[fieldKey];
            let item = arr[index];
            if (!item) return;

            let affectedItems;
            let isMulti = false;
            if (selectedItems.has(item) && selectedItems.size > 1) {
                affectedItems = getSelectedItemsInOrder();
                isMulti = true;
            } else {
                affectedItems = [item];
            }

            let menu = document.createElement('div');
            menu.style.cssText = 'position: fixed; z-index: 10001; background: #fff; border: 1px solid #999; box-shadow: 2px 2px 8px rgba(0,0,0,0.2); padding: 4px 0; min-width: 200px; font-size: 9pt; border-radius: 3px; color: #333; text-align: left;';
            document.body.appendChild(menu);
            activeMenu = menu;

            let affectedIdx = [];
            arr.forEach((x, i) => { if (affectedItems.includes(x)) affectedIdx.push(i); });
            let minIdx = affectedIdx[0];
            let maxIdx = affectedIdx[affectedIdx.length - 1];
            let isTop = minIdx === 0;
            let isBottom = maxIdx === arr.length - 1;
            let canMoveUp = !isTop;
            let canMoveDown = !isBottom;

            function addItem(label, disabled, onClick, opts = {}) {
                let el = document.createElement('div');
                el.textContent = label;
                el.style.cssText = 'padding: 5px 14px; white-space: nowrap; cursor: pointer; text-align: left; display: block;';
                if (opts.baseStyle) el.style.cssText += opts.baseStyle;
                if (disabled) {
                    el.style.opacity = '0.4';
                    el.style.cursor = 'default';
                } else {
                    const hoverBg = opts.hoverBg || '#e0e8ff';
                    const baseBg = opts.baseBg ?? '';
                    el.addEventListener('mouseenter', () => el.style.background = hoverBg);
                    el.addEventListener('mouseleave', () => el.style.background = baseBg);
                    el.addEventListener('pointerdown', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        try { onClick(); } finally { closeAllMenus(); }
                    });
                }
                menu.appendChild(el);
                return el;
            }
            function addSeparator() {
                let sep = document.createElement('div');
                sep.style.cssText = 'height: 1px; background: #ccc; margin: 4px 0;';
                menu.appendChild(sep);
            }

            // 绿色：新增（仅单选可用）
            let addBeforeEl = addItem('➕ 在⬆️上方新增... ▶️', isMulti, () => {}, {
                baseStyle: 'background: #2e7d32; color: #fff;',
                baseBg: '#2e7d32',
                hoverBg: '#388e3c',
            });
            if (!isMulti) {
                addBeforeEl.addEventListener('mouseenter', () => showAddSubMenu(addBeforeEl, item, 'before'));
                addBeforeEl.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    showAddSubMenu(addBeforeEl, item, 'before');
                });
            }

            let addAfterEl = addItem('➕ 在⬇️下方新增... ▶️', isMulti, () => {}, {
                baseStyle: 'background: #2e7d32; color: #fff;',
                baseBg: '#2e7d32',
                hoverBg: '#388e3c',
            });
            if (!isMulti) {
                addAfterEl.addEventListener('mouseenter', () => showAddSubMenu(addAfterEl, item, 'after'));
                addAfterEl.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    showAddSubMenu(addAfterEl, item, 'after');
                });
            }

            addSeparator();

            addItem('⇈ 移至顶部', !isTop, () => {
                moveAffectedTop(affectedItems);
                refreshAll();
            });
            addItem('↑ 上移', !canMoveUp, () => {
                moveAffectedUp(affectedItems);
                refreshAll();
            });
            addItem('↓ 下移', !canMoveDown, () => {
                moveAffectedDown(affectedItems);
                refreshAll();
            });
            addItem('⇊ 移至底部', !isBottom, () => {
                moveAffectedBottom(affectedItems);
                refreshAll();
            });

            addItem('⧉ 复制至下方', false, () => {
                duplicateAffectedBelow(affectedItems);
                refreshAll();
            });

            if (fieldDef.canDisable) {
                let anyEnabled = affectedItems.some(x => x.disabled !== true);
                addItem(`⊘ ${anyEnabled ? '禁用' : '启用'}`, false, () => {
                    toggleAffectedDisabled(affectedItems);
                    refreshAll();
                });
            }

            addSeparator();
            addItem(`❌ 删除${isMulti ? `（${affectedItems.length} 项）` : ''}`, false, () => {
                deleteAffected(affectedItems);
                refreshAll();
            }, {
                baseStyle: 'background: #d32f2f; color: #fff;',
                baseBg: '#d32f2f',
                hoverBg: '#e53935',
            });

            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            requestAnimationFrame(() => {
                if (!menu.isConnected) return;
                let rect = menu.getBoundingClientRect();
                let vw = document.documentElement.clientWidth;
                let vh = document.documentElement.clientHeight;
                let left = x, top = y;
                if (left + rect.width > vw) left = vw - rect.width - 4;
                if (top + rect.height > vh) top = vh - rect.height - 4;
                menu.style.left = Math.max(0, left) + 'px';
                menu.style.top = Math.max(0, top) + 'px';
            });
        }

        // ===== 左栏渲染 =====
        function renderLeft() {
            cleanSelected();
            let prevScrollTop = leftScroll.scrollTop;
            leftScroll.innerHTML = '';

            let arr = modeData[fieldKey];
            if (!Array.isArray(arr)) arr = modeData[fieldKey] = [];

            if (!arr.length) {
                let empty = document.createElement('div');
                empty.style.cssText = 'color: #999; font-size: 9pt; padding: 12px 8px; text-align: center;';
                empty.textContent = '（空）';
                leftScroll.appendChild(empty);
            } else {
                // 表头全选
                let header = document.createElement('div');
                header.style.cssText = 'display: flex; align-items: center; padding: 2px 6px 4px; margin-bottom: 4px; border-bottom: 1px solid #ccc; font-size: 8pt; color: #666;';
                let allCb = document.createElement('input');
                allCb.type = 'checkbox';
                let allSelected = arr.every(x => selectedItems.has(x));
                allCb.checked = allSelected;
                allCb.indeterminate = !allSelected && arr.some(x => selectedItems.has(x));
                allCb.onchange = () => {
                    if (allCb.checked) arr.forEach(x => selectedItems.add(x));
                    else selectedItems.clear();
                    renderLeft();
                };
                let headerLabel = document.createElement('span');
                headerLabel.textContent = '全选';
                headerLabel.style.cssText = 'margin-left: 6px;';
                header.append(allCb, headerLabel);
                leftScroll.appendChild(header);
            }

            arr.forEach((item, index) => {
                if (!item || typeof item !== 'object') return;

                let isSelected = selectedItems.has(item);
                let row = document.createElement('div');
                row.style.cssText = `display: flex; align-items: center; padding: 4px 6px; margin-bottom: 2px; background: ${isSelected ? '#d9e8ff' : '#f5f5f5'}; border-radius: 3px; cursor: pointer; font-size: 9pt; user-select: none;`;
                if (item.disabled) row.style.opacity = '0.5';
                row.dataset.index = String(index);

                let cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = isSelected;
                cb.style.cssText = 'margin-right: 6px; cursor: pointer;';
                cb.addEventListener('click', (e) => e.stopPropagation());
                cb.addEventListener('pointerdown', (e) => e.stopPropagation());
                cb.onchange = () => {
                    if (cb.checked) selectedItems.add(item);
                    else selectedItems.delete(item);
                    lastClickedIndex = index;
                    renderLeft();
                };

                let num = document.createElement('span');
                num.textContent = String(index + 1);
                num.style.cssText = 'min-width: 20px; color: #888; font-size: 8pt; margin-right: 6px; text-align: right;';

                let content = document.createElement('span');
                content.textContent = getOutlineLabel(item);
                content.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

                let dragHandle = document.createElement('span');
                dragHandle.textContent = '≡';
                dragHandle.draggable = true;
                dragHandle.style.cssText = 'margin-left: 6px; cursor: grab; user-select: none; color: #888; font-weight: bold;';
                dragHandle.addEventListener('click', e => e.stopPropagation());
                dragHandle.addEventListener('pointerdown', e => e.stopPropagation());

                row.append(cb, num, content, dragHandle);
                leftScroll.appendChild(row);

                row.addEventListener('click', (e) => {
                    if (e.target === cb || e.target === dragHandle) return;
                    if (e.button === 2 || e.ctrlKey || e.metaKey) return;

                    // Shift 范围选择
                    if (e.shiftKey && lastClickedIndex >= 0) {
                        let from = Math.min(lastClickedIndex, index);
                        let to = Math.max(lastClickedIndex, index);
                        for (let i = from; i <= to; i++) selectedItems.add(arr[i]);
                        renderLeft();
                        return;
                    }

                    lastClickedIndex = index;
                    let target = rightPanel.querySelector(`.array-row[data-array-index="${index}"]`);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        let prev = target.style.outline;
                        target.style.outline = '2px solid #ffd54f';
                        setTimeout(() => { target.style.outline = prev; }, 800);
                    }
                });

                row.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // 若右键的项不在选中集，把选中集重置为这一项
                    if (!selectedItems.has(item)) {
                        selectedItems.clear();
                        selectedItems.add(item);
                    }
                    lastClickedIndex = index;
                    renderLeft();
                    showContextMenu(e.clientX, e.clientY, index);
                });

                dragHandle.addEventListener('dragstart', (e) => {
                    if (selectedItems.has(item) && selectedItems.size > 1) {
                        draggingSet = new Set(selectedItems);
                    } else {
                        draggingSet = new Set([item]);
                    }
                    draggingIndex = index;
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(index));
                    row.style.opacity = '0.4';
                });
                dragHandle.addEventListener('dragend', () => {
                    draggingIndex = null;
                    draggingSet = null;
                    row.style.opacity = item.disabled ? '0.5' : '1';
                });
                row.addEventListener('dragover', (e) => {
                    if (draggingSet) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                    }
                });
                row.addEventListener('drop', (e) => {
                    e.preventDefault();
                    if (!draggingSet) return;
                    let dragSet = draggingSet;
                    draggingIndex = null;
                    draggingSet = null;

                    let arr2 = modeData[fieldKey];
                    let targetIdx = index;
                    let anchorItem = arr2[targetIdx];
                    if (dragSet.has(anchorItem)) return;  // 拖到选中集自身无操作

                    let affectedList = arr2.filter(x => dragSet.has(x));
                    let remaining = arr2.filter(x => !dragSet.has(x));
                    let pos = remaining.indexOf(anchorItem);
                    if (pos < 0) pos = remaining.length;

                    arr2.length = 0;
                    arr2.push(...remaining.slice(0, pos), ...affectedList, ...remaining.slice(pos));
                    refreshAll();
                });
            });

            leftScroll.scrollTop = prevScrollTop;
            renderFooter();
        }

        // ===== 底部常驻添加栏 =====
        function renderFooter() {
            closeAddMenu();
            leftFooter.innerHTML = '';

            let addBtn = document.createElement('div');
            addBtn.className = 'jpx-outline-add-btn';
            addBtn.textContent = '➕ 添加...';
            addBtn.style.cssText = 'padding: 6px; background: #e8e8e8; border-radius: 3px; cursor: pointer; text-align: center; font-size: 9pt; user-select: none;';
            leftFooter.appendChild(addBtn);

            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (activeAddMenu) {
                    closeAddMenu();
                    return;
                }

                let menu = document.createElement('div');
                menu.style.cssText = 'position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 4px; max-height: 300px; overflow-y: auto; background: #fff; border: 1px solid #999; box-shadow: 0 -2px 8px rgba(0,0,0,0.2); padding: 4px 0; border-radius: 3px; font-size: 9pt; z-index: 10; color: #333;';

                let itemSchema = fieldDef.itemSchema;
                if (itemSchema?.discriminator && itemSchema.oneOf) {
                    for (const [typeKey, subSchema] of Object.entries(itemSchema.oneOf)) {
                        let typeConst = subSchema.properties.find(p => p.type === 'constant');
                        let typeLabel = typeConst ? t(typeConst.label || ('cB.' + typeConst.value)) : typeKey;

                        let btn = document.createElement('div');
                        btn.textContent = `➕ 新增 ${typeLabel}`;
                        btn.style.cssText = 'padding: 5px 10px; cursor: pointer; white-space: nowrap;';
                        btn.addEventListener('mouseenter', () => btn.style.background = '#e0e8ff');
                        btn.addEventListener('mouseleave', () => btn.style.background = '');
                        btn.addEventListener('pointerdown', (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            modeData[fieldKey].push(createEmptyObject(subSchema));
                            closeAddMenu();
                            refreshAll();
                        });
                        menu.appendChild(btn);
                    }
                }

                leftFooter.appendChild(menu);
                activeAddMenu = menu;
            });
        }

        // ===== 右栏渲染 =====
        function renderRight() {
            let prevScrollTop = rightPanel.scrollTop;
            rightPanel.innerHTML = '';
            renderField(rightPanel, fieldDef, modeData);
            rightPanel.scrollTop = prevScrollTop;
        }

        function refreshAll() {
            closeAllMenus();
            renderRight();
            renderLeft();
        }

        function debouncedRefreshLeft() {
            if (!layout.isConnected) return;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (layout.isConnected) renderLeft();
            }, 150);
        }

        rightPanel.addEventListener('input', debouncedRefreshLeft);
        rightPanel.addEventListener('change', debouncedRefreshLeft);

        rightObserver = new MutationObserver(() => {
            if (!layout.isConnected) return;
            debouncedRefreshLeft();
        });
        rightObserver.observe(rightPanel, { childList: true, subtree: true });

        renderRight();
        renderLeft();
    }

    function renderSupportsPage() {
        let panel = panels.supports;
        panel.innerHTML = '';
        renderTwoColumnPage(panel, 'supports');
    }

    function renderAttacksPage() {
        let panel = panels.attacks;
        panel.innerHTML = '';
        renderTwoColumnPage(panel, 'attacks');
    }

    function renderManagePage() {
        let panel = panels.manage;
        panel.innerHTML = '';

        let note = document.createElement('div');
        note.style.cssText = 'margin-bottom: 12px; color: #666;';
        note.textContent = '当前模式：' + getCurrentModeKey();
        panel.appendChild(note);

        let btnWrap = document.createElement('div');
        btnWrap.style.cssText = 'display: flex; flex-direction: column; gap: 8px; max-width: 400px;';
        panel.appendChild(btnWrap);

        jpxUtils.createButton(btnWrap, {
            id: 'export-current-button',
            text: t('cB.exportCurrentBattleMode'),
                              onClick: () => {
                                  let modeKey = getCurrentModeKey();
                                  if (!cfgBattle[modeKey]) return t('cGen.exportFailed!');
                                  let exportData = { [modeKey]: cfgBattle[modeKey], battleVersion: cfgBattle.battleVersion };
                                  let blob = new Blob([jpxUtils.stringifyLimited(exportData, 3)], { type: 'text/plain;charset=utf-8' });
                                  let url = URL.createObjectURL(blob);
                                  let a = document.createElement('a');
                                  a.href = url;
                                  a.download = `cfgBattle${!isekaiSuffix ? '_Persistent' : '_Isekai'}_${modeKey}.txt`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  return t('cGen.exported!');
                              }
        });

        jpxUtils.createButton(btnWrap, {
            id: 'reset-current-button',
            text: t('cB.resetCurrentBattleMode'),
                              onClick: (btn) => {
                                  let modeKey = getCurrentModeKey();
                                  cfgBattle[modeKey] = !jpxUtils.isEmpty(defaultCfgBattle[modeKey])
                                  ? JSON.parse(JSON.stringify(defaultCfgBattle[modeKey]))
                                  : {};
                                  renderAllPages();
                                  return t('cGen.reset!');
                              }
        });

        jpxUtils.createButton(btnWrap, {
            id: 'manage-save-button',
            text: t('cB.saveBattleConfig'),
                              onClick: () => {
                                  saveBattleCfg();
                                  return t('cGen.saved!');
                              }
        });

        jpxUtils.createButton(btnWrap, {
            id: 'manage-export-button',
            text: t('cB.exportBattleConfig'),
                              onClick: () => {
                                  exportBattleCfg();
                                  return t('cGen.exported!');
                              }
        });

        jpxUtils.createButton(btnWrap, {
            id: 'manage-import-button',
            text: t('cB.importBattleConfig'),
                              onClick: () => importBattleCfgFromFile()
        });
    }

    function renderAllPages() {
        renderBasicPage();
        renderQuickbarPage();
        renderSupportsPage();
        renderAttacksPage();
        renderManagePage();
    }

    renderAllPages();
    switchSubTab('basic');

    // ===== 监听模式切换 / 导入 =====
    function onModeChange() {
        if (!document.body.contains(parent)) {
            document.removeEventListener('battleModeChange', onModeChange);
            document.removeEventListener('battleConfigImported', onModeChange);
            return;
        }
        renderBasicPage();
        renderSupportsPage();
        renderAttacksPage();
        renderManagePage();
    }
    document.addEventListener('battleModeChange', onModeChange);
    document.addEventListener('battleConfigImported', onModeChange);
}

function renderStatsTab(parent) {
    let storedCfgStats = {};
    try {
        storedCfgStats = JSON.parse(localStorage.getItem(prefix + 'cfgStats') || '{}');
    } catch (err) {
        console.warn('Failed to load cfgStats. Using default cfgStats.');
        storedCfgStats = {};
    }
    mergeCfg(storedCfgStats, defaultCfgStats, cfgStats, 'stats');

    let cfgStatsUI = document.createElement('div');
    cfgStatsUI.id = 'cfgStats-ui';
    parent.appendChild(cfgStatsUI);
    renderSchema(cfgStatsUI, cfgStatsSchema, cfgStats);

    let buttonsUI = document.createElement('div');
    buttonsUI.style.marginTop = '20px';

    jpxUtils.createButton(buttonsUI, {
        id: 'reset-cfgStats-button',
        text: t('cS.resetStatsSettings'),
                          onClick: (btn) => {
                              cfgStats = JSON.parse(JSON.stringify(defaultCfgStats));

                              let oldUI = document.getElementById('cfgStats-ui');
                              let newUI = document.createElement('div');
                              newUI.id = 'cfgStats-ui';
                              if (oldUI) {
                                  oldUI.replaceWith(newUI);
                                  renderSchema(newUI, cfgStatsSchema, cfgStats);
                              }

                              return t('cGen.reset!');
                          }
    });

    jpxUtils.createButton(buttonsUI, {
        id: 'export-db-button',
        text: t('cS.exportDB'),
                          onClick: async () => {
                              let exportData = await exportIndexedDB();
                              let blob = new Blob([jpxUtils.stringifyLimited(exportData, 3)], { type: 'application/json' });
                              let url = URL.createObjectURL(blob);
                              let a = document.createElement('a');
                              a.href = url;
                              a.download = `battleStats_${Date.now()}.json`;
                              a.click();
                              URL.revokeObjectURL(url);

                              return t('cGen.exported!');
                          }
    });

    jpxUtils.createButton(buttonsUI, {
        id: 'import-db-button',
        text: t('cS.importDB'),
                          onClick: (btn) => {
                              let input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'application/json';

                              return new Promise((resolve, reject) => {
                                  input.addEventListener('change', async (e) => {
                                      const file = e.target.files[0];
                                      if (!file) return resolve();
                                      try {
                                          let content = await file.text();
                                          let json = JSON.parse(content);

                                          const merge = confirm(t('cS.importConfirm'));
                                          await importIndexedDB(json, merge);

                                          resolve(t('cGen.imported!'));
                                      } catch (err) {
                                          console.error(err);
                                          reject(t('cGen.importFailed!'));
                                      }
                                  });

                                  input.click();
                              });
                          }
    });

    parent.appendChild(buttonsUI);
}

function renderMissPinkTab(parent) {
    ensureCfgMissPink();

    let subTabs = [
        { id: 'sound',      text: '📢语音提醒' },
        { id: 'appearance', text: '🎨外观',                  placeholder: '（占位符，待实现）' },
        { id: 'manage',     text: '💾专属区配置文件管理' },
    ];

    let subTabHeader = document.createElement('div');
    subTabHeader.className = 'settings-subtab-header';
    parent.appendChild(subTabHeader);

    let panels = {};
    let btns = {};
    subTabs.forEach(tab => {
        btns[tab.id] = jpxUtils.createButton(subTabHeader, {
            className: 'settings-subtab-btn',
            text: tab.text,
            onClick: () => switchSubTab(tab.id),
        });
        let panel = document.createElement('div');
        panel.id = `misspink-subpanel-${tab.id}`;
        panel.style.display = 'none';
        parent.appendChild(panel);
        panels[tab.id] = panel;
    });

    function switchSubTab(id) {
        subTabs.forEach(tab => {
            let isActive = tab.id === id;
            panels[tab.id].style.display = isActive ? 'block' : 'none';
            btns[tab.id].classList.toggle('active', isActive);
        });
    }

    // ===== 📢语音提醒 =====
    function renderSoundPage() {
        let panel = panels.sound;
        panel.innerHTML = '';

        let snd = cfgMissPink.soundReminder;

        let heading = document.createElement('div');
        heading.textContent = '🔧基本';
        heading.style.cssText = 'font-weight: bold; margin-bottom: 10px;';
        panel.appendChild(heading);

        // 总开关
        let masterRow = document.createElement('div');
        masterRow.style.cssText = 'margin-bottom: 14px;';
        let masterId = getUniqueId('sndMaster');
        masterRow.innerHTML = `
        <label for="${masterId}">
        <input type="checkbox" id="${masterId}" ${snd.enabled ? 'checked' : ''}>
        启用战斗结束语音提醒
        </label>
        `;
        masterRow.querySelector('input').onchange = e => {
            snd.enabled = e.target.checked;
        };
        panel.appendChild(masterRow);

        const SOUND_TYPES = [
            { key: 'Victory', label: '✌️胜利' },
            { key: 'Defeat',  label: '🏳️败北' },
            { key: 'Flee',    label: '👞逃跑' },
        ];

        SOUND_TYPES.forEach(({ key, label }) => {
            let entry = snd.battleEnd[key];

            let row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';

            let cbId = getUniqueId('sndType_' + key);
            let cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = cbId;
            cb.checked = !!entry.enabled;
            cb.onchange = () => { entry.enabled = cb.checked; };

            let lbl = document.createElement('label');
            lbl.htmlFor = cbId;
            lbl.textContent = label;
            lbl.style.cssText = 'min-width: 90px;';

            let urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.value = entry.url || '';
            urlInput.placeholder = '音频 URL';
            urlInput.style.cssText = 'flex: 1 1 auto; max-width: 700px; min-width: 240px;';
            urlInput.oninput = () => { entry.url = urlInput.value.trim(); };

            row.append(cb, lbl, urlInput);

            jpxUtils.createButton(row, {
                text: '▶️试听',
                cssText: 'flex: 0 0 auto;',
                onClick: () => {
                    try {
                        let url = entry.url || defaultCfgMissPink.soundReminder.battleEnd[key].url;
                        let audio = new Audio(url);
                        audio.volume = typeof snd.volume === 'number' ? snd.volume : 0.7;
                        audio.play().catch(e => console.error('试听失败:', e));
                    } catch (e) {
                        console.error('试听失败:', e);
                    }
                }
            });

            panel.appendChild(row);
        });

        // 音量
        let volRow = document.createElement('div');
        volRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-top: 16px;';

        let volId = getUniqueId('sndVolume');
        let volLabel = document.createElement('label');
        volLabel.htmlFor = volId;
        volLabel.textContent = '🔊音量';
        volLabel.style.cssText = 'min-width: 90px;';

        let volRange = document.createElement('input');
        volRange.type = 'range';
        volRange.id = volId;
        volRange.min = '0';
        volRange.max = '1';
        volRange.step = '0.05';
        volRange.value = typeof snd.volume === 'number' ? snd.volume : 0.7;
        volRange.style.cssText = 'width: 300px;';

        let volValue = document.createElement('span');
        volValue.textContent = Math.round(volRange.value * 100) + '%';
        volValue.style.cssText = 'min-width: 50px;';

        volRange.oninput = () => {
            snd.volume = Math.round(+volRange.value * 100) / 100;
            volValue.textContent = Math.round(snd.volume * 100) + '%';
        };

        volRow.append(volLabel, volRange, volValue);
        panel.appendChild(volRow);
    }

    function renderPlaceholder(id, title) {
        let panel = panels[id];
        panel.innerHTML = '';
        let div = document.createElement('div');
        div.style.cssText = 'padding: 40px; text-align: center; color: #888; font-size: 14pt;';
        div.textContent = `${title} （占位符，待实现）`;
        panel.appendChild(div);
    }
    function addColorAlphaRow(parent, label, obj, colorKey, alphaKey, onChange) {
        let row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';

        let colorId = getUniqueId('apColor');
        let colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = colorId;
        colorInput.value = obj[colorKey] || '#000000';
        colorInput.oninput = () => { obj[colorKey] = colorInput.value; onChange(); };

        let lbl = document.createElement('label');
        lbl.htmlFor = colorId;
        lbl.textContent = label;
        lbl.style.cssText = 'min-width: 130px;';

        let alphaLbl = document.createElement('span');
        alphaLbl.textContent = '透明度';
        alphaLbl.style.cssText = 'margin-left: 16px;';

        let alphaRange = document.createElement('input');
        alphaRange.type = 'range';
        alphaRange.min = '0';
        alphaRange.max = '1';
        alphaRange.step = '0.05';
        alphaRange.value = obj[alphaKey] ?? 1;
        alphaRange.style.cssText = 'width: 160px;';

        let alphaValue = document.createElement('span');
        alphaValue.textContent = Math.round((obj[alphaKey] ?? 1) * 100) + '%';
        alphaValue.style.cssText = 'min-width: 50px;';

        alphaRange.oninput = () => {
            obj[alphaKey] = Math.round(+alphaRange.value * 100) / 100;
            alphaValue.textContent = Math.round(obj[alphaKey] * 100) + '%';
            onChange();
        };

        row.append(lbl, colorInput, alphaLbl, alphaRange, alphaValue);
        parent.appendChild(row);
    }

    function addColorRow(parent, label, obj, colorKey, onChange) {
        let row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';

        let colorId = getUniqueId('apColor');
        let colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = colorId;
        colorInput.value = obj[colorKey] || '#000000';
        colorInput.oninput = () => { obj[colorKey] = colorInput.value; onChange(); };

        let lbl = document.createElement('label');
        lbl.htmlFor = colorId;
        lbl.textContent = label;
        lbl.style.cssText = 'min-width: 130px;';

        row.append(lbl, colorInput);
        parent.appendChild(row);
    }

    function addOptionalColorRow(parent, label, obj, colorKey, onChange) {
        let row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';

        let colorId = getUniqueId('apColor');
        let colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = colorId;
        colorInput.value = obj[colorKey] || '#000000';
        colorInput.disabled = !obj[colorKey];
        colorInput.oninput = () => { obj[colorKey] = colorInput.value; onChange(); };

        let enabledCb = document.createElement('input');
        enabledCb.type = 'checkbox';
        enabledCb.checked = !!obj[colorKey];
        enabledCb.onchange = () => {
            if (enabledCb.checked) {
                obj[colorKey] = colorInput.value || '#000000';
                colorInput.disabled = false;
            } else {
                obj[colorKey] = '';
                colorInput.disabled = true;
            }
            onChange();
        };

        let lbl = document.createElement('span');
        lbl.textContent = label;
        lbl.style.cssText = 'min-width: 130px;';

        row.append(lbl, enabledCb, colorInput);
        parent.appendChild(row);
    }

    function renderAppearancePage() {
        let panel = panels.appearance;
        panel.innerHTML = '';
        let ap = cfgMissPink.appearance;

        // 总开关
        let masterRow = document.createElement('div');
        masterRow.style.cssText = 'margin-bottom: 14px;';
        let masterId = getUniqueId('apMaster');
        masterRow.innerHTML = `
        <label for="${masterId}">
        <input type="checkbox" id="${masterId}" ${ap.enabled ? 'checked' : ''}>
        启用自定义外观
        </label>
        `;
        masterRow.querySelector('input').onchange = e => {
            ap.enabled = e.target.checked;
            applyAppearance();
        };
        panel.appendChild(masterRow);

        // ===== 🎛️脚本内 =====
        let scriptHeading = document.createElement('div');
        scriptHeading.textContent = '🎛️脚本内';
        scriptHeading.style.cssText = 'font-weight: bold; margin: 16px 0 10px;';
        panel.appendChild(scriptHeading);

        addColorAlphaRow(panel, '标题栏颜色',
                         ap.scriptPanel, 'titleBarBg', 'titleBarBgAlpha',
                         () => applyAppearance());

        addColorRow(panel, '标题栏文本颜色',
                    ap.scriptPanel, 'titleBarTextColor',
                    () => applyAppearance());

        addColorAlphaRow(panel, '窗口背景颜色',
                         ap.scriptPanel, 'contentBg', 'contentBgAlpha',
                         () => applyAppearance());

        addColorRow(panel, '窗口内容文本颜色',
                    ap.scriptPanel, 'contentTextColor',
                    () => applyAppearance());

        // 配置按钮位置（X=left，Y=top）
        let posRow = document.createElement('div');
        posRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';

        let posLbl = document.createElement('span');
        posLbl.textContent = '配置按钮位置';
        posLbl.style.cssText = 'min-width: 130px;';
        posRow.appendChild(posLbl);

        let xId = getUniqueId('apBtnX');
        let xLbl = document.createElement('label');
        xLbl.htmlFor = xId;
        xLbl.textContent = 'X（left）';
        xLbl.style.cssText = 'margin-left: 4px;';
        let xInput = document.createElement('input');
        xInput.type = 'number';
        xInput.id = xId;
        xInput.style.cssText = 'width: 100px;';
        xInput.value = ap.scriptPanel.configButtonX ?? 1238;
        xInput.oninput = () => {
            let v = parseFloat(xInput.value);
            if (!isNaN(v)) {
                ap.scriptPanel.configButtonX = v;
                applyAppearance();
            }
        };
        posRow.append(xLbl, xInput);

        let yId = getUniqueId('apBtnY');
        let yLbl = document.createElement('label');
        yLbl.htmlFor = yId;
        yLbl.textContent = 'Y（top）';
        yLbl.style.cssText = 'margin-left: 16px;';
        let yInput = document.createElement('input');
        yInput.type = 'number';
        yInput.id = yId;
        yInput.style.cssText = 'width: 100px;';
        yInput.value = ap.scriptPanel.configButtonY ?? 4;
        yInput.oninput = () => {
            let v = parseFloat(yInput.value);
            if (!isNaN(v)) {
                ap.scriptPanel.configButtonY = v;
                applyAppearance();
            }
        };
        posRow.append(yLbl, yInput);

        panel.appendChild(posRow);

        // ===== 🌍全局 =====
        let globalHeading = document.createElement('div');
        globalHeading.textContent = '🌍全局（作用于页面所有按钮）';
        globalHeading.style.cssText = 'font-weight: bold; margin: 20px 0 10px;';
        panel.appendChild(globalHeading);

        addOptionalColorRow(panel, '按钮文本颜色',
                            ap.globalButton, 'textColor',
                            () => applyAppearance());

        addOptionalColorRow(panel, '按钮背景颜色',
                            ap.globalButton, 'bgColor',
                            () => applyAppearance());

        addOptionalColorRow(panel, '按钮边框颜色',
                            ap.globalButton, 'borderColor',
                            () => applyAppearance());

        // 圆角大小
        let radiusRow = document.createElement('div');
        radiusRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';
        let radiusId = getUniqueId('apRadius');
        radiusRow.innerHTML = `
        <label for="${radiusId}" style="min-width: 130px;">按钮圆角大小（px）</label>
        <input type="text" id="${radiusId}" style="width: 100px;" placeholder="如 4，留空不改">
        `;
        let radiusInput = radiusRow.querySelector('input');
        radiusInput.value = ap.globalButton.borderRadius ?? '';
        radiusInput.oninput = () => {
            ap.globalButton.borderRadius = radiusInput.value.trim();
            applyAppearance();
        };
        panel.appendChild(radiusRow);

        // 按钮主题
        let themeRow = document.createElement('div');
        themeRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';
        let themeId = getUniqueId('apTheme');
        let themeLbl = document.createElement('label');
        themeLbl.htmlFor = themeId;
        themeLbl.textContent = '按钮主题';
        themeLbl.style.cssText = 'min-width: 130px;';
        themeRow.appendChild(themeLbl);

        let themeSel = document.createElement('select');
        themeSel.id = themeId;
        [
            { value: 'default', label: '默认' },
            { value: '3d', label: '3D按钮' },
            { value: 'material', label: 'Material设计' },
            { value: 'classic', label: 'Win经典' },
        ].forEach(o => {
            let opt = document.createElement('option');
            opt.value = o.value;
            opt.textContent = o.label;
            themeSel.appendChild(opt);
        });
        themeSel.value = ap.globalButton.theme || 'default';
        themeSel.onchange = () => {
            ap.globalButton.theme = themeSel.value;
            applyAppearance();
        };
        themeRow.appendChild(themeSel);
        panel.appendChild(themeRow);
        // ===== 🍳战斗中状态面板设置 =====
        let cwHeading = document.createElement('div');
        cwHeading.textContent = '🍳战斗中状态面板设置';
        cwHeading.style.cssText = 'font-weight: bold; margin: 20px 0 10px;';
        panel.appendChild(cwHeading);

        if (!ap.ctrlWidget) ap.ctrlWidget = { theme: 'default', separator: ' | ' };

        // 主题
        let cwThemeRow = document.createElement('div');
        cwThemeRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';
        let cwThemeId = getUniqueId('apCwTheme');
        let cwThemeLbl = document.createElement('label');
        cwThemeLbl.htmlFor = cwThemeId;
        cwThemeLbl.textContent = '主题';
        cwThemeLbl.style.cssText = 'min-width: 130px;';
        cwThemeRow.appendChild(cwThemeLbl);

        let cwThemeSel = document.createElement('select');
        cwThemeSel.id = cwThemeId;
        [
            { value: 'default',   label: '默认（浮动面板）' },
            { value: 'bottomBar', label: '底部状态栏' },
        ].forEach(o => {
            let opt = document.createElement('option');
            opt.value = o.value;
            opt.textContent = o.label;
            cwThemeSel.appendChild(opt);
        });
        cwThemeSel.value = ap.ctrlWidget.theme || 'default';
        cwThemeSel.onchange = () => {
            ap.ctrlWidget.theme = cwThemeSel.value;
            applyAppearance();
            rebuildCtrlWidget();
            localStorage.setItem(prefix + 'cfgMissPink' + isekaiSuffix, JSON.stringify(cfgMissPink));
        };
        cwThemeRow.appendChild(cwThemeSel);
        panel.appendChild(cwThemeRow);

        // 分隔符
        let cwSepRow = document.createElement('div');
        cwSepRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';
        let cwSepId = getUniqueId('apCwSep');
        cwSepRow.innerHTML = `
        <label for="${cwSepId}" style="min-width: 130px;">信息分隔符（底部状态栏）</label>
        <input type="text" id="${cwSepId}" style="width: 200px;" placeholder="留空则使用 ' | '">
        `;
        let cwSepInput = cwSepRow.querySelector('input');
        cwSepInput.value = ap.ctrlWidget.separator || '';
        cwSepInput.oninput = () => {
            ap.ctrlWidget.separator = cwSepInput.value || ' | ';
            if (jpxPanelManager.infoDiv) jpxPanelManager.updateContent('battle');
            localStorage.setItem(prefix + 'cfgMissPink' + isekaiSuffix, JSON.stringify(cfgMissPink));
        };
        panel.appendChild(cwSepRow);
        // 状态颜色
        let colorHint = document.createElement('div');
        colorHint.style.cssText = 'margin: 4px 0 8px 140px; color: #888; font-size: 9pt;';
        colorHint.textContent = '（以下颜色仅作用于「底部状态栏」主题；文本颜色会自动按背景明暗计算）';
        panel.appendChild(colorHint);

        const refreshCwColor = () => {
            applyAppearance();
            if (jpxPanelManager.ctrlWidget && jpxPanelManager.currentState) {
                jpxPanelManager.setBackground(jpxPanelManager.currentState);
            }
            localStorage.setItem(prefix + 'cfgMissPink' + isekaiSuffix, JSON.stringify(cfgMissPink));
        };

        addColorRow(panel, '自动时颜色（绿）', ap.ctrlWidget, 'colorAuto', refreshCwColor);
        addColorRow(panel, '错误时颜色（黄）', ap.ctrlWidget, 'colorError', refreshCwColor);
        addColorRow(panel, '不在自动时颜色（白）', ap.ctrlWidget, 'colorManual', refreshCwColor);

        let cwTestRow = document.createElement('div');
        cwTestRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 10px;';
        let cwTestLbl = document.createElement('span');
        cwTestLbl.textContent = '测试效果';
        cwTestLbl.style.cssText = 'min-width: 130px;';
        cwTestRow.appendChild(cwTestLbl);

        [
            { state: 'auto',   label: '🧪自动（绿）' },
            { state: 'error',  label: '🧪错误（黄）' },
            { state: 'manual', label: '🧪手动（白）' },
        ].forEach(({ state, label }) => {
            jpxUtils.createButton(cwTestRow, {
                text: label,
                onClick: () => previewCtrlWidget(state)
            });
        });

        panel.appendChild(cwTestRow);

        // 提示
        let hint = document.createElement('div');
        hint.style.cssText = 'margin-top: 16px; color: #888; font-size: 9pt;';
        hint.textContent = '提示：外观修改会立即生效；若想恢复原始外观，取消勾选"启用自定义外观"。';
        panel.appendChild(hint);
    }

    function renderManagePage() {
        // …（保持上一轮实现不变）
    }

    function renderAll() {
        ensureCfgMissPink();
        renderSoundPage();
        renderAppearancePage();
        renderManagePage();
    }

    renderAll();
    switchSubTab('sound');

    function onConfigImported() {
        if (!document.body.contains(parent)) {
            document.removeEventListener('misspinkConfigImported', onConfigImported);
            return;
        }
        ensureCfgMissPink();
        renderAll();
    }
    document.addEventListener('misspinkConfigImported', onConfigImported);
}


//Misc
function storeTmp() {
    if (log) {
        let btcp = document.querySelector('#btcp');
        let finishBattle = document.querySelector('img[src$="finishbattle.png"]');

        if (!btcp) {
            localStorage.setItem(prefix + 'monsterData' + isekaiSuffix, JSON.stringify(monsterData));
        }
        if (!finishBattle) {
            if (cfgBattle.recordBattleLog) {
                if (Array.isArray(battleLogRecord)) localStorage.setItem(prefix + 'battleLogRecord' + isekaiSuffix, JSON.stringify(battleLogRecord));
                /*patch*/
                else localStorage.removeItem(prefix + 'battleLogRecord' + isekaiSuffix);
            }
            localStorage.setItem(prefix + 'timeRecords' + isekaiSuffix, JSON.stringify(timeRecords));
            localStorage.setItem(prefix + 'combatRecords' + isekaiSuffix, JSON.stringify(combatRecords));
            localStorage.setItem(prefix + 'revenueRecords' + isekaiSuffix, JSON.stringify(revenueRecords));
        }
    }
}

//I18n
function initDoI18n() {
    const mergeI18N = () => {
        Object.assign(mergedI18N, jpxUtils.deepMerge(
            JSON.parse(JSON.stringify(I18N)),
                                                     jpxPageWindow.jpxI18N || {}
        ));
    };

    let externalI18n = jpxPageWindow.jpxI18N;
    Object.defineProperty(jpxPageWindow, 'jpxI18N', {
        get: () => externalI18n,
                          set: (v) => {
                              externalI18n = v;
                              mergeI18N();
                              jpxPanelManager.updateContent();
                          },
                          configurable: true
    });
    mergeI18N();
}

function t(path, args = {}) {
    if (typeof path === 'number' || (!isNaN(path) && !isNaN(parseFloat(path)))) return String(path);
    if (typeof path !== 'string') return path;

    let keys = path.split('.');
    let lastKey = keys.at(-1);
    if (!isNaN(lastKey) && !isNaN(parseFloat(lastKey))) return String(lastKey);

    let text = jpxUtils.getValueByPath(mergedI18N, keys);
    if (text === undefined) text = jpxUtils.sentenceCase(lastKey);

    if (args && typeof args === 'object') {
        for (const prop in args) {
            text = text.split('${' + prop + '}').join(String(args[prop]));
        }
    }

    return text;
}

//Panel
function jpxPanelManager(panelType) {
    const ns = jpxPanelManager;
    if (ns._init) return ns;

    ns.ready = true;
    ns.currentType = panelType;

    ns.createCtrlWidget = function(type) {
        if (ns.ctrlWidget) {
            !document.querySelector('#ctrl-widget') && document.body.appendChild(ns.ctrlWidget);
            return;
        }
        ns.currentType = type || ns.currentType;
        ns.ctrlWidget = document.createElement('div');
        ns.ctrlWidget.id = 'ctrl-widget';
        if (cfgBattle.ctrlWidgetStyleText) ns.ctrlWidget.style.cssText = cfgBattle.ctrlWidgetStyleText;
        ns.infoDiv = document.createElement('div');

        let theme = 'default';
        try {
            ensureCfgMissPink();
            theme = cfgMissPink.appearance?.ctrlWidget?.theme || 'default';
        } catch (e) {}

        switch (ns.currentType) {
            case 'battle': {
                const throttledToggleBattle = jpxUtils.throttle(toggleActive, 200);
                ns.ctrlWidget.addEventListener('pointerdown', (e) => {
                    if (e.pointerType === 'mouse' && e.button !== 0) return;
                    throttledToggleBattle();
                });
                if (cfgBattle.ctrlWidgetMouseEnter) {
                    ns.ctrlWidget.addEventListener('mouseenter', (e) => {
                        if (!ns.ready) return;
                        throttledToggleBattle();
                    });
                }

                let battleRecordDiv = document.createElement('div');
                battleRecordDiv.className = 'ctrl-widget-stats-btn';
                battleRecordDiv.textContent = theme === 'bottomBar' ? '📊打开实时统计' : t('cW.openStats');
                if (theme !== 'bottomBar') {
                    battleRecordDiv.style.cssText = 'background:#bbb; border:1px solid #000;';
                }
                battleRecordDiv.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
                    battleRecordPlayer(false);
                });
                ns.ctrlWidget.appendChild(battleRecordDiv);

                if (theme !== 'bottomBar') {
                    let settingsDiv = document.createElement('div');
                    settingsDiv.className = 'ctrl-widget-settings-btn';
                    settingsDiv.textContent = t('cW.openSettings');
                    settingsDiv.style.cssText = 'background:#bbb; border:1px solid #000;';
                    settingsDiv.addEventListener('pointerdown', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                            let proficiencyRecord = document.querySelector('#proficiency-record');
                            if (proficiencyRecord) proficiencyRecord.style.left = '800px';
                        }
                        renderSettings();
                    });
                    ns.ctrlWidget.appendChild(settingsDiv);
                }

                break;
            }
        }

        ns.ctrlWidget.prepend(ns.infoDiv);
        document.body.appendChild(ns.ctrlWidget);
        ns.setBackground(isActiveBattle ? '#4f4' : '#fef');
        ns.dispatchState();
    };

    ns.updateContent = function(type) {
        if (!ns.infoDiv) return;
        ns.currentType = type || ns.currentType;
        switch (ns.currentType) {
            case 'battle': {
                let theme = 'default';
                let separator = ' | ';
                try {
                    theme = cfgMissPink.appearance?.ctrlWidget?.theme || 'default';
                    separator = cfgMissPink.appearance?.ctrlWidget?.separator || ' | ';
                } catch (e) {}

                let lines = cfgBattle.ctrlWidgetRows
                .map(row => {
                    let field = CTRLWIDGET_FIELDS.find(f => f.id === row.id);
                    return field ? `${t(field.label)}: ${field.get()}` : null;
                })
                .filter(line => line !== null);

                if (theme === 'bottomBar') {
                    ns.infoDiv.innerText = lines.join(separator);
                } else {
                    ns.infoDiv.innerText = lines.join('\n');
                }
                break;
            }
        }
    };
    ns.getStateColor = function(state) {
        let theme = 'default';
        let cw = {};
        try {
            ensureCfgMissPink();
            theme = cfgMissPink.appearance?.ctrlWidget?.theme || 'default';
            cw = cfgMissPink.appearance?.ctrlWidget || {};
        } catch (e) {}

        if (theme !== 'bottomBar') {
            return state === 'auto' ? '#4f4'
            : state === 'error' ? '#ff5'
            : '#fef';
        }
        return state === 'auto' ? (cw.colorAuto || '#44ff44')
        : state === 'error' ? (cw.colorError || '#ffff55')
        : (cw.colorManual || '#ffffff');
    };

    ns.setBackground = function(colorOrState) {
        if (!ns.ctrlWidget) return;

        const stateMap = { '#4f4': 'auto', '#ff5': 'error', '#fef': 'manual' };
        let state = stateMap[colorOrState] ||
        (['auto', 'error', 'manual'].includes(colorOrState) ? colorOrState : null);
        ns.currentState = state;
        let color = state ? ns.getStateColor(state) : colorOrState;

        ns.ctrlWidget.style.background = color;

        let theme = 'default';
        try {
            theme = cfgMissPink.appearance?.ctrlWidget?.theme || 'default';
        } catch (e) {}

        if (theme === 'bottomBar') {
            let textColor = _isLight(color) ? '#222222' : '#eeeeee';
            ns.ctrlWidget.style.color = textColor;
            if (ns.infoDiv) ns.infoDiv.style.color = textColor;
            let statsBtn = ns.ctrlWidget.querySelector('.ctrl-widget-stats-btn');
            if (statsBtn) statsBtn.style.color = textColor;
        }
    };

    ns.dispatchState = function() {
        setTimeout(()=> {
            jpxPageWindow.dispatchEvent(new CustomEvent('jpx_ctrlWidget_update', {
                detail: {
                    active: isActiveBattle,
                    background: ns.ctrlWidget?.style.background,
                    suffix: isekaiSuffix,
                    timestamp: Date.now()
                }
            }));
        }, 0);
    };

    ns._init = true;
    return ns;
}

//Market
function jpxMarket() {
    const ns = jpxMarket;
    if (ns._init) return ns;

    ns.defaultPriceData = {
        //Stamina
        'Energy Drink': 400,

        //Material
        'Low-Grade Cloth': 2, 'Mid-Grade Cloth': 10, 'High-Grade Cloth': 50,
        'Low-Grade Leather': 2, 'Mid-Grade Leather': 10, 'High-Grade Leather': 50,
        'Low-Grade Metals': 2, 'Mid-Grade Metals': 10, 'High-Grade Metals': 50,
        'Low-Grade Wood': 2, 'Mid-Grade Wood': 10, 'High-Grade Wood': 50,
        'Scrap Cloth': 1, 'Scrap Leather': 1, 'Scrap Metal': 1, 'Scrap Wood': 1,
        'Energy Cell': 2,

        //Consumable
        //    Restorative
        'Health Draught': 1, 'Health Potion': 2, 'Health Elixir': 20,
        'Mana Draught': 2, 'Mana Potion': 4, 'Mana Elixir': 40,
        'Spirit Draught': 2, 'Spirit Potion': 4, 'Spirit Elixir': 40,
        'Last Elixir': 40,
        //    Infusion
        'Infusion of Flames': 8, 'Infusion of Frost': 8, 'Infusion of Storms': 8, 'Infusion of Lightning': 8, 'Infusion of Divinity': 8, 'Infusion of Darkness': 8,
        //    Scroll
        'Scroll of Swiftness': 8, 'Scroll of Protection': 8, 'Scroll of the Avatar': 20,
        'Scroll of Absorption': 4, 'Scroll of Shadows': 8, 'Scroll of Life': 12, 'Scroll of the Gods': 32,
        //    Shard
        'Voidseeker Shard': 10, 'Aether Shard': 50, 'Featherweight Shard': 10, 'Amnesia Shard': 50, 'World Seed': 50,
        //    Special Item
        'Flower Vase': 200, 'Bubble-Gum': 200,

        //Token of Blood, Chaos Token, Soul Fragment
        'Token of Blood': 0, 'Chaos Token': 0, 'Soul Fragment': 0,

        //Food
        'Monster Chow': 1, 'Monster Edibles': 1, 'Monster Cuisine': 1, 'Happy Pills': 10,

        //Figurine
        'Twilight Sparkle Figurine': 10000, 'Rainbow Dash Figurine': 10000, 'Applejack Figurine': 10000, 'Fluttershy Figurine': 10000,
        'Pinkie Pie Figurine': 10000, 'Rarity Figurine': 10000, 'Trixie Figurine': 10000, 'Princess Celestia Figurine': 10000,
        'Princess Luna Figurine': 10000, 'Apple Bloom Figurine': 10000, 'Scootaloo Figurine': 10000, 'Sweetie Belle Figurine': 10000,
        'Big Macintosh Figurine': 10000, 'Spitfire Figurine': 10000, 'Derpy Hooves Figurine': 10000, 'Lyra Heartstrings Figurine': 10000,
        'Octavia Figurine': 10000, 'Zecora Figurine': 10000, 'Cheerilee Figurine': 10000, 'Vinyl Scratch Figurine': 10000,
        'Daring Do Figurine': 10000, 'Doctor Whooves Figurine': 10000, 'Berry Punch Figurine': 10000, 'Bon-Bon Figurine': 10000,
        'Fluffle Puff Figurine': 10000, 'Angel Bunny Figurine': 10000, 'Gummy Figurine': 10000,

        //Artifacts
        'Precursor Artifact': 2000,

        //Trophy
        'ManBearPig Tail': 200, 'Holy Hand Grenade of Antioch': 200, "Mithra's Flower": 200, 'Dalek Voicebox': 200, 'Lock of Blue Hair': 200,
        'Bunny-Girl Costume': 400, 'Hinamatsuri Doll': 400, 'Broken Glasses': 400,
        'Black T-Shirt': 800, 'Sapling': 800,
        'Unicorn Horn': 1000,
        'Noodly Appendage': 1000,

        //Crystal
        'Crystal of Vigor': 1, 'Crystal of Finesse': 1, 'Crystal of Swiftness': 1, 'Crystal of Fortitude': 1, 'Crystal of Cunning': 1, 'Crystal of Knowledge': 1,
        'Crystal of Flames': 1, 'Crystal of Frost': 1, 'Crystal of Lightning': 1, 'Crystal of Tempest': 1, 'Crystal of Devotion': 1, 'Crystal of Corruption': 1,

        //Upgrade Material
        'Wispy Catalyst': 1, 'Diluted Catalyst': 5, 'Regular Catalyst': 10, 'Robust Catalyst': 25, 'Vibrant Catalyst': 50, 'Coruscating Catalyst': 100,
    }

    ns.getMarketPrice = async function (update = true) {
        let priceData = JSON.parse(localStorage.getItem(prefix + 'priceData' + isekaiSuffix) || '{}');
        if (!update) return priceData.lastUpdate ? priceData : ns.defaultPriceData;

        let currentDate = new Date().toISOString().slice(0, 10);
        if (
            !priceData?.lastUpdate ||
            new Date(priceData.lastUpdate).toISOString().slice(0, 10) != currentDate
        ) {
            priceData = await this.updatePrice(priceData);
        }

        return priceData;
    };

    ns.updatePrice = async function (priceData) {
        let finishBattle = document.querySelector('img[src$="finishbattle.png"]');
        let isekaiSuffixUrl = document.URL.includes('isekai') ? 'isekai/' : '';
        let urlArray = [
            `${location.origin}/${isekaiSuffixUrl}?s=Bazaar&ss=mk&screen=browseitems&filter=co`,
            `${location.origin}/${isekaiSuffixUrl}?s=Bazaar&ss=mk&screen=browseitems&filter=ma`,
            `${location.origin}/${isekaiSuffixUrl}?s=Bazaar&ss=mk&screen=browseitems&filter=tr`,
        ];
        if (!isekaiSuffix) {
            urlArray = urlArray.concat([
                `${location.origin}/?s=Bazaar&ss=mk&screen=browseitems&filter=ar`,
                `${location.origin}/?s=Bazaar&ss=mk&screen=browseitems&filter=fi`,
                `${location.origin}/?s=Bazaar&ss=mk&screen=browseitems&filter=mo`,
            ]);
        }
        let latestPriceData = {};

        if (!log || finishBattle) {
            priceData['lastUpdate'] = Date.now();
            await jpxUtils.xhrGet(urlArray).then((results) => {
                console.log('jpxUtils.xhrGet Results:');
                console.log(results);
                for (let result of results){
                    if (result.status === 'rejected') {
                        console.error(result.reason);
                        break;
                    }
                    try {
                        let parser = new DOMParser();
                        let doc = parser.parseFromString(result.value.responseText, 'text/html');
                        let itemListTrs = doc.querySelectorAll('#market_itemlist > table > tbody > tr');

                        itemListTrs.forEach((itemListTr, index) => {
                            if (index === 0) return;

                            let itemListTds = itemListTr.querySelectorAll('td');
                            if (itemListTds.length >= 4) {
                                let name = itemListTds[0].textContent.trim();
                                let bid = parseFloat(itemListTds[2].textContent.trim().replace(' C', '').replace(',', ''));
                                let defaultBid = ns.defaultPriceData[name];

                                if (!isNaN(bid)) {
                                    if (!isNaN(defaultBid)) {
                                        if (bid >= defaultBid) {
                                            latestPriceData[name] = bid;
                                        } else {
                                            latestPriceData[name] = defaultBid;
                                        }
                                    } else {
                                        latestPriceData[name] = bid;
                                    }
                                } else if (!isNaN(defaultBid)) {
                                    latestPriceData[name] = defaultBid;
                                }
                            }
                        });
                    } catch (e) {
                        console.error('Parsing error for url: ' + result.value.url);
                    }
                }
            });
        }

        for (let latestPriceDataKey in latestPriceData) {
            priceData[latestPriceDataKey] = latestPriceData[latestPriceDataKey];
        }
        for (let defaultPriceDataKey in ns.defaultPriceData) {
            if (!priceData[defaultPriceDataKey]) {
                priceData[defaultPriceDataKey] = ns.defaultPriceData[defaultPriceDataKey];
            }
        }
        if (isekaiSuffix) {
            priceData['Energy Drink'] = 0;
        }

        localStorage.setItem(prefix + 'priceData' + isekaiSuffix, JSON.stringify(priceData));

        return priceData;
    };

    ns._init = true;
    return ns;
}

//Utils
function jpxUtils() {
    const ns = jpxUtils;
    if (ns._init) return ns;

    ns.throttle = function (func, cooldownMillis, trailing = false) {
        let lastRan = 0;
        let timeoutId = null;
        let trailingThis = null;
        let trailingArgs = null;

        return (...args) => {
            if (Date.now() - lastRan > cooldownMillis) {
                lastRan = Date.now();
                func.call(this, ...args);
            } else if (trailing) {
                trailingThis = this;
                trailingArgs = args;
                if (!timeoutId) {
                    timeoutId = setTimeout(() => {
                        lastRan = Date.now();
                        timeoutId = null;
                        func.call(trailingThis, ...trailingArgs);
                    }, cooldownMillis - (Date.now() - lastRan));
                }
            }
        };
    };

    ns.secondsToTime = function (seconds, showMillisecond = false) {
        let tHours = Math.floor(seconds / 3600);
        let tMinutes = Math.floor(seconds / 60) % 60;
        let tSeconds = showMillisecond ? Math.floor(seconds % 60) : Math.round(seconds % 60);
        let time =
        tHours.toString().padStart(2, '0') + ':' +
        tMinutes.toString().padStart(2, '0') + ':' +
        tSeconds.toString().padStart(2, '0');

        if (showMillisecond) {
            let tMilliseconds = seconds.toFixed(3).split('.')[1];
            time += '.' + tMilliseconds;
        }

        return time;
    };

    ns.daysSince = function(dateStr) {
        if (!dateStr) return null;
        let date = new Date(dateStr + 'T00:00:00Z');
        if (isNaN(date)) return null;

        let now = new Date();
        let today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        return Math.floor((today - date) / (1000 * 60 * 60 * 24));
    };

    ns.getSortedArray = function(arr, getValue, asc = true) {
        if (!Array.isArray(arr) || !arr.length) return [];

        if (typeof getValue !== 'function') getValue = (item) => item;

        return [...arr].sort((a, b) => {
            let va = getValue(a);
            let vb = getValue(b);
            return asc ? va - vb : vb - va;
        });
    };

    ns.lowerFirst = function (str) {
        if (!str) return str;
        return str.charAt(0).toLowerCase() + str.slice(1);
    };

    ns.titleCase = function (str, multiWord = false) {
        if (!str) return str;
        if (!multiWord && /\s/.test(str)) return str;
        return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    };

    ns.sentenceCase = function (str, multiWord = false) {
        if (!str) return str;
        if (!multiWord && /\s/.test(str)) return str;
        return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/^./, c => c.toUpperCase());
    };

    ns.matchAny = function (str, ...regexps) {
        for (const regexp of regexps) {
            let matches = str.match(regexp);
            if (matches) {
                return matches;
            }
        }
        return null;
    };

    ns.parseValue = (val) => {
        if (typeof val === 'string' && val.trim() !== '' && !isNaN(val)) return Number(val);
        return val;
    };

    ns.isEmpty = function (obj) {
        if (!obj || typeof obj !== 'object') return true;
        for (const prop in obj) {
            if (Object.hasOwn(obj, prop)) return false;
        }

        return true;
    };

    ns.inRange = function (value, range) {
        let [min, max] = range;
        return value >= min && value <= max;
    };

    ns.getValueByPath = function(obj, keys) {
        let current = obj;
        for (const key of keys) {
            if (current[key] === undefined) return undefined;
            current = current[key];
        }
        return current;
    };

    ns.deepMerge = function (target, source) {
        if (!source) return target;
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], ns.deepMerge(target[key], source[key]));
            }
        }
        Object.assign(target || {}, source);
        return target;
    };
    ns.deepFillMissing = function (target, defaults) {
        if (!target || typeof target !== 'object') return;
        for (const key in defaults) {
            if (target[key] === undefined || target[key] === null) {
                target[key] = JSON.parse(JSON.stringify(defaults[key]));
            } else if (
                typeof defaults[key] === 'object' && !Array.isArray(defaults[key]) &&
                typeof target[key] === 'object' && !Array.isArray(target[key])
            ) {
                ns.deepFillMissing(target[key], defaults[key]);
            }
        }
    };

    ns.getSortedKeys = function(order, keys) {
        let sortedKeys = order.filter(key => keys.includes(key));
        let extraKeys = keys.filter(key => !order.includes(key));
        return [...sortedKeys, ...extraKeys];
    };

    ns.inc = function (obj, key, step = 1) {
        if (!obj || key == null) return;
        obj[key] = (obj[key] ?? 0) + (step || 0);
    };

    ns.createButton = function (container, options) {
        let { id, className, cssText, text, disabled, onClick } = options;

        let btn = document.createElement('button');
        if (id) btn.id = id;
        if (className) btn.className = className;
        if (cssText) btn.style.cssText = cssText;
        if (text) btn.textContent = text;
        if (disabled) btn.disabled = true;
        container.appendChild(btn);

        if (onClick) {
            btn.addEventListener('click', (e) => {
                let result = onClick(btn, e);

                const handleTempText = (tempText) => {
                    if (!tempText) return;
                    let originalText = btn.textContent;
                    btn.style.width = btn.offsetWidth + 'px';
                    btn.textContent = tempText;
                    btn.disabled = true;

                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.style.width = '';
                        btn.disabled = false;
                    }, 1500);
                };

                if (result instanceof Promise) result.then(handleTempText).catch(handleTempText);
                else handleTempText(result);
            });
        }

        return btn;
    };

    ns.createToast = function(content, duration = 3000, styleName) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position: fixed; right: 16px; bottom: 16px; display: flex; flex-direction: column-reverse; gap: 8px; z-index: 99999;';
            document.body.appendChild(container);
        }

        let toast = document.createElement('div');
        toast.textContent = content;
        toast.style.cssText = 'padding: 10px 14px; background: #333; color: #fff; font-size: 14px; cursor: pointer; opacity: 0; transition: opacity .2s;';
        if (styleName) toast.className = styleName;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.style.opacity = '1');

        const close = () => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 200);
        };

        toast.addEventListener('pointerdown', close);
        setTimeout(close, duration);

        return toast;
    };

    ns.stringifyLimited = function(obj, maxPrettyLevel = 3) {
        function helper(value, level) {
            if (value && typeof value === 'object') {
                const isArray = Array.isArray(value);
                const entries = isArray ? value : Object.entries(value);

                if (level < maxPrettyLevel) {
                    if (isArray) {
                        return '[\n' +
                        value.map(value => '\t'.repeat(level + 1) + helper(value, level + 1))
                        .join(',\n') + '\n' +
                        '\t'.repeat(level) + ']';
                    } else {
                        return '{\n' +
                        Object.entries(value)
                        .map(([key, value]) => '\t'.repeat(level + 1) + JSON.stringify(key) + ': ' + helper(value, level + 1))
                        .join(',\n') + '\n' +
                        '\t'.repeat(level) + '}';
                    }
                } else {
                    return JSON.stringify(value);
                }
            } else {
                return JSON.stringify(value);
            }
        }

        return helper(obj, 0);
    };

    ns.toRegExp = function(input) {
        let match = input.match(/^\/(.*?)\/([dgimsuvy]*)$/);

        if (match) {
            let [, pattern, flags] = match;
            try {
                return new RegExp(pattern, flags);
            } catch (e) {
                console.error('Invalid regex syntax:', e.message);
                return null;
            }
        }

        return new RegExp(input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    };

    ns.keyCaptureController = null;
    ns.captureKeyCombo = function(onComplete, onAbort) {
        if (ns.keyCaptureController) ns.keyCaptureController.abort();
        let currentController = new AbortController();
        ns.keyCaptureController = currentController;
        let signal = currentController.signal;

        window.addEventListener('keydown', (e) => {
            e.preventDefault();
            if (e.key === 'Escape') { currentController.abort(); return; }
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

            let result = {
                key: e.key,
                ctrl: e.ctrlKey,
                alt: e.altKey,
                shift: e.shiftKey,
                comboString: '',
            };
            result.comboString = ns.formatKeyCombo(result, '+');

            currentController.abort();
            if (onComplete) onComplete(result);
        }, { signal });
            window.addEventListener('pointerdown', () => {
                currentController.abort();
            }, { signal, once: true });

            signal.addEventListener('abort', () => {
                if (ns.keyCaptureController === currentController) ns.keyCaptureController = null;
                if (onAbort) onAbort();
            });
    };

    ns.formatKeyCombo = function(input, separator = '+') {
        if (input == null) return 'Unassigned';

        let key, ctrl, alt, shift;
        if (typeof input === 'string') {
            let pureKey = input.startsWith('kb_') ? input.slice(3) : input;
            let isPlusKey = pureKey === '+' || pureKey.endsWith('++');
            let parts = pureKey.split('+');
            key = isPlusKey ? '+' : parts.pop();
            ctrl = parts.includes('Ctrl');
            alt = parts.includes('Alt');
            shift = parts.includes('Shift');
        } else {
            ({ key, ctrl, alt, shift } = input);
        }

        let result = [];
        if (ctrl) result.push('Ctrl');
        if (alt) result.push('Alt');
        if (shift) result.push('Shift');
        result.push(key === ' ' ? 'SPACE' : key.toUpperCase());
        return result.join(separator);
    };

    ns.parseHVClasses = function (container, preserveSmallWords = false){
        let content = [...container?.children]
        .map(div => {
            const HVClasses = {
                '2a': '.', '2b': ',', '2c': '!', '2d': '?', '2e': '%', '2f': '+', '2g': '-', '2h': '=', '2i': '/', '2j': '\\',
                '2k': "'", '2l': '"', '2m': ':', '2n': ';', '2o': '(', '2p': ')', '2q': '[', '2r': ']', '2s': '_', '39': ' ',
            };

            let key = div.className.slice(-2);
            return HVClasses[key] ?? div.className.slice(-1);
        })
        .join('')
        .toLowerCase()
        .split(' ')
        .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : word)
        .join(' ');

        if (preserveSmallWords) {
            let smallWords = ['Of', 'The'];
            let regex = new RegExp(`(?<!^)\\b(${smallWords.join('|')})\\b(?<!$)`, 'g');
            content = content.replace(regex, match => match.toLowerCase());
        }

        return content;
    };

    ns.createTimeRecords = function() {
        return {
            action: 0,
            turn: 0,
            riddle: { lastTurn: -1, solved: 0, total: 0 },
            lastUse: {}
        };
    };

    ns.createCombatRecords = function() {
        return {
            use: {},
            physicalDealt: { glance:0, hit:0, crit:0, miss:0, evade:0, parryPartially:0, parry:0 },
            magicalDealt: { glance:0, hit:0, crit:0, miss:0, evade:0, resist50:0, resist75:0, resist90:0, resistPartially:0, resist:0 },
            physicalTaken: { glance:0, hit:0, crit:0, miss:0, evade:0, parryPartially:0, parry:0, blockPartially:0, block:0 },
            magicalTaken: { glance:0, hit:0, crit:0, miss:0, evade:0, resist50:0, resist75:0, resist90:0, resistPartially:0, resist:0, blockPartially:0, block:0 },
        };
    };

    ns.createRevenueRecords = function() {
        return {
            exp: 0,
            credit: 0,
            proficiency: {},
            equipment: {},
            material: {},
            consumable: {},
            token: {},
            food: {},
            figurine: {},
            artifact: {},
            trophy: {},
            crystal: {},
            staminaCost: 0,
            totalProfit: 0,
            finalProfit: 0,
        };
    };

    ns.xhrGet = async function(urlArray, interval = 250) {
        let promises = [];
        urlArray.forEach((url, index) => {
            const promise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    let xhr = new XMLHttpRequest();
                    xhr.open('GET', url, true);
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            resolve({
                                url: url,
                                responseText: xhr.responseText,
                            });
                        } else {
                            reject('Failed to load: ' + url);
                        }
                    };
                    xhr.onerror = () => {
                        reject('XHR error for URL: ' + url);
                    };
                    xhr.send();
                }, index * interval);
            });
            promises.push(promise);
        });

        return Promise.allSettled(promises);
    };

    ns._init = true;
    return ns;
}

const JPX_CONFIG_BUTTON_CSS = `
.JPXconfigButton_mp{top:4px;left:1238px;position:absolute;z-index:10000;cursor:pointer;width:24px;height:24px;background:url(
    https://img.qijieya.cn/thumbnails/94680af4edba60abb45d643899d22f6a.png) center no-repeat transparent;background-size:cover;background-color:#000;border-radius:50%;transition:all 0.5s ease;overflow:hidden;box-shadow:0 0 0 1px rgba(255,215,0,0.2);}
    .JPXconfigButton_mp::before{content:"";position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle at center,rgba(255,215,0,0.8) 0%,transparent 70%);border-radius:50%;animation:goldenPulse 2s infinite alternate;z-index:1;}
    @keyframes goldenPulse{0%{opacity:0.7;transform:scale(1);}50%{opacity:0.9;transform:scale(1.1);}100%{opacity:0.8;transform:scale(1.05);}}
    .JPXconfigButton_mp:hover{transform:rotate(360deg) scale(1.2);box-shadow:0 0 10px 3px rgba(255,215,0,0.8);background-color:#111;}
    .JPXconfigButton_mp:hover::before{animation:none;opacity:0.95;background:radial-gradient(circle at center,rgba(255,215,0,0.95) 0%,transparent 60%);transform:scale(1.15);}
    `;

    function appendConfigButton() {
        if (document.getElementById('JPXconfigButtojn_mp')) return;

        let style = document.createElement('style');
        style.id = 'JPXconfigButton_mp-style';
        style.textContent = JPX_CONFIG_BUTTON_CSS;
        document.head.appendChild(style);

        let btn = document.createElement('div');
        btn.id = 'JPXconfigButton_mp';
        btn.className = 'JPXconfigButton_mp';
        btn.title = 'jpx 设置';
        btn.addEventListener('click', () => renderSettings());
        document.body.appendChild(btn);
    }

    initDo();
