interface SkipToSectionEvent {
    section: SectionName;
}

interface SectionStartedEvent {
    section: SectionName;
}

interface CustomGameEventDeclarations {
    section_started: SectionStartedEvent;
    skip_to_section: SkipToSectionEvent;
    ui_loaded: {};
}