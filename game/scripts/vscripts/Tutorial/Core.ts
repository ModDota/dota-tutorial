import { RequiredState } from "./RequiredState"
import { setupState } from "./SetupState"

/**
 * Tutorial section that contains logic for a single section of the tutorial. Should also
 * be able to handle setup and cleanup of its state.
 */
export abstract class Section {
    /**
     * Creates a section.
     * @param name Name of the section.
     */
    constructor(public readonly name: SectionName) {

    }

    /**
     * State the game needs to be in and will be put in before starting this section.
     */
    public abstract requiredState: RequiredState

    public start(complete: () => void) {
        CustomGameEventManager.Send_ServerToAllClients("section_started", { section: this.name });
        this.onStart(complete);
    }

    /**
     * Called when the section should start. Should contain the main logic for the section. Should call complete when done.
     */
    public abstract onStart: (complete: () => void) => void

    /**
     * Called when we want this section to stop. Should stop any progress as well as clean up any resources (eg. remove any spawned units or clean up timers).
     */
    public abstract onStop: () => void

    public orderFilter?(event: ExecuteOrderFilterEvent) {
        return true;
    }
}

/**
 * Functional implementation of section that gets start, setupState and stop passed on construction.
 */
export class FunctionalSection extends Section {
    /**
     * Creates a section given its functions.
     * @param name Name of the section.
     * @param requiredState State the game needs to be in and will be put in before starting this section.
     * @param onStart Start function of the section. See Section.onStart.
     * @param onStop Stop function of the section. See Section.onStop.
     * @param orderFilter? Access the order filter
     */
    constructor(public readonly name: SectionName,
        public readonly requiredState: RequiredState,
        public readonly onStart: (complete: () => void) => void,
        public readonly onStop: () => void,
        public readonly orderFilter?: (event: ExecuteOrderFilterEvent) => boolean) {
        super(name)
    }
}

export class Tutorial {
    private _currentSection: Section | undefined = undefined

    /**
     * Whether the tutorial is in progress and a section is currently started.
     */
    get isInProgress() {
        return this._currentSection !== undefined
    }

    /**
     * Current section in progress if any.
     */
    get currentSection() {
        return this._currentSection
    }

    /**
     * Creates a tutorial from its sections.
     * @param sections Sections contained in the tutorial. Executed sequentially.
     */
    constructor(private readonly sections: Section[]) {

    }

    /**
     * Starts the tutorial. Can be called while already started to stop the current section and start the new one. Also calls setupState with the new section's required state before starting it.
     * @param sectionIndex Section to start at. If not passed starts with the first section.
     */
    public start(sectionIndex?: number) {
        // Stop the current section to make sure any progress is stopped and cleaned up.
        if (this.currentSection) {
            print("Stopping current section with name", this.currentSection.name)
            this.currentSection.onStop()
        }

        // If no section index was passed, start from the beginning.
        if (sectionIndex === undefined) {
            sectionIndex = 0
        }

        const startSection = (i: number) => {
            this._currentSection = this.sections[i]
            setupState(this._currentSection.requiredState)
            print("Starting section", i)

            if (i + 1 >= this.sections.length) {
                this._currentSection.start(() => {
                    print("Done with all tutorial sections")
                    this._currentSection = undefined
                    // TODO: End the game? Call some callback?
                })
            } else {
                this._currentSection.start(() => {
                    startSection(i + 1)
                })
            }
        }

        startSection(sectionIndex)
    }

    /**
     * Starts a section of the tutorial given its name. Can be called while already started to stop the current section and start the new one.
     * @param sectionName Name of the section to start.
     */
    public startBySectionName(sectionName: string) {
        const sectionIndex = this.sections.findIndex(section => section.name === sectionName)
        if (sectionIndex != -1) {
            this.start(sectionIndex)
        } else {
            error("Could not find section with name " + sectionName)
        }
    }
}
