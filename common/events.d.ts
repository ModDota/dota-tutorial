interface SkipToSectionEvent {
    section: SectionName;
}

interface SectionStartedEvent {
    section: SectionName;
}

interface SetGoalsEvent {
    goals: Goal[];
}

interface DialogReceivedEvent {
    DialogText: string;
    DialogEntIndex: EntityIndex;
    DialogAdvanceTime: number;
}

interface DetectCommandEvent {
    command: number; //DOTAKeybindCommand_t
}

interface CommandDetectedEvent {
    command: number; //DOTAKeybindCommand_t
}

interface DetectModifierKeyEvent {
    key: ModifierKey;
}

interface ModifierKeyDetectedEvent {
    key: ModifierKey;
}

interface ClockTimeEvent {
    seconds: number;
    minutes?: number;
}

interface HighlightElementEvent {
    path: string;
    duration?: number;
    setElementAsParent?: boolean;
}

interface RemoveHighlightEvent {
    path: string;
}

interface ChatWheelPhraseSelectedEvent {
    phraseIndex: number;
}

interface ShopOpenChangedEvent {
    open: boolean;
}

interface CustomGameEventDeclarations {
    section_started: SectionStartedEvent;
    skip_to_section: SkipToSectionEvent;
    dialog_complete: {};
    dialog: DialogReceivedEvent;
    dialog_clear: {};
    ui_loaded: {};
    detect_camera_movement: {};
    camera_movement_detected: {};
    set_goals: SetGoalsEvent;
    detect_command: DetectCommandEvent;
    command_detected: CommandDetectedEvent;
    detect_modifier_key: DetectModifierKeyEvent;
    modifier_key_detected: ModifierKeyDetectedEvent;
    set_client_clock: ClockTimeEvent;
    highlight_element: HighlightElementEvent;
    remove_highlight: RemoveHighlightEvent;
    chat_wheel_phrase_selected: ChatWheelPhraseSelectedEvent;
    shop_open_changed: ShopOpenChangedEvent;
}
