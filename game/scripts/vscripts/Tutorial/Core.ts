export type Section = {
    name: string
    start: (complete: () => void) => void
    setupState: () => void
}

export const createSection = (name: string, start: (complete: () => void) => void, setupState: () => void): Section => {
    return { name, start, setupState }
}

export type Tutorial = {
    sections: Section[]
}

export const createTutorial = (...sections: Section[]): Tutorial => {
    return { sections }
}

export const start = (tutorial: Tutorial, fromSection?: number) => {
    const { sections } = tutorial

    // Allow starting from a specific section. If one was passed we want
    // to also setup the state for it. Otherwise we just start from the beginning
    // and assume we don't need any setup.
    if (fromSection === undefined) {
        fromSection = 0
    } else {
        sections[fromSection].setupState()
    }

    const startSection = (i: number) => {
        const section = sections[i]

        if (i + 1 >= sections.length) {
            section.start(() => print("Done with all tutorial sections"))
            // TODO: End the game? Call some callback?
        } else {
            section.start(() => startSection(i + 1))
        }
    }

    startSection(fromSection)
}
