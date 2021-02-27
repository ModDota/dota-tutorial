declare const enum SectionName {
    Opening = "Opening",
    CameraUnlock = "CameraUnlock",
    Leveling = "Leveling",
    Casting = "Casting",
    Chapter2Opening = "Chapter2 Opening"
}

declare const enum CustomNpcKeys {
    SlacksMudGolem = "npc_mud_golem_slacks",
    SunsFanMudGolem = "npc_mud_golem_sunsfan",
    DireRangedCreep = "npc_dota_tutorial_dire_ranged_creep",
    DireMeleeCreep = "npc_dota_tutorial_dire_melee_creep",
    RadiantRangedCreep = "npc_dota_tutorial_radiant_ranged_creep",
    RadiantMeleeCreep = "npc_dota_tutorial_radiant_melee_creep"
}

type Goal = {
    text: string
    completed: boolean
}
