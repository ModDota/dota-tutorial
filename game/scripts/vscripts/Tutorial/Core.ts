/**
 * Tutorial section that contains logic for a single section of the tutorial. Should also
 * be able to handle setup and cleanup of its state.
 */
export abstract class Section {
    /**
     * Creates a section.
     * @param name Name of the section.
     */
    constructor(public readonly name: string) {

    }

    /**
     * Called when the section should start. Should contain the main logic for the section. Should call complete when done.
     */
    public abstract start: (complete: () => void) => void

    /**
     * Called when we want to set up the state for this section when skipping to it (ie. when the assumptions it makes about the preceding
     * sections are possibly false such as a hero being alive).
     */
    public abstract setupState: () => void

    /**
     * Called when we want this section to stop. Should stop any progress as well as clean up any resources (eg. remove any spawned units or clean up timers).
     */
    public abstract stop: () => void
}

/**
 * Functional implementation of section that gets start, setupState and stop passed on construction.
 */
export class FunctionalSection extends Section {
    /**
     * Creates a section given its functions.
     * @param name Name of the section.
     * @param start start function of the section. See Section.start.
     * @param setupState setupState function of the section. See Section.setupState.
     * @param stop stop function of the section. See Section.stop.
     */
    constructor(public readonly name: string,
        public readonly start: (complete: () => void) => void,
        public readonly setupState: () => void,
        public readonly stop: () => void) {
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
     * Starts the tutorial. Can be called while already started to stop the current section and start the new one.
     * @param sectionIndex Section to start at. If not passed starts with the first section. If passed also calls setupState on that section before starting it.
     */
    public start(sectionIndex?: number) {
        // Stop the current section to make sure any progress is stopped and cleaned up.
        print("Stopping current section")
        if (this.currentSection) {
            this.currentSection.stop()
        }

        // Allow starting from a specific section. If one was passed we want
        // to also setup the state for it. Otherwise we just start from the beginning
        // and assume we don't need any setup.
        if (sectionIndex === undefined) {
            sectionIndex = 0
        } else {
            this.sections[sectionIndex].setupState()
        }

        const startSection = (i: number) => {
            this._currentSection = this.sections[i]
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
