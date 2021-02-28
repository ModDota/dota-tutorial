declare const enum SectionName {
    Opening = "Opening",
    CameraUnlock = "CameraUnlock",
    Leveling = "Leveling",
    Casting = "Casting",
}

declare const enum CustomNpcKeys {
    SlacksMudGolem = "npc_mud_golem_slacks",
    SunsFanMudGolem = "npc_mud_golem_sunsfan",
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
