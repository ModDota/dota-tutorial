declare const enum SectionName {
    Opening = "Opening",
    CameraUnlock = "CameraUnlock",
    Leveling = "Leveling",
    Casting = "Casting",

    Chapter3_Opening = "Chapter3_Opening",
}

declare const enum CustomNpcKeys {
    SlacksMudGolem = "npc_mud_golem_slacks",
    SunsFanMudGolem = "npc_mud_golem_sunsfan",
    TargetDummy = "npc_target_dummy",
}

type Goal = {
    text: string
    completed: boolean
}

interface DialogData {
    text: string;
    advanceTime: number;
    sendToAll: boolean;
    advance: boolean;
    gesture: GameActivity;
    forceBreak?: boolean;
    skipFacePlayer?: boolean;
    dialogStopsMovement?: boolean;
    sound?: string;
}

interface UnitDialog {
    currentLine: number;
    lines: DialogData[];
}
